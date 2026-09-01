# 🚢 Polar-Nav AI: Backend Routing Engine

This is the Node.js/Express backend for the Antarctic Navigation Decision Support System (PS 26059). 
It features a custom A* pathfinding algorithm that calculates safe, fuel-efficient maritime routes while avoiding high-risk sea-ice belts and adrift icebergs.

## 🚀 How to Run Locally
1. `npm install`
2. `node index.js`
3. Server runs on `http://localhost:5000`

## 📡 API Endpoints

### 1. Get Stations & Ports
- **GET** `/api/v1/stations`
- Returns: JSON array of available departure and destination coordinates.

### 2. Get Hazard Zones (Icebergs)
- **GET** `/api/v1/hazards`
- Returns: JSON object containing active iceberg coordinates and their threat radius.

### 3. Generate Optimized Route
- **POST** `/api/v1/routes/optimize`
- **Request Body:**
  ```json
  {
    "origin": { "lat": -33.92, "lon": 18.42 },
    "destination": { "lat": -69.40, "lon": 76.19 }
  }