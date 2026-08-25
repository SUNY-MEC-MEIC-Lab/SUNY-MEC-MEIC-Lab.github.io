# -*- coding: utf-8 -*-
"""교수 소개 페이지를 생성한다 (site/people/professor.html).

  About  : 기존 사이트 본문 + 숫자만 현재 기준으로 갱신
  학력/경력/대외활동 : 교수님 CV 기준
  수치는 site/_data/stats.yml 및 members.csv 에서 계산해 본문에 채운다.
"""
import csv, json, os, re

ROOT  = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SCRAP = os.path.join(ROOT, 'tools', '_scraped')
OUT   = os.path.join(ROOT, 'site', 'people', 'professor.html')

def counts():
    d = os.path.join(ROOT, 'site', '_data')
    j = list(csv.DictReader(open(os.path.join(d, 'journals.csv'), encoding='utf-8')))
    c = list(csv.DictReader(open(os.path.join(d, 'conference.csv'), encoding='utf-8')))
    m = list(csv.DictReader(open(os.path.join(d, 'members.csv'), encoding='utf-8')))
    return {
        'j_pub': sum(1 for x in j if x['Status'] == 'Published'),
        'j_rev': sum(1 for x in j if x['Status'] != 'Published'),
        'conf':  len(c),
        'grad':  sum(1 for x in m if x['Section'] in ('Ph.D. Students', 'Master Students')),
    }

def about_text(n):
    """기존 사이트 About 을 가져와 오래된 수치만 현재 값으로 교체"""
    t = open(os.path.join(SCRAP, 'dr-jongseong-brad-choi.txt'), encoding='utf-8').read()
    t = re.sub(r'[\x00-\x08\x0b\x0c\x0e-\x1f​﻿]', '', t)
    i = t.find('MEIC AI')
    j = t.find('Mechanical Systems with Intelligence and Computer Vision Lab')   # 푸터 (본문과 겹치지 않는 문구)
    body = [l.strip() for l in t[i + 7:j].split('\n') if l.strip()][10]

    # (1) 논문 수  (2) 대학원생 수 — 사이트 데이터 기준으로 갱신
    body = re.sub(r'he has published over \d+ journal and conference papers',
                  f"he has published {n['j_pub']} journal papers "
                  f"({n['j_rev']} more under review) and {n['conf']} conference papers",
                  body)
    body = re.sub(r'currently with \d+ graduate students', f"currently with {n['grad']} graduate students", body)
    return body

EDU = [
    ('06/2020', 'Ph.D., Mechanical Engineering', 'Purdue University, West Lafayette, IN, USA',
     'Dissertation: <em>Automating Visual Data Collection and Analytics toward Lifecycle Management of Engineering Systems</em>'),
    ('05/2014', 'M.Sc., Mechanical Engineering', 'University of Mississippi, University, MS, USA',
     'Thesis: <em>Parametric Scramjet Analysis</em>'),
    ('08/2012', 'B.Sc., Mechanical Engineering', 'University of Mississippi, University, MS, USA', ''),
]
EMP = [
    ('08/2020 – Present', 'Assistant Professor, Department of Mechanical Engineering',
     'The State University of New York, SUNY Korea, Incheon, South Korea'),
    ('2026 – Present', 'Secondary Appointment, Department of Computer Science',
     'The State University of New York, SUNY Korea, Incheon, South Korea'),
    ('09/2021 – Present', 'Affiliated Faculty (Courtesy), Department of Mechanical Engineering',
     'The State University of New York, Stony Brook University, Stony Brook, NY, USA'),
    ('12/2025 – Present', 'Founder &amp; CEO', 'MEIC AI Co., Ltd., Incheon, South Korea'),
    ('08/2014 – 05/2020', 'Graduate Research Assistant, School of Mechanical Engineering',
     'Purdue University, West Lafayette, IN, USA'),
    ('08/2012 – 05/2014', 'Graduate Research and Teaching Assistant, Department of Mechanical Engineering',
     'University of Mississippi, University, MS, USA'),
    ('09/2006 – 08/2008', 'Army Corporal, Military Service',
     'First Logistics Support Command, Republic of Korea Army, Inje-Gun, South Korea'),
]
POS = [
    ('10/2025 – Present', 'Associate Editor', 'ASME Journal of Mechanisms and Robotics, NJ, United States'),
    ('01/2025 – Present', 'Chair Committee, Board of Business',
     'The Korean Society of Mechanical Engineers (KSME) – Division of Reliability Engineering'),
    ('01/2024 – Present', 'Chair Committee, Board of Internal Business',
     'The Korean Society of Prognostics and Health Management (KSPHM)'),
    ('01/2025 – Present', 'Committee, Board of Industry-Academia Collaboration',
     'KSME – Division of IT-Intelligence Convergence'),
    ('01/2025 – Present', 'Committee, Board of Academic Affairs', 'The Korean Reliability Society'),
]

