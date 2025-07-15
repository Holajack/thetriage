-- Create profiles table and triggers for user sign up
-- This fixes the "Database error saving new user" issue

-- 1. Create profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    email TEXT,
    username TEXT UNIQUE,
    full_name TEXT,
    avatar_url TEXT,
    university TEXT,
    major TEXT,
    status TEXT DEFAULT 'active',
    soundpreference TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create leaderboard_stats table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.leaderboard_stats (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    total_focus_time INTEGER DEFAULT 0,
    level INTEGER DEFAULT 1,
    points INTEGER DEFAULT 0,
    current_streak INTEGER DEFAULT 0,
    longest_streak INTEGER DEFAULT 0,
    sessions_completed INTEGER DEFAULT 0,
    achievements_earned INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id)
);

-- 3. Create function to create user profile on sign up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    -- Create profile
    INSERT INTO public.profiles (id, email, username, full_name)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email)
    );
    
    -- Create leaderboard stats
    INSERT INTO public.leaderboard_stats (user_id)
    VALUES (NEW.id);
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Create trigger for new user sign up
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 5. Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leaderboard_stats ENABLE ROW LEVEL SECURITY;

-- 6. Create RLS policies
CREATE POLICY "Users can view own profile" ON public.profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON public.profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can view all profiles" ON public.profiles
    FOR SELECT USING (true);

CREATE POLICY "Users can view own leaderboard stats" ON public.leaderboard_stats
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own leaderboard stats" ON public.leaderboard_stats
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own leaderboard stats" ON public.leaderboard_stats
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view all leaderboard stats" ON public.leaderboard_stats
    FOR SELECT USING (true);

-- 7. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_profiles_username ON public.profiles(username);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_leaderboard_stats_user_id ON public.leaderboard_stats(user_id);
CREATE INDEX IF NOT EXISTS idx_leaderboard_stats_points ON public.leaderboard_stats(points);

-- 8. Grant necessary permissions
GRANT ALL ON public.profiles TO authenticated;
GRANT ALL ON public.leaderboard_stats TO authenticated;
GRANT ALL ON public.profiles TO service_role;
GRANT ALL ON public.leaderboard_stats TO service_role;

-- 9. Add updated_at trigger for profiles
CREATE TRIGGER update_profiles_updated_at 
    BEFORE UPDATE ON public.profiles 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_leaderboard_stats_updated_at 
    BEFORE UPDATE ON public.leaderboard_stats 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();