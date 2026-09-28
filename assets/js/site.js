// zack.zip site behaviour. Everything here is progressive enhancement:
// pages read fine with JS disabled.

const pad = (n, w = 2) => String(n).padStart(w, "0");

// -- display mode (dark / light) ----------------------------------------------

(function modeSwitch() {
  const root = document.documentElement;
  const btns = document.querySelectorAll(".mode-switch__btn");
  const mq = window.matchMedia("(prefers-color-scheme: light)");
  const current = () => root.getAttribute("data-theme") || (mq.matches ? "light" : "dark");
  const reflect = () => {
    const mode = current();
    btns.forEach((b) => b.setAttribute("aria-pressed", b.dataset.mode === mode ? "true" : "false"));
  };
  btns.forEach((btn) =>
    btn.addEventListener("click", () => {
      root.setAttribute("data-theme", btn.dataset.mode);
      try { localStorage.setItem("zackzip-theme", btn.dataset.mode); } catch (e) {}
      reflect();
    })
  );
  mq.addEventListener("change", reflect);
  reflect();
})();

// -- mobile nav ------------------------------------------------------------------

(function navToggle() {
  const nav = document.querySelector(".nav");
  const toggle = document.querySelector(".nav-toggle");
  if (!nav || !toggle) return;
  const setOpen = (open) => {
    nav.setAttribute("data-open", open ? "true" : "false");
    toggle.setAttribute("aria-expanded", open ? "true" : "false");
  };
  toggle.addEventListener("click", () => setOpen(nav.getAttribute("data-open") !== "true"));
  nav.querySelectorAll("a").forEach((a) => a.addEventListener("click", () => setOpen(false)));
})();

// -- figures & galleries --------------------------------------------------------
// A paragraph containing only images becomes a captioned figure (one image)
// or a justified gallery row (several). Captions come from alt text.

(function figures() {
  const prose = document.querySelector("[data-prose]");
  if (!prose) return;
  let fig = 0;

  const onlyImages = (p) =>
    p.querySelector("img") &&
    Array.from(p.childNodes).every(
      (n) => (n.nodeType === 3 && !n.textContent.trim()) || n.nodeName === "IMG" || n.nodeName === "BR"
    );

  const makeFigure = (img) => {
    fig++;
    const figure = document.createElement("figure");
    figure.className = "figure";
    const frame = document.createElement("div");
    frame.className = "figure__frame";
    frame.appendChild(img);
    figure.appendChild(frame);
    const text = img.getAttribute("title") || img.getAttribute("alt");
    if (text) {
      const cap = document.createElement("figcaption");
      const b = document.createElement("b");
      b.textContent = `FIG. ${pad(fig)}`;
      const span = document.createElement("span");
      span.textContent = text;
      cap.append(b, span);
      figure.appendChild(cap);
    }
    img.dataset.fig = pad(fig);
    return figure;
  };

  prose.querySelectorAll("p").forEach((p) => {
    if (!onlyImages(p)) return;
    const imgs = Array.from(p.querySelectorAll("img"));
    if (imgs.length === 1) {
      p.replaceWith(makeFigure(imgs[0]));
      return;
    }
    const gallery = document.createElement("div");
    gallery.className = "gallery";
    imgs.forEach((img) => {
      const ratio = parseFloat(img.dataset.ratio) || (img.naturalWidth / img.naturalHeight) || 1;
      const f = makeFigure(img);
      f.style.flex = `${ratio} 1 ${Math.round(ratio * 220)}px`;
      f.querySelector(".figure__frame").style.aspectRatio = String(ratio);
      gallery.appendChild(f);
    });
    p.replaceWith(gallery);
  });
})();

// -- lightbox -------------------------------------------------------------------

