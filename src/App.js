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
  const [isLoading, setIsLoading] = useState(true);
  const [debugMode, setDebugMode] = useState(false);
  
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
    
    // Check for saved debug mode
    const savedDebugMode = localStorage.getItem('debugMode') === 'true';
    setDebugMode(savedDebugMode);
  }, []);
  
  // Effect to apply dark mode class to body when darkMode changes
  useEffect(() => {
    if (darkMode) {
      document.body.classList.add('dark-mode');
    } else {
      document.body.classList.remove('dark-mode');
    }
  }, [darkMode]);
  
  // Debug logging helper
  const debugLog = useCallback((message, data) => {
    if (debugMode) {
      if (data) {
        console.log(`%c[APP DEBUG] ${message}`, 'background: #4CAF50; color: white; padding: 2px 5px; border-radius: 3px;', data);
      } else {
        console.log(`%c[APP DEBUG] ${message}`, 'background: #4CAF50; color: white; padding: 2px 5px; border-radius: 3px;');
      }
    }
  }, [debugMode]);
  
  // Load CSV data on component mount
  useEffect(() => {
    setIsLoading(true);
    
    // Use the Google Sheets published CSV URL
    const csvUrl = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRMxih2SsybskeLkCCx-HNENiyM3fY3QaLj7Z_uw-Qw-kp7a91cShfW45Y9IZTd6bKYv-1-MTOVoWFH/pub?gid=0&single=true&output=csv';
    
    Papa.parse(csvUrl, {
      download: true,
      header: true,
      complete: (results) => {
        // Add debug output to see raw data
        if (debugMode) {
          debugLog("Raw CSV data (first item):", results.data[0]);
        }
        
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
        
        // Log venues for debugging
        if (debugMode) {
          debugLog(`Loaded ${dataWithIds.length} venues`);
          debugLog("First venue:", dataWithIds[0]);
        }
      },
      error: (err) => {
        console.error('Error parsing CSV:', err);
        setIsLoading(false);
      }
    });
  }, [debugMode, debugLog]);
  
  // Improved filter application function with clearer logic separation
  const applyFilters = useCallback((day, isHappeningNow, neighborhood = null) => {
    console.log(`Applying filters - day: ${day}, happeningNow: ${isHappeningNow}, neighborhood: ${neighborhood}`);
    if (debugMode) {
      debugLog(`Applying filters - day: ${day}, happeningNow: ${isHappeningNow}, neighborhood: ${neighborhood}`);
    }
    
    let filtered = [...allVenues];
    
    // Apply day filter - This is the ONLY actual filtering that removes pins from the map
    if (day !== 'all') {
      const dayMapping = { 'mon': 'Mon', 'tue': 'Tue', 'wed': 'Wed', 'thu': 'Thu', 'fri': 'Fri' };
      const column = dayMapping[day];
      
      filtered = filtered.filter(venue => {
        // Normalize value check to handle case sensitivity and whitespace
        const value = venue[column]?.trim()?.toLowerCase() || '';
        return value === 'yes';
      });
      
      console.log(`After ${day} filter: ${filtered.length} venues remain`);
      if (debugMode) {
        debugLog(`After ${day} filter: ${filtered.length} venues remain`);
      }
    }
    
    // Apply happening now filter - Also actually filters results
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
        if (debugMode) {
          debugLog(`After 'happening now' filter for ${todayColumn}: ${filtered.length} venues remain`);
        }
      }
    }
    
    // NO LONGER apply neighborhood filter here - neighborhood selection is now a visual highlight
    // not a filtering operation
    // If we're in debug mode, still log the count for that neighborhood
    if (neighborhood && debugMode) {
      const neighborhoodCount = filtered.filter(venue => venue.Neighborhood === neighborhood).length;
      debugLog(`Neighborhood ${neighborhood} contains ${neighborhoodCount} venues after day filtering`);
    }
    
    // Log IDs of the venues that passed all filters - for debugging
    console.log("Filtered venue IDs:", filtered.map(v => v.id));
    if (debugMode) {
      debugLog("Filtered venue IDs:", filtered.map(v => v.id));
    }
    
    // Set filtered venues - this only affects visibility based on day filters
    setFilteredVenues(filtered);
    
    return filtered;
  }, [allVenues, debugMode, debugLog]);
  
  // Apply filters whenever filter state changes - only day and happening now are actual filters
  useEffect(() => {
    if (!isLoading) {
      // We no longer pass selectedNeighborhood to applyFilters
      // because neighborhood selection is now just a visual highlight
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
  
  // Unified venue selection handler - with improved behavior
  const handleVenueSelect = (venueId) => {
    // Always clear previous selection first
    setSelectedVenue(null);
    
    // If venueId is null, we're just clearing the selection
    if (venueId === null) {
      return;
    }
    
    // Find the venue in the complete venues array, not just filtered
    // This ensures we can select any venue even if it's filtered out by day
    const selected = allVenues.find(v => v.id === venueId);
    if (!selected) return;
    
    // Set the new selected venue
    setSelectedVenue(selected);
    
    // If selecting a venue, also select its neighborhood
    if (selected.Neighborhood && selected.Neighborhood !== selectedNeighborhood) {
      setSelectedNeighborhood(selected.Neighborhood);
    }
    
    if (debugMode) {
      debugLog(`Selected venue: ${venueId}`, selected);
    }
  };
  
  // Simplified neighborhood selection
  const handleNeighborhoodSelect = (neighborhood) => {
    // If deselecting current neighborhood, clear selected venue too
    if (neighborhood === null && selectedVenue) {
      setSelectedVenue(null);
    }
    
    setSelectedNeighborhood(neighborhood);
    
    if (debugMode) {
      debugLog(`Selected neighborhood: ${neighborhood}`);
    }
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
    } else {
      // When turning off "Happening Now", reset to "All Days"
      setActiveDay('all');
      if (debugMode) {
        debugLog('Resetting day filter to "All Days" after turning off "Happening Now"');
      }
    }
  };
  
  // Handle debug mode toggle
  const handleDebugModeToggle = () => {
    const newDebugMode = !debugMode;
    setDebugMode(newDebugMode);
    
    // Save preference to localStorage
    localStorage.setItem('debugMode', newDebugMode.toString());
    
    console.log(`Debug mode ${newDebugMode ? 'enabled' : 'disabled'}`);
    
    // Force markers to update with debug visibility
    if (newDebugMode && mapRef) {
      setTimeout(() => {
        console.log("Triggering marker debug refresh");
        // This will trigger a re-render with debug mode
      }, 500);
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
        debugMode={debugMode}
        onDebugModeToggle={handleDebugModeToggle}
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
          debugMode={debugMode}
          key={`map-${debugMode}`} // Force re-mounting when debug mode changes
        />
      </main>
      
      <Footer darkMode={darkMode} />
      
      {debugMode && (
        <div 
          style={{
            position: 'fixed',
            bottom: '10px',
            right: '10px',
            background: 'rgba(255, 87, 34, 0.9)',
            color: 'white',
            padding: '5px 10px',
            borderRadius: '4px',
            fontSize: '12px',
            zIndex: 10000,
            cursor: 'pointer'
          }}
          onClick={handleDebugModeToggle}
        >
          DEBUG MODE ON
        </div>
      )}
    </div>
  );
}