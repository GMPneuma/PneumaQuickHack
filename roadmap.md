# Pneuma Quickhack Roadmap

## Project Goal

Provide Foundry Virtual Tabletop v12 automation for the Cyberpunk: Edgerunners Mission Kit quickhacking rules while leaving uncommon situations and table rulings under GM control.

The initial module will replace the existing Jack-In macro, preserve all of its current behavior, and add character-sheet and chat-based workflows for Jacking In, performing Quickhacks, and attempting to force an invading Netrunner out.

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
- Use the Cyberpunk RED system's native Interface roll workflow for player and NPC Netrunners.
- Make NPC Interface roll cards GM-blind and suppress their Dice So Nice animations.
- Roll target WILL privately.
- Support Cyberpunk RED exploding d10 critical successes and critical failures in custom rolls.
- Compare Interface against WILL to determine whether the target notices the Jack-In attempt.
- Treat a tie as a failure for the Netrunner, making the target aware.
- Preserve appropriate public, owner-only, and GM-only chat output.
- Preserve anonymous result cards when an NPC Netrunner's identity is concealed.
- Keep Jack-In chat compact: one native Interface attack card and one combined result card. WILL is folded into the result, and no separate detection alert is created.

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

## Phase 2: GM-Only Settings - Implemented

Replace the configuration constants at the top of the macro with clearly named, GM-only module settings.

Use one **Pneuma's Quickhack** settings window divided into four attacker → target scenario boxes. Fixed behavior is stated as fact and dropdowns appear only where the GM has a choice.

### NPC → NPC

- Jack-In and Quickhack attack rolls and results are always GM-blind.
- No configurable options.

### NPC → Player Character

- Jack-In and Quickhack attack rolls are always GM-blind.
- An undetected Jack-In result remains GM-blind.
- A detected Jack-In result goes either to the target and GM or to everyone.
- The detected Jack-In result can show or hide Interface and WILL totals.
- The detected Jack-In and Quickhack result cards independently reveal the NPC or use Unknown Netrunner.
- The Quickhack result goes either to the target and GM or to everyone and always includes the Interface total.

### Player Character → NPC

- Attack rolls and Quickhack results are public.
- The combined Jack-In awareness result always goes to the attacker and GM.
- The GM chooses whether that result is instead shown to everyone.

### Player Character → Player Character

- All Jack-In and Quickhack rolls and results are public.
- No configurable options.

Each action creates one Interface attack card and one compact result card. The module never adds a second detection-alert or target-notice card.

## Phase 3: Equippable Quickhacking Items - Implemented

Do not use the Cyberpunk RED character sheet's Combat/Fight -> NET view. Most potential quickhack targets do not use that section, and the module's player actions should remain accessible from the normal Fight tab.

Provide **Quickhack** as a normal equippable Cyberpunk RED weapon item:

- Create one flagged world Item for the GM when the module is first enabled.
- Allow the GM to drag the item onto Netrunner character sheets.
- Use the normal Owned -> Carried -> Equipped workflow.
- Display the equipped item alongside weapons such as Unarmed on the Fight tab.
- Replace the flagged item's attack control with the Jack-In workflow.
- Replace its damage control with the Perform Quickhack workflow.
- Present distinct **Jack In** and **Quickhack** controls on the normal Fight tab.
- Hide meaningless firing-mode controls and weapon statistics.
- Identify its special behavior with a module flag rather than its displayed name, allowing the item to be renamed safely.

The actor who owns the activated item is the source Netrunner. The workflow uses the user's currently targeted token as the target. When an actor has multiple active tokens on the scene, the user must select the token performing the action.

The **Quickhack** control opens the Phase 5 Quickhack selection and resolution workflow.

### Item Status

- **Quickhack world Item creation:** Implemented. A GM load creates one canonical flagged Item in the Items directory when none exists.
- **Existing Item preservation:** Implemented. Flagged world and actor Items retain user-edited names and descriptions; the module identifies them only through its hidden Item flag.
- **Owned -> Carried -> Equipped workflow:** Implemented through the Cyberpunk RED weapon item type.
- **Fight-tab Jack In control:** Implemented and connected to the Phase 1 Jack-In workflow.
- **Fight-tab Quickhack control:** Implemented as a distinct action entry point.
- **Quickhack selection and roll:** Implemented in Phase 5.
- **Quickhack effects:** Scheduled for Phase 6.
- **Name-independent behavior:** Implemented through the `pneuma-quickhack.action` Item flag.

Foundry's Cyberpunk RED system does not appear to maintain or spend a numeric pool of Net Actions. The initial module will not add Net Action accounting.

Jack Out is deferred because the module will not initially track connections, leaving it with no meaningful mechanical effect beyond a chat declaration.

## Phase 4: Force Netrunner Out Workflow - Implemented

A character who knows they have been compromised must be able to attempt to force the invading Netrunner out without needing a NET section on their character sheet.

Resolve the attempt to force the invader out as:

```text
Defender: WILL + Concentration + 1d10
vs.
Netrunner: Interface + 1d10
```

The defender must beat the Netrunner's result. A tie favors the Netrunner.

### Force Netrunner Out Trigger

Provide a **Force Netrunner Out** button in contextual, target-facing chat messages:

- Include it when the target detects the initial Jack-In attempt.
- Include it after every Quickhack attempt against a player target.
- For NPC targets, include it after successful non-Lure Quickhacks that alert the target.

The button must:

