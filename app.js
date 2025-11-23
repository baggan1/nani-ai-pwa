/***************************************************
 * NANI-AI PWA — SAFE + SECURE FRONT-END SCRIPT
 * - Chat UI
 * - Requests to backend API (secure)
 * - Stripe Checkout launcher (no exposed key)
 * - Seasonal + Dark Mode UI
 ***************************************************/


// ----------------------------
// DOM ELEMENTS
// ----------------------------
const chatBox = document.getElementById("nani-chat-box");
const inputField = document.getElementById("nani-input");
const sendBtn = document.getElementById("nani-send-btn");
const loader = document.getElementById("nani-loader");


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
// MAIN CHAT FUNCTION
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
      headers: { "Content-Type": "application/json" },
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
    console.error(err);
  }
}


// ----------------------------
// STRIPE CHECKOUT — NO API KEY ON FRONTEND
// ----------------------------
async function startSubscription() {
  try {
    const res = await fetch("https://naturopathy.onrender.com/create_checkout_session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        price_id: "price_xxxxx"    // replace with real Stripe price_id
      })
    });

    const data = await res.json();

    if (data.checkout_url) {
      window.location.href = data.checkout_url;
    } else {
      alert("Unable to start checkout session.");
    }

  } catch (err) {
    console.error("Checkout error:", err);
  }
}


// Make function available globally for button onclick
window.startSubscription = startSubscription;


// ----------------------------
// EVENTS
// ----------------------------
sendBtn.addEventListener("click", sendToNani);

inputField.addEventListener("keypress", (e) => {
  if (e.key === "Enter") sendToNani();
});

window.onload = () => {
  chatBox.scrollTop = chatBox.scrollHeight;
};


// ---------------------------------------------------
// AUTO SEASONAL THEME + DARK MODE SUPPORT
// ---------------------------------------------------
function applySeasonalTheme() {

  // If dark mode → override everything
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

  // Seasonal colors for light mode
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
  } else if (2 <= month && month <= 4) {
    theme.bg = "#f0fdf4";
    theme.bubbleNani = "#d4f7d4";
    theme.bubbleUser = "#d9fbd9";
  } else if (5 <= month && month <= 7) {
    theme.bg = "#fffbea";
    theme.bubbleNani = "#fff3c4";
    theme.bubbleUser = "#ffe89c";
  } else {
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


