// Grand Horizon Suites - Location & Map Logic
(function() {
  window.GH = window.GH || {};

  const initMap = () => {
    const mapElement = document.getElementById('map');
    if (!mapElement) return;

    // Hotel Location (Accra area)
    const hotelCoords = [5.6448, -0.1500];
    const map = L.map('map').setView(hotelCoords, 15);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    // Custom Hotel Icon
    const hotelIcon = L.divIcon({
      className: 'hotel-marker-icon',
      html: `<i class="fas fa-hotel" style="color: #0a2463; font-size: 24px; text-shadow: 0 0 5px white;"></i>`,
      iconSize: [30, 30],
      iconAnchor: [15, 15]
    });

    L.marker(hotelCoords, { icon: hotelIcon })
      .addTo(map)
      .bindPopup('<b>Grand Horizon Suites</b><br>Talented-Royals Academy, Accra')
      .openPopup();

    // User tracking
    let userMarker, userCircle, routeLine;
    let currentDistanceKm = 0;
    const trackBtn = document.getElementById('trackLocation');
    const statusText = document.getElementById('locationStatus');
    const locationSearchInput = document.getElementById('locationSearchInput');
    const locationSearchBtn = document.getElementById('locationSearchBtn');
    const rideCards = document.querySelectorAll('.ride-option');
    const rideEconomyMeta = document.getElementById('rideEconomyMeta');
    const rideComfortMeta = document.getElementById('rideComfortMeta');
    const ridePremiumMeta = document.getElementById('ridePremiumMeta');
    const bookRideBtn = document.getElementById('bookRideBtn');
    const rideLabels = { economy: 'Economy', comfort: 'Comfort', premium: 'Premium' };
    let selectedRide = 'economy';
    let originLabel = 'My current location';

    const renderRoute = (fromCoords) => {
      const from = L.latLng(fromCoords[0], fromCoords[1]);
      const to = L.latLng(hotelCoords[0], hotelCoords[1]);
      currentDistanceKm = +(from.distanceTo(to) / 1000).toFixed(1);

      if (routeLine) map.removeLayer(routeLine);
      routeLine = L.polyline([fromCoords, hotelCoords], {
        color: '#0a2463',
        weight: 4,
        opacity: 0.8,
        dashArray: '8 8'
      }).addTo(map);
      map.fitBounds(routeLine.getBounds(), { padding: [40, 40] });
      updateRideOptions();
    };

    const updateRideOptions = () => {
      const distance = currentDistanceKm || 3.5;
      const models = {
        economy: { base: 12, perKm: 2.4, speed: 28 },
        comfort: { base: 18, perKm: 3.2, speed: 32 },
        premium: { base: 28, perKm: 4.6, speed: 36 }
      };
      const buildMeta = (model) => {
        const eta = Math.max(6, Math.round((distance / model.speed) * 60));
        const fare = Math.round((model.base + (distance * model.perKm)) * 10) / 10;
        return `ETA ${eta} min • GHS ${fare}`;
      };
      if (rideEconomyMeta) rideEconomyMeta.textContent = buildMeta(models.economy);
      if (rideComfortMeta) rideComfortMeta.textContent = buildMeta(models.comfort);
      if (ridePremiumMeta) ridePremiumMeta.textContent = buildMeta(models.premium);
    };

    rideCards.forEach((card) => {
      card.addEventListener('click', () => {
        rideCards.forEach((item) => item.classList.remove('active'));
        card.classList.add('active');
        selectedRide = card.dataset.ride || 'economy';
        const rideName = card.querySelector('.ride-name')?.textContent || 'Ride';
        const meta = card.querySelector('.ride-meta')?.textContent || '';
        if (statusText) statusText.textContent = `${rideName} selected. ${meta}`;
      });
    });

    const geocodeAndRoute = async () => {
      if (!locationSearchInput || !locationSearchInput.value.trim()) return;
      const query = locationSearchInput.value.trim();
      originLabel = query;
      if (statusText) statusText.textContent = 'Finding location...';
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(query + ', Accra, Ghana')}`);
        const data = await res.json();
        if (!data || data.length === 0) {
          if (statusText) statusText.textContent = 'Location not found. Try a nearby landmark or area.';
          return;
        }
        const lat = parseFloat(data[0].lat);
        const lon = parseFloat(data[0].lon);
        const userCoords = [lat, lon];
        if (userMarker) {
          map.removeLayer(userMarker);
          if (userCircle) map.removeLayer(userCircle);
        }
        userMarker = L.marker(userCoords).addTo(map).bindPopup(`Start point: ${query}`).openPopup();
        renderRoute(userCoords);
        if (statusText) statusText.textContent = `Route ready: ${currentDistanceKm} km to Grand Horizon Suites.`;
      } catch (err) {
        if (statusText) statusText.textContent = 'Search failed. Please try again.';
      }
    };

    if (locationSearchBtn) locationSearchBtn.addEventListener('click', geocodeAndRoute);
    if (locationSearchInput) {
      locationSearchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          geocodeAndRoute();
        }
      });
    }

    if (trackBtn) {
      trackBtn.addEventListener('click', () => {
        if (!navigator.geolocation) {
          statusText.textContent = "Geolocation is not supported by your browser";
          return;
        }

        statusText.textContent = "Locating...";
        trackBtn.disabled = true;

        navigator.geolocation.getCurrentPosition(
          (position) => {
            const { latitude, longitude, accuracy } = position.coords;
            const userCoords = [latitude, longitude];
            originLabel = 'My current GPS location';

            if (userMarker) { map.removeLayer(userMarker); map.removeLayer(userCircle); }

            userCircle = L.circle(userCoords, { radius: accuracy, color: '#d4af37', fillOpacity: 0.15 }).addTo(map);
            userMarker = L.marker(userCoords).addTo(map)
              .bindPopup('You are here (within ' + Math.round(accuracy) + ' meters)').openPopup();
            renderRoute(userCoords);
            statusText.textContent = `Real-time location updated. Route distance: ${currentDistanceKm} km`;
            trackBtn.disabled = false;
          },
          (error) => {
            statusText.textContent = "Unable to retrieve your location: " + error.message;
            trackBtn.disabled = false;
          },
          { enableHighAccuracy: true }
        );
      });
    }

    if (bookRideBtn) {
      bookRideBtn.addEventListener('click', () => {
        const activeRideCard = document.querySelector('.ride-option.active');
        const rideKey = activeRideCard?.dataset.ride || selectedRide;
        const rideName = rideLabels[rideKey] || 'Economy';
        const rideMeta = activeRideCard?.querySelector('.ride-meta')?.textContent || 'ETA not available';
        const pickupText = locationSearchInput?.value?.trim() || originLabel || 'My current location';
        const message =
          `Hello Grand Horizon Suites, I would like to book a ${rideName} ride to your hotel.\n` +
          `Pickup: ${pickupText}\n` +
          `Estimate: ${rideMeta}\n` +
          `Distance: ${currentDistanceKm || 0} km`;
        const whatsappUrl = `https://wa.me/233532102856?text=${encodeURIComponent(message)}`;
        window.open(whatsappUrl, '_blank', 'noopener');
      });
    }

    updateRideOptions();
  };

  document.addEventListener('DOMContentLoaded', initMap);
  console.log("[GH] Map Logic loaded");
})();
