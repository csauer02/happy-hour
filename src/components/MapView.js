import React, { useEffect, useRef, useCallback, useState, useMemo } from 'react';
import './MapView.css';

// Create a global tracking variable to prevent multiple script loads
let googleMapsLoaded = false;
let googleMapsLoading = false;

const MapView = ({ 
  venues, 
  setMapRef, 
  setMarkers, 
  onMarkerClick, 
  selectedVenue, 
  darkMode, 
  selectedNeighborhood, 
  filteredVenues,
  debugMode = false
}) => {
  const mapContainerRef = useRef(null);
  const googleMapRef = useRef(null);
  const markersRef = useRef({});
  const activeInfoWindowRef = useRef(null);
  const [userLocation, setUserLocation] = useState(null);
  const mapInitializedRef = useRef(false);
  const previousSelectedVenueRef = useRef(null);
  const filteredVenueIdsRef = useRef(new Set());
  const [debugInfo, setDebugInfo] = useState({
    markersCreated: 0,
    markersVisible: 0,
    markersHidden: 0,
    lastAction: '',
    errors: []
  });
  
  // Add state for neighborhood focus and venue selection
  const [focusedNeighborhood, setFocusedNeighborhood] = useState(null);
  const [isVenueSelected, setIsVenueSelected] = useState(false);
  
  // Create a debug log wrapper function
  const debugLog = useCallback((message, data = null) => {
    if (debugMode) {
      if (data) {
        console.log(`%c[MAP DEBUG] ${message}`, 'background: #aa00aa; color: white; padding: 2px 5px; border-radius: 3px;', data);
      } else {
        console.log(`%c[MAP DEBUG] ${message}`, 'background: #aa00aa; color: white; padding: 2px 5px; border-radius: 3px;');
      }
    }
  }, [debugMode]);
  
  // Get Google Maps API key from environment variables
  const apiKey = process.env.REACT_APP_GOOGLE_MAPS_API_KEY || '';
  
  // Flag colors for markers
  const flagColors = useMemo(() => [
    '#FF0018', // Red
    '#FFA52C', // Orange
    '#FFFF41', // Yellow
    '#008018', // Green
    '#0000F9', // Blue
    '#86007D', // Purple
    '#FFFFFF', // Trans white
    '#F5A9B8', // Trans pink
    '#5BCEFA', // Trans blue
    '#FFDA00', // Intersex yellow
    '#613915'  // PoC brown
  ], []);

  // Helper function to create a circle marker for user location
  const createCircleMarker = useCallback((color) => {
    const div = document.createElement('div');
    div.style.width = '16px';
    div.style.height = '16px';
    div.style.borderRadius = '50%';
    div.style.backgroundColor = color;
    div.style.border = '2px solid white';
    div.style.boxShadow = '0 2px 6px rgba(0,0,0,0.3)';
    return div;
  }, []);
  
  // Get a color based on venue id
  const getPinColor = useCallback((venueId) => {
    return flagColors[venueId % flagColors.length];
  }, [flagColors]);
  
  // Updated create pin element function with opacity support
  const createPinElement = useCallback((color = '#FF0000', isSelected = false, venueId = null, opacity = 1) => {
    // Create SVG marker
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="${isSelected ? '36' : '28'}" height="${isSelected ? '36' : '28'}">
        <path 
          fill="${color}" 
          stroke="#000000" 
          stroke-width="1" 
          d="M12,2C8.14,2 5,5.14 5,9c0,5.25 7,13 7,13s7,-7.75 7,-13c0,-3.86 -3.14,-7 -7,-7zM12,4c1.1,0 2,0.9 2,2c0,1.1 -0.9,2 -2,2s-2,-0.9 -2,-2c0,-1.1 0.9,-2 2,-2z"
          opacity="${opacity}"
        />
        ${venueId !== null && debugMode ? `<text x="12" y="11" font-size="7" text-anchor="middle" fill="white" font-weight="bold">${venueId}</text>` : ''}
      </svg>
    `;
    
    const div = document.createElement('div');
    div.innerHTML = svg;
    div.style.cursor = 'pointer';
    div.style.filter = isSelected ? 'drop-shadow(0px 3px 3px rgba(0, 0, 0, 0.4))' : 'none';
    div.style.zIndex = isSelected ? '1000' : '1';
    div.style.transform = isSelected ? 'scale(1.2)' : 'scale(1)';
    div.style.transition = 'all 0.2s ease';
    
    // Add a data attribute for debugging
    if (venueId !== null) {
      div.setAttribute('data-venue-id', venueId);
    }
    
    return div;
  }, [debugMode]);
  
  // Create Near Me button
  const createNearMeButton = useCallback(() => {
    const controlButton = document.createElement('button');
    controlButton.style.backgroundColor = darkMode ? '#333' : '#fff';
    controlButton.style.border = darkMode ? '2px solid #555' : '2px solid #fff';
    controlButton.style.borderRadius = '3px';
    controlButton.style.boxShadow = '0 2px 6px rgba(0,0,0,.3)';
    controlButton.style.cursor = 'pointer';
    controlButton.style.marginTop = '10px';
    controlButton.style.marginRight = '10px';
    controlButton.style.padding = '8px 16px';
    controlButton.style.textAlign = 'center';
    controlButton.style.color = darkMode ? '#f0f0f0' : '#750787';
    controlButton.style.fontFamily = 'Roboto,Arial,sans-serif';
    controlButton.style.fontSize = '14px';
    controlButton.style.fontWeight = 'bold';
    controlButton.textContent = '📍 Near Me';
    controlButton.title = 'Click to show venues near your current location';
    controlButton.type = 'button';
    
    // Change appearance on hover
    controlButton.addEventListener('mouseover', () => {
      controlButton.style.backgroundColor = darkMode ? '#444' : '#f8f8f8';
      controlButton.style.color = darkMode ? '#fff' : '#8a2be2';
    });
    
    controlButton.addEventListener('mouseout', () => {
      controlButton.style.backgroundColor = darkMode ? '#333' : '#fff';
      controlButton.style.color = darkMode ? '#f0f0f0' : '#750787';
    });
    
    return controlButton;
  }, [darkMode]);

  // Create Debug button for map
  const createDebugButton = useCallback(() => {
    const debugButton = document.createElement('button');
    debugButton.style.backgroundColor = debugMode ? '#ff5722' : (darkMode ? '#333' : '#fff');
    debugButton.style.border = darkMode ? '2px solid #555' : '2px solid #fff';
    debugButton.style.borderRadius = '3px';
    debugButton.style.boxShadow = '0 2px 6px rgba(0,0,0,.3)';
    debugButton.style.cursor = 'pointer';
    debugButton.style.marginTop = '10px';
    debugButton.style.marginRight = '10px';
    debugButton.style.padding = '8px 16px';
    debugButton.style.textAlign = 'center';
    debugButton.style.color = debugMode ? '#fff' : (darkMode ? '#f0f0f0' : '#750787');
    debugButton.style.fontFamily = 'Roboto,Arial,sans-serif';
    debugButton.style.fontSize = '14px';
    debugButton.style.fontWeight = 'bold';
    debugButton.textContent = '🐞 Debug';
    debugButton.title = 'Click to show marker debugging information';
    debugButton.type = 'button';
    debugButton.id = 'map-debug-button';
    
    // Change appearance on hover
    debugButton.addEventListener('mouseover', () => {
      debugButton.style.backgroundColor = debugMode ? '#ff7043' : (darkMode ? '#444' : '#f8f8f8');
      debugButton.style.color = debugMode ? '#fff' : (darkMode ? '#fff' : '#8a2be2');
    });
    
    debugButton.addEventListener('mouseout', () => {
      debugButton.style.backgroundColor = debugMode ? '#ff5722' : (darkMode ? '#333' : '#fff');
      debugButton.style.color = debugMode ? '#fff' : (darkMode ? '#f0f0f0' : '#750787');
    });
    
    // Add click handler
    debugButton.addEventListener('click', () => {
      // Show/hide debug info
      showMarkerDebugInfo();
    });
    
    return debugButton;
  }, [darkMode, debugMode]);
  
  // Show debug info for markers
  const showMarkerDebugInfo = useCallback(() => {
    if (!googleMapRef.current) return;

    const visibleMarkers = [];
    const hiddenMarkers = [];
    
    Object.entries(markersRef.current).forEach(([id, marker]) => {
      if (marker.map === googleMapRef.current) {
        visibleMarkers.push(id);
      } else {
        hiddenMarkers.push(id);
      }
    });
    
    debugLog('==== MARKER DEBUG INFO ====');
    debugLog(`Total markers: ${Object.keys(markersRef.current).length}`);
    debugLog(`Visible markers: ${visibleMarkers.length}`, visibleMarkers);
    debugLog(`Hidden markers: ${hiddenMarkers.length}`, hiddenMarkers);
    debugLog(`Filtered venues: ${filteredVenues.length}`, filteredVenues.map(v => v.id));
    debugLog('==========================');
    
    // Update debug info state
    setDebugInfo(prev => ({
      ...prev,
      markersCreated: Object.keys(markersRef.current).length,
      markersVisible: visibleMarkers.length,
      markersHidden: hiddenMarkers.length,
      lastAction: 'Debug info displayed'
    }));
    
    // Create a debug overlay on the map
    createDebugOverlay(visibleMarkers, hiddenMarkers);
  }, [debugLog, filteredVenues]);
  
  // Create a debug overlay on the map
  const createDebugOverlay = useCallback((visibleMarkers, hiddenMarkers) => {
    try {
      // Remove any existing debug overlay
      const existingOverlay = document.getElementById('map-debug-overlay');
      if (existingOverlay) {
        existingOverlay.remove();
      }
      
      // Create a new debug overlay
      const overlay = document.createElement('div');
      overlay.id = 'map-debug-overlay';
      overlay.style.position = 'absolute';
      overlay.style.bottom = '10px';
      overlay.style.left = '10px';
      overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
      overlay.style.color = 'white';
      overlay.style.padding = '10px';
      overlay.style.borderRadius = '5px';
      overlay.style.maxWidth = '300px';
      overlay.style.maxHeight = '400px';
      overlay.style.overflowY = 'auto';
      overlay.style.zIndex = '1000';
      overlay.style.fontSize = '12px';
      overlay.style.fontFamily = 'monospace';
      
      // Add debug info to the overlay
      overlay.innerHTML = `
        <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
          <strong>Marker Debug Info</strong>
          <span id="debug-close" style="cursor: pointer;">✖</span>
        </div>
        <div style="margin-bottom: 5px; padding-bottom: 5px; border-bottom: 1px solid #555;">
          <div>Total markers: ${Object.keys(markersRef.current).length}</div>
          <div>Visible markers: ${visibleMarkers.length}</div>
          <div>Hidden markers: ${hiddenMarkers.length}</div>
          <div>Filtered venues: ${filteredVenues.length}</div>
        </div>
        <div style="margin-top: 10px; max-height: 200px; overflow-y: auto;">
          <div><strong>Visible IDs:</strong></div>
          <div style="color: #4caf50; word-wrap: break-word;">${visibleMarkers.join(', ')}</div>
          <div style="margin-top: 10px;"><strong>Hidden IDs:</strong></div>
          <div style="color: #f44336; word-wrap: break-word;">${hiddenMarkers.join(', ')}</div>
        </div>
        <div style="margin-top: 10px;">
          <button id="debug-refresh" style="background: #4caf50; border: none; color: white; padding: 5px; border-radius: 3px; cursor: pointer; margin-right: 5px;">Refresh Data</button>
          <button id="debug-force-update" style="background: #ff9800; border: none; color: white; padding: 5px; border-radius: 3px; cursor: pointer;">Force Update Visibility</button>
        </div>
      `;
      
      // Add the overlay to the map container
      if (mapContainerRef.current) {
        mapContainerRef.current.appendChild(overlay);
        
        // Add event listeners to the overlay
        document.getElementById('debug-close').addEventListener('click', () => {
          overlay.remove();
        });
        
        document.getElementById('debug-refresh').addEventListener('click', () => {
          showMarkerDebugInfo();
        });
        
        document.getElementById('debug-force-update').addEventListener('click', () => {
          forceUpdateMarkersVisibility();
        });
      }
    } catch (error) {
      console.error("Error creating debug overlay:", error);
    }
  }, [filteredVenues, showMarkerDebugInfo]);
  
  // Force update marker visibility
  const forceUpdateMarkersVisibility = useCallback(() => {
    if (!googleMapRef.current) return;
    
    debugLog("FORCE UPDATING MARKER VISIBILITY");
    
    try {
      // Create a Set of filtered venue IDs
      const filteredIds = new Set(filteredVenues.map(v => v.id.toString()));
      
      // Update all markers visibility
      Object.entries(markersRef.current).forEach(([venueId, marker]) => {
        if (marker) {
          const shouldBeVisible = filteredIds.has(venueId);
          marker.map = shouldBeVisible ? googleMapRef.current : null;
          debugLog(`Force set marker ${venueId} visibility to ${shouldBeVisible}`);
        }
      });
      
      debugLog("Force visibility update complete");
      setDebugInfo(prev => ({
        ...prev,
        lastAction: 'Force updated marker visibility'
      }));
      
      // Refresh debug info
      setTimeout(() => showMarkerDebugInfo(), 500);
    } catch (error) {
      console.error("Error force updating marker visibility:", error);
      setDebugInfo(prev => ({
        ...prev,
        errors: [...prev.errors, `Error force updating marker visibility: ${error.message}`]
      }));
    }
  }, [debugLog, filteredVenues, showMarkerDebugInfo]);
  
  // Handle "Near Me" functionality
  const handleNearMe = useCallback(() => {
    if (navigator.geolocation && googleMapRef.current && window.google && window.google.maps && window.google.maps.marker) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const userPos = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
          
          setUserLocation(userPos);
          
          if (googleMapRef.current) {
            // Skip animation, set directly
            googleMapRef.current.setCenter(userPos);
            googleMapRef.current.setZoom(14);
            
            // Add user location marker - using AdvancedMarkerElement
            const { AdvancedMarkerElement } = window.google.maps.marker;
            
            // Add user location marker with circle
            new AdvancedMarkerElement({
              map: googleMapRef.current,
              position: userPos,
              title: 'Your Location',
              zIndex: 1000,
              content: createCircleMarker('#4285F4')
            });
          }
        },
        (error) => {
          console.error("Error getting location: ", error);
          alert("Unable to access your location. Please check your browser settings.");
        },
        { enableHighAccuracy: true }
      );
    } else {
      alert("Geolocation is not supported by your browser or Maps API not fully loaded.");
    }
  }, [createCircleMarker, setUserLocation]);
  
  // Helper to close active info window
  const closeActiveInfoWindow = useCallback(() => {
    if (activeInfoWindowRef.current) {
      try {
        activeInfoWindowRef.current.setMap(null);
        activeInfoWindowRef.current = null;
      } catch (error) {
        console.error("Error closing info window:", error);
      }
    }
  }, []);
  
  // Initialize Google Maps
  const initializeMap = useCallback(() => {
    if (mapInitializedRef.current || !mapContainerRef.current) return;
    
    try {
      const mapOptions = {
        mapId: '5f55aaf697b4ea71', // Custom Map ID
        center: { lat: 33.7490, lng: -84.3880 }, // Atlanta coordinates
        zoom: 12,
        disableDefaultUI: false,
        zoomControl: true,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
        gestureHandling: 'greedy',
        animatedZoom: false,
        clickableIcons: false
      };
      
      const map = new window.google.maps.Map(mapContainerRef.current, mapOptions);
      
      // Add passive event listeners for touch events
      if (map.getDiv()) {
        mapContainerRef.current.addEventListener('touchstart', (e) => {}, { passive: true });
        mapContainerRef.current.addEventListener('touchmove', (e) => {}, { passive: true });
      }
      
      googleMapRef.current = map;
      mapInitializedRef.current = true;
      
      setMapRef(map);
      
      // Add Near Me control
      const nearMeControlDiv = document.createElement('div');
      const nearMeControl = createNearMeButton();
      nearMeControlDiv.appendChild(nearMeControl);
      nearMeControl.addEventListener('click', handleNearMe);
      
      map.controls[window.google.maps.ControlPosition.TOP_RIGHT].push(nearMeControlDiv);
      
      // Add Debug control
      const debugControlDiv = document.createElement('div');
      const debugControl = createDebugButton();
      debugControlDiv.appendChild(debugControl);
      
      map.controls[window.google.maps.ControlPosition.TOP_RIGHT].push(debugControlDiv);
      
      // Add global map click handler to close any open info windows and clear selection
      map.addListener('click', () => {
        closeActiveInfoWindow();
        
        // Clear selection when clicking on the map
        if (selectedVenue) {
          onMarkerClick(null);
        }
      });
      
      // Monitor map capabilities for debugging
      map.addListener('mapcapabilities_changed', () => {
        const capabilities = map.getMapCapabilities();
        
        if (!capabilities.isAdvancedMarkersAvailable) {
          debugLog("Warning: Advanced markers are not available!");
        }
      });
      
      debugLog("Map initialized successfully");
    } catch (error) {
      console.error("Error initializing map:", error);
      setDebugInfo(prev => ({
        ...prev,
        errors: [...prev.errors, `Error initializing map: ${error.message}`]
      }));
    }
  }, [
    handleNearMe, 
    setMapRef, 
    selectedVenue, 
    onMarkerClick, 
    createNearMeButton, 
    closeActiveInfoWindow, 
    createDebugButton, 
    debugLog
  ]);
  
  // Create custom info window
  const createCustomInfoWindow = useCallback((content, marker) => {
    if (!googleMapRef.current) return null;
    
    // Close any existing info window first
    closeActiveInfoWindow();
    
    const CustomInfoWindow = function(content, position) {
      this.content = content;
      this.position = position;
      this.div = null;
      this.setMap(googleMapRef.current);
    };
    
    CustomInfoWindow.prototype = new window.google.maps.OverlayView();
    
    CustomInfoWindow.prototype.onAdd = function() {
      const div = document.createElement('div');
      div.className = `custom-info-window ${darkMode ? 'dark-mode' : ''}`;
      div.style.position = 'absolute';
      div.style.boxShadow = darkMode ? '0 2px 8px rgba(0,0,0,0.5)' : '0 2px 6px rgba(0,0,0,0.2)';
      div.style.borderRadius = '8px';
      div.style.padding = '10px';
      div.style.backgroundColor = darkMode ? '#333' : '#fff';
      div.style.border = darkMode ? '1px solid #555' : '1px solid #ddd';
      div.style.minWidth = '200px';
      div.style.color = darkMode ? '#f0f0f0' : '#333';
      div.style.fontFamily = 'Roboto, sans-serif';
      div.style.fontSize = '14px';
      div.style.zIndex = '999';
      
      // Add rainbow flag border to top
      const rainbow = document.createElement('div');
      rainbow.style.position = 'absolute';
      rainbow.style.top = '0';
      rainbow.style.left = '0';
      rainbow.style.right = '0';
      rainbow.style.height = '4px';
      rainbow.style.borderTopLeftRadius = '8px';
      rainbow.style.borderTopRightRadius = '8px';
      rainbow.style.background = 'linear-gradient(to right, #FF0018, #FFA52C, #FFFF41, #008018, #0000F9, #86007D)';
      
      div.appendChild(rainbow);
      
      const contentDiv = document.createElement('div');
      contentDiv.style.marginTop = '6px';
      contentDiv.innerHTML = this.content;
      div.appendChild(contentDiv);
      
      // Add close button
      const closeButton = document.createElement('div');
      closeButton.style.position = 'absolute';
      closeButton.style.top = '8px';
      closeButton.style.right = '8px';
      closeButton.style.width = '16px';
      closeButton.style.height = '16px';
      closeButton.style.fontSize = '16px';
      closeButton.style.fontWeight = 'bold';
      closeButton.style.cursor = 'pointer';
      closeButton.style.color = darkMode ? '#aaa' : '#666';
      closeButton.innerHTML = '×';
      closeButton.addEventListener('click', (e) => {
        e.stopPropagation();
        this.setMap(null);
        activeInfoWindowRef.current = null;
        // Clear selected venue
        onMarkerClick(null);
      });
      div.appendChild(closeButton);
      
      this.div = div;
      const panes = this.getPanes();
      panes.floatPane.appendChild(div);
    };
    
    CustomInfoWindow.prototype.draw = function() {
      const overlayProjection = this.getProjection();
      if (!overlayProjection) return;
      const position = overlayProjection.fromLatLngToDivPixel(this.position);
      if (!position) return;
      
      // Position the div to the side of the marker
      const div = this.div;
      
      // Position the info window to the right of the marker
      div.style.left = (position.x + 20) + 'px'; // Offset to right
      div.style.top = (position.y - (div.offsetHeight / 2)) + 'px'; // Center vertically
      
      // Add a little arrow pointing to pin
      const arrow = div.querySelector('.info-window-arrow') || document.createElement('div');
      arrow.className = 'info-window-arrow';
      arrow.style.position = 'absolute';
      arrow.style.left = '-8px'; // Point to the left
      arrow.style.top = '50%';
      arrow.style.marginTop = '-8px';
      arrow.style.width = '0';
      arrow.style.height = '0';
      arrow.style.borderTop = '8px solid transparent';
      arrow.style.borderBottom = '8px solid transparent';
      arrow.style.borderRight = darkMode ? '8px solid #333' : '8px solid #fff'; // Point left
      arrow.style.zIndex = '1';
      
      if (!div.contains(arrow)) {
        div.appendChild(arrow);
      }
    };
    
    CustomInfoWindow.prototype.onRemove = function() {
      if (this.div) {
        this.div.parentNode.removeChild(this.div);
        this.div = null;
      }
    };
    
    CustomInfoWindow.prototype.getPosition = function() {
      return this.position;
    };
    
    CustomInfoWindow.prototype.setContent = function(content) {
      if (this.div) {
        const contentDiv = this.div.querySelector('div:nth-child(2)');
        contentDiv.innerHTML = content;
      }
      this.content = content;
    };
    
    // Create and return a new instance
    const infoWindow = new CustomInfoWindow(content, marker.position);
    
    // Store reference to active info window
    activeInfoWindowRef.current = infoWindow;
    
    return infoWindow;
  }, [darkMode, onMarkerClick, closeActiveInfoWindow]);

  // Load Google Maps API
  useEffect(() => {
    if (mapInitializedRef.current) return;
    
    if (googleMapsLoading) {
      debugLog("Google Maps API is already loading");
      return;
    }
    
    async function loadMap() {
      googleMapsLoading = true;
      
      try {
        if (!window.google) {
          const script = document.createElement('script');
          script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&v=beta&callback=initCallback`;
          
          window.initCallback = async () => {
            debugLog("Google Maps API loaded successfully");
            
            if (window.google && window.google.maps) {
              await window.google.maps.importLibrary("marker");
              await window.google.maps.importLibrary("maps");
              initializeMap();
            }
          };
          
          document.head.appendChild(script);
        } else {
          await window.google.maps.importLibrary("marker");
          await window.google.maps.importLibrary("maps");
          initializeMap();
        }
        
        googleMapsLoaded = true;
        googleMapsLoading = false;
      } catch (error) {
        console.error("Error loading Google Maps API:", error);
        googleMapsLoading = false;
        setDebugInfo(prev => ({
          ...prev,
          errors: [...prev.errors, `Error loading Google Maps API: ${error.message}`]
        }));
      }
    }
    
    if (window.google && window.google.maps) {
      debugLog("Google Maps API already loaded");
      loadMap();
      return;
    }
    
    if (!googleMapsLoaded) {
      debugLog("Loading Google Maps API");
      loadMap();
    }
  }, [apiKey, initializeMap, debugLog]);
  
  // Center map on marker
  const centerMapOnMarker = useCallback((marker, map) => {
    if (!marker || !map) return;
    
    try {
      const position = marker.position;
      if (!position) return;
      
      // Set directly without animation
      map.setCenter(position);
      map.setZoom(16);
    } catch (error) {
      console.error("Error centering on marker:", error);
    }
  }, []);
  
  // Update focusedNeighborhood when selectedNeighborhood changes
  useEffect(() => {
    setFocusedNeighborhood(selectedNeighborhood);
  }, [selectedNeighborhood]);
  
  // Track venue selection state
  useEffect(() => {
    setIsVenueSelected(selectedVenue !== null);
  }, [selectedVenue]);
  
  // Updated zooming for neighborhood selection - includes all venues
  const zoomToNeighborhood = useCallback((neighborhood, markers) => {
    if (!googleMapRef.current || !neighborhood) return;
    
    try {
      if (!window.google || !window.google.maps) return;
      
      const bounds = new window.google.maps.LatLngBounds();
      let hasMarkers = false;
      
      // Debug
      debugLog(`Zooming to neighborhood: ${neighborhood}`);
      
      // Include only markers in this neighborhood (regardless of filtering)
      // This ensures we zoom to all venues in the neighborhood, even if they're filtered out
      Object.values(markers).forEach(marker => {
        if (marker && 
            marker._neighborhood === neighborhood && 
            marker.position) {
          bounds.extend(marker.position);
          hasMarkers = true;
          debugLog(`Including marker ${marker._venueId} in bounds`);
        }
      });
      
      if (hasMarkers) {
        // Close any open info window
        closeActiveInfoWindow();
        
        // Fit bounds directly without animation
        googleMapRef.current.fitBounds(bounds, 80); // 80 pixels padding
        
        // Limit maximum zoom level
        if (googleMapRef.current.getZoom() > 15) {
          googleMapRef.current.setZoom(15);
        }
        
        debugLog(`Zoomed to neighborhood: ${neighborhood}`);
      } else {
        debugLog(`No markers found in neighborhood: ${neighborhood}`);
      }
    } catch (error) {
      console.error("Error zooming to neighborhood:", error);
      setDebugInfo(prev => ({
        ...prev,
        errors: [...prev.errors, `Error zooming to neighborhood: ${error.message}`]
      }));
    }
  }, [closeActiveInfoWindow, debugLog]);
  
  // Update markers opacity based on neighborhood and venue selection
  useEffect(() => {
    if (!mapInitializedRef.current || !googleMapRef.current) return;
    
    debugLog(`Updating marker opacity - Selected Neighborhood: ${focusedNeighborhood}, Venue Selected: ${isVenueSelected}`);
    
    // Process each marker to update its appearance based on selection
    Object.entries(markersRef.current).forEach(([venueId, marker]) => {
      if (!marker || !marker.content) return;
      
      const venue = venues.find(v => v.id.toString() === venueId);
      if (!venue) return;
      
      let opacity = 1.0; // Default full opacity
      let isHighlighted = false;
      
      // Case 1: A specific venue is selected
      if (isVenueSelected && selectedVenue) {
        if (selectedVenue.id.toString() === venueId) {
          // Selected venue - full opacity
          opacity = 1.0;
          isHighlighted = true;
        } else {
          // Non-selected venues - reduced opacity
          opacity = 0.2;
        }
      }
      // Case 2: A neighborhood is selected but no specific venue
      else if (focusedNeighborhood && !isVenueSelected) {
        if (venue.Neighborhood === focusedNeighborhood) {
          // Venue in selected neighborhood - full opacity
          opacity = 1.0;
        } else {
          // Venue in other neighborhoods - reduced opacity
          opacity = 0.2;
        }
      }
      
      // Update the marker appearance
      const pinElement = createPinElement(
        getPinColor(venue.id),
        isHighlighted || (selectedVenue && selectedVenue.id.toString() === venueId),
        venue.id,
        opacity
      );
      
      // Replace the existing content
      const oldContent = marker.content;
      if (oldContent && oldContent.parentNode) {
        oldContent.parentNode.replaceChild(pinElement, oldContent);
      } else {
        marker.content = pinElement;
      }
    });
  }, [
    focusedNeighborhood, 
    isVenueSelected, 
    selectedVenue, 
    venues, 
    createPinElement, 
    getPinColor, 
    debugLog
  ]);
  
  // Update pin styles when selected venue changes
  useEffect(() => {
    // Reset previous selected marker if there was one
    if (previousSelectedVenueRef.current && previousSelectedVenueRef.current.id !== selectedVenue?.id) {
      const prevMarker = markersRef.current[previousSelectedVenueRef.current.id];
      if (prevMarker && prevMarker.content) {
        debugLog(`Deselecting marker: ${previousSelectedVenueRef.current.id}`);
        
        // Update marker appearance to deselected state
        const pinElement = createPinElement(
          getPinColor(previousSelectedVenueRef.current.id), 
          false,
          previousSelectedVenueRef.current.id
        );
        
        // Replace the existing content
        const oldContent = prevMarker.content;
        if (oldContent && oldContent.parentNode) {
          oldContent.parentNode.replaceChild(pinElement, oldContent);
        } else {
          prevMarker.content = pinElement;
        }
      }
    }
    
    // Update new selected marker
    if (selectedVenue && markersRef.current[selectedVenue.id]) {
      const marker = markersRef.current[selectedVenue.id];
      
      debugLog(`Selecting marker: ${selectedVenue.id}`);
      
      // Update marker appearance to selected state
      if (marker.content) {
        const pinElement = createPinElement(
          getPinColor(selectedVenue.id), 
          true,
          selectedVenue.id
        );
        
        // Replace the existing content
        const oldContent = marker.content;
        if (oldContent && oldContent.parentNode) {
          oldContent.parentNode.replaceChild(pinElement, oldContent);
        } else {
          marker.content = pinElement;
        }
      }
    }
    
    // Store current selection for next update
    previousSelectedVenueRef.current = selectedVenue;
  }, [selectedVenue, createPinElement, getPinColor, debugLog]);
  
  // Show info window for selected venue
  useEffect(() => {
    if (!mapInitializedRef.current || !googleMapRef.current) {
      return;
    }
    
    try {
      // First close any existing info window
      closeActiveInfoWindow();
      
      // If no venue is selected, just return
      if (!selectedVenue) {
        return;
      }
      
      debugLog(`Showing info window for venue: ${selectedVenue.id}`);
      
      const marker = markersRef.current[selectedVenue.id];
      if (marker) {
        // Create info window content
        const infoContent = `
          <div style="font-family: 'Roboto', sans-serif; max-width: 200px; padding: 5px;">
            <div style="font-weight: bold; color: ${darkMode ? '#b77fdb' : '#750787'}; font-size: 14px; margin-bottom: 8px; border-bottom: 2px solid ${darkMode ? '#b77fdb' : '#750787'}; padding-bottom: 4px;">
              ${selectedVenue.RestaurantName || 'Venue'} ${debugMode ? `(ID: ${selectedVenue.id})` : ''}
            </div>
            <div style="font-size: 12px; margin-bottom: 6px;">${selectedVenue.Deal || ''}</div>
            <div style="font-size: 11px; color: ${darkMode ? '#aaa' : '#666'}; font-style: italic; margin-top: 4px;">
              ${selectedVenue.Neighborhood || ''}
            </div>
          </div>
        `;
        
        // Show the info window
        createCustomInfoWindow(infoContent, marker);
        
        // Center on the selected marker without animation
        centerMapOnMarker(marker, googleMapRef.current);
      } else {
        debugLog(`ERROR: Marker not found for venue: ${selectedVenue.id}`);
      }
    } catch (error) {
      console.error("Error showing info window for selected venue:", error);
      setDebugInfo(prev => ({
        ...prev,
        errors: [...prev.errors, `Error showing info window: ${error.message}`]
      }));
    }
  }, [selectedVenue, darkMode, createCustomInfoWindow, centerMapOnMarker, closeActiveInfoWindow, debugLog, debugMode]);

  // KEY CHANGE: This is the fixed simplified effect that updates marker visibility
  useEffect(() => {
    if (!googleMapRef.current) return;
    
    debugLog(`Updating marker visibility for ${filteredVenues.length} venues`);
    
    // Create a Set of filtered venue IDs as STRINGS for consistent comparison
    const filteredIds = new Set(filteredVenues.map(v => v.id.toString()));
    filteredVenueIdsRef.current = filteredIds;
    
    // For each marker, simply set the map property
    Object.entries(markersRef.current).forEach(([venueId, marker]) => {
      if (marker) {
        const shouldBeVisible = filteredIds.has(venueId);
        const isCurrentlyVisible = marker.map === googleMapRef.current;
        
        // Only update if visibility needs to change
        if (shouldBeVisible !== isCurrentlyVisible) {
          debugLog(`Setting marker ${venueId} visibility to ${shouldBeVisible}`);
          marker.map = shouldBeVisible ? googleMapRef.current : null;
        }
      }
    });
    
    debugLog(`Updated marker visibility - ${filteredVenues.length} should be visible`);
    
    // Update debug info if debugging
    if (debugMode) {
      setTimeout(() => {
        const visibleCount = Object.values(markersRef.current).filter(m => m.map === googleMapRef.current).length;
        setDebugInfo(prev => ({
          ...prev,
          markersVisible: visibleCount,
          markersHidden: Object.keys(markersRef.current).length - visibleCount,
          lastAction: 'Updated marker visibility'
        }));
      }, 100);
    }
  }, [filteredVenues, debugLog, debugMode]);
  
  // KEY CHANGE: New marker creation function that uses Latitude/Longitude from the venue data
  useEffect(() => {
    if (!mapInitializedRef.current || !googleMapRef.current || !venues || venues.length === 0) {
      return;
    }
    
    debugLog(`Checking for missing markers (${venues.length} total venues)`);
    
    // Only create markers for venues that don't already have them
    const missingVenues = venues.filter(venue => {
      return venue && venue.id && !markersRef.current[venue.id.toString()];
    });
    
    if (missingVenues.length === 0) {
      debugLog("No missing markers to create");
      return; // Skip if all markers exist
    }
    
    debugLog(`Creating ${missingVenues.length} new markers`);
    
    // Process each venue without delay since we're not geocoding anymore
    missingVenues.forEach(venue => {
      const venueIdStr = venue.id.toString();
      
      // Skip if already exists
      if (markersRef.current[venueIdStr]) {
        return;
      }
      
      try {
        // Check if venue has valid latitude and longitude
        if (venue.Latitude && venue.Longitude) {
          // Parse the coordinates (ensure they're numbers)
          const lat = parseFloat(venue.Latitude);
          const lng = parseFloat(venue.Longitude);
          
          // Validate coordinates (simple check)
          if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
            debugLog(`Invalid coordinates for venue ${venue.id}: ${lat}, ${lng}`);
            return;
          }
          
          // Create location object
          const location = { lat, lng };
          
          // Check if venue should be visible based on current filters
          const isVisible = filteredVenueIdsRef.current.has(venueIdStr);
          const isSelected = selectedVenue && selectedVenue.id === venue.id;
          
          // Create marker
          const pinElement = createPinElement(
            getPinColor(venue.id), 
            isSelected,
            venue.id
          );
          
          // Create and add marker
          const { AdvancedMarkerElement } = window.google.maps.marker;
          const marker = new AdvancedMarkerElement({
            position: location,
            map: isVisible ? googleMapRef.current : null,
            title: venue.RestaurantName || 'Venue',
            content: pinElement
          });
          
          // Store properties
          marker._neighborhood = venue.Neighborhood || 'Uncategorized';
          marker._venueId = venue.id.toString();
          
          // Add click handler
          marker.addListener('click', () => {
            debugLog(`Marker clicked: ${venue.id}`);
            onMarkerClick(venue.id);
          });
          
          // Store marker reference
          markersRef.current[venueIdStr] = marker;
          
          // Update markers in state
          setMarkers(prev => ({
            ...prev,
            [venueIdStr]: marker
          }));
          
          debugLog(`Created marker for venue ${venue.id} at ${lat}, ${lng}`);
          
        } else {
          debugLog(`Missing coordinates for venue ${venue.id}`);
        }
      } catch (error) {
        console.error(`Error creating marker for venue ${venue.id}:`, error);
        setDebugInfo(prev => ({
          ...prev,
          errors: [...prev.errors, `Error creating marker for venue ${venue.id}: ${error.message}`]
        }));
      }
    });
    
    // Update debug info if debugging
    if (debugMode) {
      setDebugInfo(prev => ({
        ...prev,
        markersCreated: Object.keys(markersRef.current).length,
        lastAction: `Created ${missingVenues.length} markers`
      }));
    }
  }, [
    venues, 
    selectedVenue, 
    onMarkerClick, 
    setMarkers, 
    createPinElement, 
    getPinColor,
    debugLog,
    debugMode
  ]);
  
  // Effect to handle neighborhood zoom when selected neighborhood changes
  useEffect(() => {
    if (!mapInitializedRef.current || !googleMapRef.current || !selectedNeighborhood) return;
    
    try {
      // Zoom to neighborhood
      zoomToNeighborhood(selectedNeighborhood, markersRef.current);
    } catch (error) {
      console.error("Error in neighborhood zoom:", error);
      setDebugInfo(prev => ({
        ...prev,
        errors: [...prev.errors, `Error zooming to neighborhood: ${error.message}`]
      }));
    }
  }, [selectedNeighborhood, zoomToNeighborhood]);
  
  // Add debug button class
  useEffect(() => {
    // Update debug button state if it exists
    const debugButton = document.getElementById('map-debug-button');
    if (debugButton) {
      debugButton.style.backgroundColor = debugMode ? '#ff5722' : (darkMode ? '#333' : '#fff');
      debugButton.style.color = debugMode ? '#fff' : (darkMode ? '#f0f0f0' : '#750787');
    }
    
    // Show initial debug info if debugging
    if (debugMode) {
      setTimeout(() => showMarkerDebugInfo(), 500);
    }
  }, [darkMode, debugMode, showMarkerDebugInfo]);
  
  // Debug display at the bottom of the map
  const renderDebugPanel = () => {
    if (!debugMode) return null;
    
    return (
      <div className="debug-panel" style={{
        position: 'absolute',
        bottom: 0,
        right: 0,
        backgroundColor: 'rgba(0,0,0,0.7)',
        color: 'white',
        padding: '10px',
        fontSize: '12px',
        fontFamily: 'monospace',
        zIndex: 1000,
        maxWidth: '300px',
        maxHeight: '150px',
        overflow: 'auto'
      }}>
        <div><strong>Markers:</strong> {debugInfo.markersCreated}</div>
        <div><strong>Visible:</strong> {debugInfo.markersVisible}</div>
        <div><strong>Hidden:</strong> {debugInfo.markersHidden}</div>
        <div><strong>Filtered Venues:</strong> {filteredVenues.length}</div>
        <div><strong>Last Action:</strong> {debugInfo.lastAction}</div>
        {debugInfo.errors.length > 0 && (
          <div>
            <strong>Errors:</strong>
            <ul style={{ margin: '0', paddingLeft: '20px' }}>
              {debugInfo.errors.slice(-3).map((error, i) => (
                <li key={i} style={{ color: '#ff5252' }}>{error}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    );
  };
  
  return (
    <section id="map-container" className={darkMode ? 'dark-mode' : ''}>
      <div id="map" ref={mapContainerRef}>
        <div id="map-favicon-overlay" className={darkMode ? 'dark-mode' : ''}>
          <img src="/favicon.ico" alt="Site Favicon" />
        </div>
        
        {renderDebugPanel()}
        
        {debugMode && (
          <div style={{
            position: 'absolute',
            top: '10px',
            left: '50%',
            transform: 'translateX(-50%)',
            backgroundColor: 'rgba(0,0,0,0.7)',
            color: 'white',
            padding: '5px 10px',
            borderRadius: '15px',
            zIndex: 1000,
            fontSize: '12px'
          }}>
            DEBUG MODE ENABLED - Filtered Venues: {filteredVenues.length}
          </div>
        )}
      </div>
    </section>
  );
};

export default MapView;