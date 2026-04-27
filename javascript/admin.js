// Grand Horizon Suites - Staff Dashboard Logic
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

  const adminLoginForm = document.getElementById("adminLoginForm");
  const adminLoginOverlay = document.getElementById("adminLoginOverlay");
  const staffInfo = document.getElementById("staffInfo");
  const staffName = document.getElementById("staffName");
  const bookingsTableBody = document.getElementById("bookingsTableBody");
  const guestsTableBody = document.getElementById("guestsTableBody");
  const refreshBtn = document.getElementById("refreshBtn");
  const dashboardSettingsForm = document.getElementById("dashboardSettingsForm");
  const settingDisplayName = document.getElementById("settingDisplayName");
  const settingAutoRefresh = document.getElementById("settingAutoRefresh");
  const settingTheme = document.getElementById("settingTheme");
  const settingsStatus = document.getElementById("settingsStatus");
  const replyModal = document.getElementById("replyModal");
  const closeReplyModal = document.getElementById("closeReplyModal");
  const replyForm = document.getElementById("replyForm");
  const confirmBookingBtn = document.getElementById("confirmBookingBtn");
  const rejectBookingBtn = document.getElementById("rejectBookingBtn");
  const fullBookingBtn = document.getElementById("fullBookingBtn");
  const pendingBookingBtn = document.getElementById("pendingBookingBtn");
  let autoRefreshTimer = null;
  let activeSection = "bookings";
  let currentStaffFallbackName = "Staff Member";
  const sectionElements = {
    bookings: document.getElementById("section-bookings"),
    guests: document.getElementById("section-guests"),
    settings: document.getElementById("section-settings"),
  };

  // --- Auth & Access Control ---

  const checkStaffAccess = async (session) => {
    if (session) {
      const user = session.user;
      // In a real app, you would check a custom 'role' field in a 'profiles' table.
      // For this demo, we assume any user logged in to the admin portal is staff.
      adminLoginOverlay.style.display = "none";
      staffInfo.style.display = "block";
      currentStaffFallbackName = user.user_metadata.full_name || "Staff Member";
      staffName.textContent = currentStaffFallbackName;
      loadSettingsUI();
      applyThemeSetting();
      loadBookings();
      loadGuests();
    } else {
      adminLoginOverlay.style.display = "flex";
      staffInfo.style.display = "none";
    }
  };

  if (adminLoginForm) {
    adminLoginForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const formData = new FormData(adminLoginForm);
      const email = formData.get("email");
      const password = formData.get("password");

      const submitBtn = adminLoginForm.querySelector('button[type="submit"]');
      submitBtn.disabled = true;
      submitBtn.textContent = "Authenticating...";

      try {
        if (!supabaseClient) {
          throw new Error("Supabase client failed to initialize. Please refresh and try again.");
        }
        const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
        if (error) throw error;
        
        // After login, checkAccess will handle the UI update
        adminLoginForm.reset();
      } catch (err) {
        alert("Access Denied: " + err.message);
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = "Access Dashboard";
      }
    });
  }

  document.querySelectorAll("[data-admin-logout]").forEach((el) => {
    el.addEventListener("click", async (e) => {
      e.preventDefault();
      if (!supabaseClient) return;
      await supabaseClient.auth.signOut();
    });
  });

  const setActiveSection = (section) => {
    activeSection = section;
    Object.entries(sectionElements).forEach(([key, el]) => {
      if (!el) return;
      el.classList.toggle("active", key === section);
    });
  };

  document
    .querySelectorAll(".admin-nav-item[data-admin-section], .admin-mobile-nav-item[data-admin-section]")
    .forEach((link) => {
      link.addEventListener("click", (e) => {
        e.preventDefault();
        const section = link.getAttribute("data-admin-section");
        if (!section) return;
        document
          .querySelectorAll(".admin-nav-item[data-admin-section], .admin-mobile-nav-item[data-admin-section]")
          .forEach((item) => {
            item.classList.toggle("active", item.getAttribute("data-admin-section") === section);
          });
        setActiveSection(section);
        if (section === "guests") loadGuests();
        if (link.classList.contains("admin-mobile-nav-item")) {
          link.scrollIntoView({ inline: "center", block: "nearest", behavior: "smooth" });
        }
      });
    });

  const loadGuests = async () => {
    if (!guestsTableBody) return;
    guestsTableBody.innerHTML = '<tr><td colspan="4" class="admin-empty-state"><i class="fas fa-spinner fa-spin"></i> Loading guests...</td></tr>';
    try {
      if (!supabaseClient) throw new Error("Supabase client is unavailable.");
      const { data, error } = await supabaseClient
        .from("contacts")
        .select("name,email,guests,created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      if (!data || !data.length) {
        guestsTableBody.innerHTML = '<tr><td colspan="4" class="admin-empty-state">No guests found yet.</td></tr>';
        return;
      }
      const uniqueGuests = [];
      const seenEmails = new Set();
      data.forEach((entry) => {
        const key = entry.email || `${entry.name || "Guest"}-${entry.created_at}`;
        if (seenEmails.has(key)) return;
        seenEmails.add(key);
        uniqueGuests.push(entry);
      });
      guestsTableBody.innerHTML = uniqueGuests.map((guest) => `
        <tr>
          <td>${guest.name || "Guest"}</td>
          <td>${guest.email || "-"}</td>
          <td>${guest.created_at ? new Date(guest.created_at).toLocaleDateString() : "-"}</td>
          <td>${guest.guests || 1}</td>
        </tr>
      `).join("");
    } catch (err) {
      guestsTableBody.innerHTML = `<tr><td colspan="4" class="admin-empty-state">Could not load guests: ${err.message}</td></tr>`;
    }
  };

  const loadSettingsUI = () => {
    if (!dashboardSettingsForm) return;
    const saved = JSON.parse(localStorage.getItem("gh-admin-settings") || "{}");
    settingDisplayName.value = saved.displayName || currentStaffFallbackName;
    settingAutoRefresh.value = saved.autoRefresh || "off";
    settingTheme.value = saved.theme || "default";
    staffName.textContent = settingDisplayName.value || currentStaffFallbackName;
    applyAutoRefreshSetting(saved.autoRefresh || "off");
  };

  const applyThemeSetting = () => {
    if (!settingTheme) return;
    const theme = settingTheme.value;
    const root = document.documentElement;
    if (theme === "emerald") {
      root.style.setProperty("--primary", "#156f63");
      root.style.setProperty("--secondary", "#2a9d8f");
    } else if (theme === "royal") {
      root.style.setProperty("--primary", "#2f2c79");
      root.style.setProperty("--secondary", "#7b5cff");
    } else {
      root.style.setProperty("--primary", "#0a2463");
      root.style.setProperty("--secondary", "#d4af37");
    }
  };

  const applyAutoRefreshSetting = (mode) => {
    if (autoRefreshTimer) clearInterval(autoRefreshTimer);
    if (mode === "on") {
      autoRefreshTimer = setInterval(() => {
        loadBookings();
        if (activeSection === "guests") loadGuests();
      }, 60000);
    }
  };

  if (dashboardSettingsForm) {
    dashboardSettingsForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const settings = {
        displayName: settingDisplayName.value.trim() || currentStaffFallbackName,
        autoRefresh: settingAutoRefresh.value,
        theme: settingTheme.value,
      };
      localStorage.setItem("gh-admin-settings", JSON.stringify(settings));
      staffName.textContent = settings.displayName;
      applyThemeSetting();
      applyAutoRefreshSetting(settings.autoRefresh);
      settingsStatus.textContent = "Settings saved.";
      setTimeout(() => {
        settingsStatus.textContent = "";
      }, 2400);
    });
  }

  // --- Booking Management ---

  const loadBookings = async () => {
    if (!bookingsTableBody) return;
    
    bookingsTableBody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 40px;"><i class="fas fa-spinner fa-spin"></i> Loading...</td></tr>';

    try {
      if (!supabaseClient) throw new Error("Supabase client is unavailable.");
      const { data, error } = await supabaseClient
        .from('contacts')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      updateStats(data);

      if (data && data.length > 0) {
        bookingsTableBody.innerHTML = data.map(booking => `
          <tr data-id="${booking.id}">
            <td>
              <div style="font-weight: 600;">${booking.name}</div>
              <div style="font-size: 0.8rem; color: #666;">${booking.email}</div>
            </td>
            <td>
              ${booking.check_in ? `
                <div style="font-size: 0.9rem;">${new Date(booking.check_in).toLocaleDateString()} - ${new Date(booking.check_out).toLocaleDateString()}</div>
              ` : '<span style="color: #999;">Inquiry only</span>'}
            </td>
            <td style="text-align: center;">${booking.guests || '1'}</td>
            <td>
              <span class="status-badge status-${(booking.status || 'pending').toLowerCase()}">
                ${booking.status || 'pending'}
              </span>
            </td>
            <td>
              <div style="font-size: 0.85rem;">${booking.payment_method === 'stripe' ? '<i class="fab fa-stripe" style="color: #635bff; font-size: 1.2rem;"></i> Paid' : 'Request'}</div>
            </td>
            <td>
              <button class="action-btn reply-btn" title="Respond"><i class="fas fa-reply"></i></button>
              <button class="action-btn delete-btn" title="Delete" style="color: #ff4d4d;"><i class="fas fa-trash"></i></button>
            </td>
          </tr>
        `).join('');

        // Attach event listeners to buttons
        attachTableListeners();
      } else {
        bookingsTableBody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 40px; color: #999;">No bookings found.</td></tr>';
      }
    } catch (err) {
      console.error("Error loading bookings:", err);
      bookingsTableBody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 40px; color: #ff4d4d;">Error loading data.</td></tr>';
    }
  };

  const updateStats = (data) => {
    document.getElementById("statTotal").textContent = data.length;
    document.getElementById("statPending").textContent = data.filter(b => b.status === 'pending').length;
    
    // Simple revenue calculation (Assume $499 per booking if it was a paid Stripe booking)
    const revenue = data
      .filter(b => b.payment_method === 'stripe')
      .length * 499;
    document.getElementById("statRevenue").textContent = `$${revenue.toLocaleString()}`;
  };

  const attachTableListeners = () => {
    document.querySelectorAll('.reply-btn').forEach(btn => {
      btn.onclick = (e) => {
        const row = e.target.closest('tr');
        const id = row.dataset.id;
        openReplyModal(id);
      };
    });

    document.querySelectorAll('.delete-btn').forEach(btn => {
      btn.onclick = async (e) => {
        const row = e.target.closest('tr');
        const id = row.dataset.id;
        if (confirm("Are you sure you want to delete this booking?")) {
          if (!supabaseClient) return;
          const { error } = await supabaseClient.from('contacts').delete().eq('id', id);
          if (error) alert(error.message);
          else loadBookings();
        }
      };
    });
  };

  const openReplyModal = async (id) => {
    if (!supabaseClient) return alert("Supabase client is unavailable.");
    const { data: booking, error } = await supabaseClient.from('contacts').select('*').eq('id', id).single();
    if (error) return alert(error.message);

    document.getElementById("replyBookingId").value = booking.id;
    document.getElementById("replyGuestEmail").value = booking.email;
    document.getElementById("replyGuestName").value = booking.name;
    
    document.getElementById("replyDetails").innerHTML = `
      <strong>Guest:</strong> ${booking.name}<br>
      <strong>Stay:</strong> ${booking.check_in ? `${booking.check_in} to ${booking.check_out}` : 'Inquiry'}<br>
      <strong>Original Message:</strong> <em>"${booking.message || 'No message'}"</em>
    `;

    // Reset form
    document.getElementById("replyMessage").value = "";
    
    replyModal.classList.add("open");
    replyModal.setAttribute("aria-hidden", "false");
  };

  const updateBookingStatus = async (id, status, customMessage = null) => {
    const email = document.getElementById("replyGuestEmail").value;
    const name = document.getElementById("replyGuestName").value;
    const responseText = customMessage || document.getElementById("replyMessage").value;

    if (!responseText && status !== 'pending') {
        alert("Please provide a message for the guest.");
        return;
    }

    try {
      // 1. Send actual email to guest using EmailJS
      if (responseText) {
          await emailjs.send("service_sa1ub8k", "template_f7bfksd", {
            to_name: name,
            to_email: email,
            from_name: "Grand Horizon Suites Staff",
            message: responseText,
            reply_to: "humbledove2004@gmail.com"
          });
      }

      // 2. Update database
      if (!supabaseClient) throw new Error("Supabase client is unavailable.");
      const { error } = await supabaseClient
        .from('contacts')
        .update({ 
            replied: true, 
            status: status 
        })
        .eq('id', id);

      if (error) throw error;

      alert(`Booking ${status} successfully!`);
      closeReplyModal.onclick();
      loadBookings();
    } catch (err) {
      alert("Error: " + err.message);
    }
  };

  if (closeReplyModal) {
    closeReplyModal.onclick = () => {
      replyModal.classList.remove("open");
      replyModal.setAttribute("aria-hidden", "true");
    };
  }

  if (replyForm) {
    replyForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const id = document.getElementById("replyBookingId").value;
      await updateBookingStatus(id, 'replied');
    });
  }

  if (confirmBookingBtn) {
    confirmBookingBtn.onclick = async () => {
      const id = document.getElementById("replyBookingId").value;
      const name = document.getElementById("replyGuestName").value;
      const msg = `Dear ${name}, we are pleased to confirm your booking at Grand Horizon Suites. We look forward to welcoming you!`;
      await updateBookingStatus(id, 'confirmed', msg);
    };
  }

  if (rejectBookingBtn) {
    rejectBookingBtn.onclick = async () => {
      const id = document.getElementById("replyBookingId").value;
      const name = document.getElementById("replyGuestName").value;
      const msg = `Dear ${name}, unfortunately we are unable to fulfill your booking request at this time. We apologize for any inconvenience.`;
      if (confirm("Send rejection email to guest?")) {
        await updateBookingStatus(id, 'rejected', msg);
      }
    };
  }

  if (fullBookingBtn) {
    fullBookingBtn.onclick = async () => {
      const id = document.getElementById("replyBookingId").value;
      const name = document.getElementById("replyGuestName").value;
      const msg = `Dear ${name}, thank you for your interest. Unfortunately, the hotel is fully booked for your selected dates. Please try other dates.`;
      await updateBookingStatus(id, 'full', msg);
    };
  }

  if (pendingBookingBtn) {
    pendingBookingBtn.onclick = async () => {
      const id = document.getElementById("replyBookingId").value;
      await updateBookingStatus(id, 'pending', "Your request is currently being reviewed by our concierge team.");
    };
  }

  if (refreshBtn) {
    refreshBtn.onclick = () => loadBookings();
  }

  // --- Auth State Change Listener ---
  if (supabaseClient) {
    supabaseClient.auth.onAuthStateChange((event, session) => {
      checkStaffAccess(session);
    });

    // Check initial session
    supabaseClient.auth.getSession().then(({ data: { session } }) => {
      checkStaffAccess(session);
    });
  } else {
    console.error("[GH] Supabase client unavailable on admin page");
  }

  console.log("[GH] Admin Logic loaded");
})();
