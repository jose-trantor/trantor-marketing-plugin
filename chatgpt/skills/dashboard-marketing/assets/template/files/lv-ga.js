// Web (GA4): overview, trend, funnel, events, products, landing pages, channels, patterns and alerts. Thresholds live in ga_rules.
dash.calc('ga_rules', {
  inputs: ['ga_t_cur'],
  title: 'Web: umbrales de veredictos y alertas',
  description: 'Los umbrales fijos con los que se filtran páginas y productos, se decide cada veredicto y se disparan las alertas de la web.',
  fn: (ga_t_cur) => [{
    drop: 0.15,             // caída de ventas, pedidos o conversión frente al periodo anterior
    step_drop: 0.2,         // caída relativa del paso de un embudo
    event_min: 20,          // eventos mínimos para considerar que un evento existía
    page_min: 50,           // sesiones mínimas para analizar una página de entrada
    product_min: 50,        // vistas mínimas para analizar un producto
    good_ratio: 1.25,       // ≥ 1,25 × la media → Funciona
    bad_ratio: 0.6,         // ≤ 0,6 × la media → No funciona
    gateway_share: 0.3,     // parte de las ventas atribuida a la pasarela de pago
    segment_min_share: 0.05,// parte mínima de las sesiones para comparar un segmento
    channel_drop: 0.3,      // caída de sesiones de un canal
  }],
});

dash.calc('ga_kpis2', {
  inputs: ['ga_t_cur', 'ga_t_prev'],
  title: 'Web: resumen frente al periodo anterior',
  description: 'Ventas, pedidos, conversión, sesiones, usuarios, interacción, ticket medio y tiempo de interacción, con su variación.',
  fn: (ga_t_cur, ga_t_prev) => {
    const t = (rows) => {
      const s = (k) => rows.reduce((a, r) => a + (+r[k] || 0), 0);
      return { sessions: s('sessions'), users: s('totalusers'), engaged: s('engaged_sessions'), purchases: s('ecommerce_purchases'), revenue: s('purchase_revenue'), time: s('user_engagement_duration') };
    };
    const c = t(ga_t_cur), p = t(ga_t_prev);
    const div = (a, b) => (b ? a / b : null);
    const ch = (a, b) => (a != null && b ? a / b - 1 : null);
    const cr = div(c.purchases, c.sessions), pcr = div(p.purchases, p.sessions), er = div(c.engaged, c.sessions), per = div(p.engaged, p.sessions);
    const aov = div(c.revenue, c.purchases), paov = div(p.revenue, p.purchases);
    return [{
      revenue: c.revenue, revenue_prev: p.revenue, revenue_delta: ch(c.revenue, p.revenue),
      purchases: c.purchases, purchases_prev: p.purchases, purchases_delta: ch(c.purchases, p.purchases),
      sessions: c.sessions, sessions_delta: ch(c.sessions, p.sessions), users: c.users, users_delta: ch(c.users, p.users),
      conversion_rate: cr, conversion_rate_prev: pcr, conversion_rate_delta: ch(cr, pcr),
      engagement_rate: er, engagement_rate_delta: ch(er, per), aov, aov_delta: ch(aov, paov),
      engagement_time: div(c.time, c.sessions), engagement_time_delta: ch(div(c.time, c.sessions), div(p.time, p.sessions)),
    }];
  },
});

dash.calc('ga_weekly', {
  inputs: ['ga_d_cur'],
  title: 'Web por semana',
  description: 'Ventas, sesiones, pedidos y conversión por semana, de lunes a domingo.',
  fn: (ga_d_cur) => {
    const monday = (s) => { const d = new Date(String(s).slice(0, 10) + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7)); return d.toISOString().slice(0, 10); };
    const by = new Map();
    for (const r of ga_d_cur) {
      const k = monday(r.date), o = by.get(k) || { date: k, sessions: 0, purchases: 0, revenue: 0, days: 0 };
      o.sessions += +r.sessions || 0; o.purchases += +r.ecommerce_purchases || 0; o.revenue += +r.purchase_revenue || 0; o.days += 1; by.set(k, o);
    }
    return [...by.values()].filter((o) => o.days >= 4).map((o) => ({ ...o, conversion_rate: o.sessions ? o.purchases / o.sessions : null })).sort((a, b) => (a.date < b.date ? -1 : 1));
  },
});

