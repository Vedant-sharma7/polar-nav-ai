const hazards = require('../data/hazards.json');

// Extract Iceberg A-23a data from our hazards file
const ICEBERG = hazards.icebergs[0]; // Lat: -61.5, Lon: 50.2, Radius: ~65 km (~35 NM / ~0.6 deg buffer)

/**
 * 1. Dynamic Cost Function
 * Evaluates the resistance of stepping onto any (lat, lon) coordinate.
 */
function getCellTraversalCost(lat, lon) {
  // A. Check distance to Iceberg A-23a (Degrees approximation: 1 deg ~ 60 NM)
  const distToIceberg = Math.hypot(lat - ICEBERG.lat, lon - ICEBERG.lon);
  
  // Forbidden buffer zone: 3.5 degrees around the iceberg center
  if (distToIceberg <= 3.5) {
    return 9999; // Impassable obstacle
  }

  // B. Antarctic Heavy Pack Ice Belt (Between Lat -60° and -68°)
  // Ships can traverse this if necessary, but it has high fuel resistance
  if (lat <= -60 && lat >= -68) {
    return 20.0;
  }

  // C. Open Water (Standard navigation conditions)
  return 1.0;
}

/**
 * 2. Euclidean Distance Heuristic
 * Estimates the remaining straight-line distance from current node to the destination.
 */
function heuristic(lat1, lon1, lat2, lon2) {
  return Math.hypot(lat1 - lat2, lon1 - lon2);
}

/**
 * 3. A* (A-Star) Pathfinding Algorithm
 * Discretizes the ocean onto a 1-degree coordinate grid and finds the optimal path.
 */
function findOptimalRoute(origin, destination) {
  // Snap coordinates to nearest integer degrees for grid navigation
  const start = { lat: Math.round(origin.lat), lon: Math.round(origin.lon) };
  const target = { lat: Math.round(destination.lat), lon: Math.round(destination.lon) };

  const toKey = (lat, lon) => `${lat},${lon}`;
  
  let openSet = [{ ...start, g: 0, f: heuristic(start.lat, start.lon, target.lat, target.lon) }];
  let cameFrom = new Map();
  
  let gScore = new Map();
  gScore.set(toKey(start.lat, start.lon), 0);

  // 8 possible navigation directions: Cardinal (N, S, E, W) and Intercardinal (Diagonals)
  const directions = [
    { dLat: 1, dLon: 0 },  { dLat: -1, dLon: 0 },
    { dLat: 0, dLon: 1 },  { dLat: 0, dLon: -1 },
    { dLat: 1, dLon: 1 },  { dLat: 1, dLon: -1 },
    { dLat: -1, dLon: 1 }, { dLat: -1, dLon: -1 }
  ];

  while (openSet.length > 0) {
    // Select the node with the lowest f-score
    openSet.sort((a, b) => a.f - b.f);
    let current = openSet.shift();

    // Destination reached
    if (current.lat === target.lat && current.lon === target.lon) {
      return reconstructPath(cameFrom, current, origin, destination);
    }

    for (let dir of directions) {
      let neighborLat = current.lat + dir.dLat;
      let neighborLon = current.lon + dir.dLon;

      // Coordinate boundary constraints: Southern Ocean sector (Lat -30 to -75, Lon 10 to 85)
      if (neighborLat > -30 || neighborLat < -75 || neighborLon < 10 || neighborLon > 85) {
        continue;
      }

      // Check cell cost
      const cellCost = getCellTraversalCost(neighborLat, neighborLon);
      if (cellCost >= 9999) {
        continue; // Iceberg zone: skip evaluation
      }

      // Diagonal steps are geometrically longer (~1.414) than cardinal steps (1.0)
      const stepDistance = Math.hypot(dir.dLat, dir.dLon);
      const tentative_gScore = gScore.get(toKey(current.lat, current.lon)) + (cellCost * stepDistance);

      const neighborKey = toKey(neighborLat, neighborLon);

      if (!gScore.has(neighborKey) || tentative_gScore < gScore.get(neighborKey)) {
        cameFrom.set(neighborKey, { lat: current.lat, lon: current.lon });
        gScore.set(neighborKey, tentative_gScore);

        const fScore = tentative_gScore + heuristic(neighborLat, neighborLon, target.lat, target.lon);

        if (!openSet.some(n => n.lat === neighborLat && n.lon === neighborLon)) {
          openSet.push({ lat: neighborLat, lon: neighborLon, g: tentative_gScore, f: fScore });
        }
      }
    }
  }

  // Fallback direct array if no grid path resolves
  return [[origin.lat, origin.lon], [destination.lat, destination.lon]];
}

/**
 * 4. Path Reconstruction & Waypoint Smoothing
 * Traces parent pointers backward from target to start, then samples key waypoints.
 */
function reconstructPath(cameFrom, current, origin, destination) {
  let fullPath = [[current.lat, current.lon]];
  let currentKey = `${current.lat},${current.lon}`;

  while (cameFrom.has(currentKey)) {
    current = cameFrom.get(currentKey);
    fullPath.push([current.lat, current.lon]);
    currentKey = `${current.lat},${current.lon}`;
  }

  fullPath.reverse();

  // Replace start/end grid integers with exact high-precision origin/destination coordinates
  fullPath[0] = [origin.lat, origin.lon];
  fullPath[fullPath.length - 1] = [destination.lat, destination.lon];

  // Sample every 3rd waypoint to produce a clean, smooth polyline for Leaflet
  const sampledPath = [];
  for (let i = 0; i < fullPath.length; i += 3) {
    sampledPath.push(fullPath[i]);
  }
  if (sampledPath[sampledPath.length - 1] !== fullPath[fullPath.length - 1]) {
    sampledPath.push(fullPath[fullPath.length - 1]);
  }

  return sampledPath;
}

module.exports = {
  findOptimalRoute
};