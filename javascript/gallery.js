// Grand Horizon Suites - Gallery & Lightbox Logic
(function() {
  window.GH = window.GH || {};

  const imageLightbox = document.getElementById("imageLightbox");
  const lightboxImage = document.getElementById("lightboxImage");
  const lightboxClose = document.getElementById("lightboxClose");
  const lightboxPrev = document.getElementById("lightboxPrev");
  const lightboxNext = document.getElementById("lightboxNext");

  let galleryImages = [];
  let currentIndex = 0;

  window.GH.openLightbox = function(images, index) {
    if (!imageLightbox || !lightboxImage) return;
    galleryImages = images;
    currentIndex = (index + galleryImages.length) % galleryImages.length;
    lightboxImage.src = galleryImages[currentIndex];
    imageLightbox.classList.add("open");
    imageLightbox.setAttribute("aria-hidden", "false");
  };

  window.GH.closeLightbox = function() {
    if (imageLightbox) {
      imageLightbox.classList.remove("open");
      imageLightbox.setAttribute("aria-hidden", "true");
    }
  };

  window.GH.updateLightbox = function(index) {
    if (!lightboxImage) return;
    currentIndex = (index + galleryImages.length) % galleryImages.length;
    lightboxImage.src = galleryImages[currentIndex];
  };

  // --- Gallery Setup ---
  const initGallery = () => {
    const galleryImgs = document.querySelectorAll(".gallery-grid img");
    if (galleryImgs.length === 0) return;

    const images = Array.from(galleryImgs).map(img => img.src);
    galleryImgs.forEach((img, i) => {
      img.style.cursor = "zoom-in";
      img.addEventListener("click", () => window.GH.openLightbox(images, i));
    });
  };

  // --- Lightbox Controls ---
  if (lightboxClose) lightboxClose.onclick = window.GH.closeLightbox;
  if (lightboxPrev) lightboxPrev.onclick = () => window.GH.updateLightbox(currentIndex - 1);
  if (lightboxNext) lightboxNext.onclick = () => window.GH.updateLightbox(currentIndex + 1);

  if (imageLightbox) {
    imageLightbox.addEventListener("click", (e) => {
      if (e.target === imageLightbox) window.GH.closeLightbox();
    });
  }

  // --- Keyboard Support ---
  document.addEventListener("keydown", (e) => {
    if (!imageLightbox || !imageLightbox.classList.contains("open")) return;
    if (e.key === "Escape") window.GH.closeLightbox();
    if (e.key === "ArrowLeft") window.GH.updateLightbox(currentIndex - 1);
    if (e.key === "ArrowRight") window.GH.updateLightbox(currentIndex + 1);
  });

  // --- Room Details Carousel (Integrated here or in modals) ---
  window.GH.initRoomCarousel = function(images, thumbnailsContainer, roomImageEl) {
    let rIndex = 0;
    const update = (idx) => {
      rIndex = (idx + images.length) % images.length;
      if (roomImageEl) roomImageEl.style.backgroundImage = `url('${images[rIndex]}')`;
      if (thumbnailsContainer) {
        Array.from(thumbnailsContainer.children).forEach((c, i) => {
          c.classList.toggle("active", i === rIndex);
        });
      }
    };

    if (thumbnailsContainer) {
      thumbnailsContainer.innerHTML = "";
      images.forEach((src, i) => {
        const img = document.createElement("img");
        img.src = src;
        img.alt = `Room image ${i + 1}`;
        img.className = "thumb";
        img.addEventListener("click", () => update(i));
        thumbnailsContainer.appendChild(img);
      });
    }

    const prevBtn = document.getElementById("carouselPrev");
    const nextBtn = document.getElementById("carouselNext");
    if (prevBtn) prevBtn.onclick = () => update(rIndex - 1);
    if (nextBtn) nextBtn.onclick = () => update(rIndex + 1);

    if (roomImageEl) {
      roomImageEl.onclick = () => window.GH.openLightbox(images, rIndex);
      
      // Swipe support
      let startX = 0, isTouching = false;
      roomImageEl.ontouchstart = (e) => { isTouching = true; startX = e.touches[0].clientX; };
      roomImageEl.ontouchmove = (e) => {
        if (!isTouching) return;
        const dx = e.touches[0].clientX - startX;
        if (Math.abs(dx) > 50) {
          update(dx < 0 ? rIndex + 1 : rIndex - 1);
          isTouching = false;
        }
      };
      roomImageEl.ontouchend = () => { isTouching = false; };
    }
    update(0);
  };

  document.addEventListener("DOMContentLoaded", initGallery);
  console.log("[GH] Gallery & Lightbox Logic loaded");
})();
