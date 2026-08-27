import { JACK_IN_RANGE_SQUARES } from "./constants.js";
import {
  canOperateActor, findNetrunnerRole, findSourceToken, getActorOwners, validateJackInRange
} from "./foundry-utils.js";
import { postQuickhackResults } from "./messages.js";
import { QUICKHACKS, getQuickhack } from "./quickhack-catalog.js";
import { applyQuickhackEffect } from "./quickhack-effects.js";
import { isQuickhackSuccessful, resolveInterfaceRollAudience, resolveResultAudience } from "./rules.js";
import { rollPlayerInterface } from "./rolls.js";
import { getJackInSettings } from "./settings.js";

const notify = (level, key, data = {}) => ui.notifications[level](game.i18n.format(key, data));

function chooseQuickhack() {
  let firstOption = true;
  const options = ["Simple", "Standard", "Difficult", "Advanced"].map((tier) => {
    const entries = QUICKHACKS.filter((quickhack) => quickhack.tier === tier)
      .map((quickhack) => {
        const checked = firstOption ? " checked" : "";
        firstOption = false;
        return `<label class="pneuma-quickhack-picker-option">
          <input type="radio" name="quickhack" value="${quickhack.id}"${checked}>
          <span>${quickhack.name}</span>
        </label>`;
      })
      .join("");
    const dv = QUICKHACKS.find((quickhack) => quickhack.tier === tier)?.dv;
    return `<fieldset class="pneuma-quickhack-picker-tier pneuma-quickhack-tier-${tier.toLowerCase()}">
      <legend>${tier} - DV${dv}</legend>
      ${entries}
    </fieldset>`;
  }).join("");
  return new Promise((resolve) => {
    let settled = false;
    const finish = (value) => {
      if (settled) return;
      settled = true;
      resolve(value);
    };
    new Dialog({
      title: game.i18n.localize("PNEUMA_QUICKHACK.Quickhack.SelectTitle"),
      content: `<div class="pneuma-quickhack-picker">
        <p class="pneuma-quickhack-picker-prompt">${game.i18n.localize("PNEUMA_QUICKHACK.Quickhack.SelectPrompt")}</p>
        <div class="pneuma-quickhack-picker-grid">${options}</div>
        <p class="notes">${game.i18n.localize("PNEUMA_QUICKHACK.Quickhack.SelectionNote")}</p>
      </div>`,
      buttons: {
        perform: {
          icon: '<i class="fas fa-microchip"></i>',
          label: game.i18n.localize("PNEUMA_QUICKHACK.Quickhack.Perform"),
          callback: (html) => finish(getQuickhack(html.find("[name='quickhack']:checked").val()))
        },
        cancel: {
          icon: '<i class="fas fa-times"></i>',
          label: game.i18n.localize("Cancel"),
          callback: () => finish(null)
        }
      },
      default: "perform",
      close: () => finish(null)
    }).render(true);
  });
}

function singleTarget() {
  const targets = Array.from(game.user.targets);
  if (targets.length !== 1) {
    notify("warn", "PNEUMA_QUICKHACK.Error.TargetOneToken");
    return null;
  }
  return targets[0];
}

export async function executeQuickhack(sourceActor, options = {}) {
  if (!sourceActor) return notify("error", "PNEUMA_QUICKHACK.Error.SourceHasNoActor");
  const sourceToken = options.sourceToken ?? findSourceToken(sourceActor);
  if (!sourceToken) return notify("warn", "PNEUMA_QUICKHACK.Error.SelectSourceToken", { actor: sourceActor.name });
  const targetToken = options.targetToken ?? singleTarget();
  if (!targetToken) return null;
  const targetActor = targetToken.actor;
  if (!targetActor) return notify("error", "PNEUMA_QUICKHACK.Error.TargetHasNoActor");
  if (sourceToken.document.uuid === targetToken.document.uuid) return notify("warn", "PNEUMA_QUICKHACK.Error.CannotTargetSelf");
  if (!canOperateActor(sourceActor)) return notify("error", "PNEUMA_QUICKHACK.Error.NotAuthorized", { actor: sourceActor.name });
  const netrunnerRole = findNetrunnerRole(sourceActor);
  if (!netrunnerRole) return notify("error", "PNEUMA_QUICKHACK.Error.SourceNotNetrunner", { actor: sourceActor.name });
  const interfaceRank = Number(netrunnerRole.system.rank);
  if (!Number.isFinite(interfaceRank)) return notify("error", "PNEUMA_QUICKHACK.Error.InterfaceUnreadable", { actor: sourceActor.name });
  const range = validateJackInRange(sourceToken, targetToken);
  if (!range.valid) return notify("warn", "PNEUMA_QUICKHACK.Error.OutOfRange", { maximum: JACK_IN_RANGE_SQUARES });

  const requestedQuickhack = options.quickhack ?? await chooseQuickhack();
  const quickhack = typeof requestedQuickhack === "string"
    ? getQuickhack(requestedQuickhack)
    : requestedQuickhack;
  if (!quickhack) return null;
  const sourceIsPlayer = sourceActor.hasPlayerOwner;
  const targetIsPlayer = targetActor.hasPlayerOwner;
  const config = { ...getJackInSettings({ sourceIsPlayer, targetIsPlayer }), ...options };
  const gmRecipients = ChatMessage.getWhisperRecipients("GM").map((user) => user.id);
  const sourceOwnerRecipients = getActorOwners(sourceActor);
  const resultAudience = resolveResultAudience({ sourceIsPlayer, configuredVisibility: config.resultVisibility, gmRecipients, sourceOwnerRecipients });
  const rollAudience = sourceIsPlayer
    ? resolveInterfaceRollAudience({ resultAudience, concealIdentity: config.hideSourceInTargetResult, gmRecipients, sourceOwnerRecipients })
    : { visibility: "gm", recipients: gmRecipients };
  const interfaceTotal = await rollPlayerInterface({
    sourceActor,
    sourceToken,
    netrunnerRole,
    messageAudience: rollAudience,
    rollTitle: game.i18n.format("PNEUMA_QUICKHACK.Roll.AttemptingQuickhack", {
      quickhack: quickhack.name,
      target: targetToken.name
    })
  });
  if (interfaceTotal === null) return null;

  const success = isQuickhackSuccessful(interfaceTotal, quickhack.dv);
  const targetAlerted = success && !quickhack.silentOnSuccess;
  const resultMessage = await postQuickhackResults({
    sourceActor, sourceToken, targetActor, targetToken, quickhack, interfaceTotal,
    success, targetAlerted, targetIsPlayer, resultAudience,
    targetOwnerRecipients: getActorOwners(targetActor), gmRecipients,
    targetAlertAudience: config.targetAlertAudience,
    includeTargetAlertTotals: config.includeTargetAlertTotals,
    shareTargetAwareness: config.shareTargetAwareness,
    hideSourceInTargetResult: config.hideSourceInTargetResult
  });
  if (success) {
    try {
      await applyQuickhackEffect({ sourceActor, targetActor, quickhack, resultMessage });
    } catch (effectError) {
      console.error("pneuma-quickhack | Unable to apply Quickhack effect", effectError);
      ui.notifications.error(game.i18n.localize(effectError.message));
    }
  }
  return { quickhack, interfaceTotal, success, targetAlerted, sourceToken, targetToken };
}
