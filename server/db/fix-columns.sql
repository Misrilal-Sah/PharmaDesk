-- Fix missing columns
ALTER TABLE users ADD COLUMN is_verified BOOLEAN DEFAULT TRUE;
ALTER TABLE medicines ADD COLUMN reorder_level INT DEFAULT 10;

-- Update existing users to be verified
UPDATE users SET is_verified = TRUE WHERE is_verified IS NULL;
UPDATE medicines SET reorder_level = 10 WHERE reorder_level IS NULL;
