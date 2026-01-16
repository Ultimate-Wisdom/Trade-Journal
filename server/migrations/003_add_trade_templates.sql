-- Migration: Add Trade Templates
-- Created: 2026-01-16
-- Description: Add trade_templates table for saving reusable trade setups

CREATE TABLE IF NOT EXISTS trade_templates (
    id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    symbol VARCHAR(20),
    direction VARCHAR(10),
    strategy TEXT,
    setup TEXT,
    risk_percent NUMERIC(10, 2),
    risk_reward_ratio VARCHAR(20),
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_trade_templates_user_id ON trade_templates(user_id);
