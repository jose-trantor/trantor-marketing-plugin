// Instagram: account health, trend, best and worst posts, engagement patterns and alerts. Thresholds live in ig_rules.
dash.calc('ig_rules', {
  inputs: ['ig_p_cur'],
  title: 'Instagram: umbrales de patrones y alertas',
  description: 'Los umbrales fijos con los que se clasifican las publicaciones y se disparan las alertas.',
  fn: (ig_p_cur) => [{
    min_reach: 1000,        // publicaciones con menos alcance no cuentan en mejores/peores ni en patrones
    short_caption: 80,      // caracteres: corto ≤ 80
    long_caption: 250,      // largo > 250
    drop: 0.2,              // caída de alcance o de tasa de interacción frente al periodo anterior
    cadence_drop: 0.3,      // caída del ritmo de publicación
    min_per_week: 2,        // publicaciones por semana mínimas
    days_silent: 5,         // días sin publicar
    weak_ratio: 0.75,       // tema con tasa ≤ 0,75 × media → alerta
    strong_ratio: 1.25,     // tema o formato con tasa ≥ 1,25 × media → oportunidad
    viral_ratio: 3,         // post con alcance ≥ 3 × la mediana → oportunidad
    concentration: 0.35,    // un post con más del 35 % del alcance de todas las publicaciones
    top_n: 5,               // mejores y peores publicaciones que se muestran
  }],
});

dash.calc('ig_posts_x', {
  inputs: ['ig_p_cur', 'ig_rules'],
  title: 'Publicaciones clasificadas',
  description: 'Cada publicación con su formato, tema (por palabras de su texto), largo del texto, día de la semana y tasa de interacción (interacciones ÷ alcance).',
  fn: (ig_p_cur, ig_rules) => {
    const R = ig_rules[0];
    const THEMES = [
      ['Tienda / evento', /abrimos|apertura|llegamos a|ya estamos en|nuevo punto|punto f[ií]sico|nos vemos en|feria|festival|nos visitas|visitarnos/i],
      ['Fecha especial', /d[ií]a de (los|las|la|el)|abuelos|madres|pap[aá]|amor y amistad|halloween|navidad|mundial|black friday/i],
      ['Promo / sorteo', /gratis|regal(o|amos)|promo|combo|descuento|obsequio|\$ ?\d|sorteo|comenta (el|tu)|pron[oó]stico/i],
      ['Lanzamiento / sabor', /nuevo|nueva|lanzamiento|drop|edici[oó]n limitada|ya es una realidad|ya est[aá] disponible|se queda/i],
      ['Historia / equipo', /equipo|gracias|coraz[oó]n|historia|detr[aá]s|horas de trabajo|camino|sue[ñn]os|boda|confesiones|emprender/i],
    ];
    const FORMATS = { REELS: 'Reel', VIDEO: 'Reel', CAROUSEL_ALBUM: 'Carrusel', IMAGE: 'Imagen' };
    const DAYS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    const n = (r, k) => +(r && r[k]) || 0;
    return ig_p_cur.map((r) => {
      const cap = r.media_caption || '', reach = n(r, 'media_reach'), eng = n(r, 'media_engagement');
      const d = new Date(String(r.date).slice(0, 10) + 'T12:00:00Z');
      return {
        media_id: String(r.media_id), date: String(r.date).slice(0, 10), caption: cap, permalink: r.media_permalink,
        format: FORMATS[r.media_type] || 'Otro', theme: (THEMES.find(([, re]) => re.test(cap)) || ['Antojo / humor'])[0],
        caption_length: cap.length <= R.short_caption ? 'Corto' : cap.length <= R.long_caption ? 'Medio' : 'Largo',
        weekday: DAYS[d.getUTCDay()], weekday_n: (d.getUTCDay() + 6) % 7,
        reach, views: n(r, 'media_views'), interactions: eng, shares: n(r, 'media_shares'), saves: n(r, 'media_saved'),
        comments: n(r, 'media_total_comments_count'), engagement_rate: reach ? eng / reach : null,
        share_rate: reach ? n(r, 'media_shares') / reach : null, counted: reach >= R.min_reach,
      };
    });
  },
});

