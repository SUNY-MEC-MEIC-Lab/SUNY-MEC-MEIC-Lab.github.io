# -*- coding: utf-8 -*-
"""연구그룹 3개 페이지를 생성한다 (본문 + 원본 이미지 + YouTube 임베드).

  본문   : tools/_scraped/<page>.txt      (기존 Wix 사이트에서 수집)
  이미지 : tools/_scraped/page_media.json (DOM 순서로 섹션에 매핑)
  영상   : 아래 VIDEOS  (섹션 번호 -> YouTube ID)
"""
import json, os, re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC  = os.path.join(ROOT, 'tools', '_scraped')

PAGES = [
    ('3d-reconstruction-team',        'neural-rendering', 'Neural Rendering & Spatial AI Group'),
    ('copy-of-3d-reconstruction-team', 'pdi-multimodal',  'PDI & Multimodal AI Group'),
    ('copy-of-ar-vr-team',            'pia-embodied',     'PIA & Embodied AI Group'),
]

VIDEOS = {
    'neural-rendering': {
        1: ['sFVd9xadQKU'],                    # Micro-Splatting
        2: ['VqsfgKjf9U8'],                    # ReVIEW
        4: ['uKQ9KkWU9qk', 'pZfm7TG3dgM'],     # Data Localization on a Hyper-Realistic Display Model
    },
    'pdi-multimodal': {
        1: ['3yvMV7Hh9MQ'],                    # LiDAR-RGB Camera Sensor Fusion
        2: ['3EbnmCrZffk'],                    # High-Fidelity 3D Map
        3: ['8fV65GJ26AA'],                    # Spatial Alignment
        4: ['yrGOJmk6oGs'],                    # Remote Collaboration
        5: ['qGllrwDXY8M', 'RzewsfXvwWM'],     # PTZ 카메라 / 6DoF 로봇팔
        6: ['Hs_k5SBCqNg'],                    # Smart construction monitoring
    },
    'pia-embodied': {
        1: ['Wid2fpsdwqw'],                    # EV-PINN
        4: ['iPlkJGpI3nw'],                    # LogPath
    },
}

def body(name):
    t = open(os.path.join(SRC, name + '.txt'), encoding='utf-8').read()
    t = re.sub(r'[\x00-\x08\x0b\x0c\x0e-\x1f​﻿]', '', t)
    i = t.find('MEIC AI'); j = t.find('Mechanical Systems with Intelligence')
    return [l.strip() for l in t[i+7:j if j > 0 else None].split('\n') if l.strip()]

def figures(paths):
    if not paths: return ''
    cls = 'fig-grid' + (' fig-single' if len(paths) == 1 else '')
    out = [f'\n<div class="{cls}">\n']
    for p in paths:
        out.append(f"  <a href=\"{{{{ '{p}' | relative_url }}}}\" target=\"_blank\" rel=\"noopener\">"
                   f"<img src=\"{{{{ '{p}' | relative_url }}}}\" alt=\"\" loading=\"lazy\"></a>\n")
    out.append('</div>\n\n')
    return ''.join(out)

def videos(ids):
    if not ids: return ''
    cls = 'video-grid' + (' video-single' if len(ids) == 1 else '')
    out = [f'\n<div class="{cls}">\n']
    for v in ids:
        out.append(
            '  <div class="video-frame">'
            f'<iframe src="https://www.youtube-nocookie.com/embed/{v}" title="YouTube video" '
            'loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; '
            'gyroscope; picture-in-picture" allowfullscreen></iframe></div>\n')
    out.append('</div>\n\n')
    return ''.join(out)

def main():
    media = json.load(open(os.path.join(SRC, 'page_media.json')))
    for page, key, title in PAGES:
        b = body(page)
        if b and b[0] == 'RESEARCH': b = b[1:]
        while b and b[0].lower().replace('group', '').strip() == title.lower().replace('group', '').strip():
            b = b[1:]
        imgs = media.get(key, {})
        vids = VIDEOS.get(key, {})
        out = [f'---\nlayout: page\ntitle: {title}\neyebrow: Research\npermalink: /research/{key}/\n---\n\n']
        out.append(figures(imgs.get('0', [])))
        i, cur = 0, None

        def close(sec):
            return figures(imgs.get(str(sec), [])) + videos(vids.get(sec, []))

        while i < len(b):
            l = b[i]
            if l == 'CONTACT':
                if cur is not None: out.append(close(cur)); cur = None
                out.append('## Contact\n\n'); i += 1
                while i < len(b) and ('@' in b[i] or b[i].startswith('E-mail')):
                    out.append(b[i].replace('E-mail:', '').strip() + '  \n'); i += 1
                out.append('\n'); continue
            if l in ('MISSION STATEMENT', 'RESEARCH INTEREST', 'Detailed Work'):
                if cur is not None: out.append(close(cur)); cur = None
                out.append(f'\n## {l.title()}\n\n'); i += 1
                if l == 'RESEARCH INTEREST':
                    while i < len(b) and not re.match(r'^(Detailed Work|MISSION|\d+\.)', b[i]):
                        out.append(f'- {b[i]}\n'); i += 1
                    out.append('\n')
                continue
            m = re.match(r'^(\d+)\.\s', l)
            if m:
                if cur is not None: out.append(close(cur))
                cur = int(m.group(1))
                out.append(f'\n### {l}\n\n'); i += 1; continue
            out.append(l + '\n\n'); i += 1
        if cur is not None: out.append(close(cur))

        open(os.path.join(ROOT, 'site', 'research', key + '.md'), 'w', encoding='utf-8').write(''.join(out))
        nv = sum(len(v) for v in vids.values())
        ni = sum(len(v) for k, v in imgs.items())
        print(f'  site/research/{key}.md — 이미지 {ni}장 / 영상 {nv}편')

main()
