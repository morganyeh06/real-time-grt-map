## Real-Time GRT Map
A full-stack transit visualization platform that tracks live vehicle positions and service alerts for Grand River Transit (GRT) bus and ION Light Rail systems across the Region of Waterloo.

**Link:** https://real-time-grt-map.onrender.com/

Note: The server winds down with inactivity, so it may take up to 1 minute for it to boot up again.

### Built With
* React
* Node.js
* Express
* Tailwind CSS
* Leaflet
* Vite

## Features
* **Live Tracking:** Visualize real-time vehicle positions for both Bus and LRT (ION) using GTFS-Realtime feeds
* **Dynamic Filtering:** Toggle specific routes (Local, iXpress, Rapid Transit) to clean up the map view.
* **Proximity Detection:** Find the 5 nearest vehicles to your current location using the Haversine distance formula.
* **Service Alerts:** View live transit disruptions with formatted HTML rendering for detailed service updates.
* **Map Auto-Fit:** Programmatically adjust the map view to contain all active vehicle markers
