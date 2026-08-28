import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  isNetrunnerEjected,
  isQuickhackSuccessful,
  isQuickhackTargetAlerted,
  isTargetAware,
  isWithinJackInRange
} from "../scripts/src/rules.js";
import {
  AUDIENCE,
  DEFAULT_ROUTING_CONFIG,
  SCENARIO,
  normalizeRoutingConfig,
  resolveAttackRollAudience,
  resolveJackInRouting,
  resolveQuickhackRouting,
  scenarioFor
} from "../scripts/src/routing-config.js";
import { QUICKHACKS, getOwnedQuickhacks, getQuickhack } from "../scripts/src/quickhack-catalog.js";
import { isQuickhackDamageContextValid } from "../scripts/src/quickhack-damage.js";
import { waitForQuickhackResultMessage } from "../scripts/src/quickhack-effects.js";
import { isQuickhackHotbarDrop } from "../scripts/src/hotbar-rules.js";
import { resolveMessageDelivery } from "../scripts/src/messages.js";
import { forceOutInterfaceMode } from "../scripts/src/force-out.js";

const moduleManifest = JSON.parse(readFileSync(new URL("../module.json", import.meta.url), "utf8"));

test("module socket support is enabled for cross-client contests", () => {
  assert.equal(moduleManifest.socket, true);
});

test("message routing defaults match the standard Quickhack workflow", () => {
  assert.deepEqual(DEFAULT_ROUTING_CONFIG, {
    npcToPlayerJackInAudience: AUDIENCE.TARGET_OWNERS,
    npcToPlayerJackInShowTotals: false,
    npcToPlayerJackInRevealAttacker: false,
    npcToPlayerQuickhackAudience: AUDIENCE.PUBLIC,
    npcToPlayerQuickhackRevealAttacker: false,
    playerToNpcJackInAudience: AUDIENCE.SOURCE_OWNERS
  });
});

test("Quickhack effects wait for the result card to synchronize", async () => {
  const hadGame = Object.hasOwn(globalThis, "game");
  const previousGame = globalThis.game;
  const hadHooks = Object.hasOwn(globalThis, "Hooks");
  const previousHooks = globalThis.Hooks;
  let synchronizedMessage = null;
  let createHandler = null;
  let removedHook = null;
  globalThis.game = {
    messages: { get: () => synchronizedMessage }
  };
  globalThis.Hooks = {
    on: (_event, handler) => {
      createHandler = handler;
      return 42;
    },
    off: (event, hookId) => {
      removedHook = { event, hookId };
    }
  };

  try {
    const pending = waitForQuickhackResultMessage("message-1", { timeoutMs: 100 });
    synchronizedMessage = { id: "message-1" };
    createHandler(synchronizedMessage);
    assert.equal(await pending, synchronizedMessage);
    assert.deepEqual(removedHook, { event: "createChatMessage", hookId: 42 });
  } finally {
    if (hadGame) globalThis.game = previousGame;
    else delete globalThis.game;
    if (hadHooks) globalThis.Hooks = previousHooks;
    else delete globalThis.Hooks;
  }
});

test("defender ejects the Netrunner only by beating Interface", () => {
  assert.equal(isNetrunnerEjected(15, 14), true);
  assert.equal(isNetrunnerEjected(14, 14), false);
  assert.equal(isNetrunnerEjected(13, 14), false);
});

test("Force Netrunner Out prompts PC attackers and auto-rolls NPC attackers", () => {
  assert.equal(forceOutInterfaceMode(true), "playerPrompt");
  assert.equal(forceOutInterfaceMode(false), "npcAutomatic");
});

test("Quickhack Interface total must beat its DV", () => {
  assert.equal(isQuickhackSuccessful(9, 8), true);
  assert.equal(isQuickhackSuccessful(8, 8), false);
  assert.equal(isQuickhackSuccessful(7, 8), false);
});

test("a player target always notices a Quickhack attempt", () => {
  assert.equal(isQuickhackTargetAlerted({ success: false, silentOnSuccess: false, targetIsPlayer: true }), true);
  assert.equal(isQuickhackTargetAlerted({ success: true, silentOnSuccess: true, targetIsPlayer: true }), true);
  assert.equal(isQuickhackTargetAlerted({ success: true, silentOnSuccess: true, targetIsPlayer: false }), false);
});

test("catalog contains all eleven CEMK Quickhacks and keeps Lure silent", () => {
  assert.equal(QUICKHACKS.length, 11);
  assert.deepEqual([...new Set(QUICKHACKS.map((quickhack) => quickhack.dv))], [6, 8, 10, 12]);
  assert.equal(getQuickhack("lure").silentOnSuccess, true);
});

test("Synapse Burnout alone provides a manual damage action", () => {
  assert.deepEqual(
    QUICKHACKS.filter((quickhack) => quickhack.damageFormula).map(({ id, damageFormula }) => ({ id, damageFormula })),
    [{ id: "synapse-burnout", damageFormula: "3d6" }]
  );
});

