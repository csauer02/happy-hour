import React, { forwardRef, useEffect, useRef } from 'react';
import './RestaurantCard.css';

const RestaurantCard = forwardRef(({ venue, isSelected, onSelect, darkMode }, ref) => {
  const cardRef = useRef(null);
  
  // When card becomes selected, scroll it into view with proper offset
  useEffect(() => {
    if (isSelected && cardRef.current) {
      // Get the parent neighborhood header
      const neighborhoodHeader = cardRef.current.closest('.neighborhood-content')
        ?.previousElementSibling;
      
      // If there's a neighborhood header, calculate its height for offset
      const headerHeight = neighborhoodHeader ? neighborhoodHeader.offsetHeight + 10 : 0;
      
      // Use scrollIntoView with a scrollTo for better positioning
      cardRef.current.scrollIntoView({ block: 'start', behavior: 'smooth' });
      
      // Apply an offset to account for the sticky header
      if (headerHeight > 0) {
        setTimeout(() => {
          const container = cardRef.current.closest('#sidebar');
          if (container) {
            const currentScroll = container.scrollTop;
            container.scrollTo({
              top: currentScroll - headerHeight,
              behavior: 'smooth'
            });
          }
        }, 100);
      }
    }
  }, [isSelected]);
  
  // Function to get favicon URL from restaurant website
  const getFaviconUrl = (url) => {
    try {
      const domain = new URL(url).hostname.replace('www.', '');
      return `https://www.google.com/s2/favicons?sz=64&domain=${domain}`;
    } catch (e) {
      return 'https://www.google.com/s2/favicons?sz=64&domain=example.com';
    }
  };

  return (
    <div 
      className={`restaurant-card ${isSelected ? 'selected' : ''} ${darkMode ? 'dark-mode' : ''}`}
      onClick={onSelect}
      ref={(el) => {
        // Forward the ref if provided
        if (ref) ref(el);
        // Also store locally
        cardRef.current = el;
      }}
    >
      <div className="restaurant-left">
        <div className="restaurant-top">
          <h2>{venue.RestaurantName || 'Unknown Venue'}</h2>
          <div className="icon-links">
            {venue.RestaurantURL && (
              <a 
                className="homepage-link" 
                href={venue.RestaurantURL} 
                target="_blank" 
                rel="noopener noreferrer"
                title="Restaurant Homepage"
                onClick={(e) => e.stopPropagation()}
              >
                <svg viewBox="0 0 24 24">
                  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2h-4a2 2 0 0 1-2-2v-4h-2v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9z"></path>
                </svg>
              </a>
            )}
            {venue.MapsURL && (
              <a 
                className="maps-link" 
                href={venue.MapsURL} 
                target="_blank" 
                rel="noopener noreferrer"
                title="Google Maps"
                onClick={(e) => e.stopPropagation()}
              >
                <svg viewBox="0 0 24 24">
                  <path d="M21 10c0 5.5-9 13-9 13S3 15.5 3 10a9 9 0 1118 0z"></path>
                  <circle cx="12" cy="10" r="3"></circle>
                </svg>
              </a>
            )}
          </div>
        </div>
        <div className="restaurant-deal">
          <p>{venue.Deal || 'No deal information available'}</p>
        </div>
      </div>
      <div className="restaurant-right">
        <img 
          src={venue.RestaurantURL ? getFaviconUrl(venue.RestaurantURL) : 'https://www.google.com/s2/favicons?sz=64&domain=example.com'} 
          alt={venue.RestaurantName || 'Restaurant Logo'}
          onError={(e) => {
            e.target.onerror = null;
            e.target.src = 'https://www.google.com/s2/favicons?sz=64&domain=example.com';
          }}
        />
      </div>
    </div>
  );
});

export default RestaurantCard;