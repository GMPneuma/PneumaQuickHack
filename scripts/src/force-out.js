import { MODULE_ID, SOCKET_NAME } from "./constants.js";
import { canOperateActor, findNetrunnerRole, getActorOwners } from "./foundry-utils.js";
import { isNetrunnerEjected } from "./rules.js";
import { rollForceOutConcentration, rollForceOutResistance } from "./rolls.js";
import { getJackInSettings } from "./settings.js";

function activeGms() {
  return game.users.filter((user) => user.active && user.isGM).sort((a, b) => a.id.localeCompare(b.id));
}

function isPrimaryActiveGm() {
  return game.user.isGM && activeGms()[0]?.id === game.user.id;
}

function audienceForAlert(setting, defenderActor, gmRecipients) {
  if (setting === "public") return { visibility: "public", recipients: [] };
  if (setting === "targetOwners") {
    return {
      visibility: "whisper",
      recipients: [...new Set([...gmRecipients, ...getActorOwners(defenderActor)])]
    };
  }
  return { visibility: "gm", recipients: gmRecipients };
}

async function resolveContext(messageId) {
  const message = game.messages.get(messageId);
  const context = message?.getFlag(MODULE_ID, "forceOutContext");
  if (!context?.sourceActorUuid || !context?.targetActorUuid) return null;
  const [netrunnerActor, defenderActor] = await Promise.all([
    fromUuid(context.sourceActorUuid),
    fromUuid(context.targetActorUuid)
  ]);
  if (!netrunnerActor || !defenderActor) return null;
  return { message, context, netrunnerActor, defenderActor };
}

export async function beginForceOut(message) {
  const context = await resolveContext(message.id);
  if (!context) {
    ui.notifications.error(game.i18n.localize("PNEUMA_QUICKHACK.ForceOut.ContextMissing"));
    return;
  }
  if (!canOperateActor(context.defenderActor)) {
    ui.notifications.error(game.i18n.localize("PNEUMA_QUICKHACK.ForceOut.NotAuthorized"));
    return;
  }

  const gmRecipients = ChatMessage.getWhisperRecipients("GM").map((user) => user.id);
  const settings = getJackInSettings({
    sourceIsPlayer: context.netrunnerActor.hasPlayerOwner,
    targetIsPlayer: context.defenderActor.hasPlayerOwner
  });
  let defenseRoll;
  try {
    defenseRoll = await rollForceOutConcentration({
      defenderActor: context.defenderActor,
      messageAudience: audienceForAlert(settings.targetAlertAudience, context.defenderActor, gmRecipients)
    });
  } catch (error) {
    ui.notifications.error(game.i18n.localize(error.message));
    return;
  }
  if (defenseRoll === null) return;

  if (game.user.isGM && isPrimaryActiveGm()) {
    await resolveForceOut({
      messageId: message.id,
      defenseMessageId: defenseRoll.messageId,
      requesterId: game.user.id
    });
    return;
  }
  if (activeGms().length === 0) {
    ui.notifications.warn(game.i18n.localize("PNEUMA_QUICKHACK.ForceOut.ActiveGmRequired"));
    return;
  }
  game.socket.emit(SOCKET_NAME, {
    type: "resolveForceOut",
    messageId: message.id,
    defenseMessageId: defenseRoll.messageId,
    requesterId: game.user.id
  });
}

async function resolveForceOut({ messageId, defenseMessageId, requesterId }) {
  if (!isPrimaryActiveGm()) return;
  const context = await resolveContext(messageId);
  const requester = game.users.get(requesterId);
  const defenseMessage = game.messages.get(defenseMessageId);
  const defense = defenseMessage?.getFlag(MODULE_ID, "type") === "forceOutDefenseRoll"
    ? defenseMessage.flags[MODULE_ID]
    : null;
  const defenseAuthorId = defenseMessage?.author?.id ?? defenseMessage?.user?.id ?? defenseMessage?.user;
  if (!context || !requester || (!requester.isGM && !context.defenderActor.testUserPermission(
    requester,
    CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER
  ))) return;
  if (
    !defense
    || defenseAuthorId !== requesterId
    || defense.defenderActorUuid !== context.defenderActor.uuid
    || !Number.isFinite(Number(defense.resultTotal))
  ) return;
  const defenderTotal = Number(defense.resultTotal);

  const netrunnerRole = findNetrunnerRole(context.netrunnerActor);
  if (!netrunnerRole || !Number.isFinite(Number(netrunnerRole.system.rank))) {
    ui.notifications.error(game.i18n.localize("PNEUMA_QUICKHACK.ForceOut.InterfaceMissing"));
    return;
  }
  const interfaceTotal = await rollForceOutResistance({
    netrunnerActor: context.netrunnerActor,
    netrunnerRole,
    defenderActor: context.defenderActor,
    gmRecipients: ChatMessage.getWhisperRecipients("GM").map((user) => user.id)
  });
  if (interfaceTotal === null) return;
  const ejected = isNetrunnerEjected(Number(defenderTotal), interfaceTotal);
  const settings = getJackInSettings({
    sourceIsPlayer: context.netrunnerActor.hasPlayerOwner,
    targetIsPlayer: context.defenderActor.hasPlayerOwner
  });
  const gmRecipients = ChatMessage.getWhisperRecipients("GM").map((user) => user.id);
  const audience = audienceForAlert(settings.targetAlertAudience, context.defenderActor, gmRecipients);
  const netrunnerName = settings.hideSourceInTargetResult
    ? game.i18n.localize("PNEUMA_QUICKHACK.Result.UnknownNetrunner")
    : context.netrunnerActor.name;
  const content = `
    <h3>${game.i18n.localize("PNEUMA_QUICKHACK.ForceOut.ResultTitle")}</h3>
    <p>${game.i18n.format(
      ejected ? "PNEUMA_QUICKHACK.ForceOut.Success" : "PNEUMA_QUICKHACK.ForceOut.Failure",
      { defender: context.defenderActor.name, netrunner: netrunnerName }
    )}</p>
    <p>${game.i18n.localize("PNEUMA_QUICKHACK.ForceOut.DefenderTotal")}: <strong>${defenderTotal}</strong></p>
    <p>${game.i18n.localize("PNEUMA_QUICKHACK.ForceOut.InterfaceTotal")}: <strong>${interfaceTotal}</strong></p>
  `;
  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor: context.defenderActor }),
    whisper: audience.visibility === "public" ? [] : audience.recipients,
    blind: audience.visibility === "gm",
    content,
    flags: { [MODULE_ID]: {
      type: "forceOutResult",
      ejected,
      gmOnly: audience.visibility === "gm"
    } }
  });
}

export function registerForceOutSocket() {
  game.socket.on(SOCKET_NAME, (payload) => {
    if (payload?.type === "resolveForceOut") void resolveForceOut(payload);
  });
}
