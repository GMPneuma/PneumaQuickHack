import { MODULE_ID, QUICKHACK_ACTION } from "./constants.js";

export function isQuickhackItem(item) {
  return item?.getFlag(MODULE_ID, "action") === QUICKHACK_ACTION;
}

export async function ensureQuickhackItems() {
  if (!game.user.isGM) return null;

  const existingItem = game.items.find((item) => isQuickhackItem(item));
  if (existingItem) return existingItem;

  const item = await Item.create({
    name: game.i18n.localize("PNEUMA_QUICKHACK.Item.Name"),
    type: "weapon",
    img: "icons/svg/lightning.svg",
    system: {
      description: {
        value: game.i18n.localize("PNEUMA_QUICKHACK.Item.JackInDescription"),
        chat: "",
        unidentified: ""
      },
      equipped: "owned",
      weaponType: "unarmed",
      isRanged: false,
      handsReq: 0,
      rof: 1,
      damage: "0",
      unarmedAutomaticCalculation: false
    },
    flags: { [MODULE_ID]: { action: QUICKHACK_ACTION } }
  });

  ui.notifications.info(game.i18n.localize("PNEUMA_QUICKHACK.Item.Created"));
  return item;
}
