-- Notificação de saque aprovado por e-mail.
-- Mantém um marcador separado das migrations legadas de WhatsApp para evitar que
-- um envio antigo de WhatsApp impeça o primeiro envio de e-mail.
alter table public.affiliate_withdrawals
  add column if not exists email_approved_notified_at timestamptz;

create index if not exists affiliate_withdrawals_email_approved_notified_idx
  on public.affiliate_withdrawals(email_approved_notified_at);
