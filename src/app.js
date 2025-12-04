/***************************************************
 * NANI PWA (Supabase Auth + Automatic Trial)
 * Conversational Version — Sends Short History
 ***************************************************/

document.addEventListener("DOMContentLoaded", () => {

  // -----------------------------------------------
  // ENV VARS (Vite → Vercel)
  // -----------------------------------------------
  const API_SECRET = import.meta.env.VITE_API_SECRET;
  const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
  const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_KEY;

  const sb = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

  // Stripe Price IDs (PRODUCTION)
  const STRIPE_MONTHLY_PRICE_ID = "price_1SWNgmQZiiSZQI7eU1dUbHez";
  const STRIPE_ANNUAL_PRICE_ID  = "price_1SWNgmQZiiSZQI7eSqTsjwhm";


  // -----------------------------------------------
  // DOM ELEMENTS
  // -----------------------------------------------
  const welcomeScreen    = document.getElementById("welcome-screen");
  const chatApp          = document.getElementById("chat-app");

  const magicEmailInput  = document.getElementById("magic-email");
  const sendMagicBtn     = document.getElementById("send-magic-btn");
  const googleBtn        = document.getElementById("google-btn");

  const chatBox          = document.getElementById("nani-chat-box");
  const inputField       = document.getElementById("nani-input");
  const sendBtn          = document.getElementById("nani-send-btn");

  const accountBtn       = document.getElementById("account-btn");
  const accountPanel     = document.getElementById("account-panel");

  const accEmail         = document.getElementById("acc-email");
  const accTrialStatus   = document.getElementById("acc-trial-status");
  const accDaysLeft      = document.getElementById("acc-days-left");
  const accSubStatus     = document.getElementById("acc-sub-status");
  const accRoleBadge     = document.getElementById("acc-role-badge");

  const accUpgradeBlock  = document.getElementById("acc-upgrade-block");
  const accUpgradeOpen   = document.getElementById("acc-upgrade-open");

  const manageBillingBtn = document.getElementById("manage-billing-btn");
  const accLogoutBtn     = document.getElementById("acc-logout-btn");
  const accCloseBtn      = document.getElementById("acc-close");

  const upgradeBanner    = document.getElementById("upgrade-banner");
  const upgradeLink      = document.getElementById("upgrade-link");

  const trialExpiredBox  = document.getElementById("trial-expired");
  const trialSubscribeBtn = document.getElementById("subscribe-btn");

  const subscribeModal   = document.getElementById("subscribe-modal");
  const subMonthlyBtn    = document.getElementById("sub-monthly");
  const subAnnualBtn     = document.getElementById("sub-annual");
  const subCancelBtn     = document.getElementById("sub-cancel");


  // -----------------------------------------------
  // STATE
  // -----------------------------------------------
  let session = null;
  let accessToken = null;
  let userEmail = null;
  let typingBubble = null;

  // Short in-browser conversation memory:
  // [{ role: "user" | "assistant", content: string }, ...]
  let conversationHistory = [];


  // -----------------------------------------------
  // HELPERS
  // -----------------------------------------------
  function showScreen(authed) {
    welcomeScreen.style.display = authed ? "none" : "block";
    chatApp.style.display       = authed ? "block" : "none";
  }

  function appendMessage(sender, text) {
    const wrapper = document.createElement("div");
    wrapper.className = sender === "user" ? "msg-user" : "msg-nani";
    wrapper.innerHTML = `<div class="bubble">${text.replace(/\n/g, "<br>")}</div>`;
    chatBox.appendChild(wrapper);
    chatBox.scrollTop = chatBox.scrollHeight;
  }

  function showTyping() {
    hideTyping();
    typingBubble = document.createElement("div");
    typingBubble.className = "msg-nani";
    typingBubble.innerHTML = `
      <div class="typing-indicator">
        <div class="typing-dots">
          <div></div><div></div><div></div>
        </div>
      </div>`;
    chatBox.appendChild(typingBubble);
    chatBox.scrollTop = chatBox.scrollHeight;
  }

  function hideTyping() {
    if (typingBubble) {
      typingBubble.remove();
      typingBubble = null;
    }
  }

  function setRoleBadge(role) {
    accRoleBadge.classList.remove("premium", "trial", "free");

    if (role === "premium") {
      accRoleBadge.textContent = "Premium";
      accRoleBadge.classList.add("premium");
    } else if (role === "trial") {
      accRoleBadge.textContent = "Trial";
      accRoleBadge.classList.add("trial");
    } else {
      accRoleBadge.textContent = "Free";
      accRoleBadge.classList.add("free");
    }
  }

  // Keep last few turns only (to avoid huge payloads)
  function addToHistory(sender, text) {
    conversationHistory.push({ role: sender === "user" ? "user" : "assistant", content: text });
    if (conversationHistory.length > 8) {
      conversationHistory = conversationHistory.slice(-8);
    }
  }


  // -----------------------------------------------
  // UPDATE SUBSCRIPTION UI
  // -----------------------------------------------
  function updateSubscriptionUI(info) {
    const isSubscribed = info.subscribed === true;
    const trialActive  = info.trial_active === true;

    accSubStatus.textContent   = isSubscribed ? "Premium Active" : (trialActive ? "Trial Active" : "Free");
    accTrialStatus.textContent = trialActive ? "Active" : "Expired";
    accDaysLeft.textContent    = info.days_left;

    // Hide/Show upgrade areas
    if (isSubscribed) {
      accUpgradeBlock.classList.add("hidden");
      upgradeBanner.classList.add("hidden");
      trialExpiredBox.classList.add("hidden");
      manageBillingBtn.classList.remove("hidden");

    } else if (trialActive) {
      accUpgradeBlock.classList.remove("hidden");
      upgradeBanner.classList.remove("hidden");
      manageBillingBtn.classList.add("hidden");
      trialExpiredBox.classList.add("hidden");

    } else {
      accUpgradeBlock.classList.remove("hidden");
      manageBillingBtn.classList.add("hidden");
      upgradeBanner.classList.add("hidden");
      trialExpiredBox.classList.remove("hidden");
    }
  }


  // -----------------------------------------------
  // SUBSCRIBE MODAL CONTROL
  // -----------------------------------------------
  function openSubscribeModal() {
    subscribeModal.classList.remove("hidden");
  }

  function closeSubscribeModal() {
    subscribeModal.classList.add("hidden");
  }

  subCancelBtn.addEventListener("click", closeSubscribeModal);


  // -----------------------------------------------
  // LOAD EXISTING SESSION
  // -----------------------------------------------
  async function loadSession() {
    const { data } = await sb.auth.getSession();

    if (data.session) {
      session = data.session;
      accessToken = session.access_token;
      userEmail = session.user.email;

      localStorage.setItem("nani_access_token", accessToken);
      localStorage.setItem("nani_user_email", userEmail);

      showScreen(true);
    } else {
      showScreen(false);
    }
  }

  loadSession();


  // -----------------------------------------------
  // AUTH: MAGIC LINK
  // -----------------------------------------------
  sendMagicBtn.addEventListener("click", async () => {
    const email = magicEmailInput.value.trim();
    if (!email.includes("@")) {
      alert("Enter a valid email");
      return;
    }

    sendMagicBtn.textContent = "Sending...";

    const { error } = await sb.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin }
    });

    sendMagicBtn.textContent = "Send One-Time Login Link";

    if (error) alert(error.message);
    else alert("Magic link sent. Check your inbox.");
  });


  // -----------------------------------------------
  // AUTH: GOOGLE
  // -----------------------------------------------
  googleBtn.addEventListener("click", async () => {
    await sb.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin }
    });
  });


  // -----------------------------------------------
  // AUTH STATE CHANGE
  // -----------------------------------------------
  sb.auth.onAuthStateChange((_event, newSession) => {
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
  // STRIPE CHECKOUT FLOW
  // -----------------------------------------------
  async function startCheckout(priceId) {
    const { data: { user } } = await sb.auth.getUser();
    if (!user) {
      alert("Please log in again.");
      return;
    }

    const response = await fetch("https://naturopathy.onrender.com/create_checkout_session", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-KEY": API_SECRET
      },
      body: JSON.stringify({
        price_id: priceId,
        email: user.email,
        user_id: user.id
      })
    });

    const data = await response.json();

    if (data.checkout_url) {
      window.location.href = data.checkout_url;
    } else {
      console.error(data);
      alert("Checkout could not start.");
    }
  }


  // -----------------------------------------------
  // ACCOUNT PANEL OPEN
  // -----------------------------------------------
  accountBtn.addEventListener("click", async () => {
    if (!accessToken) {
      accountPanel.classList.remove("hidden");
      return;
    }

    const res = await fetch("https://naturopathy.onrender.com/auth/status", {
      headers: {
        "X-API-KEY": API_SECRET,
        "Authorization": `Bearer ${accessToken}`
      }
    });

    const info = await res.json();

    accEmail.textContent = userEmail;
    setRoleBadge(info.role);
    updateSubscriptionUI(info);

    accountPanel.classList.remove("hidden");
  });

  accCloseBtn.addEventListener("click", () => {
    accountPanel.classList.add("hidden");
  });


  // -----------------------------------------------
  // PREMIUM UPGRADE BUTTON → OPEN MODAL
  // -----------------------------------------------
  accUpgradeOpen.addEventListener("click", openSubscribeModal);
  upgradeLink.addEventListener("click", openSubscribeModal);
  trialSubscribeBtn.addEventListener("click", openSubscribeModal);


  // -----------------------------------------------
  // SUBSCRIPTION CHOICES
  // -----------------------------------------------
  subMonthlyBtn.addEventListener("click", () => {
    closeSubscribeModal();
    startCheckout(STRIPE_MONTHLY_PRICE_ID);
  });

  subAnnualBtn.addEventListener("click", () => {
    closeSubscribeModal();
    startCheckout(STRIPE_ANNUAL_PRICE_ID);
  });


  // -----------------------------------------------
  // MANAGE BILLING (Premium Only)
  // -----------------------------------------------
  manageBillingBtn.addEventListener("click", async () => {
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return;

    const res = await fetch("https://naturopathy.onrender.com/create_customer_portal", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-KEY": API_SECRET
      },
      body: JSON.stringify({ user_id: user.id })
    });

    const data = await res.json();

    if (data.url) {
      window.location.href = data.url;
    } else {
      alert("Unable to open billing portal.");
    }
  });


  // -----------------------------------------------
  // LOGOUT
  // -----------------------------------------------
  accLogoutBtn.addEventListener("click", async () => {
    await sb.auth.signOut();
    localStorage.clear();
    conversationHistory = []; // reset conversation on logout
    showScreen(false);
    accountPanel.classList.add("hidden");
  });


  // -----------------------------------------------
  // SEND MESSAGE → NANI (CONVERSATIONAL)
  // -----------------------------------------------
  async function sendToNani() {
    const query = inputField.value.trim();
    if (!query) return;

    if (!accessToken) {
      appendMessage("nani", "⚠️ Please sign in again.");
      return;
    }

    // Show user bubble
    appendMessage("user", query);
    inputField.value = "";

    // For this request, send ONLY previous turns.
    // We'll append this new Q + response to history AFTER the call.
    const historyPayload = conversationHistory.slice();

    showTyping();

    try {
      const res = await fetch("https://naturopathy.onrender.com/fetch_naturopathy_results", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-API-KEY": API_SECRET,
          "Authorization": `Bearer ${accessToken}`
        },
        body: JSON.stringify({
          query,
          match_threshold: 0.4,
          match_count: 3,
          history: historyPayload
        })
      });

      const data = await res.json();
      hideTyping();

      if (data.error) {
        appendMessage("nani", "⚠️ " + data.error);
      } else {
        appendMessage("nani", data.summary);

        // Now that round-trip is done, update conversation memory
        addToHistory("user", query);
        addToHistory("assistant", data.summary);
      }

    } catch (err) {
      hideTyping();
      appendMessage("nani", "⚠️ Network error. Try again.");
    }
  }

  sendBtn.addEventListener("click", sendToNani);
  inputField.addEventListener("keypress", e => {
    if (e.key === "Enter") sendToNani();
  });

});
