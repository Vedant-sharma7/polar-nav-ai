const express = require('express');
const router = express.Router();

const stations = require('../data/stations.json');
const hazards = require('../data/hazards.json');
const { calculateVoyageMetrics } = require('../services/telemetry');
const { findOptimalRoute } = require('../services/pathfinder');

// 1. GET /api/v1/stations
router.get('/stations', (req, res) => {
  res.json(stations);
});

// 2. GET /api/v1/hazards
router.get('/hazards', (req, res) => {
  res.json(hazards);
});

// 3. POST /api/v1/routes/optimize (Runs dynamic A* calculation)
router.post('/routes/optimize', (req, res) => {
  // Default coordinates if not provided in the request body
  const origin = req.body.origin || { lat: -33.92, lon: 18.42 };       // Cape Town
  const destination = req.body.destination || { lat: -69.40, lon: 76.19 }; // Bharati Station

  const icebergA23a = hazards.icebergs[0];

  // A. Generate the Algorithmic Safe Route using A*
  const optimalWaypoints = findOptimalRoute(origin, destination);

  // B. Generate the Naive Direct Route (Straight line through the hazard zone)
  const naiveWaypoints = [
    [origin.lat, origin.lon],
    [icebergA23a.lat, icebergA23a.lon], // Traverses directly through Iceberg A-23a
    [destination.lat, destination.lon]
  ];

  // C. Calculate physics and maritime telemetry for both routes
  const directMetrics = calculateVoyageMetrics(naiveWaypoints, icebergA23a);
  const safeMetrics = calculateVoyageMetrics(optimalWaypoints, icebergA23a);

  // D. Calculate relative fuel savings percentage
  const fuelSavedPercent = (
    ((directMetrics.fuelConsumptionTons - safeMetrics.fuelConsumptionTons) /
      directMetrics.fuelConsumptionTons) * 100
  ).toFixed(1);

  res.json({
    status: "success",
    comparison: {
      fuelSavedPercent: `${fuelSavedPercent}%`,
      directRoute: {
        waypoints: naiveWaypoints,
        ...directMetrics
      },
      safeRoute: {
        waypoints: optimalWaypoints,
        ...safeMetrics
      }
    }
  });
});

module.exports = router;