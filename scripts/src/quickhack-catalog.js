import { MODULE_ID } from "./constants.js";

export const QUICKHACKS = Object.freeze([
  { id: "impair-movement", name: "Impair Movement", tier: "Simple", dv: 6 },
  { id: "sonic-shock", name: "Sonic Shock", tier: "Simple", dv: 6 },
  { id: "overheat", name: "Overheat", tier: "Standard", dv: 8, automaticDamageFormula: "4" },
  { id: "short-circuit", name: "Short Circuit", tier: "Standard", dv: 8 },
  { id: "cyberware-malfunction", name: "Cyberware Malfunction", tier: "Difficult", dv: 10 },
  { id: "lure", name: "Lure", tier: "Difficult", dv: 10, silentOnSuccess: true },
  { id: "slow", name: "Slow", tier: "Difficult", dv: 10 },
  { id: "synapse-burnout", name: "Synapse Burnout", tier: "Difficult", dv: 10, damageFormula: "3d6" },
  { id: "puppet", name: "Puppet", tier: "Advanced", dv: 12 },
  { id: "shard-ejection", name: "Shard Ejection", tier: "Advanced", dv: 12 },
  { id: "system-reset", name: "System Reset", tier: "Advanced", dv: 12 }
]);

export function getQuickhack(id) {
  return QUICKHACKS.find((quickhack) => quickhack.id === id) ?? null;
}

export function getQuickhackIcon(id) {
  return `modules/pneuma-quickhack/icons/quickhacks/${id}-gray.png`;
}

export function getOwnedQuickhacks(actor) {
  const ownedIds = new Set(
    Array.from(actor?.items ?? [])
      .map((item) => item.getFlag?.(MODULE_ID, "quickhackId"))
      .filter(Boolean)
  );
  return QUICKHACKS.filter((quickhack) => ownedIds.has(quickhack.id));
}
