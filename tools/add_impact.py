# -*- coding: utf-8 -*-
"""CV 의 저널 항목에서 임팩트팩터·JCR 백분위를 뽑아 CSV 의 Impact 열에 넣는다."""
import csv, os, re, difflib

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CV   = os.path.join(ROOT, 'tools', '_scraped', 'CV.txt')
PATH = os.path.join(ROOT, 'data', 'Journal+Articles.csv')

def norm(s): return re.sub(r'[^a-z0-9]', '', (s or '').lower())

t = re.sub(r'\s+', ' ', open(CV, encoding='utf-8').read())
t = re.sub(r'(\w) -(\w)', r'\1-\2', t)
ent = re.findall(r'\[J(\d+)\](.*?)(?=\[J\d+\]|CONFERENCE PROCEEDINGS)', t, re.S)

impacts = []
for jid, b in ent:
    m = re.search(r'IF:\s*([\d.]+)(?:,\s*JCR top ([\d.]+)%)?', b)
    if not m: continue
    txt = f'IF {float(m.group(1)):g}'
    if m.group(2): txt += f' · JCR top {float(m.group(2)):g}%'
    impacts.append((norm(b), txt))

rows = list(csv.DictReader(open(PATH, encoding='utf-8-sig')))
cols = list(csv.DictReader(open(PATH, encoding='utf-8-sig')).fieldnames)
if 'Impact' not in cols: cols.append('Impact')

n = 0
for r in rows:
    k = norm(r['Title'])[:28]   # CV 오탈자(예: Buliding)를 피하려 앞부분만 사용
    hit = next((v for key, v in impacts if k and k in key), '')
    if not hit:
        m = difflib.get_close_matches(k, [key[:len(k)] for key, _ in impacts], n=1, cutoff=0.8)
        if m:
            idx = [key[:len(k)] for key, _ in impacts].index(m[0]); hit = impacts[idx][1]
    r['Impact'] = hit
    n += 1 if hit else 0

with open(PATH, 'w', newline='', encoding='utf-8-sig') as f:
    w = csv.DictWriter(f, fieldnames=cols, quoting=csv.QUOTE_ALL); w.writeheader(); w.writerows(rows)
print(f'Impact 표기 {n}/{len(rows)}편')
for r in rows:
    if r.get('Featured') == 'Y':
        print(f"  {r['Impact'] or '(없음)':26} | {r['Title'][:56]}")
