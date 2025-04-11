import React from 'react';
import './Sidebar.css';
import RestaurantCard from './RestaurantCard';

const Sidebar = ({ venues, selectedVenue, onVenueSelect }) => {
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
  
  const neighborhoodGroups = getNeighborhoodGroups();
  
  return (
    <section id="sidebar">
      <div id="venue-container">
        {Object.keys(neighborhoodGroups).map(neighborhood => (
          <div className="neighborhood-section" key={neighborhood}>
            <div className="neighborhood-header">
              {neighborhood}
            </div>
            <div className="neighborhood-content">
              {neighborhoodGroups[neighborhood].map(venue => (
                <RestaurantCard 
                  key={venue.id}
                  venue={venue}
                  isSelected={selectedVenue && selectedVenue.id === venue.id}
                  onSelect={() => onVenueSelect(venue.id)}
                />
              ))}
            </div>
          </div>
        ))}
        
        {venues.length === 0 && (
          <div className="no-results">
            <p>No venues match your current filters.</p>
          </div>
        )}
      </div>
    </section>
  );
};

export default Sidebar;