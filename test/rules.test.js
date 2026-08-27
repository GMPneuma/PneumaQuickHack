import assert from "node:assert/strict";
import test from "node:test";

import { isTargetAware, isWithinJackInRange, resolveResultAudience } from "../scripts/src/rules.js";

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

test("NPC results remain GM-only", () => {
  assert.deepEqual(resolveResultAudience({
    sourceIsPlayer: false,
    configuredVisibility: 1,
    gmRecipients: ["gm"],
    sourceOwnerRecipients: []
  }), { visibility: "gm", recipients: ["gm"] });
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
