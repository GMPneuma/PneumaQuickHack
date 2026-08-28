import { MODULE_ID, SOCKET_NAME } from "./constants.js";
import { getQuickhack } from "./quickhack-catalog.js";
import { createAutomaticQuickhackDamageCard } from "./quickhack-damage.js";

const RESULT_MESSAGE_SYNC_TIMEOUT_MS = 8000;

function activeGms() {
  return game.users.filter((user) => user.active && user.isGM).sort((a, b) => a.id.localeCompare(b.id));
}

function isPrimaryActiveGm() {
  return game.user.isGM && activeGms()[0]?.id === game.user.id;
}

function nativeStatuses(ids) {
  const registered = new Set((CONFIG.statusEffects ?? []).map((status) => status.id));
  return ids.filter((id) => registered.has(id));
}

async function createStatusEffect(actor, { name, icon, statuses = [], flags = {} }) {
  const [effect] = await actor.createEmbeddedDocuments("ActiveEffect", [{
    name,
    icon,
    statuses,
    flags: { [MODULE_ID]: flags }
  }]);
  return effect;
}

async function applySonicShock(actor) {
  const pack = game.packs.get("cyberpunk-red-core.core_critical-injuries-head");
  const index = await pack?.getIndex({ fields: ["name"] });
  const entry = index?.find((document) => document.name === "Damaged Ear");
  const injury = entry ? await pack.getDocument(entry._id) : null;
  if (!injury) throw new Error("PNEUMA_QUICKHACK.Effect.DamagedEarMissing");
  const itemData = injury.toObject();
  delete itemData._id;
  itemData.flags = foundry.utils.mergeObject(itemData.flags ?? {}, {
    [MODULE_ID]: { quickhackId: "sonic-shock" }
  });
  return actor.createEmbeddedDocuments("Item", [itemData]);
}

async function appendEffectSummary(message, detailKey, detailData) {
  const wrapper = document.createElement("div");
  wrapper.innerHTML = message.content;
  const slot = wrapper.querySelector(".pneuma-quickhack-effect-slot");
  if (!slot) return;
  slot.innerHTML = `<strong>${game.i18n.localize("PNEUMA_QUICKHACK.Effect.Label")}:</strong>
    ${game.i18n.format(detailKey, detailData)}`;
  await message.update({
    content: wrapper.innerHTML,
    [`flags.${MODULE_ID}.effectResolved`]: true
  });
}

async function appendEffectFailure(message) {
  if (!message) return;
  const wrapper = document.createElement("div");
  wrapper.innerHTML = message.content;
  const slot = wrapper.querySelector(".pneuma-quickhack-effect-slot");
  if (!slot) return;
  slot.classList.add("failure");
  slot.innerHTML = `<strong>${game.i18n.localize("PNEUMA_QUICKHACK.Effect.Label")}:</strong>
    ${game.i18n.localize("PNEUMA_QUICKHACK.Effect.ManualResolutionRequired")}`;
  await message.update({
    content: wrapper.innerHTML,
    [`flags.${MODULE_ID}.effectResolved`]: true,
    [`flags.${MODULE_ID}.effectFailed`]: true
  });
}

async function receiveEffectFailure(payload) {
  if (
    payload.requesterId !== game.user.id
    || payload.gmId !== activeGms()[0]?.id
  ) return;
  const resultMessage = game.messages.get(payload.resultMessageId);
  await appendEffectFailure(resultMessage);
  ui.notifications.error(game.i18n.localize("PNEUMA_QUICKHACK.Effect.ManualResolutionRequired"));
}

export function waitForQuickhackResultMessage(
  messageId,
  { timeoutMs = RESULT_MESSAGE_SYNC_TIMEOUT_MS } = {}
) {
  const existing = game.messages.get(messageId);
  if (existing) return Promise.resolve(existing);

  return new Promise((resolve) => {
    let hookId = null;
    let timeoutId = null;
    let settled = false;
    const finish = (message) => {
      if (settled) return;
      settled = true;
      if (hookId !== null) Hooks.off("createChatMessage", hookId);
      if (timeoutId !== null) clearTimeout(timeoutId);
      resolve(message);
    };
    hookId = Hooks.on("createChatMessage", (message) => {
      if (message.id === messageId) finish(message);
    });

    // Close the gap between the initial lookup and registering the Hook.
    const synchronized = game.messages.get(messageId);
    if (synchronized) {
      finish(synchronized);
      return;
    }
    timeoutId = setTimeout(() => finish(null), timeoutMs);
  });
}

