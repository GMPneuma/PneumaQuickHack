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
- **Quickhack** opens the complete CEMK Quickhack list, then uses the Cyberpunk RED Interface dialog for modifiers and LUCK before resolving the selected DV. Player targets are always informed after a Quickhack attempt. Synapse Burnout provides a native-style 3d6 damage button and CPR damage card; its GM lightning-bolt control applies damage directly to HP without armor, ablation, or critical bonus damage. Adding CPR's native Damaged Ear injury is automated. MOVE changes and Overheat are guided. Statuses are applied only when registered natively by the system. The module maintains no effect timers or automatic cleanup.

To use it:

1. Target exactly one character token.
2. If the actor has multiple tokens on the scene, select the token performing the action.
3. Click the network icon on the equipped **Quickhack** item to Jack In.

The action requires the Netrunner role, checks ownership and the 25-square range, rolls Interface against WILL, and alerts an aware target according to the configured message settings.

## GM Settings

Open **Configure Settings -> Module Settings -> Pneuma's Quickhack**. The GM-only window mirrors the four attacker → target scenarios:

- **NPC → NPC:** Jack-In and Quickhack rolls and results are always GM-blind.
- **NPC → Player Character:** attack rolls are always GM-blind. A detected Jack-In can go to the target and GM or everyone, optionally include the opposed totals, and identify or conceal the NPC. Quickhack results can go to the target and GM or everyone and identify or conceal the NPC; the Interface total is always included.
- **Player Character → NPC:** attack rolls and Quickhack results are public. Jack-In results always go to the attacker and GM; the GM chooses whether everyone sees them instead.
- **Player Character → Player Character:** all rolls and results are public.

Each action creates one Interface attack card and one compact result card. There are no additional detection-alert or target-notice cards.

NPC Interface rolls retain the native modifier and LUCK dialog but suppress Dice So Nice animations so hidden NPC rolls do not appear on the table.

NPC Interface rolls retain the native modifier and LUCK dialog but suppress Dice So Nice animations so hidden NPC rolls do not appear on the table.

## Testing

Run the focused rules tests with `npm test`.

Create the local Foundry module build with `npm run build`. The `dist` directory is the module root and contains `module.json` directly.

## Compatibility

- Foundry Virtual Tabletop v12
