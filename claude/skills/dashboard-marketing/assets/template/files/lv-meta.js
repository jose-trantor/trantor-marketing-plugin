// Meta Ads: calculations, verdicts and alerts. Every threshold lives in m_rules so the page can show it.
dash.calc('m_rules', {
  inputs: ['m_acc_cur'],
  title: 'Meta Ads: umbrales de veredictos y alertas',
  description: 'Los umbrales fijos con los que se decide cada veredicto y cada alerta.',
  fn: (m_acc_cur) => [{
    min_share: 0.02,        // por debajo de esta parte de la inversión, «Poco gasto»
    ad_min_share: 0.01,     // anuncios por debajo de esto no salen en la tabla
    good_ratio: 0.8,        // coste ≤ 0,8 × media de su tipo → Funciona
    watch_ratio: 1.15,      // coste > 1,15 × media → Vigilar
    bad_ratio: 1.5,         // coste ≥ 1,5 × media → No funciona
    freq_watch: 4,          // frecuencia de campañas de mensajes / venta / tráfico
    freq_high: 6,
    freq_reach: 3,          // frecuencia de campañas de alcance
    cost_rise: 0.25,        // subida del coste por resultado frente al periodo anterior
    ctr_drop: 0.3,          // caída del CTR de un anuncio (fatiga)
    checkout_rate: 0.25,    // compras / inicios de pago mínimos
    lpv_rate: 0.5,          // visitas a la web / clics mínimos
    alert_share: 0.05,      // campañas con al menos esta parte de la inversión generan alertas
    ad_alert_share: 0.03,   // anuncios con al menos esta parte de la inversión generan alertas
    small_ads: 10,          // número de anuncios residuales que dispara la alerta
    spend_change: 0.3,      // cambio de inversión que se avisa
  }],
});

dash.calc('m_kpis', {
  inputs: ['m_acc_cur', 'm_acc_prev'],
  title: 'Meta Ads: resumen frente al periodo anterior',
  description: 'Totales de las cuentas publicitarias en el periodo y en el periodo anterior de la misma duración, con su variación.',
  fn: (m_acc_cur, m_acc_prev) => {
    const MSG = 'actions_onsite_conversion_messaging_conversation_started_7d';
    const tot = (rows) => {
      const s = (k) => rows.reduce((a, r) => a + (+r[k] || 0), 0);
      return { spend: s('spend'), impressions: s('impressions'), reach: s('reach'), conversations: s(MSG), purchases: s('actions_purchase'), value: s('action_values_purchase'), lpv: s('actions_landing_page_view') };
    };
    const c = tot(m_acc_cur), p = tot(m_acc_prev);
    const div = (a, b) => (b ? a / b : null);
    const ch = (a, b) => (a != null && b ? a / b - 1 : null);
    const cpc = div(c.spend, c.conversations), ppc = div(p.spend, p.conversations);
    const cpp = div(c.spend, c.purchases), ppp = div(p.spend, p.purchases);
    const cpm = div(c.spend * 1000, c.impressions), pcpm = div(p.spend * 1000, p.impressions);
    return [{
      spend: c.spend, spend_prev: p.spend, spend_delta: ch(c.spend, p.spend),
      conversations: c.conversations, conversations_delta: ch(c.conversations, p.conversations),
      cost_per_conversation: cpc, cost_per_conversation_prev: ppc, cost_per_conversation_delta: ch(cpc, ppc),
      purchases: c.purchases, purchases_delta: ch(c.purchases, p.purchases), cost_per_purchase: cpp, cost_per_purchase_delta: ch(cpp, ppp),
      roas: div(c.value, c.spend), reach: c.reach, reach_delta: ch(c.reach, p.reach), cpm, cpm_delta: ch(cpm, pcpm),
      landing_page_views: c.lpv, accounts: m_acc_cur.filter((r) => +r.spend > 0).length,
    }];
  },
});

