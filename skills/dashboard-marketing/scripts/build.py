"""Fill the marketing dashboard template with one user's accounts.

Usage:
    python3 build.py config.json OUT_DIR

config.json (every key is required unless marked optional):
{
  "brand": "La Vasca",                       # shown in the title
  "connector": "Trantor",                    # the Trantor connector's name exactly as the user added it
  "meta_account_ids": ["1161215189017811"],  # ad account ids, without act_
  "meta_account_names": "Bocass Gorup S.A.S",
  "ig_id": "17841463618897087",  "ig_username": "lavasca.co",
  "page_id": "238709972663415",  "page_name": "La Vasca",
  "ga4_property_id": "465943804", "ga4_name": "lavasca.co",
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

cfg_path, out = sys.argv[1], os.path.abspath(sys.argv[2])
cfg = json.load(open(cfg_path))
need = ['brand', 'connector', 'meta_account_ids', 'meta_account_names', 'ig_id', 'ig_username',
        'page_id', 'page_name', 'ga4_property_id', 'ga4_name']
missing = [k for k in need if not cfg.get(k)]
if missing:
    raise SystemExit('Faltan datos en la configuración: ' + ', '.join(missing))

ids = [str(x).replace('act_', '') for x in cfg['meta_account_ids']]
text_tokens = {
    '__LV_BRAND__': cfg['brand'],
    '__LV_META_NAMES__': cfg['meta_account_names'],
    '__LV_IG_USERNAME__': cfg['ig_username'].lstrip('@'),
    '__LV_PAGE_NAME__': cfg['page_name'],
    '__LV_GA4_NAME__': cfg['ga4_name'],
    '__LV_LOCALE__': cfg.get('locale') or 'es-ES',
    '__LV_CUR__': cfg.get('currency_symbol') or '$',
    '__LV_UTC_OFFSET__': str(float(cfg.get('utc_offset_hours') or 0)).rstrip('0').rstrip('.') or '0',
}
value_tokens = {
    '__LV_CONNECTOR__': cfg['connector'],
    '__LV_META_ACCOUNT_IDS__': ids,
    '__LV_IG_ID__': str(cfg['ig_id']),
    '__LV_PAGE_ID__': str(cfg['page_id']),
    '__LV_GA4_ID__': str(cfg['ga4_property_id']).replace('properties/', ''),
}

def fill_text(s):
    for k, v in text_tokens.items():
        s = s.replace(k, v)
    return s

campaign_ids = [str(x) for x in (cfg.get('meta_campaign_ids') or [])]

def only_campaigns(ds):
    """Limit a Meta Ads query to the chosen campaigns, if any were chosen."""
    src = ds.get('source', {})
    if not campaign_ids or src.get('tool') != 'meta_insights':
        return ds
    args = src.setdefault('args', {})
    args['filters'] = list(args.get('filters') or []) + [{'field': 'campaign.id', 'operator': 'IN', 'value': campaign_ids}]
    return ds

def fill_value(v):
    if isinstance(v, str):
        return value_tokens.get(v, fill_text(v))
    if isinstance(v, list):
        return [fill_value(x) for x in v]
    if isinstance(v, dict):
        return {k: fill_value(x) for k, x in v.items()}
    return v

os.makedirs(out, exist_ok=True)
writes = []

def put(collection, doc_id, data):
    d = os.path.join(out, collection.replace('/', '__'))
    os.makedirs(d, exist_ok=True)
    p = os.path.join(d, doc_id + '.json')
    json.dump(data, open(p, 'w'), ensure_ascii=False)
    writes.append({'op': 'set', 'collection': collection, 'doc_id': doc_id, 'file_path': p})

# Default period: last 15 days up to yesterday, as the page computes it.
y = dt.date.today() - dt.timedelta(days=1)
day = lambda n: (dt.date.today() - dt.timedelta(days=n)).isoformat()
params = {'periodo': 'last_15d', 'desde': day(15), 'hasta': y.isoformat(), 'desde_prev': day(30),
          'hasta_prev': day(16), 'desde_7d': day(7), 'desde_30d': day(30)}

put('dash', 'meta', fill_value(json.load(open(os.path.join(TEMPLATE, 'dash', 'meta.json')))))
put('dash', 'params', params)
for f in sorted(os.listdir(os.path.join(TEMPLATE, 'datasets'))):
    put('datasets', f[:-5], only_campaigns(fill_value(json.load(open(os.path.join(TEMPLATE, 'datasets', f))))))
for f in sorted(os.listdir(os.path.join(TEMPLATE, 'files'))):
    put('files', f, {'text': fill_text(open(os.path.join(TEMPLATE, 'files', f)).read())})

left = []
for w in writes:
    s = open(w['file_path']).read()
    if '__LV_' in s:
        left.append(w['doc_id'])
if left:
    raise SystemExit('Quedan marcadores sin rellenar en: ' + ', '.join(left))

batches = [writes[i:i + 50] for i in range(0, len(writes), 50)]
for i, b in enumerate(batches, 1):
    json.dump(b, open(os.path.join(out, f'writes-{i}.json'), 'w'), ensure_ascii=False, indent=1)
print(json.dumps({'documents': len(writes), 'batches': [os.path.join(out, f'writes-{i}.json') for i in range(1, len(batches) + 1)]}, ensure_ascii=False))
