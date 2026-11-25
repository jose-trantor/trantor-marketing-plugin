// Meta creatives: every ad is classified by fixed rules (concept from its name, destination from its button,
// format from its media, copy length from its text) and the groups are compared on live results.
dash.calc('cr_base', {
  inputs: ['cr_ads'],
  title: 'Anuncios clasificados',
  description: 'Cada anuncio con su tipo de resultado, concepto (por palabras de su nombre), destino (por su botón), formato y largo del copy, y sus resultados.',
  fn: (cr_ads) => {
    const MSG = 'actions_onsite_conversion_messaging_conversation_started_7d';
    const SALES = ['OUTCOME_SALES', 'OUTCOME_LEADS', 'CONVERSIONS', 'MESSAGES', 'LEAD_GENERATION'];
    const CONCEPTS = [
      ['Humor / meme', /meme/i],
      ['Textura (food porn)', /food ?porn/i],
      ['Reseñas', /review|rese[ñn]a/i],
      ['Tienda / apertura', /tienda|local|apertura|inauguraci|visítanos|ven a conocernos/i],
      ['Evento', /feria|festival|evento/i],
      ['Regalo / ocasión', /regalo|reuni|madres|padres|halloween|navidad|black ?friday|amor|mundial/i],
      ['Formatos / precio', /tama[ñn]os|precio|formatos|carrusel/i],
      ['Producto / sabor', /producto|sabor|nuevo|lanzamiento|colecci/i],
    ];
    const n = (r, k) => +(r && r[k]) || 0;
    const ads = new Map();
    for (const r of cr_ads) {
      const k = r.account_name + '|' + r.ad_name;
      const a = ads.get(k) || { account_name: r.account_name, ad_name: r.ad_name, campaign: r.campaign, objective: r.campaign_objective,
        body: '', cta: null, media: null, spend: 0, impressions: 0, reach: 0, link_clicks: 0, lpv: 0, conversations: 0, purchases: 0, v3: 0, thru: 0 };
      a.spend += n(r, 'spend'); a.impressions += n(r, 'impressions'); a.reach += n(r, 'reach'); a.link_clicks += n(r, 'link_clicks');
      a.lpv += n(r, 'actions_landing_page_view'); a.conversations += n(r, MSG); a.purchases += n(r, 'actions_purchase');
      a.v3 += n(r, 'actions_video_view'); a.thru += n(r, 'video_thruplay_watched_actions_video_view');
      if (r.body && r.body.length > a.body.length) a.body = r.body;
      a.cta = a.cta || r.call_to_action_type || null; a.media = a.media || r.effective_instagram_media__media_type || null;
      ads.set(k, a);
    }
    const camp = new Map();
    for (const a of ads.values()) {
      const k = a.account_name + '|' + a.campaign, c = camp.get(k) || { lpv: 0, msg: 0 };
      c.lpv += a.lpv; c.msg += a.conversations; camp.set(k, c);
    }
    return [...ads.values()].map((a) => {
      const c = camp.get(a.account_name + '|' + a.campaign);
      const type = ['OUTCOME_TRAFFIC', 'LINK_CLICKS'].includes(a.objective) ? 'Tráfico'
        : SALES.includes(a.objective) ? (c.lpv > c.msg ? 'Venta web' : 'Mensajes') : 'Alcance';
      const concept = (CONCEPTS.find(([, re]) => re.test(a.ad_name)) || ['Otro'])[0];
      const destination = a.cta === 'WHATSAPP_MESSAGE' ? 'WhatsApp' : a.cta === 'INSTAGRAM_MESSAGE' ? 'Instagram Direct'
        : a.cta === 'MESSAGE_PAGE' ? 'Messenger' : a.cta === 'VIEW_INSTAGRAM_PROFILE' ? 'Perfil de Instagram'
        : a.cta ? 'Web' : /whats ?app|\bWA\b/i.test(a.ad_name) ? 'WhatsApp' : /ig direct/i.test(a.ad_name) ? 'Instagram Direct' : 'Sin botón';
      const format = a.media === 'VIDEO' || (!a.media && a.v3 > 0) ? 'Vídeo' : a.media === 'CAROUSEL_ALBUM' ? 'Carrusel' : a.media === 'IMAGE' ? 'Imagen' : 'Sin dato';
      const len = a.body.length;
      const copy_length = !len ? 'Sin copy' : len <= 120 ? 'Corto (≤120 caracteres)' : len <= 280 ? 'Medio (121–280)' : 'Largo (>280)';
      return {
        account_name: a.account_name, ad_name: a.ad_name, type, concept, destination, format, copy_length, copy: a.body,
        spend: a.spend, impressions: a.impressions, reach: a.reach, link_clicks: a.link_clicks, landing_page_views: a.lpv,
        conversations: a.conversations, purchases: a.purchases, video_3s: a.v3, thruplays: a.thru,
        results: type === 'Mensajes' ? a.conversations : type === 'Venta web' ? a.purchases : type === 'Tráfico' ? a.lpv : a.reach,
      };
    });
  },
});

