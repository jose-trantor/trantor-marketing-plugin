// Resumen: cross-source overview built from the same data as each tab.
dash.calc('sum_spend', {
  inputs: ['m_acc_cur', 'm_acc_prev'],
  title: 'Inversión por fuente',
  description: 'Inversión publicitaria de cada fuente conectada, en el periodo y en el anterior. Hoy solo Meta Ads (sus dos cuentas); otra fuente de pago se añade aquí.',
  fn: (m_acc_cur, m_acc_prev) => {
    const s = (rows) => rows.reduce((a, r) => a + (+r.spend || 0), 0);
    return [{ source: 'Meta Ads', spend: s(m_acc_cur), spend_prev: s(m_acc_prev) }];
  },
});

dash.calc('sum_kpis', {
  inputs: ['sum_spend', 'm_acc_cur', 'm_acc_prev', 'ga_t_cur', 'ga_t_prev'],
  title: 'Resumen: cifras norte',
  description: 'Ventas web, conversaciones iniciadas desde anuncios, inversión total y coste por oportunidad (inversión ÷ (pedidos web + conversaciones)), con su variación.',
  fn: (sum_spend, m_acc_cur, m_acc_prev, ga_t_cur, ga_t_prev) => {
    const s = (rows, k) => rows.reduce((a, r) => a + (+r[k] || 0), 0);
    const MSG = 'actions_onsite_conversion_messaging_conversation_started_7d';
    const ch = (a, b) => (a != null && b ? a / b - 1 : null);
    const spend = s(sum_spend, 'spend'), pspend = s(sum_spend, 'spend_prev');
    const conv = s(m_acc_cur, MSG), pconv = s(m_acc_prev, MSG);
    const orders = s(ga_t_cur, 'ecommerce_purchases'), porders = s(ga_t_prev, 'ecommerce_purchases');
    const rev = s(ga_t_cur, 'purchase_revenue'), prev = s(ga_t_prev, 'purchase_revenue');
    const opp = orders + conv, popp = porders + pconv;
    const cpo = opp ? spend / opp : null, pcpo = popp ? pspend / popp : null;
    return [{ revenue: rev, revenue_delta: ch(rev, prev), orders, orders_delta: ch(orders, porders), conversations: conv, conversations_delta: ch(conv, pconv),
      spend, spend_delta: ch(spend, pspend), opportunities: opp, opportunities_delta: ch(opp, popp), cost_per_opportunity: cpo, cost_per_opportunity_delta: ch(cpo, pcpo) }];
  },
});

dash.calc('sum_funnel', {
  inputs: ['m_acc_cur', 'm_acc_prev', 'ig_d_cur', 'ig_d_prev', 'fb_d_cur', 'fb_d_prev', 'ga_t_cur', 'ga_t_prev', 'ga_ev_cur', 'ga_ev_prev'],
  title: 'Embudo completo',
  description: 'Etapas del embudo juntando fuentes: alcance de los anuncios (Meta), interacciones (Instagram + Facebook), visitas a la web y conversaciones iniciadas, inicios de pago y pedidos web (GA4). Las ventas por chat no se miden.',
  fn: (m_acc_cur, m_acc_prev, ig_d_cur, ig_d_prev, fb_d_cur, fb_d_prev, ga_t_cur, ga_t_prev, ga_ev_cur, ga_ev_prev) => {
    const MSG = 'actions_onsite_conversion_messaging_conversation_started_7d';
    const s = (rows, k) => rows.reduce((a, r) => a + (+r[k] || 0), 0);
    const ev = (rows, name) => rows.filter((r) => r.event_name === name).reduce((a, r) => a + (+r.event_count || 0), 0);
    const ch = (a, b) => (a != null && b ? a / b - 1 : null);
    const div = (a, b) => (b ? a / b : null);
    const c = { reach: s(m_acc_cur, 'reach'), inter: s(ig_d_cur, 'total_interactions') + s(fb_d_cur, 'page_post_engagements'), visits: s(ga_t_cur, 'sessions'),
      conv: s(m_acc_cur, MSG), checkout: ev(ga_ev_cur, 'begin_checkout'), orders: s(ga_t_cur, 'ecommerce_purchases') };
    const p = { reach: s(m_acc_prev, 'reach'), inter: s(ig_d_prev, 'total_interactions') + s(fb_d_prev, 'page_post_engagements'), visits: s(ga_t_prev, 'sessions'),
      conv: s(m_acc_prev, MSG), checkout: ev(ga_ev_prev, 'begin_checkout'), orders: s(ga_t_prev, 'ecommerce_purchases') };
    const row = (stage, lane, order, k, rate, prate, rate_label, source) => ({ stage, lane, order, value: k ? c[k] : null, value_prev: k ? p[k] : null,
      value_delta: k ? ch(c[k], p[k]) : null, rate, rate_delta: ch(rate, prate), rate_label, source });
    return [
      row('Personas alcanzadas', 'Marca', 1, 'reach', null, null, '', 'Anuncios de Meta (suma de cuentas)'),
      row('Interacciones', 'Marca', 2, 'inter', div(c.inter * 1000, c.reach), div(p.inter * 1000, p.reach), 'por cada 1.000 alcanzados', 'Instagram + página de Facebook'),
      row('Visitas a la web', 'Web', 3, 'visits', div(c.visits * 1000, c.reach), div(p.visits * 1000, p.reach), 'por cada 1.000 alcanzados', 'Sesiones en GA4'),
      row('Inicios de pago', 'Web', 4, 'checkout', div(c.checkout, c.visits), div(p.checkout, p.visits), 'de las visitas', 'Evento begin_checkout'),
      row('Pedidos web', 'Web', 5, 'orders', div(c.orders, c.checkout), div(p.orders, p.checkout), 'de los inicios de pago', 'Evento purchase'),
      row('Conversaciones', 'Chat', 3, 'conv', div(c.conv * 1000, c.reach), div(p.conv * 1000, p.reach), 'por cada 1.000 alcanzados', 'WhatsApp e Instagram Direct desde anuncios'),
      row('Ventas por chat', 'Chat', 4, null, null, null, 'sin medir', 'No hay dato: falta registrarlas en el CRM'),
    ];
  },
});

