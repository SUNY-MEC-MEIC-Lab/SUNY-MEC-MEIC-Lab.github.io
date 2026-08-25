# -*- coding: utf-8 -*-
"""기존 Wix 사이트에서 받아둔 페이지 텍스트를 CSV 로 구조화한다.
(Wix CMS 에 컬렉션이 없어 CSV export 가 불가능했던 항목들)

입력 : tools/_scraped/<page>.txt
출력 : data/Conference.csv, data/Awards.csv, data/Patents.csv
"""
import csv, os, re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC  = os.path.join(ROOT, 'tools', '_scraped')
DST  = os.path.join(ROOT, 'data')

def body(name):
    """내비게이션/푸터를 잘라내고 본문만 반환"""
    t = open(os.path.join(SRC, name + '.txt'), encoding='utf-8').read()
    i = t.find('MEIC AI')
    j = t.find('Mechanical Systems with Intelligence and Computer Vision Lab')
    t = t[i + 7 : j if j > 0 else None]
    t = re.sub(r'[\x00-\x08\x0b\x0c\x0e-\x1f\u200b\ufeff]', '', t)   # NUL·제어문자 제거
    lines = [l.strip() for l in t.split('\n')]
    return [l for l in lines if l and l not in ('PUBLICATION', 'Not Available')]

YEAR = re.compile(r'^(19|20)\d{2}$')

def conference():
    rows = []
    for page, kind in (('intl-conference', 'International'), ('korean-conference', 'Korean')):
        lines = [l for l in body(page) if not YEAR.match(l)]
        lines = [l for l in lines if l not in ('Intl. Conference', 'Korean Conference')]
        i = 0
        while i < len(lines):
            if not lines[i].startswith('('):
                i += 1
                continue
            venue = lines[i]
            title = lines[i + 1] if i + 1 < len(lines) else ''
            authors = lines[i + 2] if i + 2 < len(lines) else ''
            m = re.match(r'^\(([^)]*)\)\s*(.*)$', venue)
            abbr, full = (m.group(1), m.group(2)) if m else (venue, '')
            y = re.findall(r'(19|20)\d{2}', abbr)
            year = re.findall(r'((?:19|20)\d{2})', abbr)
            rows.append({
                'Type': kind,
                'Year': year[-1] if year else '',
                'VenueAbbr': abbr,
                'Venue': full,
                'Title': title,
                'Authors': authors,
            })
            i += 3
    rows.sort(key=lambda r: (r['Year'], r['Type']), reverse=True)
    return rows, ['Type', 'Year', 'VenueAbbr', 'Venue', 'Title', 'Authors']

def awards():
    lines = [l for l in body('awards') if l != 'Awards']
    rows, cur = [], ''
    i = 0
    while i < len(lines):
        l = lines[i]
        if YEAR.match(l):
            cur = l; i += 1; continue
        if l.startswith('<'):
            org = l.strip('<> ').strip()
            blk = []
            j = i + 1
            while j < len(lines) and not lines[j].startswith('<') and not YEAR.match(lines[j]):
                blk.append(lines[j]); j += 1
            rows.append({
                'Year': cur,
                'Organization': org,
                'Award': blk[0] if len(blk) > 0 else '',
                'Date': blk[1] if len(blk) > 1 else '',
                'Recipients': blk[2] if len(blk) > 2 else '',
                'Work': ' '.join(blk[3:]) if len(blk) > 3 else '',
            })
            i = j; continue
        i += 1
    return rows, ['Year', 'Organization', 'Award', 'Date', 'Recipients', 'Work']

def patents():
    lines = [l for l in body('patents') if l != 'Patents']
    rows, buf = [], []
    for l in lines:
        if l.startswith('출원 번호') or l.startswith('등록 번호'):
            kind = '등록' if l.startswith('등록') else '출원'
            num = l.split(':', 1)[1].strip() if ':' in l else ''
            head = buf[0] if buf else ''
            m = re.match(r'^\((\d{4})\)\s*(.*)$', head)
            year, kr = (m.group(1), m.group(2)) if m else ('', head)
            rows.append({
                'Year': year,
                'Status': kind,
                'Number': num,
                'TitleKR': kr,
                'TitleEN': ' '.join(buf[1:]) if len(buf) > 1 else '',
            })
            buf = []
        else:
            buf.append(l)
    rows.sort(key=lambda r: (r['Year'], r['Number']), reverse=True)
    return rows, ['Year', 'Status', 'Number', 'TitleKR', 'TitleEN']

def write(name, rows, cols):
    with open(os.path.join(DST, name), 'w', newline='', encoding='utf-8-sig') as f:
        w = csv.DictWriter(f, fieldnames=cols, quoting=csv.QUOTE_ALL)
        w.writeheader(); w.writerows(rows)
    print(f'  data/{name:20} {len(rows):3d}행')

if __name__ == '__main__':
    print('사이트 페이지 -> CSV')
    write('Conference.csv', *conference())
    write('Awards.csv', *awards())
    write('Patents.csv', *patents())
