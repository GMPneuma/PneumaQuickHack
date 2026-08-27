import { MODULE_ID } from "./constants.js";
import { canOperateActor } from "./foundry-utils.js";
import { getQuickhack } from "./quickhack-catalog.js";

async function loadCoreDamageWorkflow() {
  const systemRoot = `/systems/${game.system.id}/modules`;
  const [{ CPRDamageRoll }, { default: CPRChat }] = await Promise.all([
    import(`${systemRoot}/rolls/cpr-rolls.js`),
    import(`${systemRoot}/chat/cpr-chat.js`)
  ]);
  return { CPRDamageRoll, CPRChat };
}

export function isQuickhackDamageContextValid(context, quickhack) {
  return context?.type === "quickhackAttackRoll"
    && context.success === true
    && Boolean(context.sourceActorUuid)
    && Boolean(context.targetActorUuid)
    && context.quickhackId === quickhack?.id
    && context.damageFormula === quickhack?.damageFormula;
}

export async function attachQuickhackDamageAction(message, {
  sourceActor,
  sourceToken,
  targetActor,
  targetToken,
  quickhack
}) {
  if (!message || !quickhack?.damageFormula) return message;
  const wrapper = document.createElement("div");
  wrapper.innerHTML = message.content;
  const subtitle = wrapper.querySelector(".rollcard-top .chat-rollTitle-stat .text-small");
  if (!subtitle) throw new Error("PNEUMA_QUICKHACK.Damage.Invalid");
  const label = game.i18n.localize("PNEUMA_QUICKHACK.Damage.Roll");
  subtitle.classList.add("pneuma-quickhack-attack-subtitle");
  subtitle.insertAdjacentHTML("beforeend", `<a class="pneuma-quickhack-roll-damage clickable"
    data-tooltip="${label}"
    aria-label="${label}"><i class="fas fa-tint red-fg"></i></a>`);
  await message.update({
    content: wrapper.innerHTML,
    [`flags.${MODULE_ID}`]: {
      ...message.flags?.[MODULE_ID],
      type: "quickhackAttackRoll",
      sourceActorUuid: sourceActor.uuid,
      sourceTokenUuid: sourceToken.document.uuid,
      targetActorUuid: targetActor.uuid,
      targetTokenUuid: targetToken.document.uuid,
      quickhackId: quickhack.id,
      damageFormula: quickhack.damageFormula,
      success: true
    }
  });
  return message;
}

export async function rollQuickhackDamage(message) {
  const context = message.flags?.[MODULE_ID];
  const quickhack = getQuickhack(context?.quickhackId);
  if (!isQuickhackDamageContextValid(context, quickhack)) {
    ui.notifications.error(game.i18n.localize("PNEUMA_QUICKHACK.Damage.Invalid"));
    return null;
  }

  const [sourceActor, sourceToken, targetToken] = await Promise.all([
    fromUuid(context.sourceActorUuid),
    fromUuid(context.sourceTokenUuid),
    fromUuid(context.targetTokenUuid)
  ]);
  if (!sourceActor || !targetToken?.actor || targetToken.actor.uuid !== context.targetActorUuid) {
    ui.notifications.error(game.i18n.localize("PNEUMA_QUICKHACK.Damage.Invalid"));
    return null;
  }
  if (!canOperateActor(sourceActor)) {
    ui.notifications.error(game.i18n.format("PNEUMA_QUICKHACK.Damage.Unauthorized", { actor: sourceActor.name }));
    return null;
  }

  const { CPRDamageRoll, CPRChat } = await loadCoreDamageWorkflow();
  class QuickhackDamageRoll extends CPRDamageRoll {
    wasCritSuccess() {
      return false;
    }
  }

  const damageRoll = new QuickhackDamageRoll(
    `${quickhack.name} ${game.i18n.localize("PNEUMA_QUICKHACK.Damage.Roll")}`,
    quickhack.damageFormula,
    "program"
  );
  damageRoll.isAimed = true;
  damageRoll.location = "brain";
  await damageRoll.roll();
  damageRoll.entityData = {
    actor: sourceActor.id,
    token: sourceToken?.id ?? null,
    item: null,
    tokens: [targetToken]
  };
  return CPRChat.RenderRollCard(damageRoll);
}
