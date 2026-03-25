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
    let userMarker, userCircle;
    const trackBtn = document.getElementById('trackLocation');
    const statusText = document.getElementById('locationStatus');

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

            if (userMarker) { map.removeLayer(userMarker); map.removeLayer(userCircle); }

            userCircle = L.circle(userCoords, { radius: accuracy, color: '#d4af37', fillOpacity: 0.15 }).addTo(map);
            userMarker = L.marker(userCoords).addTo(map)
              .bindPopup('You are here (within ' + Math.round(accuracy) + ' meters)').openPopup();

            map.flyTo(userCoords, 16);
            statusText.textContent = "Real-time location updated!";
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
  };

  document.addEventListener('DOMContentLoaded', initMap);
  console.log("[GH] Map Logic loaded");
})();
