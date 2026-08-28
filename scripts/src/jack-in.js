import { JACK_IN_RANGE_SQUARES } from "./constants.js";
import {
  canOperateActor, findNetrunnerRole, findSourceToken, getActorOwners, validateJackInRange
} from "./foundry-utils.js";
import { postJackInResults } from "./messages.js";
import { isTargetAware } from "./rules.js";
import { AUDIENCE, resolveAttackRollAudience, resolveJackInRouting } from "./routing-config.js";
import { rollPlayerInterface, rollTargetWill } from "./rolls.js";
import { getRoutingConfig } from "./settings.js";

const notify = (level, key, data = {}) => ui.notifications[level](game.i18n.format(key, data));

function getSingleTarget() {
  const targets = Array.from(game.user.targets);
  if (targets.length !== 1) {
    notify("warn", "PNEUMA_QUICKHACK.Error.TargetOneToken");
    return null;
  }
  return targets[0];
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
  const routingConfig = options.routingConfig ?? getRoutingConfig();

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
  const attackAudience = resolveAttackRollAudience({ sourceIsPlayer });
  const interfaceTotal = await rollPlayerInterface({
    sourceActor,
    sourceToken,
    netrunnerRole,
    messageAudience: {
      visibility: attackAudience,
      recipients: attackAudience === AUDIENCE.GM ? gmRecipients : []
    },
    rollTitle: game.i18n.localize("PNEUMA_QUICKHACK.Roll.JackInCardTitle"),
    rollHeader: game.i18n.format("PNEUMA_QUICKHACK.Roll.JackingInto", {
      target: targetToken.name
    }),
    suppressDiceSoNice: !sourceIsPlayer
  });
  if (interfaceTotal === null) return null;

  const targetIsNetrunner = Boolean(findNetrunnerRole(targetActor));
  let willTotal = null;
  let targetAware = true;
  if (!targetIsNetrunner) {
    try {
      willTotal = await rollTargetWill({ targetActor });
    } catch (rollError) {
      console.error("pneuma-quickhack | Unable to roll target WILL", rollError);
      return notify("error", rollError.message, { actor: targetActor.name });
    }
    targetAware = isTargetAware(interfaceTotal, willTotal);
  }

  const routing = resolveJackInRouting(routingConfig, {
    sourceIsPlayer,
    targetIsPlayer,
    targetAware
  });
  await postJackInResults({
    sourceActor, sourceToken, targetActor, targetToken, interfaceTotal,
    willTotal: targetIsNetrunner ? game.i18n.localize("PNEUMA_QUICKHACK.Result.Automatic") : willTotal,
    targetAware, sourceOwnerRecipients: getActorOwners(sourceActor),
    targetOwnerRecipients: getActorOwners(targetActor), gmRecipients, routing
  });
  return {
    sourceToken, targetToken, interfaceTotal, willTotal, targetAware,
    targetIsNetrunner, distanceInSquares: range.distanceInSquares
  };
}
