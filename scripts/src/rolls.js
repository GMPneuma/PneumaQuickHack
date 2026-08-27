async function rollCriticalD10() {
  const initial = (await new Roll("1d10").evaluate()).total;
  if (initial === 10) {
    const extra = (await new Roll("1d10").evaluate()).total;
    return { initial, adjustment: extra, label: game.i18n.format("PNEUMA_QUICKHACK.Roll.CriticalSuccess", { value: extra }) };
  }
  if (initial === 1) {
    const extra = (await new Roll("1d10").evaluate()).total;
    return { initial, adjustment: -extra, label: game.i18n.format("PNEUMA_QUICKHACK.Roll.CriticalFailure", { value: extra }) };
  }
  return { initial, adjustment: 0, label: null };
}

export async function rollPlayerInterface({ sourceActor, sourceToken, netrunnerRole }) {
  let cprRoll = netrunnerRole.createRoll("roleAbility", sourceActor, { rollSubType: "mainRoleAbility" });
  const keepRoll = await cprRoll.handleRollDialog(
    { ctrlKey: false, metaKey: false, type: "macro" }, sourceActor, netrunnerRole
  );
  if (!keepRoll) return null;
  cprRoll = await netrunnerRole.confirmRoll(cprRoll);
  await cprRoll.roll();
  const content = await renderTemplate(cprRoll.rollCard, cprRoll);
  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor: sourceActor, token: sourceToken.document }),
    content
  });
  return Number(cprRoll.resultTotal);
}

export async function rollNpcInterface({ sourceActor, sourceToken, targetToken, interfaceRank }) {
  const die = await rollCriticalD10();
  const roll = await new Roll("@initial + @rank + @adjustment", {
    initial: die.initial, rank: interfaceRank, adjustment: die.adjustment
  }).evaluate();
  const flavor = [
    `<strong>${game.i18n.localize("PNEUMA_QUICKHACK.Roll.InterfaceCheck")}</strong>`,
    game.i18n.format("PNEUMA_QUICKHACK.Roll.SourceTargetsTarget", {
      source: sourceToken.name, target: targetToken.name
    }),
    die.label
  ].filter(Boolean).join("<br>");
  await roll.toMessage(
    {
      speaker: ChatMessage.getSpeaker({ actor: sourceActor, token: sourceToken.document }),
      flavor
    },
    { rollMode: "blindroll" }
  );
  return roll.total;
}

export async function rollTargetWill({ targetActor, targetToken, gmRecipients }) {
  const willValue = Number(foundry.utils.getProperty(targetActor, "system.stats.will.value"));
  if (!Number.isFinite(willValue)) throw new Error("PNEUMA_QUICKHACK.Error.TargetWillUnreadable");
  const die = await rollCriticalD10();
  const roll = await new Roll("@initial + @will + @adjustment", {
    initial: die.initial, will: willValue, adjustment: die.adjustment
  }).evaluate();
  const flavor = [
    `<strong>${game.i18n.localize("PNEUMA_QUICKHACK.Roll.AwarenessCheck")}</strong>`,
    game.i18n.format("PNEUMA_QUICKHACK.Roll.TargetRollsWill", { target: targetToken.name }),
    die.label
  ].filter(Boolean).join("<br>");
  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor: targetActor, token: targetToken.document }),
    whisper: gmRecipients,
    blind: true,
    content: `<div>${flavor}<br><strong>${game.i18n.localize("PNEUMA_QUICKHACK.Roll.Total")}:</strong> ${roll.total}</div>`
  });
  return roll.total;
}
