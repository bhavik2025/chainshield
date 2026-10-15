// ChainShield front-end: theme + sidebar, micro-interactions, live Socket.IO
// notifications / chat toasts, and a CSRF-aware fetch helper.
(function () {
  const root = document.documentElement;
  const csrf = document.querySelector('meta[name="csrf-token"]')?.content;
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* private mode */ } },
  };

  // ------------------------------------------------------------- helpers
  window.csPost = async function (url, body) {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-CSRFToken": csrf, Accept: "application/json" },
      body: JSON.stringify(body || {}),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
    return data;
  };

  window.csTheme = () => root.getAttribute("data-bs-theme") || "light";
  window.csCss = (name) => getComputedStyle(root).getPropertyValue(name).trim();

  const TOAST_STYLE = {
    danger: ["bi-exclamation-octagon-fill", "var(--risk-high-soft)", "var(--risk-high)"],
    primary: ["bi-chat-dots-fill", "var(--cs-primary-soft)", "var(--cs-primary)"],
    success: ["bi-check-circle-fill", "var(--risk-low-soft)", "var(--risk-low)"],
    dark: ["bi-info-circle-fill", "var(--cs-primary-soft)", "var(--cs-primary)"],
  };
  window.csToast = function (text, variant) {
    const area = document.getElementById("toastArea");
    if (!area || !window.bootstrap) return;
    const [icon, bg, fg] = TOAST_STYLE[variant] || TOAST_STYLE.dark;
    const el = document.createElement("div");
    el.className = "toast border-0";
    el.setAttribute("role", "alert");
    el.innerHTML =
      '<div class="toast-body"><span class="toast-ico"><i class="bi"></i></span>' +
      '<div class="flex-grow-1 msg"></div><button type="button" class="btn-close ms-2" data-bs-dismiss="toast" aria-label="Close"></button></div>' +
      '<div class="toast-bar"></div>';
    const ico = el.querySelector(".toast-ico");
    ico.style.background = bg; ico.style.color = fg;
    ico.querySelector("i").classList.add(icon);
    el.querySelector(".msg").textContent = text;
    area.appendChild(el);
    new bootstrap.Toast(el, { delay: 7000 }).show();
    el.addEventListener("hidden.bs.toast", () => el.remove());
  };

  // Two-step confirm for destructive buttons: first click arms, second submits.
  window.csConfirm = function (form) {
    if (form.dataset.armed) return true;
    const b = form.querySelector("button");
    form.dataset.armed = "1";
    b.dataset.label = b.innerHTML;
    b.innerHTML = '<i class="bi bi-question-circle"></i> Confirm?';
    setTimeout(() => { delete form.dataset.armed; b.innerHTML = b.dataset.label; }, 4000);
    return false;
  };

  // ------------------------------------------------------------- theme
  document.getElementById("themeToggle")?.addEventListener("click", () => {
    const next = csTheme() === "dark" ? "light" : "dark";
    root.setAttribute("data-bs-theme", next);
    store.set("cs-theme", next);
    document.dispatchEvent(new CustomEvent("cs:theme", { detail: next }));
  });

  // ------------------------------------------------------------- sidebar
  const isMobile = () => window.matchMedia("(max-width: 991.98px)").matches;
  document.getElementById("sidebarToggle")?.addEventListener("click", () => {
    if (isMobile()) {
      root.classList.toggle("sidebar-open");
    } else {
      root.classList.toggle("sidebar-collapsed");
      store.set("cs-sidebar", root.classList.contains("sidebar-collapsed") ? "collapsed" : "open");
      setTimeout(() => window.dispatchEvent(new Event("resize")), 300); // let charts/maps re-measure
    }
  });
  document.querySelectorAll("[data-cs-close-sidebar]").forEach((el) =>
    el.addEventListener("click", () => root.classList.remove("sidebar-open")));
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") root.classList.remove("sidebar-open"); });

  // ------------------------------------------------------------- micro-interactions
  document.addEventListener("pointerdown", (e) => {
    const btn = e.target.closest(".btn:not(.btn-link), .icon-btn, .chip-btn");
    if (!btn || btn.disabled) return;
    const r = btn.getBoundingClientRect();
    const size = Math.max(r.width, r.height);
    const s = document.createElement("span");
    s.className = "ripple";
    s.style.width = s.style.height = size + "px";
    s.style.left = e.clientX - r.left - size / 2 + "px";
    s.style.top = e.clientY - r.top - size / 2 + "px";
    btn.appendChild(s);
    setTimeout(() => s.remove(), 650);
  });

  // Loading state on normal form submits (not two-step confirms, not AJAX forms)
  document.addEventListener("submit", (e) => {
    const f = e.target;
    if (e.defaultPrevented || f.dataset.noLoading !== undefined) return;
    const b = f.querySelector('button[type="submit"], button:not([type]), input[type="submit"]');
    if (b && b.tagName === "BUTTON" && !b.querySelector(".spin")) {
      setTimeout(() => {
        if (e.defaultPrevented) return;
        b.style.width = b.offsetWidth + "px";
        b.innerHTML = '<i class="bi bi-arrow-repeat spin"></i>';
        b.disabled = true;
      }, 0);
    }
  });

  // Reveal-on-scroll with stagger, and count-up numbers
  const countUp = (el) => {
    const raw = el.dataset.count;
    const target = parseFloat(raw);
    if (isNaN(target)) return;
    const dec = (raw.split(".")[1] || "").length;
    const prefix = el.dataset.prefix || "", suffix = el.dataset.suffix || "";
    const t0 = performance.now(), dur = 900;
    const step = (t) => {
      const p = Math.min(1, (t - t0) / dur), eased = 1 - Math.pow(1 - p, 3);
      el.textContent = prefix + (target * eased).toLocaleString("en-IN", { minimumFractionDigits: dec, maximumFractionDigits: dec }) + suffix;
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };
  const revealObs = "IntersectionObserver" in window ? new IntersectionObserver((entries) => {
    entries.forEach((en) => {
      if (!en.isIntersecting) return;
      en.target.classList.add("in");
      en.target.querySelectorAll("[data-count]").forEach(countUp);
      if (en.target.matches("[data-count]")) countUp(en.target);
      revealObs.unobserve(en.target);
    });
  }, { threshold: 0.08 }) : null;
  const armReveal = (scope) => {
    (scope || document).querySelectorAll(".reveal:not(.in)").forEach((el, i) => {
      if (!el.style.getPropertyValue("--d")) el.style.setProperty("--d", Math.min(i, 10) * 0.05 + "s");
      revealObs ? revealObs.observe(el) : el.classList.add("in");
    });
  };
  window.csReveal = armReveal;
  armReveal();

  // Bootstrap tooltips (sidebar when collapsed, icon buttons)
  if (window.bootstrap) {
    document.querySelectorAll('[data-bs-toggle="tooltip"]').forEach((el) => new bootstrap.Tooltip(el));
  }

  // Client-side table filter: <input data-filter="#tableId">
  document.querySelectorAll("[data-filter]").forEach((inp) => {
    const rows = () => document.querySelectorAll(inp.dataset.filter + " tbody tr");
    inp.addEventListener("input", () => {
      const q = inp.value.toLowerCase().trim();
      rows().forEach((tr) => { tr.style.display = tr.textContent.toLowerCase().includes(q) ? "" : "none"; });
    });
  });

  // ------------------------------------------------------------- notifications dropdown
  const notifBtn = document.getElementById("notifBtn");
  const notifList = document.getElementById("notifMenuList");
  async function loadNotifs() {
    if (!notifList) return;
    try {
      const res = await fetch("/notifications/api/unread", { headers: { Accept: "application/json" } });
      const data = await res.json();
      if (!data.items.length) {
        notifList.innerHTML = '<div class="empty-state py-4"><i class="bi bi-bell-slash"></i><span class="small">You\'re all caught up</span></div>';
        return;
      }
      notifList.innerHTML = "";
      data.items.forEach((n) => {
        const a = document.createElement("a");
        a.className = "notif-item"; a.href = "/notifications/";
        a.innerHTML = '<span class="ico"><i class="bi bi-exclamation-triangle"></i></span><span><span class="t d-block"></span><span class="small text-muted w"></span></span>';
        a.querySelector(".t").textContent = n.message;
        a.querySelector(".w").textContent = n.created_at;
        notifList.appendChild(a);
      });
    } catch (e) { /* offline */ }
  }
  notifBtn?.addEventListener("show.bs.dropdown", loadNotifs);

  // ------------------------------------------------------------- live socket
  if (document.body.dataset.authenticated !== "true" || typeof window.io !== "function") return;
  const socket = window.io();
  window.csSocket = socket;

  socket.on("notification", (n) => {
    const badge = document.getElementById("notifBadge");
    if (badge) {
      badge.textContent = (parseInt(badge.textContent, 10) || 0) + 1;
      badge.classList.remove("d-none");
    }
    const bell = notifBtn?.querySelector("i");
    if (bell) { bell.classList.remove("bell-ring"); void bell.offsetWidth; bell.classList.add("bell-ring"); }
    window.csToast(n.message, "danger");
    document.dispatchEvent(new CustomEvent("cs:notification", { detail: n }));
  });

  const me = parseInt(document.body.dataset.userId, 10);
  socket.on("chat_message", (m) => {
    if (m.sender_id === me || window.csChatPeer === m.sender_id) return;
    window.csToast(`${m.sender_name}: ${m.content.slice(0, 90)}`, "primary");
  });
})();
