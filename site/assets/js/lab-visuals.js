/* ==========================================================================
   MEIC Lab — hero visuals (Three.js particle scenes)
   data-scene="home"   : 연구실 전체 — 기어/3D재구성/구조물/파동장 모핑
   data-scene="neural" : Neural Rendering — 스플랫 입자가 3D 형상으로 조립
   data-scene="pdi"    : PDI Multimodal — LiDAR 레이더 스윕 포인트클라우드
   data-scene="pia"    : PIA Embodied — 물리 파동장 + 에이전트 리플
   ========================================================================== */
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';

const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
const LOW = matchMedia('(max-width: 820px)').matches;
const DENSITY = LOW ? 0.45 : 1;

/* 마우스 패럴랙스 (전역, 링크 클릭을 막지 않도록 window에서 수신) */
const pointer = { x: 0, y: 0 };
addEventListener('pointermove', (e) => {
  pointer.x = (e.clientX / innerWidth) * 2 - 1;
  pointer.y = (e.clientY / innerHeight) * 2 - 1;
}, { passive: true });

const ease = (t) => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));
const TAU = Math.PI * 2;

/* ---------- soft-splat point material (per-point size & color) ---------- */
function splatMaterial(opacity = 1) {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: {
      uScale: { value: 300 },
      uOpacity: { value: opacity },
    },
    vertexShader: `
      attribute float aSize;
      attribute vec3 aColor;
      uniform float uScale;
      varying vec3 vColor;
      void main () {
        vColor = aColor;
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = aSize * uScale / max(0.1, -mv.z);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: `
      uniform float uOpacity;
      varying vec3 vColor;
      void main () {
        float d = length(gl_PointCoord - 0.5);
        float a = smoothstep(0.5, 0.06, d) * uOpacity;
        if (a < 0.012) discard;
        gl_FragColor = vec4(vColor, a);
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

/* 팔레트 */
const C_ACCENT = [0.35, 0.64, 1.0];   // #5aa2ff
const C_VIOLET = [0.58, 0.46, 1.0];
const C_CYAN   = [0.55, 0.92, 1.0];
const C_WHITE  = [0.92, 0.97, 1.0];

function mix3(a, b, t, out, k = 1) {
  out[0] = (a[0] + (b[0] - a[0]) * t) * k;
  out[1] = (a[1] + (b[1] - a[1]) * t) * k;
  out[2] = (a[2] + (b[2] - a[2]) * t) * k;
  return out;
}

/* ==========================================================================
   HOME — 연구실 전체: 기어(기계) → 매듭(3D 재구성) → 구조물(스캔/도시)
          → 파동장(물리 AI) 파티클 모핑
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
    if (pick < 0.14) r = 0.3 + Math.random() * 0.1;                  // 축 허브
    else if (pick < 0.4) r = 0.5 + Math.sqrt(Math.random()) * (rOut - 0.62);  // 몸통(성김)
    else r = rOut - 0.13 + Math.random() * 0.13;                     // 톱니 테두리(집중)
    a[i * 3] = r * Math.cos(th);
    a[i * 3 + 1] = r * Math.sin(th);
    a[i * 3 + 2] = (Math.random() - 0.5) * thick;
  }
  return a;
}

function shapeKnot(n) {
  const a = new Float32Array(n * 3);
  const s = 0.44, tube = 0.17;
  for (let i = 0; i < n; i++) {
    const t = Math.random() * TAU;
    const x = (Math.sin(t) + 2 * Math.sin(2 * t)) * s;
    const y = (Math.cos(t) - 2 * Math.cos(2 * t)) * s;
    const z = -Math.sin(3 * t) * s * 1.4;
    a[i * 3] = x + (Math.random() - 0.5) * tube;
    a[i * 3 + 1] = y + (Math.random() - 0.5) * tube;
    a[i * 3 + 2] = z + (Math.random() - 0.5) * tube;
  }
  return a;
}

function shapeCity(n) {
  const a = new Float32Array(n * 3);
  const grid = 5, cell = 0.72, base = 0.46, y0 = -1.15;
  const b = [];
  for (let gx = 0; gx < grid; gx++) {
    for (let gz = 0; gz < grid; gz++) {
      b.push({
        x: (gx - (grid - 1) / 2) * cell,
        z: (gz - (grid - 1) / 2) * cell,
        h: 0.35 + Math.random() * 1.6,
      });
    }
  }
  const half = base / 2;
  for (let i = 0; i < n; i++) {
    const bd = b[(Math.random() * b.length) | 0];
    const r = Math.random();
    let x, y, z;
    if (r < 0.55) { // 수직 모서리 기둥
      const cx = Math.random() < 0.5 ? -half : half;
      const cz = Math.random() < 0.5 ? -half : half;
      x = bd.x + cx; z = bd.z + cz; y = y0 + Math.random() * bd.h;
    } else {        // 상단/하단 테두리
      const top = r < 0.85;
      const t = Math.random() * 4;
      const e = t | 0, f = t - e;
      const px = e === 0 ? -half + f * base : e === 1 ? half : e === 2 ? half - f * base : -half;
      const pz = e === 0 ? -half : e === 1 ? -half + f * base : e === 2 ? half : half - f * base;
      x = bd.x + px; z = bd.z + pz; y = y0 + (top ? bd.h : 0);
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
  const n = Math.round(5800 * DENSITY);
  const cloud = makeCloud(n, 0.42);
  const shapes = [shapeGear(n), shapeKnot(n), shapeCity(n), shapeField(n)];
  const c = [0, 0, 0];
  for (let i = 0; i < n; i++) {
    const r = Math.random();
    const bright = 0.55 + Math.random() * 0.45;
    if (r < 0.55) mix3(C_ACCENT, C_CYAN, Math.random(), c, bright);
    else if (r < 0.85) mix3(C_ACCENT, C_VIOLET, Math.random(), c, bright);
    else mix3(C_CYAN, C_WHITE, Math.random(), c, bright);
    cloud.col.set(c, i * 3);
    cloud.size[i] = 0.03 + Math.random() * 0.05;
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
  // 화면 종횡비 기준으로 오른쪽 ~72% 지점에 배치 (모바일은 중앙)
  ctx.onResize = (w, h) => {
    const halfW = Math.tan((50 * Math.PI) / 360) * 5.3 * (w / h);
    group.position.x = w > 980 ? halfW * 0.45 : 0;
  };

  const HOLD = 5.2, TRANS = 2.2, SEG = HOLD + TRANS;
  return function update(t, dt) {
    const idx = Math.floor(t / SEG) % 4;
    const local = t % SEG;
    const w = local < HOLD ? 0 : ease((local - HOLD) / TRANS);
    const cur = shapes[idx], next = shapes[(idx + 1) % 4];
    // 파동장(shape 3) 기여도
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
    // 형상이 읽히도록 완전 회전 대신 좌우 스윙 + 패럴랙스
    group.rotation.y = 0.55 * Math.sin(t * 0.22) + pointer.x * 0.24;
    group.rotation.x = -0.14 + pointer.y * 0.09;
  };
}

/* ==========================================================================
   NEURAL — 흩어진 가우시안 스플랫이 3D 형상으로 조립/분해 (3DGS 재구성)
   ========================================================================== */
function initNeural(scene, ctx) {
  const n = Math.round(6500 * DENSITY);
  const cloud = makeCloud(n, 0.4);
  const target = new Float32Array(n * 3);
  const scatter = new Float32Array(n * 3);
  const delay = new Float32Array(n);
  const s = 0.5, tube = 0.15;
  const c = [0, 0, 0];
  for (let i = 0; i < n; i++) {
    const t = (i / n) * TAU;                       // 매듭 경로를 따라 순서대로
    const x = (Math.sin(t) + 2 * Math.sin(2 * t)) * s;
    const y = (Math.cos(t) - 2 * Math.cos(2 * t)) * s;
    const z = -Math.sin(3 * t) * s * 1.35;
    target[i * 3] = x + (Math.random() - 0.5) * tube;
    target[i * 3 + 1] = y + (Math.random() - 0.5) * tube;
    target[i * 3 + 2] = z + (Math.random() - 0.5) * tube;
    // 시작점: 넓게 흩어진 노이즈 구
    const rr = 2.6 + Math.random() * 1.8;
    const th = Math.random() * TAU, ph = Math.acos(Math.random() * 2 - 1);
    scatter[i * 3] = rr * Math.sin(ph) * Math.cos(th);
    scatter[i * 3 + 1] = rr * Math.cos(ph) * 0.7;
    scatter[i * 3 + 2] = rr * Math.sin(ph) * Math.sin(th);
    delay[i] = (t / TAU) * 0.85;                   // 경로를 따라 쓸려가듯 조립
    const g = t / TAU;
    if (g < 0.5) mix3(C_ACCENT, C_CYAN, g * 2, c);
    else mix3(C_CYAN, C_VIOLET, (g - 0.5) * 2, c);
    const bright = 0.5 + Math.random() * 0.5;
    c[0] *= bright; c[1] *= bright; c[2] *= bright;
    cloud.col.set(c, i * 3);
    cloud.size[i] = 0.032 + Math.random() * 0.055;
  }
  cloud.geo.attributes.aColor.needsUpdate = true;
  cloud.geo.attributes.aSize.needsUpdate = true;

  const group = new THREE.Group();
  group.add(cloud.points);
  group.scale.setScalar(0.82);
  scene.add(group);
  ctx.camera.position.set(0, 0.15, 5.0);
  ctx.camera.lookAt(0, 0, 0);
  ctx.pointMats.push(cloud.mat);
  ctx.onResize = (w, h) => {
    const halfW = Math.tan((50 * Math.PI) / 360) * 5.0 * (w / h);
    group.position.x = w > 980 ? halfW * 0.5 : 0;
  };

  const T = 15;
  return function update(t, dt) {
    const local = t % T;
    const p = cloud.pos;
    for (let i = 0; i < n; i++) {
      let prog;
      if (local < 4.2) prog = ease((local - delay[i] * 2.2) / 2.0);            // 조립
      else if (local < 10.5) prog = 1;                                          // 유지
      else if (local < 13.2) prog = 1 - ease((local - 10.5 - delay[i] * 1.6) / 1.6); // 분해
      else prog = 0;
      const j = i * 3;
      const shim = prog * 0.022;
      p[j] = scatter[j] + (target[j] - scatter[j]) * prog + shim * Math.sin(t * 2.1 + i);
      p[j + 1] = scatter[j + 1] + (target[j + 1] - scatter[j + 1]) * prog + shim * Math.cos(t * 1.7 + i * 0.7);
      p[j + 2] = scatter[j + 2] + (target[j + 2] - scatter[j + 2]) * prog;
    }
    cloud.geo.attributes.position.needsUpdate = true;
    group.rotation.y = t * 0.16 + pointer.x * 0.25;
    group.rotation.x = -0.04 + pointer.y * 0.09;
  };
}

/* ==========================================================================
   PDI — LiDAR 레이더 스윕: 회전 빔이 지형·구조물 포인트클라우드를 밝힘
   ========================================================================== */
function initPdi(scene, ctx) {
  const nx = Math.round(112 * Math.sqrt(DENSITY));
  const nz = Math.round(74 * Math.sqrt(DENSITY));
  const n = nx * nz;
  const cloud = makeCloud(n, 1);
  const groundY = -0.72;
  const angle = new Float32Array(n);
  const hgt = new Float32Array(n);

  // 무작위 구조물 블록
  const blocks = [];
  for (let k = 0; k < 9; k++) {
    blocks.push({
      x: (Math.random() * 2 - 1) * 2.6,
      z: (Math.random() * 2 - 1) * 1.5,
      w: 0.25 + Math.random() * 0.45,
      d: 0.25 + Math.random() * 0.45,
      h: 0.35 + Math.random() * 0.85,
    });
  }
  let i = 0;
  for (let ix = 0; ix < nx; ix++) {
    for (let iz = 0; iz < nz; iz++) {
      const x = (ix / (nx - 1) * 2 - 1) * 3.3 + (Math.random() - 0.5) * 0.05;
      const z = (iz / (nz - 1) * 2 - 1) * 2.1 + (Math.random() - 0.5) * 0.05;
      let y = groundY
        + 0.16 * Math.sin(x * 1.3 + 2.1) * Math.cos(z * 1.7)
        + 0.08 * Math.sin(x * 3.1) * Math.sin(z * 2.6);
      let onBlock = 0;
      for (const b of blocks) {
        if (Math.abs(x - b.x) < b.w && Math.abs(z - b.z) < b.d) { y = groundY + b.h; onBlock = 1; break; }
      }
      cloud.pos[i * 3] = x;
      cloud.pos[i * 3 + 1] = y;
      cloud.pos[i * 3 + 2] = z;
      angle[i] = Math.atan2(z, x);
      hgt[i] = onBlock ? 1 : 0;
      cloud.size[i] = onBlock ? 0.055 + Math.random() * 0.05 : 0.04 + Math.random() * 0.035;
      i++;
    }
  }
  cloud.geo.attributes.position.needsUpdate = true;
  cloud.geo.attributes.aSize.needsUpdate = true;

  // 레이더 빔 (부채꼴, 진행 방향이 밝고 꼬리로 갈수록 어두움)
  const seg = 28, span = 0.55, rad = 4.1;
  const bPos = [], bCol = [];
  for (let k = 0; k < seg; k++) {
    const a0 = -(k / seg) * span, a1 = -((k + 1) / seg) * span;
    const f0 = 1 - k / seg, f1 = 1 - (k + 1) / seg;
    bPos.push(0, 0, 0, Math.cos(a0) * rad, 0, Math.sin(a0) * rad, Math.cos(a1) * rad, 0, Math.sin(a1) * rad);
    const g0 = 0.5 * f0 * f0, g1 = 0.5 * f1 * f1;
    bCol.push(0.1, 0.2, 0.32, 0.2 * g0, 0.5 * g0, 0.8 * g0, 0.2 * g1, 0.5 * g1, 0.8 * g1);
  }
  const beamGeo = new THREE.BufferGeometry();
  beamGeo.setAttribute('position', new THREE.Float32BufferAttribute(bPos, 3));
  beamGeo.setAttribute('color', new THREE.Float32BufferAttribute(bCol, 3));
  const beam = new THREE.Mesh(beamGeo, new THREE.MeshBasicMaterial({
    vertexColors: true, transparent: true, blending: THREE.AdditiveBlending,
    depthWrite: false, side: THREE.DoubleSide,
  }));
  beam.position.y = groundY + 0.18;

  // 확산 링 펄스
  const ringGeo = new THREE.RingGeometry(0.98, 1, 80);
  const ringMat = new THREE.MeshBasicMaterial({
    color: 0x5aa2ff, transparent: true, opacity: 0.5,
    blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
  });
  const ring = new THREE.Mesh(ringGeo, ringMat);
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = groundY + 0.1;

  const group = new THREE.Group();
  group.add(cloud.points, beam, ring);
  scene.add(group);
  ctx.camera.position.set(0, 2.35, 4.1);
  ctx.camera.lookAt(0, -0.35, 0);
  ctx.pointMats.push(cloud.mat);

  const dimG = [0.13, 0.24, 0.46], dimB = [0.2, 0.3, 0.55];
  const lit = [0.62, 0.93, 1.0];
  const c = [0, 0, 0];
  return function update(t, dt) {
    const beamA = (t * 0.75) % TAU;
    beam.rotation.y = -beamA;           // 로컬각 φ → 월드각 φ+beamA (반시계 스윕)
    const col = cloud.col;
    for (let k = 0; k < n; k++) {
      let d = beamA - angle[k];         // 빔 전면 뒤로 지나간 각거리 → 잔광 감쇠
      d = ((d % TAU) + TAU) % TAU;
      const b = Math.exp(-d * 1.7);
      const dim = hgt[k] ? dimB : dimG;
      mix3(dim, lit, b, c, 0.35 + 0.65 * b + 0.12);
      col[k * 3] = c[0]; col[k * 3 + 1] = c[1]; col[k * 3 + 2] = c[2];
    }
    cloud.geo.attributes.aColor.needsUpdate = true;
    const pr = (t * 0.55) % 1;
    ring.scale.setScalar(0.2 + pr * 3.9);
    ringMat.opacity = 0.45 * (1 - pr);
    group.rotation.y = Math.sin(t * 0.07) * 0.25 + pointer.x * 0.14;
    group.rotation.x = pointer.y * 0.05;
  };
}

/* ==========================================================================
   PIA — 물리 파동장(PINN) + 이동 에이전트가 만드는 리플 (Embodied AI)
   ========================================================================== */
function initPia(scene, ctx) {
  const nx = Math.round(128 * Math.sqrt(DENSITY));
  const nz = Math.round(78 * Math.sqrt(DENSITY));
  const n = nx * nz;
  const cloud = makeCloud(n, 0.92);
  const gx = new Float32Array(n), gz = new Float32Array(n);
  let i = 0;
  for (let ix = 0; ix < nx; ix++) {
    for (let iz = 0; iz < nz; iz++) {
      gx[i] = (ix / (nx - 1) * 2 - 1) * 3.3;
      gz[i] = (iz / (nz - 1) * 2 - 1) * 2.0;
      cloud.pos[i * 3] = gx[i];
      cloud.pos[i * 3 + 2] = gz[i];
      cloud.size[i] = 0.038 + Math.random() * 0.04;
      i++;
    }
  }
  cloud.geo.attributes.aSize.needsUpdate = true;

  // 에이전트(발광 입자) + 궤적 트레일
  const AGENTS = 3, TRAIL = 80;
  const agents = makeCloud(AGENTS, 1);
  for (let k = 0; k < AGENTS; k++) {
    agents.col.set(C_WHITE, k * 3);
    agents.size[k] = 0.3;
  }
  agents.geo.attributes.aColor.needsUpdate = true;
  agents.geo.attributes.aSize.needsUpdate = true;
  const trails = [];
  for (let k = 0; k < AGENTS; k++) {
    const tg = new THREE.BufferGeometry();
    const tp = new Float32Array(TRAIL * 3);
    tg.setAttribute('position', new THREE.BufferAttribute(tp, 3));
    const line = new THREE.Line(tg, new THREE.LineBasicMaterial({
      color: 0x7fc0ff, transparent: true, opacity: 0.35,
      blending: THREE.AdditiveBlending, depthWrite: false,
    }));
    line.frustumCulled = false;
    trails.push({ tg, tp, line, init: false });
  }

  const group = new THREE.Group();
  group.add(cloud.points, agents.points, ...trails.map((x) => x.line));
  scene.add(group);
  group.position.y = -0.42;
  ctx.camera.position.set(0, 1.75, 3.9);
  ctx.camera.lookAt(0, -0.25, 0);
  ctx.pointMats.push(cloud.mat, agents.mat);

  const ax = new Float32Array(AGENTS), az = new Float32Array(AGENTS);
  const cLow = [0.1, 0.2, 0.5], cMid = C_ACCENT, cHigh = C_WHITE;
  const c = [0, 0, 0];

  function field(x, z, t) {
    let y = 0.24 * Math.sin(1.7 * x - 1.2 * t) * Math.cos(1.45 * z - 0.85 * t)
          + 0.1 * Math.sin(2.9 * (x * 0.8 + z * 1.25) + 1.6 * t);
    for (let k = 0; k < AGENTS; k++) {
      const dx = x - ax[k], dz = z - az[k];
      const d = Math.sqrt(dx * dx + dz * dz);
      y += 0.11 * Math.sin(7.5 * d - 4.5 * t) * Math.exp(-d * 1.6);
    }
    return y;
  }

  return function update(t, dt) {
    for (let k = 0; k < AGENTS; k++) {
      const ph = k * 2.1;
      ax[k] = 2.2 * Math.sin(0.42 * t + ph) * Math.cos(0.17 * t + ph * 0.6);
      az[k] = 1.35 * Math.sin(0.31 * t + ph * 1.7);
    }
    const p = cloud.pos, col = cloud.col;
    for (let k = 0; k < n; k++) {
      const y = field(gx[k], gz[k], t);
      p[k * 3 + 1] = y;
      const m = Math.max(0, Math.min(1, (y + 0.4) / 0.8));
      if (m < 0.6) mix3(cLow, cMid, m / 0.6, c);
      else mix3(cMid, cHigh, (m - 0.6) / 0.4, c);
      col[k * 3] = c[0]; col[k * 3 + 1] = c[1]; col[k * 3 + 2] = c[2];
    }
    cloud.geo.attributes.position.needsUpdate = true;
    cloud.geo.attributes.aColor.needsUpdate = true;

    for (let k = 0; k < AGENTS; k++) {
      const y = field(ax[k], az[k], t) + 0.16;
      agents.pos[k * 3] = ax[k]; agents.pos[k * 3 + 1] = y; agents.pos[k * 3 + 2] = az[k];
      const tr = trails[k];
      if (!tr.init) {
        for (let q = 0; q < TRAIL; q++) tr.tp.set([ax[k], y, az[k]], q * 3);
        tr.init = true;
      }
      tr.tp.copyWithin(3, 0, (TRAIL - 1) * 3);
      tr.tp[0] = ax[k]; tr.tp[1] = y; tr.tp[2] = az[k];
      tr.tg.attributes.position.needsUpdate = true;
    }
    agents.geo.attributes.position.needsUpdate = true;

    group.rotation.y = Math.sin(t * 0.06) * 0.2 + pointer.x * 0.12;
    group.rotation.x = pointer.y * 0.045;
  };
}

/* ==========================================================================
   부트스트랩
   ========================================================================== */
const INITS = { home: initHome, neural: initNeural, pdi: initPdi, pia: initPia };

function mount(el) {
  const kind = el.dataset.scene;
  if (!INITS[kind]) return;

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ alpha: true, antialias: false, powerPreference: 'low-power' });
  } catch (e) {
    return; // WebGL 미지원 → 정적 그라디언트 유지
  }
  renderer.setClearColor(0x000000, 0);
  el.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 60);
  const ctx = { camera, pointMats: [], onResize: null };
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
  new IntersectionObserver((entries) => {
    visible = entries[0].isIntersecting;
  }, { threshold: 0.02 }).observe(el);

  let last = performance.now();
  let t = Math.random() * 2;

  if (REDUCED) {
    // 모션 최소화 설정: 정지 프레임 한 장만 렌더
    update(2.5, 0.016);
    renderer.render(scene, camera);
    el.classList.add('is-on');
    return;
  }

  function loop(now) {
    requestAnimationFrame(loop);
    if (!visible) { last = now; return; }
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    t += dt;
    update(t, dt);
    renderer.render(scene, camera);
  }
  requestAnimationFrame(loop);
  requestAnimationFrame(() => el.classList.add('is-on'));
}

document.querySelectorAll('.hero-visual[data-scene]').forEach((el) => {
  try { mount(el); } catch (e) { console.warn('hero visual disabled:', e); }
});
