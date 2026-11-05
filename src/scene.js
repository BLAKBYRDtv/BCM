/* Believers Choice Ministries: persistent 3D scene.
   A bevelled gold cross, a gold ring, volumetric light rays and drifting light motes,
   lit by a point light that follows the visitor's cursor. Driven by BCMScene.state
   (tweened by js/motion.js on scroll). Build: see README (esbuild). */
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const coarse = matchMedia('(hover: none), (pointer: coarse)').matches;
const lowCores = (navigator.hardwareConcurrency || 4) <= 4;

const state = {
  ax: 0.5, ay: 0.0,       /* cross anchor, -1..1 of half viewport */
  cs: 1.0,                /* cross height as a fraction of ~46% of viewport height */
  cz: 0,                  /* push toward / away from camera */
  cop: 1.0,               /* cross opacity */
  ry: 0, rx: 0,           /* extra rotation (radians) */
  spin: 0.14,             /* idle rotation speed */
  rays: 1.0, flare: 0.55, ring: 1.0,
  bloom: 1.0, motes: 1.0, moteSpeed: 1.0,
  flash: 0.0,             /* full-screen white-gold flash, 0..1 */
  light: 1.0,             /* pointer light strength */
  cam: 0                  /* camera drift z */
};

const api = { state, ready: false, supported: false, velocity: 0, pointer: { x: 0, y: 0, on: false }, quality: 1 };
window.BCMScene = api;

