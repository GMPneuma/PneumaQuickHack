import { JACK_IN_ACTION_ICON, MODULE_ID, QUICKHACK_ICON } from "./constants.js";
import { canOperateActor } from "./foundry-utils.js";
import { executeJackIn } from "./jack-in.js";
import { executeQuickhack } from "./quickhack.js";
import { isQuickhackHotbarDrop } from "./hotbar-rules.js";

const ACTIONS = Object.freeze({
  "jack-in": {
    labelKey: "PNEUMA_QUICKHACK.Item.UseJackIn",
    icon: JACK_IN_ACTION_ICON,
    execute: executeJackIn
  },
  quickhack: {
    labelKey: "PNEUMA_QUICKHACK.Item.UseQuickhack",
    icon: QUICKHACK_ICON,
    execute: executeQuickhack
  }
});

export async function executeActorAction(actionId, actorUuid) {
  const actor = await fromUuid(actorUuid);
  const action = ACTIONS[actionId];
  if (!actor || !action) return null;
  if (!canOperateActor(actor)) {
    ui.notifications.error(game.i18n.format("PNEUMA_QUICKHACK.Error.NotAuthorized", { actor: actor.name }));
    return null;
  }
  return action.execute(actor);
}

async function createActionMacro(data, slot) {
  const actor = await fromUuid(data.actorUuid);
  const action = ACTIONS[data.pneumaQuickhackAction];
  if (!actor || !action) return;
  const label = game.i18n.localize(action.labelKey);
  const command = `game.modules.get("${MODULE_ID}").api.executeActorAction("${data.pneumaQuickhackAction}", "${data.actorUuid}");`;
  let macro = game.macros.find((candidate) => (
    candidate.name === `${actor.name} - ${label}`
    && candidate.command === command
    && candidate.isOwner
  ));
  if (!macro) {
    macro = await Macro.create({
      name: `${actor.name} - ${label}`,
      type: "script",
      img: action.icon,
      command
    }, { displaySheet: false });
  }
  await game.user.assignHotbarMacro(macro, slot);
}

export function registerHotbarIntegration() {
  const module = game.modules.get(MODULE_ID);
  module.api = { ...(module.api ?? {}), executeActorAction };
  Hooks.on("hotbarDrop", (_hotbar, data, slot) => {
    if (!isQuickhackHotbarDrop(data)) return;
    void createActionMacro(data, slot);
    return false;
  });
}
