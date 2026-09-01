const express = require('express');
const router = express.Router();

// Load the static JSON data we just created
const stations = require('../data/stations.json');
const hazards = require('../data/hazards.json');

// 1. GET /api/v1/stations
router.get('/stations', (req, res) => {
  res.json(stations);
});

// 2. GET /api/v1/hazards
router.get('/hazards', (req, res) => {
  res.json(hazards);
});

// 3. POST /api/v1/routes/optimize (Dummy setup for testing)
router.post('/routes/optimize', (req, res) => {
  const { origin, destination } = req.body;
  
  res.json({
    message: "Endpoint connected successfully!",
    received: { origin, destination },
    status: "Pathfinding A* logic will be added here in Commit 3."
  });
});

module.exports = router;