import { MODULE_ID } from "./constants.js";

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

export async function rollPlayerForceOutResistance({
  netrunnerActor,
  netrunnerRole,
  defenderActor,
  gmRecipients,
  requestId
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
  const message = await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor: netrunnerActor }),
    whisper: gmRecipients,
    blind: true,
    content,
    flags: { [MODULE_ID]: {
      type: "forceOutResistanceRoll",
      netrunnerActorUuid: netrunnerActor.uuid,
      requestId,
      resultTotal: Number(cprRoll.resultTotal),
      gmOnly: true
    } }
  });
  return { total: Number(cprRoll.resultTotal), messageId: message.id };
}

export async function rollNpcForceOutResistance(interfaceRank) {
  const die = await rollCriticalD10();
  return Number(interfaceRank) + die.initial + die.adjustment;
}

async function rollWithoutDiceSoNice(cprRoll) {
  cprRoll._roll = await new Roll(cprRoll.formula).evaluate();
  cprRoll.initialRoll = cprRoll._roll.total;
  cprRoll.resultTotal = cprRoll.initialRoll + cprRoll.totalMods();

  const firstTerm = cprRoll._roll.terms[0];
  cprRoll.faces = firstTerm.formula !== String(firstTerm.total)
    ? firstTerm.results.map((result) => result.result)
    : [];

  if (cprRoll.wasCritical() && cprRoll.calculateCritical) {
    cprRoll._critRoll = await new Roll(cprRoll.formula).evaluate();
    cprRoll.criticalRoll = cprRoll._critRoll.total;
  }
  cprRoll._computeResult();
}

export async function rollPlayerInterface({
  sourceActor,
  sourceToken,
  netrunnerRole,
  messageAudience,
  rollTitle,
  rollHeader = rollTitle,
  returnMessage = false,
  suppressDiceSoNice = false
}) {
  let cprRoll = netrunnerRole.createRoll("roleAbility", sourceActor, { rollSubType: "mainRoleAbility" });
  if (rollTitle) cprRoll.rollTitle = rollTitle;
  if (rollHeader) cprRoll.pneumaContextHeader = rollHeader;
  const keepRoll = await cprRoll.handleRollDialog(
    { ctrlKey: false, metaKey: false, type: "macro" }, sourceActor, netrunnerRole
  );
  if (!keepRoll) return null;
  cprRoll = await netrunnerRole.confirmRoll(cprRoll);
  if (suppressDiceSoNice) await rollWithoutDiceSoNice(cprRoll);
  else await cprRoll.roll();
  const renderedContent = await renderTemplate(cprRoll.rollCard, cprRoll);
  const wrapper = document.createElement("div");
  wrapper.innerHTML = renderedContent;
  wrapper.querySelector(".rollcard-top .chat-rollTitle-stat .text-small")?.remove();
  const content = wrapper.innerHTML;
  const message = await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor: sourceActor, token: sourceToken.document }),
    whisper: messageAudience.visibility === "public" ? [] : messageAudience.recipients,
    blind: messageAudience.visibility === "gm",
    content,
    flags: { [MODULE_ID]: {
      type: "interfaceRoll",
      gmOnly: messageAudience.visibility === "gm"
    } }
  });
  const total = Number(cprRoll.resultTotal);
  return returnMessage ? { total, message } : total;
}

export async function rollTargetWill({ targetActor }) {
  const willValue = Number(foundry.utils.getProperty(targetActor, "system.stats.will.value"));
  if (!Number.isFinite(willValue)) throw new Error("PNEUMA_QUICKHACK.Error.TargetWillUnreadable");
  const die = await rollCriticalD10();
  const roll = await new Roll("@initial + @will + @adjustment", {
    initial: die.initial, will: willValue, adjustment: die.adjustment
  }).evaluate();
  return roll.total;
}
