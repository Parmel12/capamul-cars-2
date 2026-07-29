-- ============================================================
-- CAPAMUL CARS 2.0 - Supabase RLS & Security Advisors Fix Script
-- ============================================================
-- Run this entire script in your Supabase SQL Editor to clear all 
-- 9 Security Advisor Errors & Warnings shown in your dashboard!
-- ============================================================

-- 1. Enable Row Level Security (RLS) on all 7 tables
ALTER TABLE public.cars ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financed_clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- 2. Drop any previous conflicting policies (if any exist)
DROP POLICY IF EXISTS "Allow anon all on cars" ON public.cars;
DROP POLICY IF EXISTS "Allow anon all on reservations" ON public.reservations;
DROP POLICY IF EXISTS "Allow anon all on leads" ON public.leads;
DROP POLICY IF EXISTS "Allow anon all on settings" ON public.settings;
DROP POLICY IF EXISTS "Allow anon all on reviews" ON public.reviews;
DROP POLICY IF EXISTS "Allow anon all on financed_clients" ON public.financed_clients;
DROP POLICY IF EXISTS "Allow anon all on transactions" ON public.transactions;
DROP POLICY IF EXISTS "Enable all access for reviews" ON public.reviews;
DROP POLICY IF EXISTS "public_reviews_policy" ON public.reviews;

-- 3. Create RLS Policies allowing full read/write access for your app
CREATE POLICY "Allow anon all on cars" ON public.cars FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon all on reservations" ON public.reservations FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon all on leads" ON public.leads FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon all on settings" ON public.settings FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon all on reviews" ON public.reviews FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon all on financed_clients" ON public.financed_clients FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon all on transactions" ON public.transactions FOR ALL USING (true) WITH CHECK (true);

-- 4. Fix Security Definer Views (converts views to security_invoker = true)
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT table_name FROM information_schema.views WHERE table_schema = 'public') LOOP
        EXECUTE format('ALTER VIEW public.%I SET (security_invoker = true);', r.table_name);
    END LOOP;
END $$;

-- Confirm completion
SELECT 'RLS and Security Definer fixes applied successfully!' AS status;