dash.calc('cr_msg_dest', {
  inputs: ['cr_base'],
  title: 'WhatsApp frente a Instagram Direct',
  description: 'Para cada concepto creativo con anuncios hacia los dos destinos, coste por conversación en WhatsApp y en Instagram Direct, y cuántas veces más cuesta Instagram Direct. Solo conceptos con al menos el 2 % de la inversión de mensajes en cada destino.',
  fn: (cr_base) => {
    const rows = cr_base.filter((a) => a.type === 'Mensajes' && (a.destination === 'WhatsApp' || a.destination === 'Instagram Direct'));
    const by = new Map();
    for (const a of rows) {
      const g = by.get(a.concept) || { concept: a.concept, wa_spend: 0, wa_conv: 0, ig_spend: 0, ig_conv: 0 };
      if (a.destination === 'WhatsApp') { g.wa_spend += a.spend; g.wa_conv += a.conversations; } else { g.ig_spend += a.spend; g.ig_conv += a.conversations; }
      by.set(a.concept, g);
    }
    const total = cr_base.filter((a) => a.type === 'Mensajes').reduce((t, a) => t + a.spend, 0);
    return [...by.values()].filter((g) => g.wa_conv && g.ig_conv && Math.min(g.wa_spend, g.ig_spend) >= 0.02 * total).map((g) => ({
      concept: g.concept, wa_spend: g.wa_spend, wa_conversations: g.wa_conv, wa_cost: g.wa_spend / g.wa_conv,
      ig_spend: g.ig_spend, ig_conversations: g.ig_conv, ig_cost: g.ig_spend / g.ig_conv,
      ig_vs_wa: (g.ig_spend / g.ig_conv) / (g.wa_spend / g.wa_conv),
    })).sort((a, b) => b.wa_spend + b.ig_spend - a.wa_spend - a.ig_spend);
  },
});

dash.calc('cr_msg_concept', {
  inputs: ['cr_base'],
  title: 'Conversaciones por concepto creativo',
  description: 'Anuncios de campañas de mensajes agrupados por concepto (según su nombre), con coste por conversación, enganche y retención del vídeo. Solo grupos con al menos el 2 % de la inversión.',
  fn: (cr_base) => {
    const rows = cr_base.filter((a) => a.type === 'Mensajes');
    const total = rows.reduce((s, a) => s + a.spend, 0);
    const by = new Map();
    for (const a of rows) {
      const g = by.get(a.concept) || { group: a.concept, ads: 0, spend: 0, conversations: 0, impressions: 0, video_3s: 0, thruplays: 0 };
      g.ads += 1; g.spend += a.spend; g.conversations += a.conversations; g.impressions += a.impressions; g.video_3s += a.video_3s; g.thruplays += a.thruplays;
      by.set(a.concept, g);
    }
    return [...by.values()].map((g) => ({ group: g.group, ads: g.ads, spend: g.spend, share: total ? g.spend / total : 0, conversations: g.conversations,
      cost_per_result: g.conversations ? g.spend / g.conversations : null, hook_rate: g.video_3s && g.impressions ? g.video_3s / g.impressions : null,
      retention: g.video_3s ? g.thruplays / g.video_3s : null }))
      .filter((g) => g.share >= 0.02).sort((a, b) => (a.cost_per_result ?? Infinity) - (b.cost_per_result ?? Infinity));
  },
});

dash.calc('cr_msg_format', {
  inputs: ['cr_base'],
  title: 'Conversaciones por formato',
  description: 'Anuncios de campañas de mensajes agrupados por formato (vídeo, carrusel, imagen), con su coste por conversación. Solo grupos con al menos el 2 % de la inversión.',
  fn: (cr_base) => {
    const rows = cr_base.filter((a) => a.type === 'Mensajes');
    const total = rows.reduce((s, a) => s + a.spend, 0);
    const by = new Map();
    for (const a of rows) {
      const g = by.get(a.format) || { group: a.format, ads: 0, spend: 0, conversations: 0 };
      g.ads += 1; g.spend += a.spend; g.conversations += a.conversations; by.set(a.format, g);
    }
    return [...by.values()].map((g) => ({ ...g, share: total ? g.spend / total : 0, cost_per_result: g.conversations ? g.spend / g.conversations : null }))
      .filter((g) => g.share >= 0.02).sort((a, b) => (a.cost_per_result ?? Infinity) - (b.cost_per_result ?? Infinity));
  },
});

