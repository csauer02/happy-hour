import React, { useState, useEffect, useCallback } from 'react';
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
  const [allVenues, setAllVenues] = useState([]);
  const [selectedVenue, setSelectedVenue] = useState(null);
  const [activeDay, setActiveDay] = useState('all');
  const [happeningNow, setHappeningNow] = useState(false);
  const [mapRef, setMapRef] = useState(null);
  const [markers, setMarkers] = useState({});
  const [darkMode, setDarkMode] = useState(false);
  const [selectedNeighborhood, setSelectedNeighborhood] = useState(null);
  
  // Check for system preferences and saved dark mode preference on initial load
  useEffect(() => {
    // Check if prefers-color-scheme media query is available
    if (window.matchMedia) {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      
      // Check if there's a saved preference in localStorage, otherwise use system preference
      const savedDarkMode = localStorage.getItem('darkMode');
      
      if (savedDarkMode !== null) {
        // Use saved preference if available
        setDarkMode(savedDarkMode === 'true');
      } else if (prefersDark) {
        // Use system preference if no saved preference
        setDarkMode(true);
      }
    } else {
      // Fallback to saved preference only if media query not supported
      const savedDarkMode = localStorage.getItem('darkMode') === 'true';
      setDarkMode(savedDarkMode);
    }
  }, []);
  
  // Effect to apply dark mode class to body when darkMode changes
  useEffect(() => {
    if (darkMode) {
      document.body.classList.add('dark-mode');
    } else {
      document.body.classList.remove('dark-mode');
    }
  }, [darkMode]);
  
  // Load CSV data on component mount
  useEffect(() => {
    const csvUrl = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRMxih2SsybskeLkCCx-HNENiyM3fY3QaLj7Z_uw-Qw-kp7a91cShfW45Y9IZTd6bKYv-1-MTOVoWFH/pub?gid=0&single=true&output=csv';
    
    Papa.parse(csvUrl, {
      download: true,
      header: true,
      complete: (results) => {
        // Sort by neighborhood
        const sortedData = results.data
          .filter(item => item.RestaurantName && item.Deal) // Filter out empty rows
          .sort((a, b) => {
            const nA = (a.Neighborhood || '').toLowerCase();
            const nB = (b.Neighborhood || '').toLowerCase();
            return nA.localeCompare(nB);
          });
        
        // Add IDs to each venue
        const dataWithIds = sortedData.map((venue, i) => ({ ...venue, id: i }));
        
        setVenues(dataWithIds);
        setAllVenues(dataWithIds);
        setFilteredVenues(dataWithIds);
      },
      error: (err) => {
        console.error('Error parsing CSV:', err);
      }
    });
  }, []);
  
  // Update marker visibility based on filtered venues
  const updateMarkerVisibility = useCallback((filteredList) => {
    if (mapRef && Object.keys(markers).length) {
      allVenues.forEach(venue => {
        const marker = markers[venue.id];
        if (marker) {
          const isVisible = filteredList.some(v => v.id === venue.id);
          marker.map = isVisible ? mapRef : null;
        }
      });
    }
  }, [mapRef, markers, allVenues]);
  
  // Simplified filter application function
  const applyFilters = useCallback((day, isHappeningNow) => {
    let filtered = [...allVenues];
    
    // Apply day filter
    if (day !== 'all') {
      filtered = filtered.filter(venue => {
        const dayMapping = { 'mon': 'Mon', 'tue': 'Tue', 'wed': 'Wed', 'thu': 'Thu', 'fri': 'Fri' };
        const column = dayMapping[day];
        return venue[column] && venue[column].toLowerCase() === 'yes';
      });
    }
    
    // Apply happening now filter
    if (isHappeningNow) {
      const today = new Date().getDay();
      const dayMapping = { 1: 'Mon', 2: 'Tue', 3: 'Wed', 4: 'Thu', 5: 'Fri' };
      const todayColumn = dayMapping[today];
      
      if (todayColumn) {
        filtered = filtered.filter(venue => venue[todayColumn] && venue[todayColumn].toLowerCase() === 'yes');
      }
    }
    
    // Set filtered venues
    setFilteredVenues(filtered);
    
    // Update marker visibility based on filtered venues
    updateMarkerVisibility(filtered);
  }, [allVenues, updateMarkerVisibility]);
  
  // Effect to apply filters when filter state changes
  useEffect(() => {
    applyFilters(activeDay, happeningNow);
  }, [activeDay, happeningNow, applyFilters]);
  
  // Handle dark mode toggle
  const handleDarkModeToggle = () => {
    const newDarkMode = !darkMode;
    setDarkMode(newDarkMode);
    
    // Save preference to localStorage
    localStorage.setItem('darkMode', newDarkMode.toString());
  };
  
  // Simplified unified venue selection handler with improved selection handling
  const handleVenueSelect = (venueId) => {
    // Always clear previous selection first
    setSelectedVenue(null);
    
    // If venueId is null, we're just clearing the selection
    if (venueId === null) {
      return;
    }
    
    // Find the venue in the venues array
    const selected = venues.find(v => v.id === venueId);
    if (!selected) return;
    
    // Set the new selected venue
    setSelectedVenue(selected);
    
    // If selecting a venue, also select its neighborhood
    if (selected.Neighborhood) {
      setSelectedNeighborhood(selected.Neighborhood);
    }
  };
  
  // Simplified neighborhood selection
  const handleNeighborhoodSelect = (neighborhood) => {
    // If deselecting current neighborhood, clear selected venue too
    if (neighborhood === null && selectedVenue) {
      setSelectedVenue(null);
    }
    
    setSelectedNeighborhood(neighborhood);
  };
  
  // Handle day filter change - simplified
  const handleDayChange = (day) => {
    // If clicking the active day, deselect it
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
  
  // Handle happening now toggle - simplified
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
    <div className={`app-container ${darkMode ? 'dark-mode' : ''}`}>
      <Header 
        activeDay={activeDay}
        happeningNow={happeningNow}
        onDayChange={handleDayChange}
        onHappeningNowToggle={handleHappeningNowToggle}
        darkMode={darkMode}
        onDarkModeToggle={handleDarkModeToggle}
      />
      
      <main id="main-content">
        <Sidebar 
          venues={filteredVenues} 
          allVenues={allVenues}
          selectedVenue={selectedVenue}
          onVenueSelect={handleVenueSelect}
          darkMode={darkMode}
          onNeighborhoodSelect={handleNeighborhoodSelect}
          selectedNeighborhood={selectedNeighborhood}
        />
        
        <MapView 
          venues={venues}
          filteredVenues={filteredVenues}
          selectedVenue={selectedVenue}
          setMapRef={setMapRef}
          setMarkers={setMarkers}
          onMarkerClick={handleVenueSelect}
          darkMode={darkMode}
          selectedNeighborhood={selectedNeighborhood}
        />
      </main>
      
      <Footer darkMode={darkMode} />
    </div>
  );
}