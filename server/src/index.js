/**
 * index.js
 * ROLE: Express API Server (Entry Point)
 * This file initializes the web server and defines the routes that 
 * the React frontend will use to fetch live transit data.
 */

const express = require('express');
const cors = require('cors');
const { getUnifiedTransitData } = require('./services/grtService');

// initialize the Express application
const app = express();

// define the port, use 5001 to avoid conflicts with 
// common frontend ports like 3000 (React) or 5173 (Vite).
const PORT = 5001;

/**
 * MIDDLEWARE
 */

// CORS (Cross-Origin Resource Sharing):
app.use(cors());

// Body Parser: allows the server to accept and parse JSON data in the body of requests.
app.use(express.json());

/**
 * ROUTES
 */

/**
 * GET /api/transit
 * the main endpoint for the application
 * triggers the grtService to fetch, decode, and merge live data.
 */
app.get('/api/transit', async (req, res) => {
    try {
        // call unified service to get the current state of GRT
        const data = await getUnifiedTransitData();
        
        // return the combined data (vehicles + alerts) as a JSON response
        res.json(data);
    } catch (error) {
        // log the error on the server side for debugging
        console.error("Critical API Error:", error);
        
        // return a 500 status code to tell the frontend something went wrong
        res.status(500).json({ 
            error: "Internal Server Error", 
            message: "Could not synchronize with GRT feeds." 
        });
    }
});

/**
 * GET /health
 * a simple "heartbeat" route to verify the server is running
 */
app.get('/health', (req, res) => res.send('Server is healthy!'));

/**
 * START SERVER
 */
app.listen(PORT, () => {
    console.log(`Smart GRT Assistant API is live!`);
    console.log(`Local Access: http://localhost:${PORT}/api/transit`);
    console.log(`Health Check: http://localhost:${PORT}/health`);
});