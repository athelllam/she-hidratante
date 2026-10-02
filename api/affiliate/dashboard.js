const { requireAffiliate, supabaseFetch, json } = require('../_lib/supabase');
const {
  getLevel,
  commissionForOrders,
  DEFAULT_COMMISSION_CONFIG,
  normalizeConfig,
  isPaidOrder,
} = require('../_lib/affiliateCommission');

function money(value) {
  return Math.round((Number(value) || 0) * 100) / 100;
}

function validMonth(value) {
  return /^\d{4}-\d{2}$/.test(String(value || '')) ? String(value) : null;
}

function monthRange(month) {
  const [year, monthNumber] = month.split('-').map(Number);
  const start = new Date(Date.UTC(year, monthNumber - 1, 1));
  const end = new Date(Date.UTC(year, monthNumber, 1));
  return { start, end };
}

function daysInMonth(month) {
  const [year, monthNumber] = month.split('-').map(Number);
  return new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
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

module.exports = async function handler(req, res) {
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
      return json(res, 201, { video: rows?.[0] || null });
    } catch (error) {
      return json(res, error.statusCode || 500, { error: error.message || 'Não foi possível enviar o vídeo.' });
    }
  }

  if (req.method === 'POST') {
    try {
      const { affiliate } = await requireAffiliate(req);
      const teamParentCode = String(req.body?.teamParentCode || '').trim().toUpperCase();
      if (!/^[A-Z0-9]{6}$/.test(teamParentCode)) return json(res, 400, { error: 'Informe um código de equipe válido com 6 caracteres.' });
      if (affiliate.team_parent_id) return json(res, 400, { error: 'Você já está em uma equipe e não pode alterar de equipe.' });

      const existingOrders = await supabaseFetch(`/rest/v1/affiliate_orders?affiliate_id=eq.${affiliate.id}&select=status&limit=5000`);
      if ((existingOrders || []).some(isPaidOrder)) {
        return json(res, 400, { error: 'A entrada em uma equipe só pode ser feita antes da primeira venda.' });
      }

      const parents = await supabaseFetch(`/rest/v1/affiliates?team_code=eq.${encodeURIComponent(teamParentCode)}&select=id,name,active,team_parent_id,team_code&limit=1`);
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
        body: JSON.stringify({ team_parent_id: Number(parent.id), team_joined_at: new Date().toISOString() }),
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
    const defaultMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const requestedMonth = String(req.query?.month || '');
    const isAllMonths = requestedMonth === 'all';
    const selectedMonth = isAllMonths ? 'all' : (validMonth(requestedMonth) || defaultMonth);
    const { start, end } = isAllMonths ? { start: new Date(0), end: new Date(8640000000000000) } : monthRange(selectedMonth);

    const [events, orders, withdrawals, settingRows] = await Promise.all([
      supabaseFetch(`/rest/v1/affiliate_events?affiliate_id=eq.${id}&select=type,created_at&order=created_at.desc&limit=10000`),
      supabaseFetch(`/rest/v1/affiliate_orders?affiliate_id=eq.${id}&select=yampi_order_id,status,total,commission,created_at,updated_at&order=created_at.desc&limit=5000`),
      supabaseFetch(`/rest/v1/affiliate_withdrawals?affiliate_id=eq.${id}&status=in.(pending,approved,paid)&select=id,amount,status,pix_key,source,requested_at,processed_at,note&order=requested_at.desc&limit=500`),
      supabaseFetch('/rest/v1/affiliate_settings?id=eq.1&select=ticket_threshold,ticket_bonus,team_commission_per_sale,commission_none,commission_bronze,commission_silver,commission_gold&limit=1'),
    ]);

    const settings = normalizeConfig(settingRows?.[0] ? {
      ticketThreshold: settingRows[0].ticket_threshold,
      ticketBonus: settingRows[0].ticket_bonus,
      teamCommissionPerSale: settingRows[0].team_commission_per_sale,
      commissions: { none: settingRows[0].commission_none, bronze: settingRows[0].commission_bronze, silver: settingRows[0].commission_silver, gold: settingRows[0].commission_gold },
    } : DEFAULT_COMMISSION_CONFIG);

    const accessEvents = (events || []).filter((e) => e.type === 'access');
    const joinedMonth = affiliate.team_joined_at ? String(affiliate.team_joined_at).slice(0, 7) : null;
    const currentJoinMonthFloor = joinedMonth ? { [joinedMonth]: 10 } : {};
    const { orders: annotatedPaidOrders, total: totalEarnedCommission, salesByMonth, monthlyStats } = commissionForOrders(orders || [], settings, { levelFloorByMonth: currentJoinMonthFloor });
    const lifetimeSales = annotatedPaidOrders.length;

    const selectedOrders = annotatedPaidOrders.filter((o) => {
      const date = new Date(o.created_at);
      return date >= start && date < end;
    });
    const selectedAccesses = accessEvents.filter((e) => {
      const date = new Date(e.created_at);
      return date >= start && date < end;
    });
    const selectedWithdrawals = (withdrawals || []).filter((w) => {
      const date = new Date(w.requested_at);
      return date >= start && date < end;
    });

    const selectedSales = selectedOrders.length;
    const selectedRevenue = selectedOrders.reduce((sum, o) => sum + Number(o.total || 0), 0);
    const selectedAverageTicket = selectedSales ? selectedRevenue / selectedSales : 0;
    const ticketMultiplierActive = !isAllMonths && selectedAverageTicket > settings.ticketThreshold;
    // Comissão do período é sempre histórica/bruta: soma das comissões
    // geradas pelos pedidos pagos dentro do período selecionado.
    // Ela NÃO sofre desconto por saques. O desconto de saques existe apenas
    // em availableCommission, usado exclusivamente no saldo disponível para saque.
    const selectedCommission = selectedOrders.reduce((sum, o) => sum + Number(o.commission || 0), 0);
    const personalWithdrawals = (withdrawals || []).filter(w => String(w.source || 'personal') === 'personal');
    const teamWithdrawals = (withdrawals || []).filter(w => String(w.source || 'personal') === 'team');
    const reserved = personalWithdrawals.reduce((sum, w) => sum + Number(w.amount || 0), 0);
    const availableCommission = Math.max(0, totalEarnedCommission - reserved);
    // O nível é mensal. Em "Todos os meses", usamos o mês atual,
    // porque o nível reinicia no primeiro dia de cada mês.

    // Saldo acumulado: o saldo de abertura do mês é o saldo final do mês anterior.
    // Saques pending/approved/paid já reduzem o saldo disponível imediatamente.
    const selectedWithdrawalsTotal = selectedWithdrawals.filter(w => String(w.source || 'personal') === 'personal').reduce((sum, w) => sum + Number(w.amount || 0), 0);
    const commissionBeforeSelectedMonth = isAllMonths ? 0 : annotatedPaidOrders
      .filter(o => o.month < selectedMonth)
      .reduce((sum, o) => sum + Number(o.commission || 0), 0);
    const withdrawalsBeforeSelectedMonth = isAllMonths ? 0 : personalWithdrawals
      .filter(w => String(w.requested_at || '').slice(0, 7) < selectedMonth)
      .reduce((sum, w) => sum + Number(w.amount || 0), 0);
    const openingBalance = isAllMonths
      ? 0
      : Math.max(0, commissionBeforeSelectedMonth - withdrawalsBeforeSelectedMonth);
    const closingBalance = isAllMonths
      ? availableCommission
      : Math.max(0, openingBalance + selectedCommission - selectedWithdrawalsTotal);

    const teamMembers = await supabaseFetch(`/rest/v1/affiliates?team_parent_id=eq.${id}&select=id,name,slug,whatsapp,created_at&order=created_at.asc&limit=1000`);
    const teamParentRows = affiliate.team_parent_id ? await supabaseFetch(`/rest/v1/affiliates?id=eq.${Number(affiliate.team_parent_id)}&select=id,name,slug&limit=1`) : [];
    const teamParent = teamParentRows?.[0] || null;
    const teamIds = (teamMembers || []).map(member => Number(member.id)).filter(Boolean);
    const teamOrders = teamIds.length
      ? await supabaseFetch(`/rest/v1/affiliate_orders?affiliate_id=in.(${teamIds.join(',')})&select=affiliate_id,status,created_at&order=created_at.asc&limit=20000`)
      : [];
    const teamRate = Number(settings.teamCommissionPerSale || 10);
    const levelMonth = isAllMonths ? defaultMonth : selectedMonth;
    const ownSalesForLevel = isAllMonths
      ? annotatedPaidOrders.filter(order => order.month === levelMonth).length
      : selectedSales;
    const teamSalesForLevel = (teamOrders || []).filter(order => isPaidOrder(order) && String(order.created_at || '').slice(0, 7) === levelMonth).length;
    const levelSales = ownSalesForLevel + teamSalesForLevel;
    const joinedThisLevelMonth = Boolean(joinedMonth && joinedMonth === levelMonth);
    const effectiveLevelSales = joinedThisLevelMonth ? Math.max(10, levelSales) : levelSales;
    const level = getLevel(effectiveLevelSales, settings);
    const teamSalesByAffiliate = new Map();
    for (const order of teamOrders || []) {
      if (!isPaidOrder(order)) continue;
      const childId = Number(order.affiliate_id);
      teamSalesByAffiliate.set(childId, (teamSalesByAffiliate.get(childId) || 0) + 1);
    }
    const teamEarnedCommission = Array.from(teamSalesByAffiliate.values()).reduce((sum, sales) => sum + sales * teamRate, 0);
    const teamReserved = teamWithdrawals.reduce((sum, w) => sum + Number(w.amount || 0), 0);
    const teamAvailableCommission = Math.max(0, teamEarnedCommission - teamReserved);
    const team = {
      code: String(affiliate.team_code || ''),
      parent: teamParent ? { id: Number(teamParent.id), name: teamParent.name, slug: teamParent.slug } : null,
      joined: Boolean(affiliate.team_parent_id),
      canJoin: !affiliate.team_parent_id && lifetimeSales === 0,
      code: String(affiliate.team_code || ''),
      lifetimeSales,
      commissionPerSale: teamRate,
      earnedCommission: money(teamEarnedCommission),
      reservedWithdrawals: money(teamReserved),
      availableCommission: money(teamAvailableCommission),
      members: (teamMembers || []).map(member => {
        const sales = teamSalesByAffiliate.get(Number(member.id)) || 0;
        return { id: Number(member.id), name: member.name, slug: member.slug, whatsapp: member.whatsapp || '', sales, commission: money(sales * teamRate) };
      }),
    };

    const eventMonths = accessEvents.map(e => String(e.created_at).slice(0, 7)).filter(Boolean);
    const withdrawalMonths = (withdrawals || []).map(w => String(w.requested_at).slice(0, 7)).filter(Boolean);
    const historicalMonths = Array.from(new Set([
      ...Object.keys(salesByMonth),
      ...eventMonths,
      ...withdrawalMonths,
      ...(isAllMonths ? [] : [selectedMonth]),
    ])).filter(Boolean).sort();

    let chart;
    if (isAllMonths) {
      const monthMap = {};
      for (const month of historicalMonths) {
        monthMap[month] = { date: month, label: monthLabelForChart(month), access: 0, revenue: 0, sales: 0 };
      }
      for (const e of selectedAccesses) {
        const key = String(e.created_at || '').slice(0, 7);
        if (!monthMap[key]) monthMap[key] = { date: key, label: monthLabelForChart(key), access: 0, revenue: 0, sales: 0 };
        monthMap[key].access++;
      }
      for (const o of selectedOrders) {
        const key = o.month || String(o.created_at || '').slice(0, 7);
        if (!monthMap[key]) monthMap[key] = { date: key, label: monthLabelForChart(key), access: 0, revenue: 0, sales: 0 };
        monthMap[key].revenue += Number(o.total || 0);
        monthMap[key].sales++;
      }
      chart = Object.values(monthMap).sort((a, b) => a.date.localeCompare(b.date));
    } else {
      const days = daysInMonth(selectedMonth);
      const byDay = Array.from({ length: days }, (_, index) => {
        const day = String(index + 1).padStart(2, '0');
        return { date: `${selectedMonth}-${day}`, day: index + 1, access: 0, revenue: 0, sales: 0 };
      });
      const dayMap = Object.fromEntries(byDay.map(item => [item.date, item]));

      for (const e of selectedAccesses) {
        const item = dayMap[dayKey(e.created_at)];
        if (item) item.access++;
      }
      for (const o of selectedOrders) {
        const item = dayMap[dayKey(o.created_at)];
        if (item) {
          item.revenue += Number(o.total || 0);
          item.sales++;
        }
      }
      chart = byDay;
    }

    return json(res, 200, {
      affiliate,
      settings,
      selectedMonth,
      isAllMonths,
      lifetimeSales,
      team,
      metrics: {
        accesses: selectedAccesses.length,
        sales: selectedSales,
        revenue: money(selectedRevenue),
        averageTicket: money(selectedAverageTicket),
        // Comissão histórica do período selecionado. Saques nunca são abatidos aqui.
        commission: money(selectedCommission),
        earnedCommission: money(selectedCommission),
        // Saldo disponível é separado e já considera saques/reservas.
        availableCommission: money(availableCommission),
        reservedWithdrawals: money(reserved),
        openingBalance: money(openingBalance),
        closingBalance: money(closingBalance),
        selectedWithdrawals: money(selectedWithdrawalsTotal),
        ticketMultiplier: money(ticketMultiplierActive ? settings.ticketBonus : 0),
        ticketMultiplierActive,
        ticketMultiplierThreshold: settings.ticketThreshold,
        ticketMultiplierValue: settings.ticketBonus,
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
      monthlyStats,
      chart,
    });
  } catch (error) {
    return json(res, error.statusCode || 500, { error: error.message || 'Erro ao carregar dashboard.' });
  }
};
