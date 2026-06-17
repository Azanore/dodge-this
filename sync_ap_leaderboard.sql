-- Add AP column to achievements table if not exists
ALTER TABLE achievements ADD COLUMN IF NOT EXISTS ap integer DEFAULT 10;

-- Update AP values to match src/achievements.js
UPDATE achievements SET ap = 10 WHERE key IN ('veteran_1', 'veteran_2', 'survivor_1', 'survivor_2', 'collector_1', 'collector_2', 'ghost_1', 'ghost_2', 'wealthy_1', 'wealthy_2', 'high_score_1', 'first_blood', 'early_departure');
UPDATE achievements SET ap = 25 WHERE key IN ('veteran_3', 'veteran_4', 'survivor_3', 'survivor_4', 'collector_3', 'ghost_3', 'hard_boiled_1', 'hard_boiled_2', 'wealthy_3', 'wealthy_4', 'high_score_2', 'minuteman', 'danger_zone', 'hoarder');
UPDATE achievements SET ap = 50 WHERE key IN ('veteran_5', 'veteran_6', 'survivor_5', 'survivor_6', 'collector_4', 'collector_5', 'ghost_4', 'ghost_5', 'hard_boiled_3', 'hard_boiled_4', 'wealthy_5', 'wealthy_6', 'high_score_3', 'high_score_4', 'untouchable', 'hard_debut', 'pacifist', 'slowmo_junkie', 'shield_master', 'clean_slate', 'tiny_but_mighty', 'near_death');
UPDATE achievements SET ap = 100 WHERE key IN ('veteran_7', 'survivor_7', 'collector_6', 'ghost_6', 'hard_boiled_5', 'wealthy_7', 'high_score_5', 'matrix', 'combo_king', 'jack_of_all_trades');
UPDATE achievements SET ap = 250 WHERE key IN ('veteran_8', 'survivor_8', 'collector_7', 'ghost_7', 'hard_boiled_6', 'wealthy_8', 'high_score_6');
UPDATE achievements SET ap = 500 WHERE key IN ('veteran_9');

-- RPC to get AP leaderboard
CREATE OR REPLACE FUNCTION get_ap_leaderboard()
RETURNS TABLE (
    username text,
    total_ap bigint
) LANGUAGE plpgsql SECURITY DEFINER STABLE AS $$
BEGIN
    RETURN QUERY
    SELECT
        COALESCE(p.username, 'Player') as username,
        SUM(a.ap)::bigint as total_ap
    FROM user_achievements ua
    JOIN achievements a ON ua.achievement_key = a.key
    LEFT JOIN profiles p ON ua.user_id = p.id
    GROUP BY ua.user_id, p.username
    ORDER BY total_ap DESC
    LIMIT 10;
END;
$$;

-- RPC to get player AP rank
CREATE OR REPLACE FUNCTION get_player_ap_rank(p_user_id uuid)
RETURNS bigint LANGUAGE plpgsql SECURITY DEFINER STABLE AS $$
DECLARE
    player_ap bigint;
    player_rank bigint;
BEGIN
    SELECT SUM(a.ap) INTO player_ap
    FROM user_achievements ua
    JOIN achievements a ON ua.achievement_key = a.key
    WHERE ua.user_id = p_user_id;

    IF player_ap IS NULL THEN
        RETURN NULL;
    END IF;

    SELECT COUNT(*) + 1 INTO player_rank
    FROM (
        SELECT SUM(a.ap) as total_ap
        FROM user_achievements ua
        JOIN achievements a ON ua.achievement_key = a.key
        GROUP BY ua.user_id
    ) subt
    WHERE subt.total_ap > player_ap;

    RETURN player_rank;
END;
$$;