dash.calc('cr_msg_length', {
  inputs: ['cr_base'],
  title: 'Conversaciones por largo del copy',
  description: 'Anuncios de campañas de mensajes agrupados por la longitud del texto principal, con su coste por conversación. Solo grupos con al menos el 2 % de la inversión.',
  fn: (cr_base) => {
    const rows = cr_base.filter((a) => a.type === 'Mensajes');
    const total = rows.reduce((s, a) => s + a.spend, 0);
    const by = new Map();
    for (const a of rows) {
      const g = by.get(a.copy_length) || { group: a.copy_length, ads: 0, spend: 0, conversations: 0 };
      g.ads += 1; g.spend += a.spend; g.conversations += a.conversations; by.set(a.copy_length, g);
    }
    return [...by.values()].map((g) => ({ ...g, share: total ? g.spend / total : 0, cost_per_result: g.conversations ? g.spend / g.conversations : null }))
      .filter((g) => g.share >= 0.02).sort((a, b) => (a.cost_per_result ?? Infinity) - (b.cost_per_result ?? Infinity));
  },
});

dash.calc('cr_aw_concept', {
  inputs: ['cr_base'],
  title: 'Awareness por concepto creativo',
  description: 'Anuncios de campañas de alcance agrupados por concepto, con coste por 1.000 personas alcanzadas, enganche de vídeo y CTR. Solo grupos con al menos el 2 % de la inversión.',
  fn: (cr_base) => {
    const rows = cr_base.filter((a) => a.type === 'Alcance');
    const total = rows.reduce((s, a) => s + a.spend, 0);
    const by = new Map();
    for (const a of rows) {
      const g = by.get(a.concept) || { group: a.concept, ads: 0, spend: 0, reach: 0, impressions: 0, link_clicks: 0, video_3s: 0, video_impressions: 0 };
      g.ads += 1; g.spend += a.spend; g.reach += a.reach; g.impressions += a.impressions; g.link_clicks += a.link_clicks;
      if (a.format === 'Vídeo') { g.video_3s += a.video_3s; g.video_impressions += a.impressions; }
      by.set(a.concept, g);
    }
    return [...by.values()].map((g) => ({ group: g.group, ads: g.ads, spend: g.spend, share: total ? g.spend / total : 0, reach: g.reach,
      cost_per_result: g.reach ? g.spend * 1000 / g.reach : null, hook_rate: g.video_impressions ? g.video_3s / g.video_impressions : null,
      ctr: g.impressions ? g.link_clicks / g.impressions : null }))
      .filter((g) => g.share >= 0.02).sort((a, b) => (a.cost_per_result ?? Infinity) - (b.cost_per_result ?? Infinity));
  },
});

dash.calc('cr_web', {
  inputs: ['cr_base'],
  title: 'Venta web: anuncio frente a web',
  description: 'Para los anuncios de campañas de venta web: si el anuncio engancha y consigue clics, y cuántas visitas acaban en compra.',
  fn: (cr_base) => {
    const rows = cr_base.filter((a) => a.type === 'Venta web');
    const s = (k) => rows.reduce((t, a) => t + (+a[k] || 0), 0);
    const vi = rows.filter((a) => a.format === 'Vídeo').reduce((t, a) => t + a.impressions, 0);
    return [{
      spend: s('spend'), impressions: s('impressions'), link_clicks: s('link_clicks'), landing_page_views: s('landing_page_views'), purchases: s('purchases'),
      ctr: s('impressions') ? s('link_clicks') / s('impressions') : null,
      hook_rate: vi ? rows.filter((a) => a.format === 'Vídeo').reduce((t, a) => t + a.video_3s, 0) / vi : null,
      visit_to_purchase: s('landing_page_views') ? s('purchases') / s('landing_page_views') : null,
    }];
  },
});

dash.calc('cr_pieces', {
  inputs: ['cr_base'],
  title: 'Piezas con su clasificación',
  description: 'Anuncios con al menos el 1 % de la inversión de su tipo, con concepto, formato, destino, copy y coste por resultado frente a la media de su tipo.',
  fn: (cr_base) => {
    const tot = {}, res = {};
    for (const a of cr_base) { tot[a.type] = (tot[a.type] || 0) + a.spend; res[a.type] = (res[a.type] || 0) + a.results; }
    const cost = (sp, r, t) => (r ? (t === 'Alcance' ? sp * 1000 / r : sp / r) : null);
    return cr_base.filter((a) => tot[a.type] && a.spend / tot[a.type] >= 0.01).map((a) => {
      const c = cost(a.spend, a.results, a.type), avg = cost(tot[a.type], res[a.type], a.type);
      return { account_name: a.account_name, ad_name: a.ad_name, type: a.type, concept: a.concept, format: a.format, destination: a.destination,
        copy: a.copy, spend: a.spend, cost_per_result: c, vs_type: c != null && avg ? c / avg - 1 : null,
        hook_rate: a.format === 'Vídeo' && a.impressions ? a.video_3s / a.impressions : null };
    });
  },
});
