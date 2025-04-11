import React, { useEffect, useRef, useCallback, useState } from 'react';
import './MapView.css';

// Create a global tracking variable to prevent multiple script loads
let googleMapsLoaded = false;
let googleMapsLoading = false;

const MapView = ({ venues, setMapRef, setMarkers, onMarkerClick, selectedVenue, darkMode, selectedNeighborhood }) => {
  const mapContainerRef = useRef(null);
  const googleMapRef = useRef(null);
  const geocoderRef = useRef(null);
  const markersRef = useRef({});
  const [userLocation, setUserLocation] = useState(null);
  const [mapTheme, setMapTheme] = useState(null);
  const mapInitializedRef = useRef(false);
  
  // Get Google Maps API key from environment variables
  const apiKey = process.env.REACT_APP_GOOGLE_MAPS_API_KEY || '';
  
  // Modern LGBTQIA+ pride flag colors (including trans/intersex/poc elements)
  const flagColors = [
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
  ];

  // Dark mode map styles
  const darkMapStyle = [
    { elementType: "geometry", stylers: [{ color: "#242f3e" }] },
    { elementType: "labels.text.stroke", stylers: [{ color: "#242f3e" }] },
    { elementType: "labels.text.fill", stylers: [{ color: "#746855" }] },
    {
      featureType: "administrative.locality",
      elementType: "labels.text.fill",
      stylers: [{ color: "#d59563" }],
    },
    {
      featureType: "poi",
      elementType: "labels.text.fill",
      stylers: [{ color: "#d59563" }],
    },
    {
      featureType: "poi",
      stylers: [{ visibility: "off" }],
    },
    {
      featureType: "poi.park",
      elementType: "geometry",
      stylers: [{ color: "#263c3f" }],
    },
    {
      featureType: "poi.park",
      elementType: "labels.text.fill",
      stylers: [{ color: "#6b9a76" }],
    },
    {
      featureType: "road",
      elementType: "geometry",
      stylers: [{ color: "#38414e" }],
    },
    {
      featureType: "road",
      elementType: "geometry.stroke",
      stylers: [{ color: "#212a37" }],
    },
    {
      featureType: "road",
      elementType: "labels.text.fill",
      stylers: [{ color: "#9ca5b3" }],
    },
    {
      featureType: "road.highway",
      elementType: "geometry",
      stylers: [{ color: "#746855" }],
    },
    {
      featureType: "road.highway",
      elementType: "geometry.stroke",
      stylers: [{ color: "#1f2835" }],
    },
    {
      featureType: "road.highway",
      elementType: "labels.text.fill",
      stylers: [{ color: "#f3d19c" }],
    },
    {
      featureType: "transit",
      elementType: "geometry",
      stylers: [{ color: "#2f3948" }],
    },
    {
      featureType: "transit.station",
      elementType: "labels.text.fill",
      stylers: [{ color: "#d59563" }],
    },
    {
      featureType: "water",
      elementType: "geometry",
      stylers: [{ color: "#17263c" }],
    },
    {
      featureType: "water",
      elementType: "labels.text.fill",
      stylers: [{ color: "#515c6d" }],
    },
    {
      featureType: "water",
      elementType: "labels.text.stroke",
      stylers: [{ color: "#17263c" }],
    },
  ];

  // Light mode map styles (simplified)
  const lightMapStyle = [
    {
      featureType: "poi",
      stylers: [{ visibility: "off" }],
    }
  ];
  
  // Get a color based on venue id
  const getPinColor = useCallback((venueId) => {
    return flagColors[venueId % flagColors.length];
  }, []);
  
  // Handle "Near Me" functionality
  const handleNearMe = useCallback(() => {
    if (navigator.geolocation && googleMapRef.current) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const userPos = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
          
          setUserLocation(userPos);
          
          if (googleMapRef.current) {
            googleMapRef.current.panTo(userPos);
            googleMapRef.current.setZoom(14);
            
            // Add user location marker
            new window.google.maps.Marker({
              position: userPos,
              map: googleMapRef.current,
              icon: {
                path: window.google.maps.SymbolPath.CIRCLE,
                fillColor: '#4285F4',
                fillOpacity: 1,
                strokeColor: '#FFFFFF',
                strokeWeight: 2,
                scale: 8
              },
              title: 'Your Location',
              zIndex: 1000
            });
          }
        },
        (error) => {
          console.error("Error getting location: ", error);
          alert("Unable to access your location. Please check your browser settings.");
        }
      );
    } else {
      alert("Geolocation is not supported by your browser.");
    }
  }, []);
  
  // Initialize Google Maps - wrapped in useCallback to avoid dependency warnings
  const initializeMap = useCallback(() => {
    if (mapInitializedRef.current || !mapContainerRef.current) return;
    
    try {
      const mapOptions = {
        center: { lat: 33.7490, lng: -84.3880 }, // Atlanta coordinates
        zoom: 12,
        disableDefaultUI: false,
        zoomControl: true,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false, // Removed fullscreen option
        styles: darkMode ? darkMapStyle : lightMapStyle // Apply theme based on mode
      };
      
      const map = new window.google.maps.Map(mapContainerRef.current, mapOptions);
      const geocoder = new window.google.maps.Geocoder();
      
      googleMapRef.current = map;
      geocoderRef.current = geocoder;
      setMapTheme(darkMode ? 'dark' : 'light');
      mapInitializedRef.current = true;
      
      setMapRef(map);
      
      // Add Near Me control
      const nearMeControlDiv = document.createElement('div');
      const nearMeControl = createNearMeButton();
      nearMeControlDiv.appendChild(nearMeControl);
      nearMeControl.addEventListener('click', handleNearMe);
      
      map.controls[window.google.maps.ControlPosition.TOP_RIGHT].push(nearMeControlDiv);
      
      console.log("Map initialized successfully");
    } catch (error) {
      console.error("Error initializing map:", error);
    }
  }, [darkMode, handleNearMe, lightMapStyle, darkMapStyle, setMapRef]);
  
  // Create custom info window style (using custom overlay)
  const createCustomInfoWindow = useCallback((content, marker) => {
    if (!googleMapRef.current) return null;
    
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
      closeButton.addEventListener('click', () => {
        this.setMap(null);
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
      
      // Position the div above the marker
      const div = this.div;
      div.style.left = position.x - 100 + 'px'; // Center horizontally
      div.style.top = position.y - div.offsetHeight - 10 + 'px'; // Position above pin
      
      // Add a little arrow pointing to pin
      const arrow = div.querySelector('.info-window-arrow') || document.createElement('div');
      arrow.className = 'info-window-arrow';
      arrow.style.position = 'absolute';
      arrow.style.bottom = '-8px';
      arrow.style.left = '50%';
      arrow.style.marginLeft = '-8px';
      arrow.style.width = '0';
      arrow.style.height = '0';
      arrow.style.borderLeft = '8px solid transparent';
      arrow.style.borderRight = '8px solid transparent';
      arrow.style.borderTop = darkMode ? '8px solid #333' : '8px solid #fff';
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
    return new CustomInfoWindow(content, marker.getPosition());
  }, [darkMode]);
  
  // Helper function to create Near Me button
  const createNearMeButton = () => {
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
  };
  
  // Helper function to extract address from Google Maps URL
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

  // Load Google Maps API (only once)
  useEffect(() => {
    // If map is already initialized, don't reload
    if (mapInitializedRef.current) return;
    
    // Function to handle when Google Maps is ready
    const handleGoogleMapsReady = () => {
      // Initialize map
      if (window.google && window.google.maps) {
        initializeMap();
      }
    };
    
    // If Google Maps is already loaded, use it
    if (window.google && window.google.maps) {
      console.log("Google Maps API already loaded");
      handleGoogleMapsReady();
      return;
    }
    
    // If we're already loading the script, just wait
    if (googleMapsLoading) {
      console.log("Google Maps API is already loading");
      return;
    }
    
    // If not loaded yet, set up a clean global callback
    if (!googleMapsLoaded) {
      console.log("Loading Google Maps API");
      googleMapsLoading = true;
      
      // Set up a unique callback name to avoid conflicts
      const callbackName = 'googleMapsInitCallback_' + Math.random().toString(36).substr(2, 9);
      
      // Create the callback function
      window[callbackName] = () => {
        console.log("Google Maps API loaded successfully");
        googleMapsLoaded = true;
        googleMapsLoading = false;
        handleGoogleMapsReady();
        // Clean up the callback
        delete window[callbackName];
      };
      
      // Create and append the script
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&callback=${callbackName}`;
      script.async = true;
      script.defer = true;
      
      // Handle loading errors
      script.onerror = () => {
        console.error("Error loading Google Maps API");
        googleMapsLoading = false;
      };
      
      document.head.appendChild(script);
    }
  }, [apiKey, initializeMap]);

  // Update map theme when dark mode changes
  useEffect(() => {
    if (!mapInitializedRef.current || !googleMapRef.current) return;
    
    if (mapTheme !== (darkMode ? 'dark' : 'light')) {
      console.log(`Updating map theme to ${darkMode ? 'dark' : 'light'}`);
      googleMapRef.current.setOptions({
        styles: darkMode ? darkMapStyle : lightMapStyle
      });
      setMapTheme(darkMode ? 'dark' : 'light');
    }
  }, [darkMode, darkMapStyle, lightMapStyle, mapTheme]);
  
  // Create improved pin SVG with consistent black border and drop shadow
  const createPinSVG = useCallback((color = '#FF0000', isSelected = false) => {
    return {
      path: 'M12,2C8.14,2 5,5.14 5,9c0,5.25 7,13 7,13s7,-7.75 7,-13c0,-3.86 -3.14,-7 -7,-7zM12,4c1.1,0 2,0.9 2,2c0,1.1 -0.9,2 -2,2s-2,-0.9 -2,-2c0,-1.1 0.9,-2 2,-2z',
      fillColor: color,
      fillOpacity: isSelected ? 1.0 : 0.9,
      strokeWeight: 1.5, // Consistent black border
      strokeColor: '#000000', // Always black border
      scale: isSelected ? 2.2 : 1.6,
      anchor: new window.google.maps.Point(12, 22),
      // Add filter for drop shadow on selected pins
      labelOrigin: new window.google.maps.Point(12, 9),
    };
  }, []);
  
  // Animate pin bounce effect
  const bounceMarker = useCallback((marker) => {
    if (!marker || !window.google || !window.google.maps) return;
    
    try {
      if (marker.getAnimation() !== window.google.maps.Animation.BOUNCE) {
        marker.setAnimation(window.google.maps.Animation.BOUNCE);
        setTimeout(() => {
          if (marker) {
            marker.setAnimation(null);
          }
        }, 2100); // Bounce for 2.1 seconds (3 bounces)
      }
    } catch (error) {
      console.error("Error bouncing marker:", error);
    }
  }, []);
  
  // Smooth pan and zoom to a marker
  const smoothPanToMarker = useCallback((marker, map) => {
    if (!marker || !map) return;
    
    try {
      const position = marker.getPosition();
      if (!position) return;
      
      // First pan
      map.panTo(position);
      
      // Then zoom after a short delay to create a smooth effect
      setTimeout(() => {
        map.setZoom(16);
        // Bounce after pan and zoom completes
        setTimeout(() => {
          bounceMarker(marker);
        }, 300);
      }, 300);
    } catch (error) {
      console.error("Error panning to marker:", error);
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
        if (marker && marker._neighborhood === neighborhood && marker.getPosition) {
          const position = marker.getPosition();
          if (position) {
            bounds.extend(position);
            hasMarkers = true;
            // Bounce all markers in this neighborhood
            bounceMarker(marker);
          }
        }
      });
      
      if (hasMarkers) {
        // Fit bounds with padding
        googleMapRef.current.fitBounds(bounds, 80); // 80 pixels padding
        
        // Limit maximum zoom level
        const listener = googleMapRef.current.addListener('idle', () => {
          if (googleMapRef.current && googleMapRef.current.getZoom() > 15) {
            googleMapRef.current.setZoom(15);
          }
          if (window.google && window.google.maps) {
            window.google.maps.event.removeListener(listener);
          }
        });
      }
    } catch (error) {
      console.error("Error zooming to neighborhood:", error);
    }
  }, [bounceMarker]);
  
  // Create or update markers when venues or map changes
  useEffect(() => {
    if (!mapInitializedRef.current || !googleMapRef.current || !geocoderRef.current || !venues || venues.length === 0) {
      return;
    }
    
    try {
      console.log("Creating/updating markers");
      
      venues.forEach(venue => {
        // Skip if venue doesn't have required data
        if (!venue || !venue.id) return;
        
        // Check if marker already exists
        if (markersRef.current[venue.id]) {
          // Update icon based on selection state
          const isSelected = selectedVenue && selectedVenue.id === venue.id;
          
          try {
            markersRef.current[venue.id].setIcon(createPinSVG(getPinColor(venue.id), isSelected));
            markersRef.current[venue.id].setZIndex(isSelected ? 999 : 1);
            
            // Store neighborhood for reference
            markersRef.current[venue.id]._neighborhood = venue.Neighborhood || 'Uncategorized';
            
            // If this is the selected venue, animate it
            if (isSelected) {
              smoothPanToMarker(markersRef.current[venue.id], googleMapRef.current);
            }
          } catch (error) {
            console.error("Error updating existing marker:", error);
          }
          
          return;
        }
        
        // Extract address from Google Maps URL if available
        if (venue.MapsURL) {
          const address = getAddressFromMapsURL(venue.MapsURL);
          
          if (address && geocoderRef.current) {
            try {
              geocoderRef.current.geocode({ address }, (results, status) => {
                if (status === 'OK' && results && results[0] && googleMapRef.current) {
                  const isSelected = selectedVenue && selectedVenue.id === venue.id;
                  
                  try {
                    // Create marker
                    const marker = new window.google.maps.Marker({
                      position: results[0].geometry.location,
                      map: googleMapRef.current,
                      title: venue.RestaurantName || 'Venue',
                      icon: createPinSVG(getPinColor(venue.id), isSelected),
                      animation: window.google.maps.Animation.DROP,
                      zIndex: isSelected ? 999 : 1
                    });
                    
                    // Store neighborhood for reference
                    marker._neighborhood = venue.Neighborhood || 'Uncategorized';
                    
                    // Add info window with improved styling
                    marker.addListener('click', () => {
                      onMarkerClick(venue.id);
                    });
                    
                    // Create improved styled info window content
                    const infoContent = `
                      <div style="font-family: 'Roboto', sans-serif; max-width: 200px; padding: 5px;">
                        <div style="font-weight: bold; color: ${darkMode ? '#b77fdb' : '#750787'}; font-size: 14px; margin-bottom: 8px; border-bottom: 2px solid ${darkMode ? '#b77fdb' : '#750787'}; padding-bottom: 4px;">
                          ${venue.RestaurantName || 'Venue'}
                        </div>
                        <div style="font-size: 12px; margin-bottom: 6px;">${venue.Deal || ''}</div>
                        <div style="font-size: 11px; color: ${darkMode ? '#aaa' : '#666'}; font-style: italic; margin-top: 4px;">
                          ${venue.Neighborhood || ''}
                        </div>
                      </div>
                    `;
                    
                    let infoWindow = null;
                    
                    marker.addListener('mouseover', () => {
                      // Close any open info windows
                      if (infoWindow) infoWindow.setMap(null);
                      
                      // Create custom info window
                      infoWindow = createCustomInfoWindow(infoContent, marker);
                    });
                    
                    marker.addListener('mouseout', () => {
                      // Only close if not selected
                      if (infoWindow && selectedVenue && selectedVenue.id !== venue.id) {
                        setTimeout(() => {
                          if (infoWindow) {
                            infoWindow.setMap(null);
                            infoWindow = null;
                          }
                        }, 300); // Slight delay to prevent flickering
                      }
                    });
                    
                    markersRef.current[venue.id] = marker;
                    
                    // Update markers in state
                    setMarkers(prev => ({
                      ...prev,
                      [venue.id]: marker
                    }));
                    
                    // If this is the selected venue, animate it after a short delay
                    if (isSelected) {
                      setTimeout(() => {
                        smoothPanToMarker(marker, googleMapRef.current);
                      }, 500);
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
    createPinSVG, 
    getPinColor, 
    smoothPanToMarker, 
    darkMode, 
    createCustomInfoWindow
  ]);
  
  // Effect to handle neighborhood zoom when selected neighborhood changes
  useEffect(() => {
    if (!mapInitializedRef.current || !googleMapRef.current || !selectedNeighborhood) return;
    
    try {
      console.log(`Zooming to neighborhood: ${selectedNeighborhood}`);
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