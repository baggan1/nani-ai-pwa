/***************************************************
 * NANI-AI PWA — SAFE + SECURE FRONT-END SCRIPT
 * - Chat UI
 * - Requests to backend API (secure)
 * - Stripe Checkout launcher (no exposed key)
 * - Seasonal + Dark Mode UI
 ***************************************************/
document.addEventListener("DOMContentLoaded", () => {
// ----------------------------
// ENV VAR (from Vercel → Vite)
// ----------------------------
const API_SECRET = import.meta.env.VITE_API_SECRET;
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_KEY;

const sb = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);


// ----------------------------
// DOM ELEMENTS
// ----------------------------
const chatBox = document.getElementById("nani-chat-box");
const inputField = document.getElementById("nani-input");
const sendBtn = document.getElementById("nani-send-btn");
const loader = document.getElementById("nani-loader");

// ----------------------------
// APPEND MESSAGES
// ----------------------------
function appendMessage(sender, text) {
  const wrapper = document.createElement("div");
  wrapper.className = sender === "user" ? "msg-user" : "msg-nani";

  wrapper.innerHTML = `
    <div class="bubble">
      ${text.replace(/\n/g, "<br>")}
    </div>
  `;

  chatBox.appendChild(wrapper);
  chatBox.scrollTop = chatBox.scrollHeight;
}

// ----------------------------
// MAIN: SEND QUERY
// ----------------------------
async function sendToNani() {
  const query = inputField.value.trim();
  if (!query) return;

  appendMessage("user", query);
  inputField.value = "";
  loader.style.display = "block";

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
    loader.style.display = "none";

    if (data.error) {
      appendMessage("nani", "⚠️ Error: " + data.error);
      return;
    }

    appendMessage("nani", data.summary || "No remedy suggestions available.");

  } catch (err) {
    loader.style.display = "none";
    appendMessage("nani", "⚠️ Network error. Please try again.");
    console.error("API error:", err);
  }
}

// ----------------------------
// EVENTS
// ----------------------------
sendBtn.addEventListener("click", sendToNani);
inputField.addEventListener("keypress", (e) => {
  if (e.key === "Enter") sendToNani();
});

// Expose globally for HTML button
window.sendToNani = sendToNani;

// ----------------------------
// SEASONAL / DARK MODE THEME
// ----------------------------
function applyTheme() {
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

  const month = new Date().getMonth();
  let theme = {
    bg: "#f0fdfa",
    bubbleUser: "#d1fae5",
    bubbleNani: "#e0f7f7",
  };

  if (month === 11 || month <= 1) {
    theme.bg = "#f0f7ff";
    theme.bubbleNani = "#e6f3ff";
    theme.bubbleUser = "#dcecff";
  } else if (month >= 2 && month <= 4) {
    theme.bg = "#f0fdf4";
    theme.bubbleNani = "#d4f7d4";
    theme.bubbleUser = "#d9fbd9";
  } else if (month >= 5 && month <= 7) {
    theme.bg = "#fffbea";
    theme.bubbleNani = "#fff3c4";
    theme.bubbleUser = "#ffe89c";
  } else if (month >= 8 && month <= 10) {
    theme.bg = "#fef6e4";
    theme.bubbleNani = "#fde7c8";
    theme.bubbleUser = "#f7d8ae";
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



