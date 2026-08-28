import { MODULE_ID } from "./constants.js";
import {
  AUDIENCE,
  DEFAULT_ROUTING_CONFIG,
  normalizeRoutingConfig
} from "./routing-config.js";

const ROUTING_SETTING = "messageRouting";
const REQUIRE_OWNED_QUICKHACKS_SETTING = "requireOwnedQuickhacks";

export class QuickhackMessageSettings extends FormApplication {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      id: "pneuma-quickhack-message-settings",
      title: "PNEUMA_QUICKHACK.Settings.Menu.Title",
      template: `modules/${MODULE_ID}/templates/message-settings.hbs`,
      width: 1080,
      height: "auto",
      closeOnSubmit: true
    });
  }

  async getData() {
    const config = getRoutingConfig();
    return {
      config: {
        ...config,
        npcToPlayerJackInShowTotals: String(config.npcToPlayerJackInShowTotals),
        npcToPlayerJackInRevealAttacker: String(config.npcToPlayerJackInRevealAttacker),
        npcToPlayerQuickhackRevealAttacker: String(config.npcToPlayerQuickhackRevealAttacker)
      },
      detectedPlayerChoices: {
        [AUDIENCE.TARGET_OWNERS]: "PNEUMA_QUICKHACK.Settings.Choice.TargetOwnersOnly",
        [AUDIENCE.PUBLIC]: "PNEUMA_QUICKHACK.Settings.Choice.Everyone"
      },
      totalsChoices: {
        true: "PNEUMA_QUICKHACK.Settings.Choice.ShowTotals",
        false: "PNEUMA_QUICKHACK.Settings.Choice.HideTotals"
      },
      identityChoices: {
        true: "PNEUMA_QUICKHACK.Settings.Choice.ShowNpcName",
        false: "PNEUMA_QUICKHACK.Settings.Choice.HideNpcName"
      },
      awarenessChoices: {
        [AUDIENCE.PUBLIC]: "PNEUMA_QUICKHACK.Settings.Choice.ShowNpcAwareness",
        [AUDIENCE.SOURCE_OWNERS]: "PNEUMA_QUICKHACK.Settings.Choice.AttackerOnlyAwareness",
        [AUDIENCE.GM]: "PNEUMA_QUICKHACK.Settings.Choice.GmOnly"
      }
    };
  }

  async _updateObject(_event, formData) {
    await game.settings.set(MODULE_ID, ROUTING_SETTING, normalizeRoutingConfig({
      npcToPlayerJackInAudience: formData.npcToPlayerJackInAudience,
      npcToPlayerJackInShowTotals: formData.npcToPlayerJackInShowTotals === "true",
      npcToPlayerJackInRevealAttacker: formData.npcToPlayerJackInRevealAttacker === "true",
      npcToPlayerQuickhackAudience: formData.npcToPlayerQuickhackAudience,
      npcToPlayerQuickhackRevealAttacker: formData.npcToPlayerQuickhackRevealAttacker === "true",
      playerToNpcJackInAudience: formData.playerToNpcJackInAudience
    }));
  }
}

export function registerModuleSettings() {
  game.settings.register(MODULE_ID, REQUIRE_OWNED_QUICKHACKS_SETTING, {
    name: "PNEUMA_QUICKHACK.Settings.RequireOwnedQuickhacks.Name",
    hint: "PNEUMA_QUICKHACK.Settings.RequireOwnedQuickhacks.Hint",
    scope: "world",
    config: true,
    restricted: true,
    type: Boolean,
    default: false
  });
  game.settings.register(MODULE_ID, ROUTING_SETTING, {
    scope: "world",
    config: false,
    type: Object,
    default: DEFAULT_ROUTING_CONFIG
  });
  game.settings.registerMenu(MODULE_ID, "messageSettingsMenu", {
    name: "PNEUMA_QUICKHACK.Settings.Menu.Name",
    label: "PNEUMA_QUICKHACK.Settings.Menu.Button",
    hint: "PNEUMA_QUICKHACK.Settings.Menu.Hint",
    icon: "fas fa-comments",
    type: QuickhackMessageSettings,
    restricted: true
  });

}

export function getRoutingConfig() {
  return normalizeRoutingConfig(game.settings.get(MODULE_ID, ROUTING_SETTING));
}

export function requireOwnedQuickhacks() {
  return game.settings.get(MODULE_ID, REQUIRE_OWNED_QUICKHACKS_SETTING) === true;
}