dash.calc('ig_kpis2', {
  inputs: ['ig_d_cur', 'ig_d_prev', 'ig_p_cur', 'ig_p_prev', 'ig_profile', 'ig_follows_30d'],
  title: 'Instagram: resumen frente al periodo anterior',
  description: 'Seguidores, alcance medio diario, interacciones, tasa de interacción de las publicaciones y ritmo de publicación, con su variación.',
  fn: (ig_d_cur, ig_d_prev, ig_p_cur, ig_p_prev, ig_profile, ig_follows_30d) => {
    const s = (rows, k) => rows.reduce((a, r) => a + (+r[k] || 0), 0);
    const div = (a, b) => (b ? a / b : null);
    const ch = (a, b) => (a != null && b ? a / b - 1 : null);
    const dc = ig_d_cur.length, dp = ig_d_prev.length;
    const reach = div(s(ig_d_cur, 'reach'), dc), preach = div(s(ig_d_prev, 'reach'), dp);
    const er = div(s(ig_p_cur, 'media_engagement'), s(ig_p_cur, 'media_reach')), per = div(s(ig_p_prev, 'media_engagement'), s(ig_p_prev, 'media_reach'));
    const wk = div(ig_p_cur.length * 7, dc), pwk = div(ig_p_prev.length * 7, dp);
    const last = ig_d_cur.reduce((m, r) => (String(r.date) > m ? String(r.date).slice(0, 10) : m), '');
    const lastPost = ig_p_cur.reduce((m, r) => (String(r.date) > m ? String(r.date).slice(0, 10) : m), '');
    return [{
      followers: ig_profile.length ? +ig_profile[0].followers_count || null : null, new_followers_30d: s(ig_follows_30d, 'follower_count_1d'),
      reach_avg: reach, reach_delta: ch(reach, preach),
      interactions: s(ig_d_cur, 'total_interactions'), interactions_delta: ch(s(ig_d_cur, 'total_interactions'), s(ig_d_prev, 'total_interactions')),
      engagement_rate: er, engagement_rate_prev: per, engagement_rate_delta: ch(er, per),
      posts: ig_p_cur.length, posts_per_week: wk, posts_per_week_prev: pwk, posts_per_week_delta: ch(wk, pwk),
      non_follower_share: div(s(ig_d_cur, 'reach_non_followers'), s(ig_d_cur, 'reach_followers') + s(ig_d_cur, 'reach_non_followers')),
      days_since_post: last && lastPost ? Math.round((Date.parse(last) - Date.parse(lastPost)) / 864e5) : null,
    }];
  },
});

dash.calc('ig_weekly', {
  inputs: ['ig_d_cur', 'ig_p_cur'],
  title: 'Instagram por semana',
  description: 'Alcance (suma diaria), interacciones y publicaciones por semana, de lunes a domingo.',
  fn: (ig_d_cur, ig_p_cur) => {
    const monday = (s) => { const d = new Date(String(s).slice(0, 10) + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7)); return d.toISOString().slice(0, 10); };
    const by = new Map();
    for (const r of ig_d_cur) {
      const k = monday(r.date), o = by.get(k) || { date: k, reach: 0, interactions: 0, posts: 0, days: 0 };
      o.reach += +r.reach || 0; o.interactions += +r.total_interactions || 0; o.days += 1; by.set(k, o);
    }
    for (const p of ig_p_cur) { const o = by.get(monday(p.date)); if (o) o.posts += 1; }
    return [...by.values()].filter((o) => o.days >= 4).sort((a, b) => (a.date < b.date ? -1 : 1));
  },
});

