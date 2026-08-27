import { MODULE_ID } from "./constants.js";

function awarenessText(targetAware) {
  return game.i18n.localize(targetAware
    ? "PNEUMA_QUICKHACK.Result.TargetAware"
    : "PNEUMA_QUICKHACK.Result.TargetUnaware");
}

function resultContent(data, anonymous = false) {
  const heading = anonymous
    ? game.i18n.format("PNEUMA_QUICKHACK.Result.TargetDetectsAttempt", { target: data.targetToken.name })
    : game.i18n.format("PNEUMA_QUICKHACK.Result.SourceJacksIntoTarget", {
        source: data.sourceToken.name, target: data.targetToken.name
      });
  return `
    <h3>${game.i18n.localize("PNEUMA_QUICKHACK.Result.InterfaceVsWill")}</h3>
    <p><strong>${heading}</strong></p>
    <p>${game.i18n.localize("PNEUMA_QUICKHACK.Result.InterfaceRoll")}: <strong>${data.interfaceTotal}</strong></p>
    <p>${game.i18n.localize("PNEUMA_QUICKHACK.Result.WillTotal")}: <strong>${data.willTotal}</strong></p>
    <p>${data.targetToken.name} <strong class="pneuma-quickhack-awareness ${data.targetAware ? "aware" : "unaware"}">${awarenessText(data.targetAware)}</strong></p>
  `;
}

export async function postJackInResults(data) {
  const mainContent = resultContent(data);
  const messageFlags = {
    sourceActorUuid: data.sourceActor.uuid,
    targetActorUuid: data.targetActor.uuid,
    targetAware: data.targetAware
  };
  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor: data.sourceActor, token: data.sourceToken.document }),
    whisper: data.resultAudience.visibility === "public" ? [] : data.resultAudience.recipients,
    blind: data.resultAudience.visibility === "gm",
    content: mainContent,
    flags: { [MODULE_ID]: { type: "jackInResult", ...messageFlags } }
  });

  if (!data.targetAware || data.targetOwnerRecipients.length === 0) return;
  const targetContent = data.hideSourceInTargetResult ? resultContent(data, true) : mainContent;
  const speaker = data.hideSourceInTargetResult
    ? { alias: game.i18n.localize("PNEUMA_QUICKHACK.Result.UnknownNetrunner") }
    : ChatMessage.getSpeaker({ actor: data.sourceActor, token: data.sourceToken.document });

  if (data.awareTargetResultIsPublic) {
    if (data.hideSourceInTargetResult || data.resultAudience.visibility !== "public") {
      await ChatMessage.create({ speaker, content: targetContent });
    }
    return;
  }
  await ChatMessage.create({
    speaker,
    whisper: data.targetOwnerRecipients,
    content: targetContent,
    flags: { [MODULE_ID]: { type: "jackInAwareness", ...messageFlags } }
  });
}