def rows(items):
    out = []
    for it in items:
        note = it[3] if len(it) > 3 else ''
        out.append(f'''  <div class="tl-row">
    <div class="tl-period">{it[0]}</div>
    <div class="tl-role">{it[1]}</div>
    <div class="tl-place">{it[2]}{f'<span class="tl-note">{note}</span>' if note else ''}</div>
  </div>''')
    return '\n'.join(out)

def main():
    n = counts()
    photo = json.load(open(os.path.join(SCRAP, 'page_media.json')))['professor_photo']
    page = f'''---
layout: default
title: Jongseong Brad Choi, Ph.D.
eyebrow: People
permalink: /people/professor/
---
<section class="prof-hero">
  <div class="wrap prof-grid">
    <div class="prof-photo">
      <img src="{{{{ '{photo}' | relative_url }}}}" alt="Jongseong Brad Choi">
    </div>
    <div class="prof-info">
      <p class="eyebrow">People</p>
      <h1>Jongseong Brad Choi, <span>Ph.D.</span></h1>
      <p class="prof-title">Assistant Professor</p>
      <p class="prof-affil">
        Department of Mechanical Engineering<br>
        The State University of New York, SUNY Korea<br>
        Stony Brook University
      </p>
      <p class="prof-links">
        <a href="mailto:jongseong.choi@stonybrook.edu">jongseong.choi@stonybrook.edu</a>
      </p>
      <p class="prof-actions">
        <a class="cta cta-outline" href="{{{{ '/assets/docs/Jongseong_Brad_Choi_CV.pdf' | relative_url }}}}" download>Download CV <span aria-hidden="true">&#8250;</span></a>
        <a class="cta cta-outline" href="https://scholar.google.com/citations?user=67bAnnUAAAAJ&amp;hl=en" target="_blank" rel="noopener">Google Scholar <span aria-hidden="true">&#8250;</span></a>
      </p>
    </div>
  </div>
</section>

<section class="page-body">
  <div class="wrap">
    <div class="section-label">About</div>
    <p>{about_text(n)}</p>

    <div class="section-label">Research Interests</div>
    <p class="muted">Machine Vision · Neural Scene Representation · Physics-Informed AI ·
       Multimodal Spatial AI · Simulation-to-Real Learning · Physical-AI ·
       Human-in-the-loop Robotics · PHM · SHM</p>

    <div class="section-label">Education</div>
    <div class="timeline">
{rows(EDU)}
    </div>

    <div class="section-label">Employment History</div>
    <div class="timeline">
{rows(EMP)}
    </div>

    <div class="section-label">Professional Positions</div>
    <div class="timeline">
{rows(POS)}
    </div>
  </div>
</section>
'''
    open(OUT, 'w', encoding='utf-8').write(page)
    print(f"교수 페이지 생성 — 저널 {n['j_pub']}편(심사중 {n['j_rev']}) / 학회 {n['conf']}편 / 대학원생 {n['grad']}명")

main()
