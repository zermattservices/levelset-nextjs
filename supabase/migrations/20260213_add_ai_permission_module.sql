-- Add AI Assistant permission module
INSERT INTO permission_modules (key, name, description, display_order, is_active)
VALUES ('ai_assistant', 'AI Assistant', 'Access to Levi AI assistant features', 11, true);

-- Add sub-item for using the AI assistant
INSERT INTO permission_sub_items (module_id, key, name, description, display_order)
SELECT m.id, 'use_ai_assistant', 'Use AI Assistant', 'Access to chat with Levi AI assistant', 1
FROM permission_modules m WHERE m.key = 'ai_assistant';
