import React, { useState, useEffect } from 'react';

const FlightTracker = ({ flights, onFlightUpdate }) => {
  const [staticFlights, setStaticFlights] = useState([]);

  useEffect(() => {
    // Remove all animations - just use static flight positions
    const processedFlights = flights.map(flight => ({
      ...flight,
      // Keep original positions without animation
      animatedLat: flight.latitude,
      animatedLng: flight.longitude,
      trail: [] // No trail tracking
    }));
    
    setStaticFlights(processedFlights);
  }, [flights]);

  useEffect(() => {
    if (onFlightUpdate) {
      onFlightUpdate(staticFlights);
    }
  }, [staticFlights, onFlightUpdate]);

  return null; // This is a logic component, no visual rendering
};

export default FlightTracker;