dash.calc('m_camp', {
  inputs: ['m_camp_cur', 'm_camp_prev', 'm_rules'],
  title: 'Campañas de Meta con veredicto',
  description: 'Cada campaña con su tipo de resultado, coste por resultado frente a la media de su tipo y al periodo anterior, y un veredicto.',
  fn: (m_camp_cur, m_camp_prev, m_rules) => {
    const R = m_rules[0];
    const MSG = 'actions_onsite_conversion_messaging_conversation_started_7d';
    const SALES = ['OUTCOME_SALES', 'OUTCOME_LEADS', 'CONVERSIONS', 'MESSAGES', 'LEAD_GENERATION'];
    const n = (r, k) => +(r && r[k]) || 0;
    const typeOf = (r) => (['OUTCOME_TRAFFIC', 'LINK_CLICKS'].includes(r.campaign_objective) ? 'Tráfico'
      : SALES.includes(r.campaign_objective) ? (n(r, 'actions_landing_page_view') > n(r, MSG) ? 'Venta web' : 'Mensajes') : 'Alcance');
    const resultOf = (r, t) => (t === 'Mensajes' ? n(r, MSG) : t === 'Venta web' ? n(r, 'actions_purchase') : t === 'Tráfico' ? n(r, 'actions_landing_page_view') : n(r, 'reach'));
    const costOf = (spend, res, t) => (res ? (t === 'Alcance' ? spend * 1000 / res : spend / res) : null);
    const total = m_camp_cur.reduce((a, r) => a + n(r, 'spend'), 0);
    const prev = new Map(m_camp_prev.map((r) => [r.account_name + '|' + r.campaign, r]));
    const rows = m_camp_cur.map((r) => {
      const t = typeOf(r), res = resultOf(r, t), spend = n(r, 'spend');
      const p = prev.get(r.account_name + '|' + r.campaign);
      const cpr = costOf(spend, res, t), pcpr = p ? costOf(n(p, 'spend'), resultOf(p, t), t) : null;
      return {
        account_name: r.account_name, campaign: r.campaign, type: t, spend, share: total ? spend / total : 0, results: res, cost_per_result: cpr,
        cost_delta: cpr != null && pcpr ? cpr / pcpr - 1 : null, frequency: n(r, 'frequency'),
        ctr: n(r, 'impressions') ? n(r, 'link_clicks') / n(r, 'impressions') : null,
        link_clicks: n(r, 'link_clicks'), landing_page_views: n(r, 'actions_landing_page_view'),
        checkouts: n(r, 'actions_initiate_checkout'), purchases: n(r, 'actions_purchase'),
      };
    });
    const avg = {};
    for (const t of ['Mensajes', 'Venta web', 'Tráfico', 'Alcance']) {
      const g = rows.filter((x) => x.type === t);
      avg[t] = costOf(g.reduce((a, x) => a + x.spend, 0), g.reduce((a, x) => a + x.results, 0), t);
    }
    return rows.map((x) => {
      const a = avg[x.type], ratio = x.cost_per_result != null && a ? x.cost_per_result / a : null;
      const fw = x.type === 'Alcance' ? R.freq_reach : R.freq_watch;
      const verdict = x.share < R.min_share ? 'Poco gasto'
        : !x.results || ratio >= R.bad_ratio ? 'No funciona'
        : ratio <= R.good_ratio ? 'Funciona'
        : ratio > R.watch_ratio || x.frequency > fw || (x.cost_delta != null && x.cost_delta > R.cost_rise) ? 'Vigilar' : 'En la media';
      return { ...x, type_avg_cost: a, vs_type: ratio != null ? ratio - 1 : null, verdict };
    });
  },
});