dash.calc('ga_funnel2', {
  inputs: ['ga_ev_cur', 'ga_ev_prev', 'ga_t_cur', 'ga_t_prev'],
  title: 'Embudo de compra',
  description: 'Sesiones y eventos de compra en el periodo y en el anterior, con la proporción de cada paso respecto al anterior y su variación.',
  fn: (ga_ev_cur, ga_ev_prev, ga_t_cur, ga_t_prev) => {
    const ev = (rows, name) => rows.filter((r) => r.event_name === name).reduce((a, r) => a + (+r.event_count || 0), 0);
    const ses = (rows) => rows.reduce((a, r) => a + (+r.sessions || 0), 0);
    const steps = [['1. Sesiones', null], ['2. Ver producto', 'view_item'], ['3. Añadir al carrito', 'add_to_cart'], ['4. Iniciar pago', 'begin_checkout'], ['5. Comprar', 'purchase']];
    const cur = steps.map(([, e]) => (e ? ev(ga_ev_cur, e) : ses(ga_t_cur))), prev = steps.map(([, e]) => (e ? ev(ga_ev_prev, e) : ses(ga_t_prev)));
    return steps.map(([step], i) => {
      const r = i && cur[i - 1] ? cur[i] / cur[i - 1] : null, pr = i && prev[i - 1] ? prev[i] / prev[i - 1] : null;
      return { step, value: cur[i], value_prev: prev[i], value_delta: prev[i] ? cur[i] / prev[i] - 1 : null, step_rate: r, step_rate_prev: pr, step_rate_delta: r != null && pr ? r / pr - 1 : null };
    });
  },
});

dash.calc('ga_events', {
  inputs: ['ga_ev_cur', 'ga_ev_prev', 'ga_rules'],
  title: 'Eventos de la web',
  description: 'Cada evento con su volumen en el periodo y en el anterior, su tipo y su estado (nuevo, desaparecido, sube, baja o estable).',
  fn: (ga_ev_cur, ga_ev_prev, ga_rules) => {
    const R = ga_rules[0];
    const SHOP = ['view_item', 'view_item_list', 'select_item', 'add_to_cart', 'remove_from_cart', 'view_cart', 'begin_checkout', 'add_shipping_info', 'add_payment_info', 'purchase', 'refund'];
    const AUTO = ['page_view', 'session_start', 'first_visit', 'user_engagement'];
    const INTER = ['click', 'scroll', 'form_start', 'form_submit', 'view_search_results', 'file_download', 'video_start', 'video_progress', 'video_complete'];
    const m = new Map();
    for (const r of ga_ev_cur) m.set(r.event_name, { event_name: r.event_name, count: (+r.event_count || 0), count_prev: 0 });
    for (const r of ga_ev_prev) { const o = m.get(r.event_name) || { event_name: r.event_name, count: 0, count_prev: 0 }; o.count_prev += +r.event_count || 0; m.set(r.event_name, o); }
    return [...m.values()].filter((o) => o.count >= R.event_min || o.count_prev >= R.event_min).map((o) => {
      const delta = o.count_prev ? o.count / o.count_prev - 1 : null;
      return { ...o, delta,
        kind: SHOP.includes(o.event_name) ? 'Compra' : AUTO.includes(o.event_name) ? 'Automático' : INTER.includes(o.event_name) ? 'Interacción' : 'Personalizado',
        status: !o.count ? 'Desaparecido' : !o.count_prev ? 'Nuevo' : delta > 0.3 ? 'Sube' : delta < -0.3 ? 'Baja' : 'Estable' };
    }).sort((a, b) => b.count - a.count);
  },
});

