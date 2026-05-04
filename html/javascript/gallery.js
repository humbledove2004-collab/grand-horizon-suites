// Grand Horizon Suites - Gallery & Lightbox Logic
(function() {
  window.GH = window.GH || {};

  const imageLightbox = document.getElementById("imageLightbox");
  const lightboxImage = document.getElementById("lightboxImage");
  const lightboxStoryTitle = document.getElementById("lightboxStoryTitle");
  const lightboxStoryIntro = document.getElementById("lightboxStoryIntro");
  const lightboxClose = document.getElementById("lightboxClose");
  const lightboxPrev = document.getElementById("lightboxPrev");
  const lightboxNext = document.getElementById("lightboxNext");

  let galleryImages = [];
  let currentIndex = 0;

  const setLightboxContent = (index) => {
    if (!lightboxImage || galleryImages.length === 0) return;
    currentIndex = (index + galleryImages.length) % galleryImages.length;
    const item = galleryImages[currentIndex];
    lightboxImage.src = item.src;
    lightboxImage.alt = item.alt || "Enlarged image";
    if (lightboxStoryTitle) {
      lightboxStoryTitle.textContent = item.title || item.alt || "Visual Story";
    }
    if (lightboxStoryIntro) {
      lightboxStoryIntro.textContent = item.intro || "Discover a signature moment from the Grand Horizon experience.";
    }
  };

  window.GH.openLightbox = function(images, index) {
    if (!imageLightbox || !lightboxImage) return;
    galleryImages = images;
    setLightboxContent(index);
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
    if (!lightboxImage || galleryImages.length === 0) return;
    setLightboxContent(index);
  };

  // --- Gallery Setup ---
  const initGallery = () => {
    const galleryItems = document.querySelectorAll(".gallery-grid .gallery-item");
    if (galleryItems.length === 0) return;

    const images = Array.from(galleryItems).map((item) => {
      const img = item.querySelector("img");
      return {
        src: img?.src || "",
        alt: img?.alt || "",
        title: img?.dataset.storyTitle || "",
        intro: img?.dataset.storyIntro || ""
      };
    });

    galleryItems.forEach((item, i) => {
      item.style.cursor = "zoom-in";
      item.setAttribute("role", "button");
      item.setAttribute("tabindex", "0");
      item.setAttribute("aria-label", `Open image ${i + 1} in lightbox`);
      item.addEventListener("click", () => window.GH.openLightbox(images, i));
      item.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          window.GH.openLightbox(images, i);
        }
      });

      const img = item.querySelector("img");
      if (img) img.style.cursor = "zoom-in";
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