dash.calc('m_types', {
  inputs: ['m_camp'],
  title: 'Inversión por tipo de resultado',
  description: 'Inversión, resultados y coste por resultado de cada tipo de campaña.',
  fn: (m_camp) => {
    const total = m_camp.reduce((a, x) => a + x.spend, 0);
    return ['Mensajes', 'Venta web', 'Tráfico', 'Alcance'].map((t) => {
      const g = m_camp.filter((x) => x.type === t);
      const spend = g.reduce((a, x) => a + x.spend, 0), results = g.reduce((a, x) => a + x.results, 0);
      return { type: t, spend, share: total ? spend / total : 0, results, campaigns: g.length,
        cost_per_result: results ? (t === 'Alcance' ? spend * 1000 / results : spend / results) : null };
    }).filter((x) => x.spend > 0).sort((a, b) => b.spend - a.spend);
  },
});

dash.calc('m_ads', {
  inputs: ['m_ads_cur', 'm_ads_prev', 'm_rules'],
  title: 'Anuncios de Meta con veredicto',
  description: 'Anuncios con al menos el 1 % de la inversión: coste por resultado frente a la media de su tipo, variación del CTR y veredicto.',
  fn: (m_ads_cur, m_ads_prev, m_rules) => {
    const R = m_rules[0];
    const MSG = 'actions_onsite_conversion_messaging_conversation_started_7d';
    const SALES = ['OUTCOME_SALES', 'OUTCOME_LEADS', 'CONVERSIONS', 'MESSAGES', 'LEAD_GENERATION'];
    const n = (r, k) => +(r && r[k]) || 0;
    const camp = new Map();
    for (const r of m_ads_cur) {
      const k = r.account_name + '|' + r.campaign;
      const c = camp.get(k) || { objective: r.campaign_objective, lpv: 0, msg: 0 };
      c.lpv += n(r, 'actions_landing_page_view'); c.msg += n(r, MSG); camp.set(k, c);
    }
    const typeOf = (r) => {
      const c = camp.get(r.account_name + '|' + r.campaign);
      return ['OUTCOME_TRAFFIC', 'LINK_CLICKS'].includes(c.objective) ? 'Tráfico' : SALES.includes(c.objective) ? (c.lpv > c.msg ? 'Venta web' : 'Mensajes') : 'Alcance';
    };
    const resultOf = (r, t) => (t === 'Mensajes' ? n(r, MSG) : t === 'Venta web' ? n(r, 'actions_purchase') : t === 'Tráfico' ? n(r, 'actions_landing_page_view') : n(r, 'reach'));
    const costOf = (spend, res, t) => (res ? (t === 'Alcance' ? spend * 1000 / res : spend / res) : null);
    const total = m_ads_cur.reduce((a, r) => a + n(r, 'spend'), 0);
    const prev = new Map(m_ads_prev.map((r) => [r.account_name + '|' + r.ad_name, r]));
    const rows = m_ads_cur.map((r) => {
      const t = typeOf(r), res = resultOf(r, t), spend = n(r, 'spend');
      const p = prev.get(r.account_name + '|' + r.ad_name);
      const ctr = n(r, 'impressions') ? n(r, 'link_clicks') / n(r, 'impressions') : null;
      const pctr = p && n(p, 'impressions') >= 2000 ? n(p, 'link_clicks') / n(p, 'impressions') : null;
      return { account_name: r.account_name, ad_name: r.ad_name, campaign: r.campaign, type: t, spend, share: total ? spend / total : 0,
        results: res, cost_per_result: costOf(spend, res, t), ctr, ctr_prev: pctr, ctr_delta: ctr != null && pctr ? ctr / pctr - 1 : null };
    });
    const avg = {};
    for (const t of ['Mensajes', 'Venta web', 'Tráfico', 'Alcance']) {
      const g = rows.filter((x) => x.type === t);
      avg[t] = costOf(g.reduce((a, x) => a + x.spend, 0), g.reduce((a, x) => a + x.results, 0), t);
    }
    return rows.filter((x) => x.share >= R.ad_min_share).map((x) => {
      const a = avg[x.type], ratio = x.cost_per_result != null && a ? x.cost_per_result / a : null;
      const verdict = x.share < R.min_share ? 'Poco gasto'
        : !x.results || ratio >= R.bad_ratio ? 'No funciona'
        : ratio <= R.good_ratio ? 'Funciona'
        : ratio > R.watch_ratio || (x.ctr_delta != null && x.ctr_delta < -R.ctr_drop) ? 'Vigilar' : 'En la media';
      return { ...x, type_avg_cost: a, vs_type: ratio != null ? ratio - 1 : null, verdict };
    });
  },
});

