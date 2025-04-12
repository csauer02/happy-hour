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
  // Single expanded neighborhood state instead of tracking all collapsed states
  const [expandedNeighborhood, setExpandedNeighborhood] = useState(null);
  const sidebarRef = useRef(null);
  
  // Simplified scrolling function
  const scrollToElement = (element, offset = 0) => {
    if (!element || !sidebarRef.current) return;
    
    // Simple scroll with offset
    sidebarRef.current.scrollTo({
      top: element.offsetTop - offset,
      behavior: 'smooth'
    });
  };
  
  // Group venues by neighborhood
  const getNeighborhoodGroups = () => {
    const groups = {};
    
    // Group all venues by neighborhood
    allVenues.forEach(venue => {
      const neighborhood = venue.Neighborhood || 'Uncategorized';
      if (!groups[neighborhood]) {
        groups[neighborhood] = [];
      }
      groups[neighborhood].push(venue);
    });
    
    return groups;
  };
  
  // Simplified neighborhood header click handler
  const handleNeighborhoodClick = (neighborhood) => {
    // Toggle logic: if clicking the already expanded neighborhood, collapse it
    if (neighborhood === expandedNeighborhood) {
      setExpandedNeighborhood(null);
      onNeighborhoodSelect(null);
    } else {
      setExpandedNeighborhood(neighborhood);
      onNeighborhoodSelect(neighborhood);
      
      // Find and scroll to the neighborhood section with a small delay to let DOM update
      setTimeout(() => {
        const sectionElement = sidebarRef.current.querySelector(
          `[data-neighborhood="${neighborhood}"]`
        );
        if (sectionElement) {
          scrollToElement(sectionElement, 0);
        }
      }, 50);
    }
  };
  
  // Update expanded neighborhood when selectedNeighborhood changes
  useEffect(() => {
    if (selectedNeighborhood !== expandedNeighborhood) {
      setExpandedNeighborhood(selectedNeighborhood);
    }
    
    // If a neighborhood is selected, scroll to it
    if (selectedNeighborhood && sidebarRef.current) {
      // Small delay to ensure DOM is updated
      setTimeout(() => {
        const sectionElement = sidebarRef.current.querySelector(
          `[data-neighborhood="${selectedNeighborhood}"]`
        );
        if (sectionElement) {
          scrollToElement(sectionElement, 0);
        }
      }, 50);
    }
  }, [selectedNeighborhood, expandedNeighborhood]);
  
  // When a venue is selected, make sure its card is visible
  useEffect(() => {
    if (selectedVenue && sidebarRef.current) {
      // Make sure the venue's neighborhood is expanded
      if (selectedVenue.Neighborhood !== expandedNeighborhood) {
        setExpandedNeighborhood(selectedVenue.Neighborhood);
      }
      
      // Small delay to ensure DOM is updated after expansion
      setTimeout(() => {
        const cardElement = sidebarRef.current.querySelector(
          `[data-venue-id="${selectedVenue.id}"]`
        );
        if (cardElement) {
          // Scroll to the card with an offset to account for the header
          scrollToElement(cardElement, 60);
        }
      }, 100);
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
              >
                <span>{neighborhood}</span>
                <span className="venue-count">{venuesInNeighborhood.length}</span>
                <span className="expand-icon">{isExpanded ? '-' : '+'}</span>
              </div>
              
              <div className={`neighborhood-content ${isExpanded ? 'expanded' : 'collapsed'}`}>
                {isExpanded && venuesInNeighborhood.map(venue => (
                  <RestaurantCard 
                    key={venue.id}
                    venue={venue}
                    isSelected={selectedVenue && selectedVenue.id === venue.id}
                    onSelect={() => onVenueSelect(venue.id)}
                    darkMode={darkMode}
                    data-venue-id={venue.id}
                  />
                ))}
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