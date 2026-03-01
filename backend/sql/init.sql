CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  address VARCHAR(255) NOT NULL UNIQUE,
  referral_code VARCHAR(32) DEFAULT NULL,
  referral_id INT DEFAULT NULL,
  is_admin TINYINT(1) NOT NULL DEFAULT 0,
  token_balance DECIMAL(24,8) NOT NULL DEFAULT 0,
  MBUSD_balance DECIMAL(24,8) NOT NULL DEFAULT 0,
  datetime TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_users_referral_id (referral_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `transaction` (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT DEFAULT NULL,
  address VARCHAR(255) DEFAULT NULL,
  staking_id INT DEFAULT NULL,
  from_address VARCHAR(255) DEFAULT NULL,
  to_address VARCHAR(255) DEFAULT NULL,
  hash VARCHAR(255) DEFAULT NULL,
  busd_amount DECIMAL(24,8) NOT NULL DEFAULT 0,
  token DECIMAL(24,8) NOT NULL DEFAULT 0,
  transaction_type_id INT NOT NULL DEFAULT 0,
  status TINYINT(1) NOT NULL DEFAULT 0,
  isblockchainConfirm TINYINT(1) NOT NULL DEFAULT 0,
  referred_by INT DEFAULT NULL,
  referral_level INT DEFAULT NULL,
  referral_trx_id INT DEFAULT NULL,
  referral_percent DECIMAL(10,4) DEFAULT NULL,
  datetime TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_transaction_user_id (user_id),
  INDEX idx_transaction_type_confirm (transaction_type_id, isblockchainConfirm),
  INDEX idx_transaction_hash (hash)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS auth_users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL UNIQUE,
  email VARCHAR(255) NOT NULL UNIQUE,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  password_salt VARCHAR(64) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_auth_users_user_id (user_id),
  CONSTRAINT fk_auth_users_user
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
