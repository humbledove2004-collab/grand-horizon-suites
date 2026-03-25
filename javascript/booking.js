// Grand Horizon Suites - Booking & Contact Form Logic
(function() {
  window.GH = window.GH || {};

  const bookingForm = document.getElementById("bookingForm");
  const checkinEl = document.getElementById("checkin");
  const checkoutEl = document.getElementById("checkout");

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
    bookingForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const data = new FormData(bookingForm);
      const name = data.get("name") || "";
      const email = data.get("email") || "";
      const checkin = data.get("checkin");
      const checkout = data.get("checkout");

      if (!name || !email) {
        window.GH.toast("Please enter your name and email address.", "error", "Incomplete Form");
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
      submitBtn.textContent = "Sending...";
      submitBtn.disabled = true;

      try {
        const formDataObj = Object.fromEntries(data.entries());
        // Call global contactService
        await contactService.submitContact(formDataObj);
        window.GH.toast(`Thank you, ${name}. Your request has been received.`, "success", "Booking Received");
        window.GH.closeModal(document.getElementById("bookingModal"));
        bookingForm.reset();
      } catch (error) {
        console.error(error);
        const msg = (error.message || "").toLowerCase();
        if (msg.includes("row-level security") || msg.includes("policy")) {
           window.GH.toast("Database access restricted. Please check your Supabase RLS policies.", "error", "Access Denied");
        } else if (msg.includes("relation") && msg.includes("does not exist")) {
           window.GH.toast("Database table 'contacts' missing. Please run the setup SQL from README.md.", "error", "Setup Required");
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

    const contactLink = e.target.closest('.nav-menu a[href="#contact"]');
    if (contactLink) {
      e.preventDefault();
      window.GH.openModal(document.getElementById("bookingModal"));
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
