CREATE TABLE IF NOT EXISTS locations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  country TEXT NOT NULL,
  country_code TEXT,
  latitude REAL NOT NULL,
  longitude REAL NOT NULL,
  timezone TEXT NOT NULL,
  admin1 TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE (latitude, longitude, country)
);

CREATE TABLE IF NOT EXISTS forecast_snapshots (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  location_id INTEGER NOT NULL,
  fetched_at TEXT NOT NULL,
  timezone TEXT NOT NULL,
  warnings TEXT NOT NULL DEFAULT '[]',
  provider TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE CASCADE,
  UNIQUE(location_id, fetched_at)
);

CREATE TABLE IF NOT EXISTS daily_forecasts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  snapshot_id INTEGER NOT NULL,
  date TEXT NOT NULL,
  weather_code INTEGER,
  temperature_max REAL,
  temperature_min REAL,
  precipitation_probability_max REAL,
  precipitation_sum REAL,
  wind_speed_max REAL,
  snowfall_sum REAL,
  sunrise TEXT,
  sunset TEXT,
  wave_height_max REAL,
  wave_period_max REAL,
  FOREIGN KEY (snapshot_id) REFERENCES forecast_snapshots(id) ON DELETE CASCADE,
  UNIQUE(snapshot_id, date)
);
