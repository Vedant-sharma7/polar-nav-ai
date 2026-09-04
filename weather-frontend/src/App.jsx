import { useEffect, useMemo, useState } from 'react'
import './App.css'

function App() {
  const [route, setRoute] = useState([])
  const [weather, setWeather] = useState([])
  const [weatherAlert, setWeatherAlert] = useState(false)

  useEffect(() => {
    const loadWeather = () => {
      fetch('http://localhost:5000/api/v1/routes/active')
          .then((response) => response.json())
          .then((data) => {
            const activeRoute = data.waypoints || []

            setRoute(activeRoute)

            return Promise.all(
                activeRoute.map(([lat, lon]) =>
                    fetch(
                        `http://localhost:8080/api/weather?lat=${lat}&lon=${lon}`
                    ).then((response) => response.json())
                )
            )
          })
          .then((weatherData) => {
            setWeather(weatherData)

            const hasHighRisk = weatherData.some((data) => {
              const current = data.current
              const hourly = data.hourly

              const currentHourIndex = hourly?.time?.findIndex(
                  (time) => time >= current?.time?.slice(0, 13)
              )

              const startIndex =
                  currentHourIndex >= 0 ? currentHourIndex : 0

              const nextPrecip =
                  hourly?.precipitation_probability?.slice(
                      startIndex,
                      startIndex + 6
                  ) || []

              const maxPrecip = Math.max(...nextPrecip, 0)
              const wind = current?.wind_speed_10m || 0

              return wind >= 60 || maxPrecip >= 80
            })

            setWeatherAlert(hasHighRisk)
          })
          .catch((error) => {
            console.error('Weather API error:', error)
          })
    }

    loadWeather()

    const refreshInterval = setInterval(() => {
      window.location.reload()
    }, 10 * 60 * 1000)

    return () => clearInterval(refreshInterval)
  }, [])

  /* =====================================================
     CONVERT REAL ROUTE COORDINATES INTO MAP POSITIONS
  ===================================================== */

  const routePoints = useMemo(() => {
    if (route.length === 0) return []

    const lats = route.map(([lat]) => lat)
    const lons = route.map(([, lon]) => lon)

    const minLat = Math.min(...lats)
    const maxLat = Math.max(...lats)

    const minLon = Math.min(...lons)
    const maxLon = Math.max(...lons)

    const latRange = maxLat - minLat || 1
    const lonRange = maxLon - minLon || 1

    return route.map(([lat, lon], index) => ({
      index,
      lat,
      lon,

      x: 7 + ((lon - minLon) / lonRange) * 86,

      y: 88 - ((lat - minLat) / latRange) * 76,

      isShip: index === 0
    }))
  }, [route])

  const routePath = routePoints
      .map((point) => `${point.x},${point.y}`)
      .join(' ')

  /* =====================================================
     WEATHER SUMMARY
  ===================================================== */

  const monitoredWeather = weather.slice(0, 5)

  const maxWind = Math.max(
      ...monitoredWeather.map(
          (data) => data.current?.wind_speed_10m || 0
      ),
      0
  )

  const maxPrecip = Math.max(
      ...monitoredWeather.map((data) => {
        const hourly = data.hourly
        const current = data.current

        const currentHourIndex = hourly?.time?.findIndex(
            (time) => time >= current?.time?.slice(0, 13)
        )

        const startIndex =
            currentHourIndex >= 0 ? currentHourIndex : 0

        const values =
            hourly?.precipitation_probability?.slice(
                startIndex,
                startIndex + 6
            ) || []

        return Math.max(...values, 0)
      }),
      0
  )

  const highestRisk = monitoredWeather.some((data) => {
    const wind = data.current?.wind_speed_10m || 0

    const hourly = data.hourly
    const current = data.current

    const currentHourIndex = hourly?.time?.findIndex(
        (time) => time >= current?.time?.slice(0, 13)
    )

    const startIndex =
        currentHourIndex >= 0 ? currentHourIndex : 0

    const precipitation =
        hourly?.precipitation_probability?.slice(
            startIndex,
            startIndex + 6
        ) || []

    const maxPointPrecip = Math.max(...precipitation, 0)

    return wind >= 60 || maxPointPrecip >= 80
  })
      ? 'HIGH'
      : monitoredWeather.some((data) => {
        const wind = data.current?.wind_speed_10m || 0

        const hourly = data.hourly
        const current = data.current

        const currentHourIndex = hourly?.time?.findIndex(
            (time) => time >= current?.time?.slice(0, 13)
        )

        const startIndex =
            currentHourIndex >= 0 ? currentHourIndex : 0

        const precipitation =
            hourly?.precipitation_probability?.slice(
                startIndex,
                startIndex + 6
            ) || []

        const maxPointPrecip = Math.max(...precipitation, 0)

        return wind >= 35 || maxPointPrecip >= 50
      })
          ? 'MEDIUM'
          : 'LOW'

  return (
      <div className="weather-app">

        {/* =================================================
          TOP BAR
      ================================================= */}

        <header className="topbar">

          <div className="brand">

            <div className="brand-mark">
              ◈
            </div>

            <div>
              <h1>POLAR WEATHER</h1>

              <p>
                ANTARCTIC ENVIRONMENTAL INTELLIGENCE
              </p>
            </div>

          </div>

          <div className="header-readout">

            <div className="header-time">
              LIVE
            </div>

            <div className="header-status">
              <span></span>
              WEATHER LINK
            </div>

          </div>

        </header>


        {/* =================================================
          TELEMETRY
      ================================================= */}

        <section className="telemetry-panel">

          <div className="panel-title">
            <span>01</span>
            MISSION TELEMETRY
          </div>

          <div className="telemetry-grid">

            <div className="telemetry-card">

              <span>VESSEL STATUS</span>

              <strong className="safe-text">
                ● UNDERWAY
              </strong>

              <small>
                NAVIGATION ACTIVE
              </small>

            </div>


            <div className="telemetry-card">

              <span>ROUTE STATUS</span>

              <strong>
                {route.length > 0
                    ? '● ACTIVE'
                    : '○ STANDBY'}
              </strong>

              <small>
                {route.length} TOTAL WAYPOINTS
              </small>

            </div>


            <div className="telemetry-card">

              <span>WEATHER RISK</span>

              <strong
                  className={`risk-${highestRisk.toLowerCase()}`}
              >
                {highestRisk}
              </strong>

              <small>
                FORWARD CORRIDOR
              </small>

            </div>


            <div className="telemetry-card">

              <span>MONITORING</span>

              <strong>
                {Math.min(route.length, 5)
                    .toString()
                    .padStart(2, '0')}
              </strong>

              <small>
                WAYPOINTS AHEAD
              </small>

            </div>

          </div>

        </section>


        {/* =================================================
          WEATHER STATUS
      ================================================= */}

        <section
            className={`mission-status ${
                weatherAlert
                    ? 'alert-active'
                    : 'status-normal'
            }`}
        >

          <div className="status-symbol">
            {weatherAlert ? '⚠' : '◆'}
          </div>

          <div>

            <strong>
              {weatherAlert
                  ? 'WEATHER WARNING — HIGH RISK AHEAD'
                  : 'ENVIRONMENTAL CONDITIONS NOMINAL'}
            </strong>

            <p>
              {weatherAlert
                  ? 'One or more monitored waypoints exceed operational weather thresholds.'
                  : 'Forward weather corridor currently within monitored operating thresholds.'}
            </p>

          </div>

        </section>


        {/* =================================================
          ANTARCTIC ROUTE
      ================================================= */}

        <section className="route-section">

          <div className="section-header">

            <div className="section-heading">

              <span>02</span>

              <div>

                <h2>
                  ANTARCTIC ROUTE
                </h2>

                <p>
                  LIVE WEATHER CORRIDOR
                </p>

              </div>

            </div>


            <div className="section-status">

              <span></span>

              ROUTE DATA LINK

            </div>

          </div>


          <div className="route-map">

            {/* BACKGROUND GRID */}

            <div className="map-grid"></div>


            {/* POLAR CONTOURS */}

            <div className="polar-contour contour-1"></div>

            <div className="polar-contour contour-2"></div>

            <div className="polar-contour contour-3"></div>


            {/* CROSSHAIR */}

            <div className="map-crosshair horizontal"></div>

            <div className="map-crosshair vertical"></div>


            {/* ROUTE */}

            {routePoints.length > 1 && (

                <svg
                    className="route-svg"
                    viewBox="0 0 100 100"
                    preserveAspectRatio="none"
                >

                  {/* ROUTE GLOW */}

                  <polyline
                      points={routePath}
                      className="route-shadow"
                      fill="none"
                  />


                  {/* MAIN ROUTE */}

                  <polyline
                      points={routePath}
                      className="route-line"
                      fill="none"
                  />


                  {/* WAYPOINTS */}

                  {routePoints.map((point) => (

                      <g key={point.index}>

                        {/* OUTER RING */}

                        <circle
                            cx={point.x}
                            cy={point.y}
                            r={point.isShip ? 3 : 1.7}
                            className={
                              point.isShip
                                  ? 'route-ship-ring'
                                  : 'route-waypoint-ring'
                            }
                        />


                        {/* CENTER */}

                        <circle
                            cx={point.x}
                            cy={point.y}
                            r={point.isShip ? 1.15 : 0.6}
                            className={
                              point.isShip
                                  ? 'route-ship'
                                  : 'route-waypoint'
                            }
                        />


                        {/* LABELS */}

                        {point.index < 5 && (

                            <text
                                x={point.x + 2.8}
                                y={point.y - 2.5}
                                className="route-label"
                            >

                              {point.isShip
                                  ? 'VESSEL'
                                  : `WP${point.index}`}

                            </text>

                        )}

                      </g>

                  ))}

                </svg>

            )}


            {/* NO ROUTE */}

            {route.length === 0 && (

                <div className="route-empty">

                  <strong>
                    NO ACTIVE ROUTE
                  </strong>

                  <span>
                ACTIVATE ROUTE IN POLAR NAV AI
              </span>

                </div>

            )}


            {/* TOP LEFT */}

            <div className="map-readout top-left">
              ANTARCTIC OPERATIONS ZONE
            </div>


            {/* TOP RIGHT */}

            <div className="map-readout top-right">

              <span className="live-dot"></span>

              LIVE TRACK

            </div>


            {/* BOTTOM LEFT */}

            <div className="map-readout bottom-left">

              TRACK //
              {' '}
              {route.length
                  .toString()
                  .padStart(2, '0')}
              {' '}
              WAYPOINTS

            </div>


            {/* BOTTOM RIGHT */}

            <div className="map-readout bottom-right">

              {route.length > 0
                  ? `${route[0][0].toFixed(2)}° / ${route[0][1].toFixed(2)}°`
                  : '--'}

            </div>

          </div>

        </section>


        {/* =================================================
          WEATHER AHEAD
      ================================================= */}

        <section className="weather-section">

          <div className="section-header">

            <div className="section-heading">

              <span>03</span>

              <div>

                <h2>
                  WEATHER AHEAD
                </h2>

                <p>
                  NEXT FIVE ROUTE WAYPOINTS
                </p>

              </div>

            </div>


            <div className="section-status">

              <span></span>

              OPEN-METEO LIVE

            </div>

          </div>


          <div className="weather-grid">

            {monitoredWeather.map((data, index) => {

              const current = data.current
              const hourly = data.hourly

              const currentHourIndex =
                  hourly?.time?.findIndex(
                      (time) =>
                          time >=
                          current?.time?.slice(0, 13)
                  )

              const startIndex =
                  currentHourIndex >= 0
                      ? currentHourIndex
                      : 0

              const nextHours =
                  hourly?.precipitation_probability?.slice(
                      startIndex,
                      startIndex + 6
                  ) || []

              const nextSnowfall =
                  hourly?.snowfall?.slice(
                      startIndex,
                      startIndex + 6
                  ) || []

              const nextRain =
                  hourly?.rain?.slice(
                      startIndex,
                      startIndex + 6
                  ) || []

              const maxPrecipProbability =
                  Math.max(...nextHours, 0)

              const maxSnowfall =
                  Math.max(...nextSnowfall, 0)

              const maxRain =
                  Math.max(...nextRain, 0)

              const wind =
                  current?.wind_speed_10m || 0

              const risk =
                  wind >= 60 ||
                  maxPrecipProbability >= 80
                      ? 'HIGH'
                      : wind >= 35 ||
                      maxPrecipProbability >= 50
                          ? 'MEDIUM'
                          : 'LOW'

              const weatherCode =
                  current?.weather_code

              const weatherCondition =
                  weatherCode === 0
                      ? 'CLEAR'
                      : weatherCode === 1 ||
                      weatherCode === 2
                          ? 'PARTLY CLOUDY'
                          : weatherCode === 3
                              ? 'OVERCAST'
                              : weatherCode >= 71 &&
                              weatherCode <= 77
                                  ? 'SNOW'
                                  : weatherCode >= 80 &&
                                  weatherCode <= 82
                                      ? 'RAIN SHOWERS'
                                      : weatherCode >= 85 &&
                                      weatherCode <= 86
                                          ? 'SNOW SHOWERS'
                                          : 'UNSTABLE'

              const firstPrecip =
                  nextHours[0] || 0

              const lastPrecip =
                  nextHours[
                  nextHours.length - 1
                      ] || 0

              const weatherTrend =
                  lastPrecip >
                  firstPrecip + 20
                      ? 'WORSENING'
                      : lastPrecip <
                      firstPrecip - 20
                          ? 'IMPROVING'
                          : 'STABLE'

              return (

                  <article
                      className={`weather-card risk-${risk.toLowerCase()}`}
                      key={index}
                  >

                    <div className="weather-card-header">

                      <div>

                    <span>
                      WAYPOINT
                    </span>

                        <strong>
                          +{index + 1}
                        </strong>

                      </div>


                      <div className="risk-indicator">
                        {risk}
                      </div>

                    </div>


                    <div className="waypoint-coords">

                      {route[index]
                          ? `${route[index][0].toFixed(2)}° / ${route[index][1].toFixed(2)}°`
                          : '--'}

                    </div>


                    <div className="weather-main">

                      <div className="temperature">

                        {current?.temperature_2m}

                        <small>
                          °C
                        </small>

                      </div>


                      <div className="condition">
                        {weatherCondition}
                      </div>

                    </div>


                    <div className="weather-metrics">

                      <div>
                        <span>WIND</span>

                        <strong>
                          {current?.wind_speed_10m}
                          {' '}
                          km/h
                        </strong>
                      </div>


                      <div>
                        <span>DIRECTION</span>

                        <strong>
                          {current?.wind_direction_10m}°
                        </strong>
                      </div>


                      <div>
                        <span>PRECIP</span>

                        <strong>
                          {maxPrecipProbability}%
                        </strong>
                      </div>


                      <div>
                        <span>RAIN / 6H</span>

                        <strong>
                          {maxRain} mm
                        </strong>
                      </div>


                      <div>
                        <span>SNOW / 6H</span>

                        <strong>
                          {maxSnowfall} cm
                        </strong>
                      </div>


                      <div>
                        <span>TREND</span>

                        <strong>
                          {weatherTrend}
                        </strong>
                      </div>

                    </div>

                  </article>

              )
            })}

          </div>

        </section>


        {/* =================================================
          OPERATIONS
      ================================================= */}

        <section className="operations-section">

          <div className="section-header">

            <div className="section-heading">

              <span>04</span>

              <div>

                <h2>
                  OPERATIONAL SUMMARY
                </h2>

                <p>
                  FORWARD WEATHER ASSESSMENT
                </p>

              </div>

            </div>

          </div>


          <div className="operations-grid">

            <div className="operation-card">

            <span>
              MONITORED RANGE
            </span>

              <strong>
                {Math.min(route.length, 5)} WP
              </strong>

              <small>
                FORWARD WEATHER WINDOW
              </small>

            </div>


            <div className="operation-card">

            <span>
              MAX WIND
            </span>

              <strong>
                {maxWind} km/h
              </strong>

              <small>
                MONITORED CORRIDOR
              </small>

            </div>


            <div className="operation-card">

            <span>
              MAX PRECIPITATION
            </span>

              <strong>
                {maxPrecip}%
              </strong>

              <small>
                NEXT 6 HOURS
              </small>

            </div>


            <div className="operation-card">

            <span>
              OVERALL RISK
            </span>

              <strong
                  className={`risk-${highestRisk.toLowerCase()}`}
              >
                {highestRisk}
              </strong>

              <small>
                FORWARD ASSESSMENT
              </small>

            </div>

          </div>

        </section>


        {/* =================================================
          FOOTER
      ================================================= */}

        <footer className="footer">

        <span>
          POLAR NAV AI // WEATHER INTELLIGENCE
        </span>

          <span>
          LIVE OPEN-METEO DATA // AUTO REFRESH 10 MIN
        </span>

        </footer>

      </div>
  )
}

export default App