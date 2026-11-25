// Meta awareness: campaigns with Awareness / Engagement objectives. Every threshold lives in aw_rules.
dash.calc('aw_rules', {
  inputs: ['aw_camp_cur'],
  title: 'Awareness: umbrales de veredictos y alertas',
  description: 'Los umbrales fijos con los que se decide cada veredicto y cada alerta de awareness.',
  fn: (aw_camp_cur) => [{
    min_share: 0.02,       // por debajo de esta parte de la inversión de awareness, «Poco gasto»
    ad_min_share: 0.01,    // anuncios por debajo de esto no salen en la tabla
    good_ratio: 0.8,       // coste por 1.000 alcanzados ≤ 0,8 × media → Funciona
    watch_ratio: 1.15,     // > 1,15 × media → Vigilar
    bad_ratio: 1.5,        // ≥ 1,5 × media → No funciona
    freq7_watch: 3,        // frecuencia de los últimos 7 días
    freq7_high: 5,
    cost_rise: 0.25,       // subida del coste por 1.000 alcanzados frente al periodo anterior
    hook_low: 0.6,         // enganche de un vídeo por debajo de 0,6 × media → alerta
    hook_bad: 0.5,         // enganche por debajo de 0,5 × media → No funciona
    hook_high: 1.3,        // enganche por encima de 1,3 × media → oportunidad
    retention_low: 0.6,    // retención por debajo de 0,6 × media
    hook_drop: 0.3,        // caída del enganche frente al periodo anterior (fatiga)
    min_impressions: 5000, // impresiones mínimas para juzgar un vídeo
    alert_share: 0.05,     // campañas con al menos esta parte generan alertas
    ad_alert_share: 0.03,  // anuncios con al menos esta parte generan alertas
    small_ads: 8,          // número de anuncios residuales que dispara la alerta
    aw_share_high: 0.5,    // parte de la inversión de Meta en awareness que se avisa
  }],
});

dash.calc('aw_kpis', {
  inputs: ['aw_camp_cur', 'aw_camp_prev', 'm_kpis'],
  title: 'Awareness: resumen frente al periodo anterior',
  description: 'Inversión, alcance (suma de campañas), coste por 1.000 personas alcanzadas, recuerdo estimado y enganche de vídeo, con su variación.',
  fn: (aw_camp_cur, aw_camp_prev, m_kpis) => {
    const tot = (rows) => {
      const s = (k) => rows.reduce((a, r) => a + (+r[k] || 0), 0);
      return { spend: s('spend'), impressions: s('impressions'), reach: s('reach'), v3: s('actions_video_view'), thru: s('video_thruplay_watched_actions_video_view'), recall: s('estimated_ad_recallers') };
    };
    const c = tot(aw_camp_cur), p = tot(aw_camp_prev);
    const div = (a, b) => (b ? a / b : null);
    const ch = (a, b) => (a != null && b ? a / b - 1 : null);
    const cpr = div(c.spend * 1000, c.reach), pcpr = div(p.spend * 1000, p.reach);
    const hook = div(c.v3, c.impressions), phook = div(p.v3, p.impressions);
    const meta = (m_kpis[0] || {}).spend;
    return [{
      spend: c.spend, spend_prev: p.spend, spend_delta: ch(c.spend, p.spend), share_of_meta: div(c.spend, meta),
      reach: c.reach, reach_delta: ch(c.reach, p.reach), impressions: c.impressions,
      cost_per_1000_reached: cpr, cost_per_1000_reached_prev: pcpr, cost_delta: ch(cpr, pcpr),
      frequency: div(c.impressions, c.reach), cpm: div(c.spend * 1000, c.impressions),
      recallers: c.recall, recallers_delta: ch(c.recall, p.recall), cost_per_recaller: div(c.spend, c.recall),
      hook_rate: hook, hook_delta: ch(hook, phook), retention: div(c.thru, c.v3),
      campaigns: aw_camp_cur.length,
    }];
  },
});

