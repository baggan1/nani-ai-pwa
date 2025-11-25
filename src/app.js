/***************************************************
 * NANI-AI PWA — Supabase Auth + Trial Gating
 * - Magic link sign-in
 * - Auto session restore
 * - Trial / subscription status display
 * - Secure calls to backend with X-API-KEY
 ***************************************************/

document.addEventListener("DOMContentLoaded", () => {
  // -------------------------
  // ENV (Vite → Vercel)
  // -------------------------
  const API_SECRET = import.meta.env.VITE_API_SECRET;
  const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
  const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_KEY;

  // Supabase client (global from CDN)
  const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

  // -------------------------
  // DOM Elements
  // -------------------------
  const welcomeScreen = document.getElementById("welcome-screen");
  const chatApp       = document.getElementById("chat-app");

  const emailInput    = document.getElementById("trial-email");
  const sendLinkBtn   = document.getElementById("start-trial-btn");
  const trialError    = document.getElementById("trial-error");
  const trialNote     = document.getElementById("trial-note");

  const chatBox       = document.getElementById("nani-chat-box");
  const inputField    = document.getElementById("nani-input");
  const sendBtn       = document.getElementById("nani-send-btn");
  const loader        = document.getElementById("nani-loader");

  const accountBtn      = document.getElementById("account-btn");
  const accountPanel    = document.getElementById("account-panel");
  const accEmail        = document.getElementById("acc-email");
  const accTrialStatus  = document.getElementById("acc-trial-status");
  const accDaysLeft     = document.getElementById("acc-days-left");
  const accSubStatus    = document.getElementById("acc-sub-status");
  const accSubscribeBtn = document.getElementById("acc-subscribe-btn");
  const accCloseBtn     = document.getElementById("acc-close");

  let userEmail = localStorage.getItem("nani_user_email") || null;

  // -------------------------
  // THEME (Dark + Seasonal)
  // -------------------------
  function applyTheme() {
    if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
      document.body.classList.add("dark-mode");
      return;
    }

    const m = new Date().getMonth();
    if (m === 11 || m <= 1)      document.body.classList.add("winter");
    else if (m >= 2 && m <= 4)   document.body.classList.add("spring");
    else if (m >= 5 && m <= 7)   document.body.classList.add("summer");
    else                         document.body.classList.add("fall");
  }

  applyTheme();

  // -------------------------
  // AUTH: Restore Session
  // -------------------------
  async function restoreSession() {
    try {
      const { data, error } = await sb.auth.getSession();
      if (error) {
        console.warn("Session restore error:", error.message);
        return;
      }

      const session = data?.session;
      if (session?.user?.email) {
        userEmail = session.user.email;
        localStorage.setItem("nani_user_email", userEmail);
        welcomeScreen.style.display = "none";
        chatApp.style.display = "block";
      } else {
        // Not logged in
        welcomeScreen.style.display = "block";
        chatApp.style.display = "none";
      }
    } catch (e) {
      console.error("restoreSession exception:", e);
    }
  }

  restoreSession();

  // -------------------------
  // AUTH: Send Magic Link
  // -------------------------
  async function sendMagicLink() {
    const email = emailInput.value.trim();

    trialError.textContent = "";
    trialNote.textContent = "";

    if (!email || !email.includes("@")) {
      trialError.textContent = "Please enter a valid email address.";
      return;
    }

    sendLinkBtn.disabled = true;
    sendLinkBtn.textContent = "Sending link...";

    try {
      const { data, error } = await sb.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: window.location.origin, // https://nani-ai-pwa.vercel.app
        },
      });

      if (error) {
        console.error("Magic link error:", error.message);
        trialError.textContent = error.message || "Could not send magic link.";
      } else {
        trialNote.textContent = "Magic link sent! Please check your email to continue.";
      }
    } catch (e) {
      console.error("Magic link exception:", e);
      trialError.textContent = "Something went wrong. Please try again.";
    } finally {
      sendLinkBtn.disabled = false;
      sendLinkBtn.textContent = "Send Magic Link";
    }
  }

  sendLinkBtn.addEventListener("click", sendMagicLink);

  // -------------------------
  // Chat UI: Append Messages
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
  // Chat: Send Query
  // -------------------------
  async function sendToNani() {
    const query = inputField.value.trim();
    if (!query) return;

    // Ensure we still have user email
    if (!userEmail) {
      const { data } = await sb.auth.getSession();
      if (data?.session?.user?.email) {
        userEmail = data.session.user.email;
        localStorage.setItem("nani_user_email", userEmail);
      }
    }

    if (!userEmail) {
      appendMessage("nani", "Please sign in with your email first to start your trial.");
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
        },
        body: JSON.stringify({
          email: userEmail,
          query,
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
  async function openAccountPanel() {
    // Ensure we know which email we're using
    if (!userEmail) {
      const { data } = await sb.auth.getSession();
      if (data?.session?.user?.email) {
        userEmail = data.session.user.email;
        localStorage.setItem("nani_user_email", userEmail);
      }
    }

    if (!userEmail) {
      accEmail.textContent = "Not signed in";
      accTrialStatus.textContent = "—";
      accDaysLeft.textContent = "—";
      accSubStatus.textContent = "—";
      accSubscribeBtn.classList.add("hidden");
      accountPanel.classList.remove("hidden");
      return;
    }

    try:
      const res = await fetch(
        `https://naturopathy.onrender.com/auth/status?email=${encodeURIComponent(userEmail)}`,
        {
          headers: {
            "X-API-KEY": API_SECRET,
          },
        }
      );

      const data = await res.json();

      accEmail.textContent = userEmail;

      if (data.error === "no-profile") {
        accTrialStatus.textContent = "No profile found";
        accDaysLeft.textContent = "—";
        accSubStatus.textContent = "Not Subscribed";
        accSubscribeBtn.classList.remove("hidden");
      } else {
        accTrialStatus.textContent = data.trial_active ? "Active" : "Expired";
        accDaysLeft.textContent =
          typeof data.days_left === "number" ? `${data.days_left}` : "—";
        accSubStatus.textContent = data.subscribed
          ? "Active Subscriber"
          : "Not Subscribed";

        if (!data.subscribed) {
          accSubscribeBtn.classList.remove("hidden");
        } else {
          accSubscribeBtn.classList.add("hidden");
        }
      }
    } catch (e) {
      console.error("auth/status error:", e);
      accTrialStatus.textContent = "Could not load status.";
      accDaysLeft.textContent = "—";
      accSubStatus.textContent = "—";
    }

    accountPanel.classList.remove("hidden");
  }

  accountBtn.addEventListener("click", openAccountPanel);

  accCloseBtn.addEventListener("click", () => {
    accountPanel.classList.add("hidden");
  });

  accSubscribeBtn.addEventListener("click", () => {
    // For now, just redirect to a placeholder subscription page or Stripe Checkout
    window.location.href = "/subscribe";
  });
});
