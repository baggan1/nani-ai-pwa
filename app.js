/***************************************************
 * NANI-AI PWA — Full Front-End Script
 * Handles:
 * - Chat UI
 * - API Requests
 * - RAG/LLM/HYBRID logic display
 * - Supabase Analytics Logging
 ***************************************************/

// ----------------------------
// Supabase Client
// ----------------------------
const sb = supabase.createClient(
  "https://biblbpmlpchztyifoypt.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJpYmxicG1scGNoenR5aWZveXB0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM1ODUxMjksImV4cCI6MjA3OTE2MTEyOX0.qmwrUIvkhjp7jB2Tb9E5ORQZPHVLyirjmhPe3tr9Lbk"
);

// ----------------------------
// DOM ELEMENTS
// ----------------------------
const chatBox = document.getElementById("nani-chat-box");
const inputField = document.getElementById("nani-input");
const sendBtn = document.getElementById("nani-send-btn");
const loader = document.getElementById("nani-loader"); // optional spinner

// ----------------------------
// UTIL: Append messages
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
// MAIN: Send Query to API
// ----------------------------
async function sendToNani() {
  const query = inputField.value.trim();
  if (!query) return;

  appendMessage("user", query);
  inputField.value = "";
  loader.style.display = "block";

  const startTime = performance.now();

  try {
    const res = await fetch("https://naturopathy.onrender.com/fetch_naturopathy_results", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-KEY": "gR4k#82GJ!nani2025"
      },
      body: JSON.stringify({
        query: query,
        match_threshold: 0.4,
        match_count: 3
      })
    });

    const data = await res.json();
    const endTime = performance.now();
    const latency = Math.round(endTime - startTime);

    loader.style.display = "none";

    // Handle server errors
    if (data.error) {
      appendMessage("nani", "⚠️ Error: " + data.error);
      return;
    }

    // Display Nani's summary
    appendMessage("nani", data.summary || "No remedy suggestions available.");

    // Determine mode (if backend didn't return it)
    let mode = data.mode || "LLM_ONLY";
    let rag_used = data.rag_used || false;
    let llm_used = data.llm_used || false;

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

// Scroll to bottom on load
window.onload = () => {
  chatBox.scrollTop = chatBox.scrollHeight;
};
window.sendToNani = sendToNani;

// ----------------------------------------
// AUTO SEASONAL THEME (No UI control)
// ----------------------------------------
// If the user prefers dark mode, DO NOT apply seasonal theme
if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
    document.body.style.background = "#0f172a"; // dark slate
    const style = document.createElement("style");
    style.innerHTML = `
      .msg-user .bubble { background: #1e293b; color: #f1f5f9; }
      .msg-nani .bubble { background: #334155; color: #f8fafc; }
    `;
    document.head.appendChild(style);
    return; // stop here — seasonal theming skipped
}

function applySeasonalTheme() {
  
  // --------------------------------------
  // 1. DARK MODE → Override everything
  // --------------------------------------
  if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
    document.body.style.background = "#0f172a";  // dark background

    const style = document.createElement("style");
    style.innerHTML = `
      .msg-user .bubble {
        background: #1e293b;
        color: #f1f5f9;
      }
      .msg-nani .bubble {
        background: #334155;
        color: #f8fafc;
      }
    `;
    document.head.appendChild(style);
    return;   // stop → no seasonal theme applied in dark mode
  }

  // --------------------------------------
  // 2. LIGHT MODE → Apply automatic seasonal theme
  // --------------------------------------
  const month = new Date().getMonth();

  let theme = {
    bg: "#f0fdfa",
    bubbleUser: "#d1fae5",
    bubbleNani: "#e0f7f7",
  };

  if (month === 11 || month <= 1) {
    // WINTER (Vata)
    theme.bg = "#f0f7ff";
    theme.bubbleNani = "#e6f3ff";
    theme.bubbleUser = "#dcecff";
  } else if (month >= 2 && month <= 4) {
    // SPRING (Kapha)
    theme.bg = "#f0fdf4";
    theme.bubbleNani = "#d4f7d4";
    theme.bubbleUser = "#d9fbd9";
  } else if (month >= 5 && month <= 7) {
    // SUMMER (Pitta)
    theme.bg = "#fffbea";
    theme.bubbleNani = "#fff3c4";
    theme.bubbleUser = "#ffe89c";
  } else if (month >= 8 && month <= 10) {
    // FALL (Vata-Pitta)
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

applySeasonalTheme();
