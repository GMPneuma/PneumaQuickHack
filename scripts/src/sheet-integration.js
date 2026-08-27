import { executeJackIn } from "./jack-in.js";
import { isJackInItem } from "./jack-in-item.js";
import { JACK_IN_RANGE_SQUARES } from "./constants.js";

function rootElement(html) {
  if (html instanceof HTMLElement) return html;
  return html?.[0] ?? null;
}

function decorateJackInRows(app, root) {
  if (!app.actor || !root) return;
  for (const item of app.actor.items.filter((candidate) => isJackInItem(candidate))) {
    const row = root.querySelector(`.weapon-grid[data-item-id="${item.id}"]`);
    if (!row) continue;
    row.classList.add("pneuma-quickhack-item");
    row.querySelector("[data-roll-type='damage']")?.closest(".weapon-damage")?.classList.add("pneuma-quickhack-hidden");
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
      attack.dataset.pneumaQuickhackAction = "jack-in";
      attack.setAttribute("data-tooltip", game.i18n.localize("PNEUMA_QUICKHACK.Item.UseJackIn"));
      const icon = attack.querySelector("i");
      if (icon) {
        icon.className = "fas fa-network-wired red-fg";
        icon.setAttribute("data-tooltip", game.i18n.localize("PNEUMA_QUICKHACK.Item.UseJackIn"));
      }
    }
  }
}

function interceptJackInClicks(app, root) {
  if (!app.actor || !root || root.dataset.pneumaQuickhackBound === "true") return;
  root.dataset.pneumaQuickhackBound = "true";
  root.addEventListener("click", (event) => {
    const action = event.target.closest?.("[data-pneuma-quickhack-action='jack-in']");
    if (!action) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    void executeJackIn(app.actor);
  }, true);
}

function onRenderActorSheet(app, html) {
  const root = rootElement(html);
  decorateJackInRows(app, root);
  interceptJackInClicks(app, root);
}

export function registerSheetIntegration() {
  Hooks.on("renderActorSheet", onRenderActorSheet);
  Hooks.on("renderCPRCharacterActorSheet", onRenderActorSheet);
  Hooks.on("renderCPRMookActorSheet", onRenderActorSheet);
}
