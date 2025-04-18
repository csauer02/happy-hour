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
  const neighborhoodRefs = useRef({});
  const cardRefs = useRef({});
  
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
  
  // Calculate proper scroll position accounting for sticky headers
  const scrollToElement = (element, headerHeight = 45) => {
    if (!element || !sidebarRef.current) return;
    
    const sidebarRect = sidebarRef.current.getBoundingClientRect();
    const elementRect = element.getBoundingClientRect();
    
    const relativeTop = elementRect.top - sidebarRect.top;
    const elementHeight = elementRect.height;
    
    // If the element is already fully visible within the viewport, don't scroll
    if (
      relativeTop >= headerHeight && 
      relativeTop + elementHeight <= sidebarRect.height
    ) {
      return;
    }
    
    // Calculate the offset accounting for sticky header
    let scrollOffset;
    
    if (relativeTop < headerHeight) {
      // If element is above the viewport, scroll it to just below the header
      scrollOffset = sidebarRef.current.scrollTop + (relativeTop - headerHeight - 5);
    } else if (relativeTop + elementHeight > sidebarRect.height) {
      // If element is below the viewport, scroll it into view
      scrollOffset = sidebarRef.current.scrollTop + ((relativeTop + elementHeight) - sidebarRect.height + 10);
    } else {
      return; // Element is already fully visible
    }
    
    // Perform the scroll with smooth behavior
    sidebarRef.current.scrollTo({
      top: scrollOffset,
      behavior: 'smooth'
    });
  };
  
  // Scroll to neighborhood when it expands
  useEffect(() => {
    if (expandedNeighborhood && neighborhoodRefs.current[expandedNeighborhood]) {
      const headerElement = neighborhoodRefs.current[expandedNeighborhood];
      
      if (headerElement) {
        // Use custom scroll function
        setTimeout(() => {
          scrollToElement(headerElement, 0); // No offset for neighborhood headers
        }, 100);
      }
    }
  }, [expandedNeighborhood]);
  
  // Scroll to selected venue when it changes
  useEffect(() => {
    if (selectedVenue && cardRefs.current[selectedVenue.id]) {
      // Make sure the neighborhood is expanded first
      if (selectedVenue.Neighborhood !== expandedNeighborhood) {
        setExpandedNeighborhood(selectedVenue.Neighborhood);
        
        // Allow time for expansion before scrolling to card
        setTimeout(() => {
          const cardElement = cardRefs.current[selectedVenue.id];
          if (cardElement) {
            scrollToElement(cardElement);
            
            // Add selected class for styling
            Object.values(cardRefs.current).forEach(ref => {
              if (ref) ref.classList.remove('selected-venue-card');
            });
            cardElement.classList.add('selected-venue-card');
          }
        }, 300);
      } else {
        // Neighborhood already expanded, directly scroll to card
        const cardElement = cardRefs.current[selectedVenue.id];
        if (cardElement) {
          scrollToElement(cardElement);
          
          // Add selected class for styling
          Object.values(cardRefs.current).forEach(ref => {
            if (ref) ref.classList.remove('selected-venue-card');
          });
          cardElement.classList.add('selected-venue-card');
        }
      }
    }
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
                ref={el => neighborhoodRefs.current[neighborhood] = el}
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
                        ref={el => cardRefs.current[venue.id] = el}
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