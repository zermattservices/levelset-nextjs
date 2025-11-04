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

-- Host
INSERT INTO position_big5_labels (org_id, location_id, position, label_1, label_2, label_3, label_4, label_5)
VALUES 
  ('54b9864f-9df9-4a15-a209-7b99e1c274f4', '67e00fb2-29f5-41ce-9c1c-93e2f7f392dd', 'Host',
   'Smile & Shine', 'Greet & Seat', 'Lead, Offer, Repeat', 'Welcoming Environment & PPG', 'Friendly Farewell'),
  ('54b9864f-9df9-4a15-a209-7b99e1c274f4', 'e437119c-27d9-4114-9273-350925016738', 'Host',
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

-- Bagging
INSERT INTO position_big5_labels (org_id, location_id, position, label_1, label_2, label_3, label_4, label_5)
VALUES 
  ('54b9864f-9df9-4a15-a209-7b99e1c274f4', '67e00fb2-29f5-41ce-9c1c-93e2f7f392dd', 'Bagging',
   'Bump & Bag', 'Pull & Organize', 'Flow & Go', 'Print & Stage', 'Echo Holds'),
  ('54b9864f-9df9-4a15-a209-7b99e1c274f4', 'e437119c-27d9-4114-9273-350925016738', 'Bagging',
   'Bump & Bag', 'Pull & Organize', 'Flow & Go', 'Print & Stage', 'Echo Holds')
ON CONFLICT (org_id, location_id, position) DO UPDATE SET
  label_1 = EXCLUDED.label_1, label_2 = EXCLUDED.label_2, label_3 = EXCLUDED.label_3,
  label_4 = EXCLUDED.label_4, label_5 = EXCLUDED.label_5, updated_at = NOW();

-- Drinks 1/3
INSERT INTO position_big5_labels (org_id, location_id, position, label_1, label_2, label_3, label_4, label_5)
VALUES 
  ('54b9864f-9df9-4a15-a209-7b99e1c274f4', '67e00fb2-29f5-41ce-9c1c-93e2f7f392dd', 'Drinks 1/3',
   'Scoop & Serve', 'Clean & Crisp', 'Lid & Label', 'Slide & Organize', 'Communicate & Team Up'),
  ('54b9864f-9df9-4a15-a209-7b99e1c274f4', 'e437119c-27d9-4114-9273-350925016738', 'Drinks 1/3',
   'Scoop & Serve', 'Clean & Crisp', 'Lid & Label', 'Slide & Organize', 'Communicate & Team Up')
ON CONFLICT (org_id, location_id, position) DO UPDATE SET
  label_1 = EXCLUDED.label_1, label_2 = EXCLUDED.label_2, label_3 = EXCLUDED.label_3,
  label_4 = EXCLUDED.label_4, label_5 = EXCLUDED.label_5, updated_at = NOW();

-- Drinks 2
INSERT INTO position_big5_labels (org_id, location_id, position, label_1, label_2, label_3, label_4, label_5)
VALUES 
  ('54b9864f-9df9-4a15-a209-7b99e1c274f4', '67e00fb2-29f5-41ce-9c1c-93e2f7f392dd', 'Drinks 2',
   'Supply & Boost', 'Prep & Pour', 'Dessert & Deliver', 'Clean & Clear', 'Prioritize & Respond'),
  ('54b9864f-9df9-4a15-a209-7b99e1c274f4', 'e437119c-27d9-4114-9273-350925016738', 'Drinks 2',
   'Supply & Boost', 'Prep & Pour', 'Dessert & Deliver', 'Clean & Clear', 'Prioritize & Respond')
ON CONFLICT (org_id, location_id, position) DO UPDATE SET
  label_1 = EXCLUDED.label_1, label_2 = EXCLUDED.label_2, label_3 = EXCLUDED.label_3,
  label_4 = EXCLUDED.label_4, label_5 = EXCLUDED.label_5, updated_at = NOW();

-- 3H Week FOH (Note: "3H Values" in original becomes "3H Week FOH" in database)
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

-- Breader
INSERT INTO position_big5_labels (org_id, location_id, position, label_1, label_2, label_3, label_4, label_5)
VALUES 
  ('54b9864f-9df9-4a15-a209-7b99e1c274f4', '67e00fb2-29f5-41ce-9c1c-93e2f7f392dd', 'Breader',
   'Drop with Purpose', 'Bread with Precision', 'Load with Discipline', 'Clean as You Go', 'Protect the Zone'),
  ('54b9864f-9df9-4a15-a209-7b99e1c274f4', 'e437119c-27d9-4114-9273-350925016738', 'Breader',
   'Drop with Purpose', 'Bread with Precision', 'Load with Discipline', 'Clean as You Go', 'Protect the Zone')
ON CONFLICT (org_id, location_id, position) DO UPDATE SET
  label_1 = EXCLUDED.label_1, label_2 = EXCLUDED.label_2, label_3 = EXCLUDED.label_3,
  label_4 = EXCLUDED.label_4, label_5 = EXCLUDED.label_5, updated_at = NOW();

-- Secondary
INSERT INTO position_big5_labels (org_id, location_id, position, label_1, label_2, label_3, label_4, label_5)
VALUES 
  ('54b9864f-9df9-4a15-a209-7b99e1c274f4', '67e00fb2-29f5-41ce-9c1c-93e2f7f392dd', 'Secondary',
   'Assemble with Accuracy', 'Stock & Support the Line', 'Check Quality & Temp Everything', 'Flow & Rotate', 'Protect the Zone'),
  ('54b9864f-9df9-4a15-a209-7b99e1c274f4', 'e437119c-27d9-4114-9273-350925016738', 'Secondary',
   'Assemble with Accuracy', 'Stock & Support the Line', 'Check Quality & Temp Everything', 'Flow & Rotate', 'Protect the Zone')
ON CONFLICT (org_id, location_id, position) DO UPDATE SET
  label_1 = EXCLUDED.label_1, label_2 = EXCLUDED.label_2, label_3 = EXCLUDED.label_3,
  label_4 = EXCLUDED.label_4, label_5 = EXCLUDED.label_5, updated_at = NOW();

-- Fries
INSERT INTO position_big5_labels (org_id, location_id, position, label_1, label_2, label_3, label_4, label_5)
VALUES 
  ('54b9864f-9df9-4a15-a209-7b99e1c274f4', '67e00fb2-29f5-41ce-9c1c-93e2f7f392dd', 'Fries',
   'Drop with Timing', 'Fry & Finish Right', 'Stage for Quality & Speed', 'Watch & Rotate', 'Protect the Zone'),
  ('54b9864f-9df9-4a15-a209-7b99e1c274f4', 'e437119c-27d9-4114-9273-350925016738', 'Fries',
   'Drop with Timing', 'Fry & Finish Right', 'Stage for Quality & Speed', 'Watch & Rotate', 'Protect the Zone')
ON CONFLICT (org_id, location_id, position) DO UPDATE SET
  label_1 = EXCLUDED.label_1, label_2 = EXCLUDED.label_2, label_3 = EXCLUDED.label_3,
  label_4 = EXCLUDED.label_4, label_5 = EXCLUDED.label_5, updated_at = NOW();

-- Primary
INSERT INTO position_big5_labels (org_id, location_id, position, label_1, label_2, label_3, label_4, label_5)
VALUES 
  ('54b9864f-9df9-4a15-a209-7b99e1c274f4', '67e00fb2-29f5-41ce-9c1c-93e2f7f392dd', 'Primary',
   'Assemble with Accuracy', 'Stock & Support the Line', 'Check Quality & Temp Everything', 'Flow & Rotate', 'Protect the Zone'),
  ('54b9864f-9df9-4a15-a209-7b99e1c274f4', 'e437119c-27d9-4114-9273-350925016738', 'Primary',
   'Assemble with Accuracy', 'Stock & Support the Line', 'Check Quality & Temp Everything', 'Flow & Rotate', 'Protect the Zone')
ON CONFLICT (org_id, location_id, position) DO UPDATE SET
  label_1 = EXCLUDED.label_1, label_2 = EXCLUDED.label_2, label_3 = EXCLUDED.label_3,
  label_4 = EXCLUDED.label_4, label_5 = EXCLUDED.label_5, updated_at = NOW();

-- Machines
INSERT INTO position_big5_labels (org_id, location_id, position, label_1, label_2, label_3, label_4, label_5)
VALUES 
  ('54b9864f-9df9-4a15-a209-7b99e1c274f4', '67e00fb2-29f5-41ce-9c1c-93e2f7f392dd', 'Machines',
   'Drop with Discipline', 'Set & Secure', 'Watch & Rotate', 'Call the Drops', 'Protect the Zone'),
  ('54b9864f-9df9-4a15-a209-7b99e1c274f4', 'e437119c-27d9-4114-9273-350925016738', 'Machines',
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

-- 3H Week BOH (Note: "3H Values" in original becomes "3H Week BOH" in database)
INSERT INTO position_big5_labels (org_id, location_id, position, label_1, label_2, label_3, label_4, label_5)
VALUES 
  ('54b9864f-9df9-4a15-a209-7b99e1c274f4', '67e00fb2-29f5-41ce-9c1c-93e2f7f392dd', '3H Week BOH',
   'Hospitality', 'Hustle', 'Humility', 'Attendance & Appearance', 'Recommended to proceed'),
  ('54b9864f-9df9-4a15-a209-7b99e1c274f4', 'e437119c-27d9-4114-9273-350925016738', '3H Week BOH',
   'Hospitality', 'Hustle', 'Humility', 'Attendance & Appearance', 'Recommended to proceed')
ON CONFLICT (org_id, location_id, position) DO UPDATE SET
  label_1 = EXCLUDED.label_1, label_2 = EXCLUDED.label_2, label_3 = EXCLUDED.label_3,
  label_4 = EXCLUDED.label_4, label_5 = EXCLUDED.label_5, updated_at = NOW();

-- ===== TRAINER POSITIONS =====

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

-- ===== LEADERSHIP POSITIONS =====

-- Leadership FOH (Note: This is shown in Leadership View, not as a position tab)
INSERT INTO position_big5_labels (org_id, location_id, position, label_1, label_2, label_3, label_4, label_5)
VALUES 
  ('54b9864f-9df9-4a15-a209-7b99e1c274f4', '67e00fb2-29f5-41ce-9c1c-93e2f7f392dd', 'Leadership FOH',
   'Lead the Zone', 'Engage the team', 'Champion the Guest Experience', 'Hold the Standards', 'Lead Yourself First'),
  ('54b9864f-9df9-4a15-a209-7b99e1c274f4', 'e437119c-27d9-4114-9273-350925016738', 'Leadership FOH',
   'Lead the Zone', 'Engage the team', 'Champion the Guest Experience', 'Hold the Standards', 'Lead Yourself First')
ON CONFLICT (org_id, location_id, position) DO UPDATE SET
  label_1 = EXCLUDED.label_1, label_2 = EXCLUDED.label_2, label_3 = EXCLUDED.label_3,
  label_4 = EXCLUDED.label_4, label_5 = EXCLUDED.label_5, updated_at = NOW();

-- Leadership BOH
INSERT INTO position_big5_labels (org_id, location_id, position, label_1, label_2, label_3, label_4, label_5)
VALUES 
  ('54b9864f-9df9-4a15-a209-7b99e1c274f4', '67e00fb2-29f5-41ce-9c1c-93e2f7f392dd', 'Leadership BOH',
   'Lead the Zone', 'Engage the team', 'Champion the Guest Experience', 'Hold the Standards', 'Lead Yourself First'),
  ('54b9864f-9df9-4a15-a209-7b99e1c274f4', 'e437119c-27d9-4114-9273-350925016738', 'Leadership BOH',
   'Lead the Zone', 'Engage the team', 'Champion the Guest Experience', 'Hold the Standards', 'Lead Yourself First')
ON CONFLICT (org_id, location_id, position) DO UPDATE SET
  label_1 = EXCLUDED.label_1, label_2 = EXCLUDED.label_2, label_3 = EXCLUDED.label_3,
  label_4 = EXCLUDED.label_4, label_5 = EXCLUDED.label_5, updated_at = NOW();

-- Verify inserts
SELECT position, label_1, label_2, label_3, label_4, label_5
FROM position_big5_labels
WHERE location_id IN ('67e00fb2-29f5-41ce-9c1c-93e2f7f392dd', 'e437119c-27d9-4114-9273-350925016738')
ORDER BY position;

