-- AnglerIQ Initial Schema
-- Migration 001

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- BODY OF WATER
-- ============================================================
CREATE TABLE body_of_water (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  state TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('lake', 'river', 'reservoir', 'bay', 'coastal', 'other')),
  lat FLOAT,
  lng FLOAT,
  species TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_body_of_water_state ON body_of_water(state);
CREATE INDEX idx_body_of_water_type ON body_of_water(type);

-- ============================================================
-- TOURNAMENT
-- ============================================================
CREATE TABLE tournament (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  organization TEXT NOT NULL CHECK (organization IN ('BASS', 'MLF', 'BASS_NATION', 'LOCAL', 'OTHER')),
  body_of_water_id UUID NOT NULL REFERENCES body_of_water(id) ON DELETE CASCADE,
  start_date DATE NOT NULL,
  end_date DATE,
  source_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_tournament_body_of_water ON tournament(body_of_water_id);
CREATE INDEX idx_tournament_organization ON tournament(organization);
CREATE INDEX idx_tournament_start_date ON tournament(start_date);

-- ============================================================
-- TOURNAMENT RESULT
-- ============================================================
CREATE TABLE tournament_result (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tournament_id UUID NOT NULL REFERENCES tournament(id) ON DELETE CASCADE,
  angler_name TEXT NOT NULL,
  place INT NOT NULL,
  total_weight FLOAT,
  day_weights FLOAT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_tournament_result_tournament ON tournament_result(tournament_id);
CREATE INDEX idx_tournament_result_place ON tournament_result(place);

-- ============================================================
-- TECHNIQUE REPORT
-- ============================================================
CREATE TABLE technique_report (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tournament_result_id UUID REFERENCES tournament_result(id) ON DELETE SET NULL,
  body_of_water_id UUID NOT NULL REFERENCES body_of_water(id) ON DELETE CASCADE,
  source_type TEXT NOT NULL CHECK (source_type IN ('tournament', 'youtube', 'forum', 'article', 'other')),
  source_url TEXT,
  reported_date DATE,
  season TEXT CHECK (season IN ('spring', 'summer', 'fall', 'winter')),
  pattern TEXT,
  presentation TEXT,
  depth_range_ft TEXT,
  structure TEXT,
  notes TEXT,
  confidence FLOAT DEFAULT 0.5 CHECK (confidence >= 0 AND confidence <= 1),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_technique_report_body_of_water ON technique_report(body_of_water_id);
CREATE INDEX idx_technique_report_source_type ON technique_report(source_type);
CREATE INDEX idx_technique_report_season ON technique_report(season);
CREATE INDEX idx_technique_report_reported_date ON technique_report(reported_date);
CREATE INDEX idx_technique_report_tournament_result ON technique_report(tournament_result_id);

-- ============================================================
-- BAIT USED
-- ============================================================
CREATE TABLE bait_used (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  technique_report_id UUID NOT NULL REFERENCES technique_report(id) ON DELETE CASCADE,
  bait_type TEXT,
  bait_name TEXT,
  color TEXT,
  weight_oz FLOAT,
  hook_size TEXT,
  line_type TEXT CHECK (line_type IN ('fluorocarbon', 'braid', 'monofilament', 'other', NULL)),
  line_lb_test INT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_bait_used_technique_report ON bait_used(technique_report_id);
CREATE INDEX idx_bait_used_bait_type ON bait_used(bait_type);
CREATE INDEX idx_bait_used_color ON bait_used(color);

-- ============================================================
-- CONDITIONS
-- ============================================================
CREATE TABLE conditions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  technique_report_id UUID NOT NULL REFERENCES technique_report(id) ON DELETE CASCADE,
  date DATE,
  air_temp_f FLOAT,
  water_temp_f FLOAT,
  water_clarity TEXT CHECK (water_clarity IN ('clear', 'stained', 'muddy', NULL)),
  water_level TEXT CHECK (water_level IN ('normal', 'high', 'low', 'falling', 'rising', NULL)),
  sky_cover TEXT CHECK (sky_cover IN ('clear', 'partly_cloudy', 'overcast', NULL)),
  wind_mph FLOAT,
  wind_direction TEXT,
  barometric_pressure FLOAT,
  pressure_trend TEXT CHECK (pressure_trend IN ('rising', 'falling', 'stable', NULL)),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_conditions_technique_report ON conditions(technique_report_id);
CREATE INDEX idx_conditions_date ON conditions(date);
CREATE INDEX idx_conditions_water_temp ON conditions(water_temp_f);

-- ============================================================
-- UPDATED_AT TRIGGER
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_body_of_water_updated_at BEFORE UPDATE ON body_of_water FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_tournament_updated_at BEFORE UPDATE ON tournament FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_tournament_result_updated_at BEFORE UPDATE ON tournament_result FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_technique_report_updated_at BEFORE UPDATE ON technique_report FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_bait_used_updated_at BEFORE UPDATE ON bait_used FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_conditions_updated_at BEFORE UPDATE ON conditions FOR EACH ROW EXECUTE FUNCTION update_updated_at();
