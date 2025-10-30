-- Populate Big 5 labels for all positions at CFA Buda and West Buda
-- Based on Google Sheet position tabs row 2

-- Organization and Location IDs
-- org_id: 54b9864f-9df9-4a15-a209-7b99e1c274f4
-- CFA Buda: 67e00fb2-29f5-41ce-9c1c-93e2f7f392dd
-- CFA West Buda: e437119c-27d9-4114-9273-350925016738

-- ===== FOH POSITIONS =====

-- iPOS
INSERT INTO position_big5_labels (org_id, location_id, position, label_1, label_2, label_3, label_4, label_5)
VALUES 
  ('54b9864f-9df9-4a15-a209-7b99e1c274f4', '67e00fb2-29f5-41ce-9c1c-93e2f7f392dd', 'iPOS',
   'Smile & Shine', 'Catch Every Detail', 'Lead, Offer, Repeat', 'Close Gaps & Call It Out', 'Friendly Farewell'),
  ('54b9864f-9df9-4a15-a209-7b99e1c274f4', 'e437119c-27d9-4114-9273-350925016738', 'iPOS',
   'Smile & Shine', 'Catch Every Detail', 'Lead, Offer, Repeat', 'Close Gaps & Call It Out', 'Friendly Farewell')
ON CONFLICT (org_id, location_id, position) DO UPDATE SET
  label_1 = EXCLUDED.label_1, label_2 = EXCLUDED.label_2, label_3 = EXCLUDED.label_3,
  label_4 = EXCLUDED.label_4, label_5 = EXCLUDED.label_5, updated_at = NOW();

-- Host | Anfitrión
INSERT INTO position_big5_labels (org_id, location_id, position, label_1, label_2, label_3, label_4, label_5)
VALUES 
  ('54b9864f-9df9-4a15-a209-7b99e1c274f4', '67e00fb2-29f5-41ce-9c1c-93e2f7f392dd', 'Host | Anfitrión',
   'Smile & Shine', 'Greet & Seat', 'Lead, Offer, Repeat', 'Welcoming Environment & PPG', 'Friendly Farewell'),
  ('54b9864f-9df9-4a15-a209-7b99e1c274f4', 'e437119c-27d9-4114-9273-350925016738', 'Host | Anfitrión',
   'Smile & Shine', 'Greet & Seat', 'Lead, Offer, Repeat', 'Welcoming Environment & PPG', 'Friendly Farewell')
ON CONFLICT (org_id, location_id, position) DO UPDATE SET
  label_1 = EXCLUDED.label_1, label_2 = EXCLUDED.label_2, label_3 = EXCLUDED.label_3,
  label_4 = EXCLUDED.label_4, label_5 = EXCLUDED.label_5, updated_at = NOW();

-- OMD
INSERT INTO position_big5_labels (org_id, location_id, position, label_1, label_2, label_3, label_4, label_5)
VALUES 
  ('54b9864f-9df9-4a15-a209-7b99e1c274f4', '67e00fb2-29f5-41ce-9c1c-93e2f7f392dd', 'OMD',
   'Smile & Shine', 'Grab & Go', 'Match & Hand-Off', 'Close Gaps & Call it Out', 'Friendly Farewell'),
  ('54b9864f-9df9-4a15-a209-7b99e1c274f4', 'e437119c-27d9-4114-9273-350925016738', 'OMD',
   'Smile & Shine', 'Grab & Go', 'Match & Hand-Off', 'Close Gaps & Call it Out', 'Friendly Farewell')
ON CONFLICT (org_id, location_id, position) DO UPDATE SET
  label_1 = EXCLUDED.label_1, label_2 = EXCLUDED.label_2, label_3 = EXCLUDED.label_3,
  label_4 = EXCLUDED.label_4, label_5 = EXCLUDED.label_5, updated_at = NOW();

-- Runner
INSERT INTO position_big5_labels (org_id, location_id, position, label_1, label_2, label_3, label_4, label_5)
VALUES 
  ('54b9864f-9df9-4a15-a209-7b99e1c274f4', '67e00fb2-29f5-41ce-9c1c-93e2f7f392dd', 'Runner',
   'Smile & Shine', 'Grab & Go', 'Match & Hand Off', 'Add Value Always', 'Friendly Farewell'),
  ('54b9864f-9df9-4a15-a209-7b99e1c274f4', 'e437119c-27d9-4114-9273-350925016738', 'Runner',
   'Smile & Shine', 'Grab & Go', 'Match & Hand Off', 'Add Value Always', 'Friendly Farewell')
