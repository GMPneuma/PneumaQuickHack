# Pneuma Quickhack Roadmap

## Project Goal

Provide Foundry Virtual Tabletop v12 automation for the Cyberpunk: Edgerunners Mission Kit quickhacking rules while leaving uncommon situations and table rulings under GM control.

The initial module will replace the existing Jack-In macro, preserve all of its current behavior, and add character-sheet and chat-based workflows for Jacking In, performing Quickhacks, and attempting to expel a Netrunner.

## Design Principles

- Automate complicated rolls and common effects without turning the tabletop rules into rigid video-game restrictions.
- Preserve the Cyberpunk RED system's native roll dialogs and roll cards where practical.
- Keep GM-controlled information private and avoid revealing a concealed Netrunner.
- Do not require every NPC to carry a Neuroport item. The setting assumes Neuroports are common, and the GM will handle exceptions.
- Do not modify the Cyberpunk RED system itself. Integrate through the module.
- Do not track state unless it provides clear value to the agreed workflow.

## Phase 1: Jack-In Module Feature

Move the existing Jack-In macro into the module and preserve its current features:

- Require one source token and one target token.
- Require the source actor to have the Netrunner role.
- Read Interface from the source actor's Netrunner role.
- Read WILL from the target actor.
- Use the Cyberpunk RED system's native Interface roll workflow for player-owned Netrunners.
- Use a private custom Interface roll for NPC Netrunners.
- Roll target WILL privately.
- Support Cyberpunk RED exploding d10 critical successes and critical failures in custom rolls.
- Compare Interface against WILL to determine whether the target notices the Jack-In attempt.
- Treat a tie as a failure for the Netrunner, making the target aware.
- Preserve appropriate public, owner-only, and GM-only chat output.
- Preserve anonymous target notifications when the Netrunner's identity is concealed.

### Jack-In Validation

Add the following validation:

- The source and target cannot be the same token.
- The user must be a GM or an Owner of the source actor.
- The target must be within 50 m/yds of the Netrunner.
- If the target has the Netrunner role, the target automatically notices the Jack-In attempt. The normal initial awareness contest is skipped.

Do not validate:

- Whether the target owns a Neuroport.
- Whether a previously ejected Netrunner is within the 60-minute lockout.
- Whether the target is visible to the Netrunner. Attacker-specific visibility validation is deferred to the backlog.

## Phase 2: GM-Only Settings

Replace the configuration constants at the top of the macro with clearly named, GM-only module settings.

### Jack-In Result Visibility

Controls who receives the complete Jack-In result:

- GM Only
- Everyone
- Netrunner Owners and GM

The setting description must explain that a public complete result identifies a player-owned Netrunner even if target-facing identity concealment is enabled.

### Detected Jack-In Notification

Controls who sees the notification that a target detected a Jack-In attempt:

- Target Owners Only
- Everyone

### Conceal Netrunner Identity from Target

Controls whether the special target-facing notification identifies the source actor:

- Enabled: use an anonymous identity such as "Unknown Netrunner."
- Disabled: identify the source actor normally.

All settings must include plain-language descriptions of their behavior and interactions.

## Phase 3: Equippable Quickhacking Items

Do not use the Cyberpunk RED character sheet's Combat/Fight -> NET view. Most potential quickhack targets do not use that section, and the module's player actions should remain accessible from the normal Fight tab.

Provide **Jack In to Person** as a normal equippable Cyberpunk RED weapon item:

- Create one flagged world Item for the GM when the module is first enabled.
- Allow the GM to drag the item onto Netrunner character sheets.
- Use the normal Owned -> Carried -> Equipped workflow.
- Display the equipped item alongside weapons such as Unarmed on the Fight tab.
- Replace the flagged item's attack control with the Jack-In workflow.
- Hide meaningless weapon damage and firing-mode controls.
- Identify its special behavior with a module flag rather than its displayed name, allowing the item to be renamed safely.

The actor who owns the activated item is the source Netrunner. The workflow uses the user's currently targeted token as the target. When an actor has multiple active tokens on the scene, the user must select the token performing the action.

Use the same equippable-item pattern for **Perform Quickhack** when that workflow is implemented.

Foundry's Cyberpunk RED system does not appear to maintain or spend a numeric pool of Net Actions. The initial module will not add Net Action accounting.

Jack Out is deferred because the module will not initially track connections, leaving it with no meaningful mechanical effect beyond a chat declaration.

