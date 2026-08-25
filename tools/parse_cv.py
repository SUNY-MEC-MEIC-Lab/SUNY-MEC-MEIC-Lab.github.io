# -*- coding: utf-8 -*-
"""교수님 CV(PDF 추출 텍스트) -> data/Conference.csv, Awards.csv, Patents.csv

기존 웹사이트보다 CV 가 최신이라 CV 를 기준 데이터로 삼는다.
  입력: tools/_scraped/CV.txt   (pypdf 로 추출한 전체 텍스트)
"""
import csv, os, re, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CV   = os.path.join(ROOT, 'tools', '_scraped', 'CV.txt')
DST  = os.path.join(ROOT, 'data')

PAGE_HDR = re.compile(r'^\s*Page \d+\s+JONGSEONG BRAD CHOI, Ph\.D\.\s*$')
QUOTES   = '“”"“”'

def raw():
    t = open(CV, encoding='utf-8').read()
    t = re.sub(r'[\x00-\x08\x0b\x0c\x0e-\x1f​﻿]', '', t)
    return [l for l in t.split('\n') if not PAGE_HDR.match(l)]

def section(start_pat, end_pat):
    lines, out, on = raw(), [], False
    for l in lines:
        if re.match(start_pat, l.strip()):
            on = True; continue
        if on and re.match(end_pat, l.strip()):
            break
        if on:
            out.append(l)
    return out

def entries(lines, start_pat):
    """항목 시작 패턴마다 여러 줄을 하나로 합친다"""
    buf, cur = [], None
    for l in lines:
        s = l.strip()
        if not s:
            continue
        if re.match(start_pat, s):
            if cur: buf.append(cur)
            cur = s
        elif cur is not None:
            cur += ' ' + s
    if cur: buf.append(cur)
    return [re.sub(r'\s+', ' ', b).strip() for b in buf]

def split_quoted(text):
    """… Authors, “Title”, rest …  ->  (authors, title, rest)"""
    m = re.search(r'[%s](.+?)[%s]' % (QUOTES, QUOTES), text, re.S)
    if not m:
        return text.strip(' ,.'), '', ''
    return (text[:m.start()].strip(' ,.'), re.sub(r'\s+', ' ', m.group(1)).strip(),
            text[m.end():].strip(' ,.'))


def tidy(s):
    """PDF 추출 아티팩트 정리: 'Physics -Informed' -> 'Physics-Informed' 등"""
    s = re.sub(r'(\w)\s+-(\w)', r'\1-\2', s)
    s = re.sub(r'(\w)-\s+(\w)', r'\1-\2', s)
    s = re.sub(r'\s+([,.;:])', r'\1', s)
    return re.sub(r'\s+', ' ', s).strip()

SMALL = {'a','an','and','of','or','the','to','in','on','for','with','by','via','at','from','as','via'}
def titlecase(s):
    words = tidy(s).lower().split()
    out = []
    for i, w in enumerate(words):
        if i and w in SMALL: out.append(w)
        elif '-' in w: out.append('-'.join(p[:1].upper()+p[1:] for p in w.split('-')))
        else: out.append(w[:1].upper()+w[1:])
    return ' '.join(out)

def korean_patent_titles():
    """기존 웹사이트에서 파싱해 둔 한글 특허명을 출원번호 기준으로 가져온다"""
    try:
        import parse_site_pages as sp
        rows, _ = sp.patents()
        return {r['Number']: r['TitleKR'] for r in rows if r.get('Number')}
    except Exception:
        return {}

# ---------------------------------------------------------------- conference
KOREAN_HINT = ('Korean Society', 'Korea Society', 'Korean Institute', 'KSME',
               'KSPE', 'KSNVE', 'PHM Korea', 'Korean Society for')

