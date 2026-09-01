// Earth radius in Nautical Miles (standard for global maritime navigation)
const EARTH_RADIUS_NM = 3440.065;

/**
 * 1. Haversine Formula: Calculates distance between two [lat, lon] points on a sphere
 */
function calculateDistanceBetweenPoints(lat1, lon1, lat2, lon2) {
  const toRad = (angle) => (angle * Math.PI) / 180;
  
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_NM * c;
}

/**
 * 2. Calculate Total Route Distance by summing up each waypoint segment
 */
function calculateTotalDistance(waypoints) {
  let totalDistance = 0;
  for (let i = 0; i < waypoints.length - 1; i++) {
    const [lat1, lon1] = waypoints[i];
    const [lat2, lon2] = waypoints[i + 1];
    totalDistance += calculateDistanceBetweenPoints(lat1, lon1, lat2, lon2);
  }
  return Math.round(totalDistance);
}

/**
 * 3. Evaluate Collision Risk against Iceberg A-23a
 * If any waypoint gets closer than 35 Nautical Miles to the iceberg center, risk spikes.
 */
function evaluateCollisionRisk(waypoints, iceberg) {
  let minDistanceToIceberg = Infinity;

  for (let point of waypoints) {
    const [lat, lon] = point;
    const dist = calculateDistanceBetweenPoints(lat, lon, iceberg.lat, iceberg.lon);
    if (dist < minDistanceToIceberg) {
      minDistanceToIceberg = dist;
    }
  }

  // Safe buffer threshold: 50 Nautical Miles
  if (minDistanceToIceberg < 25) {
    return { riskPercent: 92.4, status: "CRITICAL COLLISION RISK" };
  } else if (minDistanceToIceberg < 50) {
    return { riskPercent: 45.0, status: "MODERATE HAZARD PROXIMITY" };
  }
  return { riskPercent: 0.0, status: "SAFE TRAJECTORY" };
}

/**
 * 4. Calculate Fuel Burn & ETA
 * Standard Polar Expedition Vessel (like MV Vasiliy Golovnin used by NCPOR):
 * - Cruising speed: 14 knots (~336 NM per day)
 * - Base fuel burn: 0.045 Tons per Nautical Mile
 * - Ice multiplier: If cruising below Lat -60°S, ice resistance increases fuel burn
 */
function calculateVoyageMetrics(waypoints, iceberg) {
  const totalDistanceNM = calculateTotalDistance(waypoints);
  
  // Calculate average ice resistance based on how much of the path is in the ice belt (Lat < -60)
  let iceBeltSegments = 0;
  for (let point of waypoints) {
    if (point[0] <= -60) iceBeltSegments++;
  }
  
  const iceFactor = iceBeltSegments > 0 ? 1 + (iceBeltSegments / waypoints.length) * 0.8 : 1.0;
  const baseFuelBurnTons = totalDistanceNM * 0.045 * iceFactor;
  const etaDays = (totalDistanceNM / (14 * 24)).toFixed(1); // 14 knots * 24 hours
  
  const collision = evaluateCollisionRisk(waypoints, iceberg);

  return {
    totalDistanceNM,
    fuelConsumptionTons: Math.round(baseFuelBurnTons),
    etaDays: parseFloat(etaDays),
    collisionRisk: collision.riskPercent,
    safetyStatus: collision.status
  };
}

module.exports = {
  calculateDistanceBetweenPoints,
  calculateTotalDistance,
  calculateVoyageMetrics
};