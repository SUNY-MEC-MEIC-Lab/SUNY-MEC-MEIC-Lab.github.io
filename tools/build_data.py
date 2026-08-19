# -*- coding: utf-8 -*-
"""data/*.csv (Wix 원본 export) -> site/_data/*.csv (Jekyll 용, 이미지 경로 로컬화)

새 Wix export 를 data/ 에 덮어쓴 뒤 이 스크립트만 다시 돌리면 된다.
  python3 tools/build_data.py
"""
import csv, json, os, re, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC  = os.path.join(ROOT, 'data')
DST  = os.path.join(ROOT, 'site', '_data')
SLUG = re.compile(r'wix:image://v1/([A-Za-z0-9_~\.-]+)')

def load_map():
    p = os.path.join(SRC, 'image_map.csv')
    if not os.path.exists(p):
        sys.exit('image_map.csv 가 없다. 먼저 tools/fetch_wix_images.py 를 실행할 것.')
    with open(p, encoding='utf-8-sig') as f:
        return {r['slug']: r['local_path'] for r in csv.DictReader(f)}

IMAP = load_map()

def local(wix_ref):
    """wix:image://... -> /assets/<cat>/<file> (없으면 빈 문자열)"""
    if not wix_ref:
        return ''
    m = SLUG.search(wix_ref)
    return IMAP.get(m.group(1), '') if m else ''

def gallery(cell):
    """News 의 Gallery JSON -> 파이프 구분 로컬 경로"""
    if not cell or not cell.strip().startswith('['):
        return ''
    try:
        items = json.loads(cell)
    except Exception:
        return ''
    out = []
    for it in items:
        p = local(it.get('src', ''))
        if p and p not in out:
            out.append(p)
    return '|'.join(out)

def read(name):
    with open(os.path.join(SRC, name), encoding='utf-8-sig') as f:
        return list(csv.DictReader(f))

def write(name, rows, cols):
    os.makedirs(DST, exist_ok=True)
    with open(os.path.join(DST, name), 'w', newline='', encoding='utf-8') as f:
        w = csv.DictWriter(f, fieldnames=cols, quoting=csv.QUOTE_ALL, extrasaction='ignore')
        w.writeheader()
        w.writerows(rows)
    print(f'  site/_data/{name:22} {len(rows):3d}행')

# --- Members -----------------------------------------------------------------
SECTION_ORDER = ['Professor','Ph.D. Students','Master Students',
                 'Undergraduate Students','Visiting Students','Alumni']
def members():
    out = []
    for r in read('Members.csv'):
        sec = (r.get('Sectoin') or '').strip()      # Wix 원본의 오타 컬럼명 그대로
        out.append({
            'Section': sec,
            'SectionOrder': SECTION_ORDER.index(sec) if sec in SECTION_ORDER else 99,
            'Name': r.get('Name','').strip(),
            'Duration': r.get('Duration','').strip(),
            'Education': r.get('Education','').strip(),
            'Interest': r.get('Research Interest','').strip(),
            'Email': r.get('Email address','').strip(),
            'Photo': local(r.get('이미지','')),
            'Notes': r.get('Notes','').strip(),
            'PostCareer': r.get('Post career','').strip(),
        })
    out.sort(key=lambda x: (x['SectionOrder'], x['Duration']), reverse=False)
    write('members.csv', out,
          ['Section','SectionOrder','Name','Duration','Education','Interest',
           'Email','Photo','Notes','PostCareer'])

# --- News --------------------------------------------------------------------
def news():
    out = []
    for r in read('News.csv'):
        imgs = gallery(r.get('Gallery',''))
        out.append({
            'Date': r.get('Date','').strip(),
            'DateStart': r.get('date_start','').strip(),
            'DateEnd': r.get('date_end','').strip(),
            'Type': r.get('Type','').strip(),
            'Summary': r.get('Summary','').strip(),
            'Content': r.get('Content','').strip(),
            'Images': imgs,
            'Cover': imgs.split('|')[0] if imgs else '',
        })
    out.sort(key=lambda x: x['DateStart'], reverse=True)
    write('news.csv', out, ['Date','DateStart','DateEnd','Type','Summary','Content','Images','Cover'])

# --- Journal articles --------------------------------------------------------
def journals():
    out = []
    for r in read('Journal+Articles.csv'):
        if not r.get('Title'):
            continue
        out.append({
            'Title': r.get('Title','').strip(),
            'Year': r.get('Year','').strip(),
            'Venue': r.get('Venue','').strip(),
            'Authors': r.get('Authors','').strip(),
            'Status': r.get('Status','').strip(),
            'URL': r.get('URL','').strip(),
            'Thumbnail': local(r.get('이미지','')),
        })
    out.sort(key=lambda x: (x['Year'] or '0', x['Title']), reverse=True)
    write('journals.csv', out, ['Title','Year','Venue','Authors','Status','URL','Thumbnail'])

# --- Projects ----------------------------------------------------------------
def projects():
    rows = [r for r in read('Projects.csv') if r.get('Title_EN') or r.get('Program_EN')]
    rows.sort(key=lambda r: r.get('date_start',''), reverse=True)
    write('projects.csv', rows, list(rows[0].keys()))


# --- 학회 / 수상 / 특허 (사이트 페이지에서 파싱) ---------------------------------
def passthrough(src, dst, sort_key=None, reverse=True):
    if not os.path.exists(os.path.join(SRC, src)):
        print(f'  (건너뜀) {src} 없음'); return
    rows = read(src)
    if sort_key: rows.sort(key=sort_key, reverse=reverse)
    write(dst, rows, list(rows[0].keys()))

if __name__ == '__main__':
    print('data/ -> site/_data/ 변환')
    members(); news(); journals(); projects()
    passthrough('Conference.csv', 'conference.csv', lambda r: (r['Year'], r['Type']))
    passthrough('Awards.csv',     'awards.csv',     lambda r: r['Year'])
    passthrough('Patents.csv',    'patents.csv',    lambda r: (r['Year'], r['Number']))
    print('완료')
