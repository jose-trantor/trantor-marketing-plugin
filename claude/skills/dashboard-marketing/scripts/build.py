"""Fill the marketing dashboard template with one user's accounts.

Usage:
    python3 build.py config.json OUT_DIR [--tabs AREAS]

    AREAS is a comma-separated list: meta, instagram, facebook, ga4, resumen
    Without --tabs, all areas are built (backward-compatible).

config.json (every key is required unless marked optional):
{
  "brand": "Mi Marca",                       # shown in the title
  "connector": "Trantor",                    # the Trantor connector's name exactly as the user added it
  "meta_account_ids": ["1234567890"],        # ad account ids, without act_
  "meta_account_names": "Mi Marca Ads",
  "ig_id": "17841400000000000",  "ig_username": "mimarca",
  "page_id": "100000000000000",  "page_name": "Mi Marca",
  "ga4_property_id": "123456789", "ga4_name": "mimarca.com",
  "locale": "es-CO",                         # optional, number format (default es-ES)
  "currency_symbol": "$",                    # optional (default "$")
  "utc_offset_hours": -5,                    # optional, account time zone (default 0)
  "meta_campaign_ids": ["120210000000000"]   # optional, only these Meta campaigns (default: all)
}

Writes one JSON document per store entry under OUT_DIR, plus OUT_DIR/writes-1.json, writes-2.json…:
each is a list of ArtifactData batch entries ({op: "set", collection, doc_id, file_path}) of at most 50.
"""
import datetime as dt
import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
TEMPLATE = os.path.join(HERE, '..', 'assets', 'template')
sys.path.insert(0, HERE)

from build_common import BuildContext  # noqa: E402
import build_meta as _meta
import build_instagram as _ig
import build_facebook as _fb
import build_ga4 as _ga4
import build_resumen as _resumen

ALL_AREAS = ['meta', 'instagram', 'facebook', 'ga4', 'resumen']

AREA_REQUIRED = {
    'meta': ['brand', 'connector', 'meta_account_ids', 'meta_account_names'],
    'instagram': ['brand', 'connector', 'ig_id', 'ig_username'],
    'facebook': ['brand', 'connector', 'page_id', 'page_name'],
    'ga4': ['brand', 'connector', 'ga4_property_id', 'ga4_name'],
    'resumen': ['brand', 'connector'],
}

args = sys.argv[1:]
if len(args) < 2:
    raise SystemExit('Uso: python3 build.py config.json OUT_DIR [--tabs meta,instagram,...]')

cfg_path, out = args[0], args[1]
cfg = json.load(open(cfg_path))

tabs = ALL_AREAS
if '--tabs' in args:
    idx = args.index('--tabs')
    tabs = [t.strip() for t in args[idx + 1].split(',')]
    unknown = [t for t in tabs if t not in ALL_AREAS]
    if unknown:
        raise SystemExit('Áreas desconocidas: ' + ', '.join(unknown))

need = list({k for t in tabs for k in AREA_REQUIRED.get(t, [])})
missing = [k for k in need if not cfg.get(k)]
if missing:
    raise SystemExit('Faltan datos en la configuración: ' + ', '.join(missing))

ctx = BuildContext(cfg, out)
os.makedirs(ctx.out, exist_ok=True)

# Always write the dashboard skeleton: static files (HTML, CSS, JS) and params.
# These are needed for the dashboard to render regardless of which areas are installed.
# Tokens for areas not yet installed resolve to '' (safe — those sections are hidden by manifest).
for f in sorted(os.listdir(os.path.join(TEMPLATE, 'files'))):
    ctx.put('files', f, {'text': ctx.fill_text(open(os.path.join(TEMPLATE, 'files', f)).read())})

y = dt.date.today() - dt.timedelta(days=1)
day = lambda n: (dt.date.today() - dt.timedelta(days=n)).isoformat()
ctx.put('dash', 'params', {
    'periodo': 'last_15d', 'desde': day(15), 'hasta': y.isoformat(),
    'desde_prev': day(30), 'hasta_prev': day(16), 'desde_7d': day(7), 'desde_30d': day(30),
})

for tab in tabs:
    if tab == 'meta':
        _meta.build(ctx)
    elif tab == 'instagram':
        _ig.build(ctx)
    elif tab == 'facebook':
        _fb.build(ctx)
    elif tab == 'ga4':
        _ga4.build(ctx)
    elif tab == 'resumen':
        _resumen.build(ctx, cfg=cfg)

batch_paths = ctx.finish()
print(json.dumps({'documents': len(ctx.writes), 'batches': batch_paths}, ensure_ascii=False))
