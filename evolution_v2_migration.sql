-- DODGE: EVOLUTION UPDATE MIGRATION
-- Current database schema requirements for the Kinetic Battery system.

-- 1. Extend runs table
ALTER TABLE runs ADD COLUMN IF NOT EXISTS abilities_used INTEGER DEFAULT 0;
ALTER TABLE runs ADD COLUMN IF NOT EXISTS ku_earned INTEGER DEFAULT 0;

-- 2. Update stats aggregation function
CREATE OR REPLACE FUNCTION get_user_stats(p_user_id uuid)
RETURNS TABLE (
  total_runs bigint,
  total_score numeric,
  best_score_easy numeric,
  best_score_normal numeric,
  best_score_hard numeric,
  avg_score_easy numeric,
  avg_score_normal numeric,
  avg_score_hard numeric,
  total_near_misses bigint,
  total_bonuses bigint,
  total_abilities_used bigint,
  total_ku_earned numeric,
  best_combo_score numeric,
  total_elapsed_ms bigint,
  avg_elapsed_ms numeric,
  hard_runs_count bigint,
  deaths_ball bigint,
  deaths_bullet bigint,
  deaths_shard bigint,
  deaths_tracker bigint
) LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::bigint as total_runs,
    SUM(score)::numeric as total_score,
    MAX(CASE WHEN difficulty = 'easy' THEN score ELSE 0 END)::numeric as best_score_easy,
    MAX(CASE WHEN difficulty = 'normal' THEN score ELSE 0 END)::numeric as best_score_normal,
    MAX(CASE WHEN difficulty = 'hard' THEN score ELSE 0 END)::numeric as best_score_hard,
    AVG(CASE WHEN difficulty = 'easy' THEN score ELSE NULL END)::numeric as avg_score_easy,
    AVG(CASE WHEN difficulty = 'normal' THEN score ELSE NULL END)::numeric as avg_score_normal,
    AVG(CASE WHEN difficulty = 'hard' THEN score ELSE NULL END)::numeric as avg_score_hard,
    SUM(near_misses)::bigint as total_near_misses,
    SUM(bonuses_collected)::bigint as total_bonuses,
    SUM(abilities_used)::bigint as total_abilities_used,
    SUM(ku_earned)::numeric as total_ku_earned,
    MAX(combo_score)::numeric as best_combo_score,
    SUM(elapsed_ms)::bigint as total_elapsed_ms,
    AVG(elapsed_ms)::numeric as avg_elapsed_ms,
    COUNT(*) FILTER (WHERE difficulty = 'hard')::bigint as hard_runs_count,
    COUNT(*) FILTER (WHERE death_cause = 'ball')::bigint as deaths_ball,
    COUNT(*) FILTER (WHERE death_cause = 'bullet')::bigint as deaths_bullet,
    COUNT(*) FILTER (WHERE death_cause = 'shard')::bigint as deaths_shard,
    COUNT(*) FILTER (WHERE death_cause = 'tracker')::bigint as deaths_tracker
  FROM runs
  WHERE user_id = p_user_id;
END;
$$;

-- 3. Seed new achievements (Safe for repeated execution)
INSERT INTO achievements (key, name, description) VALUES
('battery_powered', 'Battery Powered', 'Use 10 abilities in one run'),
('overcharged', 'Overcharged', 'Stay at 100% battery for 30s'),
('skill_issue', 'Skill Issue', 'Use all 3 abilities in 5 seconds')
ON CONFLICT (key) DO NOTHING;
