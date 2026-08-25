/* ==========================================================================
   MEIC Lab — hero visuals (Three.js)
   data-scene="home"   : 연구실 전체 — 기어/3DGS/구조물/파동장 모핑 + 캡션
   data-scene="neural" : 교량을 SfM → 3D Gaussian Splatting → SVRaster 로 재구성
   data-scene="pdi"    : LiDAR SLAM 맵핑 → 3DGS↔Unity 맵 ICP 정합
   data-scene="pia"    : PINN — 신경망 펄스가 물리 파동장을 학습(수렴)
   ========================================================================== */
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';

const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
const LOW = matchMedia('(max-width: 820px)').matches;
const DENSITY = LOW ? 0.5 : 1;
const TAU = Math.PI * 2;
const ease = (t) => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));

/* 구간 [a,b]에서 1, 경계 fade 구간에서 0↔1 (순환 주기 T 고려) */
function env1(l, a, b, f) {
  if (l < a - f || l > b + f) return 0;
  if (l < a) return ease((l - (a - f)) / f);
  if (l > b) return 1 - ease((l - b) / f);
  return 1;
}
const env = (l, a, b, f, T) => Math.max(env1(l, a, b, f), env1(l - T, a, b, f), env1(l + T, a, b, f));

/* 마우스 패럴랙스 */
const pointer = { x: 0, y: 0 };
addEventListener('pointermove', (e) => {
  pointer.x = (e.clientX / innerWidth) * 2 - 1;
  pointer.y = (e.clientY / innerHeight) * 2 - 1;
}, { passive: true });

/* ---------- 팔레트 ---------- */
const C_ACCENT = [0.35, 0.64, 1.0];
const C_VIOLET = [0.62, 0.5, 1.0];
const C_CYAN   = [0.55, 0.92, 1.0];
const C_WHITE  = [0.93, 0.97, 1.0];
function mix3(a, b, t, out, k = 1) {
  out[0] = (a[0] + (b[0] - a[0]) * t) * k;
  out[1] = (a[1] + (b[1] - a[1]) * t) * k;
  out[2] = (a[2] + (b[2] - a[2]) * t) * k;
  return out;
}

