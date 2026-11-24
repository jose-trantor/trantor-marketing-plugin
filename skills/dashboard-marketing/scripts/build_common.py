"""Shared build context for all dashboard-marketing build scripts.

Each area script (build_meta.py, build_instagram.py, etc.) imports BuildContext
from here to avoid duplicating token-substitution and file-write logic.
"""
import json
import os


class BuildContext:
    def __init__(self, cfg, out_dir):
        self.out = os.path.abspath(out_dir)
        self.writes = []

        ids = [str(x).replace('act_', '') for x in (cfg.get('meta_account_ids') or [])]
        self.text_tokens = {
            '__LV_BRAND__': cfg.get('brand') or '',
            '__LV_META_NAMES__': cfg.get('meta_account_names') or '',
            '__LV_IG_USERNAME__': (cfg.get('ig_username') or '').lstrip('@'),
            '__LV_PAGE_NAME__': cfg.get('page_name') or '',
            '__LV_GA4_NAME__': cfg.get('ga4_name') or '',
            '__LV_LOCALE__': cfg.get('locale') or 'es-ES',
            '__LV_CUR__': cfg.get('currency_symbol') or '$',
            '__LV_UTC_OFFSET__': str(float(cfg.get('utc_offset_hours') or 0)).rstrip('0').rstrip('.') or '0',
        }
        self.value_tokens = {
            '__LV_CONNECTOR__': cfg.get('connector') or '',
            '__LV_META_ACCOUNT_IDS__': ids,
            '__LV_IG_ID__': str(cfg.get('ig_id') or ''),
            '__LV_PAGE_ID__': str(cfg.get('page_id') or ''),
            '__LV_GA4_ID__': str(cfg.get('ga4_property_id') or '').replace('properties/', ''),
        }
        self.campaign_ids = [str(x) for x in (cfg.get('meta_campaign_ids') or [])]

    def fill_text(self, s):
        for k, v in self.text_tokens.items():
            s = s.replace(k, v)
        return s

    def fill_value(self, v):
        if isinstance(v, str):
            return self.value_tokens.get(v, self.fill_text(v))
        if isinstance(v, list):
            return [self.fill_value(x) for x in v]
        if isinstance(v, dict):
            return {k: self.fill_value(x) for k, x in v.items()}
        return v

    def only_campaigns(self, ds):
        """Limit a Meta Ads query to the chosen campaigns, if any were chosen."""
        src = ds.get('source', {})
        if not self.campaign_ids or src.get('tool') != 'meta_insights':
            return ds
        args = src.setdefault('args', {})
        args['filters'] = list(args.get('filters') or []) + [
            {'field': 'campaign.id', 'operator': 'IN', 'value': self.campaign_ids}
        ]
        return ds

    def put(self, collection, doc_id, data):
        d = os.path.join(self.out, collection.replace('/', '__'))
        os.makedirs(d, exist_ok=True)
        p = os.path.join(d, doc_id + '.json')
        json.dump(data, open(p, 'w'), ensure_ascii=False)
        self.writes.append({'op': 'set', 'collection': collection, 'doc_id': doc_id, 'file_path': p})

    def finish(self):
        """Check for unresolved tokens and write writes-N.json batch files.

        Returns the list of batch file paths written.
        """
        left = []
        for w in self.writes:
            s = open(w['file_path']).read()
            if '__LV_' in s:
                left.append(w['doc_id'])
        if left:
            raise SystemExit('Quedan marcadores sin rellenar en: ' + ', '.join(left))
        batches = [self.writes[i:i + 50] for i in range(0, len(self.writes), 50)]
        paths = []
        for i, b in enumerate(batches, 1):
            p = os.path.join(self.out, f'writes-{i}.json')
            json.dump(b, open(p, 'w'), ensure_ascii=False, indent=1)
            paths.append(p)
        return paths