(function lightbox() {
  const imgs = Array.from(document.querySelectorAll("[data-prose] img, .log-cover img"));
  if (!imgs.length || typeof HTMLDialogElement !== "function") return;

  const dlg = document.createElement("dialog");
  dlg.className = "lightbox";
  dlg.setAttribute("aria-label", "Image viewer");
  dlg.innerHTML = `
    <div class="lightbox__bar lightbox__bar--top">
      <span class="lightbox__count"></span>
      <div class="lightbox__nav">
        <button type="button" data-lb="prev" aria-label="Previous image">&lt; PREV</button>
        <button type="button" data-lb="next" aria-label="Next image">NEXT &gt;</button>
        <button type="button" data-lb="close" aria-label="Close" autofocus>CLOSE [ESC]</button>
      </div>
    </div>
    <div class="lightbox__stage"><img alt=""></div>
    <div class="lightbox__bar lightbox__bar--bottom"><span class="lightbox__caption"></span></div>`;
  document.body.appendChild(dlg);
  const view = dlg.querySelector(".lightbox__stage img");
  const count = dlg.querySelector(".lightbox__count");
  const caption = dlg.querySelector(".lightbox__caption");
  let at = 0;

  const show = (n) => {
    at = (n + imgs.length) % imgs.length;
    const img = imgs[at];
    view.src = img.dataset.full || img.currentSrc || img.src;
    view.alt = img.alt || "";
    count.textContent = `FRAME ${pad(at + 1, 3)} / ${pad(imgs.length, 3)}`;
    caption.textContent = img.getAttribute("title") || img.alt || "";
  };

  imgs.forEach((img, n) => {
    img.style.cursor = "zoom-in";
    img.addEventListener("click", (e) => {
      if (img.closest("a")) return; // linked images keep their link
      e.preventDefault();
      show(n);
      dlg.showModal();
    });
  });

  dlg.addEventListener("click", (e) => {
    const action = e.target.closest("[data-lb]")?.dataset.lb;
    if (action === "prev") show(at - 1);
    else if (action === "next") show(at + 1);
    else if (action === "close" || e.target === dlg || e.target.classList.contains("lightbox__stage")) dlg.close();
  });
  dlg.addEventListener("keydown", (e) => {
    if (e.key === "ArrowLeft") show(at - 1);
    if (e.key === "ArrowRight") show(at + 1);
  });
  dlg.addEventListener("close", () => { view.removeAttribute("src"); });
})();

// -- read position: header tape strip, active TOC entry ---------------------------

(function readPosition() {
  const prose = document.querySelector("[data-prose]");
  const strip = document.querySelector(".tape-progress");
  const toc = document.querySelector(".rail nav");
  if (!prose || (!strip && !toc)) return;

  const links = toc ? Array.from(toc.querySelectorAll('a[href^="#"]')) : [];
  const targets = links
    .map((a) => document.getElementById(decodeURIComponent(a.hash.slice(1))))
    .filter(Boolean);

  let ticking = false;
  function update() {
    ticking = false;
    const rect = prose.getBoundingClientRect();
    const total = rect.height - window.innerHeight * 0.6;
    const read = Math.min(1, Math.max(0, -rect.top / Math.max(total, 1)));
    if (strip) strip.style.setProperty("--read", read.toFixed(4));

    if (targets.length) {
      const line = parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) || 80;
      let active = targets[0];
      for (const t of targets) {
        if (t.getBoundingClientRect().top - line - 10 <= 0) active = t;
        else break;
      }
      links.forEach((a) => a.classList.toggle("is-active", a.hash === "#" + active.id));
    }
  }
  const onScroll = () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } };
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll);
  update();

  // On narrow screens the rail is a collapsible box above the prose.
  const details = document.querySelector(".log-rail details");
  const narrow = window.matchMedia("(max-width: 960px)");
  const syncRail = () => { if (details) details.open = !narrow.matches; };
  narrow.addEventListener("change", syncRail);
  syncRail();
})();

// -- code blocks: language label + copy -------------------------------------------

(function codeBlocks() {
  document.querySelectorAll(".highlight").forEach((block) => {
    const code = block.querySelector("code[data-lang]") || block.querySelector("td:last-child code") || block.querySelector("code");
    if (!code) return;
    const lang = code.dataset.lang;
    if (lang) {
      const label = document.createElement("span");
      label.className = "code-label";
      label.textContent = lang;
      block.prepend(label);
    }
    if (!navigator.clipboard) return;
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "code-copy";
    btn.textContent = "COPY";
    btn.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(code.innerText.replace(/\n$/, ""));
        btn.textContent = "COPIED";
      } catch (e) {
        btn.textContent = "FAILED";
      }
      setTimeout(() => { btn.textContent = "COPY"; }, 1500);
    });
    block.appendChild(btn);
  });
})();

