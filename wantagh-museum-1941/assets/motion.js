/* Sodaro motion kit: reveals, split headlines, sticky header, scroll progress, parallax, magnetic buttons, tilt + cursor light,
   counters. One rAF loop that sleeps when nothing moves; passive listeners; transform/opacity only; layout is read on
   resize / pointerenter, never per frame; everything is off under prefers-reduced-motion. */
(function () {
  "use strict";
  var d = document, root = d.documentElement;
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
  var fine = window.matchMedia("(hover: hover) and (pointer: fine)");
  var still = reduce.matches;

  /* ---- one shared animation loop: jobs return true while they still need frames */
  var jobs = [], raf = 0;
  function loop() {
    raf = 0;
    var keep = [];
    for (var i = 0; i < jobs.length; i++) { if (jobs[i]()) keep.push(jobs[i]); }
    jobs = keep;
    if (jobs.length) raf = requestAnimationFrame(loop);
  }
  function run(job) { if (jobs.indexOf(job) < 0) jobs.push(job); if (!raf) raf = requestAnimationFrame(loop); }

  /* ---- reveals (IntersectionObserver, staggered by --i) */
  var revealEls = d.querySelectorAll("[data-reveal], .split");
  if (still || !("IntersectionObserver" in window)) {
    revealEls.forEach(function (el) { el.classList.add("is-in"); });
  } else {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("is-in"); io.unobserve(e.target); } });
    }, { rootMargin: "0px 0px -6% 0px", threshold: 0.08 });
    revealEls.forEach(function (el) { io.observe(el); });
  }

  /* ---- signature hero motion runs only while the hero is on screen (no work for a layer nobody sees) */
  if ("IntersectionObserver" in window) {
    d.querySelectorAll(".sig").forEach(function (el) {
      new IntersectionObserver(function (es) { el.classList.toggle("is-off", !es[0].isIntersecting); }).observe(el);
    });
  }

  /* ---- header condenses once the page moves (sentinel, no scroll reads) */
  var hdr = d.querySelector(".hdr"), sentinel = d.querySelector(".hdr-sentinel");
  if (hdr && sentinel && "IntersectionObserver" in window) {
    new IntersectionObserver(function (es) { hdr.classList.toggle("is-condensed", !es[0].isIntersecting); }).observe(sentinel);
  }

  /* ---- scroll progress + hero parallax: positions cached on resize, the frame only writes transforms */
  var bar = d.querySelector(".progress span");
  var par = [].slice.call(d.querySelectorAll("[data-parallax]"));
  var vh = innerHeight, maxY = 1, items = [], sy = scrollY, cssScroll = window.CSS && CSS.supports && CSS.supports("animation-timeline: scroll()");
  function measure() {
    vh = innerHeight;
    maxY = Math.max(1, root.scrollHeight - vh);
    items = par.map(function (el) {
      var r = (el.parentElement || el).getBoundingClientRect();
      return { el: el, top: r.top + scrollY, h: r.height, k: parseFloat(el.getAttribute("data-parallax")) || 0.12 };
    });
  }
  var scrollJob = function () {
    if (bar) bar.style.transform = "scaleX(" + Math.min(1, sy / maxY).toFixed(4) + ")";
    if (!still) {
      for (var i = 0; i < items.length; i++) {
        var it = items[i];
        if (sy + vh < it.top - 200 || sy > it.top + it.h + 200) continue;
        var off = (sy - it.top) * it.k;
        it.el.style.transform = "translate3d(0," + off.toFixed(1) + "px,0) scale(1.1)";
      }
    }
    return false;
  };
  if (bar || par.length) {
    measure();
    addEventListener("resize", function () { measure(); run(scrollJob); }, { passive: true });
    addEventListener("load", function () { measure(); run(scrollJob); });
    addEventListener("scroll", function () { sy = scrollY; run(scrollJob); }, { passive: true });
    run(scrollJob);
  }

  /* ---- magnetic buttons + tilt cards with a cursor-following light (fine pointers only) */
  if (fine.matches && !still) {
    d.querySelectorAll("[data-magnetic]").forEach(function (el) {
      var rect = null, tx = 0, ty = 0, x = 0, y = 0;
      var job = function () {
        x += (tx - x) * 0.18; y += (ty - y) * 0.18;
        el.style.transform = "translate3d(" + x.toFixed(2) + "px," + y.toFixed(2) + "px,0)";
        if (Math.abs(tx - x) < 0.05 && Math.abs(ty - y) < 0.05) { if (!tx && !ty) el.style.transform = ""; return false; }
        return true;
      };
      el.addEventListener("pointerenter", function () { rect = el.getBoundingClientRect(); }, { passive: true });
      el.addEventListener("pointermove", function (e) {
        if (!rect) return;
        tx = (e.clientX - (rect.left + rect.width / 2)) * 0.22;
        ty = (e.clientY - (rect.top + rect.height / 2)) * 0.32;
        run(job);
      }, { passive: true });
      el.addEventListener("pointerleave", function () { tx = 0; ty = 0; rect = null; run(job); }, { passive: true });
    });
    d.querySelectorAll("[data-tilt]").forEach(function (el) {
      var rect = null, rx = 0, ry = 0, cx = 0, cy = 0;
      var job = function () {
        cx += (rx - cx) * 0.14; cy += (ry - cy) * 0.14;
        el.style.transform = "perspective(900px) rotateX(" + cy.toFixed(2) + "deg) rotateY(" + cx.toFixed(2) + "deg)";
        if (Math.abs(rx - cx) < 0.02 && Math.abs(ry - cy) < 0.02) { if (!rx && !ry) el.style.transform = ""; return false; }
        return true;
      };
      el.addEventListener("pointerenter", function () { rect = el.getBoundingClientRect(); }, { passive: true });
      el.addEventListener("pointermove", function (e) {
        if (!rect) return;
        var px = (e.clientX - rect.left) / rect.width, py = (e.clientY - rect.top) / rect.height;
        el.style.setProperty("--mx", (px * 100).toFixed(1) + "%");
        el.style.setProperty("--my", (py * 100).toFixed(1) + "%");
        rx = (px - 0.5) * 5; ry = (0.5 - py) * 5;
        run(job);
      }, { passive: true });
      el.addEventListener("pointerleave", function () { rx = 0; ry = 0; rect = null; run(job); }, { passive: true });
    });
  }

  /* ---- counters: only ever placed on real numbers from the facts */
  var counters = d.querySelectorAll("[data-count]");
  if (counters.length && "IntersectionObserver" in window && !still) {
    var cio = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (!e.isIntersecting) return;
        cio.unobserve(e.target);
        var el = e.target, to = parseFloat(el.getAttribute("data-count")), dec = (el.getAttribute("data-count").split(".")[1] || "").length;
        var t0 = performance.now(), dur = 1400, final = el.textContent;
        run(function () {
          var p = Math.min(1, (performance.now() - t0) / dur), k = 1 - Math.pow(2, -10 * p);
          el.textContent = p >= 1 ? final : (to * k).toFixed(dec);
          return p < 1;
        });
      });
    }, { threshold: 0.6 });
    counters.forEach(function (el) { cio.observe(el); });
  }

  if (cssScroll) root.classList.add("has-sda");
  reduce.addEventListener && reduce.addEventListener("change", function (e) { still = e.matches; });
})();
