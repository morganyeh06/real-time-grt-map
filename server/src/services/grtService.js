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
 * Includes sanity and integrity checks to handle malformed GRT data.
 * @param {string} feedPath - the specific API path (e.g., vehiclepositions/1)
 */
async function fetchProtobuf(feedPath) {
    try {
        const response = await axios({
            method: 'get',
            url: `${BASE_URL}/${feedPath}`,
            responseType: 'arraybuffer', // binary data must be handled as a buffer
            headers: { 
                'Accept': 'application/x-protobuf',
                'User-Agent': 'Mozilla/5.0' // ensures the request isn't blocked by basic firewalls
            },
            timeout: 10000 // prevents the server from hanging if GRT is slow
        });

        // check that data is not empty
        if (!response.data || response.data.byteLength < 10) {
            return { entity: [] };
        }

        // check that data is not an error (404, 500, etc)
        const magicBytes = Buffer.from(response.data.slice(0, 10)).toString();
        if (magicBytes.includes('<')) {
            console.warn(`Feed ${feedPath} returned HTML/Error instead of binary data.`);
            return { entity: [] };
        }
        
        // check for index out of range when decoding data
        try {
            return GtfsRealtimeBindings.transit_realtime.FeedMessage.decode(new Uint8Array(response.data));
        } catch (decodeError) {
            console.warn(`Feed ${feedPath} provided malformed binary data. Skipping.`);
            return { entity: [] };
        }
    } catch (error) {
        // if one feed fails (e.g., alerts are down), return an empty array so the rest can continue
        if (error.code !== 'ECONNABORTED') {
            console.error(`${feedPath} feed unavailable:`, error.message);
        }
        return { entity: [] }; 
    }
}

/**
 * combines vehicle, trip, and alert data into a single source
 */
async function getUnifiedTransitData() {
    // fetch bus (1) and ion (2) feeds
    const [busPos, ionPos, busTrips, ionTrips, alertFeed] = await Promise.all([
        fetchProtobuf('vehiclepositions/1'),
        fetchProtobuf('vehiclepositions/2'),
        fetchProtobuf('tripupdates/1'),
        fetchProtobuf('tripupdates/2'),
        fetchProtobuf('alerts') // Unified alerts endpoint
    ]);

    // process unified service alerts (detours and notices)
    const alerts = alertFeed.entity.map(entity => {
        const a = entity.alert;
        return {
            id: entity.id,
            header: a?.headerText?.translation?.[0]?.text ?? "Service Alert",
            description: a?.descriptionText?.translation?.[0]?.text ?? "Check grt.ca for details.",
            affectedRoutes: a?.informedEntity?.map(ie => ie.routeId).filter(Boolean) ?? []
        };
    });

    // map for trip updates (delay calculations)
    const delayMap = new Map();
    [...busTrips.entity, ...ionTrips.entity].forEach(entity => {
        const u = entity.tripUpdate;
        if (u?.trip?.tripId) {
            // get delay of the first recorded stop in seconds
            const delay = u.stopTimeUpdate?.[0]?.arrival?.delay ?? 0;
            delayMap.set(u.trip.tripId, delay);
        }
    });

    // check if ion data is live
    const ionLive = ionPos.entity.length > 0;

    // process vehicle positions (ion and bus)
    let vehicles = [...busPos.entity, ...ionPos.entity]
    .filter(entity => entity.vehicle)
    .map(entity => {
        const v = entity.vehicle;
        const routeId = v.trip?.routeId || v.vehicle?.routeId || "Unknown";
        
        return {
            id: entity.id,
            // route 301 is LRT
            type: (routeId === '301') ? 'LRT' : 'BUS',
            routeId: routeId,
            latitude: v.position.latitude,
            longitude: v.position.longitude,
            bearing: v.position.bearing ?? 0,
            delaySeconds: delayMap.get(v.trip?.tripId) ?? 0,
            timestamp: v.timestamp?.low ?? Math.floor(Date.now() / 1000)
        };
    });

    // demo ion for testing in case ion data is not available
    if (!ionLive) {
        vehicles.push({
            id: "MOCK_ION_TEST",
            type: "LRT",
            routeId: "301",
            latitude: 43.4682, 
            longitude: -80.5372,
            bearing: 180,
            delaySeconds: 120,
            timestamp: Math.floor(Date.now() / 1000)
        });
    }

    return { 
        timestamp: new Date().toISOString(), 
        vehicles, 
        alerts,
        ionStatus: ionLive ? 'live' : 'demo' // pass status to frontend
    };
}

module.exports = { getUnifiedTransitData };