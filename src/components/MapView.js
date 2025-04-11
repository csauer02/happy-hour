import React, { useEffect, useRef, useCallback, useState } from 'react';
import './MapView.css';

const MapView = ({ venues, setMapRef, setMarkers, onMarkerClick, selectedVenue }) => {
  const mapContainerRef = useRef(null);
  const googleMapRef = useRef(null);
  const geocoderRef = useRef(null);
  const markersRef = useRef({});
  const [userLocation, setUserLocation] = useState(null);
  
  // Get Google Maps API key from environment variables
  const apiKey = process.env.REACT_APP_GOOGLE_MAPS_API_KEY;
  
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
  
  // Get a color based on venue id
  const getPinColor = useCallback((venueId) => {
    return flagColors[venueId % flagColors.length];
  }, []);
  
  // Handle "Near Me" functionality
  const handleNearMe = useCallback(() => {
    if (navigator.geolocation) {
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
    const mapOptions = {
      center: { lat: 33.7490, lng: -84.3880 }, // Atlanta coordinates
      zoom: 12,
      disableDefaultUI: false,
      zoomControl: true,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: true,
      styles: [
        {
          "featureType": "poi",
          "stylers": [
            { "visibility": "off" }
          ]
        }
      ] // Simplified map style
    };
    
    const map = new window.google.maps.Map(mapContainerRef.current, mapOptions);
    const geocoder = new window.google.maps.Geocoder();
    
    googleMapRef.current = map;
    geocoderRef.current = geocoder;
    
    setMapRef(map);
    
    // Add Near Me control
    const nearMeControlDiv = document.createElement('div');
    const nearMeControl = createNearMeButton();
    nearMeControlDiv.appendChild(nearMeControl);
    nearMeControl.addEventListener('click', handleNearMe);
    
    map.controls[window.google.maps.ControlPosition.TOP_RIGHT].push(nearMeControlDiv);
  }, [setMapRef, handleNearMe]);
  
  // Helper function to create Near Me button
  const createNearMeButton = () => {
    const controlButton = document.createElement('button');
    controlButton.style.backgroundColor = '#fff';
    controlButton.style.border = '2px solid #fff';
    controlButton.style.borderRadius = '3px';
    controlButton.style.boxShadow = '0 2px 6px rgba(0,0,0,.3)';
    controlButton.style.cursor = 'pointer';
    controlButton.style.marginTop = '10px';
    controlButton.style.marginRight = '10px';
    controlButton.style.padding = '8px 16px';
    controlButton.style.textAlign = 'center';
    controlButton.style.color = '#750787';
    controlButton.style.fontFamily = 'Roboto,Arial,sans-serif';
    controlButton.style.fontSize = '14px';
    controlButton.style.fontWeight = 'bold';
    controlButton.textContent = '📍 Near Me';
    controlButton.title = 'Click to show venues near your current location';
    controlButton.type = 'button';
    
    // Change appearance on hover
    controlButton.addEventListener('mouseover', () => {
      controlButton.style.backgroundColor = '#f8f8f8';
      controlButton.style.color = '#8a2be2';
    });
    
    controlButton.addEventListener('mouseout', () => {
      controlButton.style.backgroundColor = '#fff';
      controlButton.style.color = '#750787';
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
  
  // Load Google Maps API
  useEffect(() => {
    // Check if the Google Maps API is loaded
    if (!window.google || !window.google.maps) {
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&callback=initMap`;
      script.async = true;
      script.defer = true;
      
      // Define global callback for Google Maps API
      window.initMap = () => {
        initializeMap();
      };
      
      document.head.appendChild(script);
    } else {
      initializeMap();
    }
    
    return () => {
      // Clean up map and markers on component unmount
      if (googleMapRef.current) {
        setMapRef(null);
        setMarkers({});
      }
    };
  }, [apiKey, initializeMap, setMapRef, setMarkers]);
  
  // Create custom rainbow pin SVG
  const createPinSVG = useCallback((color = '#FF0000', isSelected = false) => {
    return {
      path: 'M12,2C8.14,2 5,5.14 5,9c0,5.25 7,13 7,13s7,-7.75 7,-13c0,-3.86 -3.14,-7 -7,-7zM12,4c1.1,0 2,0.9 2,2c0,1.1 -0.9,2 -2,2s-2,-0.9 -2,-2c0,-1.1 0.9,-2 2,-2z',
      fillColor: color,
      fillOpacity: isSelected ? 1.0 : 0.7,
      strokeWeight: isSelected ? 2 : 1,
      strokeColor: isSelected ? '#FFFFFF' : '#000000',
      scale: isSelected ? 2.2 : 1.6,
      anchor: new window.google.maps.Point(12, 22),
    };
  }, []);
  
  // Animate pin bounce effect
  const bounceMarker = useCallback((marker) => {
    if (marker && marker.getAnimation() !== window.google.maps.Animation.BOUNCE) {
      marker.setAnimation(window.google.maps.Animation.BOUNCE);
      setTimeout(() => {
        marker.setAnimation(null);
      }, 2100); // Bounce for 2.1 seconds (3 bounces)
    }
  }, []);
  
  // Smooth pan and zoom to a marker
  const smoothPanToMarker = useCallback((marker, map) => {
    if (marker && map) {
      const position = marker.getPosition();
      
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
    }
  }, [bounceMarker]);
  
  // Create or update markers when venues or map changes
  useEffect(() => {
    if (googleMapRef.current && geocoderRef.current && venues.length > 0) {
      const currentMarkers = {};
      
      venues.forEach(venue => {
        // Check if marker already exists
        if (markersRef.current[venue.id]) {
          currentMarkers[venue.id] = markersRef.current[venue.id];
          
          // Update icon based on selection state
          const isSelected = selectedVenue && selectedVenue.id === venue.id;
          markersRef.current[venue.id].setIcon(createPinSVG(getPinColor(venue.id), isSelected));
          markersRef.current[venue.id].setZIndex(isSelected ? 999 : 1);
          
          // If this is the selected venue, animate it
          if (isSelected) {
            smoothPanToMarker(markersRef.current[venue.id], googleMapRef.current);
          }
          
          return;
        }
        
        // Extract address from Google Maps URL if available
        if (venue.MapsURL) {
          const address = getAddressFromMapsURL(venue.MapsURL);
          
          if (address) {
            geocoderRef.current.geocode({ address }, (results, status) => {
              if (status === 'OK' && results[0]) {
                const isSelected = selectedVenue && selectedVenue.id === venue.id;
                
                const marker = new window.google.maps.Marker({
                  position: results[0].geometry.location,
                  map: googleMapRef.current,
                  title: venue.RestaurantName,
                  icon: createPinSVG(getPinColor(venue.id), isSelected),
                  animation: window.google.maps.Animation.DROP, // Always animate pins on creation
                  zIndex: isSelected ? 999 : 1
                });
                
                // Add info window with basic info
                const infoWindow = new window.google.maps.InfoWindow({
                  content: `
                    <div style="font-family: 'Roboto', sans-serif; max-width: 200px;">
                      <div style="font-weight: bold; color: #750787; font-size: 14px; margin-bottom: 4px;">${venue.RestaurantName}</div>
                      <div style="font-size: 12px; margin-bottom: 2px;">${venue.Deal || ''}</div>
                      <div style="font-size: 11px; color: #777; font-style: italic;">${venue.Neighborhood || ''}</div>
                    </div>
                  `
                });
                
                marker.addListener('click', () => {
                  onMarkerClick(venue.id);
                });
                
                marker.addListener('mouseover', () => {
                  infoWindow.open(googleMapRef.current, marker);
                });
                
                marker.addListener('mouseout', () => {
                  infoWindow.close();
                });
                
                currentMarkers[venue.id] = marker;
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
              }
            });
          }
        }
      });
    }
  }, [venues, selectedVenue, getAddressFromMapsURL, onMarkerClick, setMarkers, createPinSVG, getPinColor, smoothPanToMarker]);
  
  return (
    <section id="map-container">
      <div id="map" ref={mapContainerRef}>
        <div id="map-favicon-overlay">
          <img src="/favicon.ico" alt="Site Favicon" />
        </div>
      </div>
    </section>
  );
};

export default MapView;