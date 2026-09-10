import Database from "better-sqlite3";
import path from "path";

const DB_PATH = path.join(process.cwd(), "data", "smartroom.db");

declare global {
  var __db: Database.Database | undefined;
}

function getDb(): Database.Database {
  if (globalThis.__db) return globalThis.__db;
  const db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  initSchema(db);
  globalThis.__db = db;
  return db;
}

function initSchema(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS telemetry (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      device_id TEXT NOT NULL,
      temperature REAL,
      humidity REAL,
      gas_value INTEGER,
      status TEXT DEFAULT 'NORMAL',
      fan_on INTEGER DEFAULT 0,
      buzzer_on INTEGER DEFAULT 0,
      led_red_on INTEGER DEFAULT 0,
      led_green_on INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now','localtime'))
    );

    CREATE TABLE IF NOT EXISTS alerts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      telemetry_id INTEGER,
      device_id TEXT NOT NULL,
      alert_type TEXT NOT NULL,
      message TEXT,
      value REAL,
      threshold REAL,
      created_at TEXT DEFAULT (datetime('now','localtime'))
    );

    CREATE TABLE IF NOT EXISTS device_commands (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      device_id TEXT NOT NULL,
      command TEXT NOT NULL,
      payload TEXT,
      executed INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now','localtime'))
    );

    CREATE TABLE IF NOT EXISTS ml_classifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp TEXT,
      temperature REAL,
      humidity REAL,
      gas_value INTEGER,
      predicted_status TEXT,
      confidence REAL,
      created_at TEXT DEFAULT (datetime('now','localtime'))
    );

    CREATE TABLE IF NOT EXISTS ml_predictions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp TEXT,
      target_timestamp TEXT,
      column_name TEXT,
      predicted_value REAL,
      model_type TEXT,
      created_at TEXT DEFAULT (datetime('now','localtime'))
    );

    CREATE INDEX IF NOT EXISTS idx_telemetry_created ON telemetry(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_telemetry_device ON telemetry(device_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_alerts_created ON alerts(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_device_commands_pending ON device_commands(device_id, executed, id ASC);
    CREATE INDEX IF NOT EXISTS idx_ml_cls_created ON ml_classifications(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_ml_pred_created ON ml_predictions(created_at DESC);

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT DEFAULT (datetime('now','localtime'))
    );
  `);

  // Seed threshold default (kalibrasi awal). Bisa diubah dari dashboard.
  const seedSettings = db.prepare("INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)");
  seedSettings.run("gas_threshold", "500");
  seedSettings.run("temp_threshold", "32.0");
  seedSettings.run("hum_threshold", "75.0");
  seedSettings.run("auto_control", "1");
}

export const db = getDb();