dash.calc('m_small_ads', {
  inputs: ['m_ads_cur', 'm_rules'],
  title: 'Anuncios residuales',
  description: 'Cuántos anuncios tienen menos del 1 % de la inversión y qué parte del gasto suman.',
  fn: (m_ads_cur, m_rules) => {
    const total = m_ads_cur.reduce((a, r) => a + (+r.spend || 0), 0);
    const small = m_ads_cur.filter((r) => total && (+r.spend || 0) / total < m_rules[0].ad_min_share);
    return [{ count: small.length, share: total ? small.reduce((a, r) => a + (+r.spend || 0), 0) / total : 0, total_ads: m_ads_cur.length }];
  },
});

dash.calc('m_daily_sum', {
  inputs: ['m_daily'],
  title: 'Meta Ads por día',
  description: 'Inversión, conversaciones y compras web por día, sumando las cuentas.',
  fn: (m_daily) => {
    const by = new Map();
    for (const r of m_daily) {
      const d = String(r.date).slice(0, 10);
      const o = by.get(d) || { date: d, spend: 0, conversations: 0, purchases: 0 };
      o.spend += +r.spend || 0;
      o.conversations += +r.actions_onsite_conversion_messaging_conversation_started_7d || 0;
      o.purchases += +r.actions_purchase || 0;
      by.set(d, o);
    }
    return [...by.values()].sort((a, b) => (a.date < b.date ? -1 : 1));
  },
});

