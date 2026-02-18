/**
 * index.js
 * ROLE: Express API Server (Entry Point)
 */

const express = require('express');
const cors = require('cors');
const path = require('path');
const { getUnifiedTransitData } = require('./services/grtService');

const app = express();

// Use process.env.PORT for Render deployment, falling back to 5001 locally
const PORT = process.env.PORT || 5001; 

/**
 * MIDDLEWARE
 */
app.use(cors());
app.use(express.json());

// serve from dist folder
app.use(express.static(path.join(__dirname, 'dist')));

/**
 * API ROUTES
 */
app.get('/api/transit', async (req, res) => {
    try {
        const data = await getUnifiedTransitData();
        res.json(data);
    } catch (error) {
        console.error("Critical API Error:", error);
        res.status(500).json({ 
            error: "Internal Server Error", 
            message: "Could not synchronize with GRT feeds." 
        });
    }
});

app.get('/health', (req, res) => res.send('Server is healthy!'));

// "catchall" handler: for any request that doesn't match an API route, 
// send back React's index.html
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

/**
 * START SERVER
 */
app.listen(PORT, () => {
    console.log(`Real-Time GRT Map API is live`);
    console.log(`Server Port: ${PORT}`);
});