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

RENDIMIENTO_DATASETS = ['m_acc_cur', 'm_acc_prev', 'm_camp_cur', 'm_camp_prev', 'm_ads_cur', 'm_ads_prev', 'm_daily']
AWARENESS_DATASETS = ['aw_camp_cur', 'aw_camp_prev', 'aw_camp_7d', 'aw_ads_cur', 'aw_ads_prev', 'aw_daily']
CREATIVIDADES_DATASETS = ['cr_ads']
META_DATASETS = RENDIMIENTO_DATASETS + AWARENESS_DATASETS + CREATIVIDADES_DATASETS


def _dash_meta(ctx):
    ctx.put('dash', 'meta', ctx.fill_value(
        json.load(open(os.path.join(TEMPLATE, 'dash', 'meta.json')))
    ))


def build_rendimiento(ctx):
    _dash_meta(ctx)
    for name in RENDIMIENTO_DATASETS:
        ctx.put('datasets', name, ctx.only_campaigns(ctx.fill_value(
            json.load(open(os.path.join(TEMPLATE, 'datasets', name + '.json')))
        )))


def build_awareness(ctx):
    _dash_meta(ctx)
    for name in AWARENESS_DATASETS:
        ctx.put('datasets', name, ctx.only_campaigns(ctx.fill_value(
            json.load(open(os.path.join(TEMPLATE, 'datasets', name + '.json')))
        )))


def build_creatividades(ctx):
    _dash_meta(ctx)
    for name in CREATIVIDADES_DATASETS:
        ctx.put('datasets', name, ctx.only_campaigns(ctx.fill_value(
            json.load(open(os.path.join(TEMPLATE, 'datasets', name + '.json')))
        )))


def build(ctx):
    """Build all 3 Meta tabs at once."""
    build_rendimiento(ctx)
    build_awareness(ctx)
    build_creatividades(ctx)


if __name__ == '__main__':
    _args = sys.argv[1:]
    if len(_args) < 2:
        raise SystemExit('Uso: python3 build_meta.py config.json OUT_DIR [--tab rendimiento|awareness|creatividades]')
    cfg = json.load(open(_args[0]))
    missing = [k for k in ['brand', 'connector', 'meta_account_ids', 'meta_account_names'] if not cfg.get(k)]
    if missing:
        raise SystemExit('Faltan datos en la configuración: ' + ', '.join(missing))
    tab_arg = None
    if '--tab' in _args:
        tab_arg = _args[_args.index('--tab') + 1]
    sys.path.insert(0, HERE)
    from build_common import BuildContext
    ctx = BuildContext(cfg, _args[1])
    os.makedirs(ctx.out, exist_ok=True)
    if tab_arg == 'rendimiento':
        build_rendimiento(ctx)
    elif tab_arg == 'awareness':
        build_awareness(ctx)
    elif tab_arg == 'creatividades':
        build_creatividades(ctx)
    else:
        build(ctx)
    batch_paths = ctx.finish()
    print(json.dumps({'documents': len(ctx.writes), 'batches': batch_paths}, ensure_ascii=False))
