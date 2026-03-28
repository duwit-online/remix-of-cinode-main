
-- Subscriptions table
CREATE TABLE public.subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_type text NOT NULL CHECK (plan_type IN ('monthly', 'yearly')),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired', 'cancelled')),
  starts_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own subscriptions" ON public.subscriptions FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Admins can manage subscriptions" ON public.subscriptions FOR ALL TO public USING (has_role(auth.uid(), 'admin'));

-- Payment submissions table
CREATE TABLE public.payment_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_type text NOT NULL CHECK (plan_type IN ('monthly', 'yearly')),
  amount numeric NOT NULL,
  proof_image_url text,
  transaction_ref text,
  sender_name text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  admin_notes text,
  reviewed_by uuid,
  reviewed_at timestamptz,
  referral_code text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.payment_submissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own payments" ON public.payment_submissions FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can insert own payments" ON public.payment_submissions FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Admins can manage payments" ON public.payment_submissions FOR ALL TO public USING (has_role(auth.uid(), 'admin'));

-- Affiliates table
CREATE TABLE public.affiliates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  referral_code text NOT NULL UNIQUE,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.affiliates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Affiliates can view own record" ON public.affiliates FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Admins can manage affiliates" ON public.affiliates FOR ALL TO public USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Anyone can validate referral codes" ON public.affiliates FOR SELECT TO public USING (true);

-- Referrals table
CREATE TABLE public.referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id uuid NOT NULL REFERENCES public.affiliates(id) ON DELETE CASCADE,
  referred_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Affiliates can view own referrals" ON public.referrals FOR SELECT TO authenticated USING (affiliate_id IN (SELECT id FROM public.affiliates WHERE user_id = auth.uid()));
CREATE POLICY "Admins can manage referrals" ON public.referrals FOR ALL TO public USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "System can insert referrals" ON public.referrals FOR INSERT TO authenticated WITH CHECK (referred_user_id = auth.uid());

-- Affiliate earnings table
CREATE TABLE public.affiliate_earnings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id uuid NOT NULL REFERENCES public.affiliates(id) ON DELETE CASCADE,
  payment_submission_id uuid NOT NULL REFERENCES public.payment_submissions(id) ON DELETE CASCADE UNIQUE,
  amount numeric NOT NULL DEFAULT 100,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid')),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.affiliate_earnings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Affiliates can view own earnings" ON public.affiliate_earnings FOR SELECT TO authenticated USING (affiliate_id IN (SELECT id FROM public.affiliates WHERE user_id = auth.uid()));
CREATE POLICY "Admins can manage earnings" ON public.affiliate_earnings FOR ALL TO public USING (has_role(auth.uid(), 'admin'));

-- Storage bucket for payment proofs
INSERT INTO storage.buckets (id, name, public) VALUES ('payment-proofs', 'payment-proofs', false);
CREATE POLICY "Users can upload payment proofs" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'payment-proofs' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Users can view own proofs" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'payment-proofs' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Admins can view all proofs" ON storage.objects FOR SELECT TO public USING (bucket_id = 'payment-proofs' AND has_role(auth.uid(), 'admin'));
