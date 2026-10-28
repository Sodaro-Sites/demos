/* Sodaro site widgets: open-now badge, hours, mobile nav, menu (tabs, search, dietary filters, cart), booking day/time picker,
   multi-step request forms, service-area checker, carousel, lightbox, before/after, copy address.
   Every request is delivered to SD.route (in a preview that is Sodaro Sites, never the business). */
(function () {
  "use strict";
  var d = document;
  var SD = {};
  try { SD = JSON.parse((d.getElementById("sd") || {}).textContent || "{}"); } catch (e) { SD = {}; }
  var R = SD.route || {};
  var $ = function (s, el) { return (el || d).querySelector(s); };
  var $$ = function (s, el) { return [].slice.call((el || d).querySelectorAll(s)); };
  var DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  var DAYS_LONG = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" }[c]; }); }
  function store(k, v) { try { if (v === undefined) return JSON.parse(sessionStorage.getItem(k) || "null"); sessionStorage.setItem(k, JSON.stringify(v)); } catch (e) { return null; } }

  /* ---------- time, hours and the live open badge */
  function fmt(m) {
    m = ((m % 1440) + 1440) % 1440;
    if (m === 0) return "midnight";
    if (m === 720) return "noon";
    var h = Math.floor(m / 60), mi = m % 60;
    return (h % 12 || 12) + (mi ? ":" + (mi < 10 ? "0" : "") + mi : "") + " " + (h < 12 ? "am" : "pm");
  }
  function now() {
    try {
      var p = {};
      new Intl.DateTimeFormat("en-US", { timeZone: SD.tz || undefined, weekday: "short", hour: "numeric", minute: "numeric", hourCycle: "h23" })
        .formatToParts(new Date()).forEach(function (x) { p[x.type] = x.value; });
      return { d: DAYS.indexOf(p.weekday), m: (parseInt(p.hour, 10) % 24) * 60 + parseInt(p.minute, 10) };
    } catch (e) { var n = new Date(); return { d: (n.getDay() + 6) % 7, m: n.getHours() * 60 + n.getMinutes() }; }
  }
  var H = SD.hours || [];
  function status() {
    if (H.length !== 7) return null;
    var t = now(), today = H[t.d] || [], yest = H[(t.d + 6) % 7] || [], i, s;
    for (i = 0; i < yest.length; i++) { s = yest[i]; if (s[1] > 1440 && t.m < s[1] - 1440) return { open: true, close: s[1] - 1440, left: s[1] - 1440 - t.m }; }
    for (i = 0; i < today.length; i++) { s = today[i]; if (s[0] <= t.m && t.m < s[1]) return { open: true, close: s[1], left: s[1] - t.m, all: s[0] === 0 && s[1] >= 1440 }; }
    for (i = 0; i < today.length; i++) { if (today[i][0] > t.m) return { open: false, at: today[i][0], day: "" }; }
    for (var k = 1; k <= 7; k++) { var dd = (t.d + k) % 7; if ((H[dd] || []).length) return { open: false, at: H[dd][0][0], day: k === 1 ? "tomorrow" : DAYS[dd] }; }
    return null;
  }
  function paintOpen() {
    var st = status();
    $$("[data-open]").forEach(function (el) {
      if (!st) { el.hidden = true; return; }
      el.hidden = false;
      el.classList.toggle("is-open", st.open); el.classList.toggle("is-closed", !st.open);
      var txt = st.open ? (st.all ? "Open 24 hours today" : st.left <= 60 ? "Open now · closes in " + st.left + " min" : "Open now · closes " + fmt(st.close))
        : "Closed · opens " + (st.day ? st.day + " " : "") + fmt(st.at);
      var t = $(".t", el); if (t) t.textContent = txt; else el.textContent = txt;
    });
    var t = now(), today = H[t.d] || [];
    $$("[data-today-hours]").forEach(function (el) {
      if (H.length !== 7) return;
      el.textContent = today.length ? today.map(function (s) { return s[0] === 0 && s[1] >= 1440 ? "Open 24 hours" : fmt(s[0]) + " \u2013 " + fmt(s[1]); }).join(", ") : "Closed today";
      var lb = el.parentNode.querySelector("[data-today-label]"); if (lb) lb.textContent = "Today";
    });
    $$("[data-day]").forEach(function (tr) { tr.classList.toggle("is-today", +tr.getAttribute("data-day") === t.d); });
  }
  paintOpen();
  setInterval(paintOpen, 60000);

  /* ---------- mobile nav sheet */
  var sheet = $(".sheet"), opener = $(".menu-btn");
  function nav(open) {
    d.body.classList.toggle("nav-open", open);
    if (opener) opener.setAttribute("aria-expanded", String(open));
    if (sheet) sheet.setAttribute("aria-hidden", String(!open));
    if (open && sheet) { var f = $("a", sheet); if (f) f.focus(); } else if (opener) opener.focus();
  }
  if (opener) opener.addEventListener("click", function () { nav(true); });
  $$("[data-close-nav]").forEach(function (b) { b.addEventListener("click", function () { nav(false); }); });
  d.addEventListener("keydown", function (e) { if (e.key === "Escape" && d.body.classList.contains("nav-open")) nav(false); });

  /* ---------- copy address */
  $$("[data-copy]").forEach(function (b) {
    b.addEventListener("click", function () {
      var txt = b.getAttribute("data-copy"), lbl = $(".l", b) || b, old = lbl.textContent;
      var done = function () { lbl.textContent = "Copied"; setTimeout(function () { lbl.textContent = old; }, 1600); };
      if (navigator.clipboard) navigator.clipboard.writeText(txt).then(done, function () {}); else done();
    });
  });

  /* ---------- before / after */
  $$(".ba input[type=range]").forEach(function (r) {
    var box = r.closest(".ba");
    var set = function () { box.style.setProperty("--pos", r.value + "%"); };
    r.addEventListener("input", set); set();
  });

  /* ---------- carousel */
  $$("[data-carousel]").forEach(function (c) {
    var track = $(".carousel__track", c), prev = $("[data-prev]", c), next = $("[data-next]", c);
    if (!track) return;
    var slides = track.children;
    function by(dir) { track.scrollBy({ left: dir * Math.max(240, track.clientWidth * 0.8), behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" }); }
    if (prev) prev.addEventListener("click", function () { by(-1); });
    if (next) next.addEventListener("click", function () { by(1); });
    if ("IntersectionObserver" in window && slides.length) {
      var ob = new IntersectionObserver(function (es) {
        es.forEach(function (e) {
          if (e.target === slides[0] && prev) prev.disabled = e.intersectionRatio > 0.9;
          if (e.target === slides[slides.length - 1] && next) next.disabled = e.intersectionRatio > 0.9;
        });
      }, { root: track, threshold: [0, 0.9, 1] });
      ob.observe(slides[0]); ob.observe(slides[slides.length - 1]);
    }
  });

  /* ---------- gallery lightbox */
  var lb = $("#lb");
  if (lb && lb.showModal) {
    var shots = $$("[data-shot]"), cur = 0;
    var show = function (i) {
      cur = (i + shots.length) % shots.length;
      var b = shots[cur]; $("img", lb).src = b.getAttribute("data-shot"); $("img", lb).alt = b.getAttribute("data-alt") || "";
      $("figcaption", lb).textContent = b.getAttribute("data-alt") || "";
    };
    shots.forEach(function (b, i) { b.addEventListener("click", function () { show(i); lb.showModal(); }); });
    $$("[data-lb]", lb).forEach(function (b) {
      b.addEventListener("click", function () { var a = b.getAttribute("data-lb"); if (a === "close") lb.close(); else show(cur + (a === "next" ? 1 : -1)); });
    });
    lb.addEventListener("keydown", function (e) { if (e.key === "ArrowRight") show(cur + 1); if (e.key === "ArrowLeft") show(cur - 1); });
    lb.addEventListener("click", function (e) { if (e.target === lb) lb.close(); });
  }

  /* ---------- service area checker */
  function townMatch(q) {
    q = String(q || "").toLowerCase().replace(/[^a-z ]/g, "").trim();
    if (q.length < 2) return null;
    var list = SD.area || [];
    for (var i = 0; i < list.length; i++) { var t = list[i].toLowerCase(); if (t === q || t.indexOf(q) === 0 || q.indexOf(t) === 0) return list[i]; }
    return "";
  }
  $$("[data-area-check]").forEach(function (f) {
    var inp = $("input", f), out = $(".check-out", f.parentNode);
    f.addEventListener("submit", function (e) {
      e.preventDefault();
      var m = townMatch(inp.value);
      $$(".towns li").forEach(function (li) { li.classList.toggle("is-hit", !!m && li.textContent.trim() === m); });
      if (!out) return;
      if (m === null) out.textContent = "Type a town name first.";
      else if (m) out.textContent = "Yes, " + m + " is in the service area.";
      else out.textContent = "“" + inp.value.trim() + "” isn’t on the list, but ask anyway: send a quote request and you’ll get a straight answer.";
    });
  });

  /* ---------- request delivery (book / quote / order / contact) */
  function compose(form, extra) {
    var kind = form.getAttribute("data-request") || "Request";
    var lines = [kind + " for " + (SD.name || "") + " (from the website)"];
    if (extra) lines = lines.concat(extra);
    $$("input, select, textarea", form).forEach(function (el) {
      if (!el.name || el.type === "hidden" || el.type === "submit" || el.disabled) return;
      if ((el.type === "radio" || el.type === "checkbox") && !el.checked) return;
      var v = String(el.value || "").trim(); if (!v) return;
      var label = el.getAttribute("data-label") || el.name;
      if (lines.some(function (l) { return l.indexOf(label + ": ") === 0; })) { lines[lines.length - 1] += ", " + v; return; }
      lines.push(label + ": " + v);
    });
    return lines.join("\n");
  }
  function deliver(form, body, done) {
    var subj = (form.getAttribute("data-request") || "Request") + " - " + (SD.name || "website");
    var sms = R.sms ? "sms:" + R.sms + "?&body=" + encodeURIComponent(body) : "";
    var mail = R.email ? "mailto:" + R.email + "?subject=" + encodeURIComponent(subj) + "&body=" + encodeURIComponent(body) : "";
    var box = done || $(".done", form.parentNode);
    function links(msg) {
      if (!box) return;
      var mobile = matchMedia("(pointer: coarse)").matches;
      var a1 = sms ? '<a class="btn btn--primary" href="' + esc(sms) + '">Send by text</a>' : "";
      var a2 = mail ? '<a class="btn ' + (mobile && sms ? "btn--ghost" : "btn--primary") + '" href="' + esc(mail) + '">Send by email</a>' : "";
      $(".done__body", box).innerHTML = "<p>" + esc(msg) + "</p><div class=\"btn-row\">" + (mobile ? a1 + a2 : a2 + a1) + "</div>";
      box.classList.add("is-on"); form.hidden = true; box.setAttribute("tabindex", "-1"); box.focus();
    }
    if (R.endpoint) {
      var btn = $("[type=submit]", form); if (btn) btn.setAttribute("aria-disabled", "true");
      var fd = new FormData(form); fd.append("message", body);
      fetch(R.endpoint, { method: "POST", body: fd, headers: { Accept: "application/json" } }).then(function (r) {
        if (!r.ok) throw new Error(r.status);
        $(".done__body", box).innerHTML = "<p>Sent. You’ll hear back soon by phone, text or email.</p>";
        box.classList.add("is-on"); form.hidden = true; box.setAttribute("tabindex", "-1"); box.focus();
      }).catch(function () { links("That didn’t go through. Send it by text or email instead:"); if (btn) btn.removeAttribute("aria-disabled"); });
      return;
    }
    links((SD.sent || "Your request is ready.") + " Choose how to send it:");
  }
  function validate(scope) {
    var ok = true, first = null;
    $$("[required]", scope).forEach(function (el) {
      if (el.disabled || el.closest("[hidden]")) return;
      var group = el.type === "radio" ? $$('[name="' + el.name + '"]', scope) : [el];
      var good = el.type === "radio" ? group.some(function (r) { return r.checked; }) : String(el.value || "").trim().length > 0;
      if (good && el.type === "tel") good = String(el.value).replace(/\D/g, "").length >= 10;
      if (good && el.type === "email" && el.value) good = /.+@.+\..+/.test(el.value);
      var err = d.getElementById(el.getAttribute("aria-describedby") || "");
      if (el.type !== "radio") el.setAttribute("aria-invalid", String(!good));
      if (err) err.textContent = good ? "" : (el.getAttribute("data-err") || "Please fill this in.");
      if (!good) { ok = false; if (!first) first = el; }
    });
    if (first) first.focus();
    return ok;
  }

  /* ---------- booking: next open days + time slots from real hours */
  $$("[data-days]").forEach(function (box) {
    var times = $("[data-times]", box.closest("form") || d), n = now(), out = [];
    var shown = parseInt(box.getAttribute("data-days"), 10) || 12;
    for (var k = 0; out.length < shown && k < 28; k++) {
      var dd = (n.d + k) % 7, date = new Date(Date.now() + k * 864e5);
      if (H.length === 7 && !(H[dd] || []).length) continue;
      if (k === 0 && H.length === 7 && !(H[dd] || []).some(function (s) { return s[1] - 60 > n.m; })) continue;
      out.push({ k: k, d: dd, label: k === 0 ? "Today" : k === 1 ? "Tomorrow" : DAYS[dd], sub: date.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        val: DAYS_LONG[dd] + " " + date.toLocaleDateString("en-US", { month: "short", day: "numeric" }) });
    }
    box.innerHTML = out.map(function (o, i) {
      return '<label class="chip-opt"><input type="radio" name="day" data-label="Day" value="' + esc(o.val) + '" data-k="' + o.k + '" data-d="' + o.d + '"' +
        (i === 0 ? " required" : "") + '><span>' + esc(o.label) + "<small>" + esc(o.sub) + "</small></span></label>";
    }).join("");
    function slots(dd, k) {
      if (!times) return;
      var opts = [];
      if (H.length === 7) {
        (H[dd] || []).forEach(function (s) {
          for (var m = Math.ceil(s[0] / 30) * 30; m <= s[1] - 60; m += 30) { if (k === 0 && m < n.m + 30) continue; opts.push(fmt(m)); }
        });
      }
      if (!opts.length) opts = ["Morning", "Midday", "Afternoon", "Evening"];
      times.innerHTML = '<option value="">Choose a time</option>' + opts.map(function (o) { return "<option>" + esc(o) + "</option>"; }).join("");
      times.disabled = false;
    }
    box.addEventListener("change", function (e) { var t = e.target; if (t.name === "day") slots(+t.getAttribute("data-d"), +t.getAttribute("data-k")); });
    if (times) { times.innerHTML = '<option value="">Pick a day first</option>'; }
  });

  /* multi-step forms with a progress bar (Zeigarnik: show how close they are to done) */
  $$("form[data-request]").forEach(function (form) {
    var steps = $$("[data-step]", form), at = 0, bar = $(".steps__bar span", form), txt = $(".steps__txt", form);
    function go(i) {
      at = Math.max(0, Math.min(steps.length - 1, i));
      steps.forEach(function (s, j) { s.hidden = j !== at; });
      if (bar) bar.style.setProperty("--p", ((at + 1) / steps.length).toFixed(3));
      if (txt) txt.textContent = "Step " + (at + 1) + " of " + steps.length;
      var h = $("legend, h3", steps[at]); if (h && i !== 0) { h.setAttribute("tabindex", "-1"); h.focus(); }
    }
    if (steps.length > 1) go(0);
    $$("[data-next-step]", form).forEach(function (b) { b.addEventListener("click", function () { if (validate(steps[at])) go(at + 1); }); });
    $$("[data-prev-step]", form).forEach(function (b) { b.addEventListener("click", function () { go(at - 1); }); });
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (steps.length > 1 && at < steps.length - 1) { if (validate(steps[at])) go(at + 1); return; }
      if (!validate(form)) return;
      var extra = form.hasAttribute("data-cart") ? cartLines() : null;
      if (form.hasAttribute("data-cart") && !cart.length) { var ce = $(".cart__empty"); if (ce) ce.textContent = "Add something from the menu first."; return; }
      deliver(form, compose(form, extra));
    });
    // prefill from the hero starter (?service=…&day=…)
    try {
      var q = new URLSearchParams(location.search);
      q.forEach(function (v, k) {
        $$('[name="' + k + '"]', form).forEach(function (el) {
          if (el.type === "radio") { el.checked = el.value === v; if (el.checked) el.dispatchEvent(new Event("change", { bubbles: true })); }
          else el.value = v;
        });
      });
    } catch (e) {}
  });

  /* ---------- menu: tabs, search, dietary filters */
  $$("[data-menu]").forEach(function (menu) {
    var tabs = $$(".tab", menu), q = $("input[type=search]", menu), chips = $$(".fchip", menu), secs = $$(".menu-sec", menu), note = $(".empty-note", menu);
    var active = "all", tags = [];
    function apply() {
      var term = (q && q.value || "").toLowerCase().trim(), any = false;
      secs.forEach(function (sec) {
        var inTab = active === "all" || sec.getAttribute("data-sec") === active, vis = 0;
        $$(".item", sec).forEach(function (it) {
          var t = (it.getAttribute("data-tags") || "").split(" ");
          var ok = inTab && (!term || it.textContent.toLowerCase().indexOf(term) >= 0) && tags.every(function (g) { return t.indexOf(g) >= 0; });
          it.hidden = !ok; if (ok) vis++;
        });
        sec.hidden = !vis; if (vis) any = true;
      });
      if (note) note.hidden = any;
    }
    tabs.forEach(function (t, i) {
      t.addEventListener("click", function () {
        active = t.getAttribute("data-tab");
        tabs.forEach(function (x) { x.setAttribute("aria-selected", String(x === t)); x.tabIndex = x === t ? 0 : -1; });
        apply();
      });
      t.addEventListener("keydown", function (e) {
        var j = e.key === "ArrowRight" ? i + 1 : e.key === "ArrowLeft" ? i - 1 : -9;
        if (j === -9) return; e.preventDefault(); var nx = tabs[(j + tabs.length) % tabs.length]; nx.focus(); nx.click();
      });
    });
    if (q) q.addEventListener("input", apply);
    chips.forEach(function (c) {
      c.addEventListener("click", function () {
        var on = c.getAttribute("aria-pressed") !== "true"; c.setAttribute("aria-pressed", String(on));
        var g = c.getAttribute("data-filter"); tags = tags.filter(function (x) { return x !== g; }); if (on) tags.push(g);
        apply();
      });
    });
  });

  /* ---------- cart */
  var cart = store("sd-cart-" + (SD.slug || "")) || [];
  var cartEl = $("[data-cart-list]"), totalEl = $("[data-cart-total]"), barEl = $(".cart-bar"), live = $("#cart-live");
  function money(p) { var m = String(p || "").replace(/,/g, "").match(/\d+(?:\.\d+)?/); return m ? parseFloat(m[0]) : null; }
  function cartLines() { return cart.map(function (c) { return c.q + " x " + c.n + (c.p ? " (" + c.p + ")" : ""); }); }
  function paintCart() {
    store("sd-cart-" + (SD.slug || ""), cart);
    var count = cart.reduce(function (t, c) { return t + c.q; }, 0);
    var sum = cart.reduce(function (t, c) { var m = money(c.p); return t + (m || 0) * c.q; }, 0);
    var priced = cart.length && cart.every(function (c) { return money(c.p) !== null; });
    if (cartEl) {
      cartEl.innerHTML = cart.length ? cart.map(function (c, i) {
        return "<li><span>" + esc(c.n) + (c.p ? '<br><small class="muted">' + esc(c.p) + "</small>" : "") + '</span><span class="qty">' +
          '<button type="button" data-q="' + i + '" data-d="-1" aria-label="One less ' + esc(c.n) + '">&minus;</button><span>' + c.q + "</span>" +
          '<button type="button" data-q="' + i + '" data-d="1" aria-label="One more ' + esc(c.n) + '">+</button></span></li>';
      }).join("") : '<li class="cart__empty">Nothing added yet. Tap “Add” on anything in the menu.</li>';
    }
    if (totalEl) totalEl.textContent = !cart.length ? "" : priced ? "$" + sum.toFixed(2) : (sum ? "$" + sum.toFixed(2) + " + items priced in store" : "Priced in store");
    if (barEl) { barEl.classList.toggle("is-on", count > 0); var bt = $(".t", barEl); if (bt) bt.textContent = count + (count === 1 ? " item" : " items") + (priced ? " · $" + sum.toFixed(2) : ""); }
    if (live) live.textContent = count ? count + " in your order" : "Order is empty";
  }
  if (cartEl) {
    cartEl.addEventListener("click", function (e) {
      var b = e.target.closest("[data-q]"); if (!b) return;
      var i = +b.getAttribute("data-q"); cart[i].q += +b.getAttribute("data-d"); if (cart[i].q <= 0) cart.splice(i, 1); paintCart();
    });
  }
  $$(".add").forEach(function (b) {
    b.addEventListener("click", function () {
      var n = b.getAttribute("data-name"), p = b.getAttribute("data-price") || "", f = null;
      cart.forEach(function (c) { if (c.n === n) f = c; });
      if (f) f.q++; else cart.push({ n: n, p: p, q: 1 });
      b.classList.add("is-added"); var l = $(".l", b), old = l ? l.textContent : "";
      if (l) l.textContent = "Added"; setTimeout(function () { b.classList.remove("is-added"); if (l) l.textContent = old; }, 1200);
      paintCart();
    });
  });
  if (cartEl || barEl) paintCart();
})();
