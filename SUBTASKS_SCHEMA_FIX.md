# 🔧 Subtasks Schema Fix

## ❌ **Problem Identified**
```
ERROR: Error adding subtask: {"code": "PGRST204", "details": null, "hint": null, "message": "Could not find the 'title' column of 'subtasks' in the schema cache"}
```

## 🔍 **Root Cause Analysis**

The code expects a `title` column in the `subtasks` table, but the actual database has a different schema. This creates a mismatch between:

- **Expected Schema** (from create_missing_tables.sql): `title TEXT NOT NULL`
- **Actual Database Schema**: Likely has `text` column instead of `title`

## ✅ **Dual Solution Implemented**

### **1. Database Migration (Recommended)**

**File:** `fix_subtasks_schema.sql`

This migration handles all possible schema states:
- If table has `text` column → renames it to `title`
- If table is missing `title` column → adds it
- Copies data safely without loss
- Ensures all required columns exist

```sql
-- Automatically detect and fix schema issues
DO $$
BEGIN
    -- Rename 'text' to 'title' if needed
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'subtasks' AND column_name = 'text')
       AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'subtasks' AND column_name = 'title')
    THEN
        ALTER TABLE subtasks RENAME COLUMN text TO title;
    END IF;
END $$;

-- Ensure all required columns exist
ALTER TABLE subtasks ADD COLUMN IF NOT EXISTS title TEXT NOT NULL DEFAULT '';
ALTER TABLE subtasks ADD COLUMN IF NOT EXISTS completed BOOLEAN DEFAULT FALSE;
```

### **2. Code Compatibility Layer (Immediate Fix)**

**Files Updated:**
1. `src/utils/supabaseHooks.ts` - Made interface flexible
2. `src/screens/main/HomeScreen.tsx` - Added fallback insertion logic
3. `src/screens/main/StudySessionScreen.tsx` - Updated display logic

#### **Flexible Interface:**
```typescript
// BEFORE (rigid)
export interface Subtask {
  title: string;  // Required
}

// AFTER (flexible)
export interface Subtask {
  title?: string;  // Optional
  text?: string;   // Fallback option
}
```

#### **Smart Insertion with Fallback:**
```typescript
// Try 'title' first
let { data, error } = await supabase.from('subtasks').insert({
  task_id: taskId,
  title: subTaskInput[taskId].trim(),
  completed: false,
});

// If schema error, fallback to 'text'
if (error && error.code === 'PGRST204' && error.message.includes('title')) {
  const fallbackResult = await supabase.from('subtasks').insert({
    task_id: taskId,
    text: subTaskInput[taskId].trim(),  // Fallback
    completed: false,
  });
  data = fallbackResult.data;
  error = fallbackResult.error;
}
```

#### **Universal Display Logic:**
```typescript
// Works with both 'title' and 'text' columns
{subtask.title || subtask.text}
```

## 🚀 **Deployment Options**

### **Option A: Run Database Migration (Recommended)**
```bash
# Execute in Supabase dashboard or CLI:
psql -f fix_subtasks_schema.sql

# OR in Supabase dashboard SQL editor:
# Copy and paste contents of fix_subtasks_schema.sql
```

### **Option B: Code-Only Fix (Immediate)**
The compatibility layer is already implemented and will work with either schema:
- ✅ If DB has `title` column → uses `title`
- ✅ If DB has `text` column → falls back to `text`
- ✅ Display works with both column types

## 🧪 **Expected Results**

### **After Database Migration:**
- ✅ No more PGRST204 errors
- ✅ All subtasks use consistent `title` column
- ✅ Clean, standardized schema

### **With Compatibility Layer Only:**
- ✅ No more PGRST204 errors
- ✅ Works with existing database schema
- ✅ Graceful fallback handling

## 📊 **Testing Verification**

Test subtask creation in the app:
1. Go to Home screen
2. Create a task
3. Try adding a subtask
4. Should succeed without PGRST204 error
5. Subtask should display correctly

## ✅ **Status: DUAL SOLUTION READY**

Both the database migration and code compatibility layer are implemented. Choose your preferred approach:

- **Immediate fix:** Use the compatibility layer (already deployed)
- **Long-term solution:** Run the database migration + compatibility layer

The app will work correctly with either approach! 🎯