dash.calc('ga_products', {
  inputs: ['ga_items_cur', 'ga_rules'],
  title: 'Productos',
  description: 'Productos con un mínimo de vistas o alguna venta: vistas, añadidos al carrito, unidades vendidas, ingresos, tasas y veredicto frente a la media.',
  fn: (ga_items_cur, ga_rules) => {
    const R = ga_rules[0], n = (r, k) => +r[k] || 0;
    const rows = ga_items_cur.filter((r) => n(r, 'items_viewed') >= R.product_min || n(r, 'items_purchased') > 0);
    const tv = rows.reduce((a, r) => a + n(r, 'items_viewed'), 0), tc = rows.reduce((a, r) => a + n(r, 'items_added_to_cart'), 0), trev = rows.reduce((a, r) => a + n(r, 'item_revenue'), 0);
    const avg = tv ? tc / tv : null;
    return rows.map((r) => {
      const v = n(r, 'items_viewed'), c = n(r, 'items_added_to_cart'), rate = v ? c / v : null;
      const verdict = v < R.product_min ? 'Poco tráfico' : !c ? 'No funciona' : rate >= R.good_ratio * avg ? 'Funciona' : rate <= R.bad_ratio * avg ? 'Vigilar' : 'En la media';
      return { item_name: r.item_name, views: v, added: c, purchased: n(r, 'items_purchased'), revenue: n(r, 'item_revenue'), revenue_share: trev ? n(r, 'item_revenue') / trev : 0,
        cart_rate: v ? Math.min(1, c / v) : null, cart_rate_vs_avg: rate != null && avg ? rate / avg - 1 : null, avg_cart_rate: avg, verdict };
    }).sort((a, b) => b.revenue - a.revenue);
  },
});

