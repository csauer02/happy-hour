import React, { useEffect, useRef, useCallback, useState, useMemo } from 'react';
import './MapView.css';

// Create a global tracking variable to prevent multiple script loads
let googleMapsLoaded = false;
let googleMapsLoading = false;

const MapView = ({ venues, setMapRef, setMarkers, onMarkerClick, selectedVenue, darkMode, selectedNeighborhood, filteredVenues }) => {
  const mapContainerRef = useRef(null);
  const googleMapRef = useRef(null);
  const geocoderRef = useRef(null);
  const markersRef = useRef({});
  const activeInfoWindowRef = useRef(null); // Reference to track active info window
  // eslint-disable-next-line no-unused-vars
  const [userLocation, setUserLocation] = useState(null);
  const mapInitializedRef = useRef(false);
  const previousSelectedVenueRef = useRef(null); // Track previous selection
  
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
  
  // Create pin element for markers
  const createPinElement = useCallback((color = '#FF0000', isSelected = false) => {
    // Create SVG marker
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="${isSelected ? '36' : '28'}" height="${isSelected ? '36' : '28'}">
        <path 
          fill="${color}" 
          stroke="#000000" 
          stroke-width="1" 
          d="M12,2C8.14,2 5,5.14 5,9c0,5.25 7,13 7,13s7,-7.75 7,-13c0,-3.86 -3.14,-7 -7,-7zM12,4c1.1,0 2,0.9 2,2c0,1.1 -0.9,2 -2,2s-2,-0.9 -2,-2c0,-1.1 0.9,-2 2,-2z"
        />
      </svg>
    `;
    
    const div = document.createElement('div');
    div.innerHTML = svg;
    div.style.cursor = 'pointer';
    div.style.filter = isSelected ? 'drop-shadow(0px 3px 3px rgba(0, 0, 0, 0.4))' : 'none';
    div.style.zIndex = isSelected ? '1000' : '1';
    div.style.transform = isSelected ? 'scale(1.2)' : 'scale(1)';
    div.style.transition = 'all 0.2s ease';
    
    return div;
  }, []);
  
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
      const geocoder = new window.google.maps.Geocoder();
      
      // Add passive event listeners for touch events
      if (map.getDiv()) {
        mapContainerRef.current.addEventListener('touchstart', (e) => {}, { passive: true });
        mapContainerRef.current.addEventListener('touchmove', (e) => {}, { passive: true });
      }
      
      googleMapRef.current = map;
      geocoderRef.current = geocoder;
      mapInitializedRef.current = true;
      
      setMapRef(map);
      
      // Add Near Me control
      const nearMeControlDiv = document.createElement('div');
      const nearMeControl = createNearMeButton();
      nearMeControlDiv.appendChild(nearMeControl);
      nearMeControl.addEventListener('click', handleNearMe);
      
      map.controls[window.google.maps.ControlPosition.TOP_RIGHT].push(nearMeControlDiv);
      
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
          console.warn("Advanced markers are not available. Using Map ID:", mapOptions.mapId);
        }
      });
      
      console.log("Map initialized successfully");
    } catch (error) {
      console.error("Error initializing map:", error);
    }
  }, [handleNearMe, setMapRef, selectedVenue, onMarkerClick, createNearMeButton, closeActiveInfoWindow]);
  
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
  
  // Extract address from Google Maps URL
  const getAddressFromMapsURL = useCallback((url) => {
    if (!url) return null;
    
    try {
      const parsed = new URL(url);
      const params = new URLSearchParams(parsed.search);
      return params.get('q');
    } catch (e) {
      return null;
    }
  }, []);

  // Load Google Maps API
  useEffect(() => {
    if (mapInitializedRef.current) return;
    
    if (googleMapsLoading) {
      console.log("Google Maps API is already loading");
      return;
    }
    
    async function loadMap() {
      googleMapsLoading = true;
      
      try {
        if (!window.google) {
          const script = document.createElement('script');
          script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&v=beta&callback=initCallback`;
          
          window.initCallback = async () => {
            console.log("Google Maps API loaded successfully");
            
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
      }
    }
    
    if (window.google && window.google.maps) {
      console.log("Google Maps API already loaded");
      loadMap();
      return;
    }
    
    if (!googleMapsLoaded) {
      console.log("Loading Google Maps API");
      loadMap();
    }
  }, [apiKey, initializeMap]);
  
  // Animate pin bounce effect
  const bounceMarker = useCallback((marker) => {
    if (!marker) return;
    
    try {
      const markerElement = marker.content;
      if (markerElement) {
        markerElement.style.animation = 'bounce 0.8s ease infinite alternate';
        
        if (!document.getElementById('marker-animation-style')) {
          const style = document.createElement('style');
          style.id = 'marker-animation-style';
          style.innerHTML = `
            @keyframes bounce {
              0% { transform: translateY(0); }
              100% { transform: translateY(-10px); }
            }
          `;
          document.head.appendChild(style);
        }
        
        // Stop animation after a few bounces
        setTimeout(() => {
          if (markerElement) {
            markerElement.style.animation = 'none';
          }
        }, 2100);
      }
    } catch (error) {
      console.error("Error bouncing marker:", error);
    }
  }, []);
  
  // Center map on marker
  const centerMapOnMarker = useCallback((marker, map) => {
    if (!marker || !map) return;
    
    try {
      const position = marker.position;
      if (!position) return;
      
      // Set directly without animation
      map.setCenter(position);
      map.setZoom(16);
      
      // Bounce the marker
      bounceMarker(marker);
    } catch (error) {
      console.error("Error centering on marker:", error);
    }
  }, [bounceMarker]);
  
  // Zoom to fit markers in a neighborhood
  const zoomToNeighborhood = useCallback((neighborhood, markers) => {
    if (!googleMapRef.current || !neighborhood || !markers) return;
    
    try {
      if (!window.google || !window.google.maps) return;
      
      const bounds = new window.google.maps.LatLngBounds();
      let hasMarkers = false;
      
      // Add marker positions to bounds
      Object.values(markers).forEach(marker => {
        if (marker && marker._neighborhood === neighborhood && marker.position) {
          bounds.extend(marker.position);
          hasMarkers = true;
          // Bounce all markers in this neighborhood
          bounceMarker(marker);
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
      }
    } catch (error) {
      console.error("Error zooming to neighborhood:", error);
    }
  }, [bounceMarker, closeActiveInfoWindow]);
  
  // Update pin styles when selected venue changes
  useEffect(() => {
    // Reset previous selected marker if there was one
    if (previousSelectedVenueRef.current && previousSelectedVenueRef.current.id !== selectedVenue?.id) {
      const prevMarker = markersRef.current[previousSelectedVenueRef.current.id];
      if (prevMarker && prevMarker.content) {
        // Update marker appearance to deselected state
        const pinElement = createPinElement(
          getPinColor(previousSelectedVenueRef.current.id), 
          false
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
      
      // Update marker appearance to selected state
      if (marker.content) {
        const pinElement = createPinElement(
          getPinColor(selectedVenue.id), 
          true
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
  }, [selectedVenue, createPinElement, getPinColor]);
  
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
      
      const marker = markersRef.current[selectedVenue.id];
      if (marker) {
        // Create info window content
        const infoContent = `
          <div style="font-family: 'Roboto', sans-serif; max-width: 200px; padding: 5px;">
            <div style="font-weight: bold; color: ${darkMode ? '#b77fdb' : '#750787'}; font-size: 14px; margin-bottom: 8px; border-bottom: 2px solid ${darkMode ? '#b77fdb' : '#750787'}; padding-bottom: 4px;">
              ${selectedVenue.RestaurantName || 'Venue'}
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
      }
    } catch (error) {
      console.error("Error showing info window for selected venue:", error);
    }
  }, [selectedVenue, darkMode, createCustomInfoWindow, centerMapOnMarker, closeActiveInfoWindow]);
  
  // Create or update markers when venues or map changes
  useEffect(() => {
    if (!mapInitializedRef.current || !googleMapRef.current || !geocoderRef.current || !venues || venues.length === 0) {
      return;
    }
    
    try {
      // Process all venues
      venues.forEach(venue => {
        // Skip if venue doesn't have required data
        if (!venue || !venue.id) return;
        
        // Check if this venue is in the filtered venues
        const isVisible = filteredVenues.some(v => v.id === venue.id);
        
        // Check if venue is selected
        const isSelected = selectedVenue && selectedVenue.id === venue.id;
        
        // Check if marker already exists
        if (markersRef.current[venue.id]) {
          try {
            // Update marker visibility
            markersRef.current[venue.id].map = isVisible ? googleMapRef.current : null;
            
            // Update marker appearance
            if (markersRef.current[venue.id].content) {
              // Create a new pin element
              const pinElement = createPinElement(getPinColor(venue.id), isSelected);
              
              // Replace the existing content
              const oldContent = markersRef.current[venue.id].content;
              if (oldContent && oldContent.parentNode) {
                oldContent.parentNode.replaceChild(pinElement, oldContent);
              } else {
                markersRef.current[venue.id].content = pinElement;
              }
            }
            
            // Store neighborhood for reference
            markersRef.current[venue.id]._neighborhood = venue.Neighborhood || 'Uncategorized';
            
            return;
          } catch (error) {
            console.error("Error updating existing marker:", error);
          }
        }
        
        // Extract address from Google Maps URL if available
        if (venue.MapsURL) {
          const address = getAddressFromMapsURL(venue.MapsURL);
          
          if (address && geocoderRef.current) {
            try {
              geocoderRef.current.geocode({ address }, (results, status) => {
                if (status === 'OK' && results && results[0] && googleMapRef.current) {
                  try {
                    // Create pin element
                    const pinElement = createPinElement(getPinColor(venue.id), isSelected);
                    
                    // Create marker using AdvancedMarkerElement
                    const marker = new window.google.maps.marker.AdvancedMarkerElement({
                      position: results[0].geometry.location,
                      map: isVisible ? googleMapRef.current : null,
                      title: venue.RestaurantName || 'Venue',
                      content: pinElement
                    });

                    // Store neighborhood for reference
                    marker._neighborhood = venue.Neighborhood || 'Uncategorized';

                    // Add click event listener using proper method for accessibility
                    marker.addListener('click', () => {
                      // Always clear the previous selection first
                      if (selectedVenue && selectedVenue.id !== venue.id) {
                        // Close any existing info window
                        closeActiveInfoWindow();
                      }
                      
                      // Set the new selected venue
                      onMarkerClick(venue.id);
                    });

                    // Store marker reference
                    markersRef.current[venue.id] = marker;
                    
                    // Update markers in state
                    setMarkers(prev => ({
                      ...prev,
                      [venue.id]: marker
                    }));
                    
                    // If this is the selected venue, show info window after creation
                    if (isSelected && selectedVenue) {
                      setTimeout(() => {
                        const marker = markersRef.current[venue.id];
                        if (marker) {
                          // Create info window content
                          const infoContent = `
                            <div style="font-family: 'Roboto', sans-serif; max-width: 200px; padding: 5px;">
                              <div style="font-weight: bold; color: ${darkMode ? '#b77fdb' : '#750787'}; font-size: 14px; margin-bottom: 8px; border-bottom: 2px solid ${darkMode ? '#b77fdb' : '#750787'}; padding-bottom: 4px;">
                                ${selectedVenue.RestaurantName || 'Venue'}
                              </div>
                              <div style="font-size: 12px; margin-bottom: 6px;">${selectedVenue.Deal || ''}</div>
                              <div style="font-size: 11px; color: ${darkMode ? '#aaa' : '#666'}; font-style: italic; margin-top: 4px;">
                                ${selectedVenue.Neighborhood || ''}
                              </div>
                            </div>
                          `;
                          
                          // Show info window and center on marker
                          createCustomInfoWindow(infoContent, marker);
                          centerMapOnMarker(marker, googleMapRef.current);
                        }
                      }, 100);
                    }
                  } catch (error) {
                    console.error("Error creating marker:", error);
                  }
                }
              });
            } catch (error) {
              console.error("Error geocoding address:", error);
            }
          }
        }
      });
    } catch (error) {
      console.error("Error in marker creation/update:", error);
    }
  }, [
    venues, 
    selectedVenue, 
    getAddressFromMapsURL, 
    onMarkerClick, 
    setMarkers, 
    createPinElement, 
    getPinColor, 
    centerMapOnMarker, 
    darkMode, 
    createCustomInfoWindow,
    filteredVenues,
    closeActiveInfoWindow
  ]);
  
  // Effect to handle neighborhood zoom when selected neighborhood changes
  useEffect(() => {
    if (!mapInitializedRef.current || !googleMapRef.current || !selectedNeighborhood) return;
    
    try {
      zoomToNeighborhood(selectedNeighborhood, markersRef.current);
    } catch (error) {
      console.error("Error in neighborhood zoom:", error);
    }
  }, [selectedNeighborhood, zoomToNeighborhood]);
  
  return (
    <section id="map-container" className={darkMode ? 'dark-mode' : ''}>
      <div id="map" ref={mapContainerRef}>
        <div id="map-favicon-overlay" className={darkMode ? 'dark-mode' : ''}>
          <img src="/favicon.ico" alt="Site Favicon" />
        </div>
      </div>
    </section>
  );
};

export default MapView;