function init() {
  const canvas = document.getElementById('gl');
  if (!canvas) return;
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: !coarse, alpha: true, powerPreference: 'high-performance' });
  } catch (e) { document.documentElement.classList.add('no-gl'); return; }
  if (!renderer.getContext()) { document.documentElement.classList.add('no-gl'); return; }
  api.supported = true;
  document.documentElement.classList.add('has-gl');

  let dpr = Math.min(coarse ? 1.5 : 2, devicePixelRatio || 1);
  renderer.setPixelRatio(dpr);
  renderer.setClearColor(0x000000, 0);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
  const CAM_Z = 10;
  camera.position.set(0, 0, CAM_Z);

  /* ---------- studio environment for the gold ---------- */
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envScene = new THREE.Scene();
  envScene.background = new THREE.Color(0x01030a);
  function panel(rgb, k, w, h, pos, look) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(rgb[0] * k, rgb[1] * k, rgb[2] * k), side: THREE.DoubleSide }));
    m.position.set(pos[0], pos[1], pos[2]); m.lookAt(look[0], look[1], look[2]); envScene.add(m);
  }
  panel([1.0, 0.82, 0.5], 22, 8, 5, [-6, 6, 5], [0, 0, 0]);       /* warm key */
  panel([1.0, 0.95, 0.85], 14, 3, 9, [7, 1, 3], [0, 0, 0]);       /* white strip */
  panel([0.25, 0.45, 1.0], 8, 10, 3, [0, -6, 4], [0, 0, 0]);      /* navy-blue floor bounce */
  panel([1.0, 0.7, 0.25], 16, 6, 6, [0, 3, -7], [0, 0, 0]);       /* gold rim from behind */
  panel([0.4, 0.6, 1.0], 6, 4, 8, [-8, -1, -2], [0, 0, 0]);       /* blue side */
  scene.environment = pmrem.fromScene(envScene, 0.035).texture;

  /* ---------- gold cross ---------- */
  const shape = new THREE.Shape();
  const vw = 0.34, ht = 1.1, top = 1.95, bot = -1.85, bar0 = 0.34, bar1 = 0.34 + 0.62;
  shape.moveTo(-vw, bot); shape.lineTo(vw, bot); shape.lineTo(vw, bar0); shape.lineTo(ht, bar0); shape.lineTo(ht, bar1);
  shape.lineTo(vw, bar1); shape.lineTo(vw, top); shape.lineTo(-vw, top); shape.lineTo(-vw, bar1); shape.lineTo(-ht, bar1);
  shape.lineTo(-ht, bar0); shape.lineTo(-vw, bar0); shape.closePath();
  const geo = new THREE.ExtrudeGeometry(shape, { depth: 0.34, bevelEnabled: true, bevelThickness: 0.11, bevelSize: 0.09, bevelSegments: 5, curveSegments: 1 });
  geo.center();
  const gold = new THREE.MeshPhysicalMaterial({
    color: 0xe7b244, metalness: 1.0, roughness: 0.24, clearcoat: 0.6, clearcoatRoughness: 0.18,
    envMapIntensity: 1.5, transparent: true, opacity: 1
  });
  const cross = new THREE.Mesh(geo, gold);
  const crossRig = new THREE.Group(); crossRig.add(cross); scene.add(crossRig);
  const CROSS_H = 3.8 + 0.2;

  /* ring echoing the C of the logo */
  const ringGeo = new THREE.TorusGeometry(2.55, 0.075, 20, 220, Math.PI * 1.62);
  const goldRing = gold.clone(); goldRing.roughness = 0.2; goldRing.envMapIntensity = 1.7;
  const ring = new THREE.Mesh(ringGeo, goldRing);
  ring.position.z = -0.35; crossRig.add(ring);
  const ring2 = new THREE.Mesh(new THREE.TorusGeometry(2.95, 0.02, 12, 220, Math.PI * 1.1), goldRing.clone());
  ring2.position.z = -0.5; ring2.rotation.z = 2.4; crossRig.add(ring2);

  /* star flare at the heart of the cross */
  function glowTexture() {
    const s = 256, c = document.createElement('canvas'); c.width = c.height = s; const g = c.getContext('2d');
    let r = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
    r.addColorStop(0, 'rgba(255,250,225,1)'); r.addColorStop(0.12, 'rgba(255,236,170,.85)'); r.addColorStop(0.4, 'rgba(240,190,80,.25)'); r.addColorStop(1, 'rgba(240,190,80,0)');
    g.fillStyle = r; g.fillRect(0, 0, s, s);
    g.globalCompositeOperation = 'lighter';
    [[0, 1], [1, 0]].forEach(function (d) {
      const gr = g.createLinearGradient(d[0] ? 0 : s / 2, d[1] ? 0 : s / 2, d[0] ? s : s / 2, d[1] ? s : s / 2);
      gr.addColorStop(0, 'rgba(255,240,190,0)'); gr.addColorStop(0.5, 'rgba(255,248,215,.9)'); gr.addColorStop(1, 'rgba(255,240,190,0)');
      g.fillStyle = gr; g.fillRect(d[0] ? 0 : s / 2 - 1.5, d[1] ? 0 : s / 2 - 1.5, d[0] ? s : 3, d[1] ? s : 3);
    });
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
  }
  const flareMat = new THREE.SpriteMaterial({ map: glowTexture(), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0.6 });
  const flare = new THREE.Sprite(flareMat); flare.position.set(0, 0.55, 0.5); flare.scale.set(5, 5, 1); crossRig.add(flare);

  /* ---------- light rays (shader) ---------- */
  const raysMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uTime: { value: 0 }, uInt: { value: 1 } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
    fragmentShader: [
      'uniform float uTime,uInt; varying vec2 vUv;',
      'float h(float n){return fract(sin(n)*43758.5453);}',
      'void main(){',
      ' vec2 p=vUv-0.5; float r=length(p); float a=atan(p.y,p.x);',
      ' float rays=0.0;',
      ' rays+=pow(abs(sin(a*5.0+uTime*0.045)),10.0)*0.9;',
      ' rays+=pow(abs(sin(a*11.0-uTime*0.07+1.3)),22.0)*0.65;',
      ' rays+=pow(abs(sin(a*19.0+uTime*0.03+2.1)),38.0)*0.5;',
      ' rays*=0.75+0.25*sin(uTime*0.4+a*3.0);',
      ' float fall=pow(smoothstep(0.5,0.02,r),1.5);',
      ' float core=exp(-r*9.0);',
      ' vec3 col=mix(vec3(1.0,0.74,0.30),vec3(1.0,0.93,0.72),core);',
      ' float d=(rays*fall*0.32+core*0.5)*uInt;',
      ' d+=(h(vUv.x*931.0+vUv.y*517.0)-0.5)*0.004;',
      ' gl_FragColor=vec4(col*d,1.0);',
      '}'
    ].join('\n')
  });
  const rays = new THREE.Mesh(new THREE.PlaneGeometry(44, 44), raysMat);
  rays.position.z = -3.5; scene.add(rays);

  /* ---------- motes ---------- */
  const N = coarse ? 260 : (lowCores ? 450 : 780);
  const pos = new Float32Array(N * 3), seed = new Float32Array(N * 4);
  for (let i = 0; i < N; i++) {
    pos[i * 3] = (Math.random() - 0.5) * 26; pos[i * 3 + 1] = (Math.random() - 0.5) * 14; pos[i * 3 + 2] = -5 + Math.random() * 9;
    seed[i * 4] = Math.random(); seed[i * 4 + 1] = Math.random(); seed[i * 4 + 2] = Math.random(); seed[i * 4 + 3] = Math.random();
  }
  const mg = new THREE.BufferGeometry();
  mg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  mg.setAttribute('aSeed', new THREE.BufferAttribute(seed, 4));
  const moteMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uTime: { value: 0 }, uSpeed: { value: 1 }, uPx: { value: 60 * dpr }, uMouse: { value: new THREE.Vector3(99, 99, 0) }, uOpacity: { value: 1 } },
    vertexShader: [
      'uniform float uTime,uSpeed,uPx; uniform vec3 uMouse; attribute vec4 aSeed; varying float vA;',
      'void main(){',
      ' vec3 p=position; float t=uTime*uSpeed*(0.15+aSeed.x*0.35);',
      ' p.y=mod(p.y+t+7.0,14.0)-7.0;',
      ' p.x+=sin(uTime*0.25*(0.5+aSeed.y)+aSeed.z*6.283)*0.5; p.z+=cos(uTime*0.2*(0.5+aSeed.x)+aSeed.w*6.283)*0.4;',
      ' vec2 d=p.xy-uMouse.xy; float dist=length(d); float f=smoothstep(2.6,0.0,dist);',
      ' p.xy+=normalize(d+1e-4)*f*1.1;',
      ' vec4 mv=modelViewMatrix*vec4(p,1.0); gl_Position=projectionMatrix*mv;',
      ' float tw=0.55+0.45*sin(uTime*(0.8+aSeed.w*2.5)+aSeed.z*20.0);',
      ' gl_PointSize=uPx*(0.45+aSeed.w*aSeed.w*1.7)*(7.0/-mv.z)*(1.0+f*0.8);',
      ' vA=tw*(0.3+aSeed.x*0.7)*(0.7+f*1.1);',
      '}'
    ].join('\n'),
    fragmentShader: [
      'uniform float uOpacity; varying float vA;',
      'void main(){ float d=length(gl_PointCoord-0.5); float a=smoothstep(0.5,0.0,d); a*=a;',
      ' gl_FragColor=vec4(vec3(1.0,0.84,0.46)*1.5,a*vA*uOpacity); }'
    ].join('\n')
  });
  const motes = new THREE.Points(mg, moteMat); motes.frustumCulled = false; scene.add(motes);

  /* ---------- pointer light + halo ---------- */
  const plight = new THREE.PointLight(0xffd68a, 0, 14, 1.6); plight.position.set(0, 0, 3.2); scene.add(plight);
  const fill = new THREE.DirectionalLight(0x6f8dff, 0.6); fill.position.set(-4, -2, 3); scene.add(fill);
  const haloMat = new THREE.SpriteMaterial({ map: flareMat.map, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0, color: 0xffd27a });
  const halo = new THREE.Sprite(haloMat); halo.scale.set(3.4, 3.4, 1); scene.add(halo);
  const flashMat = new THREE.SpriteMaterial({ map: flareMat.map, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0, color: 0xfff1c4 });
  const flashS = new THREE.Sprite(flashMat); flashS.position.set(0, 0, 4); scene.add(flashS);

  /* ---------- post: bloom ---------- */
  let composer = null, bloom = null;
  function buildComposer(w, h) {
    composer = new EffectComposer(renderer);
    composer.setPixelRatio(dpr);
    composer.addPass(new RenderPass(scene, camera));
    bloom = new UnrealBloomPass(new THREE.Vector2(w, h), 0.85, 0.7, 0.82);
    composer.addPass(bloom);
    composer.addPass(new OutputPass());
  }
  let useBloom = !coarse && !lowCores;

  /* ---------- sizing ---------- */
  let W = 0, H = 0, halfH = 1, halfW = 1;
  function resize(force) {
    const w = innerWidth, h = innerHeight;
    if (!force && coarse && Math.abs(h - H) < 140 && w === W) return;   /* ignore mobile URL bar jitter */
    W = w; H = h;
    renderer.setSize(w, h, false);
    camera.aspect = w / h; camera.updateProjectionMatrix();
    halfH = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * CAM_Z; halfW = halfH * camera.aspect;
    moteMat.uniforms.uPx.value = 60 * dpr;
    if (useBloom) { if (!composer) buildComposer(w, h); else { composer.setSize(w, h); composer.setPixelRatio(dpr); } }
  }
  resize(true);
  addEventListener('resize', function () { resize(false); });

  /* ---------- pointer ---------- */
  const ptr = api.pointer;
  addEventListener('pointermove', function (e) {
    ptr.x = (e.clientX / innerWidth) * 2 - 1; ptr.y = -((e.clientY / innerHeight) * 2 - 1); ptr.on = true;
  }, { passive: true });
  let sx = 0, sy = 0, tiltX = 0, tiltY = 0, vel = 0;
  let last = performance.now();
  const clock = { getDelta: function () { const n = performance.now(), d = (n - last) / 1000; last = n; return d; } };
  let t = 0, frames = 0, slow = 0, running = true;
  document.addEventListener('visibilitychange', function () { running = !document.hidden; if (running) { clock.getDelta(); loop(); } });

  function applyState(dt) {
    /* cross placement, relative to the viewport */
    const targetH = state.cs * 0.46 * 2 * halfH;
    const sc = targetH / CROSS_H;
    crossRig.scale.setScalar(sc);
    crossRig.position.set(state.ax * halfW, state.ay * halfH, state.cz);
    gold.opacity = goldRing.opacity = Math.max(0, Math.min(1, state.cop));
    ring.visible = ring2.visible = state.ring > 0.01; ring.scale.setScalar(0.9 + state.ring * 0.1);
    flareMat.opacity = Math.max(0, state.flare) * (0.75 + 0.25 * Math.sin(t * 1.7));
    flare.scale.setScalar(4.2 + Math.sin(t * 1.7) * 0.3);
    raysMat.uniforms.uInt.value = state.rays;
    rays.position.x = crossRig.position.x; rays.position.y = crossRig.position.y; rays.visible = state.rays > 0.01;
    rays.scale.setScalar(0.65 + state.cs * 0.6);
    moteMat.uniforms.uOpacity.value = state.motes;
    moteMat.uniforms.uSpeed.value = state.moteSpeed + Math.min(6, Math.abs(api.velocity) * 0.012);
    if (bloom) bloom.strength = 0.85 * state.bloom;
    flashMat.opacity = state.flash; flashS.scale.setScalar(26);
    camera.position.z = CAM_Z + state.cam;
  }

  function loop() {
    if (!running) return;
    requestAnimationFrame(loop);
    const dt = Math.min(0.05, clock.getDelta()); t += dt; frames++;
    raysMat.uniforms.uTime.value = t; moteMat.uniforms.uTime.value = t;

    /* smooth pointer */
    sx += (ptr.x - sx) * Math.min(1, dt * 5); sy += (ptr.y - sy) * Math.min(1, dt * 5);
    tiltX += ((-sy * 0.28) - tiltX) * Math.min(1, dt * 4); tiltY += ((sx * 0.45) - tiltY) * Math.min(1, dt * 4);
    vel += (api.velocity - vel) * Math.min(1, dt * 3);

    applyState(dt);
    const idle = reduce ? 0 : t * state.spin;
    crossRig.rotation.y = state.ry + Math.sin(idle * 1.3) * 0.55 + tiltY + vel * 0.0012;
    crossRig.rotation.x = state.rx + Math.sin(idle * 0.9) * 0.08 + tiltX;
    ring.rotation.z = -0.6 + t * 0.05; ring2.rotation.z = 2.4 - t * 0.035;

    /* pointer in world space (z = 0 plane) drives repel + light */
    const wx = sx * halfW, wy = sy * halfH;
    moteMat.uniforms.uMouse.value.set(ptr.on ? wx : 99, ptr.on ? wy : 99, 0);
    plight.position.set(wx, wy, 3.4);
    plight.intensity = (ptr.on ? 55 : 0) * state.light * (coarse ? 0 : 1);
    halo.position.set(wx, wy, 1.2); haloMat.opacity = ptr.on && !coarse ? 0.22 * state.light : 0;

    if (composer && useBloom) composer.render(); else renderer.render(scene, camera);

    /* adaptive quality: if the first seconds are slow, shed the bloom and pixels */
    if (frames > 30 && frames < 150) { if (dt > 0.034) slow++; }
    if (frames === 150) {
      if (slow > 70) {
        if (useBloom) { useBloom = false; if (composer) { composer.dispose && composer.dispose(); composer = null; } }
        if (dpr > 1) { dpr = 1; renderer.setPixelRatio(1); resize(true); }
        api.quality = 0.5;
      }
    }
  }
  api.ready = true;
    api.renderOnce = function () { applyState(0); (composer && useBloom ? composer.render() : renderer.render(scene, camera)); };
  if (reduce) { api.renderOnce(); } else { loop(); }
  requestAnimationFrame(function () { document.documentElement.classList.add('gl-on'); });
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
