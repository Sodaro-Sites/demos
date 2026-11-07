/* Sodaro business apps: shop search, checkout (the business's own Stripe on live sites, a clear preview on demos),
   invoice numbers carried into Stripe, the amount to enter for an order total. */
(function () {
  "use strict";
  var d = document, $$ = function (s, r) { return Array.prototype.slice.call((r || d).querySelectorAll(s)); };
  var SD = {}; try { SD = JSON.parse((d.getElementById("sd") || {}).textContent || "{}"); } catch (e) {}
  var esc = function (s) { return String(s || "").replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); };

  /* shop search */
  $$("[data-psearch]").forEach(function (q) {
    var cards = $$(".pcard"), empty = d.querySelector("[data-pempty]");
    q.addEventListener("input", function () {
      var t = q.value.toLowerCase().trim(), n = 0;
      cards.forEach(function (c) { var on = !t || c.textContent.toLowerCase().indexOf(t) !== -1; c.hidden = !on; if (on) n++; });
      if (empty) empty.hidden = n > 0;
    });
  });

  function total() { var el = d.querySelector("[data-cart-total]"); return el ? el.textContent.trim() : ""; }
  function amountOf(btn) {
    var a = btn.getAttribute("data-amount") || "";
    if (!a && /order/i.test(btn.getAttribute("data-item") || "")) a = total();
    var f = btn.closest("form"), sel = f && f.querySelector('[name="amount"]');
    if (!a && sel && /^\$/.test(sel.value)) a = sel.value;
    return a;
  }

  /* the checkout preview (demo) and the 'nothing to pay online yet' note */
  var dlg = null;
  function preview(btn) {
    if (!dlg) {
      dlg = d.createElement("dialog"); dlg.className = "ckm"; dlg.setAttribute("aria-labelledby", "ckm-h");
      d.body.appendChild(dlg);
      dlg.addEventListener("click", function (e) { if (e.target === dlg || e.target.closest("[data-ckclose]")) dlg.close(); });
    }
    var item = btn.getAttribute("data-item") || "Your order", amt = amountOf(btn), demo = SD.mode !== "live";
    dlg.innerHTML = '<div class="ckm__card"><div class="ckm__top"><span class="ckm__lock" aria-hidden="true"></span><span>Secure checkout</span>' +
      '<button class="ckm__x" type="button" data-ckclose aria-label="Close">&times;</button></div>' +
      '<p class="ckm__k" id="ckm-h">' + esc(SD.name || "") + '</p><div class="ckm__line"><span>' + esc(item) + '</span><b>' + esc(amt || "") + '</b></div>' +
      '<div class="ckm__card-mock" aria-hidden="true"><i></i><i></i><i></i></div>' +
      '<p class="ckm__note">' + (demo ? "This is a preview. On the live site this button opens Stripe’s secure checkout, and the payment goes straight to " + esc(SD.name || "the business") + "’s own Stripe account."
        : "Online payment isn’t switched on yet. Place the order and they’ll send you a secure payment link.") + '</p>' +
      '<button class="btn btn--primary btn--block" type="button" data-ckclose>' + (demo ? "Got it" : "OK") + '</button></div>';
    if (dlg.showModal) dlg.showModal(); else dlg.setAttribute("open", "");
  }
  $$("[data-checkout]").forEach(function (b) { b.addEventListener("click", function () { preview(b); }); });

  /* live payment links: the invoice number travels with the payment; an order total is shown to enter */
  $$("[data-paylink]").forEach(function (a) {
    a.addEventListener("click", function () {
      var f = a.closest("form") || d, inv = f.querySelector('[name="invoice"]'), base = a.getAttribute("href").split("?")[0];
      var ref = inv && inv.value ? inv.value.replace(/[^A-Za-z0-9_-]/g, "").slice(0, 60) : "";
      if (ref) a.setAttribute("href", base + "?client_reference_id=" + encodeURIComponent(ref));
      var amt = amountOf(a);
      if (amt && /\$/.test(amt)) { var n = a.parentNode.querySelector(".ckm-hint") || d.createElement("p"); n.className = "note ckm-hint"; n.textContent = "Enter " + amt + " on the next screen."; a.after(n); }
    });
  });
})();