dash.calc('sum_weekly', {
  inputs: ['m_daily', 'ga_d_cur'],
  title: 'Inversión y resultados por semana',
  description: 'Inversión de todas las fuentes conectadas, ventas y pedidos web, y conversaciones iniciadas, por semana de lunes a domingo.',
  fn: (m_daily, ga_d_cur) => {
    const MSG = 'actions_onsite_conversion_messaging_conversation_started_7d';
    const monday = (x) => { const d = new Date(String(x).slice(0, 10) + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7)); return d.toISOString().slice(0, 10); };
    const by = new Map(), get = (k) => by.get(k) || by.set(k, { date: k, spend: 0, revenue: 0, orders: 0, conversations: 0, days: 0 }).get(k);
    for (const r of ga_d_cur) { const o = get(monday(r.date)); o.revenue += +r.purchase_revenue || 0; o.orders += +r.ecommerce_purchases || 0; o.days += 1; }
    for (const r of m_daily) { const o = get(monday(r.date)); o.spend += +r.spend || 0; o.conversations += +r[MSG] || 0; }
    return [...by.values()].filter((o) => o.days >= 4).sort((a, b) => (a.date < b.date ? -1 : 1));
  },
});

dash.calc('sum_areas', {
  inputs: ['m_kpis', 'aw_kpis', 'ig_kpis2', 'fb_kpis2', 'ga_kpis2', 'm_alerts', 'aw_alerts', 'ig_alerts', 'fb_alerts', 'ga_alerts'],
  title: 'Estado por área',
  description: 'Para cada pestaña, su cifra clave con la variación frente al periodo anterior, si mejora o empeora, y cuántas alertas altas y oportunidades tiene.',
  fn: (m_kpis, aw_kpis, ig_kpis2, fb_kpis2, ga_kpis2, m_alerts, aw_alerts, ig_alerts, fb_alerts, ga_alerts) => {
    const nf = (o) => new Intl.NumberFormat('__LV_LOCALE__', o);
    const cop = (v) => (v == null ? '—' : '__LV_CUR__' + nf({ maximumFractionDigits: 0 }).format(v));
    const pct = (v) => (v == null ? '—' : nf({ style: 'percent', maximumFractionDigits: 1 }).format(v));
    const n = (a, p) => a.filter((x) => x.priority === p).length;
    const trend = (d, upGood) => (d == null ? 'Sin dato' : Math.abs(d) < 0.05 ? 'Estable' : (d > 0) === upGood ? 'Mejora' : 'Empeora');
    const M = m_kpis[0] || {}, A = aw_kpis[0] || {}, I = ig_kpis2[0] || {}, F = fb_kpis2[0] || {}, G = ga_kpis2[0] || {};
    return [
      { area: 'Web', tab: 'web', metric: 'Conversión', value: pct(G.conversion_rate), change: G.conversion_rate_delta, trend: trend(G.conversion_rate_delta, true), high: n(ga_alerts, 'Alta'), opportunities: n(ga_alerts, 'Oportunidad') },
      { area: 'Meta · Rendimiento', tab: 'meta', metric: 'Coste por conversación', value: cop(M.cost_per_conversation), change: M.cost_per_conversation_delta, trend: trend(M.cost_per_conversation_delta, false), high: n(m_alerts, 'Alta'), opportunities: n(m_alerts, 'Oportunidad') },
      { area: 'Meta · Awareness', tab: 'awareness', metric: 'Coste por 1.000 alcanzados', value: cop(A.cost_per_1000_reached), change: A.cost_delta, trend: trend(A.cost_delta, false), high: n(aw_alerts, 'Alta'), opportunities: n(aw_alerts, 'Oportunidad') },
      { area: 'Instagram', tab: 'instagram', metric: 'Tasa de interacción', value: pct(I.engagement_rate), change: I.engagement_rate_delta, trend: trend(I.engagement_rate_delta, true), high: n(ig_alerts, 'Alta'), opportunities: n(ig_alerts, 'Oportunidad') },
      { area: 'Facebook', tab: 'facebook', metric: 'Interacciones por 1.000 visualizaciones', value: F.engagements_per_1000 == null ? '—' : nf({ maximumFractionDigits: 1 }).format(F.engagements_per_1000), change: F.engagements_per_1000_delta, trend: trend(F.engagements_per_1000_delta, true), high: n(fb_alerts, 'Alta'), opportunities: n(fb_alerts, 'Oportunidad') },
    ];
  },
});

