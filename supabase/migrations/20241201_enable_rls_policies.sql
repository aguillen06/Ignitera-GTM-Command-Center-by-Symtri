-- ============================================================================
-- Supabase Row Level Security (RLS) Policies
-- ============================================================================
-- This migration enables Row Level Security for all application tables.
-- 
-- IMPORTANT: Before running this migration, ensure that the 'startups' table
-- has a 'user_id' column of type UUID that references auth.users(id).
-- If it doesn't exist, uncomment and run the ALTER TABLE statement below.
--
-- Security Model:
-- - startups: Users can only access their own startups (based on user_id)
-- - leads: Users can only access leads belonging to their startups
-- - icp_profiles: Users can only access ICP profiles belonging to their startups
-- - activities: Users can only access activities for leads they own
-- ============================================================================

-- ============================================================================
-- PREREQUISITE: Add user_id column to startups table (if not exists)
-- ============================================================================
-- If your startups table doesn't have a user_id column, run this first:
--
-- ALTER TABLE startups ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);
-- UPDATE startups SET user_id = auth.uid() WHERE user_id IS NULL;
-- ALTER TABLE startups ALTER COLUMN user_id SET NOT NULL;

-- ============================================================================
-- STARTUPS TABLE - RLS Policies
-- ============================================================================

-- Enable RLS on startups table
ALTER TABLE startups ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view only their own startups
CREATE POLICY "Users can view own startups"
ON startups
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Policy: Users can insert startups (will be owned by them)
CREATE POLICY "Users can insert own startups"
ON startups
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- Policy: Users can update only their own startups
CREATE POLICY "Users can update own startups"
ON startups
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Policy: Users can delete only their own startups
CREATE POLICY "Users can delete own startups"
ON startups
FOR DELETE
TO authenticated
USING (user_id = auth.uid());

-- ============================================================================
-- LEADS TABLE - RLS Policies
-- ============================================================================

-- Enable RLS on leads table
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view leads belonging to their startups
CREATE POLICY "Users can view leads of own startups"
ON leads
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM startups
    WHERE startups.id = leads.startup_id
    AND startups.user_id = auth.uid()
  )
);

-- Policy: Users can insert leads to their own startups
CREATE POLICY "Users can insert leads to own startups"
ON leads
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM startups
    WHERE startups.id = leads.startup_id
    AND startups.user_id = auth.uid()
  )
);

-- Policy: Users can update leads of their own startups
CREATE POLICY "Users can update leads of own startups"
ON leads
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM startups
    WHERE startups.id = leads.startup_id
    AND startups.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM startups
    WHERE startups.id = leads.startup_id
    AND startups.user_id = auth.uid()
  )
);

-- Policy: Users can delete leads of their own startups
CREATE POLICY "Users can delete leads of own startups"
ON leads
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM startups
    WHERE startups.id = leads.startup_id
    AND startups.user_id = auth.uid()
  )
);

-- ============================================================================
-- ICP_PROFILES TABLE - RLS Policies
-- ============================================================================

-- Enable RLS on icp_profiles table
ALTER TABLE icp_profiles ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view ICP profiles of their own startups
CREATE POLICY "Users can view icp_profiles of own startups"
ON icp_profiles
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM startups
    WHERE startups.id = icp_profiles.startup_id
    AND startups.user_id = auth.uid()
  )
);

-- Policy: Users can insert ICP profiles to their own startups
CREATE POLICY "Users can insert icp_profiles to own startups"
ON icp_profiles
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM startups
    WHERE startups.id = icp_profiles.startup_id
    AND startups.user_id = auth.uid()
  )
);

-- Policy: Users can update ICP profiles of their own startups
CREATE POLICY "Users can update icp_profiles of own startups"
ON icp_profiles
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM startups
    WHERE startups.id = icp_profiles.startup_id
    AND startups.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM startups
    WHERE startups.id = icp_profiles.startup_id
    AND startups.user_id = auth.uid()
  )
);

-- Policy: Users can delete ICP profiles of their own startups
CREATE POLICY "Users can delete icp_profiles of own startups"
ON icp_profiles
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM startups
    WHERE startups.id = icp_profiles.startup_id
    AND startups.user_id = auth.uid()
  )
);

-- ============================================================================
-- ACTIVITIES TABLE - RLS Policies
-- ============================================================================

-- Enable RLS on activities table
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view activities for leads they own (via startup ownership)
CREATE POLICY "Users can view activities of own leads"
ON activities
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM leads
    JOIN startups ON startups.id = leads.startup_id
    WHERE leads.id = activities.lead_id
    AND startups.user_id = auth.uid()
  )
);

-- Policy: Users can insert activities for leads they own
CREATE POLICY "Users can insert activities to own leads"
ON activities
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM leads
    JOIN startups ON startups.id = leads.startup_id
    WHERE leads.id = activities.lead_id
    AND startups.user_id = auth.uid()
  )
);

-- Policy: Users can update activities of their own leads
CREATE POLICY "Users can update activities of own leads"
ON activities
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM leads
    JOIN startups ON startups.id = leads.startup_id
    WHERE leads.id = activities.lead_id
    AND startups.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM leads
    JOIN startups ON startups.id = leads.startup_id
    WHERE leads.id = activities.lead_id
    AND startups.user_id = auth.uid()
  )
);

-- Policy: Users can delete activities of their own leads
CREATE POLICY "Users can delete activities of own leads"
ON activities
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM leads
    JOIN startups ON startups.id = leads.startup_id
    WHERE leads.id = activities.lead_id
    AND startups.user_id = auth.uid()
  )
);

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
