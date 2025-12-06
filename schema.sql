PRAGMA foreign_keys=ON;

-- Capacity rules
CREATE TABLE IF NOT EXISTS slot_caps (
  area TEXT PRIMARY KEY,
  cap_people INTEGER NOT NULL
);

INSERT OR REPLACE INTO slot_caps(area, cap_people)
VALUES ('indoor', 40), ('outdoor', 20);

-- Current usage per slot (fast)
CREATE TABLE IF NOT EXISTS slot_usage (
  res_date TEXT NOT NULL,   -- YYYY-MM-DD
  res_time TEXT NOT NULL,   -- HH:MM
  area TEXT NOT NULL,       -- indoor/outdoor
  used_people INTEGER NOT NULL,
  PRIMARY KEY (res_date, res_time, area)
);

-- Reservations
CREATE TABLE IF NOT EXISTS reservations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at TEXT NOT NULL,
  res_date TEXT NOT NULL,
  res_time TEXT NOT NULL,
  area TEXT NOT NULL,
  people INTEGER NOT NULL,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  notes TEXT,
  ip_hash TEXT,
  user_agent TEXT
);

CREATE INDEX IF NOT EXISTS idx_res_slot ON reservations(res_date, res_time, area);
CREATE INDEX IF NOT EXISTS idx_res_date ON reservations(res_date);
CREATE INDEX IF NOT EXISTS idx_res_ip ON reservations(ip_hash, created_at);

-- Enforce capacity & max-people atomically
CREATE TRIGGER IF NOT EXISTS trg_reservations_capacity
BEFORE INSERT ON reservations
BEGIN
  SELECT CASE WHEN NEW.area NOT IN ('indoor','outdoor') THEN RAISE(ABORT,'INVALID_AREA') END;
  SELECT CASE WHEN NEW.people < 1 OR NEW.people > 10 THEN RAISE(ABORT,'TOO_BIG') END;

  INSERT OR IGNORE INTO slot_usage(res_date, res_time, area, used_people)
  VALUES (NEW.res_date, NEW.res_time, NEW.area, 0);

  SELECT CASE
    WHEN (SELECT used_people FROM slot_usage
          WHERE res_date=NEW.res_date AND res_time=NEW.res_time AND area=NEW.area) + NEW.people
       > (SELECT cap_people FROM slot_caps WHERE area=NEW.area)
    THEN RAISE(ABORT,'CAPACITY_SLOT_AREA')
  END;

  UPDATE slot_usage
    SET used_people = used_people + NEW.people
    WHERE res_date=NEW.res_date AND res_time=NEW.res_time AND area=NEW.area;
END;
