import { MODULE_ID } from "./constants.js";
import { beginForceOut } from "./force-out.js";
import { canOperateActor } from "./foundry-utils.js";
import { rollQuickhackDamage } from "./quickhack-damage.js";

export function registerChatIntegration() {
  Hooks.on("renderChatMessage", async (message, html) => {
    const root = html[0] ?? html;
    const damageButton = root?.querySelector?.(".pneuma-quickhack-roll-damage");
    if (damageButton) {
      const sourceActorUuid = message.getFlag(MODULE_ID, "sourceActorUuid");
      const sourceActor = sourceActorUuid ? await fromUuid(sourceActorUuid) : null;
      if (!sourceActor || !canOperateActor(sourceActor)) {
        damageButton.remove();
      } else {
        damageButton.addEventListener("click", async (event) => {
          event.preventDefault();
          event.stopPropagation();
          damageButton.disabled = true;
          try {
            await rollQuickhackDamage(message);
          } finally {
            damageButton.disabled = false;
          }
        });
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
