// src/FlightPage.jsx

import React, { useEffect, useState, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import axios from 'axios';
import { X, Search, ExternalLink, RefreshCw } from 'lucide-react'; 

// Import the custom plane image
import planeImage from '../assets/flight_icon.png'; // <--- IMPORTANT: Ensure this path is correct based on your project structure

// Import the new CSS file for FlightPage
import './FlightPage.css'; // <--- ADD THIS LINE

// IMPORTANT: This fixes the default marker icon issue with Leaflet in React
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// A custom component to detect map clicks and close the sidebar
const MapClickDetector = ({ onMapClick }) => {
  useMapEvents({
    click: (e) => {
      // Check if the click event originated from a marker or its popup
      if (!e.originalEvent.target.closest('.leaflet-marker-icon') && !e.originalEvent.target.closest('.leaflet-popup')) {
        onMapClick();
      }
    },
  });
  return null;
};

const FlightPage = () => {
  const [flights, setFlights] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedFlight, setSelectedFlight] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const mapRef = useRef();

  const fetchFlightData = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get('http://localhost:5000/api/flights');
      if (response.data && response.data.flights) {
        const validFlights = response.data.flights
          .filter(f => f.latitude !== null && f.longitude !== null && f.velocity !== null && f.heading !== null)
          .map((flight, index) => ({
            id: flight.id || `flight-${index}-${Date.now()}-${Math.random()}`,
            callsign: flight.callsign || 'N/A',
            latitude: flight.latitude,
            longitude: flight.longitude,
            altitude: flight.altitude || 0,
            velocity: flight.velocity || 0,
            heading: flight.heading || 0,
            country: flight.country || 'Unknown'
          }));
        setFlights(validFlights);
      } else {
        setError("No flight data received from the server.");
        setFlights([]);
      }
    } catch (err) {
      console.error('Error fetching flight data:', err);
      setError("Failed to load flight data. Please ensure your backend server is running and accessible (e.g., `npm start` or `node server.js` for the backend).");
      setFlights([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFlightData();

    const intervalId = setInterval(fetchFlightData, 10000);

    return () => clearInterval(intervalId);
  }, []);

  const handleFlightClick = (flight) => {
    setSelectedFlight(flight);
    setSidebarOpen(true);
    if (mapRef.current) {
      mapRef.current.panTo([flight.latitude, flight.longitude], 8);
    }
  };

  const handleMapClick = () => {
    if (selectedFlight) {
      setSelectedFlight(null);
      setSidebarOpen(false);
    }
  };

  const getRotatedIcon = (heading) => {
    return L.divIcon({
      className: 'custom-plane-icon', // This class is targeted in FlightPage.css
      // Use the imported PNG image and apply rotation via CSS transform
      html: `<img src="${planeImage}" style="width: 24px; height: 24px; transform: rotate(${heading}deg); transform-origin: 50% 50%; filter: drop-shadow(0 0 2px #4fc3f7);" />`,
      iconSize: [24, 24],
      iconAnchor: [12, 12],
      popupAnchor: [0, -10]
    });
  };

  return (
    <div style={flightPageStyles.container}>
      
      {error && <div style={flightPageStyles.errorOverlay}>{error}</div>}

      <MapContainer
        center={[20, 0]}
        zoom={2}
        minZoom={2}
        maxZoom={14}
        style={flightPageStyles.map}
        whenCreated={mapInstance => { mapRef.current = mapInstance }}
      >
        {/* Changed to OpenStreetMap colored tiles */}
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
        <MapClickDetector onMapClick={handleMapClick} />

        {flights.map(flight => (
          <Marker
            key={flight.id}
            position={[flight.latitude, flight.longitude]}
            icon={getRotatedIcon(flight.heading)}
            eventHandlers={{
              click: () => handleFlightClick(flight),
            }}
          >
            <Popup>
              <div style={flightPageStyles.popupContent}>
                <h4 style={flightPageStyles.popupTitle}>Flight: {flight.callsign}</h4>
                <p><strong>Altitude:</strong> {Math.round(flight.altitude)} m</p>
                <p><strong>Speed:</strong> {Math.round(flight.velocity)} km/h</p>
                <p><strong>Heading:</strong> {Math.round(flight.heading)}°</p>
                <p><strong>Origin:</strong> {flight.country}</p>
                <p><strong>Lat/Lon:</strong> {flight.latitude.toFixed(4)}, {flight.longitude.toFixed(4)}</p>
                <a 
                  href={`https://flightaware.com/live/flight/${flight.callsign}`} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  style={flightPageStyles.externalLink}
                >
                  View on FlightAware <ExternalLink size={12} />
                </a>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      <div style={{
        ...flightPageStyles.topRightControls,
        right: sidebarOpen ? '370px' : '20px' 
      }}>
        <button onClick={fetchFlightData} style={flightPageStyles.controlButton} title="Refresh Data">
          <RefreshCw size={20} />
        </button>
        <button style={flightPageStyles.controlButton} title="Search (Coming Soon)">
          <Search size={20} />
        </button>
      </div>

      <div style={{
        ...flightPageStyles.sidebar,
        right: sidebarOpen ? '0px' : '-350px'
      }}>
        <button onClick={() => { setSelectedFlight(null); setSidebarOpen(false); }} style={flightPageStyles.closeButton}>
          <X size={20} />
        </button>
        {selectedFlight ? (
          <div style={flightPageStyles.sidebarContent}>
            <h3 style={flightPageStyles.sidebarTitle}>Flight Details</h3>
            <div style={flightPageStyles.detailItem}>
              <span>Callsign:</span> <strong>{selectedFlight.callsign}</strong>
            </div>
            <div style={flightPageStyles.detailItem}>
              <span>Origin Country:</span> <span>{selectedFlight.country}</span>
            </div>
            <div style={flightPageStyles.detailItem}>
              <span>Altitude:</span> <span>{Math.round(selectedFlight.altitude)} m</span>
            </div>
            <div style={flightPageStyles.detailItem}>
              <span>Ground Speed:</span> <span>{Math.round(selectedFlight.velocity)} km/h</span>
            </div>
            <div style={flightPageStyles.detailItem}>
              <span>Heading:</span> <span>{Math.round(selectedFlight.heading)}°</span>
            </div>
            <div style={flightPageStyles.detailItem}>
              <span>Latitude:</span> <span>{selectedFlight.latitude.toFixed(4)}</span>
            </div>
            <div style={flightPageStyles.detailItem}>
              <span>Longitude:</span> <span>{selectedFlight.longitude.toFixed(4)}</span>
            </div>
            <a 
              href={`https://flightaware.com/live/flight/${selectedFlight.callsign}`} 
              target="_blank" 
              rel="noopener noreferrer" 
              style={flightPageStyles.sidebarExternalLink}
            >
              View on FlightAware <ExternalLink size={16} />
            </a>
          </div>
        ) : (
          <div style={flightPageStyles.sidebarContent}>
            <h3 style={flightPageStyles.sidebarTitle}>Live Flight Radar</h3>
            <p style={{marginBottom: '10px'}}>Click on an aircraft marker on the map to see its details.</p>
            <div style={flightPageStyles.detailItem}>
              <span>Total Live Flights:</span> <strong>{flights.length.toLocaleString()}</strong>
            </div>
            <p style={{fontSize: '12px', opacity: 0.7, marginTop: '20px'}}>Data provided by OpenSky Network via your backend server.</p>
          </div>
        )}
      </div>
    </div>
  );
};

// Styles for the FlightPage component (no changes needed here for this request)
const flightPageStyles = {
  container: {
    position: 'relative',
    width: '100vw',
    height: '100vh',
    overflow: 'hidden',
    display: 'flex',
    backgroundColor: '#000',
    fontFamily: 'sans-serif',
  },
  map: {
    flexGrow: 1,
    height: '100%',
    width: '100%',
    zIndex: 1,
  },
  loadingOverlay: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    backgroundColor: 'rgba(0,0,0,0.8)',
    color: 'white',
    padding: '20px 40px',
    borderRadius: '10px',
    zIndex: 100,
    fontSize: '18px',
    fontWeight: 'bold',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  errorOverlay: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    backgroundColor: 'rgba(255,0,0,0.8)',
    color: 'white',
    padding: '20px 40px',
    borderRadius: '10px',
    zIndex: 100,
    fontSize: '16px',
    fontWeight: 'bold',
    textAlign: 'center',
    maxWidth: '500px',
    boxShadow: '0 0 15px rgba(255,0,0,0.5)',
  },
  sidebar: {
    position: 'absolute',
    top: '0',
    right: '-350px',
    width: '350px',
    height: '100%',
    backgroundColor: 'rgba(25, 25, 25, 0.9)',
    backdropFilter: 'blur(10px)',
    boxShadow: '-4px 0 15px rgba(0,0,0,0.4)',
    zIndex: 20,
    transition: 'right 0.3s ease-in-out',
    padding: '20px',
    color: 'white',
    overflowY: 'auto',
    borderLeft: '1px solid rgba(255, 255, 255, 0.18)',
  },
  sidebarContent: {
    paddingTop: '40px',
  },
  closeButton: {
    position: 'absolute',
    top: '15px',
    right: '15px',
    background: 'none',
    border: 'none',
    color: 'white',
    cursor: 'pointer',
    padding: '5px',
    borderRadius: '50%',
    backgroundColor: 'rgba(255,255,255,0.1)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'background-color 0.2s',
  },
  sidebarTitle: {
    fontSize: '24px',
    marginBottom: '20px',
    borderBottom: '1px solid rgba(255,255,255,0.2)',
    paddingBottom: '10px',
    color: '#4fc3f7',
  },
  detailItem: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '8px 0',
    borderBottom: '1px solid rgba(255,255,255,0.1)',
    fontSize: '15px',
  },
  sidebarExternalLink: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '5px',
    marginTop: '20px',
    color: '#4fc3f7',
    textDecoration: 'none',
    fontWeight: 'bold',
    transition: 'color 0.2s',
  },
  popupContent: {
    color: '#333',
    fontSize: '14px',
  },
  popupTitle: {
    margin: '0 0 10px 0',
    color: '#007bff',
    fontSize: '16px',
  },
  externalLink: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '5px',
    marginTop: '10px',
    color: '#007bff',
    textDecoration: 'none',
    fontSize: '12px',
    fontWeight: 'bold',
  },
  topRightControls: {
    position: 'absolute',
    top: '20px',
    zIndex: 10,
    display: 'flex',
    gap: '10px',
    transition: 'right 0.3s ease-in-out',
  },
  controlButton: {
    background: 'rgba(25, 25, 25, 0.9)',
    border: '1px solid rgba(255, 255, 255, 0.18)',
    borderRadius: '8px',
    padding: '10px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'white',
    boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
    backdropFilter: 'blur(5px)',
    transition: 'background-color 0.2s',
  },
};

export default FlightPage;