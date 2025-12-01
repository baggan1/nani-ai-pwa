/***************************************************
 * NANI-AI PWA (Supabase Auth + Automatic Trial)
 * Updated: Stripe checkout + upgrade banner
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
  const accSubscribeBtn = document.getElementById("acc-subscribe-btn");
  const accCloseBtn = document.getElementById("acc-close");

  const upgradeBanner = document.getElementById("upgrade-banner");
  const upgradeLink = document.getElementById("upgrade-link");
  
  const manageBillingBtn = document.getElementById("manage-billing-btn");


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

  // -----------------------------------------------
  // LOGIN: GOOGLE
  // -----------------------------------------------
  googleBtn.addEventListener("click", async () => {
    try {
      await sb.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: window.location.origin },
      });
    } catch {
      alert("Google login failed.");
    }
  });

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
 async function startCheckout() {
  const { data: { user } } = await sb.auth.getUser();

  if (!user) {
    alert("Please sign in again.");
    return;
  }

  const email = user.email;
  const user_id = user.id;

  if (!email || !user_id) {
    alert("Missing user information. Please re-login.");
    return;
  }

  const res = await fetch("https://naturopathy.onrender.com/create_checkout_session", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-KEY": API_SECRET
    },
    body: JSON.stringify({
      price_id: "price_1SWMZ5HrqVgKycWRnBd7IGOU",
      email,
      user_id
    })
  });

  const data = await res.json();

  if (data.checkout_url) {
    window.location.href = data.checkout_url;
  } else {
    alert("Checkout error: " + (data.detail || "Try again."));
  }
 }


  // ------------------------------------------------
  // UPDATE UI FOR TRIAL / SUBSCRIPTION
  // ------------------------------------------------
  function updateSubscriptionUI(info) {
    const subscribed = info.subscribed === true;
    const trialActive = info.trial_active === true;

    // Account panel text
    accSubStatus.textContent = subscribed ? "Premium Active" : "Not Subscribed";
    accTrialStatus.textContent = trialActive ? "Active" : "Expired";
    accDaysLeft.textContent = info.days_left;

    // Show subscribe button only if not subscribed
    if (!subscribed) {
      accSubscribeBtn.classList.remove("hidden");
    } else {
      accSubscribeBtn.classList.add("hidden");
    }

    // Upgrade banner (soft CTA)
    if (!subscribed && trialActive) {
      upgradeBanner.classList.remove("hidden");
    } else {
      upgradeBanner.classList.add("hidden");
    }
	
	// Manage Billing
	if (info.subscribed) {
		manageBillingBtn.classList.remove("hidden");
	} else {
		manageBillingBtn.classList.add("hidden");
	}
 }
  // ------------------------------------------------
  // ACCOUNT PANEL
  // ------------------------------------------------
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

  accCloseBtn.addEventListener("click", () => {
    accountPanel.classList.add("hidden");
  });

  // Stripe checkout from account panel
  accSubscribeBtn.addEventListener("click", startCheckout);

  // Stripe checkout from banner
  if (upgradeLink) {
    upgradeLink.addEventListener("click", startCheckout);
  }

//Manage Billing Button
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
          "Authorization": `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          query,
          match_threshold: 0.4,
          match_count: 3,
        }),
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

  sendBtn.addEventListener("click", sendToNani);
  inputField.addEventListener("keypress", e => {
    if (e.key === "Enter") sendToNani();
  });

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
