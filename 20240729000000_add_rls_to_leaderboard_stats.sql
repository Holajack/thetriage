-- Enable Row Level Security for the leaderboard_stats table if not already enabled
ALTER TABLE public.leaderboard_stats ENABLE ROW LEVEL SECURITY;

-- Policies for leaderboard_stats table

-- Allow authenticated users to insert their own leaderboard stats
CREATE POLICY "Enable insert for authenticated users own data"
ON public.leaderboard_stats
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Allow authenticated users to read their own leaderboard stats
CREATE POLICY "Enable read access for own data"
ON public.leaderboard_stats
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Allow authenticated users to update their own leaderboard stats
CREATE POLICY "Enable update for own data"
ON public.leaderboard_stats
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Allow authenticated users to delete their own leaderboard stats
CREATE POLICY "Enable delete for own data"
ON public.leaderboard_stats
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);
