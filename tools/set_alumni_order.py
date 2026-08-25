# -*- coding: utf-8 -*-
"""Alumni 표시 순서를 진로 기준으로 정한다 (data/Members.csv 의 Rank 열).

  순서를 바꾸고 싶으면 아래 TIERS 의 이름 목록만 옮기고 다시 실행하면 된다.
  Rank 가 작을수록 먼저 표시된다. Alumni 이외 구성원의 Rank 는 비워 둔다.

  분류 기준
    1  박사후연구원 · 해외 박사과정
    2  해외 대학원(석사) · 국립연구소
    3  국내 대학원 · 국내 연구기관
    4  대기업 · 글로벌 기업
    5  그 외 (창업, 병역 등)
"""
import csv, os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PATH = os.path.join(ROOT, 'data', 'Members.csv')

TIERS = [
    # (설명, [이름 ...])  — 목록 내 순서가 그대로 표시 순서가 된다
    ('박사후연구원 · 해외 박사과정', [
        'Jonathan Boyack',          # Post doctoral researcher, Purdue University, USA
        'Sooyon Chang',             # Cornell 석사 -> Purdue 박사
    ]),
    ('해외 대학원 · 국립연구소', [
        'Prince-David Malendele',   # Brookhaven National Lab., USA
        'Daeryun Choi',             # Univ. of Michigan Ann Arbor 석사
        'Hojung Lim',               # USC CS 석사
        'Leeroy Makusha',           # UT Arlington 석사
    ]),
    ('국내 대학원 · 연구기관', [
        'Yoonseong Kim',            # 연세대 석사 + KITECH 연구인턴
        'Jimin Shin',               # SUNY Korea MEC 석사
        'Jaewon Lee',               # SUNY Korea MEC 석사
    ]),
    ('대기업 · 글로벌 기업', [
        'Hanbeom Chang',            # SK (주) AX
        'Soojung Chi',              # Johnson & Johnson Innovative Medicine
        'Jungmin Lee',              # Hyundai Mobis, USA
        'Mijin Lee',                # GM Korea
        'Yijoo Um',                 # Korea Aerospace Industries (KAI)
        'Seunghyun Cha',            # KT
        'Hyeji Chang',              # LG Innotek
        'Hyun Seung Cha',           # Hyundai Rotem
        'Geonwoo Kim',              # NEXTIN, Inc
        'Pureun Jeong',             # Yujin Robotics
        'Eunjae Lee',               # Skyes Blackchain
        'Danielle Macmaster',       # An engineering company, USA
    ]),
    ('창업 · 기타', [
        'Hyobin Shin',              # 자영업
        'Sambridha Bhattarai',      # Cinder Bar 대표
        'Hojin Song',               # 병역
    ]),
]

def main():
    with open(PATH, encoding='utf-8-sig') as f:
        rd = csv.DictReader(f); rows = list(rd); cols = list(rd.fieldnames)
    if 'Rank' not in cols:
        cols.append('Rank')

    order, tier_of = {}, {}
    i = 0
    for tier_no, (label, names) in enumerate(TIERS, start=1):
        for nm in names:
            i += 1
            order[nm] = i
            tier_of[nm] = label

    alumni = [r for r in rows if r['Sectoin'].strip() == 'Alumni']
    missing = [r['Name'].strip() for r in alumni if r['Name'].strip() not in order]
    extra   = [n for n in order if n not in {r['Name'].strip() for r in alumni}]

    for r in rows:
        nm = r['Name'].strip()
        r['Rank'] = str(order[nm]) if (r['Sectoin'].strip() == 'Alumni' and nm in order) else ''

    with open(PATH, 'w', newline='', encoding='utf-8-sig') as f:
        w = csv.DictWriter(f, fieldnames=cols, quoting=csv.QUOTE_ALL)
        w.writeheader(); w.writerows(rows)

    print(f'Alumni {len(alumni)}명 중 {len(alumni) - len(missing)}명 순서 지정')
    if missing: print('  ⚠ 목록에 없어 맨 뒤로 밀림:', missing)
    if extra:   print('  ⚠ CSV 에 없는 이름:', extra)
    for label, names in TIERS:
        print(f'\n  [{label}]')
        for nm in names:
            r = next((x for x in alumni if x['Name'].strip() == nm), None)
            if r: print(f'    {order[nm]:2d}. {nm:24} → {r["Post career"]}')

main()