dash.calc('ga_pages', {
  inputs: ['ga_lp_cur', 'ga_rules'],
  title: 'Páginas de entrada relevantes',
  description: 'Páginas por las que se entra a la web con un mínimo de sesiones, sin las irrelevantes (sin dato, pasarela de pago, legales, checkout y pedidos): interacción, carrito, conversión y veredicto frente a la media.',
  fn: (ga_lp_cur, ga_rules) => {
    const R = ga_rules[0], n = (r, k) => +r[k] || 0;
    const IRRELEVANT = /^\(not set\)$|^\/https?:|documentos-legales|privacy|^\/checkout|^\/pedidos|^\/gracias|^\/cuenta|^\/login/i;
    const rows = ga_lp_cur.filter((r) => !IRRELEVANT.test(r.landing_page || '') && n(r, 'sessions') >= R.page_min);
    const ts = rows.reduce((a, r) => a + n(r, 'sessions'), 0), tp = rows.reduce((a, r) => a + n(r, 'ecommerce_purchases'), 0);
    const avg = ts ? tp / ts : null;
    const label = (p) => (p === '/' ? 'Inicio' : p === '/pedir' ? 'Catálogo (/pedir)' : /^\/pedir\/[^/]+\/(.+)$/.test(p) ? 'Producto: ' + p.replace(/^\/pedir\/[^/]+\//, '').replace(/-/g, ' ') : p);
    return rows.map((r) => {
      const s = n(r, 'sessions'), cr = s ? n(r, 'ecommerce_purchases') / s : null;
      const verdict = !n(r, 'ecommerce_purchases') && !n(r, 'add_to_carts') ? 'No funciona' : cr >= R.good_ratio * avg ? 'Funciona' : cr <= R.bad_ratio * avg ? 'Vigilar' : 'En la media';
      return { landing_page: r.landing_page, page: label(r.landing_page), sessions: s, engagement_rate: s ? n(r, 'engaged_sessions') / s : null,
        cart_rate: s ? n(r, 'add_to_carts') / s : null, purchases: n(r, 'ecommerce_purchases'), conversion_rate: cr, vs_avg: cr != null && avg ? cr / avg - 1 : null, avg_conversion: avg, verdict };
    }).sort((a, b) => b.sessions - a.sessions);
  },
});

dash.calc('ga_channels2', {
  inputs: ['ga_ch_cur', 'ga_ch_prev'],
  title: 'Canales de la web',
  description: 'Cada canal de GA4 con al menos 50 sesiones: sesiones y su variación, interacción, conversión, ventas y parte de las ventas.',
  fn: (ga_ch_cur, ga_ch_prev) => {
    const n = (r, k) => +(r && r[k]) || 0;
    const prev = new Map(ga_ch_prev.map((r) => [r.session_default_channel_group, r]));
    const trev = ga_ch_cur.reduce((a, r) => a + n(r, 'purchase_revenue'), 0), ts = ga_ch_cur.reduce((a, r) => a + n(r, 'sessions'), 0);
    return ga_ch_cur.filter((r) => n(r, 'sessions') >= 50).map((r) => {
      const p = prev.get(r.session_default_channel_group), s = n(r, 'sessions');
      return { channel: r.session_default_channel_group, sessions: s, sessions_share: ts ? s / ts : 0, sessions_delta: n(p, 'sessions') ? s / n(p, 'sessions') - 1 : null,
        engagement_rate: s ? n(r, 'engaged_sessions') / s : null, purchases: n(r, 'ecommerce_purchases'), conversion_rate: s ? n(r, 'ecommerce_purchases') / s : null,
        revenue: n(r, 'purchase_revenue'), revenue_share: trev ? n(r, 'purchase_revenue') / trev : 0 };
    }).sort((a, b) => b.revenue - a.revenue);
  },
});

dash.calc('ga_by_device', {
  inputs: ['ga_seg_cur'],
  title: 'Conversión por dispositivo',
  description: 'Sesiones, parte de las sesiones y conversión por tipo de dispositivo.',
  fn: (ga_seg_cur) => {
    const by = new Map(), ts = ga_seg_cur.reduce((a, r) => a + (+r.sessions || 0), 0);
    const NAMES = { mobile: 'Móvil', desktop: 'Ordenador', tablet: 'Tablet' };
    for (const r of ga_seg_cur) { const k = NAMES[r.devicecategory] || r.devicecategory, g = by.get(k) || { group: k, sessions: 0, purchases: 0 }; g.sessions += +r.sessions || 0; g.purchases += +r.ecommerce_purchases || 0; by.set(k, g); }
    return [...by.values()].map((g) => ({ ...g, share: ts ? g.sessions / ts : 0, conversion_rate: g.sessions ? g.purchases / g.sessions : null })).filter((g) => g.share >= 0.01).sort((a, b) => b.sessions - a.sessions);
  },
});

dash.calc('ga_by_user', {
  inputs: ['ga_seg_cur'],
  title: 'Conversión de nuevos y recurrentes',
  description: 'Sesiones y conversión de usuarios nuevos y recurrentes, en móvil y en ordenador.',
  fn: (ga_seg_cur) => {
    const by = new Map(), ts = ga_seg_cur.reduce((a, r) => a + (+r.sessions || 0), 0);
    const U = { new: 'Nuevos', returning: 'Recurrentes' }, D = { mobile: 'móvil', desktop: 'ordenador' };
    for (const r of ga_seg_cur) {
      if (!U[r.new_vs_returning] || !D[r.devicecategory]) continue;
      const k = U[r.new_vs_returning] + ' · ' + D[r.devicecategory], g = by.get(k) || { group: k, sessions: 0, purchases: 0 };
      g.sessions += +r.sessions || 0; g.purchases += +r.ecommerce_purchases || 0; by.set(k, g);
    }
    return [...by.values()].map((g) => ({ ...g, share: ts ? g.sessions / ts : 0, conversion_rate: g.sessions ? g.purchases / g.sessions : null })).sort((a, b) => b.sessions - a.sessions);
  },
});

dash.calc('ga_by_city', {
  inputs: ['ga_city_cur'],
  title: 'Conversión por ciudad',
  description: 'Sesiones, parte de las sesiones y conversión de las ciudades con más tráfico.',
  fn: (ga_city_cur) => {
    const ts = ga_city_cur.reduce((a, r) => a + (+r.sessions || 0), 0);
    return ga_city_cur.filter((r) => r.city && r.city !== '(not set)').map((r) => ({ group: r.city, sessions: +r.sessions || 0, purchases: +r.ecommerce_purchases || 0,
      share: ts ? (+r.sessions || 0) / ts : 0, conversion_rate: +r.sessions ? (+r.ecommerce_purchases || 0) / +r.sessions : null })).sort((a, b) => b.sessions - a.sessions).slice(0, 5);
  },
});

dash.calc('ga_by_weekday', {
  inputs: ['ga_d_cur'],
  title: 'Conversión por día de la semana',
  description: 'Sesiones medias y conversión según el día de la semana.',
  fn: (ga_d_cur) => {
    const DAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
    const g = DAYS.map((d, i) => ({ group: d, i, sessions: 0, purchases: 0, revenue: 0, days: 0 }));
    for (const r of ga_d_cur) {
      const d = new Date(String(r.date).slice(0, 10) + 'T12:00:00Z'), o = g[(d.getUTCDay() + 6) % 7];
      o.sessions += +r.sessions || 0; o.purchases += +r.ecommerce_purchases || 0; o.revenue += +r.purchase_revenue || 0; o.days += 1;
    }
    return g.filter((o) => o.days).map((o) => ({ group: o.group, sessions_per_day: o.sessions / o.days, revenue_per_day: o.revenue / o.days, conversion_rate: o.sessions ? o.purchases / o.sessions : null }));
  },
});

dash.calc('ga_alerts', {
  inputs: ['ga_kpis2', 'ga_funnel2', 'ga_events', 'ga_products', 'ga_pages', 'ga_channels2', 'ga_by_user', 'ga_by_city', 'ga_src_cur', 'ga_rules'],
  title: 'Alertas de la web',
  description: 'Reglas fijas sobre ventas, embudo, eventos, productos, páginas, canales y segmentos; ordenadas por prioridad.',
  fn: (ga_kpis2, ga_funnel2, ga_events, ga_products, ga_pages, ga_channels2, ga_by_user, ga_by_city, ga_src_cur, ga_rules) => {
    const R = ga_rules[0], K = ga_kpis2[0] || {};
    const nf = (o) => new Intl.NumberFormat('__LV_LOCALE__', o);
    const int = (v) => nf({ maximumFractionDigits: 0 }).format(v);
    const cop = (v) => '__LV_CUR__' + nf({ maximumFractionDigits: 0 }).format(v);
    const pct = (v) => nf({ style: 'percent', maximumFractionDigits: 0 }).format(v);
    const pct1 = (v) => nf({ style: 'percent', maximumFractionDigits: 1 }).format(v);
    const x1 = (v) => nf({ maximumFractionDigits: 1 }).format(v);
    const RANK = { 'Alta': 0, 'Media': 1, 'Oportunidad': 2, 'Baja': 3 };
    const out = [];
    const add = (priority, id, title, detail, action, weight) => out.push({ id, priority, title, detail, action, weight: weight || 0 });

    if (K.revenue_delta != null && K.revenue_delta < -R.drop)
      add('Alta', 'ventas', 'Las ventas web caen un ' + pct(-K.revenue_delta), cop(K.revenue) + ' frente a ' + cop(K.revenue_prev) + ' en el periodo anterior.', 'Mira el embudo: dice en qué paso se pierden.', 1);
    else if (K.purchases_delta != null && K.purchases_delta < -R.drop)
      add('Alta', 'pedidos', 'Los pedidos web caen un ' + pct(-K.purchases_delta), int(K.purchases) + ' frente a ' + int(K.purchases_prev) + ' en el periodo anterior.', 'Mira el embudo: dice en qué paso se pierden.', 1);
    if (K.conversion_rate_delta != null && K.conversion_rate_delta < -R.drop)
      add('Alta', 'conversion', 'La conversión baja un ' + pct(-K.conversion_rate_delta), pct1(K.conversion_rate) + ' de las sesiones terminan en compra, frente al ' + pct1(K.conversion_rate_prev) + '.', 'Revisa si ha cambiado el tráfico (canales) o la web (embudo).', 0.9);
    for (const s of ga_funnel2) {
      if (s.step_rate_delta != null && s.step_rate_delta < -R.step_drop)
        add('Alta', 'paso-' + s.step, 'Se rompe el paso «' + s.step.replace(/^\d\. /, '') + '»', 'Solo el ' + pct(s.step_rate) + ' del paso anterior llega a este, frente al ' + pct(s.step_rate_prev) + ' en el periodo anterior.',
          s.step.includes('Comprar') ? 'Prueba el pago completo en móvil y comprueba que el evento purchase se envía siempre desde la pasarela de pago.' : 'Revisa la web en ese paso (precios, disponibilidad, errores).', 0.8);
    }
    for (const e of ga_events) {
      if (e.status === 'Desaparecido' && e.kind !== 'Personalizado')
        add('Alta', 'ev-' + e.event_name, 'El evento «' + e.event_name + '» ha dejado de registrarse', int(e.count_prev) + ' en el periodo anterior y ninguno en este.', 'Revisa la etiqueta en GTM o la integración de la tienda.', 0.7);
      if (e.status === 'Nuevo' && e.kind === 'Personalizado')
        add('Baja', 'ev-new-' + e.event_name, 'Evento nuevo: «' + e.event_name + '»', int(e.count) + ' registros en el periodo, ninguno antes.', 'Confirma que viene de una herramienta que queréis medir y no ensucia los informes.', 0);
    }
    const gw = ga_src_cur.filter((r) => /getjusto\.com|paypal\.|stripe\.|mercadopago|payu|redsys|wompi|epayco|adyen|klarna|checkout\.shopify|pay\.|pagos?\./i.test(r.session_source_medium || ''));
    const gwRev = gw.reduce((a, r) => a + (+r.purchase_revenue || 0), 0), allRev = ga_src_cur.reduce((a, r) => a + (+r.purchase_revenue || 0), 0);
    if (allRev && gwRev / allRev >= R.gateway_share)
      add('Alta', 'pasarela', 'La pasarela de pago se queda con la atribución', 'El ' + pct(gwRev / allRev) + ' de las ventas se atribuye a la pasarela de pago (' + gw.map((r) => String(r.session_source_medium).split(' / ')[0]).join(', ') + '): se pierde el canal real de esas compras.', 'Añade el dominio de la pasarela a la lista de referencias no deseadas de GA4.', 0.6);
    for (const p of ga_products) {
      if (p.views >= R.product_min && !p.added)
        add('Media', 'prod-' + p.item_name, '«' + p.item_name + '» se ve pero nadie lo añade', int(p.views) + ' vistas y ningún añadido al carrito.', 'Si está agotado o fuera de catálogo, retira su ficha o los enlaces y anuncios que llevan a ella.', p.views / 1e4);
    }
    const bestProd = ga_products.filter((p) => p.views >= R.product_min && p.cart_rate_vs_avg != null && p.cart_rate_vs_avg + 1 >= R.good_ratio).sort((a, b) => b.cart_rate - a.cart_rate)[0];
    if (bestProd)
      add('Oportunidad', 'prod-top', '«' + bestProd.item_name + '» convence a quien lo ve', 'El ' + pct(bestProd.cart_rate) + ' de sus vistas acaba en el carrito, ' + x1(bestProd.cart_rate_vs_avg + 1) + ' veces la media.', 'Dale más visibilidad en la web y en anuncios.', 0.3);
    for (const p of ga_pages) {
      if (p.verdict === 'No funciona' && p.sessions >= 4 * R.page_min)
        add('Media', 'lp-' + p.landing_page, 'Entran en «' + p.page + '» y no compran', int(p.sessions) + ' sesiones sin pedidos ni añadidos al carrito.', 'Comprueba a qué apunta esa página y qué enlaces o anuncios la usan.', p.sessions / 1e4);
    }
    const paid = ga_channels2.find((c) => c.channel === 'Paid Social');
    if (paid && K.conversion_rate && paid.sessions >= 500 && paid.conversion_rate < 0.2 * K.conversion_rate)
      add('Media', 'paid', 'El tráfico de anuncios casi no compra en la web', int(paid.sessions) + ' sesiones de Paid Social con ' + int(paid.purchases) + ' pedidos (' + pct1(paid.conversion_rate) + ').', 'Parte se debe a la atribución de la pasarela; el resto, a que los anuncios llevan a WhatsApp. Unifica los UTM de Meta.', 0.2);
    for (const c of ga_channels2) {
      if (c.sessions_share >= R.segment_min_share && c.sessions_delta != null && c.sessions_delta < -R.channel_drop)
        add('Media', 'canal-' + c.channel, 'Cae el tráfico de ' + c.channel, 'Sesiones un ' + pct(-c.sessions_delta) + ' por debajo del periodo anterior.', 'Revisa qué fuente de ese canal ha bajado.', c.sessions_share);
      if (!['Unassigned', 'Referral', '(not set)'].includes(c.channel) && c.sessions >= 50 && K.conversion_rate && c.conversion_rate >= 1.5 * K.conversion_rate && c.sessions_share < 0.1)
        add('Oportunidad', 'canal-op-' + c.channel, c.channel + ' convierte muy bien con poco tráfico', 'Conversión del ' + pct1(c.conversion_rate) + ', ' + x1(c.conversion_rate / K.conversion_rate) + ' veces la media, con el ' + pct(c.sessions_share) + ' de las sesiones.', 'Explora cómo atraer más tráfico de este canal.', c.sessions_share);
    }
    const mobNew = ga_by_user.find((g) => g.group === 'Nuevos · móvil'), others = ga_by_user.filter((g) => g.group !== 'Nuevos · móvil');
    const otherCr = others.reduce((a, g) => a + g.purchases, 0) / (others.reduce((a, g) => a + g.sessions, 0) || 1);
    if (mobNew && mobNew.share >= 0.3 && otherCr && mobNew.conversion_rate <= R.bad_ratio * otherCr)
      add('Media', 'movil', 'Los nuevos en móvil convierten mucho peor', 'Son el ' + pct(mobNew.share) + ' de las sesiones y compran un ' + pct1(mobNew.conversion_rate) + ', frente al ' + pct1(otherCr) + ' del resto.', 'Revisa la primera visita en móvil: velocidad, selección de ciudad y pago.', mobNew.share);
    const cities = ga_by_city.filter((c) => c.share >= R.segment_min_share);
    const cityCr = cities.reduce((a, c) => a + c.purchases, 0) / (cities.reduce((a, c) => a + c.sessions, 0) || 1);
    for (const c of cities) {
      if (cityCr && c.conversion_rate <= R.bad_ratio * cityCr)
        add('Media', 'ciudad-' + c.group, c.group + ' convierte mucho menos', 'Conversión del ' + pct1(c.conversion_rate) + ' frente al ' + pct1(cityCr) + ' de las ciudades principales, con el ' + pct(c.share) + ' de las sesiones.', 'Comprueba cobertura, disponibilidad y tiempos de entrega en esa ciudad.', c.share);
    }
    return out.sort((a, b) => RANK[a.priority] - RANK[b.priority] || b.weight - a.weight)
      .map((a, i) => ({ id: a.id, order: i + 1, priority: a.priority, title: a.title, detail: a.detail, action: a.action }));
  },
});

dash.calc('ga_alert_count', {
  inputs: ['ga_alerts'],
  title: 'Alertas de la web por prioridad',
  description: 'Cuántas alertas de la web hay de cada prioridad.',
  fn: (ga_alerts) => [{ alta: ga_alerts.filter((a) => a.priority === 'Alta').length, oportunidad: ga_alerts.filter((a) => a.priority === 'Oportunidad').length }],
});
