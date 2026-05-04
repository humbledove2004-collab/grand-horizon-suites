// Grand Horizon Suites - Booking & Contact Form Logic
(function () {
  window.GH = window.GH || {};

  const bookingForm = document.getElementById("bookingForm");
  const checkinEl = document.getElementById("checkin");
  const checkoutEl = document.getElementById("checkout");
  const phoneInputEl = document.getElementById("phoneInput");
  let iti;

  // --- Initialize International Phone Input ---
  const initPhoneInput = () => {
    const phoneInputEl = document.getElementById("phoneInput");
    if (phoneInputEl && typeof window.intlTelInput !== "undefined") {
      iti = window.intlTelInput(phoneInputEl, {
        utilsScript:
          "https://cdn.jsdelivr.net/npm/intl-tel-input@18.2.1/build/js/utils.js",
        initialCountry: "gh",
        preferredCountries: ["gh", "us", "gb", "ng"],
        separateDialCode: true,
        autoPlaceholder: "aggressive",
        formatOnDisplay: true,
      });
    }
  };

  initPhoneInput();

  // --- Real-time Email Validation ---
  function setupEmailValidation() {
    const emailInputs = document.querySelectorAll('input[type="email"]');

    emailInputs.forEach((input) => {
      // Add validation on blur (when user leaves the field)
      input.addEventListener("blur", function () {
        const email = this.value.trim();
        if (email) {
          const validation = window.GH.validation.validateEmail(email);
          if (!validation.valid) {
            showFieldError(this, validation.message);
          } else {
            clearFieldError(this);
          }
        }
      });

      // Clear errors on input
      input.addEventListener("input", function () {
        clearFieldError(this);
      });

      // Prevent form submission with invalid email
      input.addEventListener("invalid", function (e) {
        e.preventDefault();
        const validation = window.GH.validation.validateEmail(this.value);
        showFieldError(
          this,
          validation.message || "Please enter a valid email address",
        );
      });
    });
  }

  function showFieldError(input, message) {
    // Remove existing error
    clearFieldError(input);

    // Add error styling
    input.classList.add("field-error");

    // Create error message element
    const errorDiv = document.createElement("div");
    errorDiv.className = "field-error-message";
    errorDiv.textContent = message;
    errorDiv.style.cssText = `
      color: #d32f2f;
      font-size: 0.875rem;
      margin-top: 4px;
      font-weight: 500;
    `;

    // Insert after the input
    input.parentNode.insertBefore(errorDiv, input.nextSibling);
  }

  function clearFieldError(input) {
    input.classList.remove("field-error");
    const errorMsg = input.parentNode.querySelector(".field-error-message");
    if (errorMsg) {
      errorMsg.remove();
    }
  }

  // Initialize email validation
  setupEmailValidation();

  // --- Booking Form Submission ---
  if (bookingForm) {
    // Update button text based on payment selection
    bookingForm.addEventListener("change", (e) => {
      if (e.target.name === "payment_method") {
        const submitBtn = bookingForm.querySelector('button[type="submit"]');
        submitBtn.textContent =
          e.target.value === "stripe"
            ? "Proceed to Payment"
            : "Request Booking";
      }
    });

    bookingForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const data = new FormData(bookingForm);
      const formDataObj = Object.fromEntries(data.entries());

      const email = formDataObj.email;
      const emailValidation = window.GH.validation.validateEmail(email);
      if (!emailValidation.valid) {
        window.GH.toast(emailValidation.message, "error", "Invalid Email");
        return;
      }

      // Enhanced validation using ValidationService
      const validation = window.GH.validation.validateBookingForm(formDataObj);

      if (!validation.valid) {
        // Show first validation error
        window.GH.toast(validation.errors[0], "error", "Validation Error");
        return;
      }

      // Rate limiting check
      const rateLimit = window.GH.validation.checkRateLimit(
        formDataObj.email,
        "booking",
      );
      if (!rateLimit.allowed) {
        window.GH.toast(rateLimit.message, "error", "Rate Limited");
        return;
      }

      // Sanitize inputs
      Object.keys(formDataObj).forEach((key) => {
        if (typeof formDataObj[key] === "string") {
          formDataObj[key] = window.GH.validation.sanitizeInput(
            formDataObj[key],
          );
        }
      });

      const name = formDataObj.name;
      const checkin = formDataObj.checkin;
      const checkout = formDataObj.checkout;
      const paymentMethod = formDataObj.payment_method;

      const submitBtn = bookingForm.querySelector('button[type="submit"]');
      const originalText = submitBtn.textContent;
      submitBtn.textContent =
        paymentMethod === "stripe" ? "Preparing Payment..." : "Sending...";
      submitBtn.disabled = true;

      try {
        // Use full international phone number if available
        let fullPhone = formDataObj.phone;
        if (iti && iti.isValidNumber()) {
          fullPhone = iti.getNumber();
        } else if (formDataObj.phone && iti && !iti.isValidNumber()) {
          window.GH.toast("Please enter a valid phone number", "error", "Invalid Phone");
          submitBtn.disabled = false;
          submitBtn.textContent = originalText;
          return;
        }

        const bookingData = {
          ...formDataObj,
          phone: fullPhone,
          status: "pending",
          created_at: new Date().toISOString(),
        };

        // Call global contactService
        await contactService.submitContact(bookingData);

        if (paymentMethod === "stripe") {
          window.GH.toast(
            "Redirecting to secure payment...",
            "success",
            "Booking Saved",
          );

          // MAP YOUR ROOMS TO STRIPE LINKS HERE
          const STRIPE_LINKS = {
            "Aegean View Suite":
              "https://buy.stripe.com/test_6oU8wP0gL4nfbSL0SG6sw00",
            "Infinity Pool Suite":
              "https://buy.stripe.com/test_dRmeVdgfJ2f7f4X58W6sw01",
            "Presidential Villa":
              "https://buy.stripe.com/test_cNi8wPfbFaLD8Gz44S6sw02",
            default: "https://buy.stripe.com/test_00w5kDaVp2f7aOH30O6sw03",
          };

          // Get the room name from the message or context
          const message = formDataObj.message || "";
          const roomMatch = Object.keys(STRIPE_LINKS).find((room) =>
            message.includes(room),
          );
          const finalLink = STRIPE_LINKS[roomMatch] || STRIPE_LINKS["default"];

          setTimeout(() => {
            window.location.href = finalLink;
          }, 1500);
        } else {
          window.GH.toast(
            `Thank you, ${name}. Your request has been received.`,
            "success",
            "Booking Received",
          );
          window.GH.closeModal(document.getElementById("bookingModal"));
          bookingForm.reset();
        }
      } catch (error) {
        console.error("Booking Submission Error Details:", error);
        const msg = (error.message || "").toLowerCase();
        if (msg.includes("row-level security") || msg.includes("policy")) {
          window.GH.toast(
            "Database access restricted. Please check your Supabase RLS policies.",
            "error",
            "Access Denied",
          );
        } else if (msg.includes("relation") && msg.includes("does not exist")) {
          window.GH.toast(
            "Database table 'contacts' missing. Please run the setup SQL from README.md.",
            "error",
            "Setup Required",
          );
        } else if (msg.includes("column") && msg.includes("does not exist")) {
          window.GH.toast(
            "Database column 'payment_method' missing. Please run the update SQL from README.md.",
            "error",
            "Database Outdated",
          );
        } else if (msg.includes("fetch")) {
          window.GH.toast(
            "Failed to reach the server. Ensure you are using 'Live Server' and not just opening the file directly.",
            "error",
            "Network Error",
          );
        } else {
          window.GH.toast(
            error.message ||
              "There was an error sending your request. Please try again.",
            "error",
            "Submission Error",
          );
        }
      } finally {
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
      }
    });
  }

  // --- External Modal Triggers (Book Now buttons) ---
  document.addEventListener("click", (e) => {
    const trigger = e.target.closest(
      "#openBooking, #openBookingHero, #openBookingCTA, #openContactCTA",
    );
    if (trigger) {
      window.GH.openModal(document.getElementById("bookingModal"));
    }

    const contactLink = e.target.closest(
      '.nav-menu a[href="#contact"], .footer .email-link',
    );
    if (contactLink) {
      e.preventDefault();
      window.GH.openBookingWithContext("General Inquiry / Message");
    }

    const bookFromDetails = e.target.closest("#bookFromDetails");
    if (bookFromDetails) {
      const roomTitle = document.getElementById("roomTitle")?.textContent;
      window.GH.closeModal(document.getElementById("roomModal"));
      window.GH.openBookingWithContext(
        `Booking request for: ${roomTitle || "Room"}`,
      );
    }

    // Reservation/Service Booking buttons
    const reservationBtn = e.target.closest(
      ".dining-details .feature-card .btn-primary, .spa-details .feature-card .btn-primary, .offers-details .feature-card .btn-primary",
    );
    if (reservationBtn) {
      const card = reservationBtn.closest(".feature-card");
      if (!card) return;
      const title = card.querySelector("h3")?.textContent || "Service";
      const label = reservationBtn.textContent.trim().toLowerCase();
      let msg = `Inquiry about: ${title}`;
      if (label.includes("reserve"))
        msg = `Reservation request: Table at ${title}`;
      else if (label.includes("book")) msg = `Booking request: ${title}`;
      window.GH.openBookingWithContext(msg);
    }
  });

  console.log("[GH] Booking & Contact Logic loaded");
})();
