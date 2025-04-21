# ATL Socializers Happy Hour

This is a React implementation of the ATL Socializers Happy Hour website, which helps users find happy hour deals across Atlanta. The app displays happy hour venues on a map and allows filtering by day of the week or to see what's happening now.

## Features

- Interactive Google Maps integration
- Filter venues by day of the week
- "Happening Now" toggle to show current happy hours
- Mobile-responsive design
- Venues grouped by neighborhood
- Restaurant details including deals and external links
- Dark mode support

## Project Structure

```
atl-happy-hour-react/
├── public/
│   ├── favicon.ico
│   ├── favicon.svg
│   ├── favicon-96x96.png
│   ├── apple-touch-icon.png
│   ├── android-chrome-192x192.png
│   ├── android-chrome-512x512.png
│   ├── site.webmanifest
│   └── index.html
├── src/
│   ├── components/
│   │   ├── Header.js
│   │   ├── Header.css
│   │   ├── Sidebar.js
│   │   ├── Sidebar.css
│   │   ├── RestaurantCard.js
│   │   ├── RestaurantCard.css
│   │   ├── MapView.js
│   │   ├── MapView.css
│   │   ├── Footer.js
│   │   └── Footer.css
│   ├── App.js
│   ├── App.css
│   └── index.js
└── package.json
```

## Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the development server:
   ```bash
   npm start
   ```

## Data Source

The application fetches venue data from a Google Sheets CSV file. To update the data, modify the spreadsheet and ensure it contains the following columns:
- RestaurantName
- Neighborhood
- Deal
- RestaurantURL
- MapsURL
- Latitude
- Longitude
- Mon, Tue, Wed, Thu, Fri (with "yes" values to indicate availability)

## Dependencies

- React
- PapaParse (for CSV parsing)
- Google Maps JavaScript API

## License

This project is released into the public domain.