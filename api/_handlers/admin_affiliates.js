const { requireAdmin, supabaseFetch } = require('../_lib/admin');
const { commissionForOrders, reconcileAffiliateOrderCommissions, isPaidOrder, DEFAULT_COMMISSION_CONFIG, normalizeConfig } = require('../_lib/affiliateCommission');

function json(res, status, body) { res.status(status).json(body); }
function money(value) { return Math.round((Number(value) || 0) * 100) / 100; }

module.exports = async function handler(req, res) {
  try {
    await requireAdmin(req);

    if (req.method === 'GET' && String(req.query?.videos || '') === '1') {
      const rows = await supabaseFetch('/rest/v1/affiliate_video_submissions?select=id,affiliate_id,video_url,status,note,terms_version,terms_accepted_at,created_at,reviewed_at,affiliates(id,name,slug,email,cpf,whatsapp)&order=created_at.desc&limit=1000');
      return json(res, 200, { videos: rows || [] });
    }

    if (req.method === 'GET') {
      const [affiliates, orders, withdrawals, events, statusHistory, settingRows, boostState, boostRows] = await Promise.all([
        supabaseFetch('/rest/v1/affiliates?select=id,slug,name,email,cpf,whatsapp,pix_key,pix_key_type,active,admin_active,commission_rate,created_at,team_parent_id&order=created_at.desc'),
        supabaseFetch('/rest/v1/affiliate_orders?select=affiliate_id,status,total,commission,commission_level_snapshot,commission_base_snapshot,team_commission_snapshot,created_at&order=created_at.desc&limit=20000'),
        supabaseFetch('/rest/v1/affiliate_withdrawals?select=affiliate_id,amount,status,source,requested_at&order=requested_at.desc&limit=10000'),
        supabaseFetch('/rest/v1/affiliate_events?select=affiliate_id,type,created_at&order=created_at.desc&limit=20000'),
        supabaseFetch('/rest/v1/affiliate_admin_status_history?select=affiliate_id,admin_active,effective_at&order=effective_at.asc&limit=20000').catch(() => []),
        supabaseFetch('/rest/v1/affiliate_settings?id=eq.1&select=ticket_threshold,ticket_bonus,team_commission_per_sale,commission_none,commission_bronze,commission_silver,commission_gold,monthly_bronze_sales,monthly_silver_sales,monthly_gold_sales,fixed_bronze_sales,fixed_silver_sales,fixed_gold_sales,team_boost_small_price,team_boost_small_connections,team_boost_large_price,team_boost_large_connections,team_boost_max_active,reseller_hydrant_price,reseller_hydrant_blister_price,reseller_stick_price,reseller_complete_price,average_sale_cost&limit=1'),
        supabaseFetch('/rest/v1/rpc/she_team_boost_admin_state', { method: 'POST', body: '{}' }).catch(() => ({ activeCount: 0, queueCount: 0, completedCount: 0, active: [] })),
        supabaseFetch('/rest/v1/affiliate_team_boosts?status=neq.cancelled&select=affiliate_id,price&limit=20000').catch(() => []),
      ]);

      const settings = normalizeConfig(settingRows?.[0] ? {
        ticketThreshold: settingRows[0].ticket_threshold,
        ticketBonus: settingRows[0].ticket_bonus,
        teamCommissionPerSale: Number(settingRows[0].team_commission_per_sale) > 0 ? Number(settingRows[0].team_commission_per_sale) : DEFAULT_COMMISSION_CONFIG.teamCommissionPerSale,
        commissions: {
          none: Number(settingRows[0].commission_none) > 0 ? Number(settingRows[0].commission_none) : DEFAULT_COMMISSION_CONFIG.commissions.none,
          bronze: Number(settingRows[0].commission_bronze) > 0 ? Number(settingRows[0].commission_bronze) : DEFAULT_COMMISSION_CONFIG.commissions.bronze,
          silver: Number(settingRows[0].commission_silver) > 0 ? Number(settingRows[0].commission_silver) : DEFAULT_COMMISSION_CONFIG.commissions.silver,
          gold: Number(settingRows[0].commission_gold) > 0 ? Number(settingRows[0].commission_gold) : DEFAULT_COMMISSION_CONFIG.commissions.gold,
        },
        monthlyLevels: { bronze: settingRows[0].monthly_bronze_sales, silver: settingRows[0].monthly_silver_sales, gold: settingRows[0].monthly_gold_sales },
        fixedLevels: { bronze: settingRows[0].fixed_bronze_sales, silver: settingRows[0].fixed_silver_sales, gold: settingRows[0].fixed_gold_sales },
        boostPlans: {
          small: { price: Number(settingRows[0].team_boost_small_price ?? 30), connections: Number(settingRows[0].team_boost_small_connections ?? 5) },
          large: { price: Number(settingRows[0].team_boost_large_price ?? 50), connections: Number(settingRows[0].team_boost_large_connections ?? 10) },
          maxActive: Number(settingRows[0].team_boost_max_active ?? 3),
        },
      } : DEFAULT_COMMISSION_CONFIG);
      settings.boostPlans = settingRows?.[0] ? {
        small: { price: Number(settingRows[0].team_boost_small_price ?? 30), connections: Number(settingRows[0].team_boost_small_connections ?? 5) },
        large: { price: Number(settingRows[0].team_boost_large_price ?? 50), connections: Number(settingRows[0].team_boost_large_connections ?? 10) },
        maxActive: Number(settingRows[0].team_boost_max_active ?? 3),
      } : { small: { price: 30, connections: 5 }, large: { price: 50, connections: 10 }, maxActive: 3 };
      settings.resellerPrices = { hydrant: Number(settingRows?.[0]?.reseller_hydrant_price ?? 0), hydrantBlister: Number(settingRows?.[0]?.reseller_hydrant_blister_price ?? 0), stick: Number(settingRows?.[0]?.reseller_stick_price ?? 0), complete: Number(settingRows?.[0]?.reseller_complete_price ?? 0) };
      settings.averageSaleCost = Number(settingRows?.[0]?.average_sale_cost ?? 0);

      const detailAffiliateId = Number(req.query?.detail || 0);
      const detailMonth = String(req.query?.month || 'all');

      const ordersByAffiliate = new Map();
      for (const order of orders || []) {
        const id = Number(order.affiliate_id);
        if (!ordersByAffiliate.has(id)) ordersByAffiliate.set(id, []);
        ordersByAffiliate.get(id).push(order);
      }

      const cutoff = Date.now() - (7 * 24 * 60 * 60 * 1000);
      const staleAffiliateIds = [];

      for (const affiliate of affiliates || []) {
        const affiliateOrders = ordersByAffiliate.get(Number(affiliate.id)) || [];
        const paidOrders = affiliateOrders.filter(isPaidOrder);
        const lastSaleAt = paidOrders.reduce((latest, order) => {
          const value = order.created_at ? new Date(order.created_at).getTime() : 0;
          return value > latest ? value : latest;
        }, 0);
        if (Boolean(affiliate.admin_active) && lastSaleAt > 0 && lastSaleAt < cutoff) {
          staleAffiliateIds.push(Number(affiliate.id));
        }
      }

      if (staleAffiliateIds.length) {
        await Promise.all(staleAffiliateIds.map(id =>
          supabaseFetch(`/rest/v1/affiliates?id=eq.${id}`, {
            method: 'PATCH',
            body: JSON.stringify({ admin_active: false }),
          }).catch(() => null)
        ));
        for (const affiliate of affiliates || []) {
          if (staleAffiliateIds.includes(Number(affiliate.id))) affiliate.admin_active = false;
        }
        await Promise.all(staleAffiliateIds.map(id =>
          supabaseFetch('/rest/v1/affiliate_admin_status_history', {
            method: 'POST',
            headers: { Prefer: 'return=minimal' },
            body: JSON.stringify({ affiliate_id: id, admin_active: false }),
          }).catch(() => null)
        ));
      }

      const accessesByAffiliate = new Map();
      for (const event of events || []) {
        if (event.type !== 'access') continue;
        const id = Number(event.affiliate_id);
        accessesByAffiliate.set(id, (accessesByAffiliate.get(id) || 0) + 1);
      }

      const stats = new Map();
      for (const affiliate of affiliates || []) {
        const affiliateOrders = ordersByAffiliate.get(Number(affiliate.id)) || [];
        const paidOrders = affiliateOrders.filter(isPaidOrder);
        const lastSaleAt = paidOrders.reduce((latest, order) => {
          const value = order.created_at ? new Date(order.created_at).getTime() : 0;
          return value > latest ? value : latest;
        }, 0);
        const commissionData = commissionForOrders(affiliateOrders, settings);
        const revenue = paidOrders.reduce((sum, order) => sum + Number(order.total || 0), 0);
        stats.set(Number(affiliate.id), {
          sales: paidOrders.length,
          revenue,
          commission: commissionData.total,
          withdrawals: 0,
          accesses: accessesByAffiliate.get(Number(affiliate.id)) || 0,
          lastSaleAt: lastSaleAt ? new Date(lastSaleAt).toISOString() : null,
          autoInactive: lastSaleAt > 0 && lastSaleAt < cutoff,
        });
      }

      for (const withdrawal of withdrawals || []) {
        const id = Number(withdrawal.affiliate_id);
        const bucket = stats.get(id);
        if (!bucket) continue;
        if (String(withdrawal.source || 'personal') === 'personal' && ['pending', 'approved', 'paid'].includes(String(withdrawal.status || '').toLowerCase())) {
          bucket.withdrawals += Number(withdrawal.amount || 0);
        }
      }

      const boostSpentByAffiliate = new Map();
      for (const boost of boostRows || []) {
        const aid = Number(boost.affiliate_id);
        boostSpentByAffiliate.set(aid, (boostSpentByAffiliate.get(aid) || 0) + Number(boost.price || 0));
      }

      // Saldo de equipe: soma das comissões de equipe registradas nos pedidos
      // das afiliadas ligadas a cada líder, menos saques de equipe já reservados/pagos.
      const affiliateByIdForTeam = new Map((affiliates || []).map(item => [Number(item.id), item]));
      const teamEarnedByParent = new Map();
      for (const order of orders || []) {
        if (!isPaidOrder(order)) continue;
        const seller = affiliateByIdForTeam.get(Number(order.affiliate_id));
        const parentId = Number(seller?.team_parent_id || 0);
        if (!parentId) continue;
        const amount = Number(order.team_commission_snapshot || 0);
        if (Number.isFinite(amount)) teamEarnedByParent.set(parentId, (teamEarnedByParent.get(parentId) || 0) + amount);
      }
      const teamWithdrawnByParent = new Map();
      for (const withdrawal of withdrawals || []) {
        if (String(withdrawal.source || 'personal') !== 'team') continue;
        if (!['pending', 'approved', 'processing', 'paid'].includes(String(withdrawal.status || '').toLowerCase())) continue;
        const aid = Number(withdrawal.affiliate_id);
        teamWithdrawnByParent.set(aid, (teamWithdrawnByParent.get(aid) || 0) + Number(withdrawal.amount || 0));
      }

      const result = (affiliates || []).map(affiliate => {
        const bucket = stats.get(Number(affiliate.id)) || { sales: 0, revenue: 0, commission: 0, withdrawals: 0 };
        const personalBalance = Math.max(0, bucket.commission - bucket.withdrawals - (boostSpentByAffiliate.get(Number(affiliate.id)) || 0));
        const teamBalance = Math.max(0, (teamEarnedByParent.get(Number(affiliate.id)) || 0) - (teamWithdrawnByParent.get(Number(affiliate.id)) || 0));
        return {
          ...affiliate,
          sales: bucket.sales,
          revenue: money(bucket.revenue),
          averageTicket: money(bucket.sales ? bucket.revenue / bucket.sales : 0),
          earnedCommission: money(bucket.commission),
          accesses: Number(bucket.accesses || 0),
          balance: money(personalBalance),
          teamBalance: money(teamBalance),
          totalBalance: money(personalBalance + teamBalance),
          adminActive: Boolean(affiliate.admin_active),
          lastSaleAt: bucket.lastSaleAt,
          daysWithoutSales: bucket.lastSaleAt
            ? Math.max(0, Math.floor((Date.now() - new Date(bucket.lastSaleAt).getTime()) / (24 * 60 * 60 * 1000)))
            : Math.max(0, Math.floor((Date.now() - new Date(affiliate.created_at).getTime()) / (24 * 60 * 60 * 1000))),
          autoInactive: Boolean(bucket.autoInactive),
        };
      });

      const monthlyMap = new Map();
      const ensureMonthlyBucket = (month) => {
        const bucket = monthlyMap.get(month) || { sales: 0, revenue: 0, accesses: 0, personalCommission: 0, teamCommission: 0 };
        monthlyMap.set(month, bucket);
        return bucket;
      };
      for (const event of events || []) {
        if (event.type !== 'access' || !event.created_at) continue;
        const date = new Date(event.created_at);
        if (Number.isNaN(date.getTime())) continue;
        const month = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
        ensureMonthlyBucket(month).accesses += 1;
      }
      const affiliateById = new Map((affiliates || []).map(affiliate => [Number(affiliate.id), affiliate]));
      let totalPersonalCommission = 0;
      let totalTeamCommission = 0;
      // Os indicadores globais de comissão devem refletir os valores persistidos
      // na tabela affiliate_orders, e não uma recomputação que pode divergir dos
      // snapshots históricos dos pedidos.
      for (const order of orders || []) {
        if (!order.created_at) continue;
        const date = new Date(order.created_at);
        if (Number.isNaN(date.getTime())) continue;
        const month = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
        const bucket = ensureMonthlyBucket(month);
        const paid = isPaidOrder(order);
        if (paid) {
          bucket.sales += 1;
          bucket.revenue += Number(order.total || 0);
        }

        // Comissão Total deve somar os valores efetivamente gravados no banco,
        // sem depender do filtro de status usado para contar vendas/faturamento.
        const savedPersonalCommission = Number(order.commission);
        const personalCommission = Number.isFinite(savedPersonalCommission) ? savedPersonalCommission : 0;
        bucket.personalCommission += personalCommission;
        totalPersonalCommission += personalCommission;

        const seller = affiliateById.get(Number(order.affiliate_id));
        if (seller && Number(seller.team_parent_id) > 0) {
          const savedTeamCommission = Number(order.team_commission_snapshot);
          const teamCommission = Number.isFinite(savedTeamCommission) ? savedTeamCommission : 0;
          bucket.teamCommission += teamCommission;
          totalTeamCommission += teamCommission;
        }
      }
      const monthlyStats = Object.fromEntries(Array.from(monthlyMap.entries()).map(([month, value]) => [month, {
        sales: value.sales,
        revenue: money(value.revenue),
        accesses: value.accesses || 0,
        averageTicket: money(value.sales ? value.revenue / value.sales : 0),
        personalCommission: money(value.personalCommission || 0),
        teamCommission: money(value.teamCommission || 0),
      }]));
      const globalAll = Object.values(monthlyStats).reduce((acc, value) => ({
        sales: acc.sales + value.sales,
        revenue: acc.revenue + value.revenue,
        accesses: acc.accesses + Number(value.accesses || 0),
        personalCommission: acc.personalCommission + Number(value.personalCommission || 0),
        teamCommission: acc.teamCommission + Number(value.teamCommission || 0),
      }), { sales: 0, revenue: 0, accesses: 0, personalCommission: 0, teamCommission: 0 });
      // Use the commission calculation for every affiliate as the source of truth for personal commission.
      globalAll.personalCommission = money(totalPersonalCommission);
      globalAll.teamCommission = money(totalTeamCommission);
      globalAll.totalCommission = money(globalAll.personalCommission + globalAll.teamCommission);
      globalAll.averageCommissionPerSale = money(globalAll.sales ? globalAll.totalCommission / globalAll.sales : 0);
      globalAll.averageTicket = money(globalAll.sales ? globalAll.revenue / globalAll.sales : 0);

      // Snapshots históricos: vendas/faturamento/ticket do período e estado das afiliadas
      // no fechamento do último dia de cada mês.
      const historyByAffiliate = new Map();
      for (const row of statusHistory || []) {
        const id = Number(row.affiliate_id);
        if (!historyByAffiliate.has(id)) historyByAffiliate.set(id, []);
        historyByAffiliate.get(id).push(row);
      }

      const paidOrders = (orders || []).filter(isPaidOrder).filter(order => order.created_at && !Number.isNaN(new Date(order.created_at).getTime()));
      const monthsForSnapshot = Array.from(new Set([
        ...Object.keys(monthlyStats),
        ...((affiliates || []).map(a => { const d = new Date(a.created_at); return Number.isNaN(d.getTime()) ? null : `${d.getUTCFullYear()}-${String(d.getUTCMonth()+1).padStart(2,'0')}` }).filter(Boolean)),
      ])).sort();

      function endOfMonthExclusive(month) {
        const [year, monthNumber] = String(month).split('-').map(Number);
        return new Date(Date.UTC(year, monthNumber, 1));
      }

      function activeAtEnd(affiliate, endExclusive) {
        const history = historyByAffiliate.get(Number(affiliate.id)) || [];
        let latestHistory = null;
        for (const row of history) {
          const t = new Date(row.effective_at).getTime();
          if (Number.isNaN(t) || t >= endExclusive.getTime()) continue;
          if (!latestHistory || t > new Date(latestHistory.effective_at).getTime()) latestHistory = row;
        }
        if (latestHistory) return Boolean(latestHistory.admin_active);

        // Compatibilidade para meses anteriores à criação do histórico: usa a regra
        // automática vigente (nova afiliada sem venda continua ativa).
        const created = new Date(affiliate.created_at).getTime();
        if (Number.isNaN(created) || created >= endExclusive.getTime()) return null;
        const cutoff = endExclusive.getTime() - (7 * 24 * 60 * 60 * 1000);
        let lastSale = 0;
        for (const order of paidOrders) {
          if (Number(order.affiliate_id) !== Number(affiliate.id)) continue;
          const t = new Date(order.created_at).getTime();
          if (t < endExclusive.getTime() && t > lastSale) lastSale = t;
        }
        if (!lastSale) return true;
        return lastSale >= cutoff;
      }

      const historicalStats = {};
      for (const month of monthsForSnapshot) {
        const endExclusive = endOfMonthExclusive(month);
        const monthOrders = paidOrders.filter(order => new Date(order.created_at).getTime() < endExclusive.getTime());
        const monthSales = paidOrders.filter(order => {
          const t = new Date(order.created_at).getTime();
          return t >= new Date(`${month}-01T00:00:00.000Z`).getTime() && t < endExclusive.getTime();
        });
        const monthRevenue = monthSales.reduce((sum, order) => sum + Number(order.total || 0), 0);

        let affiliateCount = 0;
        let activeCount = 0;
        let inactiveCount = 0;
        let balance = 0;
        const now = new Date();
        const currentMonth = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
        const isCurrentMonth = month === currentMonth;

        for (const affiliate of affiliates || []) {
          const created = new Date(affiliate.created_at).getTime();
          if (Number.isNaN(created) || created >= endExclusive.getTime()) continue;
          affiliateCount += 1;

          // Para o mês corrente não existe um "último dia do mês" ainda.
          // O card deve refletir o estado atual, sem projetar o status até o fim do mês.
          const activeAt = isCurrentMonth
            ? Boolean(affiliate.admin_active)
            : activeAtEnd(affiliate, endExclusive);
          if (activeAt === true) activeCount += 1;
          else if (activeAt === false) inactiveCount += 1;

          const affiliateOrdersUntilEnd = monthOrders.filter(order => Number(order.affiliate_id) === Number(affiliate.id));
          const commissionUntilEnd = commissionForOrders(affiliateOrdersUntilEnd, settings).total;
          const withdrawalsUntilEnd = (withdrawals || []).filter(w => String(w.source || 'personal') === 'personal' && Number(w.affiliate_id) === Number(affiliate.id) && new Date(w.requested_at).getTime() < endExclusive.getTime() && ['pending','approved','paid'].includes(String(w.status || '').toLowerCase()))
            .filter(w => !['rejected', 'failed'].includes(String(w.status || ''))).reduce((sum, w) => sum + Number(w.amount || 0), 0);
          balance += Math.max(0, commissionUntilEnd - withdrawalsUntilEnd);
        }

        historicalStats[month] = {
          affiliates: affiliateCount,
          active: activeCount,
          inactive: inactiveCount,
          sales: monthSales.length,
          revenue: money(monthRevenue),
          averageTicket: money(monthSales.length ? monthRevenue / monthSales.length : 0),
          totalBalance: money(balance),
        };
      }

      if (detailAffiliateId > 0) {
        const selectedAffiliate = (affiliates || []).find(item => Number(item.id) === detailAffiliateId);
        if (!selectedAffiliate) return json(res, 404, { error: 'Afiliada não encontrada.' });

        const teamIds = (affiliates || [])
          .filter(item => Number(item.team_parent_id) === detailAffiliateId)
          .map(item => Number(item.id));
        const teamIdSet = new Set(teamIds);
        const inMonth = (value) => detailMonth === 'all' || String(value || '').slice(0, 7) === detailMonth;
        const validPaid = (order) => isPaidOrder(order) && order.created_at && inMonth(order.created_at);
        const selectedOrders = (orders || []).filter(order => validPaid(order) && (Number(order.affiliate_id) === detailAffiliateId || teamIdSet.has(Number(order.affiliate_id))));
        const selectedEvents = (events || []).filter(event => event.type === 'access' && event.created_at && inMonth(event.created_at) && (Number(event.affiliate_id) === detailAffiliateId || teamIdSet.has(Number(event.affiliate_id))));
        const ownOrders = selectedOrders.filter(order => Number(order.affiliate_id) === detailAffiliateId);
        const teamOrders = selectedOrders.filter(order => teamIdSet.has(Number(order.affiliate_id)));
        const revenue = selectedOrders.reduce((sum, order) => sum + Number(order.total || 0), 0);
        const metrics = {
          accesses: selectedEvents.length,
          sales: selectedOrders.length,
          revenue: money(revenue),
          averageTicket: money(selectedOrders.length ? revenue / selectedOrders.length : 0),
          ownSales: ownOrders.length,
          teamSales: teamOrders.length,
          ownRevenue: money(ownOrders.reduce((sum, order) => sum + Number(order.total || 0), 0)),
          teamRevenue: money(teamOrders.reduce((sum, order) => sum + Number(order.total || 0), 0)),
        };

        const bucketMap = new Map();
        const addBucket = (key, label) => {
          if (!bucketMap.has(key)) bucketMap.set(key, { date: key, label, ownSales: 0, teamSales: 0, ownRevenue: 0, teamRevenue: 0, accesses: 0 });
          return bucketMap.get(key);
        };
        if (detailMonth === 'all') {
          for (const order of selectedOrders) {
            const key = String(order.created_at).slice(0, 7);
            const d = new Date(`${key}-01T00:00:00Z`);
            const bucket = addBucket(key, d.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric', timeZone: 'UTC' }));
            const own = Number(order.affiliate_id) === detailAffiliateId;
            if (own) { bucket.ownSales += 1; bucket.ownRevenue += Number(order.total || 0); }
            else { bucket.teamSales += 1; bucket.teamRevenue += Number(order.total || 0); }
          }
          for (const event of selectedEvents) {
            const key = String(event.created_at).slice(0, 7);
            const d = new Date(`${key}-01T00:00:00Z`);
            addBucket(key, d.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric', timeZone: 'UTC' })).accesses += 1;
          }
        } else {
          const [year, monthNumber] = detailMonth.split('-').map(Number);
          const days = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
          for (let day = 1; day <= days; day += 1) {
            const key = `${detailMonth}-${String(day).padStart(2, '0')}`;
            addBucket(key, String(day).padStart(2, '0'));
          }
          for (const order of selectedOrders) {
            const key = String(order.created_at).slice(0, 10);
            const bucket = addBucket(key, key.slice(-2));
            const own = Number(order.affiliate_id) === detailAffiliateId;
            if (own) { bucket.ownSales += 1; bucket.ownRevenue += Number(order.total || 0); }
            else { bucket.teamSales += 1; bucket.teamRevenue += Number(order.total || 0); }
          }
          for (const event of selectedEvents) {
            const key = String(event.created_at).slice(0, 10);
            addBucket(key, key.slice(-2)).accesses += 1;
          }
        }

        const chart = Array.from(bucketMap.values()).sort((a, b) => a.date.localeCompare(b.date)).map(item => ({
          ...item,
          ownRevenue: money(item.ownRevenue),
          teamRevenue: money(item.teamRevenue),
        }));
        return json(res, 200, {
          affiliate: { id: Number(selectedAffiliate.id), name: selectedAffiliate.name, slug: selectedAffiliate.slug },
          period: detailMonth,
          teamSize: teamIds.length,
          metrics,
          chart,
        });
      }

      return json(res, 200, {
        affiliates: result,
        settings,
        globalStats: { all: globalAll, byMonth: monthlyStats, snapshots: historicalStats },
        availableMonths: monthsForSnapshot.sort().reverse(),
        boostState: boostState || { activeCount: 0, queueCount: 0, completedCount: 0, active: [] },
      });
    }

    if (req.method === 'DELETE') {
      const { ids, confirmPhrase, confirmCount } = req.body || {};
      const affiliateIds = Array.from(new Set((Array.isArray(ids) ? ids : [ids])
        .map(Number)
        .filter(id => Number.isInteger(id) && id > 0)));

      if (!affiliateIds.length) return json(res, 400, { error: 'Selecione pelo menos uma afiliada.' });
      if (String(confirmPhrase || '') !== 'EXCLUIR') return json(res, 400, { error: 'Confirmação final inválida.' });
      if (Number(confirmCount) !== affiliateIds.length) return json(res, 400, { error: 'A quantidade confirmada não corresponde às afiliadas selecionadas.' });

      const filter = affiliateIds.join(',');
      const current = await supabaseFetch(
        `/rest/v1/affiliates?id=in.(${filter})&select=id,auth_user_id,name,slug,email&limit=${affiliateIds.length}`
      );
      if ((current || []).length !== affiliateIds.length) {
        return json(res, 404, { error: 'Uma ou mais afiliadas selecionadas não foram encontradas.' });
      }

      const failed = [];

      for (const affiliate of current || []) {
        try {
          await supabaseFetch(`/rest/v1/affiliates?id=eq.${Number(affiliate.id)}`, {
            method: 'DELETE',
            headers: { Prefer: 'return=minimal' },
          });
        } catch (error) {
          failed.push({ id: Number(affiliate.id), name: affiliate.name, error: error.message });
          continue;
        }

        if (affiliate.auth_user_id) {
          try {
            await supabaseFetch(`/auth/v1/admin/users/${encodeURIComponent(affiliate.auth_user_id)}`, {
              method: 'DELETE',
            });
          } catch (error) {
            failed.push({
              id: Number(affiliate.id),
              name: affiliate.name,
              error: 'Dados SQL excluídos, mas a conta de autenticação não pôde ser removida.',
              partial: true,
            });
          }
        }
      }

      if (failed.length) {
        return json(res, 500, {
          error: `${failed.length} afiliada(s) tiveram problema durante a exclusão.`,
          failed,
          deletedCount: affiliateIds.length - failed.filter(item => !item.partial).length,
        });
      }

      return json(res, 200, {
        deleted: true,
        affiliateIds,
        message: `${affiliateIds.length} afiliada(s), contas de autenticação e registros relacionados foram excluídos.`,
      });
    }

    if (req.method === 'PATCH' && String(req.body?.action || '') === 'video_review') {
      const id = Number(req.body?.id);
      const status = String(req.body?.status || '').toLowerCase();
      const note = String(req.body?.note || '').trim();
      if (!Number.isInteger(id) || id <= 0) return json(res, 400, { error: 'ID da solicitação obrigatório.' });
      if (!['approved', 'rejected'].includes(status)) return json(res, 400, { error: 'Status de análise inválido.' });
      const current = await supabaseFetch(`/rest/v1/affiliate_video_submissions?id=eq.${id}&select=id,status&limit=1`);
      if (!current?.[0]) return json(res, 404, { error: 'Solicitação de vídeo não encontrada.' });
      const rows = await supabaseFetch(`/rest/v1/affiliate_video_submissions?id=eq.${id}`, {
        method: 'PATCH',
        headers: { Prefer: 'return=representation' },
        body: JSON.stringify({ status, note: note || null, reviewed_at: new Date().toISOString() }),
      });
      return json(res, 200, { video: rows?.[0] || null });
    }

    if (req.method === 'PATCH') {
      const { id, active, adminActive, commissionRate, password, settings: requestedSettings } = req.body || {};

      if (String(req.body?.action || '') === 'update_average_sale_cost') {
        const averageSaleCost = Number(req.body?.averageSaleCost);
        if (!Number.isFinite(averageSaleCost) || averageSaleCost < 0) {
          return json(res, 400, { error: 'Informe um custo médio válido, maior ou igual a zero.' });
        }
        const rows = await supabaseFetch('/rest/v1/affiliate_settings?id=eq.1', {
          method: 'PATCH',
          headers: { Prefer: 'return=representation' },
          body: JSON.stringify({ average_sale_cost: money(averageSaleCost) }),
        });
        return json(res, 200, { averageSaleCost: Number(rows?.[0]?.average_sale_cost ?? averageSaleCost) });
      }

      // Metas dos Bônus Mensal/Fixo: tratadas separadamente para que a alteração
      // dessas seis configurações nunca dependa das demais configurações do painel.
      if (String(req.body?.action || '') === 'update_bonus_levels') {
        const monthly = req.body?.monthlyLevels || {};
        const fixed = req.body?.fixedLevels || {};
        const values = {
          monthly_bronze_sales: Number(monthly.bronze),
          monthly_silver_sales: Number(monthly.silver),
          monthly_gold_sales: Number(monthly.gold),
          fixed_bronze_sales: Number(fixed.bronze),
          fixed_silver_sales: Number(fixed.silver),
          fixed_gold_sales: Number(fixed.gold),
        };
        const validNumbers = Object.values(values).every(value => Number.isInteger(value) && value > 0);
        const orderedMonthly = values.monthly_bronze_sales < values.monthly_silver_sales && values.monthly_silver_sales < values.monthly_gold_sales;
        const orderedFixed = values.fixed_bronze_sales < values.fixed_silver_sales && values.fixed_silver_sales < values.fixed_gold_sales;
        if (!validNumbers || !orderedMonthly || !orderedFixed) {
          return json(res, 400, { error: 'As metas devem ser números inteiros positivos e crescentes: Bronze < Prata < Ouro.' });
        }
        const rows = await supabaseFetch('/rest/v1/affiliate_settings?id=eq.1', {
          method: 'PATCH',
          headers: { Prefer: 'return=representation' },
          body: JSON.stringify(values),
        });


        const row = rows?.[0] || {};
        return json(res, 200, {
          settings: {
            monthlyLevels: { bronze: Number(row.monthly_bronze_sales ?? values.monthly_bronze_sales), silver: Number(row.monthly_silver_sales ?? values.monthly_silver_sales), gold: Number(row.monthly_gold_sales ?? values.monthly_gold_sales) },
            fixedLevels: { bronze: Number(row.fixed_bronze_sales ?? values.fixed_bronze_sales), silver: Number(row.fixed_silver_sales ?? values.fixed_silver_sales), gold: Number(row.fixed_gold_sales ?? values.fixed_gold_sales) },
          },
        });
      }

      if (requestedSettings) {
        const currentRows = await supabaseFetch('/rest/v1/affiliate_settings?id=eq.1&select=ticket_threshold,ticket_bonus,team_commission_per_sale,commission_none,commission_bronze,commission_silver,commission_gold,monthly_bronze_sales,monthly_silver_sales,monthly_gold_sales,fixed_bronze_sales,fixed_silver_sales,fixed_gold_sales,team_boost_small_price,team_boost_small_connections,team_boost_large_price,team_boost_large_connections,team_boost_max_active,reseller_hydrant_price,reseller_hydrant_blister_price,reseller_stick_price,reseller_complete_price,average_sale_cost&limit=1');
        const currentSettings = normalizeConfig(currentRows?.[0] ? {
          ticketThreshold: currentRows[0].ticket_threshold,
          ticketBonus: currentRows[0].ticket_bonus,
          teamCommissionPerSale: currentRows[0].team_commission_per_sale,
          commissions: { none: currentRows[0].commission_none, bronze: currentRows[0].commission_bronze, silver: currentRows[0].commission_silver, gold: currentRows[0].commission_gold },
          monthlyLevels: { bronze: currentRows[0].monthly_bronze_sales, silver: currentRows[0].monthly_silver_sales, gold: currentRows[0].monthly_gold_sales },
          fixedLevels: { bronze: currentRows[0].fixed_bronze_sales, silver: currentRows[0].fixed_silver_sales, gold: currentRows[0].fixed_gold_sales },
          boostPlans: {
            small: { price: Number(currentRows[0].team_boost_small_price ?? 30), connections: Number(currentRows[0].team_boost_small_connections ?? 5) },
            large: { price: Number(currentRows[0].team_boost_large_price ?? 50), connections: Number(currentRows[0].team_boost_large_connections ?? 10) },
            maxActive: Number(currentRows[0].team_boost_max_active ?? 3),
          },
        } : DEFAULT_COMMISSION_CONFIG);
        currentSettings.boostPlans = currentRows?.[0] ? { small: { price: Number(currentRows[0].team_boost_small_price ?? 30), connections: Number(currentRows[0].team_boost_small_connections ?? 5) }, large: { price: Number(currentRows[0].team_boost_large_price ?? 50), connections: Number(currentRows[0].team_boost_large_connections ?? 10) }, maxActive: Number(currentRows[0].team_boost_max_active ?? 3) } : { small: { price: 30, connections: 5 }, large: { price: 50, connections: 10 }, maxActive: 3 };
        currentSettings.resellerPrices = { hydrant: Number(currentRows?.[0]?.reseller_hydrant_price ?? 0), hydrantBlister: Number(currentRows?.[0]?.reseller_hydrant_blister_price ?? 0), stick: Number(currentRows?.[0]?.reseller_stick_price ?? 0), complete: Number(currentRows?.[0]?.reseller_complete_price ?? 0) };
        const nextSettings = normalizeConfig({
          ticketThreshold: requestedSettings.ticketThreshold,
          ticketBonus: requestedSettings.ticketBonus,
          teamCommissionPerSale: requestedSettings.teamCommissionPerSale,
          commissions: requestedSettings.commissions,
          monthlyLevels: requestedSettings.monthlyLevels,
          fixedLevels: requestedSettings.fixedLevels,
          boostPlans: requestedSettings.boostPlans,
        });
        nextSettings.resellerPrices = requestedSettings.resellerPrices || currentSettings.resellerPrices;
        nextSettings.boostPlans = requestedSettings.boostPlans || currentSettings.boostPlans;
        const monthly = nextSettings.monthlyLevels;
        const fixed = nextSettings.fixedLevels;
        const boost = nextSettings.boostPlans || { small: { price: 30, connections: 5 }, large: { price: 50, connections: 10 }, maxActive: 3 };
        const boostValid = boost.small?.price > 0 && Number.isInteger(Number(boost.small?.connections)) && Number(boost.small.connections) > 0 && boost.large?.price > 0 && Number.isInteger(Number(boost.large?.connections)) && Number(boost.large.connections) > 0 && Number.isInteger(Number(boost.maxActive)) && Number(boost.maxActive) > 0;
        const thresholdsValid = monthly.bronze < monthly.silver && monthly.silver < monthly.gold && fixed.bronze < fixed.silver && fixed.silver < fixed.gold;
        if (nextSettings.ticketThreshold <= 0 || nextSettings.ticketBonus < 0 || Object.values(nextSettings.commissions).some(value => value < 0) || !thresholdsValid || !boostValid) {
          return json(res, 400, { error: 'Os valores precisam ser válidos. As metas devem ser crescentes (Bronze < Prata < Ouro) e a meta de ticket deve ser maior que zero.' });
        }
        const rows = await supabaseFetch('/rest/v1/affiliate_settings?id=eq.1', {
          method: 'PATCH',
          headers: { Prefer: 'return=representation' },
          body: JSON.stringify({
            ticket_threshold: nextSettings.ticketThreshold,
            ticket_bonus: nextSettings.ticketBonus,
            team_commission_per_sale: nextSettings.teamCommissionPerSale,
            commission_none: nextSettings.commissions.none,
            commission_bronze: nextSettings.commissions.bronze,
            commission_silver: nextSettings.commissions.silver,
            commission_gold: nextSettings.commissions.gold,
            monthly_bronze_sales: nextSettings.monthlyLevels.bronze,
            monthly_silver_sales: nextSettings.monthlyLevels.silver,
            monthly_gold_sales: nextSettings.monthlyLevels.gold,
            fixed_bronze_sales: nextSettings.fixedLevels.bronze,
            fixed_silver_sales: nextSettings.fixedLevels.silver,
            fixed_gold_sales: nextSettings.fixedLevels.gold,
            team_boost_small_price: Number(boost.small.price),
            team_boost_small_connections: Number(boost.small.connections),
            team_boost_large_price: Number(boost.large.price),
            team_boost_large_connections: Number(boost.large.connections),
            team_boost_max_active: Number(boost.maxActive),
            reseller_hydrant_price: Number(nextSettings.resellerPrices?.hydrant || 0),
            reseller_hydrant_blister_price: Number(nextSettings.resellerPrices?.hydrantBlister || 0),
            reseller_stick_price: Number(nextSettings.resellerPrices?.stick || 0),
            reseller_complete_price: Number(nextSettings.resellerPrices?.complete || 0),
          }),
        });


        await supabaseFetch('/rest/v1/rpc/she_team_boost_activate_waiting', { method: 'POST', body: '{}' }).catch(() => null);
        return json(res, 200, { settings: nextSettings, row: rows?.[0] || null });
      }

      if (!id) return json(res, 400, { error: 'ID obrigatório.' });
      const patch = {};
      if (typeof active === 'boolean') patch.active = active;
      if (typeof adminActive === 'boolean') patch.admin_active = adminActive;
      if (commissionRate != null) patch.commission_rate = Number(commissionRate);
      const wantsPasswordChange = typeof password === 'string' && password.length > 0;
      if (wantsPasswordChange && password.length < 8) return json(res, 400, { error: 'A nova senha precisa ter pelo menos 8 caracteres.' });
      if (!Object.keys(patch).length && !wantsPasswordChange) return json(res, 400, { error: 'Nenhuma alteração informada.' });

      const current = await supabaseFetch(`/rest/v1/affiliates?id=eq.${Number(id)}&select=id,auth_user_id&limit=1`);
      if (!current?.[0]) return json(res, 404, { error: 'Afiliada não encontrada.' });

      let rows = [];
      if (Object.keys(patch).length) {
        rows = await supabaseFetch(`/rest/v1/affiliates?id=eq.${Number(id)}`, {
        method: 'PATCH',
        headers: { Prefer: 'return=representation' },
          body: JSON.stringify(patch),
        });
        if (typeof adminActive === 'boolean') {
          await supabaseFetch('/rest/v1/affiliate_admin_status_history', {
            method: 'POST',
            headers: { Prefer: 'return=minimal' },
            body: JSON.stringify({ affiliate_id: Number(id), admin_active: adminActive }),
          });
        }
      }

      if (wantsPasswordChange) {
        await supabaseFetch(`/auth/v1/admin/users/${encodeURIComponent(current[0].auth_user_id)}`, {
          method: 'PUT',
          body: JSON.stringify({ password }),
        });
      }

      return json(res, 200, { affiliate: rows?.[0] || current[0], passwordUpdated: wantsPasswordChange });
    }

    return json(res, 405, { error: 'Método não permitido.' });
  } catch (error) {
    return json(res, error.statusCode || 500, { error: error.message || 'Erro no painel administrativo.' });
  }
};
