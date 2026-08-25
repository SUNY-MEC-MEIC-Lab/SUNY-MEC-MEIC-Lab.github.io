# -*- coding: utf-8 -*-
"""연구그룹/교수/연락처 페이지의 본문 이미지를 내려받아 WebP 로 변환한다.
GIF 는 애니메이션을 유지한 채 animated WebP 로 변환한다.
"""
import json, os, re, sys, time
from urllib.request import Request, urlopen
sys.path.insert(0, '/home/meic/.local/lib/python3.10/site-packages')
from PIL import Image, ImageOps

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ORIG = os.path.join(ROOT, 'assets_original', 'pages')
WEB  = os.path.join(ROOT, 'site', 'assets')
BASE = 'https://static.wixstatic.com/media/'
MAX_EDGE, Q = 1800, 88

SKIP = ('SUNY Logo', 'stonybrook logo', 'MEIC_LOGO', 'journal paper image',
        'YouTube', 'GitHub', '_edited.jpg')

def is_skip(alt, slug):
    return any(s.lower() in (alt or '').lower() for s in SKIP) or alt.strip() == '_edited.jpg'

def get(slug, dest):
    if os.path.exists(dest) and os.path.getsize(dest) > 0:
        return dest
    os.makedirs(os.path.dirname(dest), exist_ok=True)
    with urlopen(Request(BASE + slug, headers={'User-Agent': 'Mozilla/5.0'}), timeout=90) as r:
        open(dest, 'wb').write(r.read())
    time.sleep(0.2)
    return dest

def to_webp(src, dst):
    with Image.open(src) as im:
        im = ImageOps.exif_transpose(im) or im   # EXIF 회전 반영
        animated = getattr(im, 'n_frames', 1) > 1
        if animated:
            im.save(dst, 'WEBP', save_all=True, quality=80, method=4)
        else:
            im = im.convert('RGBA') if im.mode in ('RGBA', 'LA', 'P') else im.convert('RGB')
            w, h = im.size
            if max(w, h) > MAX_EDGE:
                s = MAX_EDGE / max(w, h)
                im = im.resize((round(w * s), round(h * s)), Image.LANCZOS)
            im.save(dst, 'WEBP', quality=Q, method=6)
    return os.path.getsize(dst)

def run(items, subdir):
    """items: [(slug, alt)] -> [(slug, '/assets/<subdir>/<name>.webp')]"""
    out = []
    for slug, alt in items:
        if is_skip(alt, slug):
            continue
        stem = re.sub(r'[^\w.-]', '_', (alt or slug).rsplit('.', 1)[0]) or slug[:12]
        raw = get(slug, os.path.join(ORIG, subdir, slug))
        dst = os.path.join(WEB, subdir, stem + '.webp')
        os.makedirs(os.path.dirname(dst), exist_ok=True)
        size = to_webp(raw, dst)
        out.append((slug, f'/assets/{subdir}/{stem}.webp'))
        print(f'  {subdir}/{stem}.webp  {size//1024}KB')
    return out

def main():
    data = json.load(open(os.path.join(ROOT, 'tools', '_scraped', 'team_images.json')))
    mapping = {}
    for group, info in data.items():
        print(f'[{group}]')
        secs = {}
        for sec, imgs in info['images'].items():
            got = run([(i['slug'], i['alt']) for i in imgs], f'research/{group}')
            if got:
                secs[sec] = [p for _, p in got]
        mapping[group] = secs
    print('[people]')
    p = run([('56ae54_8d90eaf88cbf4434a02fda14664a49ec~mv2.jpg', 'Profile_Brad')], 'people')
    mapping['professor_photo'] = p[0][1] if p else ''
    print('[contact]')
    c = run([('080b1e_e39578f94ee046a68b0fdda19dc07c63~mv2.jpg', 'contact_map')], 'contact')
    mapping['contact_image'] = c[0][1] if c else ''
    json.dump(mapping, open(os.path.join(ROOT, 'tools', '_scraped', 'page_media.json'), 'w'),
              ensure_ascii=False, indent=1)
    print('\n매핑 저장: tools/_scraped/page_media.json')

main()