/* ---------- 선명한 포인트 스플랫 재질 ---------- */
function splatMaterial(opacity = 1) {
  return new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uScale: { value: 300 }, uOpacity: { value: opacity }, uBoost: { value: 1 } },
    vertexShader: `
      attribute float aSize; attribute vec3 aColor;
      uniform float uScale; varying vec3 vColor;
      void main () {
        vColor = aColor;
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = aSize * uScale / max(0.1, -mv.z);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: `
      uniform float uOpacity; uniform float uBoost; varying vec3 vColor;
      void main () {
        float d = length(gl_PointCoord - 0.5) * 2.0;
        float a = exp(-4.5 * d * d) * smoothstep(1.0, 0.82, d) * uOpacity;
        if (a < 0.012) discard;
        gl_FragColor = vec4(vColor * uBoost, a);
      }`,
  });
}

function makeCloud(count, opacity = 1) {
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(count * 3);
  const col = new Float32Array(count * 3);
  const size = new Float32Array(count);
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('aColor', new THREE.BufferAttribute(col, 3));
  geo.setAttribute('aSize', new THREE.BufferAttribute(size, 1));
  const mat = splatMaterial(opacity);
  const points = new THREE.Points(geo, mat);
  points.frustumCulled = false;
  return { geo, pos, col, size, mat, points };
}

/* ---------- 이방성(타원) 가우시안 스플랫 — 3DGS 표현용 ---------- */
function quadSplatMesh(splats) {
  // splats: [{p:[3], t:[3](접선), len, wid, c:[3]}]
  const n = splats.length;
  const center = new Float32Array(n * 4 * 3);
  const offset = new Float32Array(n * 4 * 3);
  const uv = new Float32Array(n * 4 * 2);
  const col = new Float32Array(n * 4 * 3);
  const idx = new Uint32Array(n * 6);
  const a1 = new THREE.Vector3(), a2 = new THREE.Vector3(), tv = new THREE.Vector3(), rnd = new THREE.Vector3();
  for (let i = 0; i < n; i++) {
    const s = splats[i];
    tv.set(s.t[0], s.t[1], s.t[2]).normalize();
    rnd.set(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5);
    a2.crossVectors(tv, rnd).normalize();
    a1.copy(tv).multiplyScalar(s.len / 2);
    a2.multiplyScalar(s.wid / 2);
    const CORN = [[-1, -1], [1, -1], [1, 1], [-1, 1]];
    for (let k = 0; k < 4; k++) {
      const v = i * 4 + k;
      center.set(s.p, v * 3);
      offset[v * 3] = a1.x * CORN[k][0] + a2.x * CORN[k][1];
      offset[v * 3 + 1] = a1.y * CORN[k][0] + a2.y * CORN[k][1];
      offset[v * 3 + 2] = a1.z * CORN[k][0] + a2.z * CORN[k][1];
      uv[v * 2] = CORN[k][0]; uv[v * 2 + 1] = CORN[k][1];
      col.set(s.c, v * 3);
    }
    idx.set([i * 4, i * 4 + 1, i * 4 + 2, i * 4, i * 4 + 2, i * 4 + 3], i * 6);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('aCenter', new THREE.BufferAttribute(center, 3));
  geo.setAttribute('position', new THREE.BufferAttribute(center.slice(), 3)); // 미사용(관례상 필요)
  geo.setAttribute('aOffset', new THREE.BufferAttribute(offset, 3));
  geo.setAttribute('aUv', new THREE.BufferAttribute(uv, 2));
  geo.setAttribute('aColor', new THREE.BufferAttribute(col, 3));
  geo.setIndex(new THREE.BufferAttribute(idx, 1));
  const mat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    uniforms: { uOpacity: { value: 0 }, uGrow: { value: 1 } },
    vertexShader: `
      attribute vec3 aCenter; attribute vec3 aOffset; attribute vec2 aUv; attribute vec3 aColor;
      uniform float uGrow; varying vec2 vUv; varying vec3 vColor;
      void main () {
        vUv = aUv; vColor = aColor;
        vec3 p = aCenter + aOffset * uGrow;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
      }`,
    fragmentShader: `
      uniform float uOpacity; varying vec2 vUv; varying vec3 vColor;
      void main () {
        float r2 = dot(vUv, vUv);
        float a = exp(-2.6 * r2) * uOpacity;
        if (a < 0.012) discard;
        gl_FragColor = vec4(vColor, a);
      }`,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.frustumCulled = false;
  return { mesh, mat };
}

/* ---------- 단계 캡션 (히어로 우하단 pill) ---------- */
function makeCaption(el) {
  const sec = el.closest('section') || el.parentElement;
  const div = document.createElement('div');
  div.className = 'hero-caption';
  sec.appendChild(div);
  let cur = '';
  return (txt, instant) => {
    if (txt === cur) return;
    cur = txt;
    if (instant) { div.textContent = txt; return; }
    div.classList.add('is-swap');
    setTimeout(() => { div.textContent = txt; div.classList.remove('is-swap'); }, 240);
  };
}

/* ==========================================================================
   HOME — 기어 → 3DGS 매듭 → 구조물 → 파동장 모핑 (연구실 전체 개요)
   ========================================================================== */
function shapeGear(n) {
  const a = new Float32Array(n * 3);
  const teeth = 9, thick = 0.3;
  for (let i = 0; i < n; i++) {
    const th = Math.random() * TAU;
    const sq = Math.max(-1, Math.min(1, Math.sin(th * teeth) * 3));
    const rOut = 1.28 + 0.2 * sq;
    const pick = Math.random();
    let r;
    if (pick < 0.14) r = 0.3 + Math.random() * 0.1;
    else if (pick < 0.4) r = 0.5 + Math.sqrt(Math.random()) * (rOut - 0.62);
    else r = rOut - 0.13 + Math.random() * 0.13;
    a[i * 3] = r * Math.cos(th);
    a[i * 3 + 1] = r * Math.sin(th);
    a[i * 3 + 2] = (Math.random() - 0.5) * thick;
  }
  return a;
}
function shapeKnot(n) {
  const a = new Float32Array(n * 3);
  const s = 0.44, tube = 0.15;
  for (let i = 0; i < n; i++) {
    const t = Math.random() * TAU;
    a[i * 3] = (Math.sin(t) + 2 * Math.sin(2 * t)) * s + (Math.random() - 0.5) * tube;
    a[i * 3 + 1] = (Math.cos(t) - 2 * Math.cos(2 * t)) * s + (Math.random() - 0.5) * tube;
    a[i * 3 + 2] = -Math.sin(3 * t) * s * 1.4 + (Math.random() - 0.5) * tube;
  }
  return a;
}
function shapeCity(n) {
  const a = new Float32Array(n * 3);
  const grid = 5, cell = 0.72, base = 0.46, y0 = -1.15;
  const b = [];
  for (let gx = 0; gx < grid; gx++) for (let gz = 0; gz < grid; gz++)
    b.push({ x: (gx - 2) * cell, z: (gz - 2) * cell, h: 0.35 + Math.random() * 1.6 });
  const half = base / 2;
  for (let i = 0; i < n; i++) {
    const bd = b[(Math.random() * b.length) | 0];
    const r = Math.random();
    let x, y, z;
    if (r < 0.55) {
      x = bd.x + (Math.random() < 0.5 ? -half : half);
      z = bd.z + (Math.random() < 0.5 ? -half : half);
      y = y0 + Math.random() * bd.h;
    } else {
      const top = r < 0.85, t = Math.random() * 4, e = t | 0, f = t - e;
      x = bd.x + (e === 0 ? -half + f * base : e === 1 ? half : e === 2 ? half - f * base : -half);
      z = bd.z + (e === 0 ? -half : e === 1 ? -half + f * base : e === 2 ? half : half - f * base);
      y = y0 + (top ? bd.h : 0);
    }
    a[i * 3] = x; a[i * 3 + 1] = y; a[i * 3 + 2] = z;
  }
  return a;
}
function shapeField(n) {
  const a = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    a[i * 3] = (Math.random() * 2 - 1) * 2.15;
    a[i * 3 + 1] = 0;
    a[i * 3 + 2] = (Math.random() * 2 - 1) * 1.5;
  }
  return a;
}

function initHome(scene, ctx) {
  const n = Math.round(6000 * DENSITY);
  const cloud = makeCloud(n, 0.55);
  const shapes = [shapeGear(n), shapeKnot(n), shapeCity(n), shapeField(n)];
  const caps = ['Mechanical Systems', 'Neural Rendering · 3D Gaussian Splatting',
    'Hyper-realistic Digital Twin', 'Physics-Informed AI'];
  const c = [0, 0, 0];
  for (let i = 0; i < n; i++) {
    const r = Math.random(), bright = 0.55 + Math.random() * 0.45;
    if (r < 0.55) mix3(C_ACCENT, C_CYAN, Math.random(), c, bright);
    else if (r < 0.85) mix3(C_ACCENT, C_VIOLET, Math.random(), c, bright);
    else mix3(C_CYAN, C_WHITE, Math.random(), c, bright);
    cloud.col.set(c, i * 3);
    cloud.size[i] = 0.022 + Math.random() * 0.034;
  }
  cloud.geo.attributes.aColor.needsUpdate = true;
  cloud.geo.attributes.aSize.needsUpdate = true;

  const group = new THREE.Group();
  group.add(cloud.points);
  group.scale.setScalar(0.92);
  scene.add(group);
  ctx.camera.position.set(0, 0.25, 5.3);
  ctx.camera.lookAt(0, 0, 0);
  ctx.pointMats.push(cloud.mat);
  // 배너 레이아웃: 텍스트 아래 중앙 하단에 배치
  ctx.onResize = (w) => {
    group.position.set(0, -1.5, 0);
    group.scale.setScalar(w > 980 ? 0.88 : 0.66);
  };
  const setCap = makeCaption(ctx.el);

  const HOLD = 5.2, TRANS = 2.2, SEG = HOLD + TRANS;
  return function update(t, dt) {
    const idx = Math.floor(t / SEG) % 4;
    const local = t % SEG;
    const w = local < HOLD ? 0 : ease((local - HOLD) / TRANS);
    const cur = shapes[idx], next = shapes[(idx + 1) % 4];
    const fieldW = idx === 3 ? 1 - w : (idx === 2 ? w : 0);
    const p = cloud.pos;
    for (let i = 0; i < n; i++) {
      const j = i * 3;
      let x = cur[j] + (next[j] - cur[j]) * w;
      let y = cur[j + 1] + (next[j + 1] - cur[j + 1]) * w;
      let z = cur[j + 2] + (next[j + 2] - cur[j + 2]) * w;
      if (fieldW > 0.001) {
        y += fieldW * (0.34 * Math.sin(1.9 * x - 1.15 * t) * Math.cos(1.6 * z - 0.8 * t)
                     + 0.12 * Math.sin(3.1 * (x + z) + 1.6 * t));
      }
      p[j] = x; p[j + 1] = y; p[j + 2] = z;
    }
    cloud.geo.attributes.position.needsUpdate = true;
    setCap(caps[w > 0.5 ? (idx + 1) % 4 : idx]);
    group.rotation.y = 0.55 * Math.sin(t * 0.22) + pointer.x * 0.24;
    group.rotation.x = -0.14 + pointer.y * 0.09;
  };
}

/* ==========================================================================
   NEURAL — 아치교를 SfM 포인트 → 3D Gaussian Splatting → SVRaster 복셀로
   ========================================================================== */
function sampleBridge(n) {
  // 아치교: 상판 + 아치 리브 2개 + 행어 케이블 + 교대. {p, t(접선), part}
  const out = [];
  const archY = (x) => 1.22 * (1 - (x / 2.3) * (x / 2.3));
  const c = [0, 0, 0];
  for (let i = 0; i < n; i++) {
    const r = Math.random();
    let p, tg, part;
    if (r < 0.36) {                     // 상판
      const x = (Math.random() * 2 - 1) * 2.3;
      const z = (Math.random() * 2 - 1) * 0.42;
      const y = Math.random() < 0.7 ? 0.02 : -0.09;
      p = [x, y + (Math.random() - 0.5) * 0.02, z]; tg = [1, 0, 0.12 * (Math.random() - 0.5)]; part = 0;
    } else if (r < 0.66) {              // 아치 리브
      const x = (Math.random() * 2 - 1) * 2.3;
      const z = Math.random() < 0.5 ? -0.42 : 0.42;
      const y = archY(x);
      const slope = -2 * 1.22 * x / (2.3 * 2.3);
      p = [x + (Math.random() - 0.5) * 0.05, y + (Math.random() - 0.5) * 0.05, z + (Math.random() - 0.5) * 0.05];
      tg = [1, slope, 0]; part = 1;
    } else if (r < 0.82) {              // 행어 케이블
      const k = 1 + ((Math.random() * 9) | 0);        // x = -2.0..2.0 (0.4 간격)
      const x = -2.0 + (k - 1) * 0.445;
      const z = Math.random() < 0.5 ? -0.42 : 0.42;
      const y = 0.02 + Math.random() * Math.max(0.05, archY(x) - 0.04);
      p = [x + (Math.random() - 0.5) * 0.015, y, z + (Math.random() - 0.5) * 0.015];
      tg = [0, 1, 0]; part = 2;
    } else {                            // 교대(양끝 지지)
      const x = (Math.random() < 0.5 ? -1 : 1) * (2.3 + Math.random() * 0.12);
      const z = (Math.random() * 2 - 1) * 0.46;
      const y = -0.72 + Math.random() * 0.72;
      p = [x, y, z]; tg = [0, 1, 0.3 * (Math.random() - 0.5)]; part = 3;
    }
    // 색: 상판 accent, 아치 cyan, 케이블 white-ish, 교대 violet-ish
    if (part === 0) mix3(C_ACCENT, C_CYAN, Math.random() * 0.4, c, 0.6 + Math.random() * 0.4);
    else if (part === 1) mix3(C_CYAN, C_WHITE, Math.random() * 0.5, c, 0.6 + Math.random() * 0.4);
    else if (part === 2) mix3(C_WHITE, C_CYAN, Math.random() * 0.5, c, 0.5 + Math.random() * 0.35);
    else mix3(C_ACCENT, C_VIOLET, Math.random() * 0.6, c, 0.5 + Math.random() * 0.35);
    out.push({ p, t: tg, c: [c[0], c[1], c[2]] });
  }
  return out;
}

function buildVoxels(samples, group) {
  // 밀도 기반 2단계 희소 복셀 (SVRaster 스타일: 세밀한 곳은 fine, 성근 곳은 coarse)
  const FINE = 0.17, COARSE = 0.34;
  const fine = new Map(), coarse = new Map();
  const key = (x, y, z) => x + '_' + y + '_' + z;
  for (const s of samples) {
    const fx = Math.floor(s.p[0] / FINE), fy = Math.floor(s.p[1] / FINE), fz = Math.floor(s.p[2] / FINE);
    fine.set(key(fx, fy, fz), (fine.get(key(fx, fy, fz)) || 0) + 1);
    const cx = Math.floor(s.p[0] / COARSE), cy = Math.floor(s.p[1] / COARSE), cz = Math.floor(s.p[2] / COARSE);
    coarse.set(key(cx, cy, cz), (coarse.get(key(cx, cy, cz)) || 0) + 1);
  }
  const boxes = [];
  for (const [k, cnt] of coarse) {
    const [cx, cy, cz] = k.split('_').map(Number);
    if (cnt >= 14) {
      for (const [fk, fc] of fine) {
        const [fx, fy, fz] = fk.split('_').map(Number);
        if (fc >= 2 && Math.floor(fx * FINE / COARSE) === cx && Math.floor(fy * FINE / COARSE) === cy
          && Math.floor(fz * FINE / COARSE) === cz) {
          boxes.push({ x: (fx + 0.5) * FINE, y: (fy + 0.5) * FINE, z: (fz + 0.5) * FINE, s: FINE });
        }
      }
    } else if (cnt >= 2) {
      boxes.push({ x: (cx + 0.5) * COARSE, y: (cy + 0.5) * COARSE, z: (cz + 0.5) * COARSE, s: COARSE });
    }
  }
  const solidMat = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false });
  const inst = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), solidMat, boxes.length);
  const m = new THREE.Matrix4(), colObj = new THREE.Color();
  const edgePos = new Float32Array(boxes.length * 12 * 2 * 3);
  const E = [[0,1],[1,2],[2,3],[3,0],[4,5],[5,6],[6,7],[7,4],[0,4],[1,5],[2,6],[3,7]];
  boxes.forEach((b, i) => {
    m.makeScale(b.s * 0.88, b.s * 0.88, b.s * 0.88);
    m.setPosition(b.x, b.y, b.z);
    inst.setMatrixAt(i, m);
    const hn = Math.max(0, Math.min(1, (b.y + 0.7) / 2.0));
    colObj.setRGB(0.1 + 0.2 * hn, 0.2 + 0.4 * hn, 0.45 + 0.4 * hn);
    inst.setColorAt(i, colObj);
    const h = b.s * 0.44;
    const V = [[-h,-h,-h],[h,-h,-h],[h,h,-h],[-h,h,-h],[-h,-h,h],[h,-h,h],[h,h,h],[-h,h,h]];
    E.forEach((e, j) => {
      const o = (i * 12 + j) * 6;
      edgePos[o] = b.x + V[e[0]][0]; edgePos[o + 1] = b.y + V[e[0]][1]; edgePos[o + 2] = b.z + V[e[0]][2];
      edgePos[o + 3] = b.x + V[e[1]][0]; edgePos[o + 4] = b.y + V[e[1]][1]; edgePos[o + 5] = b.z + V[e[1]][2];
    });
  });
  inst.instanceMatrix.needsUpdate = true;
  if (inst.instanceColor) inst.instanceColor.needsUpdate = true;
  inst.frustumCulled = false;
  const edgeGeo = new THREE.BufferGeometry();
  edgeGeo.setAttribute('position', new THREE.BufferAttribute(edgePos, 3));
  const edgeMat = new THREE.LineBasicMaterial({
    color: 0x6fb0ff, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false,
  });
  const edges = new THREE.LineSegments(edgeGeo, edgeMat);
  edges.frustumCulled = false;
  group.add(inst, edges);
  return { solidMat, edgeMat };
}

function buildFrustums(group) {
  const CAMS = 6, pos = [];
  for (let i = 0; i < CAMS; i++) {
    const a = (i / CAMS) * TAU;
    const cx = Math.cos(a) * 3.4, cz = Math.sin(a) * 2.2, cy = 0.9 + 0.7 * Math.sin(a * 2);
    const apex = new THREE.Vector3(cx, cy, cz);
    const dir = new THREE.Vector3(0, 0.35, 0).sub(apex).normalize();
    const right = new THREE.Vector3().crossVectors(dir, new THREE.Vector3(0, 1, 0)).normalize();
    const up = new THREE.Vector3().crossVectors(right, dir);
    const cbase = apex.clone().add(dir.clone().multiplyScalar(0.55));
    const corners = [];
    for (const [sx, sy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
      corners.push(cbase.clone().add(right.clone().multiplyScalar(0.3 * sx)).add(up.clone().multiplyScalar(0.2 * sy)));
    }
    for (let k = 0; k < 4; k++) {
      pos.push(apex.x, apex.y, apex.z, corners[k].x, corners[k].y, corners[k].z);
      const nx = corners[(k + 1) % 4];
      pos.push(corners[k].x, corners[k].y, corners[k].z, nx.x, nx.y, nx.z);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  const mat = new THREE.LineBasicMaterial({
    color: 0x8cb8ff, transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false,
  });
  const lines = new THREE.LineSegments(geo, mat);
  lines.frustumCulled = false;
  const g = new THREE.Group();
  g.add(lines);
  group.add(g);
  return { g, mat };
}

function initNeural(scene, ctx) {
  const n = Math.round(5200 * DENSITY);
  const samples = sampleBridge(n);

  // ① SfM 포인트 클라우드
  const pts = makeCloud(n, 0);
  for (let i = 0; i < n; i++) {
    pts.pos.set(samples[i].p, i * 3);
    pts.col.set(samples[i].c, i * 3);
    pts.size[i] = 0.02 + Math.random() * 0.022;
  }
  pts.geo.attributes.position.needsUpdate = true;
  pts.geo.attributes.aColor.needsUpdate = true;
  pts.geo.attributes.aSize.needsUpdate = true;

  // ② 3DGS 이방성 스플랫
  const splats = samples.map((s) => ({
    p: s.p, t: s.t, c: s.c,
    len: 0.1 + Math.random() * 0.12,
    wid: 0.03 + Math.random() * 0.035,
  }));
  const gs = quadSplatMesh(splats);

  const group = new THREE.Group();
  group.add(pts.points, gs.mesh);
  // ③ SVRaster 복셀 + 캡처 카메라 프러스텀
  const vox = buildVoxels(samples, group);
  const fr = buildFrustums(group);
  group.position.y = -0.25;
  scene.add(group);

  ctx.camera.position.set(0, 0.5, 5.4);
  ctx.camera.lookAt(0, 0, 0);
  ctx.pointMats.push(pts.mat);
  ctx.onResize = (w) => {
    group.position.set(0, -1.2, 0);
    group.scale.setScalar(w > 980 ? 0.82 : 0.62);
  };
  const setCap = makeCaption(ctx.el);

  const T = 19;
  return function update(t, dt) {
    const l = t % T;
    const eP = env(l, 0.5, 5.2, 1.1, T);     // SfM 포인트
    const eG = env(l, 6.8, 11.6, 1.1, T);    // 3DGS
    const eV = env(l, 13.2, 18.0, 1.1, T);   // SVRaster
    pts.mat.uniforms.uOpacity.value = 0.85 * Math.max(eP, 0.22 * eG);  // GS 아래 살짝 유지
    gs.mat.uniforms.uOpacity.value = 0.5 * eG;
    gs.mat.uniforms.uGrow.value = 0.25 + 0.75 * ease(Math.min(1, eG * 1.4));
    vox.solidMat.opacity = 0.3 * eV;
    vox.edgeMat.opacity = 0.26 * eV;
    fr.mat.opacity = 0.12 + 0.45 * eP;
    fr.g.rotation.y = t * 0.3;               // 캡처 궤도 회전
    setCap(l < 6 ? 'Multi-view Capture · SfM' : l < 12.4 ? '3D Gaussian Splatting' : 'SVRaster · Sparse Voxels');
    group.rotation.y = 0.45 * Math.sin(t * 0.16) + pointer.x * 0.22;
    group.rotation.x = 0.02 + pointer.y * 0.07;
  };
}

/* ==========================================================================
   PDI — LiDAR SLAM 맵핑(스캔 레이·궤적·루프 클로저) → 3DGS↔Unity ICP 정합
   ========================================================================== */
function initPdi(scene, ctx) {
  const nx = Math.round(104 * Math.sqrt(DENSITY));
  const nz = Math.round(66 * Math.sqrt(DENSITY));
  const n = nx * nz;
  const cloud = makeCloud(n, 1);
  const groundY = -0.72;
  const px = new Float32Array(n), pz = new Float32Array(n), onB = new Uint8Array(n);
  const blocks = [];
  for (let k = 0; k < 9; k++) {
    blocks.push({
      x: (Math.random() * 2 - 1) * 2.5, z: (Math.random() * 2 - 1) * 1.4,
      w: 0.25 + Math.random() * 0.4, d: 0.25 + Math.random() * 0.4, h: 0.35 + Math.random() * 0.8,
    });
  }
  let i = 0;
  for (let ix = 0; ix < nx; ix++) for (let iz = 0; iz < nz; iz++) {
    const x = (ix / (nx - 1) * 2 - 1) * 3.25 + (Math.random() - 0.5) * 0.05;
    const z = (iz / (nz - 1) * 2 - 1) * 2.05 + (Math.random() - 0.5) * 0.05;
    let y = groundY + 0.14 * Math.sin(x * 1.3 + 2.1) * Math.cos(z * 1.7) + 0.07 * Math.sin(x * 3.1) * Math.sin(z * 2.6);
    for (const b of blocks) {
      if (Math.abs(x - b.x) < b.w && Math.abs(z - b.z) < b.d) { y = groundY + b.h; onB[i] = 1; break; }
    }
    cloud.pos[i * 3] = x; cloud.pos[i * 3 + 1] = y; cloud.pos[i * 3 + 2] = z;
    px[i] = x; pz[i] = z;
    cloud.size[i] = onB[i] ? 0.032 + Math.random() * 0.026 : 0.024 + Math.random() * 0.02;
    i++;
  }
  cloud.geo.attributes.position.needsUpdate = true;
  cloud.geo.attributes.aSize.needsUpdate = true;
  const rev = new Float32Array(n);

  // 고스트 맵 (Unity 가상 맵) — 지오메트리 공유, 보라색
  const gGeo = new THREE.BufferGeometry();
  gGeo.setAttribute('position', cloud.geo.attributes.position);
  gGeo.setAttribute('aSize', cloud.geo.attributes.aSize);
  const gCol = new Float32Array(n * 3);
  const c = [0, 0, 0];
  for (let k = 0; k < n; k++) {
    mix3([0.72, 0.42, 1.0], C_WHITE, Math.random() * 0.25, c, 0.8 + Math.random() * 0.2);
    gCol.set(c, k * 3);
  }
  gGeo.setAttribute('aColor', new THREE.BufferAttribute(gCol, 3));
  const gMat = splatMaterial(0);
  const ghost = new THREE.Points(gGeo, gMat);
  ghost.frustumCulled = false;
  const ghostGroup = new THREE.Group();
  ghostGroup.add(ghost);

  // 스캐너·궤적·스캔 레이·펄스 링
  const scanner = makeCloud(1, 1);
  scanner.col.set(C_WHITE, 0); scanner.size[0] = 0.16;
  scanner.geo.attributes.aColor.needsUpdate = true;
  scanner.geo.attributes.aSize.needsUpdate = true;

  const TRAILMAX = 420;
  const trailGeo = new THREE.BufferGeometry();
  const trailPos = new Float32Array(TRAILMAX * 3);
  trailGeo.setAttribute('position', new THREE.BufferAttribute(trailPos, 3));
  trailGeo.setDrawRange(0, 0);
  const trail = new THREE.Line(trailGeo, new THREE.LineBasicMaterial({
    color: 0x5aa2ff, transparent: true, opacity: 0.75, blending: THREE.AdditiveBlending, depthWrite: false,
  }));
  trail.frustumCulled = false;
  let trailN = 0;

  const RAYS = 70;
  const rayGeo = new THREE.BufferGeometry();
  const rayPos = new Float32Array(RAYS * 2 * 3);
  rayGeo.setAttribute('position', new THREE.BufferAttribute(rayPos, 3));
  rayGeo.setDrawRange(0, 0);
  const rays = new THREE.LineSegments(rayGeo, new THREE.LineBasicMaterial({
    color: 0x6fd9ff, transparent: true, opacity: 0.22, blending: THREE.AdditiveBlending, depthWrite: false,
  }));
  rays.frustumCulled = false;

  const ringMat = new THREE.MeshBasicMaterial({
    color: 0x5aa2ff, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
  });
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.96, 1, 64), ringMat);
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = groundY + 0.06;

  const group = new THREE.Group();
  group.add(cloud.points, ghostGroup, scanner.points, trail, rays, ring);
  scene.add(group);
  ctx.camera.position.set(0, 2.35, 4.1);
  ctx.camera.lookAt(0, -0.35, 0);
  ctx.pointMats.push(cloud.mat, gMat, scanner.mat);
  ctx.onResize = (w) => {
    group.position.y = -0.3;
    group.scale.setScalar(w > 980 ? 1 : 0.72);
  };
  const setCap = makeCaption(ctx.el);

  const path = (s) => {  // figure-8 순회 경로
    const a = s * TAU;
    return [2.35 * Math.sin(a), groundY + 0.42, 1.35 * Math.sin(2 * a) * 0.85];
  };
  const dimG = [0.1, 0.17, 0.3], dimB = [0.14, 0.2, 0.36];
  const litG = [0.35, 0.64, 1.0], litB = [0.55, 0.92, 1.0];

  const T = 18, SCAN_END = 8.5;
  let prevL = 0, flash = 0, flashFired = false;
  return function update(t, dt) {
    const l = t % T;
    if (l < prevL) { rev.fill(0); trailN = 0; flashFired = false; }   // 사이클 리셋
    prevL = l;
    const scanning = l < SCAN_END;
    const s = Math.min(1, l / SCAN_END);
    const sp = path(s);

    // 스캔 반경 내 포인트 점등
    let nRay = 0;
    if (scanning) {
      const r2 = 1.15 * 1.15;
      for (let k = 0; k < n; k++) {
        const dx = px[k] - sp[0], dz = pz[k] - sp[2];
        const d2 = dx * dx + dz * dz;
        if (d2 < r2) {
          rev[k] = Math.min(1, rev[k] + dt * 3.2);
          if (nRay < RAYS && Math.random() < 0.05) {
            rayPos.set(sp, nRay * 6);
            rayPos[nRay * 6 + 3] = cloud.pos[k * 3];
            rayPos[nRay * 6 + 4] = cloud.pos[k * 3 + 1];
            rayPos[nRay * 6 + 5] = cloud.pos[k * 3 + 2];
            nRay++;
          }
        }
      }
    } else if (l < SCAN_END + 0.9) {
      for (let k = 0; k < n; k++) rev[k] = Math.min(1, rev[k] + dt * 2.2);  // 루프 클로저 전역 보정
    }
    rayGeo.attributes.position.needsUpdate = true;
    rayGeo.setDrawRange(0, nRay * 2);

    // 정합 단계: 고스트 맵이 ICP 스텝으로 수렴
    let f = 0, eGhost = 0;
    if (l >= 9.2 && l < 16.6) {
      eGhost = env(l, 9.6, 15.9, 0.7, T);
      const stepT = (l - 9.6) / 1.0;
      const k = Math.max(0, Math.floor(stepT));
      const frac = stepT - k;
      const f0 = Math.pow(0.48, k), f1 = Math.pow(0.48, k + 1);
      f = k >= 5 ? 0 : f0 + (f1 - f0) * ease(Math.min(1, frac * 2.6));
      if (k >= 5 && !flashFired) { flash = 1; flashFired = true; }
    }
    ghostGroup.position.set(1.35 * f, 0.24 * f, 0.75 * f);
    ghostGroup.rotation.y = 0.34 * f;
    gMat.uniforms.uOpacity.value = 0.95 * eGhost;
    flash = Math.max(0, flash - dt * 1.4);
    cloud.mat.uniforms.uBoost.value = 1 + flash * 1.2;
    gMat.uniforms.uBoost.value = 1.35 + flash * 1.2;

    // 맵 색 갱신 (점등 + 높이)
    const col = cloud.col;
    for (let k = 0; k < n; k++) {
      const lit = onB[k] ? litB : litG;
      const dim = onB[k] ? dimB : dimG;
      const b = 0.12 + rev[k];
      col[k * 3] = dim[0] + (lit[0] - dim[0]) * Math.min(1, b) * (0.5 + 0.5 * rev[k]);
      col[k * 3 + 1] = dim[1] + (lit[1] - dim[1]) * Math.min(1, b) * (0.5 + 0.5 * rev[k]);
      col[k * 3 + 2] = dim[2] + (lit[2] - dim[2]) * Math.min(1, b) * (0.5 + 0.5 * rev[k]);
    }
    cloud.geo.attributes.aColor.needsUpdate = true;

    // 스캐너·궤적·링
    scanner.pos.set(sp, 0);
    scanner.geo.attributes.position.needsUpdate = true;
    scanner.mat.uniforms.uOpacity.value = scanning ? 1 : Math.max(0, 1 - (l - SCAN_END) * 1.5);
    if (scanning && trailN < TRAILMAX) {
      const lastI = (trailN - 1) * 3;
      const moved = trailN === 0
        || (sp[0] - trailPos[lastI]) ** 2 + (sp[2] - trailPos[lastI + 2]) ** 2 > 0.0012;
      if (moved) {
        trailPos.set(sp, trailN * 3);
        trailN++;
        trailGeo.attributes.position.needsUpdate = true;
        trailGeo.setDrawRange(0, trailN);
      }
    }
    trail.material.opacity = scanning ? 0.75 : 0.75 * Math.max(0, 1 - (l - SCAN_END) / 1.6);
    if (scanning) {
      const pr = (t * 0.9) % 1;
      ring.position.x = sp[0]; ring.position.z = sp[2];
      ring.scale.setScalar(0.15 + pr * 1.1);
      ringMat.opacity = 0.4 * (1 - pr);
    } else if (l < SCAN_END + 1.2) {     // 루프 클로저 대형 펄스
      const pr = (l - SCAN_END) / 1.2;
      ring.position.x = sp[0]; ring.position.z = sp[2];
      ring.scale.setScalar(0.2 + pr * 4.2);
      ringMat.opacity = 0.5 * (1 - pr);
    } else ringMat.opacity = 0;

    setCap(l < SCAN_END + 0.9 ? 'LiDAR SLAM · Real-time Mapping' : '3DGS ↔ Unity Map Alignment · ICP');
    group.rotation.y = Math.sin(t * 0.06) * 0.2 + pointer.x * 0.14;
    group.rotation.x = pointer.y * 0.05;
  };
}

/* ==========================================================================
   PIA — PINN: 신경망 펄스 → 물리 파동장이 노이즈에서 PDE 해로 수렴
   ========================================================================== */
function initPia(scene, ctx) {
  // ---- 물리 파동장 (왼쪽) ----
  const nx = Math.round(88 * Math.sqrt(DENSITY));
  const nz = Math.round(56 * Math.sqrt(DENSITY));
  const n = nx * nz;
  const cloud = makeCloud(n, 0.95);
  const gx = new Float32Array(n), gz = new Float32Array(n), noise = new Float32Array(n);
  let i = 0;
  for (let ix = 0; ix < nx; ix++) for (let iz = 0; iz < nz; iz++) {
    gx[i] = -3.35 + (ix / (nx - 1)) * 3.95;   // x ∈ [-3.35, 0.6]
    gz[i] = (iz / (nz - 1) * 2 - 1) * 1.62;
    noise[i] = (Math.random() - 0.5);
    cloud.pos[i * 3] = gx[i]; cloud.pos[i * 3 + 2] = gz[i];
    cloud.size[i] = 0.026 + Math.random() * 0.026;
    i++;
  }
  cloud.geo.attributes.aSize.needsUpdate = true;

  // ---- 신경망 다이어그램 (오른쪽, 입력→출력이 좌측을 향함) ----
  const L = [4, 7, 7, 5, 3];
  const nodes = [];   // [layer][j] = {x,y}
  let total = 0;
  L.forEach((m, li) => {
    const layer = [];
    const x = 3.3 - li * 0.57;
    const spread = Math.min(2.3, (m - 1) * 0.42);
    for (let j = 0; j < m; j++) layer.push({ x, y: m === 1 ? 0 : (j / (m - 1) - 0.5) * spread });
    nodes.push(layer); total += m;
  });
  const nodeCloud = makeCloud(total, 1);
  const c = [0, 0, 0];
  let ni = 0;
  nodes.forEach((layer, li) => {
    layer.forEach((nd) => {
      nodeCloud.pos[ni * 3] = nd.x; nodeCloud.pos[ni * 3 + 1] = nd.y + 0.55; nodeCloud.pos[ni * 3 + 2] = 0;
      mix3(li === nodes.length - 1 ? C_CYAN : C_ACCENT, C_WHITE, 0.25, c, li === nodes.length - 1 ? 1 : 0.8);
      nodeCloud.col.set(c, ni * 3);
      nodeCloud.size[ni] = li === nodes.length - 1 ? 0.11 : 0.085;
      ni++;
    });
  });
  nodeCloud.geo.attributes.position.needsUpdate = true;
  nodeCloud.geo.attributes.aColor.needsUpdate = true;
  nodeCloud.geo.attributes.aSize.needsUpdate = true;

  const edgePos = [];
  for (let li = 0; li < nodes.length - 1; li++) {
    for (const a of nodes[li]) for (const b of nodes[li + 1]) {
      edgePos.push(a.x, a.y + 0.55, 0, b.x, b.y + 0.55, 0);
    }
  }
  const edgeGeo = new THREE.BufferGeometry();
  edgeGeo.setAttribute('position', new THREE.Float32BufferAttribute(edgePos, 3));
  const edges = new THREE.LineSegments(edgeGeo, new THREE.LineBasicMaterial({
    color: 0x4a7dc4, transparent: true, opacity: 0.16, blending: THREE.AdditiveBlending, depthWrite: false,
  }));
  edges.frustumCulled = false;

  // 신호 펄스
  const NP = Math.round(26 * DENSITY) + 6;
  const pulses = [];
  for (let k = 0; k < NP; k++) {
    pulses.push({
      li: (Math.random() * (L.length - 1)) | 0,
      a: 0, b: 0, prog: Math.random(), speed: 1.1 + Math.random() * 1.3,
    });
    pulses[k].a = (Math.random() * L[pulses[k].li]) | 0;
    pulses[k].b = (Math.random() * L[pulses[k].li + 1]) | 0;
  }
  const pulseCloud = makeCloud(NP, 1);
  for (let k = 0; k < NP; k++) { pulseCloud.col.set(C_WHITE, k * 3); pulseCloud.size[k] = 0.07; }
  pulseCloud.geo.attributes.aColor.needsUpdate = true;
  pulseCloud.geo.attributes.aSize.needsUpdate = true;

  const ripples = [];   // {x,z,t0}

  const group = new THREE.Group();
  group.add(cloud.points, nodeCloud.points, edges, pulseCloud.points);
  group.position.y = -0.42;
  scene.add(group);
  ctx.camera.position.set(0, 1.7, 4.0);
  ctx.camera.lookAt(0, -0.2, 0);
  ctx.pointMats.push(cloud.mat, nodeCloud.mat, pulseCloud.mat);
  ctx.onResize = (w) => {
    group.position.y = -0.72;
    group.scale.setScalar(w > 980 ? 1 : 0.66);
  };
  const setCap = makeCaption(ctx.el);

  const cLow = [0.1, 0.2, 0.5], cMid = C_ACCENT, cHigh = C_WHITE;
  const T = 13;
  return function update(t, dt) {
    const l = t % T;
    const conv = l < 8 ? ease(l / 8) : l < 11 ? 1 : l < 11.6 ? 1 - ease((l - 11) / 0.6) : 0;

    // 펄스 이동 (학습 중 빠르게, 수렴 후 천천히)
    const spd = 0.55 + 0.8 * (l < 8 ? 1 : 0.4);
    for (const p of pulses) {
      p.prog += dt * p.speed * spd;
      if (p.prog >= 1) {
        p.prog = 0;
        if (p.li + 1 < L.length - 1) {
          p.li++; p.a = p.b; p.b = (Math.random() * L[p.li + 1]) | 0;
        } else {
          const out = nodes[nodes.length - 1][p.b];
          if (ripples.length < 8) ripples.push({ x: 0.5, z: Math.max(-1.5, Math.min(1.5, out.y * 0.9)), t0: t });
          p.li = 0; p.a = (Math.random() * L[0]) | 0; p.b = (Math.random() * L[1]) | 0;
        }
      }
      const A = nodes[p.li][p.a], B = nodes[p.li + 1][p.b];
      const k = pulses.indexOf(p);
      pulseCloud.pos[k * 3] = A.x + (B.x - A.x) * p.prog;
      pulseCloud.pos[k * 3 + 1] = A.y + (B.y - A.y) * p.prog + 0.55;
      pulseCloud.pos[k * 3 + 2] = 0;
    }
    pulseCloud.geo.attributes.position.needsUpdate = true;
    while (ripples.length && t - ripples[0].t0 > 3) ripples.shift();

    // 파동장: noise → PDE 해 (conv 로 보간), 펄스 리플 합성
    const p = cloud.pos, col = cloud.col;
    const kBright = 0.45 + 0.55 * conv;
    for (let k = 0; k < n; k++) {
      const x = gx[k], z = gz[k];
      let y = conv * (0.26 * Math.sin(1.6 * x - 1.1 * t) * Math.cos(1.5 * z - 0.8 * t)
                    + 0.1 * Math.sin(2.8 * (x * 0.8 + z * 1.2) + 1.5 * t));
      y += (1 - conv) * (noise[k] * 0.42 + 0.05 * Math.sin(t * 24 + k * 1.7));
      for (const rp of ripples) {
        const dx = x - rp.x, dz = z - rp.z;
        const d = Math.sqrt(dx * dx + dz * dz);
        const age = t - rp.t0;
        y += 0.1 * conv * Math.sin(8 * d - 5 * age) * Math.exp(-d * 1.7) * Math.exp(-age * 1.1);
      }
      p[k * 3 + 1] = y;
      const m = Math.max(0, Math.min(1, (y + 0.42) / 0.84));
      if (m < 0.6) mix3(cLow, cMid, m / 0.6, c, kBright);
      else mix3(cMid, cHigh, (m - 0.6) / 0.4, c, kBright);
      col[k * 3] = c[0]; col[k * 3 + 1] = c[1]; col[k * 3 + 2] = c[2];
    }
    cloud.geo.attributes.position.needsUpdate = true;
    cloud.geo.attributes.aColor.needsUpdate = true;

    // 캡션: 학습 epoch/loss 카운터 → 수렴
    if (l < 8) {
      const epoch = Math.floor(l * 14);
      const loss = (Math.pow(10, -0.6 - 3.2 * conv) * (1 + 0.15 * Math.sin(t * 7))).toExponential(1);
      setCap(`PINN Training · epoch ${String(epoch).padStart(3, '0')} · loss ${loss}`, true);
    } else if (l < 11.6) {
      setCap('Physics-Informed Neural Networks · EV-PINN / PINO');
    } else {
      setCap('Re-initializing weights…');
    }
    group.rotation.y = Math.sin(t * 0.06) * 0.12 + pointer.x * 0.1;
    group.rotation.x = pointer.y * 0.04;
  };
}

/* ==========================================================================
   부트스트랩
   ========================================================================== */
const INITS = { home: initHome, neural: initNeural, pdi: initPdi, pia: initPia };
const STATIC_T = { home: 2.5, neural: 8.5, pdi: 5.5, pia: 6.5 };

function mount(el) {
  const kind = el.dataset.scene;
  if (!INITS[kind]) return;
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'low-power' });
  } catch (e) {
    return;   // WebGL 미지원 → 정적 배경 유지
  }
  renderer.setClearColor(0x000000, 0);
  el.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 60);
  const ctx = { camera, pointMats: [], onResize: null, el };
  const update = INITS[kind](scene, ctx);

  function resize() {
    const w = el.clientWidth || 1, h = el.clientHeight || 1;
    const dpr = Math.min(devicePixelRatio || 1, 2);
    renderer.setPixelRatio(dpr);
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    const scale = renderer.domElement.height / (2 * Math.tan((camera.fov * Math.PI) / 360));
    for (const m of ctx.pointMats) m.uniforms.uScale.value = scale;
    if (ctx.onResize) ctx.onResize(w, h);
  }
  resize();
  new ResizeObserver(resize).observe(el);

  let visible = true;
  new IntersectionObserver((es) => { visible = es[0].isIntersecting; }, { threshold: 0.02 }).observe(el);

  if (REDUCED) {   // 모션 최소화: 대표 프레임 한 장
    let tt = 0;
    while (tt < STATIC_T[kind]) { update(tt, 0.05); tt += 0.05; }
    renderer.render(scene, camera);
    el.classList.add('is-on');
    return;
  }

  let last = performance.now();
  let t = 0, frame = 0;
  function loop(now) {
    requestAnimationFrame(loop);
    if (!visible) { last = now; return; }
    const dt = Math.min(Math.max((now - last) / 1000, 0), 0.05);
    last = now;
    t += dt;
    update(t, dt);
    renderer.render(scene, camera);
    if ((frame++ & 15) === 0) el.dataset.t = t.toFixed(1);
  }
  requestAnimationFrame(loop);
  requestAnimationFrame(() => el.classList.add('is-on'));
}

document.querySelectorAll('.hero-visual[data-scene]').forEach((el) => {
  try { mount(el); } catch (e) { console.warn('hero visual disabled:', e); }
});
