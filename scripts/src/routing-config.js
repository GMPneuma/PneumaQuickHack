import { RESULT_VISIBILITY } from "./constants.js";

export const AUDIENCE = Object.freeze({
  GM: "gm",
  PUBLIC: "public",
  SOURCE_OWNERS: "sourceOwners",
  TARGET_OWNERS: "targetOwners"
});

export const DEFAULT_ROUTING_CONFIG = Object.freeze({
  playerAttackerResultAudience: AUDIENCE.PUBLIC,
  playerAttackerRevealIdentity: true,
  npcAttackerResultAudience: AUDIENCE.GM,
  npcAttackerRevealIdentity: false,
  playerTargetAlertAudience: AUDIENCE.TARGET_OWNERS,
  playerTargetIncludeTotals: true,
  npcTargetAlertAudience: AUDIENCE.GM,
  npcTargetIncludeTotals: true,
  npcTargetShareAwareness: true
});

export function normalizeRoutingConfig(config = {}) {
  return { ...DEFAULT_ROUTING_CONFIG, ...config };
}

export function resolveTargetAlertAudience({
  configuredAudience,
  targetIsPlayer,
  shareTargetAwareness
}) {
  return !targetIsPlayer && !shareTargetAwareness
    ? AUDIENCE.GM
    : configuredAudience;
}

export function mapRoutingToRuntime(config, { sourceIsPlayer, targetIsPlayer }) {
  const normalized = normalizeRoutingConfig(config);
  const resultAudience = sourceIsPlayer
    ? normalized.playerAttackerResultAudience
    : normalized.npcAttackerResultAudience;
  const revealIdentity = sourceIsPlayer
    ? normalized.playerAttackerRevealIdentity
    : normalized.npcAttackerRevealIdentity;
  const targetAlertAudience = targetIsPlayer
    ? normalized.playerTargetAlertAudience
    : normalized.npcTargetAlertAudience;
  const includeTargetAlertTotals = targetIsPlayer
    ? normalized.playerTargetIncludeTotals
    : normalized.npcTargetIncludeTotals;
  const shareTargetAwareness = targetIsPlayer
    ? true
    : normalized.npcTargetShareAwareness;
  const visibilityMap = {
    [AUDIENCE.GM]: RESULT_VISIBILITY.GM_ONLY,
    [AUDIENCE.PUBLIC]: RESULT_VISIBILITY.PUBLIC,
    [AUDIENCE.SOURCE_OWNERS]: RESULT_VISIBILITY.SOURCE_OWNERS
  };

  return {
    resultVisibility: visibilityMap[resultAudience] ?? RESULT_VISIBILITY.GM_ONLY,
    hideSourceInTargetResult: !revealIdentity,
    targetAlertAudience,
    includeTargetAlertTotals,
    shareTargetAwareness
  };
}
