<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/1ubsyyMX8dVGVAl6kefN2Jsqx4RC0VQn_

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## Supabase Database Configuration

### Row Level Security (RLS) Policies

This application uses Supabase Row Level Security to ensure data isolation between users. All tables have RLS enabled with restrictive policies.

#### Prerequisites

The migration automatically handles adding the `user_id` column to the `startups` table if it doesn't exist. However, if you have existing data, you may need to manually assign user IDs:

```sql
-- If you have existing startups without user_id, assign them to a specific user:
UPDATE startups SET user_id = 'your-user-uuid-here' WHERE user_id IS NULL;
```

#### Applying RLS Policies

Run the migration file located at `supabase/migrations/20241201_enable_rls_policies.sql` in your Supabase SQL Editor or via the Supabase CLI.

The migration will:
1. Add `user_id` column to startups table (if not exists)
2. Create indexes for optimized RLS policy performance
3. Enable RLS on all tables
4. Create CRUD policies for each table

#### Tables and Policies Overview

| Table | RLS Enabled | Policy Description |
|-------|-------------|---------------------|
| `startups` | ✅ | Users can only CRUD their own startups (based on `user_id`) |
| `leads` | ✅ | Users can only CRUD leads belonging to their startups |
| `icp_profiles` | ✅ | Users can only CRUD ICP profiles belonging to their startups |
| `activities` | ✅ | Users can only CRUD activities for leads they own |

#### Policy Details

**startups table:**
- SELECT: `user_id = auth.uid()`
- INSERT: `user_id = auth.uid()`
- UPDATE: `user_id = auth.uid()`
- DELETE: `user_id = auth.uid()`

**leads table:**
- All operations check that the `startup_id` references a startup owned by the current user

**icp_profiles table:**
- All operations check that the `startup_id` references a startup owned by the current user

**activities table:**
- All operations check that the `lead_id` references a lead belonging to a startup owned by the current user

#### Testing RLS Policies

To verify that RLS policies are working correctly:

1. Open the Supabase Dashboard
2. Navigate to **Authentication > Users** and note two different user IDs
3. Navigate to **SQL Editor**
4. Run the following test queries:

```sql
-- Test as a specific user (replace with actual user ID)
SET request.jwt.claim.sub = 'user-id-here';

-- Try to select startups - should only show user's own startups
SELECT * FROM startups;

-- Try to select leads - should only show leads from user's startups
SELECT * FROM leads;
```

#### Security Considerations

- All tables require authentication (`TO authenticated`)
- No public/anonymous access is allowed
- Data is isolated at the row level based on user ownership
- Cascade ownership through `startup_id` and `lead_id` relationships
