# Database Migration Instructions

## Step 1: Run the Focus Sessions Table Migration

You need to execute the SQL migration in your Supabase dashboard:

1. Go to your Supabase project dashboard: https://ucculvnodabrfwbkzsnx.supabase.co
2. Navigate to the **SQL Editor** tab
3. Copy and paste the contents of `create_focus_sessions_table.sql`
4. Click **Run** to execute the migration

## Step 2: Verify the Migration

After running the migration, verify it worked by checking:

1. Go to **Table Editor** in your Supabase dashboard
2. Look for the new `focus_sessions` table
3. Verify the table has the correct columns and structure

## What the Migration Creates:

- ✅ `focus_sessions` table with proper foreign key relationships
- ✅ Indexes for optimal query performance
- ✅ Row Level Security (RLS) policies for data protection
- ✅ Automatic timestamp triggers for `updated_at` field

## Alternative: Use Supabase CLI (Advanced)

If you have the Supabase CLI installed:

```bash
# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref ucculvnodabrfwbkzsnx

# Apply the migration
supabase db push
```

## Current Status:

- ✅ App branding updated with Triage System logo
- ✅ Custom splash screen integrated
- ✅ Database hooks implemented
- ⏳ **NEXT**: Execute the database migration above
- ⏳ **THEN**: Test the complete app flow
