import React, { useEffect, useRef, useCallback } from 'react';
import './MapView.css';

const MapView = ({ venues, setMapRef, setMarkers, onMarkerClick }) => {
  const mapContainerRef = useRef(null);
  const googleMapRef = useRef(null);
  const geocoderRef = useRef(null);
  const markersRef = useRef({});
  
  // Get Google Maps API key from environment variables
  const apiKey = process.env.REACT_APP_GOOGLE_MAPS_API_KEY;
  
  // Initialize Google Maps - wrapped in useCallback to avoid dependency warnings
  const initializeMap = useCallback(() => {
    const mapOptions = {
      center: { lat: 33.7490, lng: -84.3880 }, // Atlanta coordinates
      zoom: 12,
      disableDefaultUI: true
    };
    
    const map = new window.google.maps.Map(mapContainerRef.current, mapOptions);
    const geocoder = new window.google.maps.Geocoder();
    
    googleMapRef.current = map;
    geocoderRef.current = geocoder;
    
    setMapRef(map);
  }, [setMapRef]);
  
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
  
  // Create or update markers when venues or map changes
  useEffect(() => {
    if (googleMapRef.current && geocoderRef.current && venues.length > 0) {
      const currentMarkers = {};
      
      venues.forEach(venue => {
        // Check if marker already exists
        if (markersRef.current[venue.id]) {
          currentMarkers[venue.id] = markersRef.current[venue.id];
          return;
        }
        
        // Extract address from Google Maps URL if available
        if (venue.MapsURL) {
          const address = getAddressFromMapsURL(venue.MapsURL);
          
          if (address) {
            geocoderRef.current.geocode({ address }, (results, status) => {
              if (status === 'OK' && results[0]) {
                const marker = new window.google.maps.Marker({
                  position: results[0].geometry.location,
                  map: googleMapRef.current,
                  opacity: 0.3,
                  title: venue.RestaurantName,
                  icon: {
                    url: 'https://maps.google.com/mapfiles/ms/icons/red-dot.png',
                    scaledSize: new window.google.maps.Size(32, 32)
                  }
                });
                
                marker.addListener('click', () => {
                  onMarkerClick(venue.id);
                });
                
                currentMarkers[venue.id] = marker;
                markersRef.current[venue.id] = marker;
                
                // Update markers in state
                setMarkers(prev => ({
                  ...prev,
                  [venue.id]: marker
                }));
              }
            });
          }
        }
      });
    }
  }, [venues, getAddressFromMapsURL, onMarkerClick, setMarkers]);
  
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