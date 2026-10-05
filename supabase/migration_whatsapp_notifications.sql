-- Marca o envio do aviso de saque aprovado para impedir duplicidade.
alter table public.affiliate_withdrawals
  add column if not exists whatsapp_approved_notified_at timestamptz;
