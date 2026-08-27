import { MODULE_ID } from "./constants.js";
import { shouldConcealPublicIdentity } from "./rules.js";
import { resolveTargetAlertAudience } from "./routing-config.js";

function awarenessText(targetAware) {
  return game.i18n.localize(targetAware
    ? "PNEUMA_QUICKHACK.Result.TargetAware"
    : "PNEUMA_QUICKHACK.Result.TargetUnaware");
}

function resultContent(data, anonymous = false, showAwareness = true) {
  const heading = anonymous
    ? game.i18n.format(
        data.targetAware
          ? "PNEUMA_QUICKHACK.Result.TargetDetectsAnonymousAttempt"
          : "PNEUMA_QUICKHACK.Result.AnonymousAttempt",
        { target: data.targetToken.name }
      )
    : game.i18n.format("PNEUMA_QUICKHACK.Result.SourceJacksIntoTarget", {
        source: data.sourceToken.name, target: data.targetToken.name
      });
  return `
    <h3>${game.i18n.localize("PNEUMA_QUICKHACK.Result.InterfaceVsWill")}</h3>
    <p><strong>${heading}</strong></p>
    <p>${game.i18n.localize("PNEUMA_QUICKHACK.Result.InterfaceRoll")}: <strong>${data.interfaceTotal}</strong></p>
    <p>${game.i18n.localize("PNEUMA_QUICKHACK.Result.WillTotal")}: <strong>${data.willTotal}</strong></p>
    ${showAwareness ? `<p>${data.targetToken.name} <strong class="pneuma-quickhack-awareness ${data.targetAware ? "aware" : "unaware"}">${awarenessText(data.targetAware)}</strong></p>` : ""}
  `;
}

function mainMessageDelivery(data) {
  const targetAlerted = data.targetAlerted ?? data.targetAware;
  if (data.resultAudience.visibility !== "public" || !data.targetIsPlayer || targetAlerted) {
    return {
      whisper: data.resultAudience.visibility === "public" ? [] : data.resultAudience.recipients,
      blind: data.resultAudience.visibility === "gm"
    };
  }
  const excluded = new Set(data.targetOwnerRecipients);
  const recipients = game.users
    .filter((user) => user.isGM || (user.active && !excluded.has(user.id)))
    .map((user) => user.id);
  return { whisper: recipients, blind: false };
}

function forceOutButton() {
  return `<div class="pneuma-quickhack-force-out-actions">
    <button type="button" class="pneuma-quickhack-force-out">
      <i class="fas fa-right-from-bracket"></i>
      ${game.i18n.localize("PNEUMA_QUICKHACK.ForceOut.Button")}
    </button>
  </div>`;
}

function targetAlertContent(data) {
  const heading = data.hideSourceInTargetResult
    ? game.i18n.format("PNEUMA_QUICKHACK.Result.TargetDetectsAnonymousAttempt", {
        target: data.targetToken.name
      })
    : game.i18n.format("PNEUMA_QUICKHACK.Result.TargetDetectsNamedAttempt", {
        target: data.targetToken.name,
        source: data.sourceToken.name
      });
  const totals = data.includeTargetAlertTotals
    ? `<p>${game.i18n.localize("PNEUMA_QUICKHACK.Result.InterfaceRoll")}: <strong>${data.interfaceTotal}</strong></p>
       <p>${game.i18n.localize("PNEUMA_QUICKHACK.Result.WillTotal")}: <strong>${data.willTotal}</strong></p>`
    : "";
  return `
    <h3>${game.i18n.localize("PNEUMA_QUICKHACK.Result.DetectionAlert")}</h3>
    <p><strong>${heading}</strong></p>
    ${totals}
    ${forceOutButton()}
  `;
}

