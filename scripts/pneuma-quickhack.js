import { MODULE_ID } from "./src/constants.js";
import { registerChatIntegration } from "./src/chat-integration.js";
import { registerForceOutSocket } from "./src/force-out.js";
import { registerHotbarIntegration } from "./src/hotbar-integration.js";
import { ensureQuickhackItems } from "./src/jack-in-item.js";
import { registerQuickhackEffects } from "./src/quickhack-effects.js";
import { registerModuleSettings } from "./src/settings.js";
import { registerSheetIntegration } from "./src/sheet-integration.js";

Hooks.once("init", () => {
  registerModuleSettings();
  registerSheetIntegration();
  registerHotbarIntegration();
  registerChatIntegration();
  console.log(`${MODULE_ID} | Initializing`);
});

Hooks.once("ready", async () => {
  registerForceOutSocket();
  registerQuickhackEffects();
  if (game.user.isGM) await ensureQuickhackItems();
  console.log(`${MODULE_ID} | Ready`);
});
