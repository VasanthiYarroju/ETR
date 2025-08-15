// src/App.js
import React from 'react';
import Homepage from './pages/Home';
import FlightsPage from "./pages/FlightsPage";
import { BrowserRouter, Routes, Route } from 'react-router-dom';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Homepage />} />
        <Route path="/flights" element={<FlightsPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