dash.calc('aw_camp', {
  inputs: ['aw_camp_cur', 'aw_camp_prev', 'aw_camp_7d', 'aw_rules'],
  title: 'Campañas de awareness con veredicto',
  description: 'Cada campaña de awareness con su coste por 1.000 alcanzados frente a la media y al periodo anterior, su frecuencia de los últimos 7 días y un veredicto.',
  fn: (aw_camp_cur, aw_camp_prev, aw_camp_7d, aw_rules) => {
    const R = aw_rules[0];
    const n = (r, k) => +(r && r[k]) || 0;
    const key = (r) => r.account_name + '|' + r.campaign;
    const cpr = (r) => (n(r, 'reach') ? n(r, 'spend') * 1000 / n(r, 'reach') : null);
    const prev = new Map(aw_camp_prev.map((r) => [key(r), r]));
    const week = new Map(aw_camp_7d.map((r) => [key(r), r]));
    const total = aw_camp_cur.reduce((a, r) => a + n(r, 'spend'), 0);
    const reach = aw_camp_cur.reduce((a, r) => a + n(r, 'reach'), 0);
    const avg = reach ? total * 1000 / reach : null;
    return aw_camp_cur.map((r) => {
      const c = cpr(r), p = prev.get(key(r)), pc = p ? cpr(p) : null, w = week.get(key(r));
      const share = total ? n(r, 'spend') / total : 0, ratio = c != null && avg ? c / avg : null;
      const delta = c != null && pc ? c / pc - 1 : null, f7 = w ? n(w, 'frequency') : null;
      const verdict = share < R.min_share ? 'Poco gasto'
        : !n(r, 'reach') || ratio >= R.bad_ratio ? 'No funciona'
        : ratio <= R.good_ratio ? 'Funciona'
        : ratio > R.watch_ratio || (f7 != null && f7 > R.freq7_watch) || (delta != null && delta > R.cost_rise) ? 'Vigilar' : 'En la media';
      return {
        account_name: r.account_name, campaign: r.campaign, spend: n(r, 'spend'), share, reach: n(r, 'reach'),
        cost_per_1000_reached: c, vs_avg: ratio != null ? ratio - 1 : null, cost_delta: delta, avg_cost: avg,
        frequency: n(r, 'frequency'), frequency_7d: f7, active_7d: !!w,
        hook_rate: n(r, 'impressions') && n(r, 'actions_video_view') ? n(r, 'actions_video_view') / n(r, 'impressions') : null,
        recallers: n(r, 'estimated_ad_recallers'), verdict,
      };
    });
  },
});