dash.calc('sum_alerts_meas', {
  inputs: ['m_alerts', 'ga_alerts', 'ga_src_cur', 'sum_kpis'],
  title: 'Alertas de medición',
  description: 'Problemas de medición que condicionan cualquier decisión: los de las pestañas (píxel, pasarela, eventos que desaparecen) y dos comprobaciones propias (enlace de la bio sin UTM y conversaciones sin venta registrada).',
  fn: (m_alerts, ga_alerts, ga_src_cur, sum_kpis) => {
    const nf = (o) => new Intl.NumberFormat('__LV_LOCALE__', o);
    const int = (v) => nf({ maximumFractionDigits: 0 }).format(v);
    const pick = (alerts, area, tab, test) => alerts.filter((a) => test(a.id)).map((a) => ({ ...a, id: area + ':' + a.id, area, tab }));
    const out = [
      ...pick(ga_alerts, 'Web', 'web', (id) => id === 'pasarela' || id.startsWith('ev-') || id === 'paso-5. Comprar'),
      ...pick(m_alerts, 'Meta', 'meta', (id) => id === 'pixel-sin-compras'),
    ];
    const lt = ga_src_cur.filter((r) => /linktr\.ee/i.test(r.session_source_medium || '')).reduce((a, r) => a + (+r.sessions || 0), 0);
    if (lt >= 100)
      out.push({ id: 'Web:linktree', priority: 'Alta', area: 'Web', tab: 'web', title: 'El enlace de la bio de Instagram no lleva UTM',
        detail: int(lt) + ' sesiones llegan como «linktr.ee / referral»: el tráfico y las ventas de Instagram se cuentan como Referral.', action: 'Añade utm_source=instagram&utm_medium=social&utm_campaign=bio a los enlaces de Linktree.' });
    const K = sum_kpis[0] || {};
    if (K.conversations > 0)
      out.push({ id: 'Meta:chat', priority: 'Alta', area: 'Meta', tab: 'meta', title: 'No se sabe cuántas conversaciones acaban en venta',
        detail: int(K.conversations) + ' conversaciones iniciadas desde anuncios sin pedido ni importe asociado.', action: 'Registra en tu CRM la venta y el importe de cada conversación que venga de un anuncio.' });
    const RANK = { 'Alta': 0, 'Media': 1, 'Oportunidad': 2, 'Baja': 3 };
    return out.sort((a, b) => RANK[a.priority] - RANK[b.priority]).map((a, i) => ({ ...a, order: i + 1 }));
  },
});

dash.calc('sum_alerts_biz', {
  inputs: ['m_alerts', 'aw_alerts', 'ig_alerts', 'fb_alerts', 'ga_alerts', 'sum_alerts_meas'],
  title: 'Alertas de negocio',
  description: 'Todas las alertas altas de las pestañas (menos las de medición) y las tres primeras oportunidades, con su área.',
  fn: (m_alerts, aw_alerts, ig_alerts, fb_alerts, ga_alerts, sum_alerts_meas) => {
    const meas = new Set(sum_alerts_meas.map((a) => a.id));
    const all = [
      ...ga_alerts.map((a) => ({ ...a, area: 'Web', tab: 'web' })), ...m_alerts.map((a) => ({ ...a, area: 'Meta', tab: 'meta' })),
      ...aw_alerts.map((a) => ({ ...a, area: 'Awareness', tab: 'awareness' })), ...ig_alerts.map((a) => ({ ...a, area: 'Instagram', tab: 'instagram' })),
      ...fb_alerts.map((a) => ({ ...a, area: 'Facebook', tab: 'facebook' })),
    ].map((a) => ({ ...a, id: a.area + ':' + a.id })).filter((a) => !meas.has(a.id));
    const high = all.filter((a) => a.priority === 'Alta');
    const opp = all.filter((a) => a.priority === 'Oportunidad').slice(0, 3);
    return [...high, ...opp].map((a, i) => ({ ...a, order: i + 1 }));
  },
});

dash.calc('sum_counts', {
  inputs: ['sum_alerts_meas', 'sum_alerts_biz'],
  title: 'Resumen: número de alertas',
  description: 'Problemas de medición, alertas altas de negocio y oportunidades que muestra el Resumen.',
  fn: (sum_alerts_meas, sum_alerts_biz) => [{ measurement: sum_alerts_meas.length,
    high: sum_alerts_biz.filter((a) => a.priority === 'Alta').length, opportunities: sum_alerts_biz.filter((a) => a.priority === 'Oportunidad').length }],
});