ON CONFLICT (org_id, location_id, position) DO UPDATE SET
  label_1 = EXCLUDED.label_1, label_2 = EXCLUDED.label_2, label_3 = EXCLUDED.label_3,
  label_4 = EXCLUDED.label_4, label_5 = EXCLUDED.label_5, updated_at = NOW();

-- Bagging | Embolsado
INSERT INTO position_big5_labels (org_id, location_id, position, label_1, label_2, label_3, label_4, label_5)
VALUES 
  ('54b9864f-9df9-4a15-a209-7b99e1c274f4', '67e00fb2-29f5-41ce-9c1c-93e2f7f392dd', 'Bagging | Embolsado',
   'Bump & Bag', 'Pull & Organize', 'Flow & Go', 'Print & Stage', 'Echo Holds'),
  ('54b9864f-9df9-4a15-a209-7b99e1c274f4', 'e437119c-27d9-4114-9273-350925016738', 'Bagging | Embolsado',
   'Bump & Bag', 'Pull & Organize', 'Flow & Go', 'Print & Stage', 'Echo Holds')
ON CONFLICT (org_id, location_id, position) DO UPDATE SET
  label_1 = EXCLUDED.label_1, label_2 = EXCLUDED.label_2, label_3 = EXCLUDED.label_3,
  label_4 = EXCLUDED.label_4, label_5 = EXCLUDED.label_5, updated_at = NOW();

-- Drinks 1/3 | Bebidas 1/3
INSERT INTO position_big5_labels (org_id, location_id, position, label_1, label_2, label_3, label_4, label_5)
VALUES 
  ('54b9864f-9df9-4a15-a209-7b99e1c274f4', '67e00fb2-29f5-41ce-9c1c-93e2f7f392dd', 'Drinks 1/3 | Bebidas 1/3',
   'Scoop & Serve', 'Clean & Crisp', 'Lid & Label', 'Slide & Organize', 'Communicate & Team Up'),
  ('54b9864f-9df9-4a15-a209-7b99e1c274f4', 'e437119c-27d9-4114-9273-350925016738', 'Drinks 1/3 | Bebidas 1/3',
   'Scoop & Serve', 'Clean & Crisp', 'Lid & Label', 'Slide & Organize', 'Communicate & Team Up')
ON CONFLICT (org_id, location_id, position) DO UPDATE SET
  label_1 = EXCLUDED.label_1, label_2 = EXCLUDED.label_2, label_3 = EXCLUDED.label_3,
  label_4 = EXCLUDED.label_4, label_5 = EXCLUDED.label_5, updated_at = NOW();

-- Drinks 2 | Bebidas 2
INSERT INTO position_big5_labels (org_id, location_id, position, label_1, label_2, label_3, label_4, label_5)
VALUES 
  ('54b9864f-9df9-4a15-a209-7b99e1c274f4', '67e00fb2-29f5-41ce-9c1c-93e2f7f392dd', 'Drinks 2 | Bebidas 2',
   'Supply & Boost', 'Prep & Pour', 'Dessert & Deliver', 'Clean & Clear', 'Prioritize & Respond'),
  ('54b9864f-9df9-4a15-a209-7b99e1c274f4', 'e437119c-27d9-4114-9273-350925016738', 'Drinks 2 | Bebidas 2',
   'Supply & Boost', 'Prep & Pour', 'Dessert & Deliver', 'Clean & Clear', 'Prioritize & Respond')
ON CONFLICT (org_id, location_id, position) DO UPDATE SET
  label_1 = EXCLUDED.label_1, label_2 = EXCLUDED.label_2, label_3 = EXCLUDED.label_3,
  label_4 = EXCLUDED.label_4, label_5 = EXCLUDED.label_5, updated_at = NOW();

-- 3H Week FOH
INSERT INTO position_big5_labels (org_id, location_id, position, label_1, label_2, label_3, label_4, label_5)
VALUES 
  ('54b9864f-9df9-4a15-a209-7b99e1c274f4', '67e00fb2-29f5-41ce-9c1c-93e2f7f392dd', '3H Week FOH',
   'Hospitality', 'Hustle', 'Humility', 'Attendance & Appearance', 'Recommended to proceed'),
  ('54b9864f-9df9-4a15-a209-7b99e1c274f4', 'e437119c-27d9-4114-9273-350925016738', '3H Week FOH',
   'Hospitality', 'Hustle', 'Humility', 'Attendance & Appearance', 'Recommended to proceed')
