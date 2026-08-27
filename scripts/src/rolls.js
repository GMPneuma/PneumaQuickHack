export async function rollCriticalD10() {
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

export async function rollForceOutConcentration({ defenderActor, messageAudience }) {
  const concentration = defenderActor.items.find(
    (item) => item.type === "skill" && item.name.trim().toLowerCase() === "concentration"
  );
  if (!concentration) throw new Error("PNEUMA_QUICKHACK.Error.ConcentrationMissing");

  let cprRoll = concentration.createRoll("skill", defenderActor);
  const keepRoll = await cprRoll.handleRollDialog(
    { ctrlKey: false, metaKey: false, type: "chat" },
    defenderActor,
    concentration
  );
  if (!keepRoll) return null;
  cprRoll = await concentration.confirmRoll(cprRoll);
  await cprRoll.roll();
  const content = await renderTemplate(cprRoll.rollCard, cprRoll);
  const message = await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor: defenderActor }),
    whisper: messageAudience.visibility === "public" ? [] : messageAudience.recipients,
    blind: messageAudience.visibility === "gm",
    content,
    flags: { [MODULE_ID]: {
      type: "forceOutDefenseRoll",
      defenderActorUuid: defenderActor.uuid,
      resultTotal: Number(cprRoll.resultTotal),
      gmOnly: messageAudience.visibility === "gm"
    } }
  });
  return { total: Number(cprRoll.resultTotal), messageId: message.id };
}

export async function rollForceOutResistance({
  netrunnerActor,
  netrunnerRole,
  defenderActor,
  gmRecipients
}) {
  let cprRoll = netrunnerRole.createRoll("roleAbility", netrunnerActor, {
    rollSubType: "mainRoleAbility"
  });
  cprRoll.rollTitle = game.i18n.format("PNEUMA_QUICKHACK.ForceOut.InterfaceDialogTitle", {
    target: defenderActor.name
  });
  cprRoll.pneumaContextHeader = cprRoll.rollTitle;
  const keepRoll = await cprRoll.handleRollDialog(
    { ctrlKey: false, metaKey: false, type: "chat" },
    netrunnerActor,
    netrunnerRole
  );
  if (!keepRoll) return null;
  cprRoll = await netrunnerRole.confirmRoll(cprRoll);
  await cprRoll.roll();
  const content = await renderTemplate(cprRoll.rollCard, cprRoll);
  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor: netrunnerActor }),
    whisper: gmRecipients,
    blind: true,
    content,
    flags: { [MODULE_ID]: { type: "forceOutResistanceRoll", gmOnly: true } }
  });
  return Number(cprRoll.resultTotal);
}

export async function rollPlayerInterface({
  sourceActor,
  sourceToken,
  netrunnerRole,
  messageAudience,
  rollTitle,
  rollHeader = rollTitle
}) {
  let cprRoll = netrunnerRole.createRoll("roleAbility", sourceActor, { rollSubType: "mainRoleAbility" });
  if (rollTitle) cprRoll.rollTitle = rollTitle;
  if (rollHeader) cprRoll.pneumaContextHeader = rollHeader;
  const keepRoll = await cprRoll.handleRollDialog(
    { ctrlKey: false, metaKey: false, type: "macro" }, sourceActor, netrunnerRole
  );
  if (!keepRoll) return null;
  cprRoll = await netrunnerRole.confirmRoll(cprRoll);
  await cprRoll.roll();
  const content = await renderTemplate(cprRoll.rollCard, cprRoll);
  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor: sourceActor, token: sourceToken.document }),
    whisper: messageAudience.visibility === "public" ? [] : messageAudience.recipients,
    blind: messageAudience.visibility === "gm",
    content,
    flags: { [MODULE_ID]: {
      type: "interfaceRoll",
      gmOnly: messageAudience.visibility === "gm"
    } }
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
      flavor,
      flags: { [MODULE_ID]: { type: "npcInterfaceRoll", gmOnly: true } }
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
    content: `<div>${flavor}<br><strong>${game.i18n.localize("PNEUMA_QUICKHACK.Roll.Total")}:</strong> ${roll.total}</div>`,
    flags: { [MODULE_ID]: { type: "targetWillRoll", gmOnly: true } }
  });
  return roll.total;
}
import { MODULE_ID } from "./constants.js";
