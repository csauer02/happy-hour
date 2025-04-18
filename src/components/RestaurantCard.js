import React, { useEffect, forwardRef } from 'react';
import './RestaurantCard.css';

const RestaurantCard = forwardRef(({ venue, isSelected, onSelect, darkMode, ...props }, ref) => {
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
      ref={ref}
      data-venue-id={venue.id}
      id={`venue-card-${venue.id}`}
      {...props}
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