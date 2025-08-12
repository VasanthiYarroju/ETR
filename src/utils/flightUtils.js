// Flight utility functions for animation and visualization

export const interpolatePosition = (start, end, progress) => {
  return {
    lat: start.lat + (end.lat - start.lat) * progress,
    lng: start.lng + (end.lng - start.lng) * progress
  };
};

export const getFlightColor = (altitude) => {
  // Color flights based on altitude like OpenSky
  if (altitude > 12000) return '#8A2BE2'; // Purple for high altitude
  if (altitude > 8000) return '#4169E1';  // Royal blue for medium-high
  if (altitude > 4000) return '#00BFFF';  // Deep sky blue for medium
  if (altitude > 1000) return '#00FF7F';  // Spring green for low-medium
  return '#FFD700'; // Gold for very low altitude
};

export const getFlightIcon = (altitude, heading) => {
  // Return different icons based on altitude with better airplane design
  const color = getFlightColor(altitude);
  return `data:image/svg+xml;base64,${btoa(`
    <svg width="20" height="20" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
      <g transform="rotate(${heading || 0} 10 10)">
        <!-- Airplane body -->
        <path d="M10 2 L12 12 L10 16 L8 12 Z" 
              fill="${color}" 
              stroke="#ffffff" 
              stroke-width="0.5"/>
        <!-- Wings -->
        <path d="M3 8 L8 10 L12 10 L17 8 L12 11 L8 11 Z" 
              fill="${color}" 
              stroke="#ffffff" 
              stroke-width="0.5"/>
        <!-- Tail -->
        <path d="M8 14 L10 18 L12 14 Z" 
              fill="${color}" 
              stroke="#ffffff" 
              stroke-width="0.5"/>
        <!-- Cockpit -->
        <circle cx="10" cy="6" r="1.5" fill="#ffffff" opacity="0.9"/>
      </g>
    </svg>
  `)}`;
};

export const createFlightPath = (positions) => {
  // Create a smooth path from position history
  return positions.map(pos => [pos.lat, pos.lng]);
};

export const calculateFlightMovement = (flight, deltaTime) => {
  if (!flight.velocity || flight.velocity === 0) {
    return { lat: flight.latitude, lng: flight.longitude };
  }

  const speedKmh = flight.velocity;
  const speedMs = speedKmh * 1000 / 3600; // Convert km/h to m/s
  const distanceM = speedMs * (deltaTime / 1000); // Distance in meters
  
  // Convert to degrees (rough approximation)
  const heading = (flight.heading || 0) * Math.PI / 180;
  const deltaLat = (distanceM * Math.cos(heading)) / 111000;
  const deltaLng = (distanceM * Math.sin(heading)) / (111000 * Math.cos(flight.latitude * Math.PI / 180));

  return {
    lat: flight.latitude + deltaLat,
    lng: flight.longitude + deltaLng
  };
};

export const formatFlightInfo = (flight) => {
  return `
    <div style="color: white; font-family: Arial, sans-serif;">
      <strong style="color: #4fc3f7;">${flight.callsign}</strong><br/>
      <span>Altitude: ${Math.round(flight.altitude || 0)}m</span><br/>
      <span>Speed: ${Math.round(flight.velocity || 0)}km/h</span><br/>
      <span>Heading: ${Math.round(flight.heading || 0)}°</span><br/>
      <span>Country: ${flight.country || 'Unknown'}</span>
    </div>
  `;
};
