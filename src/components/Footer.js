import React from 'react';
import './Footer.css';

const Footer = ({ darkMode }) => {
  // Get the current year for the copyright notice
  const currentYear = new Date().getFullYear();
  
  return (
    <footer id="global-footer" className={darkMode ? 'dark-mode' : ''}>
      <div className="rainbow-border"></div>
      <p>© {currentYear} ATL Socializers – Call or visit each venue for up-to-date offers.</p>
    </footer>
  );
};

export default Footer;