-- Run this in Supabase SQL Editor to add push notifications support

CREATE TABLE IF NOT EXISTS push_subscriptions (
  id           uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  faculty_id   uuid REFERENCES users(id) ON DELETE CASCADE,
  subscription text NOT NULL,
  created_at   timestamptz DEFAULT now(),
  UNIQUE(faculty_id)
);

ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own subscription" ON push_subscriptions FOR ALL USING (true);
