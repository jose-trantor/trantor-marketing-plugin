// Read manifest.json from the files collection to control which tabs are visible.
// If the fetch fails or the manifest is absent, all tabs remain visible (fallback = monolithic behavior).
// 'cobertura' (Fuentes y método) is always visible — it documents all connectors, not area-specific data.
(function () {
  var ALWAYS_VISIBLE = ['cobertura'];
  fetch('manifest.json')
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function (manifest) {
      if (!manifest || !Array.isArray(manifest.installed_tabs)) return;
      var tabs = manifest.installed_tabs;
      // Hide resumen unless 2+ distinct source areas are installed.
      // Meta contributes 3 tab names (meta/awareness/creatividades) but counts as 1 area.
      var AREA_GROUP = { meta: 'meta', awareness: 'meta', creatividades: 'meta', instagram: 'instagram', facebook: 'facebook', web: 'web' };
      var areaCount = new Set(tabs.map(function (t) { return AREA_GROUP[t]; }).filter(Boolean)).size;
      if (areaCount < 2) tabs = tabs.filter(function (t) { return t !== 'resumen'; });
      document.querySelectorAll('button[data-tab]').forEach(function (btn) {
        var name = btn.getAttribute('data-tab');
        if (ALWAYS_VISIBLE.indexOf(name) !== -1) return;
        if (tabs.indexOf(name) === -1) {
          btn.setAttribute('hidden', '');
          var section = document.getElementById(name);
          if (section) section.setAttribute('hidden', '');
        }
      });
      // If the active tab was hidden, switch to the first visible tab button
      var active = document.querySelector('button[data-tab][aria-selected="true"]:not([hidden])');
      if (!active) {
        var first = document.querySelector('button[data-tab]:not([hidden])');
        if (first) first.click();
      }
    })
    .catch(function () { /* fallback: show all tabs */ });
}());

// Trantor meta_insights answers {rows, columns, cut} (with include_creative, also creatives: {ad_id: {body, media_type}}): one row per Meta object (and per day with time_increment "1"),
// actions already flattened as actions_<type> / action_values_<type>; other action lists (video_thruplay_watched_actions)
// arrive as [{action_type, value}] and are flattened here the same way. The rows are renamed to the names the Meta calcs use
// (campaign, campaign_objective, link_clicks, date; with include_creative, the creative's body, call to action and media
// type as body, call_to_action_type and effective_instagram_media__media_type) and rows that share the same names are merged, so two ads with the
// same name count as one, as they did before.
for (const id of ['m_acc_cur', 'm_acc_prev', 'm_camp_cur', 'm_camp_prev', 'm_ads_cur', 'm_ads_prev', 'm_daily', 'aw_camp_cur', 'aw_camp_prev', 'aw_camp_7d', 'aw_ads_cur', 'aw_ads_prev', 'aw_daily', 'cr_ads']) {
  dash.loader(id, {
    description: 'Las filas de Trantor (campo rows) con los nombres de siempre: campaign, campaign_objective, link_clicks y date; el creativo (con include_creative) como body, call_to_action_type y effective_instagram_media__media_type; las listas de acciones (como las reproducciones completas) se aplanan en <campo>_<tipo>; las filas con el mismo nombre de cuenta, campaña, anuncio y día se suman, y se descartan las que no tienen inversión.',
    fn: async ({ answer, args }) => {
      let a = answer;
      if (typeof a === 'string') {
        try { a = JSON.parse(a); } catch (e) { throw new Error(a.slice(0, 300)); }
      }
      if (a && (a.error || a.detail)) throw new Error(String(a.error || a.detail));
      if (!a || !Array.isArray(a.rows)) throw new Error('Trantor no devolvió filas.');
      if (a.cut) throw new Error('Trantor ha recortado la respuesta; elige un periodo más corto.');
      const daily = String(args && args.time_increment) === '1';
      const KEYS = ['account_name', 'campaign', 'campaign_objective', 'ad_name', 'date'];
      const cre = new Map(Object.entries(a.creatives || {}).map(([k, v]) => [String(Number(k)), v]));
      const by = new Map();
      for (const r of a.rows) {
        const row = {};
        const c = r.ad_id != null ? cre.get(String(Number(r.ad_id))) : null;
        if (c) {
          row.body = c.body ?? null;
          row.call_to_action_type = c.call_to_action_type ?? null;
          row.effective_instagram_media__media_type = c.media_type === 'CAROUSEL' ? 'CAROUSEL_ALBUM' : c.media_type ?? null;
        }
        for (const [k, v] of Object.entries(r)) {
          if (k === 'campaign_name') row.campaign = v;
          else if (k === 'objective') row.campaign_objective = v;
          else if (k === 'inline_link_clicks') row.link_clicks = v;
          else if (k === 'date_start') { if (daily) row.date = v; }
          else if (k === 'date_stop' || k === 'account_id' || k === 'ad_id' || k === 'creative_object_story_spec') continue;
          else if (k === 'creative_body') row.body = v;
          else if (k === 'creative_call_to_action_type') row.call_to_action_type = v;
          else if (k === 'creative_media_type') row.effective_instagram_media__media_type = v === 'CAROUSEL' ? 'CAROUSEL_ALBUM' : v;
          else if (Array.isArray(v)) { for (const x of v) if (x && x.action_type) row[k + '_' + x.action_type] = +x.value || 0; }
          else row[k] = v;
        }
        if (!(+row.spend > 0)) continue;
        const key = KEYS.map((k) => row[k] ?? '').join('|');
        const acc = by.get(key);
        if (!acc) { by.set(key, row); continue; }
        for (const [k, v] of Object.entries(row)) {
          if (KEYS.includes(k)) continue;
          if (typeof v === 'number') acc[k] = (+acc[k] || 0) + v;
          else if (acc[k] == null) acc[k] = v;
        }
        if (acc.reach) acc.frequency = acc.impressions / acc.reach;
      }
      return [...by.values()];
    },
  });
}

