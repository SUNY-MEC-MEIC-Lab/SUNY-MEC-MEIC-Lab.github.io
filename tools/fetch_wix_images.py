# -*- coding: utf-8 -*-
"""Wix CSV의 wix:image:// 참조를 원본 이미지로 내려받고 slug→로컬경로 매핑을 남긴다."""
import re, os, csv, sys, time, glob
from urllib.parse import unquote
from urllib.request import Request, urlopen

ROOT = '/home/meic/LabWebsite'
OUT  = os.path.join(ROOT, 'site', 'assets')
BASE = 'https://static.wixstatic.com/media/'
PAT  = re.compile(r'wix:image://v1/([A-Za-z0-9_~\.-]+)/([^#"\\,]+)')

FOLDER = {'Members.csv': 'members', 'News.csv': 'news',
          'Journal+Articles.csv': 'journals', 'Projects.csv': 'projects'}

def clean(name):
    n = unquote(unquote(name))          # %2523 -> %23 -> '#'
    n = n.replace('#', '_').replace('/', '_').replace('\\', '_')
    n = re.sub(r'\s+', '_', n.strip())
    return n or 'image'

def main():
    seen, rows = {}, []
    for path in sorted(glob.glob(os.path.join(ROOT, 'data', '*.csv'))):
        base = os.path.basename(path)
        sub  = FOLDER.get(base, 'misc')
        text = open(path, encoding='utf-8-sig', errors='replace').read()
        for slug, raw in PAT.findall(text):
            if slug in seen:
                continue
            seen[slug] = True
            rows.append((slug, sub, clean(raw), base))

    print(f'대상 이미지 {len(rows)}개', flush=True)
    ok = fail = skip = 0
    for i, (slug, sub, name, src) in enumerate(rows, 1):
        d = os.path.join(OUT, sub)
        os.makedirs(d, exist_ok=True)
        dest = os.path.join(d, name)
        # 같은 파일명이 다른 slug 로 존재하면 접미사
        if os.path.exists(dest) and os.path.getsize(dest) > 0:
            print(f'[{i}/{len(rows)}] skip  {sub}/{name}', flush=True)
            skip += 1
            rows[i-1] = (slug, sub, name, src)
            continue
        try:
            req = Request(BASE + slug, headers={'User-Agent': 'Mozilla/5.0'})
            with urlopen(req, timeout=60) as r:
                data = r.read()
            if not data:
                raise ValueError('empty body')
            with open(dest, 'wb') as f:
                f.write(data)
            ok += 1
            print(f'[{i}/{len(rows)}] ok    {sub}/{name}  ({len(data)//1024} KB)', flush=True)
        except Exception as e:
            fail += 1
            print(f'[{i}/{len(rows)}] FAIL  {sub}/{name}  {e}', flush=True)
        time.sleep(0.15)

    with open(os.path.join(ROOT, 'data', 'image_map.csv'), 'w', newline='', encoding='utf-8-sig') as f:
        w = csv.writer(f, quoting=csv.QUOTE_ALL)
        w.writerow(['slug', 'local_path', 'source_csv'])
        for slug, sub, name, src in rows:
            w.writerow([slug, f'/assets/{sub}/{name}', src])

    print(f'\n완료 — 성공 {ok} / 건너뜀 {skip} / 실패 {fail}', flush=True)

main()
