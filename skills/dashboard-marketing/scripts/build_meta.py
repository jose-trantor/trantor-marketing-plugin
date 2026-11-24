"""Build Meta Ads datasets (meta, awareness, creatividades tabs).

Standalone usage:
    python3 build_meta.py config.json OUT_DIR

Required config keys: brand, connector, meta_account_ids, meta_account_names
Optional: meta_campaign_ids, locale, currency_symbol, utc_offset_hours
"""
import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
TEMPLATE = os.path.join(HERE, '..', 'assets', 'template')

META_DATASETS = [
    'm_acc_cur', 'm_acc_prev', 'm_camp_cur', 'm_camp_prev',
    'm_ads_cur', 'm_ads_prev', 'm_daily',
    'aw_camp_cur', 'aw_camp_prev', 'aw_camp_7d',
    'aw_ads_cur', 'aw_ads_prev', 'aw_daily',
    'cr_ads',
]


def build(ctx):
    ctx.put('dash', 'meta', ctx.fill_value(
        json.load(open(os.path.join(TEMPLATE, 'dash', 'meta.json')))
    ))
    for name in META_DATASETS:
        ctx.put('datasets', name, ctx.only_campaigns(ctx.fill_value(
            json.load(open(os.path.join(TEMPLATE, 'datasets', name + '.json')))
        )))


if __name__ == '__main__':
    if len(sys.argv) < 3:
        raise SystemExit('Uso: python3 build_meta.py config.json OUT_DIR')
    cfg = json.load(open(sys.argv[1]))
    missing = [k for k in ['brand', 'connector', 'meta_account_ids', 'meta_account_names'] if not cfg.get(k)]
    if missing:
        raise SystemExit('Faltan datos en la configuración: ' + ', '.join(missing))
    sys.path.insert(0, HERE)
    from build_common import BuildContext
    ctx = BuildContext(cfg, sys.argv[2])
    os.makedirs(ctx.out, exist_ok=True)
    build(ctx)
    batch_paths = ctx.finish()
    print(json.dumps({'documents': len(ctx.writes), 'batches': batch_paths}, ensure_ascii=False))
