# MEIC Laboratory 웹사이트

Jekyll 정적 사이트. Wix 에서 이전.

## 구조

```
data/                Wix CSV export 원본 (여기에 새 export 를 덮어쓴다)
tools/               데이터·이미지 파이프라인 스크립트
site/                Jekyll 사이트 (빌드 대상)
  _data/             tools/build_data.py 가 생성 — 직접 수정하지 말 것
  assets/<분류>/     웹용 WebP 이미지
assets_original/     Wix 원본 이미지 (git 제외)
```

## 콘텐츠 갱신

1. Wix CMS 에서 CSV 를 내보내 `data/` 에 덮어쓴다
2. `python3 tools/fetch_wix_images.py` — 새 이미지 내려받기 (필요할 때만)
3. `python3 tools/optimize_images.py` — WebP 변환 + 뉴스 파일명 정리
4. `python3 tools/build_data.py` — `site/_data/` 갱신
5. commit & push → GitHub Actions 가 자동 배포

## 로컬 미리보기

```bash
conda activate labsite
export GEM_HOME=/home/meic/miniconda3/envs/labsite/share/rubygems
export PATH=$GEM_HOME/bin:$PATH
cd site && jekyll serve --livereload      # http://localhost:4000
```
