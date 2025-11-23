/***************************************************
 * NANI-AI PWA — SAFE + SECURE FRONT-END SCRIPT
 * - Chat UI
 * - Secure API requests (X-API-KEY via env var)
 * - Seasonal + Dark Mode UI
 ***************************************************/

document.addEventListener("DOMContentLoaded", () => {

  // ----------------------------
  // ENV VARS FROM VERCEL → VITE
  // ----------------------------
  const API_SECRET = import.meta.env.VITE_API_SECRET;
  const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
  const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_KEY;

  // Initialize Supabase (even if unused)
  const sb = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

  // ----------------------------
  // DOM ELEMENTS
  // ----------------------------
  const chatBox = document.getElementById("nani-chat-box");
  const inputField = document.getElementById("nani-input");
  const sendBtn = document.getElementById("nani-send-btn");
  const loader = document.getElementById("nani-loader");  // may be null if missing


  // ----------------------------
  // UI — Append messages
  // ----------------------------
  function appendMessage(sender, text) {
    const wrapper = document.createElement("div");
    wrapper.className = sender === "user" ? "msg-user" : "msg-nani";
    wrapper.innerHTML = `<div class="bubble">${text.replace(/\n/g, "<br>")}</div>`;
    chatBox.appendChild(wrapper);
    chatBox.scrollTop = chatBox.scrollHeight;
  }


  // ----------------------------
  // MAIN: Send Query to Backend
  // ----------------------------
  async function sendToNani() {

    const query = inputField.value.trim();
    if (!query) return;

    appendMessage("user", query);
    inputField.value = "";

    if (loader) loader.style.display = "block";

    try {
      const res = await fetch("https://naturopathy.onrender.com/fetch_naturopathy_results", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-API-KEY": API_SECRET
        },
        body: JSON.stringify({
          query: query,
          match_threshold: 0.4,
          match_count: 3
        })
      });

      const data = await res.json();

      if (loader) loader.style.display = "none";

      if (data.error) {
        appendMessage("nani", "⚠️ Error: " + data.error);
        return;
      }

      appendMessage("nani", data.summary || "No remedy suggestions available.");

    } catch (err) {
      if (loader) loader.style.display = "none";
      appendMessage("nani", "⚠️ Network error. Please try again.");
      console.error("API error:", err);
    }
  }


  // ----------------------------
  // EVENT LISTENERS
  // ----------------------------
  if (sendBtn) {
    sendBtn.addEventListener("click", sendToNani);
  }

  if (inputField) {
    inputField.addEventListener("keypress", (e) => {
      if (e.key === "Enter") sendToNani();
    });
  }

  // Expose function globally (optional)
  window.sendToNani = sendToNani;


  // ----------------------------
  // THEME — Auto Seasonal + Dark Mode
  // ----------------------------
  function applyTheme() {

    // DARK MODE → Don't apply seasonal
    if (window.matchMedia("(prefers-color-scheme: dark)").matches) {

      document.body.style.background = "#0f172a";

      const darkStyle = document.createElement("style");
      darkStyle.innerHTML = `
        .msg-user .bubble { background: #1e293b; color: #f1f5f9; }
        .msg-nani .bubble { background: #334155; color: #f8fafc; }
      `;
      document.head.appendChild(darkStyle);
      return;
    }

    // LIGHT MODE → Seasonal
    const month = new Date().getMonth();

    let theme = {
      bg: "#f0fdfa",
      bubbleUser: "#d1fae5",
      bubbleNani: "#e0f7f7",
    };

    if (month === 11 || month <= 1) {
      theme = { bg: "#f0f7ff", bubbleUser: "#dcecff", bubbleNani: "#e6f3ff" };
    } else if (month >= 2 && month <= 4) {
      theme = { bg: "#f0fdf4", bubbleUser: "#d9fbd9", bubbleNani: "#d4f7d4" };
    } else if (month >= 5 && month <= 7) {
      theme = { bg: "#fffbea", bubbleUser: "#ffe89c", bubbleNani: "#fff3c4" };
    } else if (month >= 8 && month <= 10) {
      theme = { bg: "#fef6e4", bubbleUser: "#f7d8ae", bubbleNani: "#fde7c8" };
    }

    document.body.style.background = theme.bg;

    const style = document.createElement("style");
    style.innerHTML = `
      .msg-user .bubble { background: ${theme.bubbleUser}; }
      .msg-nani .bubble { background: ${theme.bubbleNani}; }
    `;
    document.head.appendChild(style);
  }

  applyTheme();

});
