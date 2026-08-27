import { JACK_IN_ACTION, MODULE_ID } from "./constants.js";

const ITEM_SETTING = "jackInWorldItemId";

export function isJackInItem(item) {
  return item?.getFlag(MODULE_ID, "action") === JACK_IN_ACTION;
}

export function registerJackInItemSettings() {
  game.settings.register(MODULE_ID, ITEM_SETTING, {
    scope: "world",
    config: false,
    type: String,
    default: ""
  });
}

export async function ensureJackInWorldItem() {
  if (!game.user.isGM) return null;

  const storedId = game.settings.get(MODULE_ID, ITEM_SETTING);
  const storedItem = storedId ? game.items.get(storedId) : null;
  if (isJackInItem(storedItem)) return storedItem;

  const existingItem = game.items.find((item) => isJackInItem(item));
  if (existingItem) {
    await game.settings.set(MODULE_ID, ITEM_SETTING, existingItem.id);
    return existingItem;
  }

  const item = await Item.create({
    name: game.i18n.localize("PNEUMA_QUICKHACK.Item.JackInName"),
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
    flags: { [MODULE_ID]: { action: JACK_IN_ACTION } }
  });

  await game.settings.set(MODULE_ID, ITEM_SETTING, item.id);
  ui.notifications.info(game.i18n.localize("PNEUMA_QUICKHACK.Item.Created"));
  return item;
}