// Trantor generic Meta tools for Instagram: meta_object reads the account's current fields (followers_count, media_count).
// lvParse is shared by the Trantor loaders below.
const lvParse = (a, who) => {
  if (typeof a === 'string') { try { a = JSON.parse(a); } catch (e) { throw new Error(a.slice(0, 300)); } }
  if (a && (a.error || a.detail)) throw new Error(String(a.error || a.detail));
  if (!a || typeof a !== 'object') throw new Error(who + ' no devolvió datos.');
  return a;
};
dash.loader('ig_profile', {
  description: 'La fila de Trantor meta_object con los seguidores y el número de publicaciones actuales de la cuenta (followers_count, media_count).',
  fn: async ({ answer }) => {
    const a = lvParse(answer, 'Trantor');
    if (!Array.isArray(a.rows) || !a.rows.length) throw new Error('Trantor no devolvió el perfil de Instagram.');
    return a.rows;
  },
});

// Trantor ga4_report answers {rows: [{dimensions: {...}, metrics: {...}}]} with GA4 API names and metric values as text.
// Each row becomes one flat row with the names the GA4 calcs already use (Windsor's), metrics as numbers and date as
// YYYY-MM-DD. A dataset may keep only rows above a number of sessions (min_sessions), applied to the period totals.
const LV_GA_NAMES = {"sessionDefaultChannelGroup": "session_default_channel_group", "sessions": "sessions", "engagedSessions": "engaged_sessions", "ecommercePurchases": "ecommerce_purchases", "purchaseRevenue": "purchase_revenue", "city": "city", "date": "date", "eventName": "event_name", "eventCount": "event_count", "itemName": "item_name", "itemsViewed": "items_viewed", "itemsAddedToCart": "items_added_to_cart", "itemsPurchased": "items_purchased", "itemRevenue": "item_revenue", "landingPage": "landing_page", "addToCarts": "add_to_carts", "deviceCategory": "devicecategory", "newVsReturning": "new_vs_returning", "sessionSourceMedium": "session_source_medium", "totalUsers": "totalusers", "userEngagementDuration": "user_engagement_duration"};
const LV_GA_MIN = { ga_city_cur: 100, ga_lp_cur: 20, ga_src_cur: 20 };
for (const id of ['ga_t_cur', 'ga_t_prev', 'ga_d_cur', 'ga_ev_cur', 'ga_ev_prev', 'ga_items_cur', 'ga_lp_cur', 'ga_ch_cur', 'ga_ch_prev', 'ga_src_cur', 'ga_seg_cur', 'ga_city_cur']) {
  dash.loader(id, {
    description: 'Las filas del informe de GA4 de Trantor, planas y con los nombres de siempre (sessions, engaged_sessions, purchase_revenue, landing_page…), las métricas como números y date como AAAA-MM-DD.' + (LV_GA_MIN[id] ? ' Solo filas con más de ' + LV_GA_MIN[id] + ' sesiones en el periodo.' : ''),
    fn: async ({ answer }) => {
      const a = lvParse(answer, 'Trantor');
      if (!Array.isArray(a.rows)) throw new Error('Trantor no devolvió filas de GA4.');
      const name = (k) => LV_GA_NAMES[k] || k;
      const rows = a.rows.map((r) => {
        const o = {};
        for (const [k, v] of Object.entries(r.dimensions || {})) o[name(k)] = k === 'date' && /^\d{8}$/.test(v) ? v.slice(0, 4) + '-' + v.slice(4, 6) + '-' + v.slice(6) : v;
        for (const [k, v] of Object.entries(r.metrics || {})) o[name(k)] = +v || 0;
        return o;
      });
      const min = LV_GA_MIN[id];
      return min ? rows.filter((r) => r.sessions > min) : rows;
    },
  });
}

