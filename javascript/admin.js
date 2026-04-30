// Grand Horizon Suites - Staff Dashboard Logic
(function () {
  window.GH = window.GH || {};
  
  // Robust client retrieval
  const getSupabaseClient = () => {
    if (window.GH.supabase) return window.GH.supabase;
    if (typeof initSupabase === "function") return initSupabase();
    if (typeof supabase !== "undefined" && typeof supabase.createClient === "function") {
      // Last resort fallback
      return window.GH.supabase || null; 
    }
    return null;
  };

  const supabaseClient = getSupabaseClient();
  // Initialize EmailJS
  if (typeof emailjs !== "undefined") {
    emailjs.init("y9d96UEHknNtrLrDe");
  }
  const adminLoginForm = document.getElementById("adminLoginForm");
  const adminLoginOverlay = document.getElementById("adminLoginOverlay");
  const staffInfo = document.getElementById("staffInfo");
  const staffName = document.getElementById("staffName");
  const bookingsTableBody = document.getElementById("bookingsTableBody");
  const guestsTableBody = document.getElementById("guestsTableBody");
  const refreshBtn = document.getElementById("refreshBtn");
  const dashboardSettingsForm = document.getElementById(
    "dashboardSettingsForm",
  );
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
  const newsletterTableBody = document.getElementById("newsletterTableBody");

  const sectionElements = {
    bookings: document.getElementById("section-bookings"),
    guests: document.getElementById("section-guests"),
    newsletter: document.getElementById("section-newsletter"),
    settings: document.getElementById("section-settings"),
  };

  let autoRefreshTimer = null;
  let activeSection = "bookings";
  let currentStaffFallbackName = "Staff Member";
  const getStatusDisplayText = (status) => {
    const statusMap = {
      pending: "Pending Review",
      confirmed: "Confirmed",
      rejected: "Rejected",
      full: "Hotel Full",
      replied: "Replied",
    };
    return statusMap[status] || status;
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
      updateDashboardDate();
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
        if (!supabaseClient || !supabaseClient.auth) {
          throw new Error(
            "Supabase client is not fully initialized. Please ensure your configuration is correct and you have an internet connection.",
          );
        }
        
        const { data, error } = await supabaseClient.auth.signInWithPassword({
          email,
          password,
        });
        
        if (error) {
          // Check for common connection issues
          if (error.message.includes("fetch")) {
            throw new Error("Connection failed. This may be due to a slow network, an ad-blocker, or the database being temporarily unreachable.");
          }
          throw error;
        }

        // After login, checkAccess will handle the UI update
        adminLoginForm.reset();
      } catch (err) {
        console.error("Admin Login Error:", err);
        alert("Access Denied: " + (err.message || "An unknown error occurred during authentication."));
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
    .querySelectorAll(
      ".admin-nav-item[data-admin-section], .admin-mobile-nav-item[data-admin-section]",
    )
    .forEach((link) => {
      link.addEventListener("click", (e) => {
        e.preventDefault();
        const section = link.getAttribute("data-admin-section");
        if (!section) return;
        document
          .querySelectorAll(
            ".admin-nav-item[data-admin-section], .admin-mobile-nav-item[data-admin-section]",
          )
          .forEach((item) => {
            item.classList.toggle(
              "active",
              item.getAttribute("data-admin-section") === section,
            );
          });
        setActiveSection(section);
        if (section === "guests") loadGuests();
        if (section === "newsletter") loadNewsletter();
        if (link.classList.contains("admin-mobile-nav-item")) {
          link.scrollIntoView({
            inline: "center",
            block: "nearest",
            behavior: "smooth",
          });
        }
      });
    });

  const loadGuests = async () => {
    if (!guestsTableBody) return;
    guestsTableBody.innerHTML =
      '<tr><td colspan="4" class="admin-empty-state"><i class="fas fa-spinner fa-spin"></i> Loading guests...</td></tr>';
    try {
      if (!supabaseClient) throw new Error("Supabase client is unavailable.");
      const { data, error } = await supabaseClient
        .from("contacts")
        .select("name,email,guests,created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      if (!data || !data.length) {
        guestsTableBody.innerHTML =
          '<tr><td colspan="4" class="admin-empty-state">No guests found yet.</td></tr>';
        return;
      }
      const uniqueGuests = [];
      const seenEmails = new Set();
      data.forEach((entry) => {
        const key =
          entry.email || `${entry.name || "Guest"}-${entry.created_at}`;
        if (seenEmails.has(key)) return;
        seenEmails.add(key);
        uniqueGuests.push(entry);
      });
      guestsTableBody.innerHTML = uniqueGuests
        .map(
          (guest) => `
        <tr>
          <td>${guest.name || "Guest"}</td>
          <td>${guest.email || "-"}</td>
          <td>${guest.created_at ? new Date(guest.created_at).toLocaleDateString() : "-"}</td>
          <td>${guest.guests || 1}</td>
        </tr>
      `,
        )
        .join("");
    } catch (err) {
      guestsTableBody.innerHTML = `<tr><td colspan="4" class="admin-empty-state">Could not load guests: ${err.message}</td></tr>`;
    }
  };

  const loadNewsletter = async () => {
    if (!newsletterTableBody) return;
    newsletterTableBody.innerHTML =
      '<tr><td colspan="3" class="admin-empty-state"><i class="fas fa-spinner fa-spin"></i> Loading subscribers...</td></tr>';

    try {
      if (!supabaseClient) throw new Error("Supabase client is unavailable.");
      const { data, error } = await supabaseClient
        .from("subscribers")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      if (!data || !data.length) {
        newsletterTableBody.innerHTML =
          '<tr><td colspan="3" class="admin-empty-state">No subscribers yet.</td></tr>';
        return;
      }

      newsletterTableBody.innerHTML = data
        .map(
          (sub) => `
        <tr>
          <td>${sub.email}</td>
          <td>${new Date(sub.created_at).toLocaleDateString()}</td>
          <td>
            <button class="action-btn delete-sub-btn" data-email="${sub.email}" title="Remove"><i class="fas fa-user-minus"></i></button>
          </td>
        </tr>
      `,
        )
        .join("");

      // Attach delete listeners
      document.querySelectorAll(".delete-sub-btn").forEach((btn) => {
        btn.onclick = async () => {
          const email = btn.dataset.email;
          if (confirm(`Remove ${email} from newsletter?`)) {
            const { error } = await supabaseClient
              .from("subscribers")
              .delete()
              .eq("email", email);
            if (error) alert(error.message);
            else loadNewsletter();
          }
        };
      });
    } catch (err) {
      newsletterTableBody.innerHTML = `<tr><td colspan="3" class="admin-empty-state">Could not load newsletter: ${err.message}</td></tr>`;
    }
  };

  const loadSettingsUI = () => {
    if (!dashboardSettingsForm) return;
    const saved = JSON.parse(localStorage.getItem("gh-admin-settings") || "{}");
    settingDisplayName.value = saved.displayName || currentStaffFallbackName;
    settingAutoRefresh.value = saved.autoRefresh || "off";
    settingTheme.value = saved.theme || "default";
    staffName.textContent =
      settingDisplayName.value || currentStaffFallbackName;
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
        if (activeSection === "newsletter") loadNewsletter();
      }, 60000);
    }
  };

  const updateDashboardDate = () => {
    const dateEl = document.getElementById("currentDateDisplay");
    if (!dateEl) return;
    const now = new Date();
    const options = {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    };
    dateEl.textContent = now.toLocaleDateString("en-US", options);
  };

  if (dashboardSettingsForm) {
    dashboardSettingsForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const settings = {
        displayName:
          settingDisplayName.value.trim() || currentStaffFallbackName,
        autoRefresh: settingAutoRefresh.value,
        theme: settingTheme.value,
      };
      localStorage.setItem("gh-admin-settings", JSON.stringify(settings));
      staffName.textContent = settings.displayName;
      applyThemeSetting();
      applyAutoRefreshSetting(settings.autoRefresh);
      settingsStatus.className = "status-success";
      settingsStatus.innerHTML = '<i class="fas fa-check-circle"></i> Settings saved successfully.';
      setTimeout(() => {
        settingsStatus.innerHTML = "";
      }, 3000);
    });
  }

  // --- Booking Management ---

  const loadBookings = async () => {
    if (!bookingsTableBody) return;

    bookingsTableBody.innerHTML =
      '<tr><td colspan="6" style="text-align: center; padding: 40px;"><i class="fas fa-spinner fa-spin"></i> Loading...</td></tr>';

    try {
      if (!supabaseClient) throw new Error("Supabase client is unavailable.");
      const { data, error } = await supabaseClient
        .from("contacts")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      updateStats(data);
      updateActionBoard(data);

      if (data && data.length > 0) {
        bookingsTableBody.innerHTML = data
          .map(
            (booking) => `
          <tr data-id="${booking.id}">
            <td>
              <div style="font-weight: 600;">${booking.name}</div>
              <div style="font-size: 0.8rem; color: #666;">${booking.email}</div>
            </td>
            <td>
              ${
                booking.check_in
                  ? `
                <div style="font-size: 0.9rem;">${new Date(booking.check_in).toLocaleDateString()} - ${new Date(booking.check_out).toLocaleDateString()}</div>
              `
                  : '<span style="color: #999;">Inquiry only</span>'
              }
            </td>
            <td style="text-align: center;">${booking.guests || "1"}</td>
            <td>
              <span class="status-badge status-${(booking.status || "pending").toLowerCase()}">
                ${getStatusDisplayText(booking.status || "pending")}
              </span>
            </td>
            <td>
              <div style="font-size: 0.85rem;">${booking.payment_method === "stripe" ? '<i class="fab fa-stripe" style="color: #635bff; font-size: 1.2rem;"></i> Paid' : "Request"}</div>
            </td>
            <td>
              <button class="action-btn reply-btn" title="Respond"><i class="fas fa-reply"></i></button>
              <button class="action-btn delete-btn" title="Delete" style="color: #ff4d4d;"><i class="fas fa-trash"></i></button>
            </td>
          </tr>
        `,
          )
          .join("");

        // Attach event listeners to buttons
        attachTableListeners();
      } else {
        bookingsTableBody.innerHTML =
          '<tr><td colspan="6" style="text-align: center; padding: 40px; color: #999;">No bookings found.</td></tr>';
      }
    } catch (err) {
      console.error("Error loading bookings:", err);
      bookingsTableBody.innerHTML =
        '<tr><td colspan="6" style="text-align: center; padding: 40px; color: #ff4d4d;">Error loading data.</td></tr>';
    }
  };

  const updateStats = (data) => {
    document.getElementById("statTotal").textContent = data.length;
    document.getElementById("statPending").textContent = data.filter(
      (b) => b.status === "pending",
    ).length;

    // Simple revenue calculation (Assume $499 per booking if it was a paid Stripe booking)
    const revenue =
      data.filter((b) => b.payment_method === "stripe").length * 499;
    document.getElementById("statRevenue").textContent =
      `$${revenue.toLocaleString()}`;
  };

  const updateActionBoard = (data) => {
    const container = document.getElementById("actionBoardContainer");
    const badge = document.getElementById("pendingCountBadge");
    if (!container) return;

    const pending = data.filter((b) => b.status === "pending" || !b.status);
    if (badge) badge.textContent = `${pending.length} Pending`;

    if (pending.length === 0) {
      container.innerHTML = `
        <div style="grid-column: 1 / -1; background: white; border-radius: 20px; padding: 40px; text-align: center; border: 2px dashed #e2e8f0;">
          <i class="fas fa-check-circle" style="font-size: 2.5rem; color: #166534; margin-bottom: 15px;"></i>
          <h4 style="margin: 0; color: var(--primary);">All Caught Up!</h4>
          <p style="color: var(--admin-text-muted); margin: 8px 0 0;">No pending requests requiring immediate action.</p>
        </div>
      `;
      return;
    }

    container.innerHTML = pending
      .slice(0, 6) // Show top 6 pending actions
      .map((item) => {
        const initials = item.name
          ? item.name
              .split(" ")
              .map((n) => n[0])
              .join("")
              .toUpperCase()
          : "G";
        const date = new Date(item.created_at).toLocaleDateString();
        const priority = item.guests > 3 ? "high" : "medium";

        return `
        <div class="action-card" data-id="${item.id}">
          <div class="action-card-header">
            <div class="action-card-guest">
              <div class="guest-avatar-circle">${initials}</div>
              <div class="action-card-info">
                <h4>${item.name || "Guest"}</h4>
                <p>Received ${date}</p>
              </div>
            </div>
            <span class="action-priority priority-${priority}">${priority}</span>
          </div>
          
          <div class="action-card-details">
            <div class="detail-row">
              <i class="fas fa-bed"></i>
              <span>${item.check_in ? `${new Date(item.check_in).toLocaleDateString()} - ${new Date(item.check_out).toLocaleDateString()}` : "Inquiry Only"}</span>
            </div>
            <div class="detail-row">
              <i class="fas fa-users"></i>
              <span>${item.guests || 1} Guests</span>
            </div>
            ${item.message ? `<p style="margin: 12px 0 0; font-style: italic; color: var(--admin-text-muted); font-size: 0.85rem;">"${item.message.substring(0, 60)}${item.message.length > 60 ? "..." : ""}"</p>` : ""}
          </div>

          <div class="action-card-footer">
            <button class="btn-action btn-action-secondary reply-btn">
              <i class="fas fa-reply"></i> Reply
            </button>
            <button class="btn-action btn-action-primary fast-confirm-btn" style="background: #166534;">
              <i class="fas fa-check"></i> Confirm
            </button>
          </div>
        </div>
      `;
      })
      .join("");

    // Attach listeners to cards
    container.querySelectorAll(".reply-btn").forEach((btn) => {
      btn.onclick = (e) => {
        const id = e.target.closest(".action-card").dataset.id;
        openReplyModal(id);
      };
    });

    container.querySelectorAll(".fast-confirm-btn").forEach((btn) => {
      btn.onclick = async (e) => {
        const card = e.target.closest(".action-card");
        const id = card.dataset.id;
        const guestName = card.querySelector("h4").textContent;

        if (confirm(`Instantly confirm booking for ${guestName}?`)) {
          btn.disabled = true;
          btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
          await updateBookingStatus(id, "confirmed", `Dear ${guestName}, your booking at Grand Horizon Suites has been instantly confirmed! We look forward to seeing you.`);
        }
      };
    });
  };

  const attachTableListeners = () => {
    document.querySelectorAll(".reply-btn").forEach((btn) => {
      btn.onclick = (e) => {
        const row = e.target.closest("tr");
        const id = row.dataset.id;
        openReplyModal(id);
      };
    });

    document.querySelectorAll(".delete-btn").forEach((btn) => {
      btn.onclick = async (e) => {
        const row = e.target.closest("tr");
        const id = row.dataset.id;
        if (confirm("Are you sure you want to delete this booking?")) {
          if (!supabaseClient) return;
          const { error } = await supabaseClient
            .from("contacts")
            .delete()
            .eq("id", id);
          if (error) alert(error.message);
          else loadBookings();
        }
      };
    });
  };

  const openReplyModal = async (id) => {
    if (!supabaseClient) return alert("Supabase client is unavailable.");
    const { data: booking, error } = await supabaseClient
      .from("contacts")
      .select("*")
      .eq("id", id)
      .single();
    if (error) return alert(error.message);

    document.getElementById("replyBookingId").value = booking.id;
    document.getElementById("replyGuestEmail").value = booking.email;
    document.getElementById("replyGuestName").value = booking.name;

    document.getElementById("replyDetails").innerHTML = `
      <strong>Guest:</strong> ${booking.name}<br>
      <strong>Stay:</strong> ${booking.check_in ? `${booking.check_in} to ${booking.check_out}` : "Inquiry"}<br>
      <strong>Original Message:</strong> <em>"${booking.message || "No message"}"</em>
    `;

    // Reset form
    document.getElementById("replyMessage").value = "";

    // Handle button states based on current booking status
    const currentStatus = booking.status || "pending";
    const confirmBtn = document.getElementById("confirmBookingBtn");
    const rejectBtn = document.getElementById("rejectBookingBtn");
    const fullBtn = document.getElementById("fullBookingBtn");
    const pendingBtn = document.getElementById("pendingBookingBtn");

    // Reset all buttons to enabled state first
    [confirmBtn, rejectBtn, fullBtn, pendingBtn].forEach((btn) => {
      if (btn) {
        btn.disabled = false;
        btn.style.opacity = "1";
        btn.style.pointerEvents = "auto";
      }
    });

    // Disable buttons based on current status to prevent duplicate actions
    if (currentStatus === "confirmed") {
      if (confirmBtn) {
        confirmBtn.disabled = true;
        confirmBtn.style.opacity = "0.5";
        confirmBtn.style.pointerEvents = "none";
        confirmBtn.textContent = "Already Confirmed";
      }
    } else if (currentStatus === "rejected") {
      if (rejectBtn) {
        rejectBtn.disabled = true;
        rejectBtn.style.opacity = "0.5";
        rejectBtn.style.pointerEvents = "none";
        rejectBtn.textContent = "Already Rejected";
      }
    } else if (currentStatus === "full") {
      if (fullBtn) {
        fullBtn.disabled = true;
        fullBtn.style.opacity = "0.5";
        fullBtn.style.pointerEvents = "none";
        fullBtn.textContent = "Already Marked Full";
      }
    }

    // If already replied, show current status in modal header
    if (booking.replied) {
      document.getElementById("replyTitle").textContent =
        `Respond to Guest (Status: ${currentStatus})`;
    } else {
      document.getElementById("replyTitle").textContent = "Respond to Guest";
    }

    replyModal.classList.add("open");
    replyModal.setAttribute("aria-hidden", "false");
  };

  const updateBookingStatus = async (id, status, customMessage = null) => {
    const email = document.getElementById("replyGuestEmail").value;
    const name = document.getElementById("replyGuestName").value;
    const responseText =
      customMessage || document.getElementById("replyMessage").value;

    // Ensure we always have a message to send
    let finalMessage = responseText;
    if (!finalMessage) {
      // Provide default messages based on status
      const defaultMessages = {
        confirmed: `Dear ${name}, we are pleased to confirm your booking at Grand Horizon Suites. We look forward to welcoming you!`,
        rejected: `Dear ${name}, unfortunately we are unable to fulfill your booking request at this time. We apologize for any inconvenience.`,
        full: `Dear ${name}, thank you for your interest. Unfortunately, the hotel is fully booked for your selected dates. Please try other dates.`,
        pending: `Dear ${name}, your request is currently being reviewed by our concierge team. We will get back to you soon.`,
        replied: `Dear ${name}, thank you for your inquiry. Our team will respond to you shortly.`,
      };
      finalMessage =
        defaultMessages[status] ||
        `Dear ${name}, your booking status has been updated to: ${status}.`;
    }

    try {
      // 1. Always send email to guest using EmailJS
      try {
        await emailjs.send("service_sa1ub8k", "template_f7bfksd", {
          to_name: name,
          to_email: email,
          from_name: "Grand Horizon Suites Staff",
          message: finalMessage,
          reply_to: "humbledove2004@gmail.com",
        });
        console.log(`Email sent successfully for ${status} status`);
      } catch (emailError) {
        console.error("Email sending failed:", emailError);
        alert(
          "Warning: Email could not be sent, but booking status was updated. Please contact the guest manually.",
        );
        // Continue with database update even if email fails
      }

      // 2. Update database
      if (!supabaseClient) throw new Error("Supabase client is unavailable.");
      const { error } = await supabaseClient
        .from("contacts")
        .update({
          replied: true,
          status: status,
        })
        .eq("id", id);

      if (error) throw error;

      alert(
        `Booking ${status} successfully! Guest has been notified via email.`,
      );
      closeReplyModal.onclick();
      loadBookings();
    } catch (err) {
      console.error("Error updating booking status:", err);
      alert("Error: " + (err?.message || err || "Unknown error occurred"));
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
      await updateBookingStatus(id, "replied");
    });
  }

  if (confirmBookingBtn) {
    confirmBookingBtn.onclick = async () => {
      const id = document.getElementById("replyBookingId").value;

      // Check if already confirmed
      if (confirmBookingBtn.disabled) {
        alert("This booking has already been confirmed.");
        return;
      }

      confirmBookingBtn.disabled = true;
      confirmBookingBtn.textContent = "Confirming...";

      try {
        await updateBookingStatus(id, "confirmed");
      } finally {
        confirmBookingBtn.disabled = false;
        confirmBookingBtn.textContent = "Confirm";
      }
    };
  }

  if (rejectBookingBtn) {
    rejectBookingBtn.onclick = async () => {
      const id = document.getElementById("replyBookingId").value;

      // Check if already rejected
      if (rejectBookingBtn.disabled) {
        alert("This booking has already been rejected.");
        return;
      }

      if (confirm("Send rejection email to guest?")) {
        rejectBookingBtn.disabled = true;
        rejectBookingBtn.textContent = "Rejecting...";

        try {
          await updateBookingStatus(id, "rejected");
        } finally {
          rejectBookingBtn.disabled = false;
          rejectBookingBtn.textContent = "Reject";
        }
      }
    };
  }

  if (fullBookingBtn) {
    fullBookingBtn.onclick = async () => {
      const id = document.getElementById("replyBookingId").value;

      // Check if already marked as full
      if (fullBookingBtn.disabled) {
        alert("This booking has already been marked as hotel full.");
        return;
      }

      fullBookingBtn.disabled = true;
      fullBookingBtn.textContent = "Updating...";

      try {
        await updateBookingStatus(id, "full");
      } finally {
        fullBookingBtn.disabled = false;
        fullBookingBtn.textContent = "Hotel Full";
      }
    };
  }

  if (pendingBookingBtn) {
    pendingBookingBtn.onclick = async () => {
      const id = document.getElementById("replyBookingId").value;

      // Check if already pending
      if (pendingBookingBtn.disabled) {
        alert("This booking is already set to pending.");
        return;
      }

      pendingBookingBtn.disabled = true;
      pendingBookingBtn.textContent = "Setting...";

      try {
        await updateBookingStatus(id, "pending");
      } finally {
        pendingBookingBtn.disabled = false;
        pendingBookingBtn.textContent = "Set Pending";
      }
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
