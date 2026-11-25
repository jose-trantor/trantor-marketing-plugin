"""Build resumen: writes dash/params and files/manifest.json.

No new API queries are generated. The Resumen tab computes its metrics
in JS from datasets already installed by the area scripts.

Standalone usage:
    python3 build_resumen.py config.json OUT_DIR

Required config keys: brand, connector
The manifest is built from the config; pass installed_tabs in the config
to reflect already-installed areas.
"""
import datetime as dt
import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))


def build(ctx, cfg=None, installed_tabs=None, title=None):
    """Write dash/params and files/manifest.json.

    cfg: original config dict (needed if ctx doesn't carry it; pass explicitly
         when calling as a module so the manifest has all account fields).
    installed_tabs: list of tab strings to include in the manifest.
    title: dashboard title string; if None, skipped (LLM sets it directly).
    """
    y = dt.date.today() - dt.timedelta(days=1)
    day = lambda n: (dt.date.today() - dt.timedelta(days=n)).isoformat()
    params = {
        'periodo': 'last_15d',
        'desde': day(15),
        'hasta': y.isoformat(),
        'desde_prev': day(30),
        'hasta_prev': day(16),
        'desde_7d': day(7),
        'desde_30d': day(30),
    }
    ctx.put('dash', 'params', params)

    if cfg is not None:
        tabs = installed_tabs or cfg.get('installed_tabs') or []
        manifest = {
            'schema': 1,
            'brand': cfg.get('brand') or '',
            'title': title or cfg.get('title') or '',
            'connector': cfg.get('connector') or '',
            'installed_tabs': tabs,
            'accounts': {
                'meta_account_ids': cfg.get('meta_account_ids') or None,
                'meta_account_names': cfg.get('meta_account_names') or None,
                'meta_campaign_ids': cfg.get('meta_campaign_ids') or [],
                'ig_id': cfg.get('ig_id') or None,
                'ig_username': cfg.get('ig_username') or None,
                'page_id': cfg.get('page_id') or None,
                'page_name': cfg.get('page_name') or None,
                'ga4_property_id': cfg.get('ga4_property_id') or None,
                'ga4_name': cfg.get('ga4_name') or None,
            },
            'locale': cfg.get('locale') or 'es-ES',
            'currency_symbol': cfg.get('currency_symbol') or '$',
            'utc_offset_hours': cfg.get('utc_offset_hours') or 0,
        }
        ctx.put('files', 'manifest.json', manifest)


if __name__ == '__main__':
    if len(sys.argv) < 3:
        raise SystemExit('Uso: python3 build_resumen.py config.json OUT_DIR')
    cfg = json.load(open(sys.argv[1]))
    missing = [k for k in ['brand', 'connector'] if not cfg.get(k)]
    if missing:
        raise SystemExit('Faltan datos en la configuración: ' + ', '.join(missing))
    sys.path.insert(0, HERE)
    from build_common import BuildContext
    ctx = BuildContext(cfg, sys.argv[2])
    os.makedirs(ctx.out, exist_ok=True)
    build(ctx, cfg=cfg)
    batch_paths = ctx.finish()
    print(json.dumps({'documents': len(ctx.writes), 'batches': batch_paths}, ensure_ascii=False))
