/***************************************************
 * NANI-AI PWA — Auth + Free Trial Edition
 * - Supabase Auth (magic link + Google)
 * - Email storage
 * - Chat API calls
 * - Account panel
 * - Seasonal + dark mode themes
 ***************************************************/

document.addEventListener("DOMContentLoaded", () => {

  // -----------------------------------------
  // ENV VARIABLES (Vercel → Vite)
  // -----------------------------------------
  const API_SECRET = import.meta.env.VITE_API_SECRET;
  const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
  const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_KEY;

  const sb = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

  // -----------------------------------------
  // DOM ELEMENTS
  // -----------------------------------------
  const welcomeScreen = document.getElementById("welcome-screen");
  const chatApp = document.getElementById("chat-app");

  const trialEmailInput = document.getElementById("trial-email");
  const startTrialBtn = document.getElementById("start-trial-btn");
  const trialError = document.getElementById("trial-error");

  const chatBox = document.getElementById("nani-chat-box");
  const inputField = document.getElementById("nani-input");
  const sendBtn = document.getElementById("nani-send-btn");
  const loader = document.getElementById("nani-loader");

  // Account panel UI
  const accountBtn = document.getElementById("account-btn");
  const accountPanel = document.getElementById("account-panel");
  const accEmail = document.getElementById("acc-email");
  const accTrialStatus = document.getElementById("acc-trial-status");
  const accDaysLeft = document.getElementById("acc-days-left");
  const accSubStatus = document.getElementById("acc-sub-status");
  const accSubscribeBtn = document.getElementById("acc-subscribe-btn");
  const accCloseBtn = document.getElementById("acc-close");

  // -----------------------------------------
  // SESSION HANDLING
  // -----------------------------------------
  let userEmail =
    localStorage.getItem("nani_user_email") || null;

  // If authenticated via Supabase Auth → auto-fill email
  async function loadSupabaseSession() {
    const { data } = await sb.auth.getSession();
    const email = data?.session?.user?.email;

    if (email) {
      userEmail = email;
      localStorage.setItem("nani_user_email", email);
      welcomeScreen.style.display = "none";
      chatApp.style.display = "block";
    }
  }

  loadSupabaseSession();

  // If localStorage has email → skip welcome page
  if (userEmail) {
    welcomeScreen.style.display = "none";
    chatApp.style.display = "block";
  }

  // -----------------------------------------
  // START TRIAL (Signup via magic link)
  // -----------------------------------------
  startTrialBtn.addEventListener("click", async () => {
    const email = trialEmailInput.value.trim();

    if (!email.includes("@")) {
      alert("Please enter a valid email address.");
      return;
    }

    try {
      const { error } = await sb.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: window.location.origin,
        }
      });

      if (error) {
        alert("Error sending magic link: " + error.message);
        return;
      }

      alert("A magic link has been sent to your email. Please check.");
    } catch (e) {
      alert("Network error. Try again.");
    }
  });

  // -----------------------------------------
  // MESSAGES
  // -----------------------------------------
  function appendMessage(sender, text) {
    const wrapper = document.createElement("div");
    wrapper.className = sender === "user" ? "msg-user" : "msg-nani";

    wrapper.innerHTML = `
      <div class="bubble">${text.replace(/\n/g, "<br>")}</div>
    `;

    chatBox.appendChild(wrapper);
    chatBox.scrollTop = chatBox.scrollHeight;
  }

  // -----------------------------------------
  // SEND QUERY TO BACKEND
  // -----------------------------------------
  async function sendToNani() {
    const query = inputField.value.trim();
    if (!query) return;

    if (!userEmail) {
      appendMessage("nani", "⚠️ Please sign in first.");
      return;
    }

    appendMessage("user", query);
    inputField.value = "";
    loader.style.display = "block";

    try {
      const { data: sessionObj } = await sb.auth.getSession();
      const jwt = sessionObj?.session?.access_token;

      if (!jwt) {
        loader.style.display = "none";
        appendMessage("nani", "⚠️ Session expired. Please log in again.");
        return;
      }

      const res = await fetch(
        "https://naturopathy.onrender.com/fetch_naturopathy_results",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${jwt}`,
            "X-API-KEY": API_SECRET
          },
          body: JSON.stringify({
            email: userEmail,
            query,
            match_threshold: 0.4,
            match_count: 3
          })
        }
      );

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
  inputField.addEventListener("keypress", (e) => {
    if (e.key === "Enter") sendToNani();
  });

  // -----------------------------------------
  // ACCOUNT PANEL
  // -----------------------------------------
  accountBtn.addEventListener("click", async () => {
    const email = localStorage.getItem("nani_user_email");

    if (!email) {
      accEmail.textContent = "Not signed in";
      accTrialStatus.textContent = "—";
      accDaysLeft.textContent = "—";
      accSubStatus.textContent = "—";
      accSubscribeBtn.classList.remove("hidden");
      accountPanel.classList.remove("hidden");
      return;
    }

    try {
      const res = await fetch(
        `https://naturopathy.onrender.com/auth/status?email=${encodeURIComponent(email)}`,
        { headers: { "X-API-KEY": API_SECRET } }
      );

      const data = await res.json();

      accEmail.textContent = email;
      accTrialStatus.textContent = data.trial_active ? "Active" : "Expired";
      accDaysLeft.textContent =
        typeof data.days_left === "number" ? data.days_left : "0";
      accSubStatus.textContent = data.subscribed
        ? "Active Subscriber"
        : "Not Subscribed";

      if (!data.subscribed) {
        accSubscribeBtn.classList.remove("hidden");
      } else {
        accSubscribeBtn.classList.add("hidden");
      }

    } catch (e) {
      accTrialStatus.textContent = "Error loading status.";
      accDaysLeft.textContent = "—";
      accSubStatus.textContent = "—";
    }

    accountPanel.classList.remove("hidden");
  });

  accCloseBtn.addEventListener("click", () =>
    accountPanel.classList.add("hidden")
  );

  accSubscribeBtn.addEventListener("click", () => {
    window.location.href = "/subscribe";
  });

  // -----------------------------------------
  // THEMING — Dark mode + Seasonal colors
  // -----------------------------------------
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
