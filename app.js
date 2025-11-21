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
const supabase = supabase.createClient(
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
// UTIL: Analytics Logging
// ----------------------------
async function logToSupabase(payload) {
  try {
    await supabase.from("analytics_logs").insert(payload);
  } catch (err) {
    console.error("❌ Supabase analytics failed:", err);
  }
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
        "X-API-KEY": "YOUR_API_KEY"
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

    // Send analytics to Supabase
    await logToSupabase({
      query: query,
      match_count: data.match_count || 0,
      max_similarity: data.max_similarity || 0,
      sources: data.sources || [],
      rag_used: rag_used,
      llm_used: llm_used,
      mode: mode,
      latency_ms: latency
    });

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

