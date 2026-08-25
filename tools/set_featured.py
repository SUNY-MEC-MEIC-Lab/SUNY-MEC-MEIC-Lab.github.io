# -*- coding: utf-8 -*-
"""홈 하이라이트에 올릴 항목을 CSV 의 Featured 열로 표시한다.

  선별 기준
    저널 — JCR 상위 백분위 / 임팩트팩터 상위 + 연구실 주도(교신저자) 논문
    수상 — 학회 단위 최우수상급 + 대외 경쟁 수상
    과제 — 연구비 규모 상위 및 대표 과제

  바꾸고 싶으면 이 파일의 목록만 고치고 다시 실행하면 된다.
"""
import csv, os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
D = os.path.join(ROOT, 'data')

JOURNALS = [   # 제목 일부로 매칭
    'Generalizable UAV-based',          # ISPRS JPRS  IF 12.2 / JCR top 1.49%
    'Micro-Splatting',                  # IEEE TVCG   연구실 대표 성과
    '3D Reconstruction by Looking',     # Adv. Eng. Informatics IF 9.9 / top 2.28%
    'Automated image localization to support rapid',   # CACIE IF 11.8 / top 0.72%
    'Similarity learning to enable building',          # CACIE IF 11.8 / top 0.72%
    'LiDAR-3DGS',                       # Computers & Graphics, 연구실 주도
]
AWARDS   = ['1', '2', '3', '5']         # Awards.csv 의 No 열
PROJECTS = ['25', '27', '33', '12']     # Projects.csv 의 CV_No 열

def mark(fname, match):
    path = os.path.join(D, fname)
    with open(path, encoding='utf-8-sig') as f:
        rd = csv.DictReader(f); rows = list(rd); cols = list(rd.fieldnames)
    if 'Featured' not in cols:
        cols.append('Featured')
    n = 0
    for r in rows:
        r['Featured'] = 'Y' if match(r) else ''
        n += 1 if r['Featured'] else 0
    with open(path, 'w', newline='', encoding='utf-8-sig') as f:
        w = csv.DictWriter(f, fieldnames=cols, quoting=csv.QUOTE_ALL)
        w.writeheader(); w.writerows(rows)
    print(f'  {fname:24} {n}건 표시')
    return rows

mark('Journal+Articles.csv', lambda r: any(k.lower() in r['Title'].lower() for k in JOURNALS))
mark('Awards.csv',           lambda r: r['No'] in AWARDS)
mark('Projects.csv',         lambda r: r['CV_No'] in PROJECTS)
