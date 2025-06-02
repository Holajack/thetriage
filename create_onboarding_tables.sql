-- Create tables for onboarding data storage

-- First, ensure the onboarding_preferences table has all necessary columns
ALTER TABLE onboarding_preferences ADD COLUMN IF NOT EXISTS focus_method TEXT;
ALTER TABLE onboarding_preferences ADD COLUMN IF NOT EXISTS education_level TEXT;
ALTER TABLE onboarding_preferences ADD COLUMN IF NOT EXISTS university TEXT;
ALTER TABLE onboarding_preferences ADD COLUMN IF NOT EXISTS major TEXT;
ALTER TABLE onboarding_preferences ADD COLUMN IF NOT EXISTS location TEXT;
ALTER TABLE onboarding_preferences ADD COLUMN IF NOT EXISTS timezone TEXT;
ALTER TABLE onboarding_preferences ADD COLUMN IF NOT EXISTS data_collection_consent BOOLEAN DEFAULT false;
ALTER TABLE onboarding_preferences ADD COLUMN IF NOT EXISTS personalized_recommendations BOOLEAN DEFAULT true;
ALTER TABLE onboarding_preferences ADD COLUMN IF NOT EXISTS usage_analytics BOOLEAN DEFAULT true;
ALTER TABLE onboarding_preferences ADD COLUMN IF NOT EXISTS marketing_communications BOOLEAN DEFAULT false;
ALTER TABLE onboarding_preferences ADD COLUMN IF NOT EXISTS profile_visibility TEXT DEFAULT 'friends';
ALTER TABLE onboarding_preferences ADD COLUMN IF NOT EXISTS study_data_sharing BOOLEAN DEFAULT false;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_onboarding_user_id ON onboarding_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_onboarding_complete ON onboarding_preferences(is_onboarding_complete);

-- Create a function to automatically create onboarding record when user signs up
CREATE OR REPLACE FUNCTION create_user_onboarding()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO onboarding_preferences (user_id, is_onboarding_complete)
  VALUES (NEW.id, false);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically create onboarding record
DROP TRIGGER IF EXISTS on_auth_user_created_onboarding ON auth.users;
CREATE TRIGGER on_auth_user_created_onboarding
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION create_user_onboarding();

-- Grant necessary permissions
GRANT ALL ON onboarding_preferences TO authenticated;
GRANT ALL ON onboarding_preferences TO service_role;

-- Row Level Security policies
ALTER TABLE onboarding_preferences ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only access their own onboarding data
CREATE POLICY "Users can access own onboarding data" ON onboarding_preferences
  FOR ALL USING (auth.uid() = user_id);

-- Policy: Service role can access all onboarding data
CREATE POLICY "Service role can access all onboarding data" ON onboarding_preferences
  FOR ALL USING (auth.role() = 'service_role');
