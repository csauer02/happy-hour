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
  const [searchTerm, setSearchTerm] = useState('');
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
    
    // Apply dark mode class to body
    if (darkMode) {
      document.body.classList.add('dark-mode');
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
  
  // Search function
  const handleSearch = useCallback((term) => {
    setSearchTerm(term);
    
    // If search term is empty, just apply day/happening now filters
    if (!term.trim()) {
      applyFilters(allVenues, activeDay, happeningNow, selectedNeighborhood);
      return;
    }
    
    // Search through venues by name, deal, and neighborhood
    const searchResults = allVenues.filter(venue => {
      const lowerTerm = term.toLowerCase();
      return (
        (venue.RestaurantName && venue.RestaurantName.toLowerCase().includes(lowerTerm)) ||
        (venue.Deal && venue.Deal.toLowerCase().includes(lowerTerm)) ||
        (venue.Neighborhood && venue.Neighborhood.toLowerCase().includes(lowerTerm))
      );
    });
    
    // Apply other filters to search results
    applyFilters(searchResults, activeDay, happeningNow, selectedNeighborhood);
  }, [allVenues, activeDay, happeningNow, selectedNeighborhood]);
  
  // Filter application helper function
  const applyFilters = useCallback((venueList, day, isHappeningNow, neighborhood) => {
    let filtered = [...venueList];
    
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
    
    // Apply neighborhood filter
    if (neighborhood) {
      filtered = filtered.filter(venue => 
        venue.Neighborhood === neighborhood || 
        (!venue.Neighborhood && neighborhood === 'Uncategorized')
      );
    }
    
    setFilteredVenues(filtered);
    
    // Update marker visibility if map is available
    updateMarkerVisibility(filtered);
  }, []);
  
  // Update marker visibility based on filtered venues
  const updateMarkerVisibility = useCallback((filteredList) => {
    if (mapRef && Object.keys(markers).length) {
      allVenues.forEach(venue => {
        const marker = markers[venue.id];
        if (marker) {
          const isVisible = filteredList.some(v => v.id === venue.id);
          marker.setMap(isVisible ? mapRef : null);
        }
      });
    }
  }, [mapRef, markers, allVenues]);
  
  // Effect to apply filters when filter state changes
  useEffect(() => {
    // If search is active, apply search and filters
    if (searchTerm) {
      handleSearch(searchTerm);
    } else {
      // Otherwise just apply regular filters
      applyFilters(allVenues, activeDay, happeningNow, selectedNeighborhood);
    }
  }, [activeDay, happeningNow, allVenues, searchTerm, selectedNeighborhood, handleSearch, applyFilters]);
  
  // Handle dark mode toggle
  const handleDarkModeToggle = () => {
    const newDarkMode = !darkMode;
    setDarkMode(newDarkMode);
    
    // Save preference to localStorage
    localStorage.setItem('darkMode', newDarkMode.toString());
  };
  
  // Handle venue selection
  const handleVenueSelect = (venueId) => {
    const selected = venues.find(v => v.id === venueId);
    setSelectedVenue(selected);
    
    // If selecting a venue, also select its neighborhood
    if (selected && selected.Neighborhood) {
      setSelectedNeighborhood(selected.Neighborhood);
    }
  };
  
  // Handle neighborhood selection
  const handleNeighborhoodSelect = (neighborhood) => {
    setSelectedNeighborhood(neighborhood);
    
    // If deselecting the current neighborhood, also clear selected venue
    if (selectedVenue && neighborhood === null) {
      setSelectedVenue(null);
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
  
  // Reset all filters
  const handleResetFilters = () => {
    setActiveDay('all');
    setHappeningNow(false);
    setSearchTerm('');
    setSelectedNeighborhood(null);
    setSelectedVenue(null);
    setFilteredVenues(allVenues);
    
    // Reset marker visibility
    if (mapRef && Object.keys(markers).length) {
      allVenues.forEach(venue => {
        const marker = markers[venue.id];
        if (marker) {
          marker.setMap(mapRef);
        }
      });
    }
  };
  
  return (
    <div className={`app-container ${darkMode ? 'dark-mode' : ''}`}>
      <Header 
        activeDay={activeDay}
        happeningNow={happeningNow}
        onDayChange={handleDayChange}
        onHappeningNowToggle={handleHappeningNowToggle}
        onSearch={handleSearch}
        darkMode={darkMode}
        onDarkModeToggle={handleDarkModeToggle}
        onResetFilters={handleResetFilters}
      />
      
      <main id="main-content">
        <Sidebar 
          venues={filteredVenues} 
          selectedVenue={selectedVenue}
          onVenueSelect={handleVenueSelect}
          darkMode={darkMode}
          onNeighborhoodSelect={handleNeighborhoodSelect}
          selectedNeighborhood={selectedNeighborhood}
        />
        
        <MapView 
          venues={venues}
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