// -- search ---------------------------------------------------------------------------

(function search() {
  const root = document.querySelector("[data-search]");
  if (!root || !root.dataset.index) return;
  const input = root.querySelector("input");
  const status = root.querySelector("[data-search-status]");
  const results = root.querySelector("[data-search-results]");
  const browse = root.querySelector("[data-search-hide]");
  let index = null;

  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const reEsc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  function snippet(text, terms) {
    const lower = text.toLowerCase();
    let at = -1;
    for (const t of terms) { at = lower.indexOf(t); if (at >= 0) break; }
    const start = Math.max(0, at - 80);
    let s = (start ? "…" : "") + text.slice(start, start + 220).trim() + "…";
    s = esc(s);
    const re = new RegExp(`(${terms.map((t) => reEsc(esc(t))).join("|")})`, "gi");
    return s.replace(re, "<mark>$1</mark>");
  }

  function card(p, terms) {
    const media = p.image
      ? `<img src="${esc(p.image)}" alt="" loading="lazy" width="640" height="400">`
      : `<div class="no-signal"><span>NO SIGNAL</span></div>`;
    const chips = p.categories.map((c) => `<li><a class="chip chip--channel" href="${esc(c.url)}">${esc(c.name)}</a></li>`).join("");
    return `<article class="panel entry search-hit">
      <a class="entry__media${p.image ? " reticle" : ""}" href="${esc(p.url)}" tabindex="-1" aria-hidden="true">${media}</a>
      <div class="entry__body">
        <div class="entry__meta"><span class="panel__label">LOG ${esc(p.log)}</span><time>${esc(p.date)}</time><span>APPROX. READING TIME ${p.minutes} MIN</span></div>
        <h3 class="entry__title"><a href="${esc(p.url)}">${esc(p.title)}</a></h3>
        <p class="entry__desc">${snippet(p.content || p.description, terms)}</p>
        ${chips ? `<ul class="chips">${chips}</ul>` : ""}
      </div>
    </article>`;
  }

  function run() {
    const q = input.value.trim().toLowerCase();
    const url = new URL(location.href);
    if (q) url.searchParams.set("q", q); else url.searchParams.delete("q");
    history.replaceState(null, "", url);
    if (browse) browse.hidden = Boolean(q);
    if (!q) { results.innerHTML = ""; status.textContent = ""; return; }
    if (!index) { status.textContent = "SPOOLING INDEX…"; return; }
    const terms = q.split(/\s+/).filter(Boolean);
    const hits = index
      .map((p) => {
        const title = p.title.toLowerCase();
        const meta = (p.tags.join(" ") + " " + p.categories.map((c) => c.name).join(" ")).toLowerCase();
        const body = (p.description + " " + p.content).toLowerCase();
        let score = 0;
        for (const t of terms) {
          const s = (title.includes(t) ? 10 : 0) + (meta.includes(t) ? 5 : 0) + (body.includes(t) ? 1 : 0);
          if (!s) return null;
          score += s;
        }
        return { p, score };
      })
      .filter(Boolean)
      .sort((a, b) => b.score - a.score);
    status.textContent = hits.length
      ? `${pad(hits.length, 3)} ${hits.length === 1 ? "MATCH" : "MATCHES"} FOR "${q.toUpperCase()}"`
      : `NO SIGNAL FOR "${q.toUpperCase()}"`;
    results.innerHTML = hits.map((h) => card(h.p, terms)).join("");
  }

  input.addEventListener("input", run);
  const initial = new URLSearchParams(location.search).get("q");
  if (initial) input.value = initial;
  fetch(root.dataset.index)
    .then((r) => r.json())
    .then((data) => { index = data; run(); })
    .catch(() => { status.textContent = "INDEX READ ERROR"; });
})();

// -- 404: echo the requested path ---------------------------------------------------

(function notFound() {
  const el = document.querySelector("[data-path]");
  if (el) el.textContent = location.pathname;
})();