dash.calc('ig_best', {
  inputs: ['ig_posts_x', 'ig_rules'],
  title: 'Publicaciones que mejor funcionaron',
  description: 'Las publicaciones con mayor tasa de interacción del periodo, entre las que superan el alcance mínimo.',
  fn: (ig_posts_x, ig_rules) => ig_posts_x.filter((p) => p.counted).sort((a, b) => b.engagement_rate - a.engagement_rate).slice(0, ig_rules[0].top_n),
});

dash.calc('ig_worst', {
  inputs: ['ig_posts_x', 'ig_rules'],
  title: 'Publicaciones que peor funcionaron',
  description: 'Las publicaciones con menor tasa de interacción del periodo, entre las que superan el alcance mínimo.',
  fn: (ig_posts_x, ig_rules) => ig_posts_x.filter((p) => p.counted).sort((a, b) => a.engagement_rate - b.engagement_rate).slice(0, ig_rules[0].top_n),
});

dash.calc('ig_by_format', {
  inputs: ['ig_posts_x'],
  title: 'Interacción por formato',
  description: 'Tasa de interacción (interacciones ÷ alcance), alcance medio y número de publicaciones por formato.',
  fn: (ig_posts_x) => {
    const rows = ig_posts_x.filter((p) => p.counted), by = new Map();
    for (const p of rows) { const g = by.get(p.format) || { group: p.format, posts: 0, reach: 0, interactions: 0, shares: 0 }; g.posts += 1; g.reach += p.reach; g.interactions += p.interactions; g.shares += p.shares; by.set(p.format, g); }
    return [...by.values()].map((g) => ({ ...g, share_of_posts: g.posts / rows.length, engagement_rate: g.reach ? g.interactions / g.reach : null, reach_per_post: g.reach / g.posts, share_rate: g.reach ? g.shares / g.reach : null }))
      .sort((a, b) => b.engagement_rate - a.engagement_rate);
  },
});

dash.calc('ig_by_theme', {
  inputs: ['ig_posts_x'],
  title: 'Interacción por tema',
  description: 'Tasa de interacción, alcance medio y número de publicaciones por tema (según palabras del texto).',
  fn: (ig_posts_x) => {
    const rows = ig_posts_x.filter((p) => p.counted), by = new Map();
    for (const p of rows) { const g = by.get(p.theme) || { group: p.theme, posts: 0, reach: 0, interactions: 0, shares: 0 }; g.posts += 1; g.reach += p.reach; g.interactions += p.interactions; g.shares += p.shares; by.set(p.theme, g); }
    return [...by.values()].map((g) => ({ ...g, share_of_posts: g.posts / rows.length, engagement_rate: g.reach ? g.interactions / g.reach : null, reach_per_post: g.reach / g.posts, share_rate: g.reach ? g.shares / g.reach : null }))
      .sort((a, b) => b.engagement_rate - a.engagement_rate);
  },
});

dash.calc('ig_by_length', {
  inputs: ['ig_posts_x'],
  title: 'Interacción por largo del texto',
  description: 'Tasa de interacción y alcance medio según el largo del texto de la publicación.',
  fn: (ig_posts_x) => {
    const rows = ig_posts_x.filter((p) => p.counted), by = new Map();
    for (const p of rows) { const g = by.get(p.caption_length) || { group: p.caption_length, posts: 0, reach: 0, interactions: 0 }; g.posts += 1; g.reach += p.reach; g.interactions += p.interactions; by.set(p.caption_length, g); }
    const order = { 'Corto': 0, 'Medio': 1, 'Largo': 2 };
    return [...by.values()].map((g) => ({ ...g, engagement_rate: g.reach ? g.interactions / g.reach : null, reach_per_post: g.reach / g.posts })).sort((a, b) => order[a.group] - order[b.group]);
  },
});

