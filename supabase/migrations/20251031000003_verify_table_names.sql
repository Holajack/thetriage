-- Verify table names and create view if needed
DO $$
BEGIN
  -- Check if we have study_room (singular) or study_rooms (plural)
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'study_rooms') THEN
    RAISE NOTICE 'Table study_rooms (plural) exists';
    
    -- Ensure is_active column exists
    IF NOT EXISTS (
      SELECT FROM information_schema.columns 
      WHERE table_name = 'study_rooms' AND column_name = 'is_active'
    ) THEN
      ALTER TABLE public.study_rooms ADD COLUMN is_active BOOLEAN DEFAULT true;
      RAISE NOTICE 'Added is_active column to study_rooms';
    ELSE
      RAISE NOTICE 'is_active column already exists in study_rooms';
    END IF;
  END IF;
  
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'study_room') THEN
    RAISE NOTICE 'Table study_room (singular) exists - this might be the issue';
  END IF;
END $$;

-- Force multiple cache reload attempts
DO $$
DECLARE
  i INTEGER;
BEGIN
  FOR i IN 1..5 LOOP
    PERFORM pg_notify('pgrst', 'reload schema');
    PERFORM pg_sleep(0.1);
  END LOOP;
END $$;