ON CONFLICT (org_id, location_id, position) DO UPDATE SET
  label_1 = EXCLUDED.label_1, label_2 = EXCLUDED.label_2, label_3 = EXCLUDED.label_3,
  label_4 = EXCLUDED.label_4, label_5 = EXCLUDED.label_5, updated_at = NOW();

-- ===== BOH POSITIONS =====

-- Breader | Empanizar
INSERT INTO position_big5_labels (org_id, location_id, position, label_1, label_2, label_3, label_4, label_5)
VALUES 
  ('54b9864f-9df9-4a15-a209-7b99e1c274f4', '67e00fb2-29f5-41ce-9c1c-93e2f7f392dd', 'Breader | Empanizar',
   'Drop with Purpose', 'Bread with Precision', 'Load with Discipline', 'Clean as You Go', 'Protect the Zone'),
  ('54b9864f-9df9-4a15-a209-7b99e1c274f4', 'e437119c-27d9-4114-9273-350925016738', 'Breader | Empanizar',
   'Drop with Purpose', 'Bread with Precision', 'Load with Discipline', 'Clean as You Go', 'Protect the Zone')
ON CONFLICT (org_id, location_id, position) DO UPDATE SET
  label_1 = EXCLUDED.label_1, label_2 = EXCLUDED.label_2, label_3 = EXCLUDED.label_3,
  label_4 = EXCLUDED.label_4, label_5 = EXCLUDED.label_5, updated_at = NOW();

-- Secondary | Secundario
INSERT INTO position_big5_labels (org_id, location_id, position, label_1, label_2, label_3, label_4, label_5)
VALUES 
  ('54b9864f-9df9-4a15-a209-7b99e1c274f4', '67e00fb2-29f5-41ce-9c1c-93e2f7f392dd', 'Secondary | Secundario',
   'Assemble with Accuracy', 'Stock & Support the Line', 'Check Quality & Temp Everything', 'Flow & Rotate', 'Protect the Zone'),
  ('54b9864f-9df9-4a15-a209-7b99e1c274f4', 'e437119c-27d9-4114-9273-350925016738', 'Secondary | Secundario',
   'Assemble with Accuracy', 'Stock & Support the Line', 'Check Quality & Temp Everything', 'Flow & Rotate', 'Protect the Zone')
ON CONFLICT (org_id, location_id, position) DO UPDATE SET
  label_1 = EXCLUDED.label_1, label_2 = EXCLUDED.label_2, label_3 = EXCLUDED.label_3,
  label_4 = EXCLUDED.label_4, label_5 = EXCLUDED.label_5, updated_at = NOW();

-- Fries | Papas
INSERT INTO position_big5_labels (org_id, location_id, position, label_1, label_2, label_3, label_4, label_5)
VALUES 
  ('54b9864f-9df9-4a15-a209-7b99e1c274f4', '67e00fb2-29f5-41ce-9c1c-93e2f7f392dd', 'Fries | Papas',
   'Drop with Timing', 'Fry & Finish Right', 'Stage for Quality & Speed', 'Watch & Rotate', 'Protect the Zone'),
  ('54b9864f-9df9-4a15-a209-7b99e1c274f4', 'e437119c-27d9-4114-9273-350925016738', 'Fries | Papas',
   'Drop with Timing', 'Fry & Finish Right', 'Stage for Quality & Speed', 'Watch & Rotate', 'Protect the Zone')
ON CONFLICT (org_id, location_id, position) DO UPDATE SET
  label_1 = EXCLUDED.label_1, label_2 = EXCLUDED.label_2, label_3 = EXCLUDED.label_3,
  label_4 = EXCLUDED.label_4, label_5 = EXCLUDED.label_5, updated_at = NOW();

-- Primary | Primario
INSERT INTO position_big5_labels (org_id, location_id, position, label_1, label_2, label_3, label_4, label_5)
VALUES 
  ('54b9864f-9df9-4a15-a209-7b99e1c274f4', '67e00fb2-29f5-41ce-9c1c-93e2f7f392dd', 'Primary | Primario',
   'Assemble with Accuracy', 'Stock & Support the Line', 'Check Quality & Temp Everything', 'Flow & Rotate', 'Protect the Zone'),
  ('54b9864f-9df9-4a15-a209-7b99e1c274f4', 'e437119c-27d9-4114-9273-350925016738', 'Primary | Primario',
   'Assemble with Accuracy', 'Stock & Support the Line', 'Check Quality & Temp Everything', 'Flow & Rotate', 'Protect the Zone')