dash.calc('ig_by_day', {
  inputs: ['ig_posts_x'],
  title: 'Interacción por día de publicación',
  description: 'Tasa de interacción y alcance medio según el día de la semana en que se publicó.',
  fn: (ig_posts_x) => {
    const rows = ig_posts_x.filter((p) => p.counted), by = new Map();
    for (const p of rows) { const g = by.get(p.weekday) || { group: p.weekday, n: p.weekday_n, posts: 0, reach: 0, interactions: 0 }; g.posts += 1; g.reach += p.reach; g.interactions += p.interactions; by.set(p.weekday, g); }
    return [...by.values()].map((g) => ({ group: g.group, posts: g.posts, engagement_rate: g.reach ? g.interactions / g.reach : null, reach_per_post: g.reach / g.posts, n: g.n })).sort((a, b) => a.n - b.n);
  },
});

dash.calc('ig_alerts', {
  inputs: ['ig_kpis2', 'ig_posts_x', 'ig_by_theme', 'ig_by_format', 'ig_rules'],
  title: 'Alertas de Instagram',
  description: 'Reglas fijas sobre la cuenta, el ritmo de publicación y los patrones de contenido; ordenadas por prioridad.',
  fn: (ig_kpis2, ig_posts_x, ig_by_theme, ig_by_format, ig_rules) => {
    const R = ig_rules[0], K = ig_kpis2[0] || {};
    const nf = (o) => new Intl.NumberFormat('__LV_LOCALE__', o);
    const int = (v) => nf({ maximumFractionDigits: 0 }).format(v);
    const pct = (v) => nf({ style: 'percent', maximumFractionDigits: 0 }).format(v);
    const pct1 = (v) => nf({ style: 'percent', maximumFractionDigits: 1 }).format(v);
    const x1 = (v) => nf({ maximumFractionDigits: 1 }).format(v);
    const short = (t) => { const s = String(t || '').split('\n')[0].trim(); return s.length > 60 ? s.slice(0, 57) + '…' : s || '(sin texto)'; };
    const RANK = { 'Alta': 0, 'Media': 1, 'Oportunidad': 2, 'Baja': 3 };
    const out = [];
    const add = (priority, id, title, detail, action, weight) => out.push({ id, priority, title, detail, action, weight: weight || 0 });
    const posts = ig_posts_x.filter((p) => p.counted);
    const avgEr = K.engagement_rate;

    if (K.reach_delta != null && K.reach_delta < -R.drop)
      add('Alta', 'alcance', 'El alcance cae un ' + pct(-K.reach_delta), 'La cuenta llega de media a ' + int(K.reach_avg) + ' cuentas al día, menos que en el periodo anterior.', 'Revisa el ritmo de publicación y si se han pausado anuncios que promocionaban el perfil.', 1);
    if (K.engagement_rate_delta != null && K.engagement_rate_delta < -R.drop)
      add('Alta', 'tasa', 'Las publicaciones enganchan un ' + pct(-K.engagement_rate_delta) + ' menos', 'Tasa de interacción del ' + pct1(K.engagement_rate) + ' frente al ' + pct1(K.engagement_rate_prev) + ' del periodo anterior.', 'Mira qué temas y formatos han ganado peso en los patrones de abajo.', 1);
    if (K.days_since_post != null && K.days_since_post >= R.days_silent)
      add('Media', 'silencio', K.days_since_post + ' días sin publicar', 'La última publicación del periodo es de hace ' + K.days_since_post + ' días.', 'Retoma la publicación: el alcance orgánico cae cuando la cuenta se detiene.', 1);
    if (K.posts_per_week != null && (K.posts_per_week < R.min_per_week || (K.posts_per_week_delta != null && K.posts_per_week_delta < -R.cadence_drop)))
      add('Media', 'ritmo', 'Se publica menos: ' + x1(K.posts_per_week) + ' publicaciones por semana', K.posts_per_week_prev ? 'En el periodo anterior eran ' + x1(K.posts_per_week_prev) + ' por semana.' : 'Por debajo del mínimo recomendado.', 'Planifica un calendario fijo de publicaciones.', 0.5);
    for (const t of ig_by_theme) {
      if (avgEr && t.posts >= 3 && t.engagement_rate <= R.weak_ratio * avgEr && t.share_of_posts >= 0.2)
        add('Media', 'tema-flojo-' + t.group, 'Mucho «' + t.group + '» que engancha poco', 'Es el ' + pct(t.share_of_posts) + ' de las publicaciones y su tasa de interacción (' + pct1(t.engagement_rate) + ') está por debajo de la media (' + pct1(avgEr) + ').', 'Reduce su peso o cambia el enfoque de esas piezas.', t.share_of_posts);
      if (avgEr && t.posts >= 2 && t.engagement_rate >= R.strong_ratio * avgEr)
        add('Oportunidad', 'tema-fuerte-' + t.group, '«' + t.group + '» engancha más que el resto', 'Tasa de interacción del ' + pct1(t.engagement_rate) + ', ' + x1(t.engagement_rate / avgEr) + ' veces la media, en ' + t.posts + ' publicaciones.', 'Publica más contenido de este tipo.', t.share_of_posts);
    }
    const fmts = ig_by_format.filter((f) => f.posts >= 2);
    if (fmts.length >= 2 && avgEr) {
      const best = fmts[0];
      if (best.engagement_rate >= R.strong_ratio * avgEr && best.share_of_posts < 0.35)
        add('Oportunidad', 'formato', 'El formato ' + best.group.toLowerCase() + ' rinde más y se usa poco', 'Tasa de interacción del ' + pct1(best.engagement_rate) + ' con solo el ' + pct(best.share_of_posts) + ' de las publicaciones.', 'Dale más peso en el calendario.', best.share_of_posts);
    }
    if (posts.length >= 4) {
      const sorted = posts.map((p) => p.reach).sort((a, b) => a - b), med = sorted[Math.floor(sorted.length / 2)];
      const total = posts.reduce((a, p) => a + p.reach, 0);
      const top = posts.slice().sort((a, b) => b.reach - a.reach)[0];
      if (med && top.reach >= R.viral_ratio * med)
        add('Oportunidad', 'viral', 'Una publicación despegó: «' + short(top.caption) + '»', int(top.reach) + ' cuentas alcanzadas, ' + x1(top.reach / med) + ' veces la mediana del periodo.', 'Analiza qué la hizo distinta y haz una variación.', top.reach / total);
      if (total && top.reach / total > R.concentration)
        add('Media', 'concentracion', 'El alcance depende de una sola publicación', 'Se lleva el ' + pct(top.reach / total) + ' del alcance de todas las publicaciones del periodo.', 'Sin ella el alcance sería mucho menor: no lo tomes como la tendencia normal.', 0.4);
    }
    const ghost = ig_posts_x.filter((p) => !p.counted);
    if (ghost.length >= 2)
      add('Baja', 'fantasma', ghost.length + ' publicaciones casi no se vieron', 'Tienen menos de ' + int(R.min_reach) + ' cuentas alcanzadas; no cuentan en los patrones.', 'Comprueba si eran pruebas, duplicados o publicaciones a deshoras.', 0);

    return out.sort((a, b) => RANK[a.priority] - RANK[b.priority] || b.weight - a.weight)
      .map((a, i) => ({ id: a.id, order: i + 1, priority: a.priority, title: a.title, detail: a.detail, action: a.action }));
  },
});

dash.calc('ig_alert_count', {
  inputs: ['ig_alerts'],
  title: 'Alertas de Instagram por prioridad',
  description: 'Cuántas alertas de Instagram hay de cada prioridad.',
  fn: (ig_alerts) => [{
    alta: ig_alerts.filter((a) => a.priority === 'Alta').length,
    media: ig_alerts.filter((a) => a.priority === 'Media').length,
    oportunidad: ig_alerts.filter((a) => a.priority === 'Oportunidad').length,
  }],
});
