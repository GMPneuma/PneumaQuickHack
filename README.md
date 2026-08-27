# Pneuma's Quickhack

A Foundry Virtual Tabletop v12 module.

## Installation

Install the module using this manifest URL:

`https://github.com/GMPneuma/PneumaQuickHack/releases/latest/download/module.json`

## Development

The module entry point is `scripts/pneuma-quickhack.js`. Enable **Pneuma's Quickhack** from Foundry's module management screen after installing it in your Foundry `Data/modules` directory.

## Quickhack Items

On the first load as a GM, the module creates a **Pneuma's Quickhack** folder in the world's Items directory. The folder contains the **Quickhack** launcher plus one illustrated reference Item for each of the 11 CEMK Quickhacks. Missing Items are restored on later GM loads without duplicating existing flagged Items.

Drag the **Quickhack** launcher onto a Netrunner's character sheet and equip it. It then appears with the actor's equipped weapons on the Fight tab. By default, inventory ownership is not required to perform a Quickhack.

GMs can enable **Require Owned Quickhacks** in the module settings. In that mode, the picker shows only Quickhack Items present in the acting Netrunner's inventory; they do not need to be equipped.

The equipped item provides two controls:

- **Jack In** resolves the Interface vs. WILL Jack-In attempt.
- **Quickhack** opens the complete CEMK Quickhack list, then uses the Cyberpunk RED Interface dialog for modifiers and LUCK before resolving the selected DV. Successful non-Lure hacks alert the target. Synapse Burnout provides a native-style 3d6 damage button and CPR damage card; its GM lightning-bolt control applies damage directly to HP without armor, ablation, or critical bonus damage. Adding CPR's native Damaged Ear injury is automated. MOVE changes and Overheat are guided. Statuses are applied only when registered natively by the system. The module maintains no effect timers or automatic cleanup.

To use it:

1. Target exactly one character token.
2. If the actor has multiple tokens on the scene, select the token performing the action.
3. Click the network icon on the equipped **Quickhack** item to Jack In.

The action requires the Netrunner role, checks ownership and the 25-square range, rolls Interface against WILL, and alerts an aware target according to the configured message settings.

## GM Settings

Open **Configure Settings -> Module Settings -> Quickhack Message Settings**. The GM-only window is divided into four boxes:

- **Player Netrunner Attacks**: choose complete-result recipients and whether other players learn the Netrunner's identity.
- **NPC Netrunner Attacks**: choose complete-result recipients and whether players learn the NPC's identity.
- **Player Character Is Targeted**: choose detection-alert recipients and whether the alert includes roll totals.
- **NPC Is Targeted**: choose detection-alert recipients and whether the alert includes roll totals.

Anonymous shared results keep the underlying player Interface card private to the Netrunner's owners and GMs. NPC Interface rolls remain blind to GMs.

## Testing

Run the focused rules tests with `npm test`.

Create the local Foundry module build with `npm run build`. The `dist` directory is the module root and contains `module.json` directly.

## Compatibility

- Foundry Virtual Tabletop v12
