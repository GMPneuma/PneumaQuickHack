const QUICKHACK_HOTBAR_ACTIONS = new Set(["jack-in", "quickhack"]);

export function isQuickhackHotbarDrop(data) {
  return Boolean(QUICKHACK_HOTBAR_ACTIONS.has(data?.pneumaQuickhackAction) && data?.actorUuid);
}
