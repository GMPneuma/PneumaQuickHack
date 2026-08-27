# Pneuma's Quickhack

A Foundry Virtual Tabletop v12 module.

## Installation

Install the module using this manifest URL:

`https://github.com/GMPneuma/PneumaQuickHack/releases/latest/download/module.json`

## Development

The module entry point is `scripts/pneuma-quickhack.js`. Enable **Pneuma's Quickhack** from Foundry's module management screen after installing it in your Foundry `Data/modules` directory.

## Quickhack Item

On the first load as a GM, the module creates **Quickhack** in the world's Items directory. Drag it onto a Netrunner's character sheet and equip it. It then appears with the actor's equipped weapons on the Fight tab.

The equipped item provides two controls:

- **Jack In** resolves the Interface vs. WILL Jack-In attempt.
- **Quickhack** opens the complete CEMK Quickhack list, then uses the Cyberpunk RED Interface dialog for modifiers and LUCK before resolving the selected DV. Successful non-Lure hacks alert the target. Direct damage and adding CPR's native Damaged Ear injury are automated. MOVE changes and Overheat are guided. Statuses are applied only when registered natively by the system. The module maintains no effect timers or automatic cleanup.

To use it:

1. Target exactly one character token.
2. If the actor has multiple tokens on the scene, select the token performing the action.
3. Click the network icon on the equipped **Quickhack** item to Jack In.

The action requires the Netrunner role, checks ownership and the 25-square range, rolls Interface against WILL, and privately alerts an aware target according to the current macro-compatible defaults.

## GM Settings

Open **Configure Settings -> Module Settings -> Quickhack Message Settings**. The GM-only window is divided into four boxes:

- **Player Netrunner Attacks**: choose complete-result recipients and whether other players learn the Netrunner's identity.
- **NPC Netrunner Attacks**: choose complete-result recipients and whether players learn the NPC's identity.
- **Player Character Is Targeted**: choose detection-alert recipients and whether the alert includes roll totals.
- **NPC Is Targeted**: choose detection-alert recipients and whether the alert includes roll totals.

Anonymous shared results keep the underlying player Interface card private to the Netrunner's owners and GMs. NPC Interface rolls remain blind to GMs.

For temporary macro compatibility, use:

```js
game.modules.get("pneuma-quickhack").api.jackIn();
```

## Testing

Run the focused rules tests with `npm test`.

Create the local Foundry module build with `npm run build`. The `dist` directory is the module root and contains `module.json` directly.

## Compatibility

- Foundry Virtual Tabletop v12
