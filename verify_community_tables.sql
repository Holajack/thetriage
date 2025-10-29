-- Verification script for community feature tables
SELECT 'Tables Check:' as check_type;

-- Check if all required tables exist
SELECT
  CASE
    WHEN EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'friends')
    THEN 'friends: ✓ EXISTS'
    ELSE 'friends: ✗ MISSING'
  END as table_status
UNION ALL
SELECT
  CASE
    WHEN EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'friend_requests')
    THEN 'friend_requests: ✓ EXISTS'
    ELSE 'friend_requests: ✗ MISSING'
  END
UNION ALL
SELECT
  CASE
    WHEN EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'messages')
    THEN 'messages: ✓ EXISTS'
    ELSE 'messages: ✗ MISSING'
  END
UNION ALL
SELECT
  CASE
    WHEN EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'study_rooms')
    THEN 'study_rooms: ✓ EXISTS'
    ELSE 'study_rooms: ✗ MISSING'
  END
UNION ALL
SELECT
  CASE
    WHEN EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'study_room_participants')
    THEN 'study_room_participants: ✓ EXISTS'
    ELSE 'study_room_participants: ✗ MISSING'
  END
UNION ALL
SELECT
  CASE
    WHEN EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'study_room_invitations')
    THEN 'study_room_invitations: ✓ EXISTS'
    ELSE 'study_room_invitations: ✗ MISSING'
  END
UNION ALL
SELECT
  CASE
    WHEN EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'study_room_messages')
    THEN 'study_room_messages: ✓ EXISTS'
    ELSE 'study_room_messages: ✗ MISSING'
  END;

SELECT '';
SELECT 'Row Level Security (RLS) Check:' as check_type;

-- Check RLS policies
SELECT
  schemaname,
  tablename,
  CASE WHEN rowsecurity THEN '✓ ENABLED' ELSE '✗ DISABLED' END as rls_status
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('friends', 'friend_requests', 'messages', 'study_rooms', 'study_room_participants', 'study_room_invitations', 'study_room_messages')
ORDER BY tablename;

SELECT '';
SELECT 'Data Count Check:' as check_type;

-- Check data counts
SELECT
  'friends' as table_name,
  COUNT(*) as row_count
FROM public.friends
UNION ALL
SELECT 'friend_requests', COUNT(*) FROM public.friend_requests
UNION ALL
SELECT 'messages', COUNT(*) FROM public.messages
UNION ALL
SELECT 'study_rooms', COUNT(*) FROM public.study_rooms
UNION ALL
SELECT 'study_room_participants', COUNT(*) FROM public.study_room_participants
UNION ALL
SELECT 'study_room_invitations', COUNT(*) FROM public.study_room_invitations
UNION ALL
SELECT 'study_room_messages', COUNT(*) FROM public.study_room_messages
ORDER BY table_name;
