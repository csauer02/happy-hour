import React, { useState, useEffect } from 'react';
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
  // State for tracking collapsed neighborhood sections
  const [collapsedSections, setCollapsedSections] = useState({});
  
  // Group venues by neighborhood - using allVenues instead of filtered venues
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
  
  // Handle neighborhood header click - toggle collapse and highlight
  const handleNeighborhoodClick = (neighborhood) => {
    // Toggle collapse state
    setCollapsedSections(prev => {
      const newState = { ...prev };
      
      // If clicking the currently selected neighborhood, just toggle its collapsed state
      if (neighborhood === selectedNeighborhood) {
        newState[neighborhood] = !prev[neighborhood];
      } 
      // If clicking a different neighborhood, expand it and collapse all others
      else {
        // First collapse all other sections
        Object.keys(newState).forEach(key => {
          if (key !== neighborhood) {
            newState[key] = true;
          }
        });
        // Then make sure the clicked one is expanded
        newState[neighborhood] = false;
      }
      
      return newState;
    });
    
    // Update selected neighborhood - for highlighting only
    onNeighborhoodSelect(neighborhood === selectedNeighborhood ? null : neighborhood);
  };
  
  // Effect to initialize collapsed state when neighborhoods change
  useEffect(() => {
    const groups = getNeighborhoodGroups();
    const initialState = {};
    
    Object.keys(groups).forEach(neighborhood => {
      // If this is the selected neighborhood, don't collapse it
      initialState[neighborhood] = neighborhood !== selectedNeighborhood;
    });
    
    setCollapsedSections(initialState);
  }, [selectedNeighborhood, allVenues]);
  
  const neighborhoodGroups = getNeighborhoodGroups();
  
  return (
    <section id="sidebar" className={darkMode ? 'dark-mode' : ''}>
      <div id="venue-container">
        {Object.keys(neighborhoodGroups).sort().map(neighborhood => {
          const isSelected = selectedNeighborhood === neighborhood;
          const isCollapsed = collapsedSections[neighborhood];
          const venuesInNeighborhood = neighborhoodGroups[neighborhood];
          
          return (
            <div 
              className={`neighborhood-section ${isSelected ? 'highlighted' : ''}`} 
              key={neighborhood}
            >
              <div 
                className={`neighborhood-header ${isSelected ? 'active' : ''}`}
                onClick={() => handleNeighborhoodClick(neighborhood)}
              >
                <span>{neighborhood}</span>
                <span className="venue-count">{venuesInNeighborhood.length}</span>
                <span className="expand-icon">{isCollapsed ? '+' : '-'}</span>
              </div>
              
              <div className={`neighborhood-content ${isSelected ? 'highlighted' : ''} ${isCollapsed ? 'collapsed' : 'expanded'}`}>
                {!isCollapsed && venuesInNeighborhood.map(venue => (
                  <RestaurantCard 
                    key={venue.id}
                    venue={venue}
                    isSelected={selectedVenue && selectedVenue.id === venue.id}
                    onSelect={() => onVenueSelect(venue.id)}
                    darkMode={darkMode}
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
              onClick={() => {
                // Signal to reset all filters
                onNeighborhoodSelect(null);
                // Additional reset logic would be handled in parent component
              }}
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