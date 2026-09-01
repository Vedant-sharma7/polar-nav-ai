const express = require('express');
const router = express.Router();

const stations = require('../data/stations.json');
const hazards = require('../data/hazards.json');
const { calculateVoyageMetrics } = require('../services/telemetry');

// 1. GET /api/v1/stations
router.get('/stations', (req, res) => {
  res.json(stations);
});

// 2. GET /api/v1/hazards
router.get('/hazards', (req, res) => {
  res.json(hazards);
});

// 3. POST /api/v1/routes/optimize (Now calculating telemetry math!)
router.post('/routes/optimize', (req, res) => {
  const icebergA23a = hazards.icebergs[0]; // Lat: -61.5, Lon: 50.2

  // A direct "naive" route: Cape Town -> Direct through Iceberg A-23a -> Bharati Station
  const directPath = [
    [-33.92, 18.42], // Cape Town
    [-61.50, 50.20], // Straight into Iceberg A-23a
    [-69.40, 76.19]  // Bharati Station
  ];

  // A simulated "safe" bypass path avoiding the iceberg
  const bypassPath = [
    [-33.92, 18.42], // Cape Town
    [-45.00, 30.00],
    [-55.00, 42.00],
    [-63.00, 65.00], // Swerves safely around the iceberg
    [-69.40, 76.19]  // Bharati Station
  ];

  const directMetrics = calculateVoyageMetrics(directPath, icebergA23a);
  const safeMetrics = calculateVoyageMetrics(bypassPath, icebergA23a);

  const fuelSavedPercent = (
    ((directMetrics.fuelConsumptionTons - safeMetrics.fuelConsumptionTons) /
      directMetrics.fuelConsumptionTons) * 100
  ).toFixed(1);

  res.json({
    status: "success",
    comparison: {
      fuelSavedPercent: `${fuelSavedPercent}%`,
      directRoute: {
        waypoints: directPath,
        ...directMetrics
      },
      safeRoute: {
        waypoints: bypassPath,
        ...safeMetrics
      }
    }
  });
});

module.exports = router;