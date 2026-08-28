import { MODULE_ID, SOCKET_NAME } from "./constants.js";
import { getQuickhack } from "./quickhack-catalog.js";
import { createAutomaticQuickhackDamageCard } from "./quickhack-damage.js";

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
  const resultMessage = game.messages.get(resultMessageId);
  const result = resultMessage?.getFlag(MODULE_ID, "type") === "quickhackResult"
    ? resultMessage.flags[MODULE_ID]
    : null;
  const authorId = resultMessage?.author?.id ?? resultMessage?.user?.id ?? resultMessage?.user;
  if (!sourceActor || !targetActor || !requester || !quickhack || !result) return;
  if (!requester.isGM && !sourceActor.testUserPermission(requester, CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER)) return;
  if (
    authorId !== requesterId
    || result.success !== true
    || result.sourceActorUuid !== sourceActorUuid
    || result.targetActorUuid !== targetActorUuid
    || result.quickhackId !== quickhackId
  ) return;

  let detailKey = `PNEUMA_QUICKHACK.Effect.Summary.${quickhack.id}`;
  const detailData = { target: targetActor.name };
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
    return;
  }
  game.socket.emit(SOCKET_NAME, payload);
}

export function registerQuickhackEffects() {
  game.socket.on(SOCKET_NAME, (payload) => {
    if (payload?.type === "applyQuickhackEffect") {
      void resolveEffect(payload).catch((error) => {
        console.error(`${MODULE_ID} | Unable to apply Quickhack effect`, error);
        ui.notifications.error(game.i18n.localize(error.message));
      });
    }
  });
}