// Trantor instagram_insights and page_insights answer long rows {date, metric, breakdown, value}. Meta allows at most 30 days per daily
// call, so longer ranges are fetched in windows of up to 28 days. Rows are pivoted to one row per day with Windsor's names
// (name(metric, breakdown) gives the column). split, when given, is a second call per window with a breakdown, e.g. reach
// by follow_type on Instagram or page views by is_from_ads on Facebook. On Instagram follower_count (new followers per day)
// becomes follower_count_1d; Meta only keeps it for the last 30 days, older days stay empty.
const lvDaily = async ({ answer, call, args }, split, name, tool) => {
  const day = (s, k) => { const d = new Date(s + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + k); return d.toISOString().slice(0, 10); };
  const windows = [];
  for (let f = args.date_from; f <= args.date_to; f = day(f, 28)) { const t = day(f, 27); windows.push([f, t < args.date_to ? t : args.date_to]); }
  const rowsOf = (a) => { a = lvParse(a, 'Trantor'); if (!Array.isArray(a.rows)) throw new Error('Trantor no devolvió filas diarias.'); return a.rows; };
  const long = [];
  for (const [f, t] of windows) {
    long.push(...(windows.length === 1 ? rowsOf(answer) : rowsOf(await call(tool, { ...args, date_from: f, date_to: t }))));
    if (split) long.push(...rowsOf(await call(tool, { ...args, ...split, date_from: f, date_to: t })).filter((r) => r.breakdown));
  }
  const by = new Map();
  for (const r of long) {
    const o = by.get(r.date) || { date: r.date }; by.set(r.date, o);
    const k = name(r.metric, r.breakdown || {});
    if (k && r.value != null) o[k] = +r.value;
  }
  return [...by.values()].sort((a, b) => (a.date < b.date ? -1 : 1));
};
const lvIgName = (m, b) => (b.follow_type === 'FOLLOWER' ? 'reach_followers' : b.follow_type === 'NON_FOLLOWER' ? 'reach_non_followers' : m === 'follower_count' ? 'follower_count_1d' : m);
const lvIgDaily = (ctx, withSplit) => lvDaily(ctx, withSplit ? { metrics: ['reach'], breakdown: 'follow_type' } : null, lvIgName, 'instagram_insights');
for (const id of ['ig_d_cur', 'ig_d_prev']) {
  dash.loader(id, {
    description: 'Una fila por día con alcance, visualizaciones, interacciones (me gusta, comentarios, compartidos, guardados) y el alcance de seguidores y no seguidores (segunda llamada con desglose follow_type), con los nombres de siempre. Los periodos de más de 28 días se piden en tramos.',
    fn: (ctx) => lvIgDaily(ctx, true),
  });
}
dash.loader('ig_follows_30d', {
  description: 'Nuevos seguidores por día (follower_count_1d) en los últimos 30 días, en tramos de hasta 28 días.',
  fn: (ctx) => lvIgDaily(ctx, false),
});