ON CONFLICT (org_id, location_id, position) DO UPDATE SET
  label_1 = EXCLUDED.label_1, label_2 = EXCLUDED.label_2, label_3 = EXCLUDED.label_3,
  label_4 = EXCLUDED.label_4, label_5 = EXCLUDED.label_5, updated_at = NOW();

-- Machines | Maquinas
INSERT INTO position_big5_labels (org_id, location_id, position, label_1, label_2, label_3, label_4, label_5)
VALUES 
  ('54b9864f-9df9-4a15-a209-7b99e1c274f4', '67e00fb2-29f5-41ce-9c1c-93e2f7f392dd', 'Machines | Maquinas',
   'Drop with Discipline', 'Set & Secure', 'Watch & Rotate', 'Call the Drops', 'Protect the Zone'),
  ('54b9864f-9df9-4a15-a209-7b99e1c274f4', 'e437119c-27d9-4114-9273-350925016738', 'Machines | Maquinas',
   'Drop with Discipline', 'Set & Secure', 'Watch & Rotate', 'Call the Drops', 'Protect the Zone')
ON CONFLICT (org_id, location_id, position) DO UPDATE SET
  label_1 = EXCLUDED.label_1, label_2 = EXCLUDED.label_2, label_3 = EXCLUDED.label_3,
  label_4 = EXCLUDED.label_4, label_5 = EXCLUDED.label_5, updated_at = NOW();

-- Prep
INSERT INTO position_big5_labels (org_id, location_id, position, label_1, label_2, label_3, label_4, label_5)
VALUES 
  ('54b9864f-9df9-4a15-a209-7b99e1c274f4', '67e00fb2-29f5-41ce-9c1c-93e2f7f392dd', 'Prep',
   'Assemble with Accuracy', 'Stock & Support the Line', 'Check Quality & Temp Everything', 'Flow & Rotate', 'Protect the Zone'),
  ('54b9864f-9df9-4a15-a209-7b99e1c274f4', 'e437119c-27d9-4114-9273-350925016738', 'Prep',
   'Assemble with Accuracy', 'Stock & Support the Line', 'Check Quality & Temp Everything', 'Flow & Rotate', 'Protect the Zone')
ON CONFLICT (org_id, location_id, position) DO UPDATE SET
  label_1 = EXCLUDED.label_1, label_2 = EXCLUDED.label_2, label_3 = EXCLUDED.label_3,
  label_4 = EXCLUDED.label_4, label_5 = EXCLUDED.label_5, updated_at = NOW();

-- 3H Week BOH
INSERT INTO position_big5_labels (org_id, location_id, position, label_1, label_2, label_3, label_4, label_5)
VALUES 
  ('54b9864f-9df9-4a15-a209-7b99e1c274f4', '67e00fb2-29f5-41ce-9c1c-93e2f7f392dd', '3H Week BOH',
   'Hospitality', 'Hustle', 'Humility', 'Attendance & Appearance', 'Recommended to proceed'),
  ('54b9864f-9df9-4a15-a209-7b99e1c274f4', 'e437119c-27d9-4114-9273-350925016738', '3H Week BOH',
   'Hospitality', 'Hustle', 'Humility', 'Attendance & Appearance', 'Recommended to proceed')
ON CONFLICT (org_id, location_id, position) DO UPDATE SET
  label_1 = EXCLUDED.label_1, label_2 = EXCLUDED.label_2, label_3 = EXCLUDED.label_3,
  label_4 = EXCLUDED.label_4, label_5 = EXCLUDED.label_5, updated_at = NOW();

-- ===== TRAINER POSITIONS (shared FOH & BOH) =====

