// Facebook page: state against the previous period, weekly trend, own posts and alerts. Thresholds live in fb_rules.
dash.calc('fb_rules', {
  inputs: ['fb_d_cur'],
  title: 'Facebook: umbrales de alertas',
  description: 'Los umbrales fijos con los que se disparan las alertas de la página.',
  fn: (fb_d_cur) => [{
    min_posts_per_week: 1,  // publicaciones propias por semana mínimas
    organic_low: 0.05,      // parte orgánica de las visualizaciones por debajo de la cual se avisa
    drop: 0.2,              // caída de interacción por mil visualizaciones o de visitas
    follows_drop: 0.3,      // caída de seguidores nuevos frente al periodo anterior
  }],
});

dash.calc('fb_kpis2', {
  inputs: ['fb_d_cur', 'fb_d_prev', 'fb_posts', 'fb_profile'],
  title: 'Facebook: resumen frente al periodo anterior',
  description: 'Seguidores, visualizaciones (pagadas y orgánicas), interacciones, seguidores netos, visitas a la página y publicaciones propias, con su variación.',
  fn: (fb_d_cur, fb_d_prev, fb_posts, fb_profile) => {
    const s = (rows, k) => rows.reduce((a, r) => a + (+r[k] || 0), 0);
    const div = (a, b) => (b ? a / b : null);
    const ch = (a, b) => (a != null && b ? a / b - 1 : null);
    const t = (rows) => ({ impr: s(rows, 'page_impressions'), org: s(rows, 'page_impressions_organic'), eng: s(rows, 'page_post_engagements'),
      fol: s(rows, 'page_daily_follows_unique'), unf: s(rows, 'page_daily_unfollows_unique'), views: s(rows, 'page_views_total'), video: s(rows, 'page_video_views'), days: rows.length });
    const c = t(fb_d_cur), p = t(fb_d_prev);
    const epm = div(c.eng * 1000, c.impr), pepm = div(p.eng * 1000, p.impr);
    return [{
      followers: fb_profile.length ? +fb_profile[0].page_follows || null : null,
      impressions: c.impr, impressions_delta: ch(c.impr, p.impr), organic: c.org, organic_share: div(c.org, c.impr), organic_share_prev: div(p.org, p.impr),
      engagements: c.eng, engagements_delta: ch(c.eng, p.eng), engagements_per_1000: epm, engagements_per_1000_delta: ch(epm, pepm),
      new_followers: c.fol, unfollows: c.unf, net_followers: c.fol - c.unf, net_followers_prev: p.fol - p.unf, new_followers_delta: ch(c.fol, p.fol),
      page_views: c.views, page_views_delta: ch(c.views, p.views), video_views: c.video,
      posts: fb_posts.length, posts_per_week: div(fb_posts.length * 7, c.days),
    }];
  },
});

dash.calc('fb_weekly', {
  inputs: ['fb_d_cur'],
  title: 'Facebook por semana',
  description: 'Visualizaciones (pagadas y orgánicas), interacciones y seguidores nuevos por semana, de lunes a domingo.',
  fn: (fb_d_cur) => {
    const monday = (s) => { const d = new Date(String(s).slice(0, 10) + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7)); return d.toISOString().slice(0, 10); };
    const by = new Map();
    for (const r of fb_d_cur) {
      const k = monday(r.date), o = by.get(k) || { date: k, impressions: 0, organic: 0, engagements: 0, new_followers: 0, days: 0 };
      o.impressions += +r.page_impressions || 0; o.organic += +r.page_impressions_organic || 0; o.engagements += +r.page_post_engagements || 0;
      o.new_followers += +r.page_daily_follows_unique || 0; o.days += 1; by.set(k, o);
    }
    return [...by.values()].filter((o) => o.days >= 4).sort((a, b) => (a.date < b.date ? -1 : 1));
  },
});

dash.calc('fb_posts_x', {
  inputs: ['fb_posts'],
  title: 'Publicaciones propias de la página',
  description: 'Publicaciones de la página en el periodo con sus visualizaciones e interacciones por mil visualizaciones.',
  fn: (fb_posts) => fb_posts.map((r) => ({
    post_id: String(r.post_id), date: String(r.post_created_time || '').slice(0, 10), message: r.post_message_oneline || '', permalink: r.permalink_url,
    impressions: +r.post_impressions || 0, organic: +r.post_impressions_organic || 0, engagements: +r.post_engagements || 0,
    engagements_per_1000: +r.post_impressions ? (+r.post_engagements || 0) * 1000 / +r.post_impressions : null,
  })),
});

