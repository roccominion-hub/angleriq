-- AnglerIQ Seed Data: Texas Bodies of Water
-- Migration 002

INSERT INTO body_of_water (name, state, type, lat, lng, species) VALUES
  ('Lake Fork', 'TX', 'reservoir', 32.8815, -95.5724, ARRAY['largemouth bass', 'crappie', 'catfish']),
  ('Sam Rayburn Reservoir', 'TX', 'reservoir', 31.0707, -94.1057, ARRAY['largemouth bass', 'crappie', 'catfish', 'white bass']),
  ('Toledo Bend Reservoir', 'TX', 'reservoir', 31.1824, -93.5607, ARRAY['largemouth bass', 'crappie', 'catfish']),
  ('Lake Conroe', 'TX', 'reservoir', 30.3766, -95.5627, ARRAY['largemouth bass', 'crappie', 'catfish', 'striped bass']),
  ('Lake Livingston', 'TX', 'reservoir', 30.6974, -95.0183, ARRAY['largemouth bass', 'white bass', 'striped bass', 'catfish']),
  ('Lake Travis', 'TX', 'reservoir', 30.4083, -97.9000, ARRAY['largemouth bass', 'smallmouth bass', 'striped bass', 'catfish']),
  ('Lake Buchanan', 'TX', 'reservoir', 30.7513, -98.4156, ARRAY['largemouth bass', 'striped bass', 'catfish', 'white bass']),
  ('Falcon Lake', 'TX', 'reservoir', 26.5644, -99.1570, ARRAY['largemouth bass', 'catfish']),
  ('Lake Amistad', 'TX', 'reservoir', 29.4500, -101.0667, ARRAY['largemouth bass', 'smallmouth bass', 'striped bass', 'catfish']),
  ('O.H. Ivie Reservoir', 'TX', 'reservoir', 31.5568, -99.6863, ARRAY['largemouth bass', 'smallmouth bass', 'catfish']),
  ('Richland Chambers Reservoir', 'TX', 'reservoir', 31.9333, -96.0667, ARRAY['largemouth bass', 'crappie', 'catfish']),
  ('Lake Whitney', 'TX', 'reservoir', 31.8700, -97.3500, ARRAY['largemouth bass', 'striped bass', 'white bass', 'catfish']),
  ('Cedar Creek Reservoir', 'TX', 'reservoir', 32.2833, -96.0500, ARRAY['largemouth bass', 'crappie', 'catfish']),
  ('Lake Texoma', 'TX', 'reservoir', 33.8167, -96.5833, ARRAY['largemouth bass', 'striped bass', 'white bass', 'catfish']),
  ('Caddo Lake', 'TX', 'lake', 32.6979, -94.1768, ARRAY['largemouth bass', 'crappie', 'catfish', 'chain pickerel']);
