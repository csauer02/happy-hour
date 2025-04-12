import React from 'react';
import './Header.css';

const Header = ({ 
  activeDay, 
  happeningNow, 
  onDayChange, 
  onHappeningNowToggle, 
  darkMode, 
  onDarkModeToggle
}) => {
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
    <header id="global-header" className={darkMode ? 'dark-mode' : ''}>
      <div className="logo">
        <h1>ATL Happy Hour</h1>
      </div>
      
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
        
        <div className="header-controls">
          <button 
            className="icon-button dark-mode-toggle" 
            onClick={onDarkModeToggle}
            aria-label={darkMode ? "Switch to light mode" : "Switch to dark mode"}
          >
            {darkMode ? (
              <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="5"></circle>
                <line x1="12" y1="1" x2="12" y2="3"></line>
                <line x1="12" y1="21" x2="12" y2="23"></line>
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
                <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
                <line x1="1" y1="12" x2="3" y2="12"></line>
                <line x1="21" y1="12" x2="23" y2="12"></line>
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
                <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
              </svg>
            )}
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;