dash.calc('aw_ads', {
  inputs: ['aw_ads_cur', 'aw_ads_prev', 'aw_rules'],
  title: 'Anuncios de awareness con veredicto',
  description: 'Anuncios con al menos el 1 % de la inversión de awareness: coste por 1.000 alcanzados, enganche y retención del vídeo frente a la media, y veredicto.',
  fn: (aw_ads_cur, aw_ads_prev, aw_rules) => {
    const R = aw_rules[0];
    const n = (r, k) => +(r && r[k]) || 0;
    const key = (r) => r.account_name + '|' + r.ad_name;
    const s = (rows, k) => rows.reduce((a, r) => a + n(r, k), 0);
    const total = s(aw_ads_cur, 'spend');
    const avgCost = s(aw_ads_cur, 'reach') ? total * 1000 / s(aw_ads_cur, 'reach') : null;
    const vids = aw_ads_cur.filter((r) => n(r, 'actions_video_view') > 0);
    const avgHook = s(vids, 'impressions') ? s(vids, 'actions_video_view') / s(vids, 'impressions') : null;
    const avgRet = s(vids, 'actions_video_view') ? s(vids, 'video_thruplay_watched_actions_video_view') / s(vids, 'actions_video_view') : null;
    const prev = new Map(aw_ads_prev.map((r) => [key(r), r]));
    return aw_ads_cur.map((r) => {
      const share = total ? n(r, 'spend') / total : 0;
      const cost = n(r, 'reach') ? n(r, 'spend') * 1000 / n(r, 'reach') : null;
      const video = n(r, 'actions_video_view') > 0 && n(r, 'impressions') >= R.min_impressions;
      const hook = video ? n(r, 'actions_video_view') / n(r, 'impressions') : null;
      const ret = video ? n(r, 'video_thruplay_watched_actions_video_view') / n(r, 'actions_video_view') : null;
      const p = prev.get(key(r));
      const phook = p && n(p, 'impressions') >= R.min_impressions && n(p, 'actions_video_view') ? n(p, 'actions_video_view') / n(p, 'impressions') : null;
      const ratio = cost != null && avgCost ? cost / avgCost : null;
      const hr = hook != null && avgHook ? hook / avgHook : null;
      const hd = hook != null && phook ? hook / phook - 1 : null;
      const verdict = share < R.min_share ? 'Poco gasto'
        : !n(r, 'reach') || ratio >= R.bad_ratio || (hr != null && hr < R.hook_bad) ? 'No funciona'
        : ratio <= R.good_ratio && (hr == null || hr >= R.good_ratio) ? 'Funciona'
        : ratio > R.watch_ratio || (hr != null && hr < R.good_ratio) || (hd != null && hd < -R.hook_drop) ? 'Vigilar' : 'En la media';
      return {
        account_name: r.account_name, ad_name: r.ad_name, campaign: r.campaign, spend: n(r, 'spend'), share, reach: n(r, 'reach'),
        cost_per_1000_reached: cost, vs_avg: ratio != null ? ratio - 1 : null, avg_cost: avgCost,
        hook_rate: hook, hook_vs_avg: hr != null ? hr - 1 : null, avg_hook: avgHook, hook_delta: hd,
        retention: ret, retention_vs_avg: ret != null && avgRet ? ret / avgRet - 1 : null, avg_retention: avgRet, verdict,
      };
    }).filter((x) => x.share >= R.ad_min_share);
  },
});

dash.calc('aw_small_ads', {
  inputs: ['aw_ads_cur', 'aw_rules'],
  title: 'Anuncios de awareness residuales',
  description: 'Cuántos anuncios de awareness tienen menos del 1 % de su inversión y qué parte suman.',
  fn: (aw_ads_cur, aw_rules) => {
    const total = aw_ads_cur.reduce((a, r) => a + (+r.spend || 0), 0);
    const small = aw_ads_cur.filter((r) => total && (+r.spend || 0) / total < aw_rules[0].ad_min_share);
    return [{ count: small.length, share: total ? small.reduce((a, r) => a + (+r.spend || 0), 0) / total : 0 }];
  },
});

dash.calc('aw_daily_sum', {
  inputs: ['aw_daily'],
  title: 'Awareness por día',
  description: 'Personas alcanzadas (suma de campañas), inversión y coste por 1.000 alcanzados por día.',
  fn: (aw_daily) => {
    const by = new Map();
    for (const r of aw_daily) {
      const d = String(r.date).slice(0, 10);
      const o = by.get(d) || { date: d, spend: 0, reach: 0, impressions: 0 };
      o.spend += +r.spend || 0; o.reach += +r.reach || 0; o.impressions += +r.impressions || 0;
      by.set(d, o);
    }
    return [...by.values()].map((o) => ({ ...o, cost_per_1000_reached: o.reach ? o.spend * 1000 / o.reach : null }))
      .sort((a, b) => (a.date < b.date ? -1 : 1));
  },
});

