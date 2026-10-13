-- name: findLocationsByName
SELECT * FROM locations
WHERE lower(name) = lower(?)
  AND (? IS NULL OR lower(country) = lower(?) OR lower(country_code) = lower(?))
ORDER BY name, country;

-- name: findLocationByCoordinates
SELECT * FROM locations
WHERE ABS(latitude - ?) < 0.000001
  AND ABS(longitude - ?) < 0.000001
  AND country = ?;

-- name: updateLocation
UPDATE locations
SET name = ?, country = ?, country_code = ?, timezone = ?, admin1 = ?, updated_at = ?
WHERE id = ?;

-- name: insertLocation
INSERT INTO locations (
  name, country, country_code, latitude, longitude, timezone, admin1, created_at, updated_at
) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);

-- name: getLocationByCoordinates
SELECT * FROM locations
WHERE ABS(latitude - ?) < 0.000001 AND ABS(longitude - ?) < 0.000001
ORDER BY updated_at DESC LIMIT 1;

-- name: getLatestSnapshot
SELECT * FROM forecast_snapshots
WHERE location_id = ? ORDER BY fetched_at DESC LIMIT 1;

-- name: insertSnapshot
INSERT INTO forecast_snapshots (
  location_id, fetched_at, timezone, warnings, provider, expires_at, created_at
) VALUES (?, ?, ?, ?, ?, ?, ?);

-- name: insertDailyForecast
INSERT INTO daily_forecasts (
  snapshot_id, date, weather_code, temperature_max, temperature_min,
  precipitation_probability_max, precipitation_sum, wind_speed_max, snowfall_sum,
  sunrise, sunset, wave_height_max, wave_period_max
) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);

-- name: getSnapshotDailyForecasts
SELECT * FROM daily_forecasts WHERE snapshot_id = ? ORDER BY date ASC;