-- Trainer FOH
INSERT INTO position_big5_labels (org_id, location_id, position, label_1, label_2, label_3, label_4, label_5)
VALUES 
  ('54b9864f-9df9-4a15-a209-7b99e1c274f4', '67e00fb2-29f5-41ce-9c1c-93e2f7f392dd', 'Trainer FOH',
   'Engage With Energy', 'Model Excellence', 'Train with Clarity', 'Celebrate & Challenge', 'Grow the Future'),
  ('54b9864f-9df9-4a15-a209-7b99e1c274f4', 'e437119c-27d9-4114-9273-350925016738', 'Trainer FOH',
   'Engage With Energy', 'Model Excellence', 'Train with Clarity', 'Celebrate & Challenge', 'Grow the Future')
ON CONFLICT (org_id, location_id, position) DO UPDATE SET
  label_1 = EXCLUDED.label_1, label_2 = EXCLUDED.label_2, label_3 = EXCLUDED.label_3,
  label_4 = EXCLUDED.label_4, label_5 = EXCLUDED.label_5, updated_at = NOW();

-- Trainer BOH
INSERT INTO position_big5_labels (org_id, location_id, position, label_1, label_2, label_3, label_4, label_5)
VALUES 
  ('54b9864f-9df9-4a15-a209-7b99e1c274f4', '67e00fb2-29f5-41ce-9c1c-93e2f7f392dd', 'Trainer BOH',
   'Engage With Energy', 'Model Excellence', 'Train with Clarity', 'Celebrate & Challenge', 'Grow the Future'),
  ('54b9864f-9df9-4a15-a209-7b99e1c274f4', 'e437119c-27d9-4114-9273-350925016738', 'Trainer BOH',
   'Engage With Energy', 'Model Excellence', 'Train with Clarity', 'Celebrate & Challenge', 'Grow the Future')
ON CONFLICT (org_id, location_id, position) DO UPDATE SET
  label_1 = EXCLUDED.label_1, label_2 = EXCLUDED.label_2, label_3 = EXCLUDED.label_3,
  label_4 = EXCLUDED.label_4, label_5 = EXCLUDED.label_5, updated_at = NOW();

-- ===== TEAM LEAD POSITIONS (shared FOH & BOH) =====

-- FOH Team Lead
INSERT INTO position_big5_labels (org_id, location_id, position, label_1, label_2, label_3, label_4, label_5)
VALUES 
  ('54b9864f-9df9-4a15-a209-7b99e1c274f4', '67e00fb2-29f5-41ce-9c1c-93e2f7f392dd', 'FOH Team Lead',
   'Lead the Zone', 'Engage the team', 'Champion the Guest Experience', 'Hold the Standards', 'Lead Yourself First'),
  ('54b9864f-9df9-4a15-a209-7b99e1c274f4', 'e437119c-27d9-4114-9273-350925016738', 'FOH Team Lead',
   'Lead the Zone', 'Engage the team', 'Champion the Guest Experience', 'Hold the Standards', 'Lead Yourself First')
ON CONFLICT (org_id, location_id, position) DO UPDATE SET
  label_1 = EXCLUDED.label_1, label_2 = EXCLUDED.label_2, label_3 = EXCLUDED.label_3,
  label_4 = EXCLUDED.label_4, label_5 = EXCLUDED.label_5, updated_at = NOW();

-- BOH Team Lead
INSERT INTO position_big5_labels (org_id, location_id, position, label_1, label_2, label_3, label_4, label_5)
VALUES 
  ('54b9864f-9df9-4a15-a209-7b99e1c274f4', '67e00fb2-29f5-41ce-9c1c-93e2f7f392dd', 'BOH Team Lead',
   'Lead the Zone', 'Engage the team', 'Champion the Guest Experience', 'Hold the Standards', 'Lead Yourself First'),
  ('54b9864f-9df9-4a15-a209-7b99e1c274f4', 'e437119c-27d9-4114-9273-350925016738', 'BOH Team Lead',
   'Lead the Zone', 'Engage the team', 'Champion the Guest Experience', 'Hold the Standards', 'Lead Yourself First')
ON CONFLICT (org_id, location_id, position) DO UPDATE SET
  label_1 = EXCLUDED.label_1, label_2 = EXCLUDED.label_2, label_3 = EXCLUDED.label_3,
  label_4 = EXCLUDED.label_4, label_5 = EXCLUDED.label_5, updated_at = NOW();

-- Verify inserts
SELECT position, label_1, label_2, label_3, label_4, label_5
FROM position_big5_labels
WHERE location_id IN ('67e00fb2-29f5-41ce-9c1c-93e2f7f392dd', 'e437119c-27d9-4114-9273-350925016738')
ORDER BY position;

