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

/*******************************
 * SEASONAL AYURVEDIC THEMES
 *******************************/
function applyTheme(theme) {
  const root = document.documentElement;

  if (theme === "vata") {
    root.style.setProperty("--bg", "#F8F3EF");
    root.style.setProperty("--bubble-nani", "#EFE7DD");
    root.style.setProperty("--bubble-user", "#7A9D96");
    root.style.setProperty("--text", "#4A453F");
  }
  else if (theme === "pitta") {
    root.style.setProperty("--bg", "#E8FAF8");
    root.style.setProperty("--bubble-nani", "#DFF7F3");
    root.style.setProperty("--bubble-user", "#0C9A9A");
    root.style.setProperty("--text", "#1B3A3A");
  }
  else if (theme === "kapha") {
    root.style.setProperty("--bg", "#FBF8E8");
    root.style.setProperty("--bubble-nani", "#F3EED2");
    root.style.setProperty("--bubble-user", "#C49A2E");
    root.style.setProperty("--text", "#4A453F");
  }
  else {
    // AUTO — detect by month
    const month = new Date().getMonth();

    if ([11,0,1].includes(month)) applyTheme("vata");
    else if ([5,6,7,8].includes(month)) applyTheme("pitta");
    else applyTheme("kapha");
  }
}

// Initial apply
applyTheme("auto");

// Change theme on dropdown change
document.getElementById("theme-selector").addEventListener("change", (e) => {
  applyTheme(e.target.value);
});