- Preserve enough hidden source and target context to resolve the opposed roll.
- Avoid revealing the identity of an anonymous Netrunner.
- Be usable only by a GM or an Owner of the defending actor.
- Remain reusable from the chat message for later attempts.
- Use native system rolls where practical, including normal modifiers and critical dice.
- Announce whether the Netrunner was successfully ejected.

There will be no manual character-sheet fallback for forcing an invader out because most potential defenders do not have a NET section.

The module will not track or enforce the 60-minute lockout following a successful ejection.

### Force Netrunner Out Status

- **Detected Jack-In trigger:** Implemented on the single combined result card.
- **Defender authorization:** Implemented for GMs and Owner-level users only.
- **Opposed roll:** Implemented with native Concentration and Interface roll dialogs and modifiers.
- **NPC Netrunner resistance:** Interface is rolled automatically and privately when a PC forces an NPC Netrunner out.
- **PC Netrunner resistance:** The owning player receives the native Interface dialog when an NPC or another PC attempts to force them out.
- **Hidden Netrunner handling:** Implemented through active-GM resolution and private Interface output.
- **Reusable attempts:** Implemented; the chat button remains available after each attempt.
- **Player-target Quickhack triggers:** Implemented for every attempt because a player target becomes aware.
- **NPC-target Quickhack triggers:** Implemented for successful non-Lure Quickhacks.
- **Lockout tracking:** Intentionally not implemented.

## Phase 5: Quickhack Selection and Resolution - Implemented

The first quickhack mode is **Allow Any Quickhack**. It makes every CEMK Quickhack available without requiring inventory items.

Initial workflow:

1. The Netrunner clicks **Perform Quickhack**.
2. The module requires exactly one target.
3. The module performs authorization, self-target, and range validation.
4. The module presents Quickhacks grouped by difficulty.
5. The Netrunner selects a Quickhack.
6. The module rolls Interface against the Quickhack's DV.
7. The module posts the result using the configured visibility rules.
8. On success, the module applies the supported automation. Player targets become aware after any attempt; NPC targets are alerted by successful non-Lure Quickhacks.
9. Any aware-target result includes **Force Netrunner Out**.

Because connections are not tracked, the module will not technically verify that the source is already jacked into the target. Players and GMs are responsible for enforcing that prerequisite.

### Quickhack Workflow Status

- **Target, authorization, self-target, and range validation:** Implemented.
- **Quickhack picker grouped by difficulty:** Implemented for all eleven CEMK Quickhacks.
- **Native Interface workflow:** Implemented for both player and NPC Netrunners, including the system modifier and LUCK dialog. NPC roll cards remain GM-only.
- **Interface versus DV resolution:** Implemented; the Interface total must beat the DV.
- **Scenario-based result audience and identity:** Implemented using the four attacker → target cases in Phase 2.
- **Single-card result delivery:** Implemented without a second detection or target-notice event.
- **Player-target awareness:** Every Quickhack attempt alerts the player target and provides Force Netrunner Out on the result.
- **NPC-target awareness:** Successful non-Lure Quickhacks alert the NPC; failed Quickhacks and successful Lure do not.
- **Mechanical Quickhack effects:** Scheduled for Phase 6.

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

## Phase 6: Quickhack Effect Automation - Implemented

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

### Effect Status

- **Impair Movement:** Guided handling only. The module does not change or track MOVE.
- **Sonic Shock:** Adds CPR's native Damaged Ear Critical Injury without bonus damage. Players remove it manually when the effect ends.
- **Overheat:** Guided handling only. Cyberpunk RED registers no native On Fire status, so this module does not create a substitute status or automate ongoing fire damage.
- **Slow:** Rolls the 1d6 penalty and reports it as guidance. The module does not change or track MOVE.
- **Synapse Burnout:** Uses CPR's native-style 3d6 damage roll card. The Netrunner rolls damage from the successful Quickhack result, and the GM applies it to the original target with the native lightning-bolt control. Damage is treated as brain damage so it bypasses armor without ablation; Quickhack damage criticals and their +5 bonus are disabled.
- **System Reset:** Applies only Unconscious and/or Prone statuses registered natively by the active system, without timers or wake-up tracking. Players remove them manually. If neither exists, it provides guided handling.
- **Short Circuit:** Guided GM handling identifies the three-component choice and duration because the system has no universal safe cyberware-disable API.
- **Cyberware Malfunction:** Guided Netrunner handling identifies the component choice, attached-option consequence, and duration.
- **Shard Ejection:** Guided Netrunner handling identifies the chipware choice and slot-cover exception.
- **Lure:** Guided handling is whispered only to the Netrunner's owners and GMs and does not alert the target.
- **Puppet:** Guided handling records control of the target's next Action and Move Action using the target's STATs and Skills.

Target mutations requested by players are resolved by the primary active GM so NPC ownership and hidden data remain protected.

Successful Quickhack cards are compact and include a short, original effect summary in the result itself. The module does not reproduce rulebook effect text or create separate effect-summary chat messages.

The module does not maintain effect timers, round counters, scheduled cleanup, or automatic restoration. Temporary changes are removed manually by the table.

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

### Inventory-Required Quickhacks - Implemented

The GM-only **Require Owned Quickhacks** world setting limits the picker to flagged Quickhack Items carried by the acting Netrunner. Items may be renamed and do not need to be equipped. The unrestricted mode remains the default.

### Net Action Accounting

Revisit only if the Cyberpunk RED system adds compatible Net Action tracking or the module gains a clear, low-friction design for it.

### Connection and Lockout Tracking

Revisit persistent connections, Jack Out, automatic disconnection, and ejection lockouts only if play experience demonstrates that the added state management is worthwhile.
