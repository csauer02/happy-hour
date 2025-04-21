import React from 'react';
import './Header.css';

const Header = ({ 
  activeDay, 
  happeningNow, 
  onDayChange, 
  onHappeningNowToggle,
  darkMode
}) => {
  // Day buttons configuration with full labels for better clarity
  const dayButtons = [
    { id: 'all', label: 'All Days', longLabel: 'All Days' },
    { id: 'mon', label: 'M', longLabel: 'Monday' },
    { id: 'tue', label: 'T', longLabel: 'Tuesday' },
    { id: 'wed', label: 'W', longLabel: 'Wednesday' },
    { id: 'thu', label: 'T', longLabel: 'Thursday' },
    { id: 'fri', label: 'F', longLabel: 'Friday' },
  ];
  
  return (
    <header id="global-header" className={darkMode ? 'dark-mode' : ''}>
      <div className="logo">
        <h1>ATL Socializers Happy Hour</h1>
      </div>
      
      <div id="filter-controls">
        <div id="day-filter">
          {dayButtons.map(day => (
            <button
              key={day.id}
              data-day={day.id}
              className={activeDay === day.id ? 'active' : ''}
              onClick={() => onDayChange(day.id)}
              title={day.longLabel}
              aria-pressed={activeDay === day.id}
            >
              {day.label}
            </button>
          ))}
        </div>
        
        <div className="happening-now">
          <span>Today:</span>
          <label className="switch" title="Show only venues with happy hours today">
            <input 
              type="checkbox" 
              id="happening-now-toggle" 
              checked={happeningNow}
              onChange={onHappeningNowToggle}
              aria-label="Show only venues with happy hours today"
            />
            <span className="slider"></span>
          </label>
        </div>
      </div>
    </header>
  );
};

export default Header;