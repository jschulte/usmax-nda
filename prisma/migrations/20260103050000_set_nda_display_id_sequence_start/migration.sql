-- Ensure NDA display_id sequence continues from legacy system baseline
SELECT setval('ndas_display_id_seq', GREATEST((SELECT COALESCE(MAX(display_id), 1589) FROM ndas), 1589));
