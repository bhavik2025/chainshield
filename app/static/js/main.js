// ChainShield front-end: shared Socket.IO connection, live notification
// toasts + bell badge, and a CSRF-aware fetch helper used by chat/assistant.
(function () {
  const csrf = document.querySelector('meta[name="csrf-token"]')?.content;

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

  window.csToast = function (text, variant) {
    const area = document.getElementById("toastArea");
    if (!area || !window.bootstrap) return;
    const el = document.createElement("div");
    el.className = `toast align-items-center text-bg-${variant || "dark"} border-0`;
    el.setAttribute("role", "alert");
    el.innerHTML = '<div class="d-flex"><div class="toast-body"></div>' +
      '<button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button></div>';
    el.querySelector(".toast-body").textContent = text;
    area.appendChild(el);
    new bootstrap.Toast(el, { delay: 7000 }).show();
    el.addEventListener("hidden.bs.toast", () => el.remove());
  };

  if (document.body.dataset.authenticated !== "true" || typeof io === "undefined") return;

  const socket = io();
  window.csSocket = socket;

  socket.on("notification", (n) => {
    const badge = document.getElementById("notifBadge");
    if (badge) {
      badge.textContent = (parseInt(badge.textContent, 10) || 0) + 1;
      badge.classList.remove("d-none");
    }
    window.csToast("🔔 " + n.message, "danger");
    document.dispatchEvent(new CustomEvent("cs:notification", { detail: n }));
  });

  // Chat messages arriving while you're on another page (or another conversation).
  const me = parseInt(document.body.dataset.userId, 10);
  socket.on("chat_message", (m) => {
    if (m.sender_id === me || window.csChatPeer === m.sender_id) return;
    window.csToast(`💬 ${m.sender_name}: ${m.content.slice(0, 80)}`, "primary");
  });
})();
