import React, { useState, useEffect } from 'react';
import Papa from 'papaparse';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import MapView from './components/MapView';
import Footer from './components/Footer';
import './App.css';

// Main App Component
export default function App() {
  // State variables
  const [venues, setVenues] = useState([]);
  const [filteredVenues, setFilteredVenues] = useState([]);
  const [selectedVenue, setSelectedVenue] = useState(null);
  const [activeDay, setActiveDay] = useState('all');
  const [happeningNow, setHappeningNow] = useState(false);
  const [mapRef, setMapRef] = useState(null);
  const [markers, setMarkers] = useState({});
  
  // Load CSV data on component mount
  useEffect(() => {
    const csvUrl = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRMxih2SsybskeLkCCx-HNENiyM3fY3QaLj7Z_uw-Qw-kp7a91cShfW45Y9IZTd6bKYv-1-MTOVoWFH/pub?gid=0&single=true&output=csv';
    
    Papa.parse(csvUrl, {
      download: true,
      header: true,
      complete: (results) => {
        // Sort by neighborhood
        const sortedData = results.data.sort((a, b) => {
          const nA = (a.Neighborhood || '').toLowerCase();
          const nB = (b.Neighborhood || '').toLowerCase();
          return nA.localeCompare(nB);
        });
        
        // Add IDs to each venue
        const dataWithIds = sortedData.map((venue, i) => ({ ...venue, id: i }));
        setVenues(dataWithIds);
        setFilteredVenues(dataWithIds);
      },
      error: (err) => {
        console.error('Error parsing CSV:', err);
      }
    });
  }, []);
  
  // Filter venues based on current filters
  useEffect(() => {
    if (venues.length) {
      let filtered = [...venues];
      
      // Apply day filter
      if (activeDay !== 'all') {
        filtered = filtered.filter(venue => {
          const dayMapping = { 'mon': 'Mon', 'tue': 'Tue', 'wed': 'Wed', 'thu': 'Thu', 'fri': 'Fri' };
          const column = dayMapping[activeDay];
          return venue[column] && venue[column].toLowerCase() === 'yes';
        });
      }
      
      // Apply happening now filter
      if (happeningNow) {
        const today = new Date().getDay();
        const dayMapping = { 1: 'Mon', 2: 'Tue', 3: 'Wed', 4: 'Thu', 5: 'Fri' };
        const todayColumn = dayMapping[today];
        
        if (todayColumn) {
          filtered = filtered.filter(venue => venue[todayColumn] && venue[todayColumn].toLowerCase() === 'yes');
        }
      }
      
      setFilteredVenues(filtered);
      
      // Update marker visibility if map is available
      if (mapRef && Object.keys(markers).length) {
        venues.forEach(venue => {
          const marker = markers[venue.id];
          if (marker) {
            const isVisible = filtered.some(v => v.id === venue.id);
            marker.setMap(isVisible ? mapRef : null);
          }
        });
      }
    }
  }, [venues, activeDay, happeningNow, mapRef, markers]);
  
  // Handle venue selection
  const handleVenueSelect = (venueId) => {
    const selected = venues.find(v => v.id === venueId);
    setSelectedVenue(selected);
    
    // Center and zoom map on selected venue if map and markers available
    if (mapRef && markers[venueId]) {
      const marker = markers[venueId];
      mapRef.panTo(marker.getPosition());
      mapRef.setZoom(16);
      
      // Set all markers to default opacity
      Object.values(markers).forEach(m => {
        m.setOpacity(0.3);
      });
      
      // Highlight the selected marker
      marker.setOpacity(1.0);
    }
  };
  
  // Handle day filter change
  const handleDayChange = (day) => {
    if (day === activeDay && day !== 'all') {
      setActiveDay('all');
    } else {
      setActiveDay(day);
      
      // If selecting current day, also toggle happening now
      const today = new Date().getDay();
      const dayMapping = { 1: 'mon', 2: 'tue', 3: 'wed', 4: 'thu', 5: 'fri' };
      
      if (day === dayMapping[today]) {
        setHappeningNow(true);
      } else if (happeningNow) {
        setHappeningNow(false);
      }
    }
  };
  
  // Handle happening now toggle
  const handleHappeningNowToggle = () => {
    const newState = !happeningNow;
    setHappeningNow(newState);
    
    if (newState) {
      // If turning on happening now, also set active day to today
      const today = new Date().getDay();
      const dayMapping = { 1: 'mon', 2: 'tue', 3: 'wed', 4: 'thu', 5: 'fri' };
      
      if (dayMapping[today]) {
        setActiveDay(dayMapping[today]);
      }
    }
  };
  
  return (
    <div className="app-container">
      <Header 
        activeDay={activeDay}
        happeningNow={happeningNow}
        onDayChange={handleDayChange}
        onHappeningNowToggle={handleHappeningNowToggle}
      />
      
      <main id="main-content">
        <Sidebar 
          venues={filteredVenues} 
          selectedVenue={selectedVenue}
          onVenueSelect={handleVenueSelect}
        />
        
        <MapView 
          venues={venues}
          setMapRef={setMapRef}
          setMarkers={setMarkers}
          onMarkerClick={handleVenueSelect}
        />
      </main>
      
      <Footer />
    </div>
  );
}