## Phase 4: Expel Netrunner Workflow

A character who knows they have been compromised must be able to attempt to expel the invading Netrunner without needing a NET section on their character sheet.

Resolve expulsion as:

```text
Defender: WILL + Concentration + 1d10
vs.
Netrunner: Interface + 1d10
```

The defender must beat the Netrunner's result. A tie favors the Netrunner.

### Expulsion Trigger

Provide an **Expel Netrunner** button in contextual, target-facing chat messages:

- Include it when the target detects the initial Jack-In attempt.
- Include it after every successful Quickhack that alerts the target.
- Do not include it for a failed Quickhack because failure does not alert the target.
- Do not include it for a successful Lure because Lure explicitly does not alert the target.

The button must:

- Preserve enough hidden source and target context to resolve the opposed roll.
- Avoid revealing the identity of an anonymous Netrunner.
- Be usable only by a GM or an Owner of the defending actor.
- Remain reusable from the chat message for later attempts.
- Use native system rolls where practical, including normal modifiers and critical dice.
- Announce whether the Netrunner was successfully expelled.

There will be no manual character-sheet fallback for expulsion because most potential defenders do not have a NET section.

The module will not track or enforce the 60-minute lockout following a successful expulsion.

## Phase 5: Quickhack Selection and Resolution

The first quickhack mode is **Allow Any Quickhack**. It makes every CEMK Quickhack available without requiring inventory items.

Initial workflow:

1. The Netrunner clicks **Perform Quickhack**.
2. The module requires exactly one target.
3. The module performs authorization, self-target, and range validation.
4. The module presents Quickhacks grouped by difficulty.
5. The Netrunner selects a Quickhack.
6. The module rolls Interface against the Quickhack's DV.
7. The module posts the result using the configured visibility rules.
8. On success, the module applies the supported automation and alerts the target unless the selected Quickhack is Lure.
9. Any target-facing alert includes **Expel Netrunner**.

Because connections are not tracked, the module will not technically verify that the source is already jacked into the target. Players and GMs are responsible for enforcing that prerequisite.

### Quickhack List

#### Simple - DV6

- Impair Movement
- Sonic Shock

#### Standard - DV8

- Overheat
- Short Circuit

#### Difficult - DV10

- Cyberware Malfunction
- Lure
- Slow
- Synapse Burnout

#### Advanced - DV12

- Puppet
- Shard Ejection
- System Reset

## Phase 6: Quickhack Effect Automation

Implement each Quickhack according to the amount of safe, useful automation it supports.

### Primarily Automatable

- Impair Movement
- Sonic Shock
- Overheat
- Slow
- Synapse Burnout
- System Reset

### Requires a Choice Workflow

- Short Circuit
- Cyberware Malfunction
- Shard Ejection

### Requires Guided Tabletop Handling

- Lure
- Puppet

Before implementing lasting effects, determine how the Cyberpunk RED system handles MOVE modifiers, Critical Injuries, fire, ongoing damage, Prone, Unconscious, and timed Active Effects. Prefer integration with existing system behavior over duplicate module state.

## Explicitly Out of Initial Scope

- Neuroport inventory validation
- Persistent Jack-In connection tracking
- Tracking multiple simultaneous connections
- Stored target-awareness state
- Automatic disconnection due to range, visibility, or death
- Ejection lockout tracking or enforcement
- Net Action spending or tracking
- Self-ICE and Passwall Breach automation
- Requiring Quickhack items in actor inventories
- A mechanically enforced Jack Out action

## Backlog

### Attacker-Specific Visibility Validation

Investigate a reliable and performant way to test visibility from the Netrunner's perspective, including walls, token vision, lighting, darkness, detection modes, and token size. Do not implement until its behavior is trusted through in-Foundry testing.

### Self-ICE and Breach

Add Passwall and Breach workflows after the initial Jack-In and Quickhack features are stable.

### Inventory-Required Quickhacks

Add an optional homebrew mode that limits available Quickhacks to items carried by the Netrunner. Define its item data model only after the unrestricted quickhack workflow is complete.

### Net Action Accounting

Revisit only if the Cyberpunk RED system adds compatible Net Action tracking or the module gains a clear, low-friction design for it.

### Connection and Lockout Tracking

Revisit persistent connections, Jack Out, automatic disconnection, and ejection lockouts only if play experience demonstrates that the added state management is worthwhile.
