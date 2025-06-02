-- Migration script to mark existing users as having completed onboarding
-- This should be run after the create_onboarding_tables.sql migration

-- Create onboarding records for existing users who don't have them
-- and mark them as completed if they have profile data

INSERT INTO onboarding_preferences (
  user_id,
  is_onboarding_complete,
  weekly_focus_goal,
  university,
  major,
  location,
  data_collection_consent,
  personalized_recommendations,
  usage_analytics,
  marketing_communications,
  profile_visibility,
  study_data_sharing,
  created_at,
  updated_at
)
SELECT DISTINCT
  p.id as user_id,
  CASE 
    -- Mark as completed if user has substantial profile data
    WHEN (
      (p.full_name IS NOT NULL AND LENGTH(TRIM(p.full_name)) > 0) OR
      (p.username IS NOT NULL AND LENGTH(TRIM(p.username)) > 0) OR
      (p.university IS NOT NULL AND LENGTH(TRIM(p.university)) > 0) OR
      (p.major IS NOT NULL AND LENGTH(TRIM(p.major)) > 0) OR
      (p.state IS NOT NULL AND LENGTH(TRIM(p.state)) > 0) OR
      (p.business IS NOT NULL AND LENGTH(TRIM(p.business)) > 0) OR
      (p.profession IS NOT NULL AND LENGTH(TRIM(p.profession)) > 0)
    ) THEN true
    ELSE false
  END as is_onboarding_complete,
  5 as weekly_focus_goal, -- Default value
  p.university,
  p.major,
  p.state as location,
  true as data_collection_consent, -- Assume consent for existing users
  true as personalized_recommendations,
  true as usage_analytics,
  false as marketing_communications,
  'friends' as profile_visibility,
  false as study_data_sharing,
  NOW() as created_at,
  NOW() as updated_at
FROM profiles p
LEFT JOIN onboarding_preferences op ON p.id = op.user_id
WHERE op.user_id IS NULL -- Only for users without onboarding records
  AND p.id IS NOT NULL;

-- Add some logging
DO $$
DECLARE
  row_count INTEGER;
BEGIN
  GET DIAGNOSTICS row_count = ROW_COUNT;
  RAISE NOTICE 'Created onboarding records for % existing users', row_count;
END $$;
