-- Create user_inventory table to store purchased items
CREATE TABLE IF NOT EXISTS public.user_inventory (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  item_id TEXT NOT NULL,
  item_name TEXT NOT NULL,
  item_category TEXT NOT NULL CHECK (item_category IN ('gear', 'shelter', 'trail')),
  item_icon TEXT NOT NULL,
  purchased_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, item_id)
);

-- Create equipped_items table to store currently equipped items
CREATE TABLE IF NOT EXISTS public.equipped_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  item_category TEXT NOT NULL CHECK (item_category IN ('gear', 'shelter', 'trail')),
  item_id TEXT NOT NULL,
  item_name TEXT NOT NULL,
  item_icon TEXT NOT NULL,
  equipped_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, item_category)
);

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_user_inventory_user_id ON public.user_inventory(user_id);
CREATE INDEX IF NOT EXISTS idx_user_inventory_category ON public.user_inventory(item_category);
CREATE INDEX IF NOT EXISTS idx_equipped_items_user_id ON public.equipped_items(user_id);

-- Enable Row Level Security
ALTER TABLE public.user_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.equipped_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_inventory
CREATE POLICY "Users can view their own inventory"
  ON public.user_inventory
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert items into their inventory"
  ON public.user_inventory
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete from their inventory"
  ON public.user_inventory
  FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for equipped_items
CREATE POLICY "Users can view their equipped items"
  ON public.equipped_items
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert equipped items"
  ON public.equipped_items
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their equipped items"
  ON public.equipped_items
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their equipped items"
  ON public.equipped_items
  FOR DELETE
  USING (auth.uid() = user_id);

-- Grant necessary permissions
GRANT ALL ON public.user_inventory TO authenticated;
GRANT ALL ON public.equipped_items TO authenticated;
