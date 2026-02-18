import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

/**
 * INTERNAL CONTROLLER:
 * updates to re-center the map when the number of 
 * visible vehicles changes as a result of a filter
 */
const MapController = ({ vehicles, triggerFit }) => {
  const map = useMap();

  useEffect(() => {
    if (vehicles.length > 0) {
      const bounds = L.latLngBounds(vehicles.map(v => [v.latitude, v.longitude]));
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 16 });
    }
  }, [triggerFit, map, vehicles.length]); // track vehicles.length to detect filter changes

  return null;
};

/**
 * creates a custon vehicle icon
 */
const createVehicleIcon = (routeId, type) => {
  return L.divIcon({
    html: `<div class="bus-marker ${type === 'LRT' ? 'lrt-marker' : ''}">${routeId === '301' ? 'ION' : routeId}</div>`,
    className: 'custom-bus-icon',
    iconSize: [32, 32],
    iconAnchor: [16, 16], 
  });
};

const BusMap = ({ vehicles, triggerFit }) => {
  const center = [43.4723, -80.5449];

  return (
    <div className="h-full w-full relative">
      <MapContainer 
        center={center} 
        zoom={14} 
        className="h-full w-full"
      >
        <TileLayer
          attribution='&copy; OpenStreetMap contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <MapController vehicles={vehicles} triggerFit={triggerFit} />

        {vehicles.map((v) => (
          <Marker 
            key={v.id} 
            position={[v.latitude, v.longitude]}
            icon={createVehicleIcon(v.routeId, v.type)}
          >
            <Popup>
              <div className="p-1 font-sans">
                <h3 className="font-bold text-lg border-b mb-1">
                  {v.type === 'LRT' ? 'ION LRT' : 'GRT Bus'}
                </h3>
                <p className="text-sm"><strong>Route:</strong> {v.routeId}</p>
                <p className={`text-sm font-semibold ${v.delaySeconds > 60 ? 'text-red-600' : 'text-green-600'}`}>
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