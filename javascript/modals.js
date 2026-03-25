// Grand Horizon Suites - Modal Logic
(function() {
  window.GH = window.GH || {};

  const bookingModal = document.getElementById("bookingModal");
  const bookingForm = document.getElementById("bookingForm");
  const closeBooking = document.getElementById("closeBooking");

  const roomModal = document.getElementById("roomModal");
  const closeRoomModal = document.getElementById("closeRoomModal");

  const featureModal = document.getElementById("featureModal");
  const closeFeatureModal = document.getElementById("closeFeatureModal");

  const menuModal = document.getElementById("menuModal");
  const closeMenuModal = document.getElementById("closeMenuModal");

  // --- Common Helper ---
  window.GH.openModal = function(modal) {
    if (modal) {
      modal.classList.add("open");
      modal.setAttribute("aria-hidden", "false");
      const first = modal.querySelector('input[name="name"]');
      if (first) first.focus();
    }
  };

  window.GH.closeModal = function(modal) {
    if (modal) {
      modal.classList.remove("open");
      modal.setAttribute("aria-hidden", "true");
    }
  };

  // --- Booking Modal Prefilling ---
  window.GH.openBookingWithContext = function(messageText) {
    if (!bookingModal || !bookingForm) return;
    window.GH.openModal(bookingModal);
    const messageField = bookingForm.querySelector('textarea[name="message"]');
    if (messageField) {
      messageField.value = messageText;
    }
  };

  // --- Event Listeners for Closing ---
  [bookingModal, roomModal, featureModal, menuModal].forEach(modal => {
    if (modal) {
      modal.addEventListener("click", (e) => {
        if (e.target === modal) window.GH.closeModal(modal);
      });
    }
  });

  if (closeBooking) closeBooking.onclick = () => window.GH.closeModal(bookingModal);
  if (closeRoomModal) closeRoomModal.onclick = () => window.GH.closeModal(roomModal);
  if (closeFeatureModal) closeFeatureModal.onclick = () => window.GH.closeModal(featureModal);
  if (closeMenuModal) closeMenuModal.onclick = () => window.GH.closeModal(menuModal);

  // --- Keyboard Support (ESC to close any open modal) ---
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      [bookingModal, roomModal, featureModal, menuModal].forEach(modal => {
        if (modal && modal.classList.contains("open")) {
          window.GH.closeModal(modal);
        }
      });
    }
  });

  // --- Feature Modal Logic ---
  window.GH.openFeatureModal = function(card) {
    const title = card.dataset.title || card.querySelector("h3")?.textContent;
    const desc = card.dataset.desc || card.querySelector("p")?.textContent;
    const imageSrc = card.dataset.image;
    const category = card.dataset.category;

    const featureTitle = document.getElementById("featureTitle");
    const featureDesc = document.getElementById("featureDesc");
    const featureImage = document.getElementById("featureImage");
    const featureActionBtn = document.getElementById("featureActionBtn");

    if (featureTitle) featureTitle.textContent = title;
    if (featureDesc) featureDesc.textContent = desc;
    if (featureImage && imageSrc) featureImage.style.backgroundImage = `url('${imageSrc}')`;

    if (featureActionBtn) {
      if (category === 'dining') featureActionBtn.textContent = 'Reserve Table';
      else if (category === 'spa') featureActionBtn.textContent = 'Book Treatment';
      else if (category === 'offer') featureActionBtn.textContent = 'Claim Offer';
      else featureActionBtn.textContent = 'Contact Us';
      
      featureActionBtn.onclick = () => {
        window.GH.closeModal(featureModal);
        window.GH.openBookingWithContext(`Inquiry about ${category}: ${title}`);
      };
    }
    window.GH.openModal(featureModal);
  };

  // --- Menu Modal Logic ---
  window.GH.openMenuModal = function(card) {
    const menuModalTitle = document.getElementById("menuModalTitle");
    const menuModalBody = document.getElementById("menuModalBody");
    if (!menuModal || !menuModalBody || !menuModalTitle) return;

    const titleEl = card.querySelector("h3");
    const menuDetails = card.querySelector(".menu-details");
    const title = titleEl ? titleEl.textContent : "Menu";

    menuModalTitle.textContent = title + " Menu";
    menuModalBody.innerHTML = menuDetails ? menuDetails.innerHTML : "";
    window.GH.openModal(menuModal);
  };

  console.log("[GH] Modals Logic loaded");
})();
