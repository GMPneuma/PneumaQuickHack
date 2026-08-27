import { MODULE_ID } from "./src/constants.js";
import { registerChatIntegration } from "./src/chat-integration.js";
import { beginForceOut, registerForceOutSocket } from "./src/force-out.js";
import { executeJackIn, executeJackInFromSelection } from "./src/jack-in.js";
import { ensureQuickhackItems } from "./src/jack-in-item.js";
import { executeQuickhack } from "./src/quickhack.js";
import { registerQuickhackEffects } from "./src/quickhack-effects.js";
import { registerModuleSettings } from "./src/settings.js";
import { registerSheetIntegration } from "./src/sheet-integration.js";

Hooks.once("init", () => {
  registerModuleSettings();
  registerSheetIntegration();
  registerChatIntegration();
  console.log(`${MODULE_ID} | Initializing`);
});

Hooks.once("ready", async () => {
  registerForceOutSocket();
  registerQuickhackEffects();
  const module = game.modules.get(MODULE_ID);
  if (!module) return;

  module.api = Object.freeze({
    jackIn: executeJackInFromSelection,
    jackInAsActor: executeJackIn,
    quickhack: executeQuickhack,
    forceInvaderOut: beginForceOut,
    ensureQuickhackItem: ensureQuickhackItems
  });

  if (game.user.isGM) await ensureQuickhackItems();
  console.log(`${MODULE_ID} | Ready`);
});
