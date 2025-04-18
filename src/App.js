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
  // We need these state variables, even if not directly used in this file
  // eslint-disable-next-line no-unused-vars
  const [mapRef, setMapRef] = useState(null);
  // eslint-disable-next-line no-unused-vars
  const [markers, setMarkers] = useState({});
  const [darkMode, setDarkMode] = useState(false);
  const [selectedNeighborhood, setSelectedNeighborhood] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  
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
    setIsLoading(true);
    
    // Use the Google Sheets published CSV URL
    const csvUrl = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRMxih2SsybskeLkCCx-HNENiyM3fY3QaLj7Z_uw-Qw-kp7a91cShfW45Y9IZTd6bKYv-1-MTOVoWFH/pub?gid=0&single=true&output=csv';
    
    Papa.parse(csvUrl, {
      download: true,
      header: true,
      complete: (results) => {
        console.log("CSV Data loaded:", results.data[0]); // Log first venue to help debug
        
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
        setIsLoading(false);
      },
      error: (err) => {
        console.error('Error parsing CSV:', err);
        setIsLoading(false);
      }
    });
  }, []);
  
  // Improved filter application function with clearer logging
  const applyFilters = useCallback((day, isHappeningNow) => {
    console.log(`Applying filters - day: ${day}, happeningNow: ${isHappeningNow}`);
    
    let filtered = [...allVenues];
    
    // Apply day filter
    if (day !== 'all') {
      const dayMapping = { 'mon': 'Mon', 'tue': 'Tue', 'wed': 'Wed', 'thu': 'Thu', 'fri': 'Fri' };
      const column = dayMapping[day];
      
      filtered = filtered.filter(venue => {
        // Normalize value check to handle case sensitivity and whitespace
        const value = venue[column]?.trim()?.toLowerCase() || '';
        return value === 'yes';
      });
      
      console.log(`After ${day} filter: ${filtered.length} venues remain`);
    }
    
    // Apply happening now filter
    if (isHappeningNow) {
      const today = new Date().getDay();
      const dayMapping = { 1: 'Mon', 2: 'Tue', 3: 'Wed', 4: 'Thu', 5: 'Fri' };
      const todayColumn = dayMapping[today];
      
      if (todayColumn) {
        filtered = filtered.filter(venue => {
          const value = venue[todayColumn]?.trim()?.toLowerCase() || '';
          return value === 'yes';
        });
        
        console.log(`After 'happening now' filter for ${todayColumn}: ${filtered.length} venues remain`);
      }
    }
    
    // Set filtered venues
    setFilteredVenues(filtered);
    
    // Log IDs of filtered venues for debugging
    console.log("Filtered venue IDs:", filtered.map(v => v.id));
  }, [allVenues]);
  
  // Effect to apply filters when filter state changes
  useEffect(() => {
    if (!isLoading) {
      applyFilters(activeDay, happeningNow);
    }
  }, [activeDay, happeningNow, applyFilters, isLoading]);
  
  // Handle dark mode toggle
  const handleDarkModeToggle = () => {
    const newDarkMode = !darkMode;
    setDarkMode(newDarkMode);
    
    // Save preference to localStorage
    localStorage.setItem('darkMode', newDarkMode.toString());
  };
  
  // Simplified unified venue selection handler
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
  
  // Improved handle day filter change
  const handleDayChange = (day) => {
    console.log(`Day filter changing from ${activeDay} to ${day}`);
    
    // Turn off "Happening Now" when "All Days" is selected
    if (day === 'all' && happeningNow) {
      setHappeningNow(false);
    }
    
    // If clicking the active day, deselect it (unless it's 'all')
    if (day === activeDay && day !== 'all') {
      setActiveDay('all');
      // Also turn off "Happening Now" when resetting to "All Days"
      if (happeningNow) {
        setHappeningNow(false);
      }
    } else {
      setActiveDay(day);
      
      // If selecting current day and happening now is off, also toggle happening now on
      const today = new Date().getDay();
      const dayMapping = { 1: 'mon', 2: 'tue', 3: 'wed', 4: 'thu', 5: 'fri' };
      const todayString = dayMapping[today];
      
      if (day === todayString && !happeningNow) {
        setHappeningNow(true);
      } else if (day !== 'all' && day !== todayString && happeningNow) {
        // If selecting a different day than today, turn off happening now
        setHappeningNow(false);
      }
    }
  };
  
  // Improved handle happening now toggle
  const handleHappeningNowToggle = () => {
    const newState = !happeningNow;
    console.log(`Toggling 'happening now' to ${newState}`);
    setHappeningNow(newState);
    
    if (newState) {
      // If turning on happening now, also set active day to today
      const today = new Date().getDay();
      const dayMapping = { 1: 'mon', 2: 'tue', 3: 'wed', 4: 'thu', 5: 'fri' };
      const todayString = dayMapping[today];
      
      if (todayString && activeDay !== todayString) {
        setActiveDay(todayString);
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
          isLoading={isLoading}
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
          isLoading={isLoading}
        />
      </main>
      
      <Footer darkMode={darkMode} />
    </div>
  );
}