function quickhackResultContent(data, anonymous, showAwareness) {
  const source = anonymous
    ? game.i18n.localize("PNEUMA_QUICKHACK.Result.UnknownNetrunner")
    : data.sourceToken.name;
  return `<h3>${game.i18n.localize("PNEUMA_QUICKHACK.Quickhack.ResultTitle")}</h3>
    <p><strong>${game.i18n.format("PNEUMA_QUICKHACK.Quickhack.SourceUsesHack", {
      source,
      quickhack: data.quickhack.name,
      target: data.targetToken.name
    })}</strong></p>
    <p>${game.i18n.localize("PNEUMA_QUICKHACK.Result.InterfaceRoll")}: <strong>${data.interfaceTotal}</strong></p>
    <p>${game.i18n.localize("PNEUMA_QUICKHACK.Quickhack.Difficulty")}: <strong>DV${data.quickhack.dv}</strong></p>
    <p class="pneuma-quickhack-outcome ${data.success ? "success" : "failure"}"><strong>${game.i18n.localize(
      data.success ? "PNEUMA_QUICKHACK.Quickhack.Success" : "PNEUMA_QUICKHACK.Quickhack.Failure"
    )}</strong></p>
    ${showAwareness ? `<p>${data.targetToken.name} <strong class="pneuma-quickhack-awareness ${data.targetAlerted ? "aware" : "unaware"}">${game.i18n.localize(
      data.targetAlerted ? "PNEUMA_QUICKHACK.Quickhack.TargetAlerted" : "PNEUMA_QUICKHACK.Quickhack.TargetNotAlerted"
    )}</strong></p>` : ""}
    ${data.targetAlerted ? forceOutButton() : ""}`;
}

function quickhackTargetNoticeContent(data) {
  const source = data.hideSourceInTargetResult
    ? game.i18n.localize("PNEUMA_QUICKHACK.Result.UnknownNetrunner")
    : data.sourceToken.name;
  return `<h3>${game.i18n.localize("PNEUMA_QUICKHACK.Quickhack.TargetNoticeTitle")}</h3>
    <p><strong>${game.i18n.format("PNEUMA_QUICKHACK.Quickhack.TargetNotice", {
      source,
      quickhack: data.quickhack.name
    })}</strong></p>
    ${forceOutButton()}`;
}

export function missingTargetNoticeRecipients(delivery, targetOwnerRecipients) {
  if (!delivery.whisper?.length) return [];
  const delivered = new Set(delivery.whisper);
  return targetOwnerRecipients.filter((id) => !delivered.has(id));
}

async function postQuickhackTargetNotice(data, recipients) {
  const speaker = data.hideSourceInTargetResult
    ? { alias: game.i18n.localize("PNEUMA_QUICKHACK.Result.UnknownNetrunner") }
    : ChatMessage.getSpeaker({ actor: data.sourceActor, token: data.sourceToken.document });
  return ChatMessage.create({
    speaker,
    whisper: recipients,
    content: quickhackTargetNoticeContent(data),
    flags: { [MODULE_ID]: {
      type: "quickhackTargetNotice",
      gmOnly: false,
      forceOutContext: { sourceActorUuid: data.sourceActor.uuid, targetActorUuid: data.targetActor.uuid }
    } }
  });
}

export async function postQuickhackResults(data) {
  const anonymous = shouldConcealPublicIdentity(data.resultAudience, data.hideSourceInTargetResult);
  const audienceCanSeeAwareness = data.targetIsPlayer || data.shareTargetAwareness;
  const speaker = anonymous
    ? { alias: game.i18n.localize("PNEUMA_QUICKHACK.Result.UnknownNetrunner") }
    : ChatMessage.getSpeaker({ actor: data.sourceActor, token: data.sourceToken.document });
  const delivery = mainMessageDelivery(data);
  const resultMessage = await ChatMessage.create({
    speaker,
    ...delivery,
    content: quickhackResultContent(data, anonymous, audienceCanSeeAwareness),
    flags: { [MODULE_ID]: {
      type: "quickhackResult",
      sourceActorUuid: data.sourceActor.uuid,
      sourceTokenUuid: data.sourceToken.document.uuid,
      targetActorUuid: data.targetActor.uuid,
      targetTokenUuid: data.targetToken.document.uuid,
      quickhackId: data.quickhack.id,
      damageFormula: data.quickhack.damageFormula ?? null,
      success: data.success,
      targetAlerted: data.targetAlerted,
      gmOnly: data.resultAudience.visibility === "gm"
    } }
  });
  if (!audienceCanSeeAwareness && data.resultAudience.visibility !== "gm") {
    await ChatMessage.create({
      speaker,
      whisper: data.gmRecipients,
      blind: true,
      content: quickhackResultContent(data, anonymous, true),
      flags: { [MODULE_ID]: { type: "quickhackResultGm", quickhackId: data.quickhack.id, gmOnly: true } }
    });
  }
  if (data.targetAlerted) {
    const missingOwners = missingTargetNoticeRecipients(delivery, data.targetOwnerRecipients);
    if (missingOwners.length > 0) await postQuickhackTargetNotice(data, missingOwners);
  }
  return resultMessage;
}

