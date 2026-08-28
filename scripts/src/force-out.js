import { MODULE_ID, SOCKET_NAME } from "./constants.js";
import { canOperateActor, findNetrunnerRole, getActorOwners } from "./foundry-utils.js";
import { isNetrunnerEjected } from "./rules.js";
import {
  rollForceOutConcentration,
  rollNpcForceOutResistance,
  rollPlayerForceOutResistance
} from "./rolls.js";

const pendingInterfaceRequests = new Map();

export function forceOutInterfaceMode(netrunnerIsPlayer) {
  return netrunnerIsPlayer ? "playerPrompt" : "npcAutomatic";
}

function activeGms() {
  return game.users.filter((user) => user.active && user.isGM).sort((a, b) => a.id.localeCompare(b.id));
}

function isPrimaryActiveGm() {
  return game.user.isGM && activeGms()[0]?.id === game.user.id;
}

function activePlayerOwners(actor) {
  return game.users
    .filter((user) => user.active && !user.isGM && actor.testUserPermission(
      user,
      CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER
    ))
    .sort((a, b) => a.id.localeCompare(b.id));
}

function audienceForAlert(setting, netrunnerActor, defenderActor, gmRecipients) {
  if (setting === "public") return { visibility: "public", recipients: [] };
  if (setting === "sourceOwners") {
    return {
      visibility: "whisper",
      recipients: [...new Set([...gmRecipients, ...getActorOwners(netrunnerActor)])]
    };
  }
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
  let defenseRoll;
  try {
    defenseRoll = await rollForceOutConcentration({
      defenderActor: context.defenderActor,
      messageAudience: audienceForAlert(
        context.context.audience,
        context.netrunnerActor,
        context.defenderActor,
        gmRecipients
      )
    });
  } catch (error) {
    ui.notifications.error(game.i18n.localize(error.message));
    return;
  }
  if (defenseRoll === null) return;

  if (game.user.isGM && isPrimaryActiveGm()) {
    await resolveForceOut({
      messageId: message.id,
      defenderTotal: defenseRoll.total,
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
    defenderTotal: defenseRoll.total,
    requesterId: game.user.id
  });
}

async function validateDefense({ messageId, defenderTotal, requesterId }) {
  if (!isPrimaryActiveGm()) return;
  const context = await resolveContext(messageId);
  const requester = game.users.get(requesterId);
  if (!context || !requester || (!requester.isGM && !context.defenderActor.testUserPermission(
    requester,
    CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER
  ))) return;
  if (!Number.isFinite(Number(defenderTotal))) return;
  return { context, defenderTotal: Number(defenderTotal) };
}

async function postForceOutResult({ context, defenderTotal, interfaceTotal }) {
  const ejected = isNetrunnerEjected(defenderTotal, interfaceTotal);
  const gmRecipients = ChatMessage.getWhisperRecipients("GM").map((user) => user.id);
  const audience = audienceForAlert(
    context.context.audience,
    context.netrunnerActor,
    context.defenderActor,
    gmRecipients
  );
  const netrunnerName = context.context.revealAttacker === false
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

async function requestPlayerInterfaceRoll(payload, context) {
  if ([...pendingInterfaceRequests.values()].some((pending) => pending.messageId === payload.messageId)) {
    ui.notifications.warn(game.i18n.localize("PNEUMA_QUICKHACK.ForceOut.RollAlreadyPending"));
    return;
  }
  const activeOwner = activePlayerOwners(context.netrunnerActor)[0];
  const roller = activeOwner ?? game.user;
  if (!activeOwner) {
    ui.notifications.warn(game.i18n.format("PNEUMA_QUICKHACK.ForceOut.NoActiveOwner", {
      actor: context.netrunnerActor.name
    }));
  }
  const requestId = foundry.utils.randomID();
  const timeoutId = setTimeout(() => {
    if (!pendingInterfaceRequests.delete(requestId)) return;
    ui.notifications.warn(game.i18n.format("PNEUMA_QUICKHACK.ForceOut.RollTimedOut", {
      player: roller.name
    }));
  }, 120000);
  pendingInterfaceRequests.set(requestId, {
    ...payload,
    rollerId: roller.id,
    netrunnerActorUuid: context.netrunnerActor.uuid,
    timeoutId
  });
  const requestPayload = {
    type: "requestForceOutInterfaceRoll",
    requestId,
    messageId: payload.messageId,
    rollerId: roller.id,
    gmId: game.user.id,
    netrunnerActorUuid: context.netrunnerActor.uuid,
    defenderActorUuid: context.defenderActor.uuid
  };
  if (roller.id === game.user.id) {
    await performRequestedInterfaceRoll(requestPayload);
    return;
  }
  game.socket.emit(SOCKET_NAME, requestPayload);
  ui.notifications.info(game.i18n.format("PNEUMA_QUICKHACK.ForceOut.WaitingForRoll", {
    player: roller.name
  }));
}

async function resolveForceOut(payload) {
  if (!isPrimaryActiveGm()) return;
  const validated = await validateDefense(payload);
  if (!validated) {
    ui.notifications.warn(game.i18n.localize("PNEUMA_QUICKHACK.ForceOut.ContestInvalid"));
    return;
  }
  const { context, defenderTotal } = validated;

  const netrunnerRole = findNetrunnerRole(context.netrunnerActor);
  if (!netrunnerRole || !Number.isFinite(Number(netrunnerRole.system.rank))) {
    ui.notifications.error(game.i18n.localize("PNEUMA_QUICKHACK.ForceOut.InterfaceMissing"));
    return;
  }
  if (forceOutInterfaceMode(context.netrunnerActor.hasPlayerOwner) === "playerPrompt") {
    await requestPlayerInterfaceRoll(payload, context);
    return;
  }
  const interfaceTotal = await rollNpcForceOutResistance(Number(netrunnerRole.system.rank));
  await postForceOutResult({ context, defenderTotal, interfaceTotal });
}

async function performRequestedInterfaceRoll(payload) {
  if (
    game.user.id !== payload.rollerId
    || activeGms()[0]?.id !== payload.gmId
  ) return;
  let resistance = null;
  try {
    const [netrunnerActor, defenderActor] = await Promise.all([
      fromUuid(payload.netrunnerActorUuid),
      fromUuid(payload.defenderActorUuid)
    ]);
    if (!netrunnerActor || !defenderActor || !canOperateActor(netrunnerActor)) {
      throw new Error("PNEUMA_QUICKHACK.ForceOut.ContextMissing");
    }
    const netrunnerRole = findNetrunnerRole(netrunnerActor);
    if (!netrunnerRole || !Number.isFinite(Number(netrunnerRole.system.rank))) {
      throw new Error("PNEUMA_QUICKHACK.ForceOut.InterfaceMissing");
    }
    resistance = await rollPlayerForceOutResistance({
      netrunnerActor,
      netrunnerRole,
      defenderActor,
      gmRecipients: ChatMessage.getWhisperRecipients("GM").map((user) => user.id),
      requestId: payload.requestId
    });
  } catch (error) {
    console.error(`${MODULE_ID} | Unable to complete requested Interface roll`, error);
    ui.notifications.error(game.i18n.localize(error.message));
  }
  const responsePayload = {
    type: resistance ? "completeForceOutInterfaceRoll" : "cancelForceOutInterfaceRoll",
    requestId: payload.requestId,
    rollerId: game.user.id,
    interfaceTotal: resistance?.total ?? null
  };
  if (isPrimaryActiveGm() && game.user.id === payload.gmId) {
    await completePlayerInterfaceRoll(responsePayload);
    return;
  }
  game.socket.emit(SOCKET_NAME, responsePayload);
}

async function completePlayerInterfaceRoll(payload) {
  if (!isPrimaryActiveGm()) return;
  const pending = pendingInterfaceRequests.get(payload.requestId);
  if (!pending || pending.rollerId !== payload.rollerId) return;

  if (payload.type === "cancelForceOutInterfaceRoll") {
    clearTimeout(pending.timeoutId);
    pendingInterfaceRequests.delete(payload.requestId);
    const roller = game.users.get(payload.rollerId);
    ui.notifications.warn(game.i18n.format("PNEUMA_QUICKHACK.ForceOut.RollCancelled", {
      player: roller?.name ?? game.i18n.localize("PNEUMA_QUICKHACK.ForceOut.UnknownPlayer")
    }));
    return;
  }

  const validated = await validateDefense(pending);
  const resistanceValid = Boolean(
    validated
    && Number.isFinite(Number(payload.interfaceTotal))
  );
  clearTimeout(pending.timeoutId);
  pendingInterfaceRequests.delete(payload.requestId);
  if (!resistanceValid) {
    ui.notifications.warn(game.i18n.localize("PNEUMA_QUICKHACK.ForceOut.ContestInvalid"));
    return;
  }
  await postForceOutResult({
    context: validated.context,
    defenderTotal: validated.defenderTotal,
    interfaceTotal: Number(payload.interfaceTotal)
  });
}

export function registerForceOutSocket() {
  game.socket.on(SOCKET_NAME, (payload) => {
    if (payload?.type === "resolveForceOut") void resolveForceOut(payload);
    if (payload?.type === "requestForceOutInterfaceRoll") void performRequestedInterfaceRoll(payload);
    if (["completeForceOutInterfaceRoll", "cancelForceOutInterfaceRoll"].includes(payload?.type)) {
      void completePlayerInterfaceRoll(payload);
    }
  });
}