test("Overheat provides a fixed automatic damage card", () => {
  assert.deepEqual(
    QUICKHACKS.filter((quickhack) => quickhack.automaticDamageFormula)
      .map(({ id, automaticDamageFormula }) => ({ id, automaticDamageFormula })),
    [{ id: "overheat", automaticDamageFormula: "4" }]
  );
});

test("damage context must match a successful damaging Quickhack", () => {
  const quickhack = getQuickhack("synapse-burnout");
  const valid = {
    type: "quickhackAttackRoll",
    success: true,
    sourceActorUuid: "Actor.source",
    targetActorUuid: "Actor.target",
    quickhackId: quickhack.id,
    damageFormula: quickhack.damageFormula
  };
  assert.equal(isQuickhackDamageContextValid(valid, quickhack), true);
  assert.equal(isQuickhackDamageContextValid({ ...valid, success: false }, quickhack), false);
  assert.equal(isQuickhackDamageContextValid({ ...valid, damageFormula: "4d6" }, quickhack), false);
});

test("hotbar integration recognizes only actor-bound Quickhack actions", () => {
  assert.equal(isQuickhackHotbarDrop({ pneumaQuickhackAction: "jack-in", actorUuid: "Actor.source" }), true);
  assert.equal(isQuickhackHotbarDrop({ pneumaQuickhackAction: "quickhack", actorUuid: "Actor.source" }), true);
  assert.equal(isQuickhackHotbarDrop({ pneumaQuickhackAction: "attack", actorUuid: "Actor.source" }), false);
  assert.equal(isQuickhackHotbarDrop({ pneumaQuickhackAction: "jack-in" }), false);
});

test("owned Quickhack mode recognizes flagged inventory Items regardless of name", () => {
  const actor = {
    items: [
      { name: "Renamed Hack", getFlag: () => "lure" },
      { name: "Ordinary Gear", getFlag: () => undefined },
      { name: "Another Hack", getFlag: () => "system-reset" }
    ]
  };
  assert.deepEqual(getOwnedQuickhacks(actor).map((quickhack) => quickhack.id), ["lure", "system-reset"]);
});

test("owned Quickhack mode ignores unknown and duplicate inventory flags", () => {
  const actor = {
    items: [
      { getFlag: () => "slow" },
      { getFlag: () => "slow" },
      { getFlag: () => "not-a-quickhack" }
    ]
  };
  assert.deepEqual(getOwnedQuickhacks(actor).map((quickhack) => quickhack.id), ["slow"]);
});

test("target notices when WILL beats Interface", () => {
  assert.equal(isTargetAware(11, 14), true);
});

test("target notices a tied Jack-In contest", () => {
  assert.equal(isTargetAware(14, 14), true);
});

test("target remains unaware when Interface beats WILL", () => {
  assert.equal(isTargetAware(15, 14), false);
});

test("range includes the twenty-fifth square", () => {
  assert.equal(isWithinJackInRange(25), true);
  assert.equal(isWithinJackInRange(25.01), false);
  assert.equal(isWithinJackInRange(Number.NaN), false);
});

test("the four attacker-to-target scenarios are classified explicitly", () => {
  assert.equal(scenarioFor({ sourceIsPlayer: false, targetIsPlayer: false }), SCENARIO.NPC_TO_NPC);
  assert.equal(scenarioFor({ sourceIsPlayer: false, targetIsPlayer: true }), SCENARIO.NPC_TO_PC);
  assert.equal(scenarioFor({ sourceIsPlayer: true, targetIsPlayer: false }), SCENARIO.PC_TO_NPC);
  assert.equal(scenarioFor({ sourceIsPlayer: true, targetIsPlayer: true }), SCENARIO.PC_TO_PC);
});

test("NPC attack rolls are GM-blind and player attack rolls are public", () => {
  assert.equal(resolveAttackRollAudience({ sourceIsPlayer: false }), AUDIENCE.GM);
  assert.equal(resolveAttackRollAudience({ sourceIsPlayer: true }), AUDIENCE.PUBLIC);
});

test("NPC-to-NPC Jack-In and Quickhack results are always GM-only", () => {
  assert.equal(resolveJackInRouting(DEFAULT_ROUTING_CONFIG, {
    sourceIsPlayer: false,
    targetIsPlayer: false,
    targetAware: true
  }).audience, AUDIENCE.GM);
  assert.equal(resolveQuickhackRouting(DEFAULT_ROUTING_CONFIG, {
    sourceIsPlayer: false,
    targetIsPlayer: false
  }).audience, AUDIENCE.GM);
});

