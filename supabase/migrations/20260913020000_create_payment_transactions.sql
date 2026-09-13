-- Migration: Create public.payment_transactions table
-- Tracks payment lifecycle (pending, settlement, expire, deny, cancel, refund)

CREATE TABLE IF NOT EXISTS public.payment_transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  order_id TEXT UNIQUE NOT NULL,
  snap_token TEXT,
  transaction_id TEXT,
  plan_tier TEXT NOT NULL CHECK (plan_tier IN ('pro', 'venue')),
  billing_cycle TEXT NOT NULL CHECK (billing_cycle IN ('monthly', 'yearly')),
  gross_amount NUMERIC NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'settlement', 'capture', 'deny', 'cancel', 'expire', 'refund', 'failure')),
  payment_type TEXT,
  bank TEXT,
  va_number TEXT,
  pdf_url TEXT,
  transaction_time TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  settlement_time TIMESTAMP WITH TIME ZONE,
  expiry_time TIMESTAMP WITH TIME ZONE,
  raw_response JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Indexing for fast queries by user and status
CREATE INDEX IF NOT EXISTS idx_payment_transactions_user_id ON public.payment_transactions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_order_id ON public.payment_transactions(order_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_status ON public.payment_transactions(status);

-- Enable Row Level Security
ALTER TABLE public.payment_transactions ENABLE ROW LEVEL SECURITY;

-- Users can view their own payment transactions
CREATE POLICY "Users can view own payment transactions" ON public.payment_transactions
  FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own initial pending payment transactions
CREATE POLICY "Users can create own payment transactions" ON public.payment_transactions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own payment transactions
CREATE POLICY "Users can update own payment transactions" ON public.payment_transactions
  FOR UPDATE USING (auth.uid() = user_id);

-- Initial record for the existing active yearly Pro subscription of user gafeta.silangit@gmail.com
INSERT INTO public.payment_transactions (
  user_id,
  order_id,
  transaction_id,
  plan_tier,
  billing_cycle,
  gross_amount,
  status,
  payment_type,
  bank,
  transaction_time,
  settlement_time,
  expiry_time
)
SELECT 
  id,
  'KANCA-PRO-MTZ9PON2',
  'e4717914-a28c-4459-a1da-cc9b516fe337',
  'pro',
  'yearly',
  129000,
  'settlement',
  'bank_transfer',
  'bca',
  '2026-09-13 10:42:00+07'::timestamptz,
  '2026-09-13 10:42:15+07'::timestamptz,
  '2026-09-14 10:42:00+07'::timestamptz
FROM public.profiles
WHERE email = 'gafeta.silangit@gmail.com' OR id = 'af853444-a32a-4ae1-a137-cef387269890'
ON CONFLICT (order_id) DO NOTHING;
