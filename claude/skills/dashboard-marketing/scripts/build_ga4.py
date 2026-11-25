"""Build GA4 (web) datasets.

Standalone usage:
    python3 build_ga4.py config.json OUT_DIR

Required config keys: brand, connector, ga4_property_id, ga4_name
Optional: locale, currency_symbol, utc_offset_hours
"""
import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
TEMPLATE = os.path.join(HERE, '..', 'assets', 'template')

GA4_DATASETS = [
    'ga_t_cur', 'ga_t_prev', 'ga_d_cur',
    'ga_ch_cur', 'ga_ch_prev',
    'ga_ev_cur', 'ga_ev_prev',
    'ga_items_cur', 'ga_lp_cur', 'ga_seg_cur', 'ga_src_cur', 'ga_city_cur',
]


def build(ctx):
    for name in GA4_DATASETS:
        ctx.put('datasets', name, ctx.fill_value(
            json.load(open(os.path.join(TEMPLATE, 'datasets', name + '.json')))
        ))


if __name__ == '__main__':
    if len(sys.argv) < 3:
        raise SystemExit('Uso: python3 build_ga4.py config.json OUT_DIR')
    cfg = json.load(open(sys.argv[1]))
    missing = [k for k in ['brand', 'connector', 'ga4_property_id', 'ga4_name'] if not cfg.get(k)]
    if missing:
        raise SystemExit('Faltan datos en la configuración: ' + ', '.join(missing))
    sys.path.insert(0, HERE)
    from build_common import BuildContext
    ctx = BuildContext(cfg, sys.argv[2])
    os.makedirs(ctx.out, exist_ok=True)
    build(ctx)
    batch_paths = ctx.finish()
    print(json.dumps({'documents': len(ctx.writes), 'batches': batch_paths}, ensure_ascii=False))
