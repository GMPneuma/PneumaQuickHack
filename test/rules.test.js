import assert from "node:assert/strict";
import test from "node:test";

import {
  isNetrunnerEjected,
  isQuickhackSuccessful,
  isTargetAware,
  isWithinJackInRange,
  resolveInterfaceRollAudience,
  resolveResultAudience,
  shouldConcealPublicIdentity
} from "../scripts/src/rules.js";
import {
  AUDIENCE,
  DEFAULT_ROUTING_CONFIG,
  mapRoutingToRuntime,
  resolveTargetAlertAudience
} from "../scripts/src/routing-config.js";
import { QUICKHACKS, getQuickhack } from "../scripts/src/quickhack-catalog.js";

test("defender ejects the Netrunner only by beating Interface", () => {
  assert.equal(isNetrunnerEjected(15, 14), true);
  assert.equal(isNetrunnerEjected(14, 14), false);
  assert.equal(isNetrunnerEjected(13, 14), false);
});

test("Quickhack Interface total must beat its DV", () => {
  assert.equal(isQuickhackSuccessful(9, 8), true);
  assert.equal(isQuickhackSuccessful(8, 8), false);
  assert.equal(isQuickhackSuccessful(7, 8), false);
});

test("catalog contains all eleven CEMK Quickhacks and keeps Lure silent", () => {
  assert.equal(QUICKHACKS.length, 11);
  assert.deepEqual([...new Set(QUICKHACKS.map((quickhack) => quickhack.dv))], [6, 8, 10, 12]);
  assert.equal(getQuickhack("lure").silentOnSuccess, true);
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

test("NPC results can be shared publicly", () => {
  assert.deepEqual(resolveResultAudience({
    sourceIsPlayer: false,
    configuredVisibility: 1,
    gmRecipients: ["gm"],
    sourceOwnerRecipients: []
  }), { visibility: "public", recipients: [] });
});

test("public player results have no whisper recipients", () => {
  assert.deepEqual(resolveResultAudience({
    sourceIsPlayer: true,
    configuredVisibility: 1,
    gmRecipients: ["gm"],
    sourceOwnerRecipients: ["player"]
  }), { visibility: "public", recipients: [] });
});

test("owner visibility includes owners and GMs without duplicates", () => {
  assert.deepEqual(resolveResultAudience({
    sourceIsPlayer: true,
    configuredVisibility: 2,
    gmRecipients: ["gm"],
    sourceOwnerRecipients: ["player", "gm"]
  }), { visibility: "whisper", recipients: ["gm", "player"] });
});

test("default player-attacker and player-target routing is understandable", () => {
  assert.deepEqual(mapRoutingToRuntime(DEFAULT_ROUTING_CONFIG, {
    sourceIsPlayer: true,
    targetIsPlayer: true
  }), {
    resultVisibility: 1,
    hideSourceInTargetResult: false,
    targetAlertAudience: AUDIENCE.TARGET_OWNERS,
    includeTargetAlertTotals: true,
    shareTargetAwareness: true
  });
});

test("default NPC-attacker and NPC-target routing stays private and anonymous", () => {
  assert.deepEqual(mapRoutingToRuntime(DEFAULT_ROUTING_CONFIG, {
    sourceIsPlayer: false,
    targetIsPlayer: false
  }), {
    resultVisibility: 0,
    hideSourceInTargetResult: true,
    targetAlertAudience: AUDIENCE.GM,
    includeTargetAlertTotals: true,
    shareTargetAwareness: true
  });
});

test("each actor type uses its own configured routing box", () => {
  const config = {
    ...DEFAULT_ROUTING_CONFIG,
    playerAttackerResultAudience: AUDIENCE.GM,
    npcAttackerResultAudience: AUDIENCE.PUBLIC,
    npcAttackerRevealIdentity: true,
    playerTargetAlertAudience: AUDIENCE.GM,
    playerTargetIncludeTotals: false,
    npcTargetAlertAudience: AUDIENCE.PUBLIC,
    npcTargetIncludeTotals: false
  };
  assert.deepEqual(mapRoutingToRuntime(config, {
    sourceIsPlayer: false,
    targetIsPlayer: true
  }), {
    resultVisibility: 1,
    hideSourceInTargetResult: false,
    targetAlertAudience: AUDIENCE.GM,
    includeTargetAlertTotals: false,
    shareTargetAwareness: true
  });
});

test("NPC awareness can be withheld from the selected audience", () => {
  assert.equal(mapRoutingToRuntime({
    ...DEFAULT_ROUTING_CONFIG,
    npcTargetShareAwareness: false
  }, {
    sourceIsPlayer: true,
    targetIsPlayer: false
  }).shareTargetAwareness, false);
});

test("withheld NPC awareness forces detection alerts to GMs", () => {
  assert.equal(resolveTargetAlertAudience({
    configuredAudience: AUDIENCE.PUBLIC,
    targetIsPlayer: false,
    shareTargetAwareness: false
  }), AUDIENCE.GM);
  assert.equal(resolveTargetAlertAudience({
    configuredAudience: AUDIENCE.PUBLIC,
    targetIsPlayer: false,
    shareTargetAwareness: true
  }), AUDIENCE.PUBLIC);
});

test("public results can independently conceal or reveal the Netrunner", () => {
  const publicAudience = { visibility: "public", recipients: [] };
  assert.equal(shouldConcealPublicIdentity(publicAudience, true), true);
  assert.equal(shouldConcealPublicIdentity(publicAudience, false), false);
});

test("concealed public result keeps the native roll with owners and GMs", () => {
  assert.deepEqual(resolveInterfaceRollAudience({
    resultAudience: { visibility: "public", recipients: [] },
    concealIdentity: true,
    gmRecipients: ["gm"],
    sourceOwnerRecipients: ["player"]
  }), { visibility: "whisper", recipients: ["gm", "player"] });
});

test("revealed public result leaves the native roll public", () => {
  const publicAudience = { visibility: "public", recipients: [] };
  assert.equal(resolveInterfaceRollAudience({
    resultAudience: publicAudience,
    concealIdentity: false,
    gmRecipients: ["gm"],
    sourceOwnerRecipients: ["player"]
  }), publicAudience);
});
