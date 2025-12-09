/***************************************************
 * NANI-AI PWA (Supabase Auth + Automatic Trial)
 * Conversational Version — Sends Short History
 ***************************************************/
import { createClient } from '@supabase/supabase-js';

document.addEventListener("DOMContentLoaded", () => {

  // -----------------------------------------------
  // ENV VARS
  // -----------------------------------------------
  const API_SECRET   = import.meta.env.VITE_API_SECRET;
  const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
  const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_KEY;

  console.log("Supabase URL:", SUPABASE_URL);
  console.log("Supabase Key present:", !!SUPABASE_KEY);
  console.log("API_SECRET present:", !!API_SECRET);

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error("Supabase environment variables are missing!");
    return;
  }

  const sb = createClient(SUPABASE_URL, SUPABASE_KEY);
  window.sb = sb;

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

  const trialExpiredBox   = document.getElementById("trial-expired");
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

  function addToHistory(sender, text) {
    conversationHistory.push({ role: sender === "user" ? "user" : "assistant", content: text });
    if (conversationHistory.length > 8) conversationHistory = conversationHistory.slice(-8);
  }
  
  function showInitialMessage() {
    if (hasShownWelcome) return;
    hasShownWelcome = true;

    const msg = `
🌿 Hello! I'm Nani, your natural wellness guide.
Ask me about lifestyle, diet, or wellness tips to get started.
    `;
    appendMessage("nani", msg);
    addToHistory("assistant", msg);
  }
  
  function showTyping() {
    hideTyping();
    typingBubble = document.createElement("div");
    typingBubble.className = "msg-nani";
    typingBubble.innerHTML = `
      <div class="typing-indicator">
        <div class="typing-dots"><div></div><div></div><div></div></div>
      </div>`;
    chatBox.appendChild(typingBubble);
  }

  function hideTyping() {
    typingBubble?.remove();
    typingBubble = null;
  }

  // -----------------------------------------------
  // ACCOUNT BADGES
  // -----------------------------------------------
  // ACCOUNT BADGES
  // -----------------------------------------------
  function setRoleBadge(role) {
    accRoleBadge.className = "role-badge";
    accRoleBadge.textContent = role === "premium" ? "Premium" :
                               role === "trial"   ? "Trial" : "Free";
  }

  function updateSubscriptionUI(info) {
    accEmail.textContent       = session.user.email;
    accSubStatus.textContent   = info.subscribed ? "Premium Active" :
                                info.trial_active ? "Trial Active" : "Free";
    accTrialStatus.textContent = info.trial_active ? "Active" : "Expired";
    accDaysLeft.textContent    = info.days_left ?? "—";

    if (info.subscribed) {
      upgradeBanner.classList.add("hidden");
      trialExpiredBox.classList.add("hidden");
      manageBillingBtn.classList.remove("hidden");
    } else if (info.trial_active) {
      upgradeBanner.classList.remove("hidden");
      trialExpiredBox.classList.add("hidden");
      manageBillingBtn.classList.add("hidden");
    } else {
      upgradeBanner.classList.add("hidden");
      trialExpiredBox.classList.remove("hidden");
      manageBillingBtn.classList.add("hidden");
    }
  }

  // -----------------------------------------------
  // 🔐 BOOTSTRAP USER
  // -----------------------------------------------
  async function bootstrapUser() {
    const { data } = await sb.auth.getSession();
    if (!data.session) {
      showScreen(false);
      return;
    }

    session = data.session;
    accessToken = session.access_token;
    userEmail = session.user.email;

    localStorage.setItem("nani_access_token", accessToken);
    localStorage.setItem("nani_user_email", userEmail);

    try {
      const res = await fetch("https://naturopathy.onrender.com/auth/status", {
        headers: { "X-API-KEY": API_SECRET, "Authorization": `Bearer ${accessToken}` }
      });

      if (!res.ok) throw new Error("auth/status failed");

      const info = await res.json();
      accEmail.textContent = userEmail;
      setRoleBadge(info.role);
      updateSubscriptionUI(info);
      showScreen(true);

      showInitialMessage();

    } catch (err) {
      console.error("Bootstrap failed", err);
      showScreen(true);
      showInitialMessage();
    }
  }

// -----------------------------------------------
// ✅ AUTH INIT (FIXES BLANK SCREEN ISSUE)
// -----------------------------------------------
  async function initAuth() {
	// 1️⃣ Handle restored sessions (Google redirect / refresh)
	const { data } = await sb.auth.getSession();

	if (data.session) {
		await bootstrapUser();
	} else {
		showScreen(false);
	}

	// 2️⃣ Listen for future auth changes
	sb.auth.onAuthStateChange(async (event, newSession) => {
		console.log("Supabase Auth Event:", event);

		if (newSession) {
		await bootstrapUser();
		} else {
		showScreen(false);
		}
	});
  }

  initAuth();
  
  // -----------------------------------------------
  // AUTH HANDLERS
  // -----------------------------------------------
  sendMagicBtn.onclick = async () => {
    const email = magicEmailInput.value.trim();
    if (!email.includes("@")) return alert("Enter valid email");
    await sb.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin }
    });
    alert("Magic link sent");
  };

  googleBtn.onclick = () => {
    sb.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin }
    });
  };

  accLogoutBtn.onclick = async () => {
    await sb.auth.signOut();
  };
  // -----------------------------------------------
  // ACCOUNT PANEL
  // -----------------------------------------------
  accountBtn.addEventListener("click", () => accountPanel.classList.remove("hidden"));
  accCloseBtn.addEventListener("click", () => accountPanel.classList.add("hidden"));

  // -----------------------------------------------
  // UPGRADE FLOW
  // -----------------------------------------------
  function openSubscribeModal() { subscribeModal.classList.remove("hidden"); }
  function closeSubscribeModal() { subscribeModal.classList.add("hidden"); }

  subCancelBtn.onclick = closeSubscribeModal;
  accUpgradeOpen?.addEventListener("click", openSubscribeModal);
  upgradeLink?.addEventListener("click", openSubscribeModal);
  trialSubscribeBtn?.addEventListener("click", openSubscribeModal);

  async function startCheckout(priceId) {
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return alert("Please log in again.");
    const r = await fetch("https://naturopathy.onrender.com/create_checkout_session", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-API-KEY": API_SECRET },
      body: JSON.stringify({ price_id: priceId, user_id: user.id, email: user.email })
    });
    const j = await r.json();
    if (j.checkout_url) window.location.href = j.checkout_url;
    else alert("Checkout failed");
  }

  subMonthlyBtn.onclick = () => { closeSubscribeModal(); startCheckout(STRIPE_MONTHLY_PRICE_ID); };
  subAnnualBtn.onclick  = () => { closeSubscribeModal(); startCheckout(STRIPE_ANNUAL_PRICE_ID); };

  // -----------------------------------------------
  // LOGOUT
  // -----------------------------------------------
  accLogoutBtn.addEventListener("click", async () => {
    await sb.auth.signOut();
    localStorage.clear();
    conversationHistory = [];
    showScreen(false);
    accountPanel.classList.add("hidden");
  });

  // -----------------------------------------------
  // CHAT
  // -----------------------------------------------
  async function sendToNani() {
    const query = inputField.value.trim();
    if (!query) return;

    appendMessage("user", query);
    addToHistory("user", query);
    inputField.value = "";
    showTyping();

    try {
      const res = await fetch("https://naturopathy.onrender.com/fetch_naturopathy_results", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${accessToken}`,
          "X-API-KEY": API_SECRET
        },
        body: JSON.stringify({
          query,
          history: conversationHistory,
          match_threshold: 0.4,
          match_count: 3
        })
      });
      const data = await res.json();
      hideTyping();
      appendMessage("nani", data.summary || "⚠️ Error");
      addToHistory("assistant", data.summary || "");
    } catch {
      hideTyping();
      appendMessage("nani", "⚠️ Network error");
    }
  }

  sendBtn.onclick = sendToNani;
  inputField.onkeypress = e => e.key === "Enter" && sendToNani();

});
