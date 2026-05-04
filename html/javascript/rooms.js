// Grand Horizon Suites - Room Details Logic
(function() {
  window.GH = window.GH || {};

  const roomModal = document.getElementById("roomModal");
  const roomTitle = document.getElementById("roomTitle");
  const roomPrice = document.getElementById("roomPrice");
  const roomDesc = document.getElementById("roomDesc");
  const roomAmenities = document.getElementById("roomAmenities");
  const roomImage = document.getElementById("roomImage");
  const roomThumbnails = document.getElementById("roomThumbnails");

  window.GH.openRoomModalFromCard = function(card) {
    if (!roomModal) return;
    const title = card.dataset.title || card.querySelector("h3")?.textContent || "Room";
    const desc = card.dataset.desc || card.querySelector(".room-desc")?.textContent || "";
    const price = card.dataset.price || card.querySelector(".room-price")?.textContent || "";
    const imagesRaw = card.dataset.images || card.dataset.image || "";
    let images = imagesRaw.split(",").map(s => s.trim()).filter(Boolean);
    if (images.length === 0) {
      const bg = card.querySelector(".room-image")?.style.backgroundImage || "";
      if (bg.startsWith("url("))
        images = [bg.replace(/^url\(['"]?/, "").replace(/['"]?\)$/, "")];
    }
    const amenities = (card.dataset.amenities || "").split(",").filter(Boolean);

    if (roomTitle) roomTitle.textContent = title;
    if (roomDesc) roomDesc.textContent = desc;
    if (roomPrice) roomPrice.textContent = price;

    if (roomAmenities) {
      roomAmenities.innerHTML = "";
      amenities.forEach(a => {
        const span = document.createElement("span");
        span.textContent = a.trim();
        span.className = "room-amenity-tag"; // Add class for styling
        roomAmenities.appendChild(span);
      });
    }

    if (window.GH.initRoomCarousel) {
      window.GH.initRoomCarousel(images, roomThumbnails, roomImage);
    }

    window.GH.openModal(roomModal);
  };

  // --- Click Listener for Room Cards ---
  document.addEventListener('click', (e) => {
    const btn = e.target.closest(".view-details");
    if (btn) {
      const card = btn.closest(".room-card");
      if (card) window.GH.openRoomModalFromCard(card);
    }
  });

  console.log("[GH] Rooms Logic loaded");
})();
