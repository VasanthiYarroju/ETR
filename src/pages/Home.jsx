// src/Home.jsx

import React, { useEffect, useRef, useState } from 'react';
import Globe from 'react-globe.gl';
import axios from 'axios';
import { Plane, Thermometer, Waves, Leaf, Sprout, User, X, Menu, ChevronsDown } from 'lucide-react';
import { MapContainer, TileLayer, Popup, CircleMarker, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { useNavigate } from 'react-router-dom';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const COUNTRIES_GEOJSON_URL = 'https://raw.githubusercontent.com/vasturiano/react-globe.gl/master/example/datasets/ne_110m_admin_0_countries.geojson';
const CITIES_GEOJSON_URL = 'https://raw.githubusercontent.com/drei01/geojson-world-cities/master/cities.geojson';
const EARTHQUAKES_GEOJSON_URL = 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_day.geojson';

// --- Sidebar Configuration (UPDATED) ---
const sidebarItems = [
  { id: 'flight-view', icon: <Plane size={28} />, text: 'Flight View' }, // This item will now navigate
  { id: 'atmosphere', icon: <Thermometer size={28} />, text: 'Atmosphere' },
  { id: 'oceanary', icon: <Waves size={28} />, text: 'Oceanary' },
  { id: 'agricultureA', icon: <Sprout size={28} />, text: 'Crop Health' },
  { id: 'land-use', icon: <Leaf size={28} />, text: 'Land Use' },
];

// MapWidget now only needs data relevant to its active items (no flightData prop anymore)
const MapWidget = ({ activeItem, weatherData, earthquakeData, oceanData }) => {
  const [mapCenter, setMapCenter] = useState([20, 0]);
  const [mapZoom, setMapZoom] = useState(2);

  useEffect(() => {
    // Adjust map view based on active item
    switch (activeItem) {
      // Removed 'flight-view' case as it's now handled by FlightPage.jsx
      case 'atmosphere':
        setMapCenter([30, 0]);
        setMapZoom(2);
        break;
      case 'oceanary':
        setMapCenter([0, 0]);
        setMapZoom(2);
        break;
      case 'agricultureA':
      case 'land-use':
        setMapCenter([30, 0]);
        setMapZoom(2);
        break;
      default:
        setMapCenter([20, 0]);
        setMapZoom(2);
    }
  }, [activeItem]);

  const renderDataPoints = () => {
    switch (activeItem) {
      // Removed 'flight-view' case as flight data is now on FlightPage
        
      case 'atmosphere':
        return (weatherData || []).map(weather => (
          <CircleMarker
            key={weather.name}
            center={[weather.lat, weather.lon]}
            radius={8}
            pathOptions={{
              color: weather.temperature > 25 ? '#ff4444' : weather.temperature > 15 ? '#ffaa00' : '#4444ff',
              fillColor: weather.temperature > 25 ? '#ff4444' : weather.temperature > 15 ? '#ffaa00' : '#4444ff',
              fillOpacity: 0.7
            }}
          >
            <Popup>
              <div>
                <strong>{weather.name}</strong><br />
                Temperature: {weather.temperature}°C<br />
                Wind Speed: {weather.windspeed}km/h<br />
                Humidity: {weather.humidity || Math.round(Math.random() * 40 + 30)}%<br />
                Pressure: {weather.pressure || Math.round(Math.random() * 50 + 1000)}hPa
              </div>
            </Popup>
          </CircleMarker>
        ));
        
      case 'oceanary':
        return (earthquakeData.features || []).slice(0, 30).map(eq => (
          <CircleMarker
            key={eq.id}
            center={[eq.geometry.coordinates[1], eq.geometry.coordinates[0]]}
            radius={eq.properties.mag * 2}
            pathOptions={{ color: '#ff4d4d', fillColor: '#ff4d4d', fillOpacity: 0.6 }}
          >
            <Popup>
              <div>
                <strong>Magnitude {eq.properties.mag.toFixed(1)}</strong><br />
                {eq.properties.place}<br />
                Time: {new Date(eq.properties.time).toLocaleString()}
              </div>
            </Popup>
          </CircleMarker>
        ));
        
      default:
        return null;
    }
  };

  const getMapTitle = () => {
    switch (activeItem) {
      // Removed 'flight-view' case
      case 'atmosphere':
        return 'Global Weather Map';
      case 'oceanary':
        return 'Earthquake Activity';
      case 'agricultureA':
        return 'Crop Health Map';
      case 'land-use':
        return 'Land Use Map';
      default:
        return 'Interactive Map';
    }
  };

  return (
    <div style={{ width: '100%', height: '100%' }}>
      <h4 style={{ color: 'white', fontSize: '14px', fontWeight: '600', marginBottom: '0.5rem', padding: '0 0.5rem' }}>
        {getMapTitle()}
      </h4>
      <div style={{ height: '12rem', borderRadius: '0.5rem', overflow: 'hidden', border: '1px solid rgba(255, 255, 255, 0.18)' }}>
        <MapContainer
          center={mapCenter}
          zoom={mapZoom}
          style={{ height: '100%', width: '100%' }}
          key={`${activeItem}-${mapCenter[0]}-${mapCenter[1]}-${mapZoom}`}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          />
          {renderDataPoints()}
        </MapContainer>
      </div>
    </div>
  );
};


const Homepage = () => {
  const globeEl = useRef();

  // --- State for UI & Data ---
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [activeItem, setActiveItem] = useState('atmosphere'); // Default view changed, flight is separate now
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  
  // --- State for Globe Data Layers ---
  const [countriesData, setCountriesData] = useState({ features: [] });
  const [citiesData, setCitiesData] = useState({ features: [] });
  const [earthquakeData, setEarthquakeData] = useState({ features: [] });
  // Removed flightData and liveFlights states as they are now in FlightPage.jsx
  const [weatherData, setWeatherData] = useState([]);
  const [oceanData, setOceanData] = useState([]);
  const [hoveredPolygon, setHoveredPolygon] = useState(null);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [clickedRegionData, setClickedRegionData] = useState(null);
  const navigate = useNavigate();

  // --- Real-time Data Fetching Functions ---
  // Removed fetchFlightData as it's moved to FlightPage.jsx

  const fetchWeatherData = async () => {
    try {
      // Using OpenWeatherMap API for major cities
      const cities = [
        { name: 'London', lat: 51.5074, lon: -0.1278 },
        { name: 'New York', lat: 40.7128, lon: -74.0060 },
        { name: 'Tokyo', lat: 35.6762, lon: 139.6503 },
        { name: 'Sydney', lat: -33.8688, lon: 151.2093 },
        { name: 'Paris', lat: 48.8566, lon: 2.3522 },
        { name: 'Mumbai', lat: 19.0760, lon: 72.8777 },
        { name: 'Cairo', lat: 30.0444, lon: 31.2357 },
        { name: 'São Paulo', lat: -23.5505, lon: -46.6333 }
      ];

      const weatherPromises = cities.map(async (city) => {
        try {
          // Using Open-Meteo API (free, no API key required)
          const response = await axios.get(`https://api.open-meteo.com/v1/forecast?latitude=${city.lat}&longitude=${city.lon}&current_weather=true&hourly=relative_humidity_2m,surface_pressure`);
          return {
            ...city,
            temperature: response.data.current_weather.temperature,
            windspeed: response.data.current_weather.windspeed,
            weathercode: response.data.current_weather.weathercode,
            humidity: response.data.hourly.relative_humidity_2m[0] || Math.round(Math.random() * 40 + 30),
            pressure: response.data.hourly.surface_pressure[0] || Math.round(Math.random() * 50 + 1000)
          };
        } catch (error) {
          return {
            ...city,
            temperature: Math.round(Math.random() * 30 + 5),
            windspeed: Math.round(Math.random() * 20 + 5),
            weathercode: Math.floor(Math.random() * 4),
            humidity: Math.round(Math.random() * 40 + 30),
            pressure: Math.round(Math.random() * 50 + 1000)
          };
        }
      });

      const weatherResults = await Promise.all(weatherPromises);
      setWeatherData(weatherResults);
    } catch (error) {
      console.error('Error fetching weather data:', error);
      setWeatherData(generateMockWeatherData());
    }
  };

  const fetchOceanData = async () => {
    try {
      // Mock ocean data for demonstration
      setOceanData(generateMockOceanData());
    } catch (error) {
      console.error('Error fetching ocean data:', error);
      setOceanData(generateMockOceanData());
    }
  };

  // Function to fetch atmospheric data for a clicked region
  const fetchAtmosphericDataForRegion = async (lat, lng) => {
    try {
      const response = await axios.get(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current_weather=true&hourly=relative_humidity_2m,surface_pressure,temperature_2m,wind_speed_10m&daily=temperature_2m_max,temperature_2m_min`);
      
      const currentWeather = response.data.current_weather;
      const hourlyData = response.data.hourly;
      const dailyData = response.data.daily;
      
      return {
        location: { lat, lng },
        temperature: currentWeather.temperature,
        windSpeed: currentWeather.windspeed,
        humidity: hourlyData.relative_humidity_2m[0] || Math.round(Math.random() * 40 + 30),
        pressure: hourlyData.surface_pressure[0] || Math.round(Math.random() * 50 + 1000),
        maxTemp: dailyData.temperature_2m_max[0] || currentWeather.temperature + 5,
        minTemp: dailyData.temperature_2m_min[0] || currentWeather.temperature - 5,
        weatherCode: currentWeather.weathercode,
        timestamp: new Date().toLocaleString()
      };
    } catch (error) {
      console.error('Error fetching atmospheric data:', error);
      // Return mock data as fallback
      return {
        location: { lat, lng },
        temperature: Math.round(Math.random() * 30 + 5),
        windSpeed: Math.round(Math.random() * 20 + 5),
        humidity: Math.round(Math.random() * 40 + 30),
        pressure: Math.round(Math.random() * 50 + 1000),
        maxTemp: Math.round(Math.random() * 35 + 10),
        minTemp: Math.round(Math.random() * 20 + 0),
        weatherCode: Math.floor(Math.random() * 4),
        timestamp: new Date().toLocaleString()
      };
    }
  };

  // --- Mock Data Generators ---
  // Removed generateMockFlightData as it's no longer needed here

  const generateMockWeatherData = () => {
    const cities = [
      { name: 'London', lat: 51.5074, lon: -0.1278 },
      { name: 'New York', lat: 40.7128, lon: -74.0060 },
      { name: 'Tokyo', lat: 35.6762, lon: 139.6503 },
      { name: 'Sydney', lat: -33.8688, lon: 151.2093 },
      { name: 'Paris', lat: 48.8566, lon: 2.3522 },
      { name: 'Mumbai', lat: 19.0760, lon: 72.8777 },
      { name: 'Cairo', lat: 30.0444, lon: 31.2357 },
      { name: 'São Paulo', lat: -23.5505, lon: -46.6333 }
    ];
    
    return cities.map(city => ({
      ...city,
      temperature: Math.round(Math.random() * 30 + 5),
      windspeed: Math.round(Math.random() * 20 + 5),
      weathercode: Math.floor(Math.random() * 4),
      humidity: Math.round(Math.random() * 40 + 30),
      pressure: Math.round(Math.random() * 50 + 1000)
    }));
  };

  const generateMockOceanData = () => {
    return Array.from({ length: 30 }, (_, i) => ({
      id: i,
      latitude: (Math.random() - 0.5) * 180,
      longitude: (Math.random() - 0.5) * 360,
      temperature: Math.random() * 25 + 5,
      salinity: Math.random() * 5 + 30,
      depth: Math.random() * 5000 + 100
    }));
  };

  // --- Data Fetching Effect ---
  useEffect(() => {
    const fetchAllData = async () => {
      try {
        await Promise.all([
          fetch(COUNTRIES_GEOJSON_URL).then(res => res.json()).then(setCountriesData).catch(() => setCountriesData({ features: [] })),
          fetch(CITIES_GEOJSON_URL).then(res => res.json()).then(setCitiesData).catch(() => setCitiesData({ features: [] })),
          fetch(EARTHQUAKES_GEOJSON_URL).then(res => res.json()).then(setEarthquakeData).catch(() => setEarthquakeData({ features: [] })),
          // Removed fetchFlightData() from here
          fetchWeatherData(),
          fetchOceanData()
        ]);
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    };

    fetchAllData();

    // Set up real-time data refresh for the remaining active items
    const interval = setInterval(() => {
      if (activeItem === 'atmosphere') {
        fetchWeatherData();
      } else if (activeItem === 'oceanary') {
        fetchOceanData();
      }
    }, 30000); // Refresh every 30 seconds

    return () => clearInterval(interval);
  }, [activeItem]); // Depend on activeItem to re-evaluate what to fetch

  // --- Globe Configuration Effect (REMOVED AUTO-ROTATION) ---
  useEffect(() => {
    if (globeEl.current) {
      // Removed auto-rotation animations
      globeEl.current.controls().autoRotate = false;
      globeEl.current.pointOfView({ lat: 20, lng: 20, altitude: 2.5 }, 1000);
    }
  }, []); // Runs once on initial render

  // Handle globe polygon clicks for atmospheric data
  const handlePolygonClick = async (polygon) => {
    if (activeItem === 'atmosphere' && polygon && polygon.properties) {
      // Get the center of the country for atmospheric data
      let centerLat = 0, centerLng = 0;
      let totalCoords = 0;

      // This is a more robust way to find a centroid for GeoJSON polygons (can be complex)
      if (polygon.geometry.coordinates && polygon.geometry.coordinates.length > 0) {
        polygon.geometry.coordinates.forEach(ring => { // Rings for polygons (outer, inner holes)
          ring.forEach(coordSet => { // A ring can be a simple array of [lng, lat] or nested for multi-polygons
            if (Array.isArray(coordSet[0])) { // If it's a nested array (e.g., for MultiPolygon)
              coordSet.forEach(coord => {
                centerLng += coord[0];
                centerLat += coord[1];
                totalCoords++;
              });
            } else { // Simple [lng, lat]
              centerLng += coordSet[0];
              centerLat += coordSet[1];
              totalCoords++;
            }
          });
        });
      }
      
      if (totalCoords > 0) {
        centerLat /= totalCoords;
        centerLng /= totalCoords;
      } else { // Fallback if no coordinates found
        centerLat = polygon.properties.latitude || 0; // Try a pre-defined center
        centerLng = polygon.properties.longitude || 0;
      }
      
      const atmosphericData = await fetchAtmosphericDataForRegion(centerLat, centerLng);
      setClickedRegionData({
        ...atmosphericData,
        countryName: polygon.properties.NAME || 'Unknown Region'
      });
    }
  };

  // Handle globe point clicks
  const handlePointClick = async (point) => {
    if (activeItem === 'atmosphere' && point) {
      const lat = point.lat || point.latitude;
      const lng = point.lon || point.lng || point.longitude;
      
      if (lat && lng) {
        const atmosphericData = await fetchAtmosphericDataForRegion(lat, lng);
        setClickedRegionData({
          ...atmosphericData,
          countryName: point.name || 'Selected Location'
        });
      }
    }
    setSelectedLocation(point);
  };

  // SidebarItem component (remains mostly the same)
  const SidebarItem = ({ item, isActive, onClick, isOpen }) => {
    const itemStyle = {
      display: 'flex',
      alignItems: 'center',
      gap: '20px',
      padding: '0',
      cursor: 'pointer',
      height: '52px',
      width: '100%',
      background: 'none',
      border: 'none',
      textAlign: 'left',
      borderRadius: '12px',
      transition: 'background-color 0.2s',
      backgroundColor: isActive ? '#4fc3f7' : 'transparent'
    };
    const iconColor = isActive ? '#212121' : '#FFFFFF';
    const textColor = isActive ? '#212121' : '#FFFFFF';
    
    return (
      <button style={itemStyle} onClick={onClick}>
        <div style={{ minWidth: '50px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {React.cloneElement(item.icon, { color: iconColor })}
        </div>
        {/* Show text directly without motion */}
        {isOpen && (
          <span
            style={{ fontSize: '16px', whiteSpace: 'nowrap', fontWeight: '500', color: textColor }}
          >
            {item.text}
          </span>
        )}
      </button>
    );
  };

  // --- Right Panel Widget Component ---
  const RightPanel = () => {
    const panelStyle = { display: 'flex', flexDirection: 'column', gap: '20px' };
    
    switch (activeItem) {
      // Removed 'flight-view' case as it's no longer handled here
        
      case 'atmosphere':
        return (
          <div style={panelStyle}>
            <div style={styles.widget}>
              <h3 style={styles.widgetTitle}>Global Weather Data</h3>
              <div style={styles.listContainer}>
                {(weatherData || []).map(weather => (
                  <div key={weather.name} style={styles.listItem}>
                    <span style={styles.listItemTitle}>{weather.name}</span>
                    <span style={styles.listItemText}>
                      {weather.temperature}°C | {weather.windspeed}km/h
                    </span>
                  </div>
                ))}
              </div>
            </div>
            
            {clickedRegionData && (
              <div style={styles.widget}>
                <h3 style={styles.widgetTitle}>Atmospheric Conditions - {clickedRegionData.countryName}</h3>
                <div style={styles.atmosphericData}>
                  <div style={styles.dataRow}>
                    <span style={styles.dataLabel}>Temperature:</span>
                    <span style={styles.dataValue}>{clickedRegionData.temperature}°C</span>
                  </div>
                  <div style={styles.dataRow}>
                    <span style={styles.dataLabel}>Humidity:</span>
                    <span style={styles.dataValue}>{clickedRegionData.humidity}%</span>
                  </div>
                  <div style={styles.dataRow}>
                    <span style={styles.dataLabel}>Pressure:</span>
                    <span style={styles.dataValue}>{clickedRegionData.pressure}hPa</span>
                  </div>
                  <div style={styles.dataRow}>
                    <span style={styles.dataLabel}>Wind Speed:</span>
                    <span style={styles.dataValue}>{clickedRegionData.windSpeed}km/h</span>
                  </div>
                  <div style={styles.dataRow}>
                    <span style={styles.dataLabel}>Max/Min Temp:</span>
                    <span style={styles.dataValue}>{clickedRegionData.maxTemp}°C / {clickedRegionData.minTemp}°C</span>
                  </div>
                  <div style={styles.dataRow}>
                    <span style={styles.dataLabel}>Updated:</span>
                    <span style={styles.dataValue}>{clickedRegionData.timestamp}</span>
                  </div>
                </div>
              </div>
            )}
            
            <div style={styles.widget}>
              <MapWidget 
                activeItem={activeItem}
                weatherData={weatherData}
                earthquakeData={earthquakeData}
                oceanData={oceanData}
              />
            </div>
          </div>
        );
        
      case 'oceanary':
        return (
          <div style={panelStyle}>
            <div style={styles.widget}>
              <h3 style={styles.widgetTitle}>Recent Earthquakes</h3>
              <div style={styles.listContainer}>
                {(earthquakeData.features || []).slice(0, 8).map(eq => (
                  <div key={eq.id} style={styles.listItem}>
                    <span style={styles.listItemTitle}>M {eq.properties.mag.toFixed(1)}</span>
                    <span style={styles.listItemText}>{eq.properties.place}</span>
                  </div>
                ))}
              </div>
            </div>
            
            <div style={styles.widget}>
              <MapWidget 
                activeItem={activeItem}
                weatherData={weatherData}
                earthquakeData={earthquakeData}
                oceanData={oceanData}
              />
            </div>
          </div>
        );
        
      // Cases for new sidebar items
      case 'agricultureA':
      case 'land-use':
        const title = activeItem === 'agricultureA' ? 'Crop Health Analysis' : 'Land Use Information';
        return (
          <div style={panelStyle}>
            <div style={styles.widget}>
              <h3 style={styles.widgetTitle}>
                {hoveredPolygon ? hoveredPolygon.properties.NAME : title}
              </h3>
              {hoveredPolygon ? (
                <div>
                  <p><strong>Population:</strong> {hoveredPolygon.properties.POP_EST.toLocaleString()}</p>
                  <p><strong>GDP (Est.):</strong> ${hoveredPolygon.properties.GDP_MD_EST.toLocaleString()}M</p>
                  <p><strong>Continent:</strong> {hoveredPolygon.properties.CONTINENT}</p>
                </div>
              ) : (
                <p>Hover over a country to see details.</p>
              )}
            </div>
            
            <div style={styles.widget}>
              <MapWidget 
                activeItem={activeItem}
                weatherData={weatherData}
                earthquakeData={earthquakeData}
                oceanData={oceanData}
              />
            </div>
          </div>
        );
        
      default:
        return null;
    }
  };

  // --- Get current data for globe visualization ---
  const getCurrentGlobeData = () => {
    switch (activeItem) {
      // Removed 'flight-view' case as it's separated
      case 'atmosphere':
        return {
          pointsData: weatherData || [],
          pointLabel: d => `${d.name}: ${d.temperature}°C, Wind: ${d.windspeed}km/h`,
          pointRadius: 0.2,
          pointColor: d => d.temperature > 25 ? '#ff4444' : d.temperature > 15 ? '#ffaa00' : '#4444ff',
          pointAltitude: 0.02,
          showPolygons: true
        };
      case 'oceanary':
        return {
          pointsData: (earthquakeData.features || []),
          pointLabel: d => `M ${d.properties.mag}: ${d.properties.place}`,
          pointRadius: d => d.properties.mag * 0.08,
          pointColor: '#ff4d4d',
          pointAltitude: 0.02,
          showPolygons: false
        };
      // Cases for new sidebar items
      case 'agricultureA':
      case 'land-use':
        return {
          pointsData: [],
          pointLabel: '',
          pointRadius: 0,
          pointColor: '',
          pointAltitude: 0,
          showPolygons: true
        };
      default:
        return { // Default behavior if activeItem is not specifically handled for globe points
          pointsData: [],
          pointLabel: '',
          pointRadius: 0,
          pointColor: '',
          pointAltitude: 0,
          showPolygons: true // Default to showing polygons for general globe context
        };
    }
  };

  const globeData = getCurrentGlobeData();

  return (
    <div style={styles.page}>
      <Globe
        ref={globeEl}
        globeImageUrl="//unpkg.com/three-globe/example/img/earth-blue-marble.jpg"
        backgroundImageUrl="//unpkg.com/three-globe/example/img/night-sky.png"
        
        polygonsData={globeData.showPolygons ? (countriesData.features || []) : []}
        polygonCapColor={d => d === hoveredPolygon ? 'rgba(0, 170, 255, 0.8)' : 'rgba(200, 200, 200, 0.4)'}
        polygonSideColor={() => 'rgba(0, 0, 0, 0.05)'}
        polygonAltitude={d => d === hoveredPolygon ? 0.05 : 0.01}
        onPolygonHover={setHoveredPolygon}
        onPolygonClick={handlePolygonClick}
        
        pointsData={globeData.pointsData}
        pointLabel={globeData.pointLabel}
        pointRadius={globeData.pointRadius}
        pointColor={globeData.pointColor}
        pointAltitude={globeData.pointAltitude}
        onPointClick={handlePointClick}
      />
      
      <p style={styles.welcomeText}>
        "Welcome to the Future of Earth Observation – Real-time Data that Speaks for the Planet."
      </p>
      
      {/* Static sidebar with your original styling */}
      <div
        style={{
          ...styles.sidebar,
          width: isSidebarOpen ? 280 : 80
        }}
      >
        <div style={styles.sidebarHeader}>
          {isSidebarOpen && (
            <div style={styles.logoContainer}>
              <Plane color="#fff" size={32} />
              <span style={styles.logoText}>AwSc-ETR</span>
            </div>
          )}
          <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} style={styles.toggleButton}>
            {isSidebarOpen ? <X color="#fff" size={24} /> : <Menu color="#fff" size={28} />}
          </button>
        </div>
        <div style={styles.menuItemsContainer}>
          
          {sidebarItems.map((item) => (
            <SidebarItem
              key={item.id}
              item={item}
              isActive={activeItem === item.id}
              onClick={() => {
                if (item.id === 'flight-view') {
                  // Navigate to separate flight radar page
                  navigate('/flights');
                } else {
                  // Keep current homepage behavior for other items
                  setActiveItem(item.id);
                  setClickedRegionData(null); // Clear region data when switching views
                }
              }}
              isOpen={isSidebarOpen}
            />
          ))}
        </div>
      </div>

      <div style={styles.rightWidgetsContainer}>
        <RightPanel />
      </div>
      
      {/* Static scroll indicator */}
      <div style={styles.scrollIndicator}>
        <ChevronsDown color="white" size={28} />
      </div>
      
      <div style={styles.profileContainer}>
        <button onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)} style={styles.profileButton}>
          <User color="#333" size={24} />
        </button>
        {isProfileMenuOpen && (
          <div style={styles.profileMenu}>
            <div style={styles.profileMenuPointer}></div>
            <a href="#profile" style={styles.profileMenuItem}>Profile</a>
            <a href="#subscription" style={styles.profileMenuItem}>Subscription Status</a>
            <a href="#logout" style={styles.profileMenuItem}>Logout</a>
          </div>
        )}
      </div>
    </div>
  );
};

// --- Styles (RESTORED YOUR ORIGINAL STYLING) ---
const styles = {
  page: {
    position: 'relative',
    width: '100vw',
    height: '100vh',
    overflow: 'hidden',
    backgroundColor: '#000000',
    fontFamily: 'sans-serif',
    color: 'white'
  },
  welcomeText: {
    position: 'absolute',
    top: '25px',
    left: '50%',
    transform: 'translateX(-50%)',
    zIndex: 10,
    fontSize: '16px',
    color: 'rgba(255, 255, 255, 0.8)',
    textShadow: '0 1px 3px black'
  },
  sidebar: {
    position: 'absolute',
    top: '80px',
    left: '20px',
    height: 'auto',
    backgroundColor: 'rgba(25, 25, 25, 0.9)',
    backdropFilter: 'blur(10px)',
    borderRadius: '25px',
    padding: '15px 0',
    display: 'flex',
    flexDirection: 'column',
    zIndex: 10,
    boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
    border: '1px solid rgba(255, 255, 255, 0.18)',
    overflow: 'hidden',
    transition: 'width 0.3s ease'
  },
  sidebarHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-end',
    padding: '0 15px 0 25px',
    marginBottom: '20px',
    minHeight: '44px'
  },
  toggleButton: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: '10px',
    zIndex: 2
  },
  logoContainer: {
    position: 'absolute',
    left: '25px',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    color: 'white'
  },
  logoText: {
    fontWeight: 'bold',
    fontSize: '18px',
    whiteWhiteSpace: 'nowrap'
  },
  menuItemsContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    padding: '0 15px'
  },
  rightWidgetsContainer: {
    position: 'absolute',
    top: '10vh',
    right: '20px',
    width: '320px',
    height: '80vh',
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
    zIndex: 10
  },
  widget: {
    backgroundColor: 'rgba(25, 25, 25, 0.8)',
    backdropFilter: 'blur(10px)',
    borderRadius: '25px',
    padding: '20px',
    boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
    border: '1px solid rgba(255, 255, 255, 0.18)'
  },
  widgetTitle: {
    marginTop: 0,
    marginBottom: '15px',
    borderBottom: '1px solid rgba(255,255,255,0.2)',
    paddingBottom: '10px'
  },
  listContainer: {
    maxHeight: '200px',
    overflowY: 'auto'
  },
  listItem: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '8px 0',
    borderBottom: '1px solid rgba(255,255,255,0.1)'
  },
  listItemTitle: {
    fontWeight: 'bold',
    color: '#4fc3f7'
  },
  listItemText: {
    textAlign: 'right',
    fontSize: '14px'
  },
  atmosphericData: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  },
  dataRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '4px 0',
    borderBottom: '1px solid rgba(255,255,255,0.1)'
  },
  dataLabel: {
    fontSize: '14px',
    color: 'rgba(255,255,255,0.8)'
  },
  dataValue: {
    fontSize: '14px',
    fontWeight: 'bold',
    color: '#4fc3f7'
  },
  scrollIndicator: {
    position: 'absolute',
    bottom: '20px',
    left: '50%',
    transform: 'translateX(-50%)',
    zIndex: 10
  },
  profileContainer: {
    position: 'absolute',
    top: '20px',
    right: '20px',
    zIndex: 20
  },
  profileButton: {
    width: '48px',
    height: '48px',
    borderRadius: '50%',
    backgroundColor: '#4fc3f7',
    border: '2px solid #a0a0a0',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    boxShadow: '0 4px 12px rgba(0,0,0,0.4)'
  },
  profileMenu: {
    position: 'absolute',
    top: '65px',
    right: '0',
    width: '200px',
    backgroundColor: 'rgba(43, 43, 43, 0.9)',
    backdropFilter: 'blur(10px)',
    borderRadius: '15px',
    padding: '10px',
    display: 'flex',
    flexDirection: 'column',
    gap: '5px',
    boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
    border: '1px solid rgba(255, 255, 255, 0.18)'
  },
  profileMenuPointer: {
    position: 'absolute',
    top: '-10px',
    right: '15px',
    width: 0,
    height: 0,
    borderLeft: '10px solid transparent',
    borderRight: '10px solid transparent',
    borderBottom: '10px solid rgba(43, 43, 43, 0.9)'
  },
  profileMenuItem: {
    padding: '10px 15px',
    color: 'white',
    textDecoration: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    transition: 'background-color 0.2s'
  }
};

export default Homepage;