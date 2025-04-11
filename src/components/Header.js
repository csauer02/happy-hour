import React from 'react';
import './Header.css';

const Header = ({ activeDay, happeningNow, onDayChange, onHappeningNowToggle }) => {
  // Day buttons configuration
  const dayButtons = [
    { id: 'all', label: 'All Days' },
    { id: 'mon', label: 'M' },
    { id: 'tue', label: 'T' },
    { id: 'wed', label: 'W' },
    { id: 'thu', label: 'T' },
    { id: 'fri', label: 'F' },
  ];

  return (
    <header id="global-header">
      <div id="filter-controls">
        <div id="day-filter">
          {dayButtons.map(day => (
            <button
              key={day.id}
              data-day={day.id}
              className={activeDay === day.id ? 'active' : ''}
              onClick={() => onDayChange(day.id)}
            >
              {day.label}
            </button>
          ))}
        </div>
        
        <div className="happening-now">
          <span>Happening Now:</span>
          <label className="switch">
            <input 
              type="checkbox" 
              id="happening-now-toggle" 
              checked={happeningNow}
              onChange={onHappeningNowToggle}
            />
            <span className="slider"></span>
          </label>
        </div>
      </div>
    </header>
  );
};

export default Header;