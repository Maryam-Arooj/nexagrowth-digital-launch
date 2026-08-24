-- Create leads table
CREATE TABLE IF NOT EXISTS public.leads (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    website TEXT,
    goals TEXT NOT NULL
);

-- Create marketing_reports table
CREATE TABLE IF NOT EXISTS public.marketing_reports (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    company_name TEXT NOT NULL,
    business_data JSONB NOT NULL,
    report_data JSONB NOT NULL
);

-- Create orders table
CREATE TABLE IF NOT EXISTS public.orders (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    customer_name TEXT NOT NULL,
    customer_email TEXT NOT NULL,
    company TEXT,
    payment_method TEXT NOT NULL,
    total_amount NUMERIC(10, 2) NOT NULL,
    status TEXT DEFAULT 'pending' NOT NULL
);

-- Create order_items table
CREATE TABLE IF NOT EXISTS public.order_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
    plan_name TEXT NOT NULL,
    price NUMERIC(10, 2) NOT NULL
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketing_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Allow anyone to submit a lead (INSERT)
CREATE POLICY "Allow anonymous lead submission" ON public.leads
    FOR INSERT WITH CHECK (true);

-- Allow anyone to generate and insert a marketing report (INSERT)
CREATE POLICY "Allow anonymous report creation" ON public.marketing_reports
    FOR INSERT WITH CHECK (true);

-- Allow anyone to view reports (for simplicity/sharing)
CREATE POLICY "Allow public report viewing" ON public.marketing_reports
    FOR SELECT USING (true);

-- Allow anyone to place an order (INSERT)
CREATE POLICY "Allow anonymous orders" ON public.orders
    FOR INSERT WITH CHECK (true);

-- Allow anyone to insert order items (INSERT)
CREATE POLICY "Allow anonymous order items" ON public.order_items
    FOR INSERT WITH CHECK (true);
