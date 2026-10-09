-- Persiste o custo médio por venda configurado no painel administrativo.
ALTER TABLE public.affiliate_settings
  ADD COLUMN IF NOT EXISTS average_sale_cost numeric(12,2) NOT NULL DEFAULT 0.00;
