import { JACK_IN_RANGE_SQUARES } from "./constants.js";
import { isWithinJackInRange } from "./rules.js";

export function findNetrunnerRole(actor) {
  return actor.items.find(
    (item) => item.type === "role" && item.name.trim().toLowerCase() === "netrunner"
  );
}

export function getActorOwners(actor) {
  return game.users
    .filter((user) => !user.isGM && actor.testUserPermission(user, CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER))
    .map((user) => user.id);
}

export function canOperateActor(actor, user = game.user) {
  return user.isGM || actor.testUserPermission(user, CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER);
}

export function findSourceToken(actor) {
  const controlled = canvas.tokens.controlled.filter((token) => token.actor?.id === actor.id);
  if (controlled.length === 1) return controlled[0];
  if (controlled.length > 1) return null;
  const active = actor.getActiveTokens(false, false).filter(
    (token) => token.document?.parent?.id === canvas.scene?.id
  );
  return active.length === 1 ? active[0] : null;
}

export function measureDistanceInSquares(sourceToken, targetToken) {
  const sourceCenter = sourceToken.center;
  const targetCenter = targetToken.center;
  const sceneGridDistance = Number(canvas.scene?.grid?.distance);
  if (!sourceCenter || !targetCenter || !Number.isFinite(sceneGridDistance) || sceneGridDistance <= 0) {
    return Number.NaN;
  }
  if (typeof canvas.grid?.measurePath === "function") {
    const measurement = canvas.grid.measurePath([sourceCenter, targetCenter]);
    if (Number.isFinite(measurement?.distance)) return measurement.distance / sceneGridDistance;
  }
  const pixelGridSize = Number(canvas.scene?.grid?.size);
  if (!Number.isFinite(pixelGridSize) || pixelGridSize <= 0) return Number.NaN;
  return Math.hypot(targetCenter.x - sourceCenter.x, targetCenter.y - sourceCenter.y) / pixelGridSize;
}

export function validateJackInRange(sourceToken, targetToken) {
  const distanceInSquares = measureDistanceInSquares(sourceToken, targetToken);
  return {
    distanceInSquares,
    valid: isWithinJackInRange(distanceInSquares, JACK_IN_RANGE_SQUARES)
  };
}
