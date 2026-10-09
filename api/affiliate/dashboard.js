const { requireAffiliate, supabaseFetch, json } = require('../_lib/supabase');
const {
  getLevel,
  commissionForOrders,
  reconcileAffiliateOrderCommissions,
  DEFAULT_COMMISSION_CONFIG,
  normalizeConfig,
  LEVEL_ORDER,
  isPaidOrder,
} = require('../_lib/affiliateCommission');
const { sendEmail, adminRecipients, adminVideoEmail, affiliateBoostJoinEmail } = require('../_lib/email');

function money(value) {
  return Math.round((Number(value) || 0) * 100) / 100;
}

function validMonth(value) {
  return /^\d{4}-\d{2}$/.test(String(value || '')) ? String(value) : null;
}

function monthRange(month) {
  const [year, monthNumber] = month.split('-').map(Number);
  // A virada do Bônus Mensal segue o calendário de Brasília: dia 1 às 00:00.
  const start = new Date(`${month}-01T00:00:00-03:00`);
  const nextYear = monthNumber === 12 ? year + 1 : year;
  const nextMonth = monthNumber === 12 ? 1 : monthNumber + 1;
  const end = new Date(`${nextYear}-${String(nextMonth).padStart(2, '0')}-01T00:00:00-03:00`);
  return { start, end };
}

function daysInMonth(month) {
  const [year, monthNumber] = month.split('-').map(Number);
  return new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
}

function monthKeyInSaoPaulo(value) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit' }).formatToParts(date);
  const year = parts.find(part => part.type === 'year')?.value;
  const month = parts.find(part => part.type === 'month')?.value;
  return year && month ? `${year}-${month}` : null;
}

function dayKey(date) {
  return String(date || '').slice(0, 10);
}

function monthLabelForChart(value) {
  const [year, month] = String(value || '').split('-').map(Number);
  if (!year || !month) return String(value || '');
  return new Intl.DateTimeFormat('pt-BR', { month: 'short', year: '2-digit' })
    .format(new Date(Date.UTC(year, month - 1, 1)))
    .replace('.', '');
}


function normalizeCpf(value) {
  return String(value || '').replace(/\D/g, '').slice(0, 11);
}

function isValidCpf(value) {
  const cpf = normalizeCpf(value);
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += Number(cpf[i]) * (10 - i);
  let digit = (sum * 10) % 11;
  if (digit === 10) digit = 0;
  if (digit !== Number(cpf[9])) return false;
  sum = 0;
  for (let i = 0; i < 10; i++) sum += Number(cpf[i]) * (11 - i);
  digit = (sum * 10) % 11;
  if (digit === 10) digit = 0;
  return digit === Number(cpf[10]);
}

function normalizeWhatsapp(value) {
  const digits = String(value || '').replace(/\D/g, '');
  if (!digits) return '';
  if (digits.startsWith('55')) return digits.slice(0, 13);
  return `55${digits}`.slice(0, 13);
}

