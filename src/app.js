/***************************************************
 * NANI-AI PWA (Supabase Auth + Automatic Trial)
 * Automatic 7-day trial creation
 * Authorization via Bearer token
 * X-API-KEY header for backend
 * Chat only works when logged in
 * Account Panel (trial, days left, subscription)
 * Dark Mode + Seasonal themes
 * Clean screen switching (welcome → chat)
 ***************************************************/

document.addEventListener("DOMContentLoaded", () => {
  // -----------------------------------------------
  // ENV VARS (Vite → Vercel)
  // -----------------------------------------------
  const API_SECRET = import.meta.env.VITE_API_SECRET;
  const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
  const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_KEY;

  const sb = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

  // -----------------------------------------------
  // DOM ELEMENTS
  // -----------------------------------------------
  const welcomeScreen = document.getElementById("welcome-screen");
  const chatApp = document.getElementById("chat-app");

  const magicEmailInput = document.getElementById("magic-email");
  const sendMagicBtn = document.getElementById("send-magic-btn");
  const googleBtn = document.getElementById("google-btn");

  const chatBox = document.getElementById("nani-chat-box");
  const inputField = document.getElementById("nani-input");
  const sendBtn = document.getElementById("nani-send-btn");
  const loader = document.getElementById("nani-loader");

  const accountBtn = document.getElementById("account-btn");
  const accountPanel = document.getElementById("account-panel");
  const accEmail = document.getElementById("acc-email");
  const accTrialStatus = document.getElementById("acc-trial-status");
  const accDaysLeft = document.getElementById("acc-days-left");
  const accSubStatus = document.getElementById("acc-sub-status");
  const accSubscribeBtn = document.getElementById("acc-subscribe-btn");
  const accCloseBtn = document.getElementById("acc-close");

  // -----------------------------------------------
  // STATE
  // -----------------------------------------------
  let session = null;
  let accessToken = null;
  let userEmail = null;

  // -----------------------------------------------
  // HELPERS
  // -----------------------------------------------
  function showScreen(isAuthed) {
    if (isAuthed) {
      welcomeScreen.style.display = "none";
      chatApp.style.display = "block";
    } else {
      welcomeScreen.style.display = "block";
      chatApp.style.display = "none";
    }
  }

  function appendMessage(sender, text) {
    const wrapper = document.createElement("div");
    wrapper.className = sender === "user" ? "msg-user" : "msg-nani";
    wrapper.innerHTML = `<div class="bubble">${text.replace(/\n/g, "<br>")}</div>`;
    chatBox.appendChild(wrapper);
    chatBox.scrollTop = chatBox.scrollHeight;
  }

  // -----------------------------------------------
  // INIT SESSION
  // -----------------------------------------------
  async function loadExistingSession() {
    const { data } = await sb.auth.getSession();
    if (data.session) {
      session = data.session;
      accessToken = data.session.access_token;
      userEmail = data.session.user.email;

      localStorage.setItem("nani_access_token", accessToken);
      localStorage.setItem("nani_user_email", userEmail);

      showScreen(true);
    } else {
      showScreen(false);
    }
  }

  loadExistingSession();

  // -----------------------------------------------
  // AUTH METHODS
  // -----------------------------------------------
  sendMagicBtn.addEventListener("click", async () => {
    const email = magicEmailInput.value.trim();
    if (!email.includes("@")) {
      alert("Please enter a valid email.");
      return;
    }

    sendMagicBtn.innerText = "Sending...";
    try {
      const { error } = await sb.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: "https://nani-ai-pwa.vercel.app",
        },
      });

      if (error) {
        alert("Error: " + error.message);
      } else {
        alert("Magic link sent! Check your email.");
      }
    } catch (err) {
      alert("Failed to send magic link.");
    }
    sendMagicBtn.innerText = "Sign in with Email";
  });

  googleBtn.addEventListener("click", async () => {
    try {
      await sb.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: "https://nani-ai-pwa.vercel.app",
        },
      });
    } catch (err) {
      alert("Google login failed.");
    }
  });

  // Supabase auth listener
  sb.auth.onAuthStateChange(async (event, newSession) => {
    if (newSession) {
      session = newSession;
      accessToken = newSession.access_token;
      userEmail = newSession.user.email;

      localStorage.setItem("nani_access_token", accessToken);
      localStorage.setItem("nani_user_email", userEmail);

      showScreen(true);
    }
  });

  // -----------------------------------------------
  // FETCH NANI RESULTS
  // -----------------------------------------------
  async function sendToNani() {
    const query = inputField.value.trim();
    if (!query) return;

    if (!accessToken) {
      appendMessage("nani", "⚠️ Please sign in again.");
      return;
    }

    appendMessage("user", query);
    inputField.value = "";
    loader.style.display = "block";

    try {
      const res = await fetch("https://naturopathy.onrender.com/fetch_naturopathy_results", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-API-KEY": API_SECRET,
          "Authorization": `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          query: query,
          match_threshold: 0.4,
          match_count: 3,
        }),
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
      appendMessage("nani", "⚠️ Network error. Try again.");
    }
  }

  sendBtn.addEventListener("click", sendToNani);
  inputField.addEventListener("keypress", (e) => {
    if (e.key === "Enter") sendToNani();
  });

  // -----------------------------------------------
  // ACCOUNT PANEL
  // -----------------------------------------------
  accountBtn.addEventListener("click", async () => {
    if (!accessToken) {
      accEmail.textContent = "Not logged in";
      accountPanel.classList.remove("hidden");
      return;
    }

    const res = await fetch("https://naturopathy.onrender.com/auth/status", {
      headers: {
        "X-API-KEY": API_SECRET,
        "Authorization": `Bearer ${accessToken}`,
      },
    });

    const data = await res.json();

    accEmail.textContent = userEmail;
    accTrialStatus.textContent = data.trial_active ? "Active" : "Expired";
    accDaysLeft.textContent = `${data.days_left}`;
    accSubStatus.textContent = data.subscribed ? "Active Subscriber" : "Not Subscribed";

    if (!data.subscribed) accSubscribeBtn.classList.remove("hidden");
    else accSubscribeBtn.classList.add("hidden");

    accountPanel.classList.remove("hidden");
  });

  accCloseBtn.addEventListener("click", () => {
    accountPanel.classList.add("hidden");
  });

  accSubscribeBtn.addEventListener("click", () => {
    window.location.href = "/subscribe";
  });

  // -----------------------------------------------
  // THEMING (Dark Mode + Seasonal)
  // -----------------------------------------------
  function applyTheme() {
    if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
      document.body.classList.add("dark-mode");
      return;
    }

    const month = new Date().getMonth();
    if (month <= 1 || month === 11) document.body.classList.add("winter");
    else if (month <= 4) document.body.classList.add("spring");
    else if (month <= 7) document.body.classList.add("summer");
    else document.body.classList.add("fall");
  }

  applyTheme();
});