def conference():
    lines = section(r'^CONFERENCE PROCEEDINGS', r'^TECHNICAL REPORT')
    rows = []
    for e in entries(lines, r'^\[C\d+\]'):
        cid = re.match(r'^\[(C\d+)\]', e).group(1)
        body = e[len(cid) + 2:].strip()
        tags = re.findall(r'^\(([^)]+)\)\s*', body)
        while re.match(r'^\([^)]+\)\s*', body):
            body = re.sub(r'^\([^)]+\)\s*', '', body)
        authors, title, rest = split_quoted(body)
        years = re.findall(r'((?:19|20)\d{2})', rest)
        intl = 'International' in rest or 'Intl' in rest
        korean = any(h in rest for h in KOREAN_HINT)
        rows.append({
            'ID': cid,
            'Type': 'Korean' if (korean and not intl) else 'International',
            'Year': years[-1] if years else '',
            'Title': tidy(title),
            'Authors': tidy(authors),
            'Venue': tidy(rest.rstrip(' .;')),
            'Tags': '; '.join(tags),
        })
    rows.sort(key=lambda r: (r['Year'], int(r['ID'][1:])), reverse=True)
    return rows, ['ID', 'Type', 'Year', 'Title', 'Authors', 'Venue', 'Tags']

# -------------------------------------------------------------------- awards
def awards():
    lines = section(r'^HONORS & AWARDS', r'^PROFESSIONAL TALKS')
    rows = []
    for e in entries(lines, r'^\d+\.\s'):
        num = re.match(r'^(\d+)\.', e).group(1)
        body = e[len(num) + 2:].strip()
        date = ''
        m = re.search(r'(\d{2}/\d{4})', body)
        if m:
            date = m.group(1)
            body = (body[:m.start()] + ' ' + body[m.end():]).strip()
        bullet = ''
        if '•' in body:
            body, bullet = body.split('•', 1)
        award, venue = body.strip(' .,'), ''
        if ' from ' in award:
            award, venue = award.split(' from ', 1)
        recipients, work, _ = split_quoted(bullet) if bullet else ('', '', '')
        rows.append({
            'No': num,
            'Year': date.split('/')[-1] if date else '',
            'Date': date,
            'Award': tidy(award).strip(' .,"“”'),
            'Venue': tidy(venue).strip(' .,"“”'),
            'Recipients': tidy(recipients).strip(' .,'),
            'Work': tidy(work),
        })
    rows.sort(key=lambda r: int(r['No']))
    return rows, ['No', 'Year', 'Date', 'Award', 'Venue', 'Recipients', 'Work']

# ------------------------------------------------------------------- patents
def patents():
    lines = section(r'^PATENTS', r'^BOOK CHAPTER')
    rows = []
    for e in entries(lines, r'^\[A\d+\]'):
        pid = re.match(r'^\[(A\d+)\]', e).group(1)
        body = e[len(pid) + 2:].strip()
        num = ''
        m = re.search(r'\(([\d\-/,\s]{6,})\)\s*$', body)   # 줄바꿈으로 번호에 공백이 낀 경우 포함
        if m:
            num = re.sub(r'\s+', '', m.group(1)); body = body[:m.start()].strip()
        status = '등록' if re.search(r'\bRegistered\b', body, re.I) else '출원'
        country = 'US' if 'United States' in body else ('KR' if 'Republic of Korea' in body else '')
        dm = re.search(r'\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\w*\s+((?:19|20)\d{2})', body)
        month, year = (dm.group(1), dm.group(2)) if dm else ('', '')
        title = re.split(r',\s*Jongseong Choi', body)[0].strip(' ,.')
        rows.append({
            'ID': pid, 'Year': year, 'Month': month, 'Status': status,
            'Country': country, 'Number': num,
            'Title': titlecase(title),
            'TitleKR': '',
            'Inventor': 'Jongseong Brad Choi',
        })
        
    kr = korean_patent_titles()
    for r in rows:
        r['TitleKR'] = kr.get(r['Number'], '')
    rows.sort(key=lambda r: int(r['ID'][1:]), reverse=True)
    return rows, ['ID', 'Year', 'Month', 'Status', 'Country', 'Number', 'Title', 'TitleKR', 'Inventor']

def write(name, rows, cols):
    with open(os.path.join(DST, name), 'w', newline='', encoding='utf-8-sig') as f:
        w = csv.DictWriter(f, fieldnames=cols, quoting=csv.QUOTE_ALL)
        w.writeheader(); w.writerows(rows)
    print(f'  data/{name:20} {len(rows):3d}행')

if __name__ == '__main__':
    print('CV -> CSV')
    write('Conference.csv', *conference())
    write('Awards.csv', *awards())
    write('Patents.csv', *patents())
