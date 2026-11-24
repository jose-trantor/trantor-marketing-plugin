"""Build Facebook datasets.

Standalone usage:
    python3 build_facebook.py config.json OUT_DIR

Required config keys: brand, connector, page_id, page_name
Optional: locale, currency_symbol, utc_offset_hours
"""
import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
TEMPLATE = os.path.join(HERE, '..', 'assets', 'template')

FB_DATASETS = ['fb_d_cur', 'fb_d_prev', 'fb_posts', 'fb_profile']


def build(ctx):
    for name in FB_DATASETS:
        ctx.put('datasets', name, ctx.fill_value(
            json.load(open(os.path.join(TEMPLATE, 'datasets', name + '.json')))
        ))


if __name__ == '__main__':
    if len(sys.argv) < 3:
        raise SystemExit('Uso: python3 build_facebook.py config.json OUT_DIR')
    cfg = json.load(open(sys.argv[1]))
    missing = [k for k in ['brand', 'connector', 'page_id', 'page_name'] if not cfg.get(k)]
    if missing:
        raise SystemExit('Faltan datos en la configuración: ' + ', '.join(missing))
    sys.path.insert(0, HERE)
    from build_common import BuildContext
    ctx = BuildContext(cfg, sys.argv[2])
    os.makedirs(ctx.out, exist_ok=True)
    build(ctx)
    batch_paths = ctx.finish()
    print(json.dumps({'documents': len(ctx.writes), 'batches': batch_paths}, ensure_ascii=False))
