/**
 * grtService.js
 * ROLE: Data Fetching and Binary Transformation
 * This service interacts with the Region of Waterloo's GTFS-Realtime feeds.
 */

const axios = require('axios');
const GtfsRealtimeBindings = require('gtfs-realtime-bindings');

// base URL for the Region of Waterloo's Open Data API
const BASE_URL = "https://webapps.regionofwaterloo.ca/api/grt-routes/api";

/**
 * utility to fetch and decode binary Protobuf (.pb) files.
 * @param {string} feedName - the name of the feed (e.g., vehiclepositions)
 */
async function fetchProtobuf(feedName) {
    try {
        const response = await axios({
            method: 'get',
            url: `${BASE_URL}/${feedName}`,
            responseType: 'arraybuffer', // binary data must be handled as a buffer
            headers: { 'Accept': 'application/x-protobuf' },
            timeout: 10000 // prevents the server from hanging if GRT is slow
        });
        
        // use bindings to decode the binary buffer into a readable JS Object
        return GtfsRealtimeBindings.transit_realtime.FeedMessage.decode(new Uint8Array(response.data));
    } catch (error) {
        // if one feed fails (e.g., alerts are down), return an empty array so the rest can continue
        console.error(`⚠️ ${feedName} feed unavailable:`, error.message);
        return { entity: [] }; 
    }
}

/**
 * combines vehicle, trip, and alert data into a single source
 */
async function getUnifiedTransitData() {
    // Promise.all runs these fetches concurrently (parallelism), 
    // significantly reducing the total request time.
    const [posFeed, tripFeed, alertFeed] = await Promise.all([
        fetchProtobuf('vehiclepositions'),
        fetchProtobuf('tripupdates'),
        fetchProtobuf('alerts')
    ]);

    // process service alerts (detours and notices)
    const alerts = alertFeed.entity.map(entity => {
        const a = entity.alert;
        return {
            id: entity.id,
            // access deeply nested translations safely
            // check for null objects
            header: a?.headerText?.translation?.[0]?.text ?? "Service Alert",
            description: a?.descriptionText?.translation?.[0]?.text ?? "Check grt.ca for details.",
            affectedRoutes: a?.informedEntity?.map(ie => ie.routeId).filter(Boolean) ?? []
        };
    });

    // map for trip updates
    const delayMap = new Map();
    tripFeed.entity.forEach(entity => {
        const u = entity.tripUpdate;
        if (u?.trip?.tripId) {
            // get delay of the first recorded stop in seconds
            const delay = u.stopTimeUpdate?.[0]?.arrival?.delay ?? 0;
            delayMap.set(u.trip.tripId, delay);
        }
    });

    // process vehicle positions (Buses & ION LRT)
    const vehicles = posFeed.entity
        .filter(entity => entity.vehicle) // akip entities that aren't vehicles
        .map(entity => {
            const v = entity.vehicle;
            const routeId = v.trip?.routeId ?? "Unknown";
            
            return {
                id: entity.id,
                // logic to distinguish ION train from standard bus
                type: routeId === '301' ? 'LRT' : 'BUS', 
                routeId,
                latitude: v.position.latitude,
                longitude: v.position.longitude,
                bearing: v.position.bearing ?? 0, // Compass direction (0-359)
                delaySeconds: delayMap.get(v.trip?.tripId) ?? 0, // Link delay from delayMap
                timestamp: v.timestamp?.low ?? Math.floor(Date.now() / 1000)
            };
        });

    return { 
        timestamp: new Date().toISOString(), 
        vehicles, 
        alerts 
    };
}

module.exports = { getUnifiedTransitData };