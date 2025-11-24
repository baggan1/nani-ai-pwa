/***************************************************
 * NANI-AI PWA — Email-Only Free Trial Edition
 * - Secure API calls
 * - Email gating
 * - Seasonal + Dark Mode themes
 ***************************************************/
document.addEventListener("DOMContentLoaded", () => {

  // -------------------------
  // ENV (from Vercel → Vite)
  // -------------------------
  const API_SECRET = import.meta.env.VITE_API_SECRET;
  const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
  const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_KEY;

  const sb = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

  // -------------------------
  // DOM Elements
  // -------------------------
  const chatBox     = document.getElementById("nani-chat-box");
  const inputField  = document.getElementById("nani-input");
  const sendBtn     = document.getElementById("nani-send-btn");
  const loader      = document.getElementById("nani-loader");

  const trialScreen = document.getElementById("trial-screen");
  const chatApp     = document.getElementById("chat-app");
  const trialEmail  = document.getElementById("trial-email");
  const trialError  = document.getElementById("trial-error");
  const trialBtn    = document.getElementById("trial-submit-btn");

  // Store logged-in email
  let userEmail = localStorage.getItem("nani_user_email");

  // If already logged in, show chat
  if (userEmail) {
    trialScreen.style.display = "none";
    chatApp.style.display = "block";
  }

  // -------------------------
  // FREE TRIAL HANDLER
  // -------------------------
  async function startFreeTrial() {
    const email = trialEmail.value.trim();

    if (!email || !email.includes("@")) {
      trialError.innerText = "Please enter a valid email.";
      trialError.style.display = "block";
      return;
    }

    trialError.style.display = "none";

    try {
      const res = await fetch("https://naturopathy.onrender.com/start_trial", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-API-KEY": API_SECRET
        },
        body: JSON.stringify({ email })
      });

      const data = await res.json();

      if (data.error) {
        trialError.innerText = data.error;
        trialError.style.display = "block";
        return;
      }

      // Save session
      userEmail = email;
      localStorage.setItem("nani_user_email", email);

      // Switch screens
      trialScreen.style.display = "none";
      chatApp.style.display = "block";

    } catch (e) {
      trialError.innerText = "Network error. Please try again.";
      trialError.style.display = "block";
    }
  }

  trialBtn.addEventListener("click", startFreeTrial);


  // -------------------------
  // Append Messages
  // -------------------------
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


  // -------------------------
  // Send Query to Backend
  // -------------------------
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
          email: userEmail,
          query,
          match_threshold: 0.4,
          match_count: 3
        })
      });

      const data = await res.json();
      loader.style.display = "none";

      if (data.error) {
        appendMessage("nani", "⚠️ " + data.error);
        return;
      }

      appendMessage("nani", data.summary);

    } catch (err) {
      loader.style.display = "none";
      appendMessage("nani", "⚠️ Network error.");
    }
  }

  sendBtn.addEventListener("click", sendToNani);
  inputField.addEventListener("keypress", e => {
    if (e.key === "Enter") sendToNani();
  });


  // -------------------------
  // THEMING (Dark + Seasonal)
  // -------------------------
  function applyTheme() {
    if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
      document.body.classList.add("dark-mode");
      return;
    }

    const m = new Date().getMonth();
    if (m === 11 || m <= 1) document.body.classList.add("winter");
    else if (m >= 2 && m <= 4) document.body.classList.add("spring");
    else if (m >= 5 && m <= 7) document.body.classList.add("summer");
    else document.body.classList.add("fall");
  }

  applyTheme();
});
