export function isTargetAware(interfaceTotal, willTotal) {
  return interfaceTotal <= willTotal;
}

export function isWithinJackInRange(distanceInSquares, maximumSquares = 25) {
  return Number.isFinite(distanceInSquares) && distanceInSquares <= maximumSquares;
}

export function resolveResultAudience({ sourceIsPlayer, configuredVisibility, gmRecipients, sourceOwnerRecipients }) {
  if (!sourceIsPlayer || configuredVisibility === 0) {
    return { visibility: "gm", recipients: [...gmRecipients] };
  }
  if (configuredVisibility === 1) return { visibility: "public", recipients: [] };
  if (configuredVisibility === 2 && sourceOwnerRecipients.length > 0) {
    return {
      visibility: "whisper",
      recipients: [...new Set([...gmRecipients, ...sourceOwnerRecipients])]
    };
  }
  return { visibility: "gm", recipients: [...gmRecipients] };
}