module.exports = async function handler(req, res) {
  if (req.method === 'POST' && String(req.body?.action || '') === 'update_profile') {
    try {
      const { affiliate } = await requireAffiliate(req);
      const email = String(req.body?.email || '').trim().toLowerCase();
      const cpf = normalizeCpf(req.body?.cpf);
      const whatsapp = normalizeWhatsapp(req.body?.whatsapp);
      const password = String(req.body?.password || '');

      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json(res, 400, { error: 'Informe um e-mail válido.' });
      if (!isValidCpf(cpf)) return json(res, 400, { error: 'Informe um CPF válido.' });
      if (!whatsapp || whatsapp.length < 12) return json(res, 400, { error: 'Informe um WhatsApp válido.' });
      if (password && password.length < 8) return json(res, 400, { error: 'A nova senha precisa ter pelo menos 8 caracteres.' });

      const duplicate = await supabaseFetch(
        `/rest/v1/affiliates?or=(email.eq.${encodeURIComponent(email)},cpf.eq.${encodeURIComponent(cpf)})&id=neq.${Number(affiliate.id)}&select=id,email,cpf&limit=1`
      );
      if (duplicate?.length) {
        if (duplicate[0].cpf === cpf) return json(res, 409, { error: 'Este CPF já está cadastrado.' });
        return json(res, 409, { error: 'Este e-mail já está cadastrado.' });
      }

      const authPatch = { email, email_confirm: true };
      if (password) authPatch.password = password;
      await supabaseFetch(`/auth/v1/admin/users/${encodeURIComponent(affiliate.auth_user_id)}`, {
        method: 'PUT',
        body: JSON.stringify(authPatch),
      });

      const rows = await supabaseFetch(`/rest/v1/affiliates?id=eq.${Number(affiliate.id)}`, {
        method: 'PATCH',
        headers: { Prefer: 'return=representation' },
        body: JSON.stringify({ email, cpf, whatsapp }),
      });

      return json(res, 200, { affiliate: rows?.[0] || { ...affiliate, email, cpf, whatsapp }, passwordChanged: Boolean(password) });
    } catch (error) {
      return json(res, error.statusCode || 500, { error: error.message || 'Não foi possível atualizar seus dados.' });
    }
  }

  if (req.method === 'GET' && String(req.query?.boost || '') === '1') {
    try {
      const { affiliate } = await requireAffiliate(req);
      const settingRows = await supabaseFetch('/rest/v1/affiliate_settings?id=eq.1&select=team_boost_small_price,team_boost_small_connections,team_boost_large_price,team_boost_large_connections,team_boost_max_active&limit=1');
      const s = settingRows?.[0] || {};
      const boosts = await supabaseFetch(`/rest/v1/affiliate_team_boosts?affiliate_id=eq.${Number(affiliate.id)}&status=in.(queued,active)&select=id,price,connections_total,connections_remaining,status,queue_created_at,activated_at&order=id.desc&limit=1`).catch(() => []);
      const queueCount = await supabaseFetch('/rest/v1/affiliate_team_boosts?status=eq.queued&select=id&limit=10000').catch(() => []);
      const activeCount = await supabaseFetch('/rest/v1/affiliate_team_boosts?status=eq.active&select=id&limit=10000').catch(() => []);
      return json(res, 200, {
        plans: [
          { key: 'small', price: Number(s.team_boost_small_price ?? 30), connections: Number(s.team_boost_small_connections ?? 5) },
          { key: 'large', price: Number(s.team_boost_large_price ?? 50), connections: Number(s.team_boost_large_connections ?? 10) },
        ],
        maxActive: Number(s.team_boost_max_active ?? 3),
        activeCount: activeCount.length,
        queueCount: queueCount.length,
        boost: boosts?.[0] || null,
      });
    } catch (error) {
      return json(res, error.statusCode || 500, { error: error.message || 'Erro ao carregar impulsos.' });
    }
  }

  if (req.method === 'POST' && String(req.body?.action || '') === 'boost_find') {
    try {
      const { affiliate } = await requireAffiliate(req);
      if (affiliate.team_parent_id) return json(res, 400, { error: 'Você já está em uma equipe.' });
      const orders = await supabaseFetch(`/rest/v1/affiliate_orders?affiliate_id=eq.${affiliate.id}&select=status&limit=5000`);
      if ((orders || []).some(isPaidOrder)) return json(res, 400, { error: 'Você já fez sua primeira venda e não pode procurar uma equipe.' });
      const result = await supabaseFetch('/rest/v1/rpc/she_team_boost_find', { method: 'POST', body: JSON.stringify({ p_affiliate_id: Number(affiliate.id) }) });
      return json(res, 200, { reservation: result });
    } catch (error) {
      return json(res, error.statusCode || 500, { error: error.message || 'Não foi possível encontrar uma equipe agora.' });
    }
  }

  if (req.method === 'POST' && String(req.body?.action || '') === 'boost_purchase') {
    try {
      const { affiliate } = await requireAffiliate(req);
      const plan = String(req.body?.plan || '');
      const settingRows = await supabaseFetch('/rest/v1/affiliate_settings?id=eq.1&select=team_boost_small_price,team_boost_small_connections,team_boost_large_price,team_boost_large_connections&limit=1');
      const s = settingRows?.[0] || {};
      const selected = plan === 'small'
        ? { price: Number(s.team_boost_small_price ?? 30), connections: Number(s.team_boost_small_connections ?? 5) }
        : plan === 'large'
          ? { price: Number(s.team_boost_large_price ?? 50), connections: Number(s.team_boost_large_connections ?? 10) }
          : null;
      if (!selected) return json(res, 400, { error: 'Plano de impulso inválido.' });
      const settingsRows = await supabaseFetch('/rest/v1/affiliate_settings?id=eq.1&select=ticket_threshold,ticket_bonus,team_commission_per_sale,commission_none,commission_bronze,commission_silver,commission_gold,monthly_bronze_sales,monthly_silver_sales,monthly_gold_sales,fixed_bronze_sales,fixed_silver_sales,fixed_gold_sales&limit=1');
      const row = settingsRows?.[0];
      const settings = normalizeConfig(row ? {
        ticketThreshold: row.ticket_threshold,
        ticketBonus: row.ticket_bonus,
        teamCommissionPerSale: row.team_commission_per_sale,
        commissions: { none: row.commission_none, bronze: row.commission_bronze, silver: row.commission_silver, gold: row.commission_gold },
        monthlyLevels: { bronze: row.monthly_bronze_sales, silver: row.monthly_silver_sales, gold: row.monthly_gold_sales },
        fixedLevels: { bronze: row.fixed_bronze_sales, silver: row.fixed_silver_sales, gold: row.fixed_gold_sales },
      } : DEFAULT_COMMISSION_CONFIG);
      const orders = await supabaseFetch(`/rest/v1/affiliate_orders?affiliate_id=eq.${affiliate.id}&select=status,total,created_at&order=created_at.asc&limit=5000`);
      const earned = commissionForOrders(orders || [], settings, { teamJoinedAt: affiliate.team_joined_at }).total;
      const withdrawals = await supabaseFetch(`/rest/v1/affiliate_withdrawals?affiliate_id=eq.${affiliate.id}&source=eq.personal&status=in.(pending,approved,processing,paid)&select=amount&limit=1000`);
      const baseAvailable = earned - (withdrawals || []).filter(w => !['rejected', 'failed'].includes(String(w.status || ''))).reduce((sum, w) => sum + Number(w.amount || 0), 0);
      const result = await supabaseFetch('/rest/v1/rpc/she_team_boost_purchase', {
        method: 'POST',
        body: JSON.stringify({ p_affiliate_id: Number(affiliate.id), p_price: selected.price, p_connections: selected.connections, p_earned_balance: baseAvailable }),
      });
      return json(res, 201, { boost: result });
    } catch (error) {
      return json(res, error.statusCode || 500, { error: error.message || 'Não foi possível contratar o impulso.' });
    }
  }

  if (req.method === 'POST' && String(req.body?.action || '') === 'boost_leave_queue') {
    try {
      const { affiliate } = await requireAffiliate(req);
      const result = await supabaseFetch('/rest/v1/rpc/she_team_boost_leave_queue', { method: 'POST', body: JSON.stringify({ p_affiliate_id: Number(affiliate.id) }) });
      return json(res, 200, { boost: result });
    } catch (error) {
      return json(res, error.statusCode || 500, { error: error.message || 'Não foi possível sair da fila.' });
    }
  }

  if (req.method === 'POST' && String(req.body?.action || '') === 'boost_confirm') {
    try {
      const { affiliate } = await requireAffiliate(req);
      const reservationId = Number(req.body?.reservationId);
      if (!Number.isInteger(reservationId) || reservationId <= 0) return json(res, 400, { error: 'Indicação de equipe inválida.' });
      const result = await supabaseFetch('/rest/v1/rpc/she_team_boost_confirm', { method: 'POST', body: JSON.stringify({ p_affiliate_id: Number(affiliate.id), p_reservation_id: reservationId }) });
      const parentId = Number(result?.parentId);
      if (parentId > 0) {
        const parents = await supabaseFetch(`/rest/v1/affiliates?id=eq.${parentId}&select=id,name,email,whatsapp&limit=1`).catch(() => []);
        const parent = parents?.[0];
        if (parent?.email) {
          await sendEmail({
            to: parent.email,
            subject: `Nova afiliada entrou na sua equipe — ${affiliate.name}`,
            html: affiliateBoostJoinEmail({ parentName: parent.name, childName: affiliate.name }),
            tags: [{ name: 'category', value: 'team-boost-join' }],
          }).catch(() => null);
        }
      }
      return json(res, 200, { result });
    } catch (error) {
      return json(res, error.statusCode || 500, { error: error.message || 'Não foi possível entrar na equipe.' });
    }
  }
  if (req.method === 'GET' && String(req.query?.videos || '') === '1') {
    try {
      const { affiliate } = await requireAffiliate(req);
      const rows = await supabaseFetch(`/rest/v1/affiliate_video_submissions?affiliate_id=eq.${Number(affiliate.id)}&select=id,video_url,status,note,terms_version,terms_accepted_at,created_at,reviewed_at&order=created_at.desc&limit=100`);
      return json(res, 200, { videos: rows || [], termsVersion: '1.0' });
    } catch (error) {
      return json(res, error.statusCode || 500, { error: error.message || 'Erro ao carregar solicitações de vídeo.' });
    }
  }

  if (req.method === 'POST' && String(req.body?.action || '') === 'submit_video') {
    try {
      const { affiliate } = await requireAffiliate(req);
      const TERMS_VERSION = '1.0';
      const videoUrl = String(req.body?.videoUrl || '').trim();
      const termsAccepted = Boolean(req.body?.termsAccepted);
      const termsVersion = String(req.body?.termsVersion || '');
      if (!videoUrl) return json(res, 400, { error: 'Informe o link do vídeo.' });
      if (videoUrl.length > 2000) return json(res, 400, { error: 'O link do vídeo é muito longo.' });
      try {
        const parsed = new URL(videoUrl);
        if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error('invalid');
      } catch {
        return json(res, 400, { error: 'Informe um link válido começando com http:// ou https://.' });
      }
      if (!termsAccepted || termsVersion !== TERMS_VERSION) {
        return json(res, 400, { error: 'É necessário aceitar os Termos e Condições para enviar o vídeo.' });
      }
      const rows = await supabaseFetch('/rest/v1/affiliate_video_submissions', {
        method: 'POST',
        headers: { Prefer: 'return=representation' },
        body: JSON.stringify({
          affiliate_id: affiliate.id,
          video_url: videoUrl,
          status: 'pending',
          terms_version: TERMS_VERSION,
          terms_accepted_at: new Date().toISOString(),
        }),
      });
      const video = rows?.[0] || null;
      if (video) {
        await sendEmail({
          to: adminRecipients(),
          subject: `Novo vídeo para análise — ${affiliate.name}`,
          html: adminVideoEmail({ name: affiliate.name, id: video.id, url: video.video_url }),
          tags: [{ name: 'category', value: 'video-submission' }],
        }).catch(() => null);
      }
      return json(res, 201, { video });
    } catch (error) {
      return json(res, error.statusCode || 500, { error: error.message || 'Não foi possível enviar o vídeo.' });
    }
  }

  if (req.method === 'POST' && String(req.body?.action || '') === 'create_link') {
    try {
      const { affiliate } = await requireAffiliate(req);
      if (affiliate.slug) return json(res, 400, { error: 'Seu link já foi criado.' });
      const rawSlug = String(req.body?.slug || '').trim();
      const cleanSlug = rawSlug
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .toLowerCase().replace(/[^a-z0-9-]+/g, '-')
        .replace(/^-+|-+$/g, '').slice(0, 40);
      if (!cleanSlug || !/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(cleanSlug)) {
        return json(res, 400, { error: 'Digite um nome válido para o seu link.' });
      }
      const finalSlug = `${cleanSlug}${Number(affiliate.id)}`;
      const existing = await supabaseFetch(`/rest/v1/affiliates?slug=eq.${encodeURIComponent(finalSlug)}&select=id&limit=1`);
      if (existing?.length) return json(res, 409, { error: 'Esse link já está em uso. Escolha outro nome.' });
      const rows = await supabaseFetch(`/rest/v1/affiliates?id=eq.${Number(affiliate.id)}`, {
        method: 'PATCH',
        headers: { Prefer: 'return=representation' },
        body: JSON.stringify({ slug: finalSlug }),
      });
      return json(res, 200, { affiliate: rows?.[0] || { ...affiliate, slug: finalSlug } });
    } catch (error) {
      return json(res, error.statusCode || 500, { error: error.message || 'Não foi possível criar seu link.' });
    }
  }

  if (req.method === 'POST') {
    try {
      const { affiliate } = await requireAffiliate(req);
      const teamParentId = Number(req.body?.teamParentId);
      const teamParentCode = String(req.body?.teamParentCode || '').trim().toUpperCase();
      if ((!Number.isInteger(teamParentId) || teamParentId <= 0) && !/^[A-Z0-9]{6}$/.test(teamParentCode)) return json(res, 400, { error: 'Informe um ID numérico de afiliada válido.' });
      if (affiliate.team_parent_id) return json(res, 400, { error: 'Você já está em uma equipe e não pode alterar de equipe.' });

      const existingOrders = await supabaseFetch(`/rest/v1/affiliate_orders?affiliate_id=eq.${affiliate.id}&select=status&limit=5000`);
      if ((existingOrders || []).some(isPaidOrder)) {
        return json(res, 400, { error: 'A entrada em uma equipe só pode ser feita antes da primeira venda.' });
      }

      const parents = Number.isInteger(teamParentId) && teamParentId > 0
        ? await supabaseFetch(`/rest/v1/affiliates?id=eq.${teamParentId}&select=id,name,active,team_parent_id,team_code,whatsapp&limit=1`)
        : await supabaseFetch(`/rest/v1/affiliates?team_code=eq.${encodeURIComponent(teamParentCode)}&select=id,name,active,team_parent_id,team_code,whatsapp&limit=1`);
      const parent = parents?.[0];
      if (!parent || !parent.active) return json(res, 404, { error: 'Código de equipe não encontrado ou indisponível.' });
      if (Number(parent.id) === Number(affiliate.id)) return json(res, 400, { error: 'Você não pode entrar na própria equipe.' });

      // Impede ciclos na árvore de equipe.
      const allAffiliates = await supabaseFetch('/rest/v1/affiliates?select=id,team_parent_id&limit=20000');
      const parentMap = new Map((allAffiliates || []).map(row => [Number(row.id), row.team_parent_id ? Number(row.team_parent_id) : null]));
      let cursor = Number(parent.id);
      const visited = new Set();
      while (cursor && !visited.has(cursor)) {
        if (cursor === Number(affiliate.id)) return json(res, 400, { error: 'Esse vínculo criaria um ciclo na rede.' });
        visited.add(cursor);
        cursor = parentMap.get(cursor) || null;
      }

      const rows = await supabaseFetch(`/rest/v1/affiliates?id=eq.${Number(affiliate.id)}`, {
        method: 'PATCH',
        headers: { Prefer: 'return=representation' },
        body: JSON.stringify({ team_parent_id: Number(parent.id), team_joined_at: new Date().toISOString(), team_join_source: 'organic' }),
      });
      return json(res, 200, { affiliate: rows?.[0] || { ...affiliate, team_parent_id: Number(parent.id) }, teamParent: parent });
    } catch (error) {
      return json(res, error.statusCode || 500, { error: error.message || 'Não foi possível entrar na equipe.' });
    }
  }

  if (req.method !== 'GET') return json(res, 405, { error: 'Método não permitido.' });

  try {
    const { affiliate } = await requireAffiliate(req);
    const id = affiliate.id;
    const now = new Date();
    const defaultMonth = monthKeyInSaoPaulo(now);
    const requestedMonthRaw = req.query?.month ?? new URL(req.url || '/', 'http://localhost').searchParams.get('month');
    const requestedMonth = String(requestedMonthRaw || 'all') === 'all' ? 'all' : validMonth(requestedMonthRaw) || 'all';
    const { start: startOfCurrentMonth, end: endOfCurrentMonth } = monthRange(defaultMonth);

    const [events, orders, withdrawals, settingRows, boostRows] = await Promise.all([
      supabaseFetch(`/rest/v1/affiliate_events?affiliate_id=eq.${id}&select=type,created_at&order=created_at.desc&limit=10000`),
      supabaseFetch(`/rest/v1/affiliate_orders?affiliate_id=eq.${id}&select=yampi_order_id,status,total,commission,commission_level_snapshot,commission_base_snapshot,team_commission_snapshot,created_at,updated_at&order=created_at.desc&limit=5000`),
      supabaseFetch(`/rest/v1/affiliate_withdrawals?affiliate_id=eq.${id}&select=id,amount,status,pix_key,pix_key_type,source,requested_at,processed_at,note&order=requested_at.desc&limit=500`),
      supabaseFetch('/rest/v1/affiliate_settings?id=eq.1&select=ticket_threshold,ticket_bonus,team_commission_per_sale,commission_none,commission_bronze,commission_silver,commission_gold,monthly_bronze_sales,monthly_silver_sales,monthly_gold_sales,fixed_bronze_sales,fixed_silver_sales,fixed_gold_sales&limit=1'),
      supabaseFetch(`/rest/v1/affiliate_team_boosts?affiliate_id=eq.${id}&select=id,price,connections_total,connections_remaining,status,queue_created_at,activated_at,completed_at,created_at&order=created_at.desc&limit=500`).catch(() => []),
    ]);

    const settings = normalizeConfig(settingRows?.[0] ? {
      ticketThreshold: settingRows[0].ticket_threshold,
      ticketBonus: settingRows[0].ticket_bonus,
      teamCommissionPerSale: settingRows[0].team_commission_per_sale,
      commissions: { none: settingRows[0].commission_none, bronze: settingRows[0].commission_bronze, silver: settingRows[0].commission_silver, gold: settingRows[0].commission_gold },
      monthlyLevels: { bronze: settingRows[0].monthly_bronze_sales, silver: settingRows[0].monthly_silver_sales, gold: settingRows[0].monthly_gold_sales },
      fixedLevels: { bronze: settingRows[0].fixed_bronze_sales, silver: settingRows[0].fixed_silver_sales, gold: settingRows[0].fixed_gold_sales },
    } : DEFAULT_COMMISSION_CONFIG);

    await reconcileAffiliateOrderCommissions(supabaseFetch, id, settings, { teamJoinedAt: affiliate.team_joined_at }).catch((error) => {
      console.error('[She Commission] Falha ao reconciliar comissões:', error);
    });

    // Recarrega os pedidos após a reconciliação para que saldo, comissão e níveis
    // usem exatamente os valores históricos persistidos.
    const reconciledOrders = await supabaseFetch(`/rest/v1/affiliate_orders?affiliate_id=eq.${id}&select=yampi_order_id,status,total,commission,commission_level_snapshot,commission_base_snapshot,team_commission_snapshot,created_at,updated_at&order=created_at.desc&limit=5000`);
    const effectiveOrders = Array.isArray(reconciledOrders) ? reconciledOrders : orders;

    const accessEvents = (events || []).filter((e) => e.type === 'access');
    const joinedMonth = affiliate.team_joined_at ? String(affiliate.team_joined_at).slice(0, 7) : null;
    const currentJoinMonthFloor = joinedMonth ? { [joinedMonth]: 10 } : {};
    let { orders: annotatedPaidOrders, total: totalEarnedCommission, salesByMonth, monthlyStats } = commissionForOrders(effectiveOrders || [], settings, { teamJoinedAt: affiliate.team_joined_at });
    const lifetimeSales = annotatedPaidOrders.length;

    const teamMembers = await supabaseFetch(`/rest/v1/affiliates?team_parent_id=eq.${id}&select=id,name,slug,whatsapp,created_at,team_join_source&order=created_at.asc&limit=1000`);
    const teamParentRows = affiliate.team_parent_id ? await supabaseFetch(`/rest/v1/affiliates?id=eq.${Number(affiliate.team_parent_id)}&select=id,name,slug,whatsapp&limit=1`) : [];
    const teamParent = teamParentRows?.[0] || null;
    const teamIds = (teamMembers || []).map(member => Number(member.id)).filter(Boolean);
    const teamOrders = teamIds.length
      ? await supabaseFetch(`/rest/v1/affiliate_orders?affiliate_id=in.(${teamIds.join(',')})&select=affiliate_id,status,team_commission_snapshot,created_at&order=created_at.asc&limit=20000`)
      : [];
    const teamSalesByMonth = (teamOrders || []).filter(isPaidOrder).reduce((map, order) => {
      const key = monthKeyInSaoPaulo(order.created_at);
      if (key) map[key] = (map[key] || 0) + 1;
      return map;
    }, {});

    let selectedOrders = annotatedPaidOrders;
    const selectedAccesses = accessEvents;
    const selectedWithdrawals = withdrawals || [];
    const selectedSales = selectedOrders.length;
    const currentMonthOrders = annotatedPaidOrders.filter(o => { const date = new Date(o.created_at); return date >= startOfCurrentMonth && date < endOfCurrentMonth; });
    // Comissão do período é sempre histórica/bruta: soma das comissões
    // geradas pelos pedidos pagos dentro do período selecionado.
    // Ela NÃO sofre desconto por saques. O desconto de saques existe apenas
    // em availableCommission, usado exclusivamente no saldo disponível para saque.
    const personalWithdrawals = (withdrawals || []).filter(w => String(w.source || 'personal') === 'personal');
    const teamWithdrawals = (withdrawals || []).filter(w => String(w.source || 'personal') === 'team');
    const reserved = personalWithdrawals.filter(w => !['rejected', 'failed'].includes(String(w.status || ''))).reduce((sum, w) => sum + Number(w.amount || 0), 0);
    const boostSpent = (boostRows || []).filter(row => ['queued', 'active', 'completed'].includes(String(row.status || ''))).reduce((sum, row) => sum + Number(row.price || 0), 0);
    let availableCommission = Math.max(0, totalEarnedCommission - reserved - boostSpent);
    // O nível é mensal. Em "Todos os meses", usamos o mês atual,
    // porque o nível reinicia no primeiro dia de cada mês.

    // Saldo acumulado: o saldo de abertura do mês é o saldo final do mês anterior.
    // Saques pending/approved/paid já reduzem o saldo disponível imediatamente.

    const teamRate = Number(settings.teamCommissionPerSale || 10);
    const levelMonth = defaultMonth;
    const levelMonthRange = monthRange(levelMonth);
    const ownSalesForLevel = annotatedPaidOrders.filter(order => {
      const date = new Date(order.created_at);
      return date >= levelMonthRange.start && date < levelMonthRange.end;
    }).length;
    const teamSalesForLevel = (teamOrders || []).filter(order => {
      if (!isPaidOrder(order)) return false;
      const date = new Date(order.created_at);
      return date >= levelMonthRange.start && date < levelMonthRange.end;
    }).length;
    const levelSales = ownSalesForLevel + teamSalesForLevel;
    const teamBonusStart = affiliate.team_joined_at ? new Date(affiliate.team_joined_at) : null;
    const teamBonusEnd = teamBonusStart && !Number.isNaN(teamBonusStart.getTime())
      ? new Date(teamBonusStart.getTime() + 30 * 24 * 60 * 60 * 1000)
      : null;
    const teamBonusActive = Boolean(teamBonusStart && teamBonusEnd && now >= teamBonusStart && now < teamBonusEnd);

    // O Bônus Fixo é o mestre do piso mensal. O bônus de equipe garante
    // no mínimo Bronze durante os 30 dias. A pontuação mensal começa no
    // limiar do maior piso vigente e soma as vendas reais do mês (próprias + equipe).
    const fixedLevel = getLevel(lifetimeSales, settings, 'fixed');
    const teamBonusLevel = teamBonusActive
      ? getLevel(settings.monthlyLevels.bronze, settings, 'monthly')
      : null;

    const baseCandidates = [fixedLevel.key, teamBonusLevel?.key || 'none'];
    const baseLevelKey = baseCandidates.reduce((best, candidate) =>
      LEVEL_ORDER[candidate] > LEVEL_ORDER[best] ? candidate : best, 'none');
    const basePoints = baseLevelKey === 'gold'
      ? Number(settings.monthlyLevels?.gold || 101)
      : baseLevelKey === 'silver'
        ? Number(settings.monthlyLevels?.silver || 50)
        : baseLevelKey === 'bronze'
          ? Number(settings.monthlyLevels?.bronze || 10)
          : 0;

    const monthlyPoints = basePoints + levelSales;
    const monthlyPerformanceLevel = getLevel(monthlyPoints, settings, 'monthly');
    const currentLevelKey = monthlyPerformanceLevel.key;
    const currentLevel = getLevel(monthlyPoints, settings, 'monthly');

    const nextLevelMap = { bronze: 'Prata', silver: 'Ouro', gold: null, none: 'Bronze' };
    const nextKeyMap = { bronze: 'silver', silver: 'gold', gold: null, none: 'bronze' };
    const nextKey = nextKeyMap[currentLevelKey];
    const nextMin = nextKey
      ? Number(settings.monthlyLevels?.[nextKey] || (nextKey === 'gold' ? 101 : nextKey === 'silver' ? 50 : 10))
      : null;

    // A barra usa as metas configuradas no painel, sem valores fixos 10/50/100.
    // O piso vigente já posiciona a barra no nível correspondente; as vendas
    // reais do mês fazem o preenchimento avançar até a próxima meta.
    const bronzeMin = Number(settings.monthlyLevels?.bronze || 10);
    const silverMin = Number(settings.monthlyLevels?.silver || 50);
    const goldMin = Number(settings.monthlyLevels?.gold || 101);
    const markerPct = { none: 0, bronze: 10, silver: 50, gold: 90 };
    const currentThreshold = currentLevelKey === 'gold' ? goldMin : currentLevelKey === 'silver' ? silverMin : currentLevelKey === 'bronze' ? bronzeMin : 0;
    const previousThreshold = currentLevelKey === 'gold' ? silverMin : currentLevelKey === 'silver' ? bronzeMin : 0;
    const targetPct = currentLevelKey === 'gold' ? 100 : currentLevelKey === 'silver' ? 90 : currentLevelKey === 'bronze' ? 50 : 10;
    const startPct = markerPct[currentLevelKey] ?? 0;
    const barFraction = currentLevelKey === 'gold'
      ? 1
      : Math.min(1, Math.max(0, (monthlyPoints - currentThreshold) / Math.max(1, nextMin - currentThreshold)));
    const levelProgress = startPct + ((targetPct - startPct) * barFraction);

    const monthlyLevel = {
      ...currentLevel,
      key: currentLevelKey,
      label: currentLevelKey === 'gold' ? 'Ouro' : currentLevelKey === 'silver' ? 'Prata' : currentLevelKey === 'bronze' ? 'Bronze' : 'Início',
      // O contador exibido no card mostra apenas as vendas reais do mês.
      // A base do Bônus Fixo/Equipe é usada internamente para definir o piso e a posição na barra.
      sales: levelSales,
      nextLevel: nextLevelMap[currentLevelKey],
      nextMinSales: nextMin,
      salesToNext: nextMin === null ? 0 : Math.max(0, nextMin - monthlyPoints),
      progress: Math.min(100, levelProgress),
    };
    const level = monthlyLevel;

    // O card de níveis é a fonte única da verdade para a comissão pessoal.
    // Depois de determinar o nível exibido (incluindo o Bônus de Equipe),
    // reconciliamos e recalculamos as comissões usando exatamente essa chave.
    await reconcileAffiliateOrderCommissions(
      supabaseFetch,
      id,
      settings,
      { teamJoinedAt: affiliate.team_joined_at, levelKey: currentLevelKey, teamSalesByMonth }
    ).catch((error) => {
      console.error('[She Commission] Falha ao reconciliar pelo nível exibido:', error);
    });

    // Recarrega novamente após a consolidação. Assim, meses encerrados usam
    // o snapshot calculado no fechamento e o saldo não depende de dados antigos
    // que estavam em memória antes da reconciliação.
    const finalizedOrders = await supabaseFetch(`/rest/v1/affiliate_orders?affiliate_id=eq.${id}&select=yampi_order_id,status,total,commission,commission_level_snapshot,commission_base_snapshot,team_commission_snapshot,created_at,updated_at&order=created_at.desc&limit=5000`);
    const finalizedEffectiveOrders = Array.isArray(finalizedOrders) ? finalizedOrders : effectiveOrders;

    const cardCommissionData = commissionForOrders(
      finalizedEffectiveOrders || [],
      settings,
      { teamJoinedAt: affiliate.team_joined_at, levelKey: currentLevelKey, teamSalesByMonth }
    );
    annotatedPaidOrders = cardCommissionData.orders;
    totalEarnedCommission = cardCommissionData.total;
    salesByMonth = cardCommissionData.salesByMonth;
    monthlyStats = cardCommissionData.monthlyStats;
    selectedOrders = annotatedPaidOrders;
    availableCommission = Math.max(0, totalEarnedCommission - reserved - boostSpent);

    const teamSalesByAffiliate = new Map();
    for (const order of teamOrders || []) {
      if (!isPaidOrder(order)) continue;
      const childId = Number(order.affiliate_id);
      teamSalesByAffiliate.set(childId, (teamSalesByAffiliate.get(childId) || 0) + 1);
    }
    const teamEarnedCommission = (teamOrders || [])
      .filter(order => isPaidOrder(order))
      .reduce((sum, order) => {
        const snapshot = Number(order.team_commission_snapshot);
        return sum + (Number.isFinite(snapshot) && snapshot > 0 ? snapshot : teamRate);
      }, 0);
    const teamReserved = teamWithdrawals.filter(w => !['rejected', 'failed'].includes(String(w.status || ''))).reduce((sum, w) => sum + Number(w.amount || 0), 0);
    const teamAvailableCommission = Math.max(0, teamEarnedCommission - teamReserved);
    const team = {
      code: String(affiliate.team_code || ''),
      parent: teamParent ? { id: Number(teamParent.id), name: teamParent.name, slug: teamParent.slug, whatsapp: teamParent.whatsapp || '' } : null,
      joined: Boolean(affiliate.team_parent_id),
      canJoin: !affiliate.team_parent_id && lifetimeSales === 0,
      code: String(affiliate.team_code || ''),
      lifetimeSales,
      sales: Array.from(teamSalesByAffiliate.values()).reduce((sum, sales) => sum + sales, 0),
      commissionPerSale: teamRate,
      earnedCommission: money(teamEarnedCommission),
      reservedWithdrawals: money(teamReserved),
      availableCommission: money(teamAvailableCommission),
      members: (teamMembers || []).map(member => {
        const memberId = Number(member.id);
        const memberOrders = (teamOrders || []).filter(order => Number(order.affiliate_id) === memberId && isPaidOrder(order));
        const sales = memberOrders.length;
        const commission = memberOrders.reduce((sum, order) => {
          const snapshot = Number(order.team_commission_snapshot);
          return sum + (Number.isFinite(snapshot) && snapshot > 0 ? snapshot : teamRate);
        }, 0);
        return { id: memberId, name: member.name, slug: member.slug, whatsapp: member.whatsapp || '', teamJoinSource: member.team_join_source || 'organic', sales, commission: money(commission) };
      }),
    };

    const eventMonths = accessEvents.map(e => monthKeyInSaoPaulo(e.created_at)).filter(Boolean);
    const withdrawalMonths = selectedWithdrawals.map(w => monthKeyInSaoPaulo(w.requested_at)).filter(Boolean);
    const historicalMonths = Array.from(new Set([
      ...Object.keys(salesByMonth),
      ...Object.keys(teamSalesByMonth),
      ...eventMonths,
      ...withdrawalMonths,
      ...(boostRows || []).map(row => monthKeyInSaoPaulo(row.created_at || row.queue_created_at)).filter(Boolean),
      defaultMonth,
    ])).filter(Boolean).sort();

    const monthMap = {};
    for (const month of historicalMonths) {
      monthMap[month] = { date: month, label: monthLabelForChart(month), access: 0, revenue: 0, sales: 0 };
    }
    for (const e of selectedAccesses) {
      const key = monthKeyInSaoPaulo(e.created_at);
      if (!monthMap[key]) monthMap[key] = { date: key, label: monthLabelForChart(key), access: 0, revenue: 0, sales: 0 };
      monthMap[key].access++;
    }
    for (const o of selectedOrders) {
      const key = o.month || monthKeyInSaoPaulo(o.created_at);
      if (!monthMap[key]) monthMap[key] = { date: key, label: monthLabelForChart(key), access: 0, revenue: 0, sales: 0 };
      monthMap[key].revenue += Number(o.total || 0);
      monthMap[key].sales++;
    }
    const chart = Object.values(monthMap).sort((a, b) => a.date.localeCompare(b.date));
    const displayOrders = requestedMonth === 'all'
      ? annotatedPaidOrders
      : annotatedPaidOrders.filter(order => (order.month || monthKeyInSaoPaulo(order.created_at)) === requestedMonth);
    const displayAccesses = requestedMonth === 'all'
      ? accessEvents
      : accessEvents.filter(event => monthKeyInSaoPaulo(event.created_at) === requestedMonth);
    const displayCommission = displayOrders.reduce((sum, order) => sum + Number(order.commission || 0), 0);
    const displayRevenue = displayOrders.reduce((sum, order) => sum + Number(order.total || 0), 0);
    const displaySales = displayOrders.length;
    const displayAverageTicket = displaySales ? displayRevenue / displaySales : 0;
    const displayWithdrawals = personalWithdrawals.filter(withdrawal =>
      !['rejected', 'failed'].includes(String(withdrawal.status || '')) &&
      (requestedMonth === 'all' || monthKeyInSaoPaulo(withdrawal.requested_at) === requestedMonth)
    ).reduce((sum, withdrawal) => sum + Number(withdrawal.amount || 0), 0);
    const displayBoostSpent = (boostRows || []).filter(row =>
      ['queued', 'active', 'completed'].includes(String(row.status || '')) &&
      (requestedMonth === 'all' || monthKeyInSaoPaulo(row.created_at || row.queue_created_at) === requestedMonth)
    ).reduce((sum, row) => sum + Number(row.price || 0), 0);
    // Saldo sacável é sempre acumulado de todo o histórico, independente do filtro mensal.
    // displayCommission/Withdrawals/BoostSpent são apenas indicadores do período selecionado.
    const displayAvailableBalance = availableCommission;
    const isClosedMonthSelected = requestedMonth !== 'all' && requestedMonth !== defaultMonth;
    // O valor exibido para o Bônus de Valor vem da configuração oficial,
    // nunca da diferença commission - commission_base_snapshot. Essa diferença
    // pode conter dados legados/inconsistentes e exibir R$10 quando a configuração
    // atual é R$5. A comissão histórica registrada nos pedidos continua preservada.
    const displayTicketMultiplierActive = displayAverageTicket > settings.ticketThreshold;
    const displayTicketMultiplierValue = Number(settings.ticketBonus ?? 5);
    const displayMonthlyCommissionRates = { ...settings.commissions };
    if (isClosedMonthSelected) {
      for (const key of ['none', 'bronze', 'silver', 'gold']) {
        const values = displayOrders
          .filter(order => String(order.commission_level_snapshot || '').toLowerCase() === key)
          .map(order => Number(order.commission_base_snapshot))
          .filter(value => Number.isFinite(value));
        const counts = values.reduce((map, value) => { const valueKey = value.toFixed(2); map[valueKey] = (map[valueKey] || 0) + 1; return map; }, {});
        const mostCommon = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0];
        if (mostCommon !== undefined) displayMonthlyCommissionRates[key] = Number(mostCommon);
      }
    }
    let displayMonthlyLevel = monthlyLevel;
    if (requestedMonth !== 'all' && requestedMonth !== defaultMonth) {
      const monthlySalesCount = Number(salesByMonth[requestedMonth] || 0);
      const monthlyTeamSalesCount = Number(teamSalesByMonth[requestedMonth] || 0);
      const snapshotLevels = displayOrders.map(order => String(order.commission_level_snapshot || '').toLowerCase()).filter(key => LEVEL_ORDER[key] !== undefined);
      const snapshotLevelKey = snapshotLevels.length
        ? snapshotLevels.sort((a, b) => LEVEL_ORDER[b] - LEVEL_ORDER[a])[0]
        : (cardCommissionData.levelByMonth?.[requestedMonth]?.key || 'none');
      const historicalLevel = getLevel(0, settings, 'monthly');
      const levelKeyForDisplay = snapshotLevelKey;
      const levelLabelForDisplay = levelKeyForDisplay === 'gold' ? 'Ouro' : levelKeyForDisplay === 'silver' ? 'Prata' : levelKeyForDisplay === 'bronze' ? 'Bronze' : 'Início';
      const snapshotBases = displayOrders.filter(order => String(order.commission_level_snapshot || '').toLowerCase() === levelKeyForDisplay).map(order => Number(order.commission_base_snapshot)).filter(value => Number.isFinite(value));
      const baseCounts = snapshotBases.reduce((map, value) => { const key = String(value); map[key] = (map[key] || 0) + 1; return map; }, {});
      const historicalCommissionPerOrder = Object.entries(baseCounts).sort((a, b) => b[1] - a[1])[0]?.[0];
      const monthlyThresholds = settings.monthlyLevels || {};
      const nextMonthly = levelKeyForDisplay === 'none' ? 'bronze' : levelKeyForDisplay === 'bronze' ? 'silver' : levelKeyForDisplay === 'silver' ? 'gold' : null;
      const nextMonthlyMin = nextMonthly ? Number(monthlyThresholds[nextMonthly] || (nextMonthly === 'gold' ? 101 : nextMonthly === 'silver' ? 50 : 10)) : null;
      const levelPoints = monthlySalesCount + monthlyTeamSalesCount;
      displayMonthlyLevel = {
        ...historicalLevel,
        key: levelKeyForDisplay,
        label: levelLabelForDisplay,
        sales: monthlySalesCount + monthlyTeamSalesCount,
        commissionPerOrder: historicalCommissionPerOrder !== undefined ? Number(historicalCommissionPerOrder) : Number(settings.commissions?.[levelKeyForDisplay] || 0),
        progress: levelKeyForDisplay === 'gold' ? 100 : Math.min(100, levelPoints / Math.max(1, nextMonthlyMin || levelPoints || 1) * 100),
        nextLevel: nextMonthly === 'bronze' ? 'Bronze' : nextMonthly === 'silver' ? 'Prata' : nextMonthly === 'gold' ? 'Ouro' : null,
        nextMinSales: nextMonthlyMin,
        salesToNext: nextMonthlyMin === null ? 0 : Math.max(0, nextMonthlyMin - levelPoints),
      };
    }
    return json(res, 200, {
      affiliate,
      settings,
      monthlyCommissionRates: displayMonthlyCommissionRates,
      selectedMonth: requestedMonth,
      isAllMonths: requestedMonth === 'all',
      lifetimeSales,
      team,
      metrics: {
        accesses: displayAccesses.length,
        sales: displaySales,
        revenue: money(displayRevenue),
        averageTicket: money(displayAverageTicket),
        // Comissão segue o filtro mensal; saldo sacável é sempre o acumulado de todos os meses.
        commission: money(displayCommission),
        earnedCommission: money(displayCommission),
        availableCommission: money(displayAvailableBalance),
        reservedWithdrawals: money(displayWithdrawals),
        openingBalance: requestedMonth === 'all' ? 0 : money(Math.max(0, availableCommission - displayAvailableBalance)),
        closingBalance: money(displayAvailableBalance),
        selectedWithdrawals: money(displayWithdrawals),
        ticketMultiplier: money(displayTicketMultiplierActive ? displayTicketMultiplierValue : 0),
        ticketMultiplierActive: displayTicketMultiplierActive,
        ticketMultiplierThreshold: settings.ticketThreshold,
        ticketMultiplierValue: displayTicketMultiplierValue,
        currentMonthPersonalSales: currentMonthOrders.length,
      },
      teamBonus: { active: teamBonusActive, joinedAt: affiliate.team_joined_at || null, expiresAt: teamBonusEnd ? teamBonusEnd.toISOString() : null },
      boost: { purchases: boostRows || [], spent: money(boostSpent) },
      monthlyLevel: {
        key: displayMonthlyLevel.key, label: displayMonthlyLevel.label, sales: displayMonthlyLevel.sales,
        commissionPerOrder: displayMonthlyLevel.commissionPerOrder, progress: displayMonthlyLevel.progress,
        nextLevel: displayMonthlyLevel.nextLevel, nextMinSales: displayMonthlyLevel.nextMinSales, salesToNext: displayMonthlyLevel.salesToNext,
      },
      fixedLevel: {
        key: fixedLevel.key, label: fixedLevel.label, sales: fixedLevel.sales,
        progress: fixedLevel.progress, nextLevel: fixedLevel.nextLevel, nextMinSales: fixedLevel.nextMinSales, salesToNext: fixedLevel.salesToNext,
      },
      level: {
        key: level.key,
        label: level.label,
        sales: level.sales,
        ownSales: selectedSales,
        teamSales: teamSalesForLevel,
        commissionPerOrder: level.commissionPerOrder,
        progress: level.progress,
        nextLevel: level.nextLevel,
        nextMinSales: level.nextMinSales,
        salesToNext: level.salesToNext,
      },
      months: historicalMonths,
      orders: selectedOrders.slice(0, 100),
      withdrawals: selectedWithdrawals,
      movements: [
        ...selectedWithdrawals.map(withdrawal => ({
          id: `withdrawal-${withdrawal.id}`,
          kind: 'withdrawal',
          date: withdrawal.requested_at,
          amount: Number(withdrawal.amount || 0),
          status: withdrawal.status,
          source: withdrawal.source,
          withdrawal,
        })),
        ...(boostRows || []).map(boost => ({
          id: `boost-${boost.id}`,
          kind: 'boost',
          date: boost.created_at || boost.queue_created_at,
          amount: Number(boost.price || 0),
          status: boost.status,
          boost,
        })),
      ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
      monthlyStats,
      chart,
    });
  } catch (error) {
    return json(res, error.statusCode || 500, { error: error.message || 'Erro ao carregar dashboard.' });
  }
};
