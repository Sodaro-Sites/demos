/* Sodaro add-ons: the trade's 3D model, live charts, working tools. three.js loads only when the 3D model scrolls near,
   from a CDN (with a second CDN as backup); without WebGL the section keeps its still picture. Off under reduced motion. */
(function () {
  "use strict";
  var d = document, $$ = function (s, r) { return Array.prototype.slice.call((r || d).querySelectorAll(s)); };
  var still = matchMedia("(prefers-reduced-motion: reduce)").matches;
  var money = function (v) { return "$" + (Math.round(v * 100) / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }); };

  /* ---------- charts: today's row, the "now" line, bars grow in */
  $$(".xc__hours").forEach(function (ul) {
    var lo = +ul.getAttribute("data-lo"), rng = +ul.getAttribute("data-rng") || 1440;
    var t = new Date(), day = (t.getDay() + 6) % 7, m = t.getHours() * 60 + t.getMinutes();
    var row = ul.querySelector('[data-day="' + day + '"]');
    if (row) {
      row.classList.add("is-today");
      if (m >= lo && m <= lo + rng) { var n = d.createElement("b"); n.className = "xc__now"; n.style.left = ((m - lo) / rng * 100) + "%"; row.querySelector(".xc__track").appendChild(n); }
    }
  });
  if ("IntersectionObserver" in window && !still) {
    var io = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("is-drawn"); io.unobserve(e.target); } }); }, { threshold: .25 });
    $$(".xc").forEach(function (c) { io.observe(c); });
  } else $$(".xc").forEach(function (c) { c.classList.add("is-drawn"); });

  /* ---------- tools */
  function val(card, k) { var el = card.querySelector('[data-in="' + k + '"]'); return el ? parseFloat(el.value) || 0 : 0; }
  function ics(name, tel, weeks) {
    var t = new Date(Date.now() + weeks * 7 * 864e5); t.setHours(10, 0, 0, 0);
    var f = function (x) { return x.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, ""); };
    var e = new Date(t.getTime() + 15 * 6e4);
    var body = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Sodaro Sites//EN", "BEGIN:VEVENT", "UID:" + Date.now() + "@sodarosites",
      "DTSTAMP:" + f(new Date()), "DTSTART:" + f(t), "DTEND:" + f(e), "SUMMARY:Book with " + name,
      "DESCRIPTION:Time to book with " + name + (tel ? ". Call " + tel : "") + ".", "BEGIN:VALARM", "TRIGGER:-PT0M", "ACTION:DISPLAY",
      "DESCRIPTION:Book with " + name, "END:VALARM", "END:VEVENT", "END:VCALENDAR"].join("\r\n");
    var a = d.createElement("a"); a.href = URL.createObjectURL(new Blob([body], { type: "text/calendar" }));
    a.download = name.replace(/[^\w]+/g, "-").toLowerCase() + "-reminder.ics"; d.body.appendChild(a); a.click(); a.remove();
    return t;
  }
  $$("[data-tool]").forEach(function (card) {
    var kind = card.getAttribute("data-tool"), out = card.querySelector(".xt__out"), link = card.querySelector("[data-out-link]");
    var base = link ? link.getAttribute("href") : "";
    function calc() {
      var h = "", note = "";
      if (kind === "tip") {
        var bill = val(card, "bill"), tip = val(card, "tip"), ppl = Math.max(1, Math.round(val(card, "people")));
        var tot = bill * (1 + tip / 100);
        h = "<b>" + money(tot / ppl) + "</b><span>each · tip " + money(bill * tip / 100) + " · total " + money(tot) + "</span>";
      } else if (kind === "area") {
        var sq = val(card, "len") * val(card, "wid") * Math.max(1, Math.round(val(card, "count")));
        h = "<b>" + Math.round(sq).toLocaleString() + " sq ft</b><span>" + (sq / 100).toFixed(1) + " roofing squares · about " +
          Math.ceil(sq * 2 / 350) + " gal of paint for two coats on the floor area · " + (sq * 0.25 / 27).toFixed(1) + " cu yd of mulch at 3 in</span>";
        note = "Measured: " + Math.round(sq) + " sq ft (" + val(card, "len") + " x " + val(card, "wid") + " ft x " + Math.max(1, Math.round(val(card, "count"))) + ")";
        if (link) link.setAttribute("href", base + "?details=" + encodeURIComponent(note));
      } else if (kind === "mortgage") {
        var P = val(card, "price") * (1 - val(card, "down") / 100), r = val(card, "rate") / 1200, n = val(card, "years") * 12;
        var pay = r ? P * r / (1 - Math.pow(1 + r, -n)) : P / n;
        h = "<b>" + money(pay) + "/mo</b><span>principal and interest on " + money(P) + " (taxes and insurance extra)</span>";
      } else if (kind === "zones") {
        var mx = 220 - val(card, "age"), z = [[.5, .6, "Warm-up"], [.6, .7, "Fat burn"], [.7, .8, "Cardio"], [.8, .9, "Hard"], [.9, 1, "Max"]];
        h = '<ul class="xt__zones">' + z.map(function (q, i) { return '<li style="--z:' + i + '"><span>' + q[2] + "</span><b>" + Math.round(mx * q[0]) + "–" + Math.round(mx * q[1]) + " bpm</b></li>"; }).join("") + "</ul>";
      } else if (kind === "remind") {
        var w = val(card, "weeks"), dt = new Date(Date.now() + w * 7 * 864e5);
        h = "<b>" + dt.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" }) + "</b><span>a reminder at 10 AM to book again</span>";
      }
      out.innerHTML = h;
    }
    card.addEventListener("input", calc); calc();
    var b = card.querySelector("[data-ics]");
    if (b) b.addEventListener("click", function () { ics(card.getAttribute("data-name") || "us", card.getAttribute("data-tel") || "", val(card, "weeks")); b.textContent = "Added: check your downloads"; });
  });
  /* measurements sent from the tool land in the quote form */
  try {
    var q = new URLSearchParams(location.search).get("details"), ta = q && d.querySelector('textarea[name="details"]');
    if (ta && !ta.value) ta.value = q.slice(0, 300);
  } catch (e) { /* old browsers */ }

  /* ---------- 3D */
  var stages = $$("[data-x3d]");
  if (!stages.length) return;
  var gl = (function () { try { var c = d.createElement("canvas"); return !!(c.getContext("webgl2") || c.getContext("webgl")); } catch (e) { return false; } })();
  if (!gl) return;
  var CDN = ["https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js", "https://cdn.jsdelivr.net/npm/three@0.128.0/build/three.min.js"];
  var loading = null;
  function three() {
    if (window.THREE) return Promise.resolve(window.THREE);
    if (loading) return loading;
    loading = new Promise(function (ok, no) {
      var i = 0;
      (function next() {
        if (i >= CDN.length) return no(new Error("no three"));
        var s = d.createElement("script"); s.src = CDN[i++]; s.async = true; s.crossOrigin = "anonymous";
        s.onload = function () { window.THREE ? ok(window.THREE) : next(); }; s.onerror = next; d.head.appendChild(s);
      })();
    });
    return loading;
  }
  var near = new IntersectionObserver(function (es) {
    es.forEach(function (e) { if (e.isIntersecting) { near.unobserve(e.target); three().then(function (T) { scene(T, e.target); }).catch(function () {}); } });
  }, { rootMargin: "300px" });
  stages.forEach(function (s) { near.observe(s); });

  function scene(T, el) {
    var c1 = new T.Color(el.getAttribute("data-c1") || "#c0392b"), c2 = new T.Color(el.getAttribute("data-c2") || "#f2c46d");
    var R; try { R = new T.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "low-power" }); } catch (e) { return; }
    R.setPixelRatio(Math.min(devicePixelRatio || 1, 2)); R.outputEncoding = T.sRGBEncoding; R.toneMapping = T.ACESFilmicToneMapping; R.toneMappingExposure = 1.05;
    R.domElement.className = "x3d__cv"; el.appendChild(R.domElement); el.classList.add("is-live");
    var S = new T.Scene(), cam = new T.PerspectiveCamera(32, 1, .1, 100); cam.position.set(0, 1.7, 7.2); cam.lookAt(0, .35, 0);
    S.add(new T.HemisphereLight(0xffffff, c1.clone().lerp(new T.Color(0x222222), .5), .85));
    var key = new T.DirectionalLight(0xffffff, 1.25); key.position.set(3.5, 6, 4.5); S.add(key);
    var rim = new T.DirectionalLight(c2.getHex(), .9); rim.position.set(-4, 2.5, -3.5); S.add(rim);
    var fill = new T.PointLight(c1.getHex(), .5, 20); fill.position.set(-2, -1, 4); S.add(fill);
    /* soft contact shadow */
    var cv = d.createElement("canvas"); cv.width = cv.height = 128; var g = cv.getContext("2d"), gr = g.createRadialGradient(64, 64, 4, 64, 64, 62);
    gr.addColorStop(0, "rgba(0,0,0,.42)"); gr.addColorStop(1, "rgba(0,0,0,0)"); g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
    var sh = new T.Mesh(new T.PlaneGeometry(3.6, 3.6), new T.MeshBasicMaterial({ map: new T.CanvasTexture(cv), transparent: true, opacity: .75, depthWrite: false }));
    sh.rotation.x = -Math.PI / 2; sh.position.y = -1.32; S.add(sh);
    var M = build(T, el.getAttribute("data-x3d"), c1, c2);
    var box = new T.Box3().setFromObject(M), size = box.getSize(new T.Vector3()), mid = box.getCenter(new T.Vector3());
    var k = 2.7 / Math.max(size.x, size.y, size.z); M.scale.setScalar(k); M.position.sub(mid.multiplyScalar(k)); M.position.y += .1;
    var pivot = new T.Group(); pivot.add(M); S.add(pivot);
    function fit() { var w = el.clientWidth, h = el.clientHeight || w; R.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix(); draw(); }
    var ry = .6, rx = .12, vy = still ? 0 : .0045, drag = null, on = true, t0 = performance.now(), raf = 0;
    function draw() { pivot.rotation.set(rx, ry, 0); R.render(S, cam); }
    function tick(t) {
      raf = 0; if (!on) return;
      if (!drag) { ry += vy; vy += ((still ? 0 : .0045) - vy) * .02; rx += (.12 - rx) * .04; }
      pivot.position.y = still ? 0 : Math.sin((t - t0) / 1100) * .07;
      draw(); if (!still || drag) raf = requestAnimationFrame(tick);
    }
    el.addEventListener("pointerdown", function (e) { drag = { x: e.clientX, y: e.clientY }; el.setPointerCapture(e.pointerId); el.classList.add("is-drag"); if (!raf) raf = requestAnimationFrame(tick); });
    el.addEventListener("pointermove", function (e) {
      if (!drag) return; var dx = e.clientX - drag.x, dy = e.clientY - drag.y; drag = { x: e.clientX, y: e.clientY };
      ry += dx * .01; vy = dx * .0018; rx = Math.max(-.5, Math.min(.7, rx + dy * .006)); if (still) draw();
    });
    var up = function () { drag = null; el.classList.remove("is-drag"); };
    el.addEventListener("pointerup", up); el.addEventListener("pointercancel", up);
    new IntersectionObserver(function (es) { on = es[0].isIntersecting; if (on && !raf) raf = requestAnimationFrame(tick); }).observe(el);
    if ("ResizeObserver" in window) new ResizeObserver(fit).observe(el); else addEventListener("resize", fit);
    fit(); raf = requestAnimationFrame(tick);
  }

  /* ---------- the models: built from simple shapes, coloured from the brand */
  function build(T, kind, c1, c2) {
    var G = new T.Group();
    function lin(c) { return (c && c.isColor ? c.clone() : new T.Color(c)).convertSRGBToLinear(); }
    function mat(c, o) { o = o || {}; var m = new T.MeshStandardMaterial({ color: lin(c), roughness: o.r == null ? .42 : o.r, metalness: o.m || 0 }); if (o.e) { m.emissive = lin(o.e); m.emissiveIntensity = o.ei || .6; } if (o.t) { m.transparent = true; m.opacity = o.t; } return m; }
    function add(geo, m, x, y, z, rx, ry, rz) { var o = new T.Mesh(geo, m); o.position.set(x || 0, y || 0, z || 0); o.rotation.set(rx || 0, ry || 0, rz || 0); G.add(o); return o; }
    function cyl(rt, rb, h, s) { return new T.CylinderGeometry(rt, rb, h, s || 48); }
    function box(w, h, dd) { return new T.BoxGeometry(w, h, dd); }
    function sph(r, sx, sy, sz) { var g = new T.SphereGeometry(r, 40, 28); if (sx) g.scale(sx, sy, sz); return g; }
    function lathe(pts, s) { return new T.LatheGeometry(pts.map(function (p) { return new T.Vector2(p[0], p[1]); }), s || 56); }
    function shape(pts, depth, bevel) {
      var sh = new T.Shape(); sh.moveTo(pts[0][0], pts[0][1]); for (var i = 1; i < pts.length; i++) sh.lineTo(pts[i][0], pts[i][1]);
      var g = new T.ExtrudeGeometry(sh, { depth: depth || .4, bevelEnabled: true, bevelThickness: bevel || .08, bevelSize: bevel || .08, bevelSegments: 4 }); g.center(); return g;
    }
    var A = mat(c1), B = mat(c2), W = mat(0xf7f4ee, { r: .35 }), K = mat(0x2a2a2e, { r: .5 }), CH = mat(0xdfe3e8, { r: .18, m: .95 }), GL = mat(0xd9eef7, { r: .05, t: .35 });
    var GOLD = mat(0xd9a441, { r: .25, m: .9 }), WOOD = mat(0x9a6a3c, { r: .7 }), GREEN = mat(0x3f8f4e, { r: .6 });
    var ang = function (i, n) { return i / n * Math.PI * 2; };
    switch (kind) {
      case "pizza":
        add(cyl(1.6, 1.6, .12), mat(0xe9b86b, { r: .8 })); add(cyl(1.42, 1.42, .05), mat(0xc0392b, { r: .55 }), 0, .08);
        add(cyl(1.38, 1.38, .03), mat(0xf6d77a, { r: .5 }), 0, .11); add(new T.TorusGeometry(1.5, .13, 18, 64), mat(0xd9a05b, { r: .8 }), 0, .07, 0, Math.PI / 2);
        for (var i = 0; i < 9; i++) { var r = i ? .85 : 0, a = ang(i, 8); add(cyl(.2, .2, .05, 28), mat(0x9e2a2b, { r: .45 }), Math.cos(a) * r, .15, Math.sin(a) * r); }
        for (i = 0; i < 6; i++) add(sph(.09, 1.6, .5, 1), GREEN, Math.cos(ang(i, 6) + .4) * .5, .15, Math.sin(ang(i, 6) + .4) * .5);
        G.rotation.x = .5;
        break;
      case "cup":
        add(cyl(1.15, 1, .1), W, 0, -.7); add(lathe([[0, -.6], [.62, -.6], [.78, .55], [.72, .55], [.58, -.52], [0, -.52]]), A);
        add(cyl(.72, .72, .02), mat(0x5b3a24, { r: .3 }), 0, .45); add(new T.TorusGeometry(.32, .08, 16, 40, Math.PI * 1.2), A, .82, .02, 0, 0, 0, -Math.PI * .6);
        for (i = 0; i < 3; i++) add(sph(.12 + i * .02), mat(0xffffff, { t: .35 }), (i - 1) * .18, .9 + i * .28, 0);
        break;
      case "cake":
        add(cyl(1.3, 1.3, .7), A, 0, -.5); add(cyl(.9, .9, .6), B, 0, .15); add(cyl(1.5, 1.5, .08), W, 0, -.88);
        add(new T.TorusGeometry(1.3, .08, 12, 64), W, 0, -.15, 0, Math.PI / 2); add(new T.TorusGeometry(.9, .07, 12, 64), W, 0, .45, 0, Math.PI / 2);
        add(cyl(.05, .05, .4), W, 0, .65); add(sph(.08, 1, 1.6, 1), mat(0xffb347, { e: 0xff9a2e, ei: 1 }), 0, .92);
        for (i = 0; i < 10; i++) add(sph(.07), mat(0xd23c4a), Math.cos(ang(i, 10)) * .7, .47, Math.sin(ang(i, 10)) * .7);
        break;
      case "cone":
        add(new T.ConeGeometry(.6, 1.7, 40), mat(0xd9a05b, { r: .8 }), 0, -.75, 0, Math.PI); add(sph(.66), A, 0, .25); add(sph(.6), B, .05, .9);
        add(sph(.14), mat(0xb3122e, { r: .2 }), .05, 1.55); add(cyl(.01, .01, .3), GREEN, .1, 1.72, 0, 0, 0, -.4);
        break;
      case "glass":
        add(lathe([[0, -1], [.5, -1], [.62, .9], [.58, .9], [.46, -.94], [0, -.94]]), GL); add(cyl(.56, .47, 1.55), mat(0xd98a1c, { r: .2, t: .9 }), 0, -.15);
        add(cyl(.62, .6, .28), W, 0, .76); add(sph(.6, 1, .35, 1), W, 0, .9);
        break;
      case "pole":
        var cv = d.createElement("canvas"); cv.width = 256; cv.height = 256; var g = cv.getContext("2d"); g.fillStyle = "#fff"; g.fillRect(0, 0, 256, 256);
        for (i = -4; i < 8; i++) { g.fillStyle = i % 2 ? "#" + c1.getHexString() : "#" + c2.getHexString(); g.beginPath(); g.moveTo(i * 64, 0); g.lineTo(i * 64 + 32, 0); g.lineTo(i * 64 + 288, 256); g.lineTo(i * 64 + 256, 256); g.fill(); }
        var tx = new T.CanvasTexture(cv); tx.wrapS = tx.wrapT = T.RepeatWrapping; tx.repeat.set(1, 2);
        add(cyl(.42, .42, 2.2), new T.MeshStandardMaterial({ map: tx, roughness: .3 })); add(cyl(.5, .5, .5, 48), GL, 0, 0);
        add(cyl(.55, .55, .2), CH, 0, 1.2); add(sph(.5, 1, .6, 1), CH, 0, 1.4); add(cyl(.55, .55, .2), CH, 0, -1.2); add(sph(.22), CH, 0, -1.42);
        break;
      case "bottle":
        add(lathe([[0, -.9], [.6, -.9], [.66, -.6], [.66, .3], [.4, .55], [0, .55]]), mat(c1, { r: .08 })); add(cyl(.22, .26, 1, 32), K, 0, 1.05);
        break;
      case "stones":
        [[1.25, .42, 0], [1, .38, .55], [.78, .33, 1.02], [.55, .3, 1.4]].forEach(function (s, j) { add(sph(s[0], 1, s[1], .9), mat(j % 2 ? 0x8d8a84 : 0x6c6a66, { r: .85 }), j * .05, s[2] - .9, 0, 0, j); });
        add(sph(.35, 1.6, .12, .7), GREEN, .5, .95, .1, 0, .4, .3);
        break;
      case "tooth":
        var tg = lathe([[0, 1.02], [.42, 1], [.72, .86], [.86, .55], [.82, .2], [.66, -.15], [.52, -.6], [.4, -1.05], [.24, -1.38], [0, -1.45]], 64); tg.scale(1.15, 1, .95);
        add(tg, mat(0xfbfaf6, { r: .22 })); add(sph(.42, 1, .32, .9), mat(0xfbfaf6, { r: .22 }), -.34, .9, 0); add(sph(.42, 1, .32, .9), mat(0xfbfaf6, { r: .22 }), .34, .9, 0);
        add(cyl(1.1, 1.1, .05), mat(c1, { r: .35 }), 0, -1.5);
        break;
      case "heart":
        var hp = []; for (i = 0; i < 64; i++) { var t = ang(i, 64); hp.push([16 * Math.pow(Math.sin(t), 3) / 16, (13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)) / 16]); }
        add(shape(hp, .45, .12), mat(c1, { r: .25 })); add(box(.2, .7, .2), W, 0, .05, .4); add(box(.7, .2, .2), W, 0, .05, .4);
        break;
      case "paw":
        add(sph(.8, 1.15, .45, 1), A, 0, -.3); [[-.85, .45], [-.32, .85], [.32, .85], [.85, .45]].forEach(function (p) { add(sph(.32, 1, .5, 1.2), A, p[0], p[1], 0); });
        G.rotation.x = .9;
        break;
      case "dumbbell":
        add(cyl(.09, .09, 2.8), CH, 0, 0, 0, 0, 0, Math.PI / 2);
        [-1, 1].forEach(function (s) { add(cyl(.7, .7, .28), K, s * .85, 0, 0, 0, 0, Math.PI / 2); add(cyl(.55, .55, .22), A, s * 1.12, 0, 0, 0, 0, Math.PI / 2); add(cyl(.16, .16, .1), CH, s * 1.28, 0, 0, 0, 0, Math.PI / 2); });
        break;
      case "solar":
      case "house":
        add(box(2, 1.3, 1.6), W, 0, -.45); var roof = add(new T.ConeGeometry(1.65, .95, 4), A, 0, .68, 0, 0, Math.PI / 4); roof.scale.set(1.05, 1, .85);
        add(box(.45, .75, .05), mat(c2), 0, -.72, .82); add(box(.4, .38, .05), mat(0xfff1b8, { e: 0xffd56b, ei: .5 }), -.6, -.3, .82); add(box(.4, .38, .05), mat(0xfff1b8, { e: 0xffd56b, ei: .5 }), .6, -.3, .82);
        add(box(.25, .55, .25), mat(0x8a5a44), .55, .85, -.2);
        if (kind === "solar") for (i = 0; i < 3; i++) add(box(.5, .04, .7), mat(0x1d3557, { r: .2, m: .5 }), -.55 + i * .55, .62, .4, .72, 0, 0);
        add(box(3, .08, 2.4), GREEN, 0, -1.14);
        break;
      case "drop":
        add(lathe([[0, 1.3], [.18, .9], [.55, .2], [.72, -.3], [.62, -.75], [.35, -1], [0, -1.06]]), mat(c1, { r: .05, t: .85 }));
        add(sph(.16, 1, 1.6, 1), mat(0xffffff, { e: 0xffffff, ei: .6, t: .8 }), -.3, -.15, .55);
        break;
      case "fan":
        add(cyl(.28, .28, .3), CH, 0, 0, 0, Math.PI / 2); add(new T.TorusGeometry(1.35, .07, 14, 64), K);
        for (i = 0; i < 5; i++) { var bl = add(sph(.6, .45, 1, .08), A, 0, 0, 0, 0, 0, ang(i, 5)); bl.geometry.translate(0, .62, 0); bl.rotation.y = .35; }
        break;
      case "bolt":
        add(shape([[.15, 1.2], [-.6, -.1], [-.05, -.1], [-.3, -1.2], [.6, .2], [.05, .2], [.35, 1.2]], .35, .06), mat(c2, { r: .25, e: c2.getHex(), ei: .25 }));
        break;
      case "key":
        add(new T.TorusGeometry(.5, .17, 18, 48), GOLD, -.9, 0); add(box(1.9, .22, .14), GOLD, .5, 0); add(box(.18, .34, .14), GOLD, 1.0, -.25); add(box(.18, .24, .14), GOLD, 1.3, -.2);
        break;
      case "tree":
        add(cyl(.15, .22, 1.1, 16), WOOD, 0, -.7); add(new T.IcosahedronGeometry(.75, 1), GREEN, 0, .2); add(new T.IcosahedronGeometry(.55, 1), mat(0x4fa35d, { r: .6 }), .45, .55, .2);
        add(new T.IcosahedronGeometry(.5, 1), mat(0x37804a, { r: .6 }), -.45, .5, -.15); add(cyl(1.2, 1.2, .1), mat(0x6b4f3a, { r: .9 }), 0, -1.25);
        break;
      case "flower":
        add(cyl(.05, .05, 1.8, 12), GREEN, 0, -.8); add(sph(.32), mat(0xf2c14e, { r: .6 }), 0, .2, .05);
        for (i = 0; i < 8; i++) { var pt = add(sph(.4, .55, 1, .18), i % 2 ? A : B, 0, .2, 0, 0, 0, ang(i, 8)); pt.geometry.translate(0, .45, 0); }
        add(sph(.3, 1.6, .15, .6), GREEN, .3, -.8, 0, 0, 0, .5);
        break;
      case "car":
        add(box(2.8, .5, 1.3), A, 0, -.2); add(box(1.5, .45, 1.15), A, -.1, .25); add(box(1.35, .38, 1.17), GL, -.1, .26);
        [[-.9, .66], [.9, .66], [-.9, -.66], [.9, -.66]].forEach(function (p) { add(cyl(.32, .32, .22, 32), K, p[0], -.45, p[1], Math.PI / 2); add(cyl(.17, .17, .24, 24), CH, p[0], -.45, p[1], Math.PI / 2); });
        add(box(.06, .12, .3), mat(0xfff6c8, { e: 0xfff1a0, ei: 1 }), 1.41, -.15, .4); add(box(.06, .12, .3), mat(0xfff6c8, { e: 0xfff1a0, ei: 1 }), 1.41, -.15, -.4);
        add(box(.06, .1, .3), mat(0xc81d25, { e: 0xc81d25, ei: .6 }), -1.41, -.12, .4); add(box(.06, .1, .3), mat(0xc81d25, { e: 0xc81d25, ei: .6 }), -1.41, -.12, -.4);
        break;
      case "boxes":
        [[0, -.65, 0, 1.4], [.1, .4, .05, 1.1], [-.05, 1.2, 0, .7]].forEach(function (b, j) { add(box(b[3], b[3] * .72, b[3]), mat(0xc49a6c, { r: .85 }), b[0], b[1], b[2], 0, j * .3); add(box(b[3] * .18, b[3] * .73, b[3] * 1.01), A, b[0], b[1], b[2], 0, j * .3); });
        break;
      case "camera":
        add(box(2, 1.25, .8), K); add(box(.6, .3, .6), K, -.55, .75); add(cyl(.5, .5, .5), CH, 0, 0, .55, Math.PI / 2); add(cyl(.38, .38, .54), mat(0x111111, { r: .1 }), 0, 0, .58, Math.PI / 2);
        add(sph(.18), mat(0x334466, { r: .05 }), 0, 0, .82); add(box(.3, .18, .1), A, .7, .45, .42);
        break;
      case "scales":
        add(cyl(.07, .07, 2), GOLD, 0, 0); add(cyl(.6, .7, .12), GOLD, 0, -1); add(box(2.4, .07, .07), GOLD, 0, .9);
        [-1.1, 1.1].forEach(function (x) { add(cyl(.45, .3, .08, 40), GOLD, x, -.05); add(cyl(.006, .006, .95), GOLD, x, .43); });
        add(sph(.12), GOLD, 0, 1.05);
        break;
      case "coins":
        for (i = 0; i < 7; i++) add(cyl(.62, .62, .13), GOLD, Math.sin(i) * .04, -1 + i * .14, Math.cos(i) * .04);
        for (i = 0; i < 3; i++) add(box(.32, .5 + i * .5, .32), i === 2 ? A : B, 1.05 + i * .42, -1.07 + (.5 + i * .5) / 2, -.2);
        break;
      case "books":
        [[A, 0], [B, .25], [W, -.15], [K, .1]].forEach(function (b, j) { add(box(1.9 - j * .1, .32, 1.35), b[0], 0, -.8 + j * .34, 0, 0, b[1]); add(box(1.86 - j * .1, .26, 1.37), W, .04, -.8 + j * .34, 0, 0, b[1]); });
        add(sph(.3), mat(0xc0392b, { r: .3 }), .2, .2, 0);
        break;
      case "blocks":
        [[A, -.6, -.7, 0], [B, .6, -.7, 0], [mat(0x3f8fd1), 0, .35, 0, .3], [mat(0xf2c14e), 0, 1.3, 0, .1]].forEach(function (b) { var o = add(new T.BoxGeometry(1, 1, 1), b[0], b[1], b[2], b[3]); o.rotation.y = b[4] || 0; });
        break;
      case "chapel":
        add(box(1.5, 1.2, 2), W, 0, -.6); var cr = add(new T.ConeGeometry(1.2, .7, 4), A, 0, .35, 0, 0, Math.PI / 4); cr.scale.set(.9, 1, 1.25);
        add(box(.6, 1.4, .6), W, 0, .3, 1.1); add(new T.ConeGeometry(.45, .9, 4), A, 0, 1.45, 1.1, 0, Math.PI / 4); add(box(.06, .4, .06), GOLD, 0, 2.05, 1.1); add(box(.25, .06, .06), GOLD, 0, 2.1, 1.1);
        add(box(.4, .6, .05), mat(c2), 0, -.9, 1.41);
        break;
      case "star":
        var sp = []; for (i = 0; i < 10; i++) { var rr = i % 2 ? .5 : 1.2, aa = ang(i, 10) + Math.PI / 2; sp.push([Math.cos(aa) * rr, Math.sin(aa) * rr]); }
        add(shape(sp, .35, .1), GOLD);
        break;
      case "tower":
        add(box(1.3, 2.6, 1.3), mat(c1, { r: .3 })); for (i = 0; i < 6; i++) for (var j = 0; j < 3; j++) add(box(.25, .22, .02), mat(0xfff1b8, { e: 0xffd56b, ei: (i + j) % 3 ? .7 : .1 }), -.38 + j * .38, -1 + i * .4, .66);
        add(box(1.5, .12, 1.5), W, 0, 1.36);
        break;
      case "bag":
      default:
        add(box(1.6, 1.8, .8), A, 0, -.2); add(new T.TorusGeometry(.42, .06, 12, 40, Math.PI), K, 0, .7, 0); add(box(1.62, .3, .82), B, 0, .5);
    }
    return G;
  }
})();
