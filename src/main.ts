import * as THREE from "three";
import gsap from "gsap";
import ScrollTrigger from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

// --- SOZLAMALAR ---
const CONFIG = {
  // particleCount: 3000, // Zarrachalar soni
  // sphereRadius: 2.5, // Sfera kattaligi
  // scatterRadius: 20, // Sochilish kengligi (Chaos)
  // color: "#00ffff", // Asosiy rang (Cyan)
  // color2: "#ff00aa", // Qo'shimcha rang (Pink)
  particleCount: 4000, // Ko'proq zichlik (Data points)
  sphereRadius: 2.2, // Sfera o'lchami
  scatterRadius: 25, // Qanchalik keng sochilib yotishi
  // Ranglar: "Trust Blue" va "Pure White"
  color: "#0066ff", // Asosiy rang (Royal Blue - Ishonch)
  color2: "#ffffff",
};

// 1. SAHNA
const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x000000, 0.03); // Orqa fonni chuqurlashtirish

const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  100,
);
camera.position.z = 8; // Kamera masofasi

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

const container = document.getElementById("pixi-container");
if (container) {
  container.innerHTML = "";
  container.appendChild(renderer.domElement);
}

// Canvas CSS (Fixed fon)
renderer.domElement.style.position = "fixed";
renderer.domElement.style.top = "0";
renderer.domElement.style.left = "0";
renderer.domElement.style.zIndex = "-1";

// 2. TEXTURE (Yaltiroq nuqta)
function getGlowSprite() {
  const canvas = document.createElement("canvas");
  canvas.width = 32;
  canvas.height = 32;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    const grad = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
    grad.addColorStop(0, "rgba(255,255,255,1)");
    grad.addColorStop(0.4, "rgba(255,255,255,0.3)");
    grad.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 32, 32);
  }
  return new THREE.CanvasTexture(canvas);
}

// 3. ZARRACHALAR TIZIMI
const geometry = new THREE.BufferGeometry();
const positions = new Float32Array(CONFIG.particleCount * 3); // Hozirgi joyi (Render qilinadigan)
const colors = new Float32Array(CONFIG.particleCount * 3);

// Biz ikkita holatni xotirada saqlaymiz:
// A) Chaos (Boshlang'ich)
// B) Sphere (Maqsad)
const startPositions = new Float32Array(CONFIG.particleCount * 3);
const endPositions = new Float32Array(CONFIG.particleCount * 3);

const color1 = new THREE.Color(CONFIG.color);
const color2 = new THREE.Color(CONFIG.color2);

for (let i = 0; i < CONFIG.particleCount; i++) {
  const i3 = i * 3;

  // --- A) START POSITIONS (Chaos) ---
  // Ekranning har tomonida sochilib yotadi
  startPositions[i3] = (Math.random() - 0.5) * CONFIG.scatterRadius;
  startPositions[i3 + 1] = (Math.random() - 0.5) * CONFIG.scatterRadius;
  startPositions[i3 + 2] = (Math.random() - 0.5) * CONFIG.scatterRadius;

  // --- B) END POSITIONS (Sphere) ---
  // Sfera matematikasidan foydalanib nuqta topamiz
  // Fibonacci Sphere algoritmi (tekis taqsimlash uchun)
  const phi = Math.acos(-1 + (2 * i) / CONFIG.particleCount);
  const theta = Math.sqrt(CONFIG.particleCount * Math.PI) * phi;

  endPositions[i3] = CONFIG.sphereRadius * Math.cos(theta) * Math.sin(phi);
  endPositions[i3 + 1] = CONFIG.sphereRadius * Math.sin(theta) * Math.sin(phi);
  endPositions[i3 + 2] = CONFIG.sphereRadius * Math.cos(phi);

  // Hozircha start pozitsiyani berib turamiz
  positions[i3] = startPositions[i3];
  positions[i3 + 1] = startPositions[i3 + 1];
  positions[i3 + 2] = startPositions[i3 + 2];

  // --- RANGLAR ---
  // Sferaning tepasi bir rang, pasti boshqa rang bo'lishi uchun
  const mixedColor = color1.clone().lerp(color2, i / CONFIG.particleCount);
  colors[i3] = mixedColor.r;
  colors[i3 + 1] = mixedColor.g;
  colors[i3 + 2] = mixedColor.b;
}

geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));

const material = new THREE.PointsMaterial({
  size: 0.1,
  map: getGlowSprite(),
  transparent: true,
  opacity: 0.8,
  vertexColors: true,
  blending: THREE.AdditiveBlending,
  depthWrite: false,
});

const particles = new THREE.Points(geometry, material);
scene.add(particles);

// 4. ANIMATSIYA STATE (Boshqaruv pulti)
const state = {
  progress: 0, // 0 = Chaos, 1 = Sphere
};

// 5. SCROLL TRIGGER
// Bu yerda sehr yuz beradi. Scrollga qarab 'state.progress' 0 dan 1 ga o'zgaradi.
gsap.to(state, {
  progress: 1,
  ease: "power1.inOut", // Yumshoq boshlanish va tugash
  scrollTrigger: {
    trigger: "body", // Butun sayt bo'yicha
    start: "top top", // Eng tepadan boshlanadi
    end: "bottom bottom", // Eng pastda tugaydi
    scrub: 1.5, // 1.5 soniya "smoothness" (orqaga qaytish ham shu bilan ishlaydi)
  },
});

// 6. RENDER LOOP
const clock = new THREE.Clock();

function animate() {
  const time = clock.getElapsedTime();

  // Geometry attributlarini olish
  const posAttr = geometry.attributes.position;

  for (let i = 0; i < CONFIG.particleCount; i++) {
    const i3 = i * 3;

    // Matematika: LERP (Linear Interpolation)
    // Formula: Hozirgi = Start + (End - Start) * Progress

    const x =
      startPositions[i3] +
      (endPositions[i3] - startPositions[i3]) * state.progress;
    const y =
      startPositions[i3 + 1] +
      (endPositions[i3 + 1] - startPositions[i3 + 1]) * state.progress;
    const z =
      startPositions[i3 + 2] +
      (endPositions[i3 + 2] - startPositions[i3 + 2]) * state.progress;

    // "Noise" (Tiriklik) effekti
    // Progress 1 bo'lganda (sfera bo'lganda) kamroq qimirlasin, 0 bo'lganda ko'proq
    const noiseAmplitude = 0.05 * (1 - state.progress * 0.5);
    const noiseX = Math.sin(time + x) * noiseAmplitude;
    const noiseY = Math.cos(time + y) * noiseAmplitude;

    posAttr.setXYZ(i, x + noiseX, y + noiseY, z);
  }

  posAttr.needsUpdate = true; // Three.js ga o'zgarishni aytish

  // Doimiy aylanish (Sfera holatida chiroyli ko'rinadi)
  particles.rotation.y = time * 0.1;
  particles.rotation.z = time * 0.05;

  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}

// Resize
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

animate();
