-- Player Reports table
CREATE TABLE IF NOT EXISTS player_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reported_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(reporter_id, reported_id)
);

-- Add reports_count to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS reports_count INTEGER NOT NULL DEFAULT 0;

-- RLS for player_reports
ALTER TABLE player_reports ENABLE ROW LEVEL SECURITY;

-- Users can insert their own reports (reporter_id must match auth.uid)
CREATE POLICY "Users can insert own reports"
  ON player_reports FOR INSERT
  WITH CHECK (reporter_id = auth.uid());

-- Users can read their own reports (to check if already reported)
CREATE POLICY "Users can read own reports"
  ON player_reports FOR SELECT
  USING (reporter_id = auth.uid());

-- Function to increment reports_count on the reported profile
CREATE OR REPLACE FUNCTION increment_reports_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE profiles SET reports_count = reports_count + 1 WHERE id = NEW.reported_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_player_report_insert
  AFTER INSERT ON player_reports
  FOR EACH ROW
  EXECUTE FUNCTION increment_reports_count();
