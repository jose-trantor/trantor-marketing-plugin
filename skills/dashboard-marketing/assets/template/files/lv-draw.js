(() => {
  const nf = (o) => new Intl.NumberFormat('__LV_LOCALE__', o);
  const F = {
    cop: (v) => '__LV_CUR__' + nf({ maximumFractionDigits: 0 }).format(v),
    copc: (v) => (Math.abs(v) >= 1e6 ? '__LV_CUR__' + nf({ notation: 'compact', maximumFractionDigits: 1 }).format(v) : F.cop(v)),
    int: (v) => nf({ maximumFractionDigits: 0 }).format(v),
    intc: (v) => (Math.abs(v) >= 1e4 ? nf({ notation: 'compact', maximumFractionDigits: 1 }).format(v) : F.int(v)),
    pct: (v) => nf({ style: 'percent', maximumFractionDigits: 1 }).format(v),
    pct2: (v) => nf({ style: 'percent', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v),
    dec1: (v) => nf({ minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(v),
    x: (v) => nf({ minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v) + '×',
    delta: (v) => (v > 0 ? '+' : '') + nf({ style: 'percent', maximumFractionDigits: 0 }).format(v),
    date: (v) => {
      const M = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
      const d = v instanceof Date ? v : new Date(String(v).slice(0, 10) + 'T00:00:00Z');
      return isNaN(d) ? String(v) : d.getUTCDate() + ' ' + M[d.getUTCMonth()];
    },
  };
  const fmt = (v, kind) => {
    if (kind === 'text' || !kind) return v == null ? '' : String(v);
    if (kind === 'date') return v == null ? '' : F.date(v);
    if (v == null || v === '' || !isFinite(+v)) return '—';
    return F[kind](+v);
  };
  const colorOf = (i) => dash.colors[i % dash.colors.length];
  const failed = (el) => {
    const p = document.createElement('div');
    p.className = 'lv-failed';
    p.textContent = 'No se pudo cargar';
    el.replaceChildren(p);
  };
  const empty = (el, text) => {
    const p = document.createElement('p');
    p.className = 'lv-empty';
    p.textContent = text || 'Sin datos en este periodo.';
    el.replaceChildren(p);
  };
  // Shared status handling for a drawing: returns rows when ready, else draws the state and returns null.
  const ready = (el, id) => {
    const d = dash.data(id);
    if (d.status === 'ok') { el.classList.remove('dash-skeleton'); return Array.isArray(d.data) ? d.data : []; }
    if (d.status === 'error' || d.status === 'connect' || d.status === 'declined') { el.classList.remove('dash-skeleton'); failed(el); }
    else { el.replaceChildren(); el.classList.add('dash-skeleton'); }
    return null;
  };

  function timeChart(el, rows, o) {
    const W = Math.max(280, Math.round(el.clientWidth || 600));
    const H = o.height || 220;
    const parse = d3.utcParse('%Y-%m-%d');
    const data = rows.map((r) => ({ d: parse(String(r[o.x || 'date']).slice(0, 10)), r })).filter((p) => p.d).sort((a, b) => a.d - b.d);
    if (!data.length) return empty(el);
    el.replaceChildren();
    const val = (p, s) => +p.r[s.key] || 0;
    const drawn = o.series.filter((s) => s.type !== 'tip');
    const yMax = d3.max(data, (p) => d3.max(drawn, (s) => val(p, s))) || 1;
    const y = d3.scaleLinear([0, yMax], [H - 26, 8]).nice();
    const ticks = y.ticks(4);
    const f = (v) => fmt(v, o.fmt);
    const svg = d3.select(el).append('svg').attr('width', '100%').attr('viewBox', `0 0 ${W} ${H}`).attr('role', 'img').attr('aria-label', o.label || '');
    const meas = svg.append('text').attr('class', 'lv-tick');
    let ml = 0;
    for (const t of ticks) { meas.text(f(t)); ml = Math.max(ml, meas.node().getComputedTextLength()); }
    meas.remove();
    ml = Math.ceil(ml) + 10;
    const mr = 8;
    const x = d3.scaleBand(data.map((p) => +p.d), [ml, W - mr]).paddingInner(data.length > 60 ? 0.15 : 0.25).paddingOuter(0.1);
    const bw = x.bandwidth();
    const cx = (p) => x(+p.d) + bw / 2;
    svg.append('g').selectAll('line').data(ticks).join('line').attr('class', 'lv-gridline').attr('x1', ml).attr('x2', W - mr).attr('y1', (t) => y(t)).attr('y2', (t) => y(t));
    svg.append('g').selectAll('text').data(ticks).join('text').attr('class', 'lv-tick').attr('x', ml - 6).attr('y', (t) => y(t)).attr('dy', '0.32em').attr('text-anchor', 'end').text(f);
    const n = Math.max(2, Math.floor((W - ml - mr) / 80));
    const step = Math.max(1, Math.ceil(data.length / n));
    const xt = data.filter((p, i) => i % step === 0);
    svg.append('g').selectAll('text').data(xt).join('text').attr('class', 'lv-tick').attr('y', H - 6)
      .attr('x', (p) => cx(p)).attr('text-anchor', (p) => (cx(p) < ml + 24 ? 'start' : cx(p) > W - 30 ? 'end' : 'middle')).text((p) => F.date(p.d));
    svg.append('line').attr('class', 'lv-axis').attr('x1', ml).attr('x2', W - mr).attr('y1', y(0)).attr('y2', y(0));
    o.series.forEach((s, i) => {
      const c = colorOf(s.color ?? i);
      if (s.type === 'tip') return;
      if (s.type === 'bar') {
        svg.append('g').selectAll('rect').data(data).join('rect').attr('x', (p) => x(+p.d)).attr('width', bw)
          .attr('y', (p) => y(val(p, s))).attr('height', (p) => Math.max(0, y(0) - y(val(p, s)))).attr('rx', Math.min(2, bw / 2)).attr('fill', c);
      } else {
        svg.append('path').datum(data).attr('fill', 'none').attr('stroke', c).attr('stroke-width', 2).attr('stroke-linejoin', 'round').attr('stroke-linecap', 'round')
          .attr('d', d3.line().x(cx).y((p) => y(val(p, s))));
      }
    });
    const rule = svg.append('line').attr('class', 'lv-axis').attr('y1', 8).attr('y2', y(0)).attr('opacity', 0);
    const dots = o.series.filter((s) => s.type === 'line' || !s.type).map((s, i) => svg.append('circle').attr('r', 3.5).attr('fill', colorOf(s.color ?? i)).attr('opacity', 0));
    const tip = d3.select(el).append('div').attr('class', 'lv-tip').style('opacity', 0);
    const hide = () => { tip.style('opacity', 0); rule.attr('opacity', 0); dots.forEach((d) => d.attr('opacity', 0)); };
    svg.append('rect').attr('x', ml).attr('y', 0).attr('width', W - ml - mr).attr('height', H).attr('fill', 'transparent')
      .on('pointerleave', hide)
      .on('pointermove', (ev) => {
        const [mx] = d3.pointer(ev);
        const i = Math.max(0, Math.min(data.length - 1, Math.floor((mx - ml - x.step() * x.paddingOuter()) / x.step())));
        const p = data[i];
        rule.attr('x1', cx(p)).attr('x2', cx(p)).attr('opacity', 0.6);
        o.series.filter((s) => s.type === 'line' || !s.type).forEach((s, j) => dots[j].attr('cx', cx(p)).attr('cy', y(val(p, s))).attr('opacity', 1));
        const box = tip.node();
        const head = document.createElement('div');
        head.className = 'lv-tip-date';
        head.textContent = F.date(p.d);
        const lines = o.series.map((s, j) => {
          const row = document.createElement('div');
          row.className = 'lv-tip-row';
          if (drawn.length > 1 && s.type !== 'tip') { const sw = document.createElement('span'); sw.className = 'lv-sw'; sw.style.background = colorOf(s.color ?? j); row.append(sw); }
          const t = document.createElement('span');
          t.textContent = s.name + ': ' + fmt(val(p, s), s.fmt || o.fmt);
          row.append(t);
          return row;
        });
        box.replaceChildren(head, ...lines);
        const k = el.clientWidth / W;
        const left = cx(p) * k;
        tip.style('opacity', 1).style('left', left + 'px').style('transform', left > el.clientWidth / 2 ? 'translateX(calc(-100% - 10px))' : 'translateX(10px)');
      });
  }

  function hbars(el, rows, o) {
    if (!rows.length) return empty(el);
    const max = d3.max(rows, (r) => +r[o.value] || 0) || 1;
    el.replaceChildren(...rows.map((r, i) => {
      const row = document.createElement('div');
      row.className = 'lv-hbar';
      const l = document.createElement('span'); l.className = 'lv-hbar-label'; l.textContent = o.labelText ? o.labelText(r[o.label]) : r[o.label];
      const tr = document.createElement('div'); tr.className = 'lv-hbar-track';
      const fill = document.createElement('div'); fill.className = 'lv-hbar-fill';
      fill.style.width = (100 * (+r[o.value] || 0) / max) + '%';
      fill.style.background = o.highlight && o.highlight(r, i) ? 'var(--cds-chart-status-critical)' : colorOf(o.color || 0);
      tr.append(fill);
      const v = document.createElement('span'); v.className = 'lv-hbar-val'; v.textContent = fmt(r[o.value], o.fmt);
      row.append(l, tr, v);
      if (o.note) { const nt = o.note(r, i); if (nt) { const s = document.createElement('span'); s.className = 'lv-hbar-note'; s.textContent = nt; row.append(s); } }
      return row;
    }));
  }

  const charts = {
    'm-daily': (el) => { const r = ready(el, 'm_daily_sum'); if (r) timeChart(el, r, { fmt: 'copc', label: 'Inversión diaria en Meta', series: [{ key: 'spend', name: 'Inversión', type: 'bar', color: 0 }, { key: 'conversations', name: 'Conversaciones', type: 'tip', fmt: 'int' }, { key: 'purchases', name: 'Compras web', type: 'tip', fmt: 'int' }] }); },
    'm-types': (el) => {
      const r = ready(el, 'm_types'); if (!r) return;
      const U = { 'Mensajes': 'conversación', 'Venta web': 'compra', 'Tráfico': 'visita', 'Alcance': '1.000 alcanzados' };
      const UP = { 'Mensajes': 'conversaciones', 'Venta web': 'compras', 'Tráfico': 'visitas a la web', 'Alcance': 'personas alcanzadas' };
      hbars(el, r, { label: 'type', value: 'spend', fmt: 'copc', color: 0,
        note: (x) => fmt(x.share, 'pct') + ' de la inversión · ' + fmt(x.results, 'intc') + ' ' + UP[x.type] + ' · ' + fmt(x.cost_per_result, 'cop') + ' por ' + U[x.type] });
    },
    'aw-daily': (el) => { const r = ready(el, 'aw_daily_sum'); if (r) timeChart(el, r, { fmt: 'intc', label: 'Personas alcanzadas por día', series: [{ key: 'reach', name: 'Alcance', type: 'bar', color: 0 }, { key: 'spend', name: 'Inversión', type: 'tip', fmt: 'cop' }, { key: 'cost_per_1000_reached', name: 'Coste por 1.000', type: 'tip', fmt: 'cop' }] }); },
    'cr-concept': (el) => { const r = ready(el, 'cr_msg_concept'); if (r) hbars(el, r, { label: 'group', value: 'cost_per_result', fmt: 'cop', color: 0,
      note: (x) => fmt(x.share, 'pct') + ' de la inversión · ' + fmt(x.ads, 'int') + ' anuncios' + (x.hook_rate != null ? ' · enganche ' + fmt(x.hook_rate, 'pct') : '') + (x.retention != null ? ' · retención ' + fmt(x.retention, 'pct') : '') }); },
    'cr-format': (el) => { const r = ready(el, 'cr_msg_format'); if (r) hbars(el, r, { label: 'group', value: 'cost_per_result', fmt: 'cop', color: 0,
      note: (x) => fmt(x.share, 'pct') + ' de la inversión · ' + fmt(x.ads, 'int') + ' anuncios' }); },
    'cr-length': (el) => { const r = ready(el, 'cr_msg_length'); if (r) hbars(el, r, { label: 'group', value: 'cost_per_result', fmt: 'cop', color: 0,
      note: (x) => fmt(x.share, 'pct') + ' de la inversión · ' + fmt(x.ads, 'int') + ' anuncios' }); },
    'cr-aw': (el) => { const r = ready(el, 'cr_aw_concept'); if (r) hbars(el, r, { label: 'group', value: 'cost_per_result', fmt: 'cop', color: 1,
      note: (x) => fmt(x.share, 'pct') + ' de la inversión' + (x.hook_rate != null ? ' · enganche ' + fmt(x.hook_rate, 'pct') : ' · sin vídeo') + ' · CTR ' + fmt(x.ctr, 'pct2') }); },
    'sum-weekly': (el) => { const r = ready(el, 'sum_weekly'); if (r) timeChart(el, r, { fmt: 'copc', label: 'Inversión y ventas web por semana', series: [{ key: 'spend', name: 'Inversión', type: 'bar', color: 0 }, { key: 'revenue', name: 'Ventas web', type: 'line', color: 1 }, { key: 'orders', name: 'Pedidos web', type: 'tip', fmt: 'int' }, { key: 'conversations', name: 'Conversaciones', type: 'tip', fmt: 'int' }] }); },
    'ig-weekly': (el) => { const r = ready(el, 'ig_weekly'); if (r) timeChart(el, r, { fmt: 'intc', label: 'Alcance por semana', series: [{ key: 'reach', name: 'Alcance', type: 'bar', color: 0 }, { key: 'interactions', name: 'Interacciones', type: 'tip', fmt: 'int' }, { key: 'posts', name: 'Publicaciones', type: 'tip', fmt: 'int' }] }); },
    'ig-format': (el) => { const r = ready(el, 'ig_by_format'); if (r) hbars(el, r, { label: 'group', value: 'engagement_rate', fmt: 'pct', color: 0, note: (x) => fmt(x.posts, 'int') + ' publicaciones · alcance medio ' + fmt(x.reach_per_post, 'intc') }); },
    'ig-theme': (el) => { const r = ready(el, 'ig_by_theme'); if (r) hbars(el, r, { label: 'group', value: 'engagement_rate', fmt: 'pct', color: 0, note: (x) => fmt(x.posts, 'int') + ' publicaciones · alcance medio ' + fmt(x.reach_per_post, 'intc') }); },
    'ig-length': (el) => { const r = ready(el, 'ig_by_length'); if (r) hbars(el, r, { label: 'group', value: 'engagement_rate', fmt: 'pct', color: 0, note: (x) => fmt(x.posts, 'int') + ' publicaciones · alcance medio ' + fmt(x.reach_per_post, 'intc') }); },
    'ig-day': (el) => { const r = ready(el, 'ig_by_day'); if (r) hbars(el, r, { label: 'group', value: 'engagement_rate', fmt: 'pct', color: 0, note: (x) => fmt(x.posts, 'int') + ' publicaciones · alcance medio ' + fmt(x.reach_per_post, 'intc') }); },
    'fb-weekly': (el) => { const r = ready(el, 'fb_weekly'); if (r) timeChart(el, r, { fmt: 'intc', label: 'Impresiones por semana', series: [{ key: 'impressions', name: 'Impresiones', type: 'bar', color: 0 }, { key: 'organic', name: 'Orgánicas', type: 'tip', fmt: 'int' }, { key: 'engagements', name: 'Interacciones', type: 'tip', fmt: 'int' }, { key: 'new_followers', name: 'Seguidores nuevos', type: 'tip', fmt: 'int' }] }); },
    'ga-weekly': (el) => { const r = ready(el, 'ga_weekly'); if (r) timeChart(el, r, { fmt: 'copc', label: 'Ventas por semana', series: [{ key: 'revenue', name: 'Ventas', type: 'bar', color: 1 }, { key: 'sessions', name: 'Sesiones', type: 'tip', fmt: 'int' }, { key: 'purchases', name: 'Pedidos', type: 'tip', fmt: 'int' }, { key: 'conversion_rate', name: 'Conversión', type: 'tip', fmt: 'pct' }] }); },
    'ga-device': (el) => { const r = ready(el, 'ga_by_device'); if (r) hbars(el, r, { label: 'group', value: 'conversion_rate', fmt: 'pct', color: 0, note: (x) => fmt(x.share, 'pct') + ' de las sesiones · ' + fmt(x.purchases, 'int') + ' pedidos' }); },
    'ga-user': (el) => { const r = ready(el, 'ga_by_user'); if (r) hbars(el, r, { label: 'group', value: 'conversion_rate', fmt: 'pct', color: 0, note: (x) => fmt(x.share, 'pct') + ' de las sesiones · ' + fmt(x.purchases, 'int') + ' pedidos' }); },
    'ga-city': (el) => { const r = ready(el, 'ga_by_city'); if (r) hbars(el, r, { label: 'group', value: 'conversion_rate', fmt: 'pct', color: 0, note: (x) => fmt(x.share, 'pct') + ' de las sesiones · ' + fmt(x.purchases, 'int') + ' pedidos' }); },
    'ga-day': (el) => { const r = ready(el, 'ga_by_weekday'); if (r) hbars(el, r, { label: 'group', value: 'conversion_rate', fmt: 'pct', color: 0, note: (x) => fmt(x.sessions_per_day, 'int') + ' sesiones y ' + fmt(x.revenue_per_day, 'copc') + ' en ventas por día' }); },
  };

  dash.draw('funnel', (el) => {
    const r = ready(el, 'sum_funnel'); if (!r) return;
    const box = (x) => {
      const b = document.createElement('div'); b.className = 'lv-fstage' + (x.value == null ? ' lv-fstage-gap' : '');
      const n = document.createElement('div'); n.className = 'lv-fname'; n.textContent = x.stage;
      const v = document.createElement('div'); v.className = 'lv-fval'; v.textContent = x.value == null ? '?' : fmt(x.value, 'intc');
      const d = document.createElement('div'); d.className = 'lv-fnote';
      if (x.value_delta != null) { const s = document.createElement('span'); s.textContent = fmt(x.value_delta, 'delta') + ' vs. anterior'; s.className = x.value_delta > 0 ? 'lv-good' : x.value_delta < 0 ? 'lv-bad' : ''; d.append(s); }
      const rt = document.createElement('div'); rt.className = 'lv-fnote';
      if (x.rate != null) rt.textContent = (x.rate_label.startsWith('por') ? fmt(x.rate, 'dec1') : fmt(x.rate, 'pct')) + ' ' + x.rate_label + (x.rate_delta != null ? ' (' + fmt(x.rate_delta, 'delta') + ')' : '');
      else if (x.value == null) rt.textContent = x.rate_label;
      const src = document.createElement('div'); src.className = 'lv-fsrc'; src.textContent = x.source;
      b.append(n, v, d, rt, src); return b;
    };
    const lane = (name) => {
      const row = document.createElement('div'); row.className = 'lv-flane';
      const lab = document.createElement('div'); lab.className = 'lv-flabel'; lab.textContent = name;
      const items = document.createElement('div'); items.className = 'lv-fitems';
      r.filter((x) => x.lane === name).sort((a, b) => a.order - b.order).forEach((x, i) => {
        if (i) { const ar = document.createElement('span'); ar.className = 'lv-farrow'; ar.textContent = '→'; items.append(ar); }
        items.append(box(x));
      });
      row.append(lab, items); return row;
    };
    el.replaceChildren(lane('Marca'), lane('Web'), lane('Chat'));
  });

  dash.draw('chart', (el) => { const c = charts[el.dataset.chart]; if (c) c(el); });

  dash.draw('alerts', (el) => {
    const r = ready(el, el.dataset.source); if (!r) return;
    if (!r.length) return empty(el, 'Sin alertas en este periodo.');
    el.replaceChildren(...r.map((a) => {
      const li = document.createElement('li');
      li.className = 'lv-alert';
      li.dataset.key = a.id;
      const tag = document.createElement('span');
      tag.className = 'lv-prio lv-prio-' + String(a.priority).toLowerCase();
      tag.textContent = a.priority;
      const body = document.createElement('div');
      const t = document.createElement('div'); t.className = 'lv-alert-title'; t.textContent = a.title;
      if (a.area) { const ar = document.createElement('span'); ar.className = 'lv-area'; ar.textContent = a.area; t.prepend(ar); }
      if (a.tab) li.dataset.tab = a.tab;
      const d = document.createElement('div'); d.className = 'lv-alert-detail'; d.textContent = a.detail;
      const ac = document.createElement('div'); ac.className = 'lv-alert-action'; ac.textContent = '→ ' + a.action;
      body.append(t, d, ac);
      li.append(tag, body);
      return li;
    }));
  });

  dash.draw('kpi', (el) => {
    const d = dash.data(el.dataset.source);
    if (d.status !== 'ok') {
      el.textContent = '—';
      el.classList.toggle('dash-skeleton', d.status === 'loading');
      return;
    }
    el.classList.remove('dash-skeleton');
    const rows = Array.isArray(d.data) ? d.data : [d.data];
    const r = rows[+el.dataset.row || 0] || {};
    el.textContent = fmt(r[el.dataset.field], el.dataset.fmt);
    if (el.dataset.good) {
      const v = +r[el.dataset.field];
      const ok = r[el.dataset.field] != null && isFinite(v) && v !== 0;
      el.classList.toggle('lv-good', ok && (v > 0) === (el.dataset.good === 'up'));
      el.classList.toggle('lv-bad', ok && (v > 0) !== (el.dataset.good === 'up'));
    }
  });

  const PERIODS = { last_15d: 'últimos 15 días', last_30d: 'últimos 30 días', last_90d: 'últimos 90 días', last_180d: 'últimos 180 días' };
  dash.draw('periodo', (el) => {
    const t = PERIODS[dash.params().periodo] || PERIODS.last_15d;
    el.textContent = el.dataset.cap ? t.charAt(0).toUpperCase() + t.slice(1) : t;
  });

  dash.draw('tbl', (tbody) => {
    const table = tbody.closest('table');
    const id = table.dataset.source;
    const d = dash.data(id);
    if (d.status !== 'ok') { tbody.replaceChildren(); return; }
    const ths = [...table.querySelectorAll('thead th[data-field]')];
    const keys = (table.dataset.rowKey || '').split(',');
    let rows = (Array.isArray(d.data) ? d.data : []).slice();
    const sortTh = ths.find((th) => th.getAttribute('aria-sort') === 'ascending' || th.getAttribute('aria-sort') === 'descending');
    if (sortTh) {
      const f = sortTh.dataset.field, dir = sortTh.getAttribute('aria-sort') === 'ascending' ? 1 : -1;
      const num = sortTh.dataset.fmt && !['text', 'date'].includes(sortTh.dataset.fmt);
      rows.sort((a, b) => {
        const va = a[f], vb = b[f];
        if (num) return ((va == null ? -Infinity : +va) - (vb == null ? -Infinity : +vb)) * dir;
        return String(va ?? '').localeCompare(String(vb ?? ''), 'es') * dir;
      });
    }
    const bars = {};
    ths.forEach((th) => { if (th.hasAttribute('data-bar')) bars[th.dataset.field] = d3.max(rows, (r) => +r[th.dataset.field] || 0) || 1; });
    tbody.replaceChildren(...rows.map((r) => {
      const tr = document.createElement('tr');
      tr.dataset.key = keys.length > 1 ? keys.map((k) => encodeURIComponent(r[k] ?? '')).join(',') : String(r[keys[0]] ?? '');
      for (const th of ths) {
        const f = th.dataset.field;
        const td = document.createElement('td');
        if (th.classList.contains('lv-left')) td.classList.add('lv-left');
        if (th.dataset.cell) td.classList.add(th.dataset.cell);
        const text = fmt(r[f], th.dataset.fmt || 'text');
        let node;
        const link = th.dataset.link && r[th.dataset.link];
        if (link && /^https:\/\/(www\.)?instagram\.com\//.test(link)) {
          node = document.createElement('a'); node.href = link; node.target = '_blank'; node.rel = 'noopener';
        } else node = document.createElement('span');
        if (th.dataset.cell === 'lv-wrap') node.className = 'lv-clamp';
        node.textContent = text;
        td.append(node);
        if (th.dataset.warnAbove && +r[f] > +th.dataset.warnAbove) td.classList.add('lv-warn');
        if (th.dataset.good && r[f] != null && +r[f] !== 0) td.classList.add((+r[f] > 0) === (th.dataset.good === 'up') ? 'lv-good' : 'lv-bad');
        if (th.hasAttribute('data-chip')) node.className = 'lv-chip lv-chip-' + String(r[f] || '').toLowerCase().replace(/[^a-z]+/g, '-');
        if (bars[f] != null) {
          const b = document.createElement('span'); b.className = 'lv-cellbar';
          b.style.width = Math.round(48 * (+r[f] || 0) / bars[f]) + 'px';
          td.append(b);
        }
        if (th.dataset.cell === 'lv-ellipsis' || th.dataset.cell === 'lv-wrap') td.title = r[f] ?? '';
        tr.append(td);
      }
      return tr;
    }));
  });
})();
