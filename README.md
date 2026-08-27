# Pneuma Quickhack

A Foundry Virtual Tabletop v12 module.

## Installation

Install the module using this manifest URL:

`https://github.com/GMPneuma/PneumaQuickHack/releases/latest/download/module.json`

## Development

The module entry point is `scripts/pneuma-quickhack.js`. Enable **Pneuma Quickhack** from Foundry's module management screen after installing it in your Foundry `Data/modules` directory.

## Jack In to Person

On the first load as a GM, the module creates **Jack In to Person** in the world's Items directory. Drag it onto a Netrunner's character sheet and equip it. It then appears with the actor's equipped weapons on the Fight tab.

To use it:

1. Target exactly one character token.
2. If the actor has multiple tokens on the scene, select the token performing the action.
3. Click the network icon on the equipped **Jack In to Person** item.

The action requires the Netrunner role, checks ownership and the 25-square range, rolls Interface against WILL, and privately alerts an aware target according to the current macro-compatible defaults.

For temporary macro compatibility, use:

```js
game.modules.get("pneuma-quickhack").api.jackIn();
```

## Testing

Run the focused rules tests with `npm test`.

## Compatibility

- Foundry Virtual Tabletop v12