test("an undetected NPC-to-player Jack-In is always complete and GM-only", () => {
  assert.deepEqual(resolveJackInRouting({
    ...DEFAULT_ROUTING_CONFIG,
    npcToPlayerJackInShowTotals: false,
    npcToPlayerJackInRevealAttacker: false,
    npcToPlayerJackInAudience: AUDIENCE.PUBLIC
  }, {
    sourceIsPlayer: false,
    targetIsPlayer: true,
    targetAware: false
  }), {
    audience: AUDIENCE.GM,
    revealAttacker: true,
    showTotals: true,
    showAwareness: true
  });
});

test("a detected NPC-to-player Jack-In honors all three dropdowns", () => {
  assert.deepEqual(resolveJackInRouting({
    ...DEFAULT_ROUTING_CONFIG,
    npcToPlayerJackInAudience: AUDIENCE.PUBLIC,
    npcToPlayerJackInShowTotals: false,
    npcToPlayerJackInRevealAttacker: true
  }, {
    sourceIsPlayer: false,
    targetIsPlayer: true,
    targetAware: true
  }), {
    audience: AUDIENCE.PUBLIC,
    revealAttacker: true,
    showTotals: false,
    showAwareness: true
  });
});

test("NPC-to-player Quickhack results honor audience and identity settings", () => {
  assert.deepEqual(resolveQuickhackRouting({
    ...DEFAULT_ROUTING_CONFIG,
    npcToPlayerQuickhackAudience: AUDIENCE.PUBLIC,
    npcToPlayerQuickhackRevealAttacker: true
  }, {
    sourceIsPlayer: false,
    targetIsPlayer: true
  }), {
    audience: AUDIENCE.PUBLIC,
    revealAttacker: true,
    showInterfaceTotal: true,
    showAwareness: true
  });
});

test("PC-to-NPC Jack-In awareness can be public, attacker-only, or GM-only", () => {
  assert.equal(resolveJackInRouting({
    ...DEFAULT_ROUTING_CONFIG,
    playerToNpcJackInAudience: AUDIENCE.PUBLIC
  }, {
    sourceIsPlayer: true,
    targetIsPlayer: false,
    targetAware: true
  }).audience, AUDIENCE.PUBLIC);
  assert.equal(resolveJackInRouting({
    ...DEFAULT_ROUTING_CONFIG,
    playerToNpcJackInAudience: AUDIENCE.SOURCE_OWNERS
  }, {
    sourceIsPlayer: true,
    targetIsPlayer: false,
    targetAware: true
  }).audience, AUDIENCE.SOURCE_OWNERS);
  assert.equal(resolveJackInRouting({
    ...DEFAULT_ROUTING_CONFIG,
    playerToNpcJackInAudience: AUDIENCE.GM
  }, {
    sourceIsPlayer: true,
    targetIsPlayer: false,
    targetAware: true
  }).audience, AUDIENCE.GM);
});

test("PC-to-NPC Quickhack and all PC-to-PC results are public", () => {
  assert.equal(resolveQuickhackRouting(DEFAULT_ROUTING_CONFIG, {
    sourceIsPlayer: true,
    targetIsPlayer: false
  }).audience, AUDIENCE.PUBLIC);
  assert.equal(resolveJackInRouting(DEFAULT_ROUTING_CONFIG, {
    sourceIsPlayer: true,
    targetIsPlayer: true,
    targetAware: false
  }).audience, AUDIENCE.PUBLIC);
  assert.equal(resolveQuickhackRouting(DEFAULT_ROUTING_CONFIG, {
    sourceIsPlayer: true,
    targetIsPlayer: true
  }).audience, AUDIENCE.PUBLIC);
});

test("routing config rejects invalid audience values", () => {
  assert.deepEqual(normalizeRoutingConfig({
    npcToPlayerJackInAudience: AUDIENCE.GM,
    playerToNpcJackInAudience: AUDIENCE.TARGET_OWNERS
  }), DEFAULT_ROUTING_CONFIG);
});

test("private delivery includes the relevant actor owners and GM exactly once", () => {
  assert.deepEqual(resolveMessageDelivery(AUDIENCE.SOURCE_OWNERS, {
    gmRecipients: ["gm"],
    sourceOwnerRecipients: ["attacker", "gm"]
  }), { whisper: ["gm", "attacker"], blind: false });
  assert.deepEqual(resolveMessageDelivery(AUDIENCE.TARGET_OWNERS, {
    gmRecipients: ["gm"],
    targetOwnerRecipients: ["target", "gm"]
  }), { whisper: ["gm", "target"], blind: false });
  assert.deepEqual(resolveMessageDelivery(AUDIENCE.GM, {
    gmRecipients: ["gm"],
    targetOwnerRecipients: ["target"]
  }), { whisper: ["gm"], blind: true });
  assert.deepEqual(resolveMessageDelivery(AUDIENCE.PUBLIC, {
    gmRecipients: ["gm"]
  }), { whisper: [], blind: false });
});