dash.calc('m_alerts', {
  inputs: ['m_camp', 'm_ads', 'm_kpis', 'm_small_ads', 'm_rules'],
  title: 'Alertas de Meta Ads',
  description: 'Reglas fijas sobre campañas, anuncios y totales; cada alerta dice qué pasa, con qué cifras y qué hacer. Ordenadas por prioridad y por inversión afectada.',
  fn: (m_camp, m_ads, m_kpis, m_small_ads, m_rules) => {
    const R = m_rules[0], K = m_kpis[0] || {}, S = m_small_ads[0] || {};
    const nf = (o) => new Intl.NumberFormat('__LV_LOCALE__', o);
    const cop = (v) => '__LV_CUR__' + nf({ maximumFractionDigits: 0 }).format(v);
    const pct = (v) => nf({ style: 'percent', maximumFractionDigits: 0 }).format(v);
    const x1 = (v) => nf({ maximumFractionDigits: 1 }).format(v);
    const UNIT = { 'Mensajes': ['conversación', 'conversaciones'], 'Venta web': ['compra', 'compras'], 'Tráfico': ['visita a la web', 'visitas a la web'], 'Alcance': ['1.000 personas alcanzadas', 'personas alcanzadas'] };
    const RANK = { 'Alta': 0, 'Media': 1, 'Oportunidad': 2, 'Baja': 3 };
    const out = [];
    const add = (priority, id, title, detail, action, weight) => out.push({ id, priority, title, detail, action, weight: weight || 0 });

    if (K.purchases === 0 && m_camp.some((c) => c.type === 'Venta web' && c.share >= R.min_share))
      add('Alta', 'pixel-sin-compras', 'El píxel no registra compras', 'Hay campañas de venta web con inversión, pero Meta no ha contado ninguna compra en el periodo.', 'Comprueba en el Administrador de eventos que el evento Purchase llega desde el checkout de la tienda.', 1);
    if (K.cost_per_conversation_delta != null && K.cost_per_conversation_delta > R.cost_rise && K.conversations >= 20)
      add('Alta', 'coste-conversacion', 'El coste por conversación sube un ' + pct(K.cost_per_conversation_delta),
        cop(K.cost_per_conversation) + ' por conversación frente a ' + cop(K.cost_per_conversation_prev) + ' en el periodo anterior.', 'Mira la columna «vs. anterior» de Campañas para ver qué campaña lo explica.', 1);

    for (const c of m_camp) {
      const u = UNIT[c.type];
      if (c.verdict === 'No funciona' && c.share >= R.alert_share) {
        add('Alta', 'camp-mal-' + c.campaign, '«' + c.campaign + '» no está rindiendo',
          c.results ? cop(c.cost_per_result) + ' por ' + u[0] + ', ' + x1(c.cost_per_result / c.type_avg_cost) + ' veces la media de las campañas de ' + c.type.toLowerCase() + ' (' + cop(c.type_avg_cost) + '). Se lleva el ' + pct(c.share) + ' de la inversión.'
            : 'Ninguna ' + u[0] + ' con ' + cop(c.spend) + ' invertidos (' + pct(c.share) + ' del total).',
          'Baja su presupuesto o revisa público y creatividades; si no mejora en una semana, páusala.', c.share);
      }
      const fw = c.type === 'Alcance' ? R.freq_reach : R.freq_watch;
      if (c.share >= R.alert_share && c.frequency > fw)
        add(c.type !== 'Alcance' && c.frequency > R.freq_high ? 'Alta' : 'Media', 'freq-' + c.campaign, 'Audiencia saturada en «' + c.campaign + '»',
          'Cada persona ha visto sus anuncios ' + x1(c.frequency) + ' veces de media en el periodo.', 'Amplía el público o renueva las creatividades para que el coste no se dispare.', c.share);
      if (c.share >= R.alert_share && c.cost_delta != null && c.cost_delta > R.cost_rise && c.verdict !== 'No funciona')
        add('Media', 'coste-sube-' + c.campaign, 'Se encarece «' + c.campaign + '»', 'Su coste por ' + u[0] + ' sube un ' + pct(c.cost_delta) + ' respecto al periodo anterior, hasta ' + cop(c.cost_per_result) + '.', 'Revisa si cambió el público, la puja o las creatividades activas.', c.share);
      if (c.type === 'Venta web' && c.checkouts >= 20 && c.purchases / c.checkouts < R.checkout_rate)
        add('Media', 'checkout-' + c.campaign, 'Muchos inicios de pago y pocas compras', 'En «' + c.campaign + '», de ' + c.checkouts + ' inicios de pago solo ' + c.purchases + ' terminan en compra (' + pct(c.purchases / c.checkouts) + ').', 'Prueba el pago en móvil y confirma que el evento Purchase se dispara al terminar el pedido.', c.share);
      if ((c.type === 'Tráfico' || c.type === 'Venta web') && c.link_clicks >= 200 && c.landing_page_views / c.link_clicks < R.lpv_rate)
        add('Media', 'lpv-' + c.campaign, 'Clics que no llegan a la web', 'En «' + c.campaign + '» solo el ' + pct(c.landing_page_views / c.link_clicks) + ' de los clics termina de cargar la página.', 'Revisa la velocidad de carga y excluye ubicaciones con clics accidentales, como Audience Network.', c.share);
      if (c.verdict === 'Funciona' && c.share >= R.min_share)
        add('Oportunidad', 'camp-bien-' + c.campaign, 'Escala «' + c.campaign + '»', cop(c.cost_per_result) + ' por ' + u[0] + ', un ' + pct(1 - c.cost_per_result / c.type_avg_cost) + ' por debajo de la media de su tipo.', 'Súbele el presupuesto de forma gradual (un 20-30 % cada pocos días).', c.share);
    }

    for (const a of m_ads) {
      const u = UNIT[a.type];
      if (a.share >= R.ad_alert_share && !a.results)
        add('Alta', 'ad-cero-' + a.ad_name, '«' + a.ad_name + '» gasta sin resultados', cop(a.spend) + ' invertidos (' + pct(a.share) + ' del total) y ninguna ' + u[0] + '.', 'Pausa el anuncio o revisa su destino.', a.share);
      else if (a.share >= R.ad_alert_share && a.verdict === 'No funciona')
        add('Media', 'ad-caro-' + a.ad_name, '«' + a.ad_name + '» sale caro', cop(a.cost_per_result) + ' por ' + u[0] + ', ' + x1(a.cost_per_result / a.type_avg_cost) + ' veces la media de su tipo.', 'Pasa su presupuesto a los anuncios marcados «Funciona».', a.share);
      if (a.share >= R.min_share && a.ctr_delta != null && a.ctr_delta < -R.ctr_drop)
        add('Media', 'fatiga-' + a.ad_name, 'Fatiga creativa en «' + a.ad_name + '»', 'Su CTR cae un ' + pct(-a.ctr_delta) + ' respecto al periodo anterior.', 'Prepara una variante nueva de esta pieza.', a.share);
    }
    for (const t of ['Mensajes', 'Venta web']) {
      const best = m_ads.filter((a) => a.type === t && a.verdict === 'Funciona').sort((a, b) => a.cost_per_result - b.cost_per_result)[0];
      if (best)
        add('Oportunidad', 'mejor-' + t, '«' + best.ad_name + '» es tu mejor anuncio de ' + t.toLowerCase(), cop(best.cost_per_result) + ' por ' + UNIT[t][0] + ', un ' + pct(1 - best.cost_per_result / best.type_avg_cost) + ' por debajo de la media.', 'Dale más presupuesto o crea variantes con el mismo enfoque.', best.share);
    }

    if (S.count >= R.small_ads)
      add('Baja', 'residuales', S.count + ' anuncios con menos del 1 % de la inversión', 'Entre todos suman el ' + pct(S.share) + ' del gasto y apenas acumulan datos.', 'Consolida: con menos anuncios, Meta aprende antes cuál funciona.', S.share);
    if (K.accounts >= 2)
      add('Baja', 'cuentas', 'La inversión está repartida en ' + K.accounts + ' cuentas publicitarias', 'Cada cuenta optimiza y mide por separado.', 'Centraliza en una cuenta para que el aprendizaje y el píxel no se dividan.', 0);
    if (K.spend_delta != null && Math.abs(K.spend_delta) > R.spend_change)
      add('Baja', 'inversion', 'La inversión ' + (K.spend_delta > 0 ? 'sube' : 'baja') + ' un ' + pct(Math.abs(K.spend_delta)), cop(K.spend) + ' frente a ' + cop(K.spend_prev) + ' en el periodo anterior.', 'Tenlo en cuenta al comparar resultados entre periodos.', 0);

    return out.sort((a, b) => RANK[a.priority] - RANK[b.priority] || b.weight - a.weight)
      .map((a, i) => ({ id: a.id, order: i + 1, priority: a.priority, title: a.title, detail: a.detail, action: a.action }));
  },
});

dash.calc('m_alert_count', {
  inputs: ['m_alerts'],
  title: 'Alertas por prioridad',
  description: 'Cuántas alertas hay de cada prioridad.',
  fn: (m_alerts) => [{
    alta: m_alerts.filter((a) => a.priority === 'Alta').length,
    media: m_alerts.filter((a) => a.priority === 'Media').length,
    oportunidad: m_alerts.filter((a) => a.priority === 'Oportunidad').length,
    baja: m_alerts.filter((a) => a.priority === 'Baja').length,
  }],
});
