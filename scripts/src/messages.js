import { MODULE_ID } from "./constants.js";
import { AUDIENCE } from "./routing-config.js";

function resultContent(data) {
  const source = data.routing.revealAttacker
    ? data.sourceToken.name
    : game.i18n.localize("PNEUMA_QUICKHACK.Result.UnknownNetrunner");
  return `<div class="rollcard pneuma-quickhack-result-rollcard">
    <div class="rollcard-top">
      <div class="cpr-block pneuma-quickhack-result-card">
        <div class="pneuma-quickhack-result-title ${data.targetAware ? "failure" : "success"}">
          <h3>${game.i18n.localize("PNEUMA_QUICKHACK.Roll.JackInCardTitle")}</h3>
          ${data.routing.showAwareness ? `<strong class="pneuma-quickhack-outcome ${data.targetAware ? "failure" : "success"}">${game.i18n.localize(
            data.targetAware ? "PNEUMA_QUICKHACK.Result.DetectedShort" : "PNEUMA_QUICKHACK.Result.UndetectedShort"
          )}</strong>` : ""}
        </div>
        <p class="pneuma-quickhack-participants"><strong>${source}</strong> <i class="fas fa-arrow-right"></i> <strong>${data.targetToken.name}</strong></p>
        ${data.routing.showTotals ? `<p>${game.i18n.format("PNEUMA_QUICKHACK.Result.ContestSummary", {
          interface: data.interfaceTotal,
          will: data.willTotal
        })}</p>` : ""}
        ${data.routing.showAwareness ? `<p class="pneuma-quickhack-awareness pneuma-quickhack-jack-in-awareness ${data.targetAware ? "failure" : "success"}">${game.i18n.format(
          data.targetAware ? "PNEUMA_QUICKHACK.Result.DetectedSummary" : "PNEUMA_QUICKHACK.Result.UndetectedSummary",
          { target: data.targetToken.name }
        )}</p>` : ""}
        ${data.targetAware ? forceOutButton() : ""}
      </div>
    </div>
  </div>`;
}

export function resolveMessageDelivery(audience, {
  gmRecipients,
  sourceOwnerRecipients = [],
  targetOwnerRecipients = []
}) {
  if (audience === AUDIENCE.PUBLIC) return { whisper: [], blind: false };
  if (audience === AUDIENCE.SOURCE_OWNERS) {
    return {
      whisper: [...new Set([...gmRecipients, ...sourceOwnerRecipients])],
      blind: false
    };
  }
  if (audience === AUDIENCE.TARGET_OWNERS) {
    return {
      whisper: [...new Set([...gmRecipients, ...targetOwnerRecipients])],
      blind: false
    };
  }
  return { whisper: [...gmRecipients], blind: true };
}

function forceOutButton() {
  return `<div class="pneuma-quickhack-force-out-actions">
    <button type="button" class="pneuma-quickhack-force-out">
      <i class="fas fa-right-from-bracket"></i>
      ${game.i18n.localize("PNEUMA_QUICKHACK.ForceOut.Button")}
    </button>
  </div>`;
}

function quickhackResultContent(data) {
  const source = data.routing.revealAttacker
    ? data.sourceToken.name
    : game.i18n.localize("PNEUMA_QUICKHACK.Result.UnknownNetrunner");
  return `<div class="rollcard pneuma-quickhack-result-rollcard">
    <div class="rollcard-top">
      <div class="cpr-block pneuma-quickhack-result-card">
        <div class="pneuma-quickhack-result-title ${data.success ? "success" : "failure"}">
          <h3>${data.quickhack.name}</h3>
          <strong class="pneuma-quickhack-outcome ${data.success ? "success" : "failure"}">${game.i18n.localize(
            data.success ? "PNEUMA_QUICKHACK.Quickhack.SuccessShort" : "PNEUMA_QUICKHACK.Quickhack.FailureShort"
          )}</strong>
        </div>
        <p class="pneuma-quickhack-participants"><strong>${source}</strong> <i class="fas fa-arrow-right"></i> <strong>${data.targetToken.name}</strong></p>
        ${data.routing.showInterfaceTotal ? `<p>${game.i18n.format("PNEUMA_QUICKHACK.Quickhack.InterfaceSummary", {
          interface: data.interfaceTotal
        })}</p>` : ""}
        ${data.routing.showAwareness ? `<p class="pneuma-quickhack-awareness ${data.targetAlerted ? "aware" : "unaware"}">${game.i18n.format(
          data.targetAlerted ? "PNEUMA_QUICKHACK.Quickhack.AwarenessShort" : "PNEUMA_QUICKHACK.Quickhack.UnawareShort",
          { target: data.targetToken.name }
        )}</p>` : ""}
        ${data.success ? `<div class="pneuma-quickhack-effect-slot"><i class="fas fa-spinner fa-spin"></i> ${game.i18n.localize("PNEUMA_QUICKHACK.Effect.Resolving")}</div>` : ""}
        ${data.targetAlerted ? forceOutButton() : ""}
      </div>
    </div>
  </div>`;
}

export async function postQuickhackResults(data) {
  const speaker = data.routing.revealAttacker
    ? ChatMessage.getSpeaker({ actor: data.sourceActor, token: data.sourceToken.document })
    : { alias: game.i18n.localize("PNEUMA_QUICKHACK.Result.UnknownNetrunner") };
  const delivery = resolveMessageDelivery(data.routing.audience, data);
  return ChatMessage.create({
    speaker,
    ...delivery,
    content: quickhackResultContent(data),
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
      gmOnly: data.routing.audience === AUDIENCE.GM,
      forceOutContext: data.targetAlerted ? {
        sourceActorUuid: data.sourceActor.uuid,
        targetActorUuid: data.targetActor.uuid,
        audience: data.routing.audience,
        revealAttacker: data.routing.revealAttacker
      } : null
    } }
  });
}

export async function postJackInResults(data) {
  const delivery = resolveMessageDelivery(data.routing.audience, data);
  const mainContent = resultContent(data);
  const mainSpeaker = data.routing.revealAttacker
    ? ChatMessage.getSpeaker({ actor: data.sourceActor, token: data.sourceToken.document })
    : { alias: game.i18n.localize("PNEUMA_QUICKHACK.Result.UnknownNetrunner") };
  const messageFlags = {
    sourceActorUuid: data.sourceActor.uuid,
    targetActorUuid: data.targetActor.uuid,
    targetAware: data.targetAware
  };
  return ChatMessage.create({
    speaker: mainSpeaker,
    ...delivery,
    content: mainContent,
    flags: { [MODULE_ID]: {
      type: "jackInResult",
      ...messageFlags,
      gmOnly: data.routing.audience === AUDIENCE.GM,
      forceOutContext: data.targetAware ? {
        sourceActorUuid: data.sourceActor.uuid,
        targetActorUuid: data.targetActor.uuid,
        audience: data.routing.audience,
        revealAttacker: data.routing.revealAttacker
      } : null
    } }
  });
}
