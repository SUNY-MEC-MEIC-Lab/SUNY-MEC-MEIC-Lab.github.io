# -*- coding: utf-8 -*-
"""CV 의 저널 목록으로 data/Journal+Articles.csv 의 게재 상태·DOI·연도를 갱신한다.

  CV        : 게재 상태 / DOI / 연도의 기준 (최신)
  기존 CSV  : 제목·저자·학술지 표기와 썸네일 이미지의 기준 (Wix 에서 정리해 둔 값)
"""
import csv, os, re, sys, difflib

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CV   = os.path.join(ROOT, 'tools', '_scraped', 'CV.txt')
CSV  = os.path.join(ROOT, 'data', 'Journal+Articles.csv')
PAGE_HDR = re.compile(r'^\s*Page \d+\s+JONGSEONG BRAD CHOI, Ph\.D\.\s*$')

def norm(s):
    return re.sub(r'[^a-z0-9]', '', (s or '').lower())

def cv_entries():
    lines = [l for l in open(CV, encoding='utf-8').read().split('\n') if not PAGE_HDR.match(l)]
    txt, cur, out = None, None, []
    for l in lines:
        s = l.strip()
        if re.match(r'^\[J\d+\]', s):
            if cur: out.append(cur)
            cur = s
        elif cur is not None:
            if re.match(r'^[A-Z][A-Z &-]{6,}$', s):   # 다음 섹션 헤더
                out.append(cur); cur = None; break
            if s: cur += ' ' + s
    if cur: out.append(cur)

    rows = []
    for e in out:
        e = re.sub(r'(\w)\s+-(\w)', r'\1-\2', re.sub(r'\s+', ' ', e))
        jid = re.match(r'^\[(J\d+)\]', e).group(1)
        body = e[len(jid) + 2:]
        ym = re.search(r'\(\s*((?:19|20)[\s\d]{2,4}?)\s*\)', body)   # '(20 20)', '(201 9)' 등 PDF 공백 포함
        year = ym.group(1).replace(' ', '') if ym else ''
        if len(year) != 4:
            ym, year = None, ''
        under = bool(re.search(r'\*?Under Review', body, re.I))
        dm = re.search(r'doi:\s*([^\s,;]+)', body, re.I)
        doi = dm.group(1).rstrip('.') if dm else ''
        # 제목 추정: 연도 뒤(없으면 교신저자 * 뒤) ~ (IF: / doi / ; 앞
        if ym:
            rest = body[ym.end():]
        else:
            # 저자 목록은 'and <이름>' 으로 끝난다 — 그 뒤가 제목
            am = re.match(r'^(.*?\band\s+[A-Z][\w.\-]*(?:\s+[A-Z][\w.\-]*){0,3}\*?)\s*,\s*(.*)$', body)
            rest = am.group(2) if am else body
        rest = re.split(r'\(IF:|doi:|;', rest)[0]
        segs = [s.strip(' ,.') for s in rest.split(',') if s.strip(' ,.')]
        segs = [s for s in segs if not re.match(r'^(vol|no|pp)\b|^[\d\-–\s]+$', s, re.I)]
        title = segs[0] if segs else ''
        rows.append({'ID': jid, 'Year': year, 'UnderReview': under, 'DOI': doi,
                     'Title': title, 'Raw': body.strip()})
    return rows


# CV 에서 제목이 개정된 논문 (같은 논문, 투고 과정에서 제목 변경)
ALIAS = {
    'J25': 'micro-splatting',
    'J23': 'lidar-3dgs',
    'J27': 'data localization on a hyper-realistic display model',
}

def main():
    cv = cv_entries()
    with open(CSV, encoding='utf-8-sig') as f:
        site = [r for r in csv.DictReader(f) if r.get('Title')]
    print(f'CV 저널 {len(cv)}건 / 기존 CSV {len(site)}건')

    keys = [norm(r['Title']) for r in site]
    updated, unmatched = 0, []
    for c in cv:
        k = norm(c['Title'])
        hit = None
        if c['ID'] in ALIAS:                       # 제목 개정분은 명시 매핑
            a = norm(ALIAS[c['ID']])
            for i, sk in enumerate(keys):
                if a in sk:
                    hit = site[i]
                    if hit['Title'] != c['Title']:
                        print(f"  [{c['ID']}] 제목 개정: {hit['Title'][:44]} -> {c['Title'][:44]}")
                        hit['Title'] = c['Title']
                    break
        for i, sk in enumerate(keys):
            if k and (k in sk or sk in k):
                hit = site[i]; break
        if hit is None:
            m = difflib.get_close_matches(k, keys, n=1, cutoff=0.78)
            if m: hit = site[keys.index(m[0])]
        if hit is None:
            unmatched.append(c); continue
        new_status = 'Under Review' if c['UnderReview'] else 'Published'
        changes = []
        if hit['Status'] != new_status:
            changes.append(f"{hit['Status']} -> {new_status}"); hit['Status'] = new_status
        if c['Year'] and hit['Year'] != c['Year']:
            changes.append(f"{hit['Year']} -> {c['Year']}"); hit['Year'] = c['Year']
        if c['DOI'] and not hit.get('URL'):
            hit['URL'] = 'https://doi.org/' + c['DOI']; changes.append('DOI 추가')
        if changes:
            updated += 1
            print(f"  [{c['ID']}] {hit['Title'][:52]}  ({', '.join(changes)})")

    print(f'\n갱신 {updated}건')
    if unmatched:
        print(f'CV 에만 있는 논문 {len(unmatched)}건 — 새로 추가:')
        for c in unmatched:
            print(f"  [{c['ID']}] {c['Year'] or '----'} | {c['Title'][:70]}")
        if os.environ.get('ADD_NEW') != '1':
            print('  (ADD_NEW=1 로 실행해야 실제 추가됨)')
        for c in (unmatched if os.environ.get('ADD_NEW') == '1' else []):
            site.append({
                'Title': c['Title'], 'Year': c['Year'],
                'Venue': re.split(r'\(IF:|doi:|;', c['Raw'])[0].split(',')[-1].strip(' ,.'),
                'Authors': c['Raw'].split('(')[0].strip(' ,') if c['Year'] else '',
                'Status': 'Under Review' if c['UnderReview'] else 'Published',
                'URL': ('https://doi.org/' + c['DOI']) if c['DOI'] else '',
                '이미지': '',
            })

    cols = list(csv.DictReader(open(CSV, encoding='utf-8-sig')).fieldnames)
    with open(CSV, 'w', newline='', encoding='utf-8-sig') as f:
        w = csv.DictWriter(f, fieldnames=cols, quoting=csv.QUOTE_ALL, extrasaction='ignore')
        w.writeheader()
        for r in site:
            w.writerow({c: r.get(c, '') for c in cols})
    print(f'\ndata/Journal+Articles.csv 저장 — 총 {len(site)}건')

main()
