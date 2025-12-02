/***************************************************
 * NANI-AI PWA (Supabase Auth + Automatic Trial)
 * Updated: Stripe checkout + unified subscription modal
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

  const accountBtn = document.getElementById("account-btn");
  const accountPanel = document.getElementById("account-panel");
  const accEmail = document.getElementById("acc-email");
  const accTrialStatus = document.getElementById("acc-trial-status");
  const accDaysLeft = document.getElementById("acc-days-left");
  const accSubStatus = document.getElementById("acc-sub-status");
  const accCloseBtn = document.getElementById("acc-close");

  const upgradeBanner = document.getElementById("upgrade-banner");
  const upgradeLink = document.getElementById("upgrade-link");

  const accRoleBadge = document.getElementById("acc-role-badge");
  const accUpgradeBlock = document.getElementById("acc-upgrade-block");
  const accUpgradeMonthly = document.getElementById("acc-upgrade-monthly");
  const accUpgradeAnnual = document.getElementById("acc-upgrade-annual");
  const manageBillingBtn = document.getElementById("manage-billing-btn");
  const accLogoutBtn = document.getElementById("acc-logout-btn");
  const trialExpiredBox = document.getElementById("trial-expired");
  const trialExpiredSubscribeBtn = document.getElementById("subscribe-btn");

  // Subscription modal
  const subscribeModal = document.getElementById("subscribe-modal");
  const subMonthlyBtn = document.getElementById("sub-monthly");
  const subAnnualBtn = document.getElementById("sub-annual");
  const subCancelBtn = document.getElementById("sub-cancel");

  // Stripe Prices (LIVE)
  const STRIPE_MONTHLY_PRICE_ID = "price_1SWNgmQZiiSZQI7eU1dUbHez";
  const STRIPE_ANNUAL_PRICE_ID = "price_1SWNgmQZiiSZQI7eSqTsjwhm";

  // -----------------------------------------------
  // STATE
  // -----------------------------------------------
  let session = null;
  let accessToken = null;
  let userEmail = null;

  // Typing indicator
  let typingBubble = null;

  // -----------------------------------------------
  // HELPERS
  // -----------------------------------------------
  function showScreen(isAuthed) {
    welcomeScreen.style.display = isAuthed ? "none" : "block";
    chatApp.style.display = isAuthed ? "block" : "none";
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
        <div class="typing-dots"><div></div><div></div><div></div></div>
      </div>
    `;
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
    if (!accRoleBadge) return;

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

  // Update Subscription UI — info comes from /auth/status
  function updateSubscriptionUI(info) {
    const subscribed = info.subscribed === true;
    const trialActive = info.trial_active === true;

    // Role badge
    setRoleBadge(subscribed ? "premium" : trialActive ? "trial" : "free");

    // Text
    accSubStatus.textContent = subscribed
      ? "Premium Active"
      : trialActive
      ? "Free Trial"
      : "Free";
    accTrialStatus.textContent = trialActive ? "Active" : "Expired";
    accDaysLeft.textContent = info.days_left;

    if (subscribed) {
      // ⭐ PREMIUM USER
      if (accUpgradeBlock) accUpgradeBlock.classList.add("hidden");
      if (manageBillingBtn) manageBillingBtn.classList.remove("hidden");
      if (upgradeBanner) upgradeBanner.classList.add("hidden");
      if (trialExpiredBox) trialExpiredBox.classList.add("hidden");
    } else {
      // ⭐ FREE or TRIAL USER
      if (accUpgradeBlock) accUpgradeBlock.classList.remove("hidden");
      if (manageBillingBtn) manageBillingBtn.classList.add("hidden");

      if (trialActive) {
        // Trial user → soft upsell banner
        if (upgradeBanner) upgradeBanner.classList.remove("hidden");
        if (trialExpiredBox) trialExpiredBox.classList.add("hidden");
      } else {
        // Trial ended → show hard gate
        if (upgradeBanner) upgradeBanner.classList.add("hidden");
        if (trialExpiredBox) trialExpiredBox.classList.remove("hidden");
      }
    }
  }

  // -----------------------------------------------
  // SUBSCRIPTION MODAL CONTROLS
  // -----------------------------------------------
  function openSubscribeModal() {
    if (subscribeModal) {
      subscribeModal.classList.remove("hidden");
    }
  }

  function closeSubscribeModal() {
    if (subscribeModal) {
      subscribeModal.classList.add("hidden");
    }
  }

  if (subCancelBtn) {
    subCancelBtn.addEventListener("click", closeSubscribeModal);
  }

  // ------------------------------------------------
  // LEARN SESSION IF ALREADY LOGGED IN
  // ------------------------------------------------
  async function loadExistingSession() {
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

  loadExistingSession();

  // -----------------------------------------------
  // LOGIN: MAGIC LINK
  // -----------------------------------------------
  if (sendMagicBtn) {
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
          options: { emailRedirectTo: window.location.origin }
        });

        if (error) alert("Error: " + error.message);
        else alert("Magic link sent! Check your email.");
      } catch {
        alert("Failed to send magic link.");
      }

      sendMagicBtn.innerText = "Send One-Time Login Link";
    });
  }

  // -----------------------------------------------
  // LOGIN: GOOGLE
  // -----------------------------------------------
  if (googleBtn) {
    googleBtn.addEventListener("click", async () => {
      try {
        await sb.auth.signInWithOAuth({
          provider: "google",
          options: { redirectTo: window.location.origin }
        });
      } catch {
        alert("Google login failed.");
      }
    });
  }

  // -----------------------------------------------
  // AUTH STATE CHANGE
  // -----------------------------------------------
  sb.auth.onAuthStateChange(async (_event, newSession) => {
    if (newSession) {
      session = newSession;
      accessToken = newSession.access_token;
      userEmail = newSession.user.email;

      localStorage.setItem("nani_access_token", accessToken);
      localStorage.setItem("nani_user_email", userEmail);

      showScreen(true);
    }
  });

  // ------------------------------------------------
  // STRIPE: Start checkout
  // ------------------------------------------------
  async function startCheckout(priceId) {
    const { data: { user } } = await sb.auth.getUser();
    if (!user) {
      alert("Please sign in again.");
      return;
    }

    const email = user.email;
    const userId = user.id;

    if (!priceId) {
      priceId = STRIPE_MONTHLY_PRICE_ID;
    }

    const res = await fetch("https://naturopathy.onrender.com/create_checkout_session", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-KEY": API_SECRET
      },
      body: JSON.stringify({
        price_id: priceId,
        email,
        user_id: userId
      })
    });

    const data = await res.json();
    if (data.checkout_url) {
      window.location.href = data.checkout_url;
    } else {
      alert("Checkout error. Try again.");
    }
  }

  // ------------------------------------------------
  // ACCOUNT PANEL
  // ------------------------------------------------
  if (accountBtn) {
    accountBtn.addEventListener("click", async () => {
      if (!accessToken) {
        accEmail.textContent = "Not logged in";
        accountPanel.classList.remove("hidden");
        return;
      }

      const res = await fetch("https://naturopathy.onrender.com/auth/status", {
        headers: {
          "X-API-KEY": API_SECRET,
          "Authorization": `Bearer ${accessToken}`
        }
      });

      const data = await res.json();

      accEmail.textContent = userEmail;
      updateSubscriptionUI(data);

      accountPanel.classList.remove("hidden");
    });
  }

  if (accCloseBtn) {
    accCloseBtn.addEventListener("click", () => {
      accountPanel.classList.add("hidden");
    });
  }

  // Account panel upgrade buttons → open modal
  if (accUpgradeMonthly) {
    accUpgradeMonthly.addEventListener("click", openSubscribeModal);
  }
  if (accUpgradeAnnual) {
    accUpgradeAnnual.addEventListener("click", openSubscribeModal);
  }

  // Soft banner Subscribe → modal
  if (upgradeLink) {
    upgradeLink.addEventListener("click", openSubscribeModal);
  }

  // Trial expired Subscribe → modal
  if (trialExpiredSubscribeBtn) {
    trialExpiredSubscribeBtn.addEventListener("click", openSubscribeModal);
  }

  // Modal buttons → Stripe checkout
  if (subMonthlyBtn) {
    subMonthlyBtn.addEventListener("click", () => {
      closeSubscribeModal();
      startCheckout(STRIPE_MONTHLY_PRICE_ID);
    });
  }

  if (subAnnualBtn) {
    subAnnualBtn.addEventListener("click", () => {
      closeSubscribeModal();
      startCheckout(STRIPE_ANNUAL_PRICE_ID);
    });
  }

  // Manage Billing Button
  if (manageBillingBtn) {
    manageBillingBtn.addEventListener("click", async () => {
      const { data: { user } } = await sb.auth.getUser();
      if (!user) {
        alert("Please sign in again.");
        return;
      }

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
  }

  // User Account Logout Button (single, clean handler)
  if (accLogoutBtn) {
    accLogoutBtn.addEventListener("click", async () => {
      try {
        await sb.auth.signOut();
      } catch (e) {
        console.error("Logout error", e);
      }
      localStorage.removeItem("nani_access_token");
      localStorage.removeItem("nani_user_email");
      accessToken = null;
      userEmail = null;
      showScreen(false);      // back to welcome screen
      accountPanel.classList.add("hidden");
    });
  }

  // -----------------------------------------------
  // FETCH RESULTS / SEND CHAT MESSAGE
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
          match_count: 3
        })
      });

      const data = await res.json();
      hideTyping();

      if (data.error) {
        appendMessage("nani", "⚠️ " + data.error);
      } else {
        appendMessage("nani", data.summary);
      }
    } catch {
      hideTyping();
      appendMessage("nani", "⚠️ Network error. Try again.");
    }
  }

  if (sendBtn) {
    sendBtn.addEventListener("click", sendToNani);
  }
  if (inputField) {
    inputField.addEventListener("keypress", e => {
      if (e.key === "Enter") sendToNani();
    });
  }

  // -----------------------------------------------
  // SEASONAL THEME
  // -----------------------------------------------
  function applyTheme() {
    if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
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
