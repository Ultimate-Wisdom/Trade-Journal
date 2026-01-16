-- Migration: Add Tags System
-- Created: 2026-01-16
-- Description: Add tags and trade_tags tables for tagging trades

-- Create tags table
CREATE TABLE IF NOT EXISTS tags (
    id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(50) NOT NULL,
    color VARCHAR(7) NOT NULL DEFAULT '#6366f1',
    created_at TIMESTAMP DEFAULT NOW()
);

-- Create trade_tags junction table
CREATE TABLE IF NOT EXISTS trade_tags (
    trade_id VARCHAR(255) NOT NULL REFERENCES trades(id) ON DELETE CASCADE,
    tag_id VARCHAR(255) NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT NOW(),
    PRIMARY KEY (trade_id, tag_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_tags_user_id ON tags(user_id);
CREATE INDEX IF NOT EXISTS idx_trade_tags_trade_id ON trade_tags(trade_id);
CREATE INDEX IF NOT EXISTS idx_trade_tags_tag_id ON trade_tags(tag_id);
