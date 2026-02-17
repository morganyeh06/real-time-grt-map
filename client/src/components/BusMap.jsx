import React from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

/**
 * CUSTOM ICON CREATOR:
 * Instead of using PNG images, we use Leaflet's L.divIcon.
 * This lets us create a HTML <div> and style it with our index.css.
 */
const createVehicleIcon = (routeId, type) => {
  return L.divIcon({
    // inject routeId (e.g., "201") directly into HTML string
    html: `<div class="bus-marker ${type === 'LRT' ? 'lrt-marker' : ''}">${routeId}</div>`,
    className: 'custom-bus-icon',
    iconSize: [32, 32],
    iconAnchor: [16, 16], 
  });
};

const BusMap = ({ vehicles }) => {
  // Center coordinates for Waterloo (near UW campus)
  const center = [43.4723, -80.5449];

  return (
    <div className="h-full w-full relative">
      <MapContainer 
        center={center} 
        zoom={14} 
        className="h-full w-full"
      >
        {/* map graphics (tiles) from OpenStreetMap */}
        <TileLayer
          attribution='&copy; OpenStreetMap contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* vehicle markers, loop (.map) through vehicles */}
        {vehicles.map((v) => (
          <Marker 
            key={v.id} 
            position={[v.latitude, v.longitude]}
            icon={createVehicleIcon(v.routeId, v.type)}
          >
            {/* popups appear when a marker is clicked */}
            <Popup>
              <div className="p-1">
                <h3 className="font-bold text-lg border-b mb-1">
                  {v.type === 'LRT' ? '🚆 ION LRT' : '🚌 GRT Bus'}
                </h3>
                <p className="text-sm"><strong>Route:</strong> {v.routeId}</p>
                <p className={`text-sm font-semibold ${v.delaySeconds > 60 ? 'text-red-600' : 'text-green-600'}`}>
                   {/* Delay calculation logic */}
                   Status: {v.delaySeconds > 60 
                    ? `Delayed (${Math.round(v.delaySeconds / 60)}m)` 
                    : 'On Time'}
                </p>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
};

export default BusMap;