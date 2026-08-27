import { MODULE_ID } from "./constants.js";
import {
  AUDIENCE,
  DEFAULT_ROUTING_CONFIG,
  mapRoutingToRuntime,
  normalizeRoutingConfig
} from "./routing-config.js";

const ROUTING_SETTING = "messageRouting";

const LEGACY_SETTINGS = Object.freeze({
  RESULT_VISIBILITY: "jackInResultVisibility",
  DETECTED_NOTIFICATION: "detectedJackInNotification",
  CONCEAL_IDENTITY: "concealNetrunnerIdentity"
});

export class QuickhackMessageSettings extends FormApplication {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      id: "pneuma-quickhack-message-settings",
      title: "PNEUMA_QUICKHACK.Settings.Menu.Title",
      template: `modules/${MODULE_ID}/templates/message-settings.hbs`,
      width: 760,
      height: "auto",
      closeOnSubmit: true
    });
  }

  async getData() {
    return {
      config: getRoutingConfig(),
      playerResultChoices: {
        [AUDIENCE.PUBLIC]: "PNEUMA_QUICKHACK.Settings.Choice.Everyone",
        [AUDIENCE.SOURCE_OWNERS]: "PNEUMA_QUICKHACK.Settings.Choice.NetrunnerOwnersAndGm",
        [AUDIENCE.GM]: "PNEUMA_QUICKHACK.Settings.Choice.GmOnly"
      },
      npcResultChoices: {
        [AUDIENCE.GM]: "PNEUMA_QUICKHACK.Settings.Choice.GmOnly",
        [AUDIENCE.PUBLIC]: "PNEUMA_QUICKHACK.Settings.Choice.Everyone"
      },
      playerAlertChoices: {
        [AUDIENCE.TARGET_OWNERS]: "PNEUMA_QUICKHACK.Settings.Choice.TargetOwnersOnly",
        [AUDIENCE.PUBLIC]: "PNEUMA_QUICKHACK.Settings.Choice.Everyone",
        [AUDIENCE.GM]: "PNEUMA_QUICKHACK.Settings.Choice.GmOnly"
      },
      npcAlertChoices: {
        [AUDIENCE.GM]: "PNEUMA_QUICKHACK.Settings.Choice.GmOnly",
        [AUDIENCE.PUBLIC]: "PNEUMA_QUICKHACK.Settings.Choice.Everyone"
      }
    };
  }

  async _updateObject(_event, formData) {
    await game.settings.set(MODULE_ID, ROUTING_SETTING, normalizeRoutingConfig({
      playerAttackerResultAudience: formData.playerAttackerResultAudience,
      playerAttackerRevealIdentity: formData.playerAttackerRevealIdentity === "true",
      npcAttackerResultAudience: formData.npcAttackerResultAudience,
      npcAttackerRevealIdentity: formData.npcAttackerRevealIdentity === "true",
      playerTargetAlertAudience: formData.playerTargetAlertAudience,
      playerTargetIncludeTotals: formData.playerTargetIncludeTotals === "true",
      npcTargetAlertAudience: formData.npcTargetAlertAudience,
      npcTargetIncludeTotals: formData.npcTargetIncludeTotals === "true",
      npcTargetShareAwareness: formData.npcTargetShareAwareness === "true"
    }));
  }
}

export function registerModuleSettings() {
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

  game.settings.register(MODULE_ID, LEGACY_SETTINGS.RESULT_VISIBILITY, {
    scope: "world", config: false, type: String, default: "public"
  });
  game.settings.register(MODULE_ID, LEGACY_SETTINGS.DETECTED_NOTIFICATION, {
    scope: "world", config: false, type: String, default: "targetOwners"
  });
  game.settings.register(MODULE_ID, LEGACY_SETTINGS.CONCEAL_IDENTITY, {
    scope: "world", config: false, type: Boolean, default: true
  });
}

export function getRoutingConfig() {
  return normalizeRoutingConfig(game.settings.get(MODULE_ID, ROUTING_SETTING));
}

export function getJackInSettings(context) {
  return mapRoutingToRuntime(getRoutingConfig(), context);
}
