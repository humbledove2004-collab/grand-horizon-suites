// Grand Horizon Suites - Auth & Guest Profile Logic
(function() {
  window.GH = window.GH || {};
  const supabaseClient =
    window.GH.supabase ||
    (typeof supabase !== "undefined" &&
    supabase &&
    supabase.auth &&
    typeof supabase.auth.signInWithPassword === "function"
      ? supabase
      : null);

  const loginForm = document.getElementById("loginForm");
  const registerForm = document.getElementById("registerForm");
  const showRegister = document.getElementById("showRegister");
  const showLogin = document.getElementById("showLogin");
  const authForms = document.getElementById("auth-forms");
  const profileView = document.getElementById("profile-view");
  const userDisplayName = document.getElementById("user-display-name");
  const userDisplayEmail = document.getElementById("user-display-email");
  const bookingHistoryList = document.getElementById("booking-history-list");
  const logoutBtn = document.getElementById("logoutBtn");
  const openAuthBtn = document.getElementById("openAuthModal");

  // --- Form Toggling ---
  if (showRegister) {
    showRegister.addEventListener("click", (e) => {
      e.preventDefault();
      loginForm.style.display = "none";
      registerForm.style.display = "block";
      document.getElementById("authModalTitle").textContent = "Create Account";
    });
  }

  if (showLogin) {
    showLogin.addEventListener("click", (e) => {
      e.preventDefault();
      registerForm.style.display = "none";
      loginForm.style.display = "block";
      document.getElementById("authModalTitle").textContent = "Guest Login";
    });
  }

  // --- Supabase Auth Operations ---
  
  // 1. Registration
  if (registerForm) {
    registerForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const formData = new FormData(registerForm);
      const email = formData.get("email");
      const password = formData.get("password");
      const fullName = formData.get("full_name");

      // --- Email Validation (Regex) ---
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        window.GH.toast("Please enter a valid email address (e.g., name@example.com).", "error", "Invalid Email");
        return;
      }

      const submitBtn = registerForm.querySelector('button[type="submit"]');
      submitBtn.disabled = true;
      submitBtn.textContent = "Creating Account...";

      try {
        if (!supabaseClient) throw new Error("Supabase client failed to initialize.");
        const { data, error } = await supabaseClient.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: fullName }
          }
        });

        if (error) throw error;
        
        window.GH.toast("Account created! Please check your email for confirmation.", "success", "Welcome");
        registerForm.reset();
        showLogin.click();
      } catch (err) {
        window.GH.toast(err.message, "error", "Registration Failed");
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = "Create Account";
      }
    });
  }

  // 2. Login
  if (loginForm) {
    loginForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const formData = new FormData(loginForm);
      const email = formData.get("email");
      const password = formData.get("password");

      // --- Email Validation (Regex) ---
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        window.GH.toast("Please enter a valid email address (e.g., name@example.com).", "error", "Invalid Email");
        return;
      }

      const submitBtn = loginForm.querySelector('button[type="submit"]');
      submitBtn.disabled = true;
      submitBtn.textContent = "Logging in...";

      try {
        if (!supabaseClient) throw new Error("Supabase client failed to initialize.");
        const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
        if (error) throw error;
        
        window.GH.toast("Welcome back!", "success", "Logged In");
        window.GH.closeModal(document.getElementById("authModal"));
        loginForm.reset();
      } catch (err) {
        window.GH.toast(err.message, "error", "Login Failed");
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = "Login";
      }
    });
  }

  // 3. Logout
  if (logoutBtn) {
    logoutBtn.addEventListener("click", async () => {
      if (!supabaseClient) return;
      await supabaseClient.auth.signOut();
      window.GH.toast("You have been logged out.", "success", "Logged Out");
      window.GH.closeModal(document.getElementById("authModal"));
    });
  }

  // --- Auth State Management ---
  
  const updateUIForAuth = async (session) => {
    if (session) {
      const user = session.user;
      authForms.style.display = "none";
      profileView.style.display = "block";
      document.getElementById("authModalTitle").textContent = "Guest Profile";
      
      userDisplayName.textContent = user.user_metadata.full_name || "Guest";
      userDisplayEmail.textContent = user.email;

      // Update navbar button
      if (openAuthBtn) {
        openAuthBtn.innerHTML = `<i class="fas fa-user-check"></i> Profile`;
        openAuthBtn.classList.add("logged-in");
      }

      // Pre-fill booking form
      const bookingForm = document.getElementById("bookingForm");
      if (bookingForm) {
        const nameInput = bookingForm.querySelector('input[name="name"]');
        const emailInput = bookingForm.querySelector('input[name="email"]');
        if (nameInput) nameInput.value = user.user_metadata.full_name || "";
        if (emailInput) emailInput.value = user.email;
      }

      // Load history
      fetchBookingHistory(user.email);
    } else {
      authForms.style.display = "block";
      profileView.style.display = "none";
      document.getElementById("authModalTitle").textContent = "Guest Login";
      
      if (openAuthBtn) {
        openAuthBtn.innerHTML = `<i class="fas fa-user-circle"></i> Guest Profile`;
        openAuthBtn.classList.remove("logged-in");
      }

      // Reset booking form if it was pre-filled
      const bookingForm = document.getElementById("bookingForm");
      if (bookingForm) {
        bookingForm.reset();
      }
    }
  };

  const fetchBookingHistory = async (email) => {
    if (!bookingHistoryList) return;
    bookingHistoryList.innerHTML = '<p style="text-align: center; padding: 10px;"><i class="fas fa-spinner fa-spin"></i> Loading history...</p>';

    try {
      if (!supabaseClient) throw new Error("Supabase client failed to initialize.");
      const { data, error } = await supabaseClient
        .from('contacts')
        .select('*')
        .eq('email', email)
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (data && data.length > 0) {
        bookingHistoryList.innerHTML = data.map(booking => `
          <div class="history-item" style="padding: 10px; border-bottom: 1px solid #eee; margin-bottom: 5px;">
            <div style="display: flex; justify-content: space-between; font-weight: 600;">
              <span>${booking.message ? booking.message.split(':')[0] : 'General Inquiry'}</span>
              <span style="color: var(--secondary);">$${booking.payment_method === 'stripe' ? 'Paid' : 'Requested'}</span>
            </div>
            <div style="color: #666; font-size: 0.8rem; margin-top: 3px;">
              ${new Date(booking.created_at).toLocaleDateString()} • ${booking.guests} Guests
            </div>
          </div>
        `).join('');
      } else {
        bookingHistoryList.innerHTML = '<p style="color: #999; text-align: center; padding: 10px;">No previous bookings found.</p>';
      }
    } catch (err) {
      console.error("Error fetching history:", err);
      bookingHistoryList.innerHTML = '<p style="color: #ff4d4d; text-align: center; padding: 10px;">Could not load history.</p>';
    }
  };

  // Listen for changes
  if (supabaseClient) {
    supabaseClient.auth.onAuthStateChange((event, session) => {
      updateUIForAuth(session);
    });

    // Check initial session
    supabaseClient.auth.getSession().then(({ data: { session } }) => {
      updateUIForAuth(session);
    });
  } else {
    console.error("[GH] Supabase client unavailable on auth page");
  }

  console.log("[GH] Auth Logic loaded");
})();
