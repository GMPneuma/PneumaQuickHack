import { executeJackIn } from "./jack-in.js";
import { isQuickhackItem } from "./jack-in-item.js";
import { JACK_IN_RANGE_SQUARES, QUICKHACK_ICON } from "./constants.js";
import { executeQuickhack } from "./quickhack.js";

function rootElement(html) {
  if (html instanceof HTMLElement) return html;
  return html?.[0] ?? null;
}

function makeActionDraggable(action, item, actor, actionId) {
  action.draggable = true;
  action.addEventListener("dragstart", (event) => {
    event.stopImmediatePropagation();
    event.dataTransfer?.setData("text/plain", JSON.stringify({
      type: "Macro",
      uuid: item.uuid,
      pneumaQuickhackAction: actionId,
      actorUuid: actor.uuid
    }));
  }, true);
}

function decorateJackInRows(app, root) {
  if (!app.actor || !root) return;
  for (const item of app.actor.items.filter((candidate) => isQuickhackItem(candidate))) {
    const row = root.querySelector(`.weapon-grid[data-item-id="${item.id}"]`);
    if (!row) continue;
    row.classList.add("pneuma-quickhack-item");
    const itemImage = row.querySelector(".weapon-image img");
    if (itemImage) itemImage.src = QUICKHACK_ICON;
    row.querySelector(".weapon-mode")?.classList.add("pneuma-quickhack-hidden");
    const ammo = row.querySelector(".weapon-ammo");
    if (ammo) ammo.textContent = game.i18n.localize("PNEUMA_QUICKHACK.Item.NetAction");
    const info = row.querySelector(".weapon-info");
    if (info) {
      info.innerHTML = `<span class="text-pill">${game.i18n.format(
        "PNEUMA_QUICKHACK.Item.Range",
        { squares: JACK_IN_RANGE_SQUARES }
      )}</span>`;
    }
    const attack = row.querySelector(".weapon-attack [data-roll-type='attack']");
    if (attack) {
      $(attack).off("click");
      attack.dataset.pneumaQuickhackAction = "jack-in";
      const jackInLabel = game.i18n.localize("PNEUMA_QUICKHACK.Item.UseJackIn");
      attack.setAttribute("data-tooltip", jackInLabel);
      attack.setAttribute("title", jackInLabel);
      attack.setAttribute("aria-label", jackInLabel);
      makeActionDraggable(attack, item, app.actor, "jack-in");
      const icon = attack.querySelector("i");
      if (icon) {
        icon.className = "fas fa-network-wired fa-fw red-fg";
        icon.setAttribute("data-tooltip", game.i18n.localize("PNEUMA_QUICKHACK.Item.UseJackIn"));
      }
    }
    const quickhack = row.querySelector(".weapon-damage [data-roll-type='damage']");
    if (quickhack) {
      $(quickhack).off("click");
      quickhack.dataset.pneumaQuickhackAction = "quickhack";
      const quickhackLabel = game.i18n.localize("PNEUMA_QUICKHACK.Item.UseQuickhack");
      quickhack.setAttribute("data-tooltip", quickhackLabel);
      quickhack.setAttribute("title", quickhackLabel);
      quickhack.setAttribute("aria-label", quickhackLabel);
      makeActionDraggable(quickhack, item, app.actor, "quickhack");
      const icon = quickhack.querySelector("i");
      if (icon) {
        icon.className = "fas fa-microchip fa-fw red-fg";
        icon.setAttribute("data-tooltip", game.i18n.localize("PNEUMA_QUICKHACK.Item.UseQuickhack"));
      }
    }
  }
}

function interceptJackInClicks(app, root) {
  if (!app.actor || !root || root.dataset.pneumaQuickhackBound === "true") return;
  root.dataset.pneumaQuickhackBound = "true";
  root.addEventListener("click", (event) => {
    const action = event.target.closest?.("[data-pneuma-quickhack-action]");
    if (!action) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    if (action.dataset.pneumaQuickhackAction === "jack-in") {
      void executeJackIn(app.actor);
    } else if (action.dataset.pneumaQuickhackAction === "quickhack") {
      void executeQuickhack(app.actor);
    }
  }, true);
}

function onRenderActorSheet(app, html) {
  const root = rootElement(html);
  decorateJackInRows(app, root);
  interceptJackInClicks(app, root);
}

function onRenderRoleRollDialog(app, html) {
  const contextualHeader = app.rollData?.pneumaContextHeader;
  if (!contextualHeader) return;
  const root = rootElement(html);
  const header = root?.querySelector(".dialog-header .text-normal");
  if (header) header.textContent = contextualHeader;
}

export function registerSheetIntegration() {
  Hooks.on("renderActorSheet", onRenderActorSheet);
  Hooks.on("renderCPRCharacterActorSheet", onRenderActorSheet);
  Hooks.on("renderCPRMookActorSheet", onRenderActorSheet);
  Hooks.on("renderCPRRoleRollDialog", onRenderRoleRollDialog);
}
