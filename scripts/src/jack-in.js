import { JACK_IN_RANGE_SQUARES } from "./constants.js";
import {
  canOperateActor, findNetrunnerRole, findSourceToken, getActorOwners, validateJackInRange
} from "./foundry-utils.js";
import { postJackInResults } from "./messages.js";
import { isTargetAware, resolveInterfaceRollAudience, resolveResultAudience } from "./rules.js";
import { rollNpcInterface, rollPlayerInterface, rollTargetWill } from "./rolls.js";
import { getJackInSettings } from "./settings.js";

const notify = (level, key, data = {}) => ui.notifications[level](game.i18n.format(key, data));

function getSingleTarget() {
  const targets = Array.from(game.user.targets);
  if (targets.length !== 1) {
    notify("warn", "PNEUMA_QUICKHACK.Error.TargetOneToken");
    return null;
  }
  return targets[0];
}

export async function executeJackInFromSelection(options = {}) {
  const controlled = canvas.tokens.controlled;
  if (controlled.length !== 1) {
    notify("warn", "PNEUMA_QUICKHACK.Error.SelectOneToken");
    return null;
  }
  return executeJackIn(controlled[0].actor, { ...options, sourceToken: controlled[0] });
}

export async function executeJackIn(sourceActor, options = {}) {
  if (!sourceActor) return notify("error", "PNEUMA_QUICKHACK.Error.SourceHasNoActor");
  const sourceToken = options.sourceToken ?? findSourceToken(sourceActor);
  if (!sourceToken) {
    return notify("warn", "PNEUMA_QUICKHACK.Error.SelectSourceToken", { actor: sourceActor.name });
  }
  const targetToken = options.targetToken ?? getSingleTarget();
  if (!targetToken) return null;
  const targetActor = targetToken.actor;
  if (!targetActor) return notify("error", "PNEUMA_QUICKHACK.Error.TargetHasNoActor");
  if (sourceToken.document.uuid === targetToken.document.uuid) {
    return notify("warn", "PNEUMA_QUICKHACK.Error.CannotTargetSelf");
  }
  if (!canOperateActor(sourceActor)) {
    return notify("error", "PNEUMA_QUICKHACK.Error.NotAuthorized", { actor: sourceActor.name });
  }

  const sourceIsPlayer = sourceActor.hasPlayerOwner;
  const targetIsPlayer = targetActor.hasPlayerOwner;
  const config = {
    ...getJackInSettings({ sourceIsPlayer, targetIsPlayer }),
    ...options
  };

  const netrunnerRole = findNetrunnerRole(sourceActor);
  if (!netrunnerRole) {
    return notify("error", "PNEUMA_QUICKHACK.Error.SourceNotNetrunner", { actor: sourceActor.name });
  }
  const interfaceRank = Number(netrunnerRole.system.rank);
  if (!Number.isFinite(interfaceRank)) {
    return notify("error", "PNEUMA_QUICKHACK.Error.InterfaceUnreadable", { actor: sourceActor.name });
  }
  const range = validateJackInRange(sourceToken, targetToken);
  if (!range.valid) {
    return notify("warn", "PNEUMA_QUICKHACK.Error.OutOfRange", { maximum: JACK_IN_RANGE_SQUARES });
  }

  const gmRecipients = ChatMessage.getWhisperRecipients("GM").map((user) => user.id);
  const sourceOwnerRecipients = getActorOwners(sourceActor);
  const resultAudience = resolveResultAudience({
    sourceIsPlayer,
    configuredVisibility: config.resultVisibility,
    gmRecipients,
    sourceOwnerRecipients
  });
  const interfaceRollAudience = resolveInterfaceRollAudience({
    resultAudience,
    concealIdentity: config.hideSourceInTargetResult,
    gmRecipients,
    sourceOwnerRecipients
  });
  const interfaceTotal = sourceIsPlayer
    ? await rollPlayerInterface({
        sourceActor,
        sourceToken,
        netrunnerRole,
        messageAudience: interfaceRollAudience,
        rollTitle: game.i18n.format("PNEUMA_QUICKHACK.Roll.JackingInto", {
          target: targetToken.name
        })
      })
    : await rollNpcInterface({ sourceActor, sourceToken, targetToken, interfaceRank });
  if (interfaceTotal === null) return null;

  const targetIsNetrunner = Boolean(findNetrunnerRole(targetActor));
  let willTotal = null;
  let targetAware = true;
  if (!targetIsNetrunner) {
    try {
      willTotal = await rollTargetWill({ targetActor, targetToken, gmRecipients });
    } catch (rollError) {
      console.error("pneuma-quickhack | Unable to roll target WILL", rollError);
      return notify("error", rollError.message, { actor: targetActor.name });
    }
    targetAware = isTargetAware(interfaceTotal, willTotal);
  }

  await postJackInResults({
    sourceActor, sourceToken, targetActor, targetToken, interfaceTotal,
    willTotal: targetIsNetrunner ? game.i18n.localize("PNEUMA_QUICKHACK.Result.Automatic") : willTotal,
    targetAware, resultAudience, targetOwnerRecipients: getActorOwners(targetActor),
    gmRecipients,
    targetAlertAudience: config.targetAlertAudience,
    includeTargetAlertTotals: config.includeTargetAlertTotals,
    targetIsPlayer,
    shareTargetAwareness: config.shareTargetAwareness,
    hideSourceInTargetResult: config.hideSourceInTargetResult
  });
  return {
    sourceToken, targetToken, interfaceTotal, willTotal, targetAware,
    targetIsNetrunner, distanceInSquares: range.distanceInSquares
  };
}