export async function postJackInResults(data) {
  const concealPublicIdentity = shouldConcealPublicIdentity(
    data.resultAudience,
    data.hideSourceInTargetResult
  );
  const audienceCanSeeAwareness = data.targetIsPlayer || data.shareTargetAwareness;
  const mainContent = resultContent(data, concealPublicIdentity, audienceCanSeeAwareness);
  const mainSpeaker = concealPublicIdentity
    ? { alias: game.i18n.localize("PNEUMA_QUICKHACK.Result.UnknownNetrunner") }
    : ChatMessage.getSpeaker({ actor: data.sourceActor, token: data.sourceToken.document });
  const messageFlags = {
    sourceActorUuid: data.sourceActor.uuid,
    targetActorUuid: data.targetActor.uuid,
    targetAware: data.targetAware
  };
  const delivery = mainMessageDelivery(data);
  await ChatMessage.create({
    speaker: mainSpeaker,
    ...delivery,
    content: mainContent,
    flags: { [MODULE_ID]: {
      type: "jackInResult",
      ...messageFlags,
      gmOnly: data.resultAudience.visibility === "gm"
    } }
  });

  if (!audienceCanSeeAwareness && data.resultAudience.visibility !== "gm") {
    await ChatMessage.create({
      speaker: mainSpeaker,
      whisper: data.gmRecipients,
      blind: true,
      content: resultContent(data, concealPublicIdentity, true),
      flags: { [MODULE_ID]: { type: "jackInResultGm", ...messageFlags, gmOnly: true } }
    });
  }

  if (!data.targetAware) return;
  const targetContent = targetAlertContent(data);
  const speaker = data.hideSourceInTargetResult
    ? { alias: game.i18n.localize("PNEUMA_QUICKHACK.Result.UnknownNetrunner") }
    : ChatMessage.getSpeaker({ actor: data.sourceActor, token: data.sourceToken.document });

  const targetAlertAudience = resolveTargetAlertAudience({
    configuredAudience: data.targetAlertAudience,
    targetIsPlayer: data.targetIsPlayer,
    shareTargetAwareness: data.shareTargetAwareness
  });
  const alertMessage = {
    speaker,
    content: targetContent,
    flags: {
      [MODULE_ID]: {
        type: "jackInAwareness",
        ...messageFlags,
        gmOnly: targetAlertAudience === "gm",
        forceOutContext: {
          sourceActorUuid: data.sourceActor.uuid,
          targetActorUuid: data.targetActor.uuid
        }
      }
    }
  };
  if (targetAlertAudience === "public") {
    await ChatMessage.create(alertMessage);
    return;
  }
  if (targetAlertAudience === "gm") {
    await ChatMessage.create({ ...alertMessage, whisper: data.gmRecipients, blind: true });
    return;
  }
  if (targetAlertAudience === "targetOwners" && data.targetOwnerRecipients.length > 0) {
    await ChatMessage.create({
      ...alertMessage,
      whisper: [...new Set([...data.gmRecipients, ...data.targetOwnerRecipients])]
    });
  }
}
