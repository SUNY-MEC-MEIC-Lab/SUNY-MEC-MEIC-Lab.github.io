# -*- coding: utf-8 -*-
"""원본 이미지를 웹용 WebP 로 변환하고 뉴스 이미지 파일명을 날짜 규칙으로 통일한다.

  원본 보관 : assets_original/<cat>/...        (git 에는 올리지 않음)
  웹 배포용 : site/assets/<cat>/...  (.webp)
  뉴스 명명 : {YYYYMMDD}_{n}.webp   (News.csv 의 date_start + 갤러리 순서)

  사용법: python3 tools/optimize_images.py
"""
import csv, json, os, re, shutil, sys, collections

sys.path.insert(0, '/home/meic/.local/lib/python3.10/site-packages')
from PIL import Image
import pillow_heif
pillow_heif.register_heif_opener()

ROOT      = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC_CSV   = os.path.join(ROOT, 'data')
ORIGINALS = os.path.join(ROOT, 'assets_original')
WEB       = os.path.join(ROOT, 'site', 'assets')
CATS      = ['members', 'news', 'journals']

MAX_EDGE = 2000      # 긴 변 최대 픽셀
QUALITY  = 88        # WebP 품질 (육안상 무손실 수준)
SLUG     = re.compile(r'wix:image://v1/([A-Za-z0-9_~\.-]+)')

def stash_originals():
    """site/assets/<cat> 를 assets_original/ 로 1회 이동(보관)."""
    for cat in CATS:
        src, dst = os.path.join(WEB, cat), os.path.join(ORIGINALS, cat)
        if os.path.isdir(src) and not os.path.isdir(dst):
            os.makedirs(ORIGINALS, exist_ok=True)
            shutil.move(src, dst)
            print(f'  원본 보관: assets_original/{cat}/ ({len(os.listdir(dst))}개)')

def news_names():
    """News.csv -> {slug: 'YYYYMMDD_n'} (행 날짜 + 갤러리 내 순서)"""
    out, used = {}, collections.Counter()
    path = os.path.join(SRC_CSV, 'News.csv')
    with open(path, encoding='utf-8-sig') as f:
        rows = list(csv.DictReader(f))
    rows.sort(key=lambda r: r.get('date_start') or '')
    for r in rows:
        ds = (r.get('date_start') or '')[:10].replace('-', '')
        if not re.fullmatch(r'\d{8}', ds):
            ds = 'undated'
        cell = r.get('Gallery') or ''
        if not cell.strip().startswith('['):
            continue
        try:
            items = json.loads(cell)
        except Exception:
            continue
        for it in items:
            m = SLUG.search(it.get('src', ''))
            if not m or m.group(1) in out:
                continue
            used[ds] += 1
            out[m.group(1)] = f'{ds}_{used[ds]}'
    return out

def slug_index():
    """모든 CSV -> [(slug, cat, 원본파일명)] — fetch 단계와 동일 규칙"""
    from urllib.parse import unquote
    PAT = re.compile(r'wix:image://v1/([A-Za-z0-9_~\.-]+)/([^#"\\,]+)')
    FOLDER = {'Members.csv': 'members', 'News.csv': 'news', 'Journal+Articles.csv': 'journals'}
    seen, rows, used = set(), [], collections.Counter()
    for fn, cat in FOLDER.items():
        p = os.path.join(SRC_CSV, fn)
        if not os.path.exists(p):
            continue
        for slug, raw in PAT.findall(open(p, encoding='utf-8-sig', errors='replace').read()):
            if slug in seen:
                continue
            seen.add(slug)
            n = unquote(unquote(raw)).replace('#', '_').replace('/', '_')
            n = re.sub(r'\s+', '_', n.strip()) or 'image'
            used[(cat, n)] += 1
            if used[(cat, n)] > 1:
                stem, ext = os.path.splitext(n)
                n = f'{stem}_{used[(cat, n)]}{ext}'
            rows.append((slug, cat, n))
    return rows

def convert(src, dst):
    with Image.open(src) as im:
        im = im.convert('RGBA') if im.mode in ('RGBA', 'LA', 'P') else im.convert('RGB')
        w, h = im.size
        if max(w, h) > MAX_EDGE:
            s = MAX_EDGE / max(w, h)
            im = im.resize((round(w * s), round(h * s)), Image.LANCZOS)
        im.save(dst, 'WEBP', quality=QUALITY, method=6)
    return os.path.getsize(dst)

def main():
    print('1) 원본 보관')
    stash_originals()

    news_map = news_names()
    print(f'2) 뉴스 파일명 규칙 생성 — {len(news_map)}개')

    print('3) WebP 변환')
    mapping, before, after, fail = [], 0, 0, 0
    for cat in CATS:
        os.makedirs(os.path.join(WEB, cat), exist_ok=True)
    for slug, cat, orig in slug_index():
        src = os.path.join(ORIGINALS, cat, orig)
        if not os.path.exists(src):
            print(f'   원본 없음: {cat}/{orig}')
            fail += 1
            continue
        stem = news_map.get(slug) if cat == 'news' else os.path.splitext(orig)[0]
        stem = stem or os.path.splitext(orig)[0]
        dst = os.path.join(WEB, cat, stem + '.webp')
        i = 2
        while os.path.exists(dst):                     # 만일의 중복 방지
            dst = os.path.join(WEB, cat, f'{stem}_{i}.webp'); i += 1
        try:
            b = os.path.getsize(src)
            a = convert(src, dst)
            before += b; after += a
            mapping.append((slug, '/assets/%s/%s' % (cat, os.path.basename(dst))))
        except Exception as e:
            print(f'   실패 {cat}/{orig}: {e}')
            fail += 1

    with open(os.path.join(SRC_CSV, 'image_map.csv'), 'w', newline='', encoding='utf-8-sig') as f:
        w = csv.writer(f, quoting=csv.QUOTE_ALL)
        w.writerow(['slug', 'local_path'])
        w.writerows(mapping)

    mb = lambda x: x / 1024 / 1024
    print(f'\n완료 — {len(mapping)}개 변환, 실패 {fail}개')
    print(f'용량 {mb(before):.0f} MB -> {mb(after):.0f} MB  ({100 - after / before * 100:.0f}% 감소)')

main()