// Facebook page by day. Meta replaced page impressions with views (page_media_view); the calcs keep Windsor's column
// names, so views fill page_impressions and the is_from_ads split fills page_impressions_paid / page_impressions_organic.
const LV_FB_NAMES = { page_media_view: 'page_impressions', page_daily_follows: 'page_daily_follows_unique', page_daily_unfollows: 'page_daily_unfollows_unique' };
const lvFbName = (m, b) => (b.is_from_ads === true ? 'page_impressions_paid' : b.is_from_ads === false ? 'page_impressions_organic' : LV_FB_NAMES[m] || m);
for (const id of ['fb_d_cur', 'fb_d_prev']) {
  dash.loader(id, {
    description: 'Una fila por día de la página: visualizaciones (en page_impressions), interacciones, visitas, reproducciones de vídeo, seguidores nuevos y bajas, más las visualizaciones pagadas y orgánicas de una segunda llamada con desglose is_from_ads. Los periodos de más de 28 días se piden en tramos.',
    fn: (ctx) => lvDaily(ctx, { metrics: ['page_media_view'], breakdown: 'is_from_ads' }, lvFbName, 'page_insights'),
  });
}
dash.loader('fb_profile', {
  description: 'Seguidores actuales de la página (followers_count de Trantor meta_object, como page_follows).',
  fn: async ({ answer }) => {
    const a = lvParse(answer, 'Trantor');
    if (!Array.isArray(a.rows) || !a.rows.length) throw new Error('Trantor no devolvió la página de Facebook.');
    return [{ page_follows: a.rows[0].followers_count ?? null }];
  },
});

// Trantor meta_content answers one wide row per item (fields + insight metrics). They are renamed to the columns the
// Instagram and Facebook calcs already use. Instagram dates are taken in the account's local time (UTC offset set when the dashboard was built).
const lvContent = (answer) => { const a = lvParse(answer, 'Trantor'); if (!Array.isArray(a.rows)) throw new Error('Trantor no devolvió publicaciones.'); if (a.cut) throw new Error('Trantor ha recortado la lista de publicaciones; elige un periodo más corto.'); return a.rows; };
const lvColDay = (ts) => { const t = Date.parse(String(ts).replace(/\+0000$/, 'Z')); return isNaN(t) ? String(ts).slice(0, 10) : new Date(t + (__LV_UTC_OFFSET__) * 3600e3).toISOString().slice(0, 10); };
for (const id of ['ig_p_cur', 'ig_p_prev']) {
  dash.loader(id, {
    description: 'Publicaciones de Instagram de Trantor (instagram_media) con los nombres de siempre: date (día en la hora local de la cuenta), media_id, media_type (REELS para los reels), media_caption, media_permalink, media_reach, media_views, media_engagement, media_saved, media_shares y media_total_comments_count.',
    fn: async ({ answer }) => lvContent(answer).map((p) => ({
      date: lvColDay(p.timestamp), media_id: String(p.id),
      media_type: p.media_product_type === 'REELS' || /\/reel\//.test(p.permalink || '') ? 'REELS' : p.media_type,
      media_caption: p.caption || '', media_permalink: p.permalink || null,
      media_reach: p.reach ?? null, media_views: p.views ?? null, media_engagement: p.total_interactions ?? null,
      media_saved: p.saved ?? null, media_shares: p.shares ?? null, media_total_comments_count: p.comments ?? p.comments_count ?? null,
    })),
  });
}
dash.loader('fb_posts', {
  description: 'Publicaciones propias de la página de Trantor con los nombres de siempre: post_id, post_created_time, post_message_oneline, permalink_url, post_impressions (visualizaciones, post_media_view) y post_engagements (clics, post_clicks). La parte orgánica por publicación no está disponible y queda vacía.',
  fn: async ({ answer }) => lvContent(answer).map((p) => ({
    post_id: String(p.id), post_created_time: p.created_time, post_message_oneline: String(p.message || '').replace(/\s+/g, ' ').trim(),
    permalink_url: p.permalink_url || null, post_impressions: p.post_media_view ?? p.views ?? null, post_impressions_organic: null, post_engagements: p.post_clicks ?? p.engagements ?? null,
  })),
});
