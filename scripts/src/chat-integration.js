import { MODULE_ID } from "./constants.js";
import { beginForceOut } from "./force-out.js";
import { canOperateActor } from "./foundry-utils.js";

export function registerChatIntegration() {
  Hooks.on("renderChatMessage", async (message, html) => {
    const root = html[0] ?? html;
    if (message.getFlag(MODULE_ID, "gmOnly") === true) {
      root?.classList?.add("pneuma-quickhack-gm-only");
      const content = root?.querySelector?.(".message-content");
      if (content && !content.querySelector(".pneuma-quickhack-gm-banner")) {
        const banner = document.createElement("div");
        banner.className = "pneuma-quickhack-gm-banner";
        banner.innerHTML = `<i class="fas fa-user-shield"></i> ${game.i18n.localize("PNEUMA_QUICKHACK.Chat.GmOnly")}`;
        content.prepend(banner);
      }
    }
    const button = html[0]?.querySelector?.(".pneuma-quickhack-force-out")
      ?? html.querySelector?.(".pneuma-quickhack-force-out");
    if (!button) return;

    const context = message.getFlag(MODULE_ID, "forceOutContext");
    const defenderActor = context?.targetActorUuid
      ? await fromUuid(context.targetActorUuid)
      : null;
    if (!defenderActor || !canOperateActor(defenderActor)) {
      button.remove();
      return;
    }

    button.addEventListener("click", async (event) => {
      event.preventDefault();
      event.stopPropagation();
      button.disabled = true;
      try {
        await beginForceOut(message);
      } finally {
        button.disabled = false;
      }
    });
  });
}
