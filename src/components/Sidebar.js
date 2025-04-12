import React, { useState, useEffect, useRef } from 'react';
import './Sidebar.css';
import RestaurantCard from './RestaurantCard';

const Sidebar = ({ 
  venues, 
  allVenues, 
  selectedVenue, 
  onVenueSelect, 
  darkMode, 
  onNeighborhoodSelect, 
  selectedNeighborhood 
}) => {
  const [expandedNeighborhood, setExpandedNeighborhood] = useState(null);
  const sidebarRef = useRef(null);
  const previousVenueIdRef = useRef(null);
  
  // Group venues by neighborhood
  const getNeighborhoodGroups = () => {
    const groups = {};
    
    allVenues.forEach(venue => {
      const neighborhood = venue.Neighborhood || 'Uncategorized';
      if (!groups[neighborhood]) {
        groups[neighborhood] = [];
      }
      groups[neighborhood].push(venue);
    });
    
    return groups;
  };
  
  // Handle neighborhood header click
  const handleNeighborhoodClick = (neighborhood) => {
    if (neighborhood === expandedNeighborhood) {
      setExpandedNeighborhood(null);
      onNeighborhoodSelect(null);
    } else {
      setExpandedNeighborhood(neighborhood);
      onNeighborhoodSelect(neighborhood);
    }
  };
  
  // Update expanded neighborhood when selectedNeighborhood changes
  useEffect(() => {
    if (selectedNeighborhood !== expandedNeighborhood) {
      setExpandedNeighborhood(selectedNeighborhood);
    }
  }, [selectedNeighborhood, expandedNeighborhood]);
  
  // Scroll to selected venue when it changes
  useEffect(() => {
    if (!selectedVenue) {
      previousVenueIdRef.current = null;
      return;
    }
    
    // Skip if it's the same venue as before
    if (previousVenueIdRef.current === selectedVenue.id) {
      return;
    }
    
    // Store the current venue id
    previousVenueIdRef.current = selectedVenue.id;
    
    // Make sure neighborhood is expanded
    if (selectedVenue.Neighborhood !== expandedNeighborhood) {
      setExpandedNeighborhood(selectedVenue.Neighborhood);
    }
    
    // Function that tries to scroll to the element with retries
    const scrollToCard = (retryCount = 5) => {
      if (!sidebarRef.current || retryCount <= 0) return;
      
      // Finding the card by multiple selectors for better reliability
      const selectors = [
        `[data-venue-id="${selectedVenue.id}"]`,
        `#venue-card-${selectedVenue.id}`,
        `.restaurant-card[data-venue-id="${selectedVenue.id}"]`
      ];
      
      let card = null;
      // Try each selector until we find the card
      for (const selector of selectors) {
        card = sidebarRef.current.querySelector(selector);
        if (card) break;
      }
      
      if (card) {
        // Direct scroll approach for better reliability
        const headerOffset = 60; // approximate header height
        const cardPosition = card.offsetTop;
        sidebarRef.current.scrollTop = cardPosition - headerOffset;
        
        // Mark the card as selected for CSS targeting
        const allCards = sidebarRef.current.querySelectorAll('.restaurant-card');
        allCards.forEach(c => c.classList.remove('selected-venue-card'));
        card.classList.add('selected-venue-card');
        
        // Force the browser to recognize and render the card properly
        card.style.display = 'flex';
        // This will force a reflow, ensuring the card is visible
        // eslint-disable-next-line no-unused-expressions
        card.offsetHeight;
      } else if (retryCount > 0) {
        // Retry with increasing delay
        setTimeout(() => scrollToCard(retryCount - 1), 150);
      }
    };
    
    // First attempt with a slight delay to allow for DOM updates
    setTimeout(() => scrollToCard(), 100);
    
    // Additional attempts with increased delays for backup
    setTimeout(() => scrollToCard(3), 300);
    setTimeout(() => scrollToCard(2), 600);
  }, [selectedVenue, expandedNeighborhood]);
  
  const neighborhoodGroups = getNeighborhoodGroups();
  
  return (
    <section id="sidebar" className={darkMode ? 'dark-mode' : ''} ref={sidebarRef}>
      <div id="venue-container">
        {Object.keys(neighborhoodGroups).sort().map(neighborhood => {
          const isSelected = selectedNeighborhood === neighborhood;
          const isExpanded = expandedNeighborhood === neighborhood;
          const venuesInNeighborhood = neighborhoodGroups[neighborhood];
          
          return (
            <div 
              className={`neighborhood-section ${isSelected ? 'highlighted' : ''}`} 
              key={neighborhood}
              data-neighborhood={neighborhood}
            >
              <div 
                className={`neighborhood-header ${isSelected ? 'active' : ''}`}
                onClick={() => handleNeighborhoodClick(neighborhood)}
              >
                <span>{neighborhood}</span>
                <span className="venue-count">{venuesInNeighborhood.length}</span>
                <span className="expand-icon">{isExpanded ? '-' : '+'}</span>
              </div>
              
              <div className={`neighborhood-content ${isExpanded ? 'expanded' : ''}`}>
                {isExpanded && (
                  <div className="venue-list">
                    {venuesInNeighborhood.map(venue => (
                      <RestaurantCard 
                        key={venue.id}
                        venue={venue}
                        isSelected={selectedVenue && selectedVenue.id === venue.id}
                        onSelect={() => onVenueSelect(venue.id)}
                        darkMode={darkMode}
                        data-venue-id={venue.id}
                        id={`venue-card-${venue.id}`}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
        
        {venues.length === 0 && (
          <div className="no-results">
            <p>No venues match your current filters.</p>
            <button 
              className="reset-filters-btn"
              onClick={() => onNeighborhoodSelect(null)}
            >
              Reset Filters
            </button>
          </div>
        )}
      </div>
    </section>
  );
};

export default Sidebar;