dash.calc('fb_alerts', {
  inputs: ['fb_kpis2', 'fb_rules'],
  title: 'Alertas de Facebook',
  description: 'Reglas fijas sobre la actividad de la página, su alcance orgánico, la interacción y los seguidores; ordenadas por prioridad.',
  fn: (fb_kpis2, fb_rules) => {
    const R = fb_rules[0], K = fb_kpis2[0] || {};
    const nf = (o) => new Intl.NumberFormat('__LV_LOCALE__', o);
    const int = (v) => nf({ maximumFractionDigits: 0 }).format(v);
    const pct = (v) => nf({ style: 'percent', maximumFractionDigits: 0 }).format(v);
    const pct1 = (v) => nf({ style: 'percent', maximumFractionDigits: 1 }).format(v);
    const x1 = (v) => nf({ maximumFractionDigits: 1 }).format(v);
    const RANK = { 'Alta': 0, 'Media': 1, 'Oportunidad': 2, 'Baja': 3 };
    const out = [];
    const add = (priority, id, title, detail, action) => out.push({ id, priority, title, detail, action });

    if (K.posts === 0)
      add('Alta', 'sin-posts', 'La página no ha publicado nada en el periodo', 'Toda su actividad viene de los anuncios que se muestran con su nombre.', 'Publica en Facebook el mismo contenido de Instagram (Meta Business Suite lo permite a la vez) o asume que la página es solo soporte de anuncios.');
    else if (K.posts_per_week != null && K.posts_per_week < R.min_posts_per_week)
      add('Media', 'pocos-posts', 'Muy pocas publicaciones propias', x1(K.posts_per_week) + ' publicaciones por semana.', 'Programa al menos una publicación semanal, reutilizando contenido de Instagram.');
    if (K.organic_share != null && K.organic_share < R.organic_low)
      add('Media', 'organico', 'Casi todo el alcance es pagado', 'Solo el ' + pct1(K.organic_share) + ' de las visualizaciones de la página son orgánicas.', 'Si se pausan los anuncios, la página deja de verse: tenlo en cuenta al decidir si vale la pena alimentarla.');
    if (K.net_followers != null && K.net_followers < 0)
      add('Alta', 'pierde', 'La página pierde seguidores', int(K.unfollows) + ' bajas frente a ' + int(K.new_followers) + ' altas en el periodo.', 'Revisa si algún anuncio está generando rechazo (comentarios negativos, ocultaciones).');
    else if (K.new_followers_delta != null && K.new_followers_delta < -R.follows_drop)
      add('Media', 'seguidores', 'Llegan menos seguidores nuevos', 'Un ' + pct(-K.new_followers_delta) + ' menos que en el periodo anterior (' + int(K.new_followers) + ' en el periodo).', 'Comprueba si han bajado los anuncios que se muestran en Facebook.');
    if (K.engagements_per_1000_delta != null && K.engagements_per_1000_delta < -R.drop)
      add('Media', 'interaccion', 'Los anuncios enganchan menos en Facebook', 'Interacciones por cada mil visualizaciones: ' + x1(K.engagements_per_1000) + ', un ' + pct(-K.engagements_per_1000_delta) + ' menos que en el periodo anterior.', 'Revisa las creatividades activas en la pestaña Meta · Creatividades.');
    if (K.page_views_delta != null && K.page_views_delta < -R.drop)
      add('Baja', 'visitas', 'Menos visitas a la página', int(K.page_views) + ' visitas, un ' + pct(-K.page_views_delta) + ' menos que en el periodo anterior.', 'Si la página no se cuida, conviene que su información (horarios, web, WhatsApp) siga al día porque la gente aún la visita.');
    return out.sort((a, b) => RANK[a.priority] - RANK[b.priority]).map((a, i) => ({ ...a, order: i + 1 }));
  },
});

dash.calc('fb_alert_count', {
  inputs: ['fb_alerts'],
  title: 'Alertas de Facebook por prioridad',
  description: 'Cuántas alertas de Facebook hay de cada prioridad.',
  fn: (fb_alerts) => [{ alta: fb_alerts.filter((a) => a.priority === 'Alta').length, media: fb_alerts.filter((a) => a.priority === 'Media').length }],
});
