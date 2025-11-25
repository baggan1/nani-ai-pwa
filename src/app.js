// /src/app.js
/***************************************************
 * NANI-AI PWA — Supabase Auth + Trial Gating
 * - Supabase Auth (Email + Google)
 * - 7-day trial (driven by profiles table)
 * - Secure calls to FastAPI backend
 ***************************************************/
document.addEventListener("DOMContentLoaded", async () => {
  // -------------------------
  // Supabase Client (from CDN)
  // -------------------------
  const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
  const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_KEY;

  const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

  // -------------------------
  // DOM Elements
  // -------------------------
  const authScreen   = document.getElementById("auth-screen");
  const chatApp      = document.getElementById("chat-app");

  const emailInput   = document.getElementById("auth-email");
  const emailBtn     = document.getElementById("email-login-btn");
  const googleBtn    = document.getElementById("google-login-btn");
  const authMessage  = document.getElementById("auth-message");

  const chatBox      = document.getElementById("nani-chat-box");
  const inputField   = document.getElementById("nani-input");
  const sendBtn      = document.getElementById("nani-send-btn");
  const loader       = document.getElementById("nani-loader");

  const accountBtn   = document.getElementById("account-btn");
  const accountPanel = document.getElementById("account-panel");
  const accEmail     = document.getElementById("acc-email");
  const accTrial     = document.getElementById("acc-trial-status");
  const accDays      = document.getElementById("acc-days-left");
  const accSub       = document.getElementById("acc-sub-status");
  const accSubBtn    = document.getElementById("acc-subscribe-btn");
  const accCloseBtn  = document.getElementById("acc-close");

  let currentSession = null;
  let currentUser    = null;

  // -------------------------
  // UI Helpers
  // -------------------------
  function showAuth() {
    authScreen.style.display = "block";
    chatApp.style.display = "none";
  }

  function showChat() {
    authScreen.style.display = "none";
    chatApp.style.display = "block";
  }

  function setAuthMessage(msg, isError = false) {
    if (!authMessage) return;
    authMessage.textContent = msg || "";
    authMessage.style.display = msg ? "block" : "none";
    authMessage.style.color = isError ? "red" : "#0d8f8f";
  }

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
  // AUTH STATE
  // -------------------------
  async function refreshSession() {
    const { data, error } = await sb.auth.getSession();
    if (error) {
      console.error("Session error:", error);
      currentSession = null;
      currentUser = null;
      showAuth();
      return;
    }

    currentSession = data.session || null;
    currentUser = currentSession?.user || null;

    if (currentUser) {
      showChat();
    } else {
      showAuth();
    }
  }

  sb.auth.onAuthStateChange((_event, session) => {
    currentSession = session;
    currentUser = session?.user || null;
    if (currentUser) {
      showChat();
    } else {
      showAuth();
    }
  });

  await refreshSession();

  // -------------------------
  // LOGIN HANDLERS
  // -------------------------
  // Email magic link
  if (emailBtn) {
    emailBtn.addEventListener("click", async () => {
      const email = (emailInput.value || "").trim();
      if (!email || !email.includes("@")) {
        setAuthMessage("Please enter a valid email.", true);
        return;
      }

      setAuthMessage("Sending magic link…");

      const { error } = await sb.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: window.location.origin,
        },
      });

      if (error) {
        console.error(error);
        setAuthMessage("Could not send magic link. Please try again.", true);
      } else {
        setAuthMessage("Check your email for a magic login link.");
      }
    });
  }

  // Google login
  if (googleBtn) {
    googleBtn.addEventListener("click", async () => {
      setAuthMessage("Redirecting to Google…");
      const { error } = await sb.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: window.location.origin,
        },
      });
      if (error) {
        console.error(error);
        setAuthMessage("Google sign-in failed. Please try again.", true);
      }
    });
  }

  // -------------------------
  // SEND QUERY TO NANI BACKEND
  // -------------------------
  async function sendToNani() {
    const query = inputField.value.trim();
    if (!query) return;

    if (!currentSession || !currentSession.access_token) {
      appendMessage("nani", "⚠️ Please log in again to continue.");
      showAuth();
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
          "Authorization": `Bearer ${currentSession.access_token}`,
        },
        body: JSON.stringify({
          query,
          match_threshold: 0.4,
          match_count: 3,
        }),
      });

      const data = await res.json();
      loader.style.display = "none";

      if (data.error) {
        // trial expired / auth issues / server errors
        appendMessage("nani", "⚠️ " + data.error);

        if (data.error.toLowerCase().includes("trial") || data.error.toLowerCase().includes("subscribe")) {
          // Optionally show a CTA in UI
        }

        return;
      }

      appendMessage("nani", data.summary || "No remedy suggestions available.");

    } catch (err) {
      loader.style.display = "none";
      console.error("API error:", err);
      appendMessage("nani", "⚠️ Network error. Please try again.");
    }
  }

  sendBtn.addEventListener("click", sendToNani);
  inputField.addEventListener("keypress", (e) => {
    if (e.key === "Enter") sendToNani();
  });

  // -------------------------
  // ACCOUNT PANEL
  // -------------------------
  accountBtn?.addEventListener("click", async () => {
    if (!currentSession || !currentSession.access_token) {
      accEmail.textContent = "Not logged in";
      accTrial.textContent = "—";
      accDays.textContent = "—";
      accSub.textContent = "—";
      accSubBtn.classList.remove("hidden");
      accountPanel.classList.remove("hidden");
      return;
    }

    try {
      const res = await fetch("https://naturopathy.onrender.com/auth/status", {
        headers: {
          "Authorization": `Bearer ${currentSession.access_token}`,
        },
      });
      const data = await res.json();

      if (data.error) {
        accEmail.textContent = "Error fetching status";
        accTrial.textContent = "—";
        accDays.textContent = "—";
        accSub.textContent = "—";
      } else {
        accEmail.textContent = data.email || "—";
        accTrial.textContent = data.trial_active ? "Active" : "Expired";
        accDays.textContent = data.days_left ?? "0";
        accSub.textContent = data.subscribed ? "Active Subscriber" : "Not Subscribed";

        if (!data.subscribed) {
          accSubBtn.classList.remove("hidden");
        } else {
          accSubBtn.classList.add("hidden");
        }
      }

      accountPanel.classList.remove("hidden");
    } catch (err) {
      console.error("Status error:", err);
      accountPanel.classList.remove("hidden");
    }
  });

  accCloseBtn?.addEventListener("click", () => {
    accountPanel.classList.add("hidden");
  });

  accSubBtn?.addEventListener("click", () => {
    // Placeholder for Stripe / subscribe flow
    // For now: maybe send them to your pricing page
    window.location.href = "https://arkayoga.com/naturopath-ai"; 
  });

  // -------------------------
  // THEME (Dark + Seasonal)
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
