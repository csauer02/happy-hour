import React from 'react';
import './Sidebar.css';
import RestaurantCard from './RestaurantCard';

const Sidebar = ({ venues, selectedVenue, onVenueSelect, darkMode, onNeighborhoodSelect, selectedNeighborhood }) => {
  // Group venues by neighborhood
  const getNeighborhoodGroups = () => {
    const groups = {};
    
    venues.forEach(venue => {
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
    onNeighborhoodSelect(neighborhood === selectedNeighborhood ? null : neighborhood);
  };
  
  const neighborhoodGroups = getNeighborhoodGroups();
  
  return (
    <section id="sidebar" className={darkMode ? 'dark-mode' : ''}>
      <div id="venue-container">
        {Object.keys(neighborhoodGroups).map(neighborhood => (
          <div className="neighborhood-section" key={neighborhood}>
            <div 
              className={`neighborhood-header ${selectedNeighborhood === neighborhood ? 'active' : ''}`}
              onClick={() => handleNeighborhoodClick(neighborhood)}
            >
              {neighborhood}
              <span className="venue-count">{neighborhoodGroups[neighborhood].length}</span>
            </div>
            <div className={`neighborhood-content ${selectedNeighborhood === neighborhood ? 'expanded' : ''}`}>
              {neighborhoodGroups[neighborhood].map(venue => (
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
        ))}
        
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