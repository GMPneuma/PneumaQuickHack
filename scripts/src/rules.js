export function isTargetAware(interfaceTotal, willTotal) {
  return interfaceTotal <= willTotal;
}

export function isWithinJackInRange(distanceInSquares, maximumSquares = 25) {
  return Number.isFinite(distanceInSquares) && distanceInSquares <= maximumSquares;
}

export function isNetrunnerEjected(defenderTotal, interfaceTotal) {
  return defenderTotal > interfaceTotal;
}

export function isQuickhackSuccessful(interfaceTotal, difficultyValue) {
  return interfaceTotal > difficultyValue;
}

export function resolveResultAudience({ sourceIsPlayer, configuredVisibility, gmRecipients, sourceOwnerRecipients }) {
  if (configuredVisibility === 0) {
    return { visibility: "gm", recipients: [...gmRecipients] };
  }
  if (configuredVisibility === 1) return { visibility: "public", recipients: [] };
  if (sourceIsPlayer && configuredVisibility === 2 && sourceOwnerRecipients.length > 0) {
    return {
      visibility: "whisper",
      recipients: [...new Set([...gmRecipients, ...sourceOwnerRecipients])]
    };
  }
  return { visibility: "gm", recipients: [...gmRecipients] };
}

export function shouldConcealPublicIdentity(resultAudience, concealIdentity) {
  return concealIdentity && resultAudience.visibility === "public";
}

export function resolveInterfaceRollAudience({
  resultAudience,
  concealIdentity,
  gmRecipients,
  sourceOwnerRecipients
}) {
  if (!shouldConcealPublicIdentity(resultAudience, concealIdentity)) return resultAudience;
  return {
    visibility: "whisper",
    recipients: [...new Set([...gmRecipients, ...sourceOwnerRecipients])]
  };
}
