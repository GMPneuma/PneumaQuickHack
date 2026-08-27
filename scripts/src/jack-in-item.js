import {
  MODULE_ID,
  QUICKHACK_ACTION,
  QUICKHACK_FOLDER_NAME,
  QUICKHACK_ICON
} from "./constants.js";
import { getQuickhackIcon, QUICKHACKS } from "./quickhack-catalog.js";

export function isQuickhackItem(item) {
  return item?.getFlag(MODULE_ID, "action") === QUICKHACK_ACTION;
}

function isModuleFolder(folder) {
  return folder?.type === "Item" && folder.getFlag(MODULE_ID, "quickhackFolder") === true;
}

async function ensureQuickhackFolder() {
  const existingFolder = game.folders.find((folder) => isModuleFolder(folder));
  if (existingFolder) return { folder: existingFolder, created: false };
  const folder = await Folder.create({
    name: QUICKHACK_FOLDER_NAME,
    type: "Item",
    flags: { [MODULE_ID]: { quickhackFolder: true } }
  });
  return { folder, created: true };
}

function quickhackReferenceData(quickhack, folderId) {
  const effect = game.i18n.localize(`PNEUMA_QUICKHACK.Item.Effect.${quickhack.id}`);
  return {
    name: quickhack.name,
    type: "gear",
    img: getQuickhackIcon(quickhack.id),
    folder: folderId,
    system: {
      description: {
        value: `<p><strong>${quickhack.tier} Quickhack — DV${quickhack.dv}</strong></p><p>${effect}</p>`,
        chat: "",
        unidentified: ""
      },
      equipped: "owned",
      isElectronic: true,
      amount: 1
    },
    flags: { [MODULE_ID]: { quickhackId: quickhack.id } }
  };
}

export async function ensureQuickhackItems() {
  if (!game.user.isGM) return null;
  const primaryGm = game.users
    .filter((user) => user.active && user.isGM)
    .sort((a, b) => a.id.localeCompare(b.id))[0];
  if (primaryGm?.id !== game.user.id) return null;
  const folderResult = await ensureQuickhackFolder();
  const folder = folderResult.folder;
  let changed = folderResult.created;

  let launcher = game.items.find((item) => isQuickhackItem(item));
  if (!launcher) {
    changed = true;
    launcher = await Item.create({
      name: game.i18n.localize("PNEUMA_QUICKHACK.Item.Name"),
      type: "weapon",
      img: QUICKHACK_ICON,
      folder: folder.id,
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
  } else {
    const launcherUpdates = {};
    if (launcher.folder?.id !== folder.id) launcherUpdates.folder = folder.id;
    if (launcher.img !== QUICKHACK_ICON) launcherUpdates.img = QUICKHACK_ICON;
    if (Object.keys(launcherUpdates).length > 0) {
      changed = true;
      await launcher.update(launcherUpdates);
    }
  }

  const references = [];
  for (const quickhack of QUICKHACKS) {
    const matches = game.items.filter(
      (item) => item.getFlag(MODULE_ID, "quickhackId") === quickhack.id
    );
    if (matches.length === 0) {
      changed = true;
      references.push(await Item.create(quickhackReferenceData(quickhack, folder.id)));
      continue;
    }
    for (const item of matches) {
      const itemUpdates = {};
      if (item.folder?.id !== folder.id) itemUpdates.folder = folder.id;
      const expectedIcon = getQuickhackIcon(quickhack.id);
      if (item.img !== expectedIcon) itemUpdates.img = expectedIcon;
      if (Object.keys(itemUpdates).length > 0) {
        changed = true;
        await item.update(itemUpdates);
      }
      references.push(item);
    }
  }

  if (changed) ui.notifications.info(game.i18n.localize("PNEUMA_QUICKHACK.Item.Created"));
  return { folder, launcher, references };
}
