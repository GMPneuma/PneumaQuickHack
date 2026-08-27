export const QUICKHACKS = Object.freeze([
  { id: "impair-movement", name: "Impair Movement", tier: "Simple", dv: 6 },
  { id: "sonic-shock", name: "Sonic Shock", tier: "Simple", dv: 6 },
  { id: "overheat", name: "Overheat", tier: "Standard", dv: 8 },
  { id: "short-circuit", name: "Short Circuit", tier: "Standard", dv: 8 },
  { id: "cyberware-malfunction", name: "Cyberware Malfunction", tier: "Difficult", dv: 10 },
  { id: "lure", name: "Lure", tier: "Difficult", dv: 10, silentOnSuccess: true },
  { id: "slow", name: "Slow", tier: "Difficult", dv: 10 },
  { id: "synapse-burnout", name: "Synapse Burnout", tier: "Difficult", dv: 10 },
  { id: "puppet", name: "Puppet", tier: "Advanced", dv: 12 },
  { id: "shard-ejection", name: "Shard Ejection", tier: "Advanced", dv: 12 },
  { id: "system-reset", name: "System Reset", tier: "Advanced", dv: 12 }
]);

export function getQuickhack(id) {
  return QUICKHACKS.find((quickhack) => quickhack.id === id) ?? null;
}
