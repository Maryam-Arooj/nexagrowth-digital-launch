-- Create generated_content table — stores AI Employee "Next Action" outputs
-- (Google Ads copy, captions, SEO keywords, content calendars, email campaigns, etc.)
-- so users can save, revisit, and re-edit generated marketing assets.
CREATE TABLE IF NOT EXISTS public.generated_content (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    company_name TEXT NOT NULL,
    action_type TEXT NOT NULL,
    label TEXT NOT NULL,
    content TEXT NOT NULL
);

ALTER TABLE public.generated_content ENABLE ROW LEVEL SECURITY;

-- Allow anyone to save generated content (no auth in this app — same anonymous-write
-- pattern already used for leads/marketing_reports/orders).
CREATE POLICY "Allow anonymous generated content creation" ON public.generated_content
    FOR INSERT WITH CHECK (true);

-- Allow reading it back (e.g. a future "saved content" list view).
CREATE POLICY "Allow public generated content viewing" ON public.generated_content
    FOR SELECT USING (true);
