-- User Shortcuts table for MySQL
-- Stores customized keyboard shortcuts per user

CREATE TABLE IF NOT EXISTS user_shortcuts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  shortcut_id VARCHAR(50) NOT NULL,
  modifier_keys VARCHAR(50) NOT NULL DEFAULT 'Alt',
  key_code VARCHAR(20) NOT NULL,
  is_enabled BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY unique_user_shortcut (user_id, shortcut_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Create index for faster queries
CREATE INDEX idx_user_shortcuts_user_id ON user_shortcuts(user_id);