dash.calc('aw_alerts', {
  inputs: ['aw_camp', 'aw_ads', 'aw_kpis', 'aw_small_ads', 'aw_rules'],
  title: 'Alertas de awareness',
  description: 'Reglas fijas sobre campañas, anuncios y totales de awareness; cada alerta dice qué pasa, con qué cifras y qué hacer. Ordenadas por prioridad y por inversión afectada.',
  fn: (aw_camp, aw_ads, aw_kpis, aw_small_ads, aw_rules) => {
    const R = aw_rules[0], K = aw_kpis[0] || {}, S = aw_small_ads[0] || {};
    const nf = (o) => new Intl.NumberFormat('__LV_LOCALE__', o);
    const cop = (v) => '__LV_CUR__' + nf({ maximumFractionDigits: 0 }).format(v);
    const pct = (v) => nf({ style: 'percent', maximumFractionDigits: 0 }).format(v);
    const pct1 = (v) => nf({ style: 'percent', maximumFractionDigits: 1 }).format(v);
    const x1 = (v) => nf({ maximumFractionDigits: 1 }).format(v);
    const RANK = { 'Alta': 0, 'Media': 1, 'Oportunidad': 2, 'Baja': 3 };
    const out = [];
    const add = (priority, id, title, detail, action, weight) => out.push({ id, priority, title, detail, action, weight: weight || 0 });

    if (K.cost_delta != null && K.cost_delta > R.cost_rise)
      add('Alta', 'coste-sube', 'Alcanzar cuesta un ' + pct(K.cost_delta) + ' más', cop(K.cost_per_1000_reached) + ' por cada 1.000 personas alcanzadas, frente a ' + cop(K.cost_per_1000_reached_prev) + ' en el periodo anterior.', 'Revisa qué campaña lo explica en la tabla y si el público se ha quedado pequeño.', 1);

    for (const c of aw_camp) {
      if (c.active_7d && c.frequency_7d > R.freq7_watch)
        add(c.frequency_7d > R.freq7_high ? 'Alta' : 'Media', 'freq-' + c.campaign, 'Audiencia saturada en «' + c.campaign + '»', 'En los últimos 7 días, cada persona ha visto sus anuncios ' + x1(c.frequency_7d) + ' veces.', 'Amplía el público o la zona, o baja el presupuesto: repetir más no suma recuerdo.', c.share);
      if (c.verdict === 'No funciona' && c.share >= R.alert_share)
        add(c.active_7d ? 'Alta' : 'Baja', 'camp-mal-' + c.campaign, '«' + c.campaign + '» alcanza caro' + (c.active_7d ? '' : ' (sin actividad en los últimos 7 días)'), cop(c.cost_per_1000_reached) + ' por cada 1.000 personas, ' + x1(c.cost_per_1000_reached / c.avg_cost) + ' veces la media de awareness. Se lleva el ' + pct(c.share) + ' de la inversión de awareness.', 'Revisa público, ubicaciones y creatividades; si no baja, pasa el presupuesto a la campaña más barata.', c.share);
      else if (c.active_7d && c.share >= R.alert_share && c.cost_delta != null && c.cost_delta > R.cost_rise)
        add('Media', 'camp-sube-' + c.campaign, 'Se encarece «' + c.campaign + '»', 'Su coste por 1.000 alcanzados sube un ' + pct(c.cost_delta) + ' respecto al periodo anterior.', 'Comprueba si el público se agota (frecuencia) o si las creatividades se han quemado.', c.share);
      if (c.verdict === 'Funciona' && c.active_7d)
        add('Oportunidad', 'camp-bien-' + c.campaign, 'Escala «' + c.campaign + '»', cop(c.cost_per_1000_reached) + ' por cada 1.000 personas, un ' + pct(1 - c.cost_per_1000_reached / c.avg_cost) + ' por debajo de la media.', 'Súbele el presupuesto de forma gradual vigilando la frecuencia.', c.share);
    }

    for (const a of aw_ads) {
      if (a.share >= R.ad_alert_share && a.vs_avg != null && a.vs_avg + 1 >= R.bad_ratio)
        add('Alta', 'ad-caro-' + a.ad_name, '«' + a.ad_name + '» alcanza caro', cop(a.cost_per_1000_reached) + ' por cada 1.000 personas, ' + x1(a.vs_avg + 1) + ' veces la media.', 'Pausa el anuncio o cámbialo por la creatividad con mejor enganche.', a.share);
      if (a.share >= R.min_share && a.hook_vs_avg != null && a.hook_vs_avg + 1 < R.hook_low)
        add('Media', 'hook-' + a.ad_name, '«' + a.ad_name + '» no engancha', 'Solo el ' + pct1(a.hook_rate) + ' de las impresiones llega a 3 segundos de vídeo, frente al ' + pct1(a.avg_hook) + ' de media.', 'Cambia el arranque: producto y movimiento en el primer segundo.', a.share);
      if (a.share >= R.min_share && a.retention_vs_avg != null && a.retention_vs_avg + 1 < R.retention_low)
        add('Media', 'ret-' + a.ad_name, 'En «' + a.ad_name + '» se abandona pronto', 'Solo el ' + pct(a.retention) + ' de quienes empiezan el vídeo llegan a ThruPlay, frente al ' + pct(a.avg_retention) + ' de media.', 'Acorta el vídeo o adelanta el mensaje principal.', a.share);
      if (a.share >= R.min_share && a.hook_delta != null && a.hook_delta < -R.hook_drop)
        add('Media', 'fatiga-' + a.ad_name, 'Fatiga creativa en «' + a.ad_name + '»', 'Su enganche cae un ' + pct(-a.hook_delta) + ' respecto al periodo anterior.', 'Prepara una variante nueva de esta pieza.', a.share);
      if (a.share >= R.min_share && a.hook_vs_avg != null && a.hook_vs_avg + 1 >= R.hook_high)
        add('Oportunidad', 'hook-top-' + a.ad_name, '«' + a.ad_name + '» engancha más que el resto', 'El ' + pct1(a.hook_rate) + ' de las impresiones llega a 3 segundos, ' + x1(a.hook_vs_avg + 1) + ' veces la media.', 'Reutiliza su arranque en otras piezas y dale más presupuesto.', a.share);
    }
    const best = aw_ads.filter((a) => a.verdict === 'Funciona').sort((a, b) => a.cost_per_1000_reached - b.cost_per_1000_reached)[0];
    if (best)
      add('Oportunidad', 'mejor-anuncio', '«' + best.ad_name + '» es tu anuncio de alcance más eficiente', cop(best.cost_per_1000_reached) + ' por cada 1.000 personas, un ' + pct(-best.vs_avg) + ' por debajo de la media.', 'Dale más presupuesto o crea variantes con el mismo enfoque.', best.share);

    if (K.share_of_meta != null && K.share_of_meta > R.aw_share_high)
      add('Baja', 'peso', 'El ' + pct(K.share_of_meta) + ' de la inversión en Meta va a awareness', 'Más de la mitad del presupuesto busca alcance y no conversaciones ni ventas.', 'Asegúrate de que hay campañas de conversión con presupuesto para recoger la demanda que generas.', 0);
    if (S.count >= R.small_ads)
      add('Baja', 'residuales', S.count + ' anuncios con menos del 1 % de la inversión de awareness', 'Entre todos suman el ' + pct(S.share) + ' del gasto de awareness.', 'Consolida en menos piezas para que Meta reparta mejor el presupuesto.', S.share);

    return out.sort((a, b) => RANK[a.priority] - RANK[b.priority] || b.weight - a.weight)
      .map((a, i) => ({ id: a.id, order: i + 1, priority: a.priority, title: a.title, detail: a.detail, action: a.action }));
  },
});

dash.calc('aw_alert_count', {
  inputs: ['aw_alerts'],
  title: 'Alertas de awareness por prioridad',
  description: 'Cuántas alertas de awareness hay de cada prioridad.',
  fn: (aw_alerts) => [{
    alta: aw_alerts.filter((a) => a.priority === 'Alta').length,
    media: aw_alerts.filter((a) => a.priority === 'Media').length,
    oportunidad: aw_alerts.filter((a) => a.priority === 'Oportunidad').length,
    baja: aw_alerts.filter((a) => a.priority === 'Baja').length,
  }],
});