async function resolveEffect({
  sourceActorUuid,
  targetActorUuid,
  quickhackId,
  requesterId,
  resultMessageId
}) {
  if (!isPrimaryActiveGm()) return;
  const [sourceActor, targetActor] = await Promise.all([
    fromUuid(sourceActorUuid),
    fromUuid(targetActorUuid)
  ]);
  const requester = game.users.get(requesterId);
  const quickhack = getQuickhack(quickhackId);
  const resultMessage = await waitForQuickhackResultMessage(resultMessageId);
  const result = resultMessage?.getFlag(MODULE_ID, "type") === "quickhackResult"
    ? resultMessage.flags[MODULE_ID]
    : null;
  const authorId = resultMessage?.author?.id ?? resultMessage?.user?.id ?? resultMessage?.user;
  if (!resultMessage) throw new Error("PNEUMA_QUICKHACK.Effect.ResultMessageMissing");
  if (!sourceActor || !targetActor || !requester || !quickhack || !result) {
    throw new Error("PNEUMA_QUICKHACK.Effect.RequestInvalid");
  }
  if (!requester.isGM && !sourceActor.testUserPermission(requester, CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER)) {
    throw new Error("PNEUMA_QUICKHACK.Effect.RequestInvalid");
  }
  if (
    authorId !== requesterId
    || result.success !== true
    || result.sourceActorUuid !== sourceActorUuid
    || result.targetActorUuid !== targetActorUuid
    || result.quickhackId !== quickhackId
  ) throw new Error("PNEUMA_QUICKHACK.Effect.RequestInvalid");

  let detailKey = `PNEUMA_QUICKHACK.Effect.Summary.${quickhack.id}`;
  const detailData = { target: targetActor.name };
  try {
    switch (quickhack.id) {
      case "impair-movement":
        break;
      case "sonic-shock":
        await applySonicShock(targetActor);
        break;
      case "overheat":
        await createAutomaticQuickhackDamageCard({
          sourceActor,
          sourceToken: result.sourceTokenUuid ? await fromUuid(result.sourceTokenUuid) : null,
          targetToken: result.targetTokenUuid ? await fromUuid(result.targetTokenUuid) : null,
          quickhack
        });
        break;
      case "slow": {
        const amount = (await new Roll("1d6").evaluate()).total;
        detailData.amount = amount;
        break;
      }
      case "system-reset": {
        const statuses = nativeStatuses(["unconscious", "prone"]);
        if (statuses.length) {
          await createStatusEffect(targetActor, {
            name: "Quickhack: System Reset",
            icon: "icons/svg/unconscious.svg",
            statuses,
            flags: { quickhackId: quickhack.id }
          });
          detailData.statuses = statuses.join(", ");
        } else {
          detailKey = "PNEUMA_QUICKHACK.Effect.Summary.system-reset-manual";
        }
        break;
      }
      default:
    }
    await appendEffectSummary(resultMessage, detailKey, detailData);
  } catch (error) {
    await appendEffectFailure(resultMessage);
    throw error;
  }
}

export async function applyQuickhackEffect({ sourceActor, targetActor, quickhack, resultMessage }) {
  if (!quickhack) return;
  const payload = {
    type: "applyQuickhackEffect",
    sourceActorUuid: sourceActor.uuid,
    targetActorUuid: targetActor.uuid,
    quickhackId: quickhack.id,
    requesterId: game.user.id,
    resultMessageId: resultMessage?.id
  };
  if (isPrimaryActiveGm()) return resolveEffect(payload);
  if (activeGms().length === 0) {
    ui.notifications.warn(game.i18n.localize("PNEUMA_QUICKHACK.Effect.ActiveGmRequired"));
    await appendEffectFailure(resultMessage);
    return;
  }
  game.socket.emit(SOCKET_NAME, payload);
}

export function registerQuickhackEffects() {
  game.socket.on(SOCKET_NAME, (payload) => {
    if (payload?.type === "quickhackEffectFailed") {
      void receiveEffectFailure(payload).catch((error) => {
        console.error(`${MODULE_ID} | Unable to display Quickhack effect failure`, error);
        ui.notifications.error(game.i18n.localize("PNEUMA_QUICKHACK.Effect.ManualResolutionRequired"));
      });
      return;
    }
    if (payload?.type === "applyQuickhackEffect") {
      void resolveEffect(payload).catch((error) => {
        console.error(`${MODULE_ID} | Unable to apply Quickhack effect`, error);
        ui.notifications.error(game.i18n.localize(error.message));
        if (isPrimaryActiveGm() && payload.requesterId !== game.user.id) {
          game.socket.emit(SOCKET_NAME, {
            type: "quickhackEffectFailed",
            requesterId: payload.requesterId,
            gmId: game.user.id,
            resultMessageId: payload.resultMessageId
          });
        }
      });
    }
  });
}
