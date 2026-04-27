// Grand Horizon Suites - Booking & Contact Form Logic
(function() {
  window.GH = window.GH || {};

  const bookingForm = document.getElementById("bookingForm");
  const checkinEl = document.getElementById("checkin");
  const checkoutEl = document.getElementById("checkout");
  const phoneInputEl = document.getElementById("phoneInput");
  let iti;

  // --- Initialize International Phone Input ---
  if (phoneInputEl) {
    iti = window.intlTelInput(phoneInputEl, {
      utilsScript: "https://cdn.jsdelivr.net/npm/intl-tel-input@18.2.1/build/js/utils.js",
      initialCountry: "gh", // Default to Ghana
      preferredCountries: ["gh", "us", "gb", "ng"],
      separateDialCode: true,
    });
  }

  // --- Date Handling ---
  const today = new Date().toISOString().split("T")[0];
  if (checkinEl) {
    checkinEl.min = today;
    checkinEl.addEventListener("change", function () {
      if (checkoutEl) checkoutEl.min = this.value;
    });
  }

  // --- Booking Form Submission ---
  if (bookingForm) {
    // Update button text based on payment selection
    bookingForm.addEventListener("change", (e) => {
      if (e.target.name === "payment_method") {
        const submitBtn = bookingForm.querySelector('button[type="submit"]');
        submitBtn.textContent = e.target.value === "stripe" ? "Proceed to Payment" : "Request Booking";
      }
    });

    bookingForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const data = new FormData(bookingForm);
      const name = data.get("name") || "";
      const email = data.get("email") || "";
      const checkin = data.get("checkin");
      const checkout = data.get("checkout");
      const paymentMethod = data.get("payment_method");

      if (!name || !email) {
        window.GH.toast("Please enter your name and email address.", "error", "Incomplete Form");
        return;
      }

      // --- Email Validation (Regex) ---
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        window.GH.toast("Please enter a valid email address (e.g., name@example.com).", "error", "Invalid Email");
        return;
      }

      // --- Phone Validation ---
      if (iti && !iti.isValidNumber()) {
        window.GH.toast("Please enter a valid phone number for the selected country.", "error", "Invalid Phone");
        return;
      }

      // --- Date Validation ---
      if (checkin && checkout) {
        if (new Date(checkout) <= new Date(checkin)) {
          window.GH.toast("Check-out date must be after check-in date.", "error", "Invalid Dates");
          return;
        }
      } else if (checkin || checkout) {
        window.GH.toast("Both check-in and check-out dates are required if booking a stay.", "error", "Missing Dates");
        return;
      }

      const submitBtn = bookingForm.querySelector('button[type="submit"]');
      const originalText = submitBtn.textContent;
      submitBtn.textContent = paymentMethod === "stripe" ? "Preparing Payment..." : "Sending...";
      submitBtn.disabled = true;

      try {
        const formDataObj = Object.fromEntries(data.entries());
        
        // Use full international phone number if available
        if (iti) {
          formDataObj.phone = iti.getNumber();
        }

        // Call global contactService
        await contactService.submitContact(formDataObj);

        if (paymentMethod === "stripe") {
          window.GH.toast("Redirecting to secure payment...", "success", "Booking Saved");
          
          // MAP YOUR ROOMS TO STRIPE LINKS HERE
          const STRIPE_LINKS = {
            "Aegean View Suite": "https://buy.stripe.com/test_6oU8wP0gL4nfbSL0SG6sw00",
            "Infinity Pool Suite": "https://buy.stripe.com/test_dRmeVdgfJ2f7f4X58W6sw01",
            "Presidential Villa": "https://buy.stripe.com/test_cNi8wPfbFaLD8Gz44S6sw02",
            "default": "https://buy.stripe.com/test_00w5kDaVp2f7aOH30O6sw03"
          };

          // Get the room name from the message or context
          const message = formDataObj.message || "";
          const roomMatch = Object.keys(STRIPE_LINKS).find(room => message.includes(room));
          const finalLink = STRIPE_LINKS[roomMatch] || STRIPE_LINKS["default"];
          
          setTimeout(() => {
            window.location.href = finalLink;
          }, 1500);
        } else {
          window.GH.toast(`Thank you, ${name}. Your request has been received.`, "success", "Booking Received");
          window.GH.closeModal(document.getElementById("bookingModal"));
          bookingForm.reset();
        }
      } catch (error) {
        console.error("Booking Submission Error Details:", error);
        const msg = (error.message || "").toLowerCase();
        if (msg.includes("row-level security") || msg.includes("policy")) {
           window.GH.toast("Database access restricted. Please check your Supabase RLS policies.", "error", "Access Denied");
        } else if (msg.includes("relation") && msg.includes("does not exist")) {
           window.GH.toast("Database table 'contacts' missing. Please run the setup SQL from README.md.", "error", "Setup Required");
        } else if (msg.includes("column") && msg.includes("does not exist")) {
           window.GH.toast("Database column 'payment_method' missing. Please run the update SQL from README.md.", "error", "Database Outdated");
        } else if (msg.includes("fetch")) {
           window.GH.toast("Failed to reach the server. Ensure you are using 'Live Server' and not just opening the file directly.", "error", "Network Error");
        } else {
           window.GH.toast(error.message || "There was an error sending your request. Please try again.", "error", "Submission Error");
        }
      } finally {
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
      }
    });
  }

  // --- External Modal Triggers (Book Now buttons) ---
  document.addEventListener('click', (e) => {
    const trigger = e.target.closest('#openBooking, #openBookingHero, #openBookingCTA, #openContactCTA');
    if (trigger) {
      window.GH.openModal(document.getElementById("bookingModal"));
    }

    const contactLink = e.target.closest('.nav-menu a[href="#contact"], .footer .email-link');
    if (contactLink) {
      e.preventDefault();
      window.GH.openBookingWithContext("General Inquiry / Message");
    }

    const bookFromDetails = e.target.closest('#bookFromDetails');
    if (bookFromDetails) {
      const roomTitle = document.getElementById("roomTitle")?.textContent;
      window.GH.closeModal(document.getElementById("roomModal"));
      window.GH.openBookingWithContext(`Booking request for: ${roomTitle || "Room"}`);
    }

    // Reservation/Service Booking buttons
    const reservationBtn = e.target.closest('.dining-details .feature-card .btn-primary, .spa-details .feature-card .btn-primary, .offers-details .feature-card .btn-primary');
    if (reservationBtn) {
      const card = reservationBtn.closest(".feature-card");
      if (!card) return;
      const title = card.querySelector("h3")?.textContent || "Service";
      const label = reservationBtn.textContent.trim().toLowerCase();
      let msg = `Inquiry about: ${title}`;
      if (label.includes("reserve")) msg = `Reservation request: Table at ${title}`;
      else if (label.includes("book")) msg = `Booking request: ${title}`;
      window.GH.openBookingWithContext(msg);
    }
  });

  console.log("[GH] Booking & Contact Logic loaded");
})();
