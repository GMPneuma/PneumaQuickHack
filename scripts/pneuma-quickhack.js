import { MODULE_ID } from "./src/constants.js";
import { executeJackIn, executeJackInFromSelection } from "./src/jack-in.js";
import { ensureJackInWorldItem, registerJackInItemSettings } from "./src/jack-in-item.js";
import { registerSheetIntegration } from "./src/sheet-integration.js";

Hooks.once("init", () => {
  registerJackInItemSettings();
  registerSheetIntegration();
  console.log(`${MODULE_ID} | Initializing`);
});

Hooks.once("ready", async () => {
  const module = game.modules.get(MODULE_ID);
  if (!module) return;

  module.api = Object.freeze({
    jackIn: executeJackInFromSelection,
    jackInAsActor: executeJackIn,
    ensureJackInItem: ensureJackInWorldItem
  });

  if (game.user.isGM) await ensureJackInWorldItem();
  console.log(`${MODULE_ID} | Ready`);
});
