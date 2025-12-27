import * as THREE from "https://unpkg.com/three@0.160.0/build/three.module.js";
import { OrbitControls } from "https://unpkg.com/three@0.160.0/examples/jsm/controls/OrbitControls.js";
import { GLTFLoader } from "https://unpkg.com/three@0.160.0/examples/jsm/loaders/GLTFLoader.js";

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x111111);

// Camera
const camera = new THREE.PerspectiveCamera(
  60,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
camera.position.set(0, 1.5, 4);

// Renderer
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
document.body.appendChild(renderer.domElement);

// Controls
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;

// Lights
scene.add(new THREE.AmbientLight(0xffffff, 0.6));
const dir = new THREE.DirectionalLight(0xffffff, 1.0);
dir.position.set(5, 10, 5);
scene.add(dir);

// Loader + shared root
const loader = new GLTFLoader();
const root = new THREE.Group();
scene.add(root);

// Helper
function applyMaterial(model, material) {
  model.traverse((child) => {
    if (child.isMesh) {
      child.material = material;
      child.material.needsUpdate = true;
    }
  });
}

/**
 * Terrain hologram (unchanged)
 */
function createTerrainHologramMaterial() {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: {
      uTime: { value: 0 },
      uPaused: { value: 1.0 },
      uColor: { value: new THREE.Color(0x28c7ff) },
      uOpacity: { value: 0.55 },
      uFresnelPower: { value: 2.0 },
      uScanDensity: { value: 140.0 },
      uScanSpeed: { value: 0.65 },
      uGlow: { value: 1.25 }
    },
    vertexShader: `
      varying vec3 vNormalW;
      varying vec3 vViewDirW;
      varying vec3 vPosW;

      void main() {
        vec4 worldPos = modelMatrix * vec4(position, 1.0);
        vPosW = worldPos.xyz;
        vNormalW = normalize(mat3(modelMatrix) * normal);
        vViewDirW = normalize(cameraPosition - vPosW);
        gl_Position = projectionMatrix * viewMatrix * worldPos;
      }
    `,
    fragmentShader: `
      precision highp float;

      uniform float uTime;
      uniform float uPaused;
      uniform vec3  uColor;
      uniform float uOpacity;
      uniform float uFresnelPower;
      uniform float uScanDensity;
      uniform float uScanSpeed;
      uniform float uGlow;

      varying vec3 vNormalW;
      varying vec3 vViewDirW;
      varying vec3 vPosW;

      float hash(vec2 p){
        p = fract(p * vec2(123.34, 345.45));
        p += dot(p, p + 34.345);
        return fract(p.x * p.y);
      }

      void main() {
        float ndv = clamp(dot(normalize(vNormalW), normalize(vViewDirW)), 0.0, 1.0);
        float fresnel = pow(1.0 - ndv, uFresnelPower);
        float time = uTime * (1.0 - uPaused);

        float scan = sin((vPosW.y * uScanDensity) + (time * 6.28318 * uScanSpeed));
        scan = smoothstep(0.15, 1.0, scan);

        float n = hash(vPosW.xz * 0.25);

        float intensity = (0.25 + fresnel * uGlow) * (0.55 + 0.45 * scan);
        intensity *= (0.85 + 0.15 * n);

        vec3 col = uColor * intensity;
        float alpha = uOpacity * (0.35 + 0.65 * fresnel) * (0.65 + 0.35 * scan);

        gl_FragColor = vec4(col, alpha);
      }
    `
  });
}

/**
 * Path hologram – radial sonar rings
 * ONLY color changed
 */
function createPathRadialHologramMaterial() {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: {
      uTime: { value: 0 },
      uPaused: { value: 0.0 },
      uColor: { value: new THREE.Color(0xe8f2ff) }, // 🤍 light blue-white
      uOpacity: { value: 0.7 },
      uFresnelPower: { value: 1.6 },
      uRingDensity: { value: 28.0 },
      uRingSpeed: { value: 0.8 },
      uGlow: { value: 1.9 },
      uCenter: { value: new THREE.Vector3(0, 0, 0) }
    },
    vertexShader: `
      varying vec3 vNormalW;
      varying vec3 vViewDirW;
      varying vec3 vPosW;

      void main() {
        vec4 worldPos = modelMatrix * vec4(position, 1.0);
        vPosW = worldPos.xyz;
        vNormalW = normalize(mat3(modelMatrix) * normal);
        vViewDirW = normalize(cameraPosition - vPosW);
        gl_Position = projectionMatrix * viewMatrix * worldPos;
      }
    `,
    fragmentShader: `
      precision highp float;

      uniform float uTime;
      uniform float uPaused;
      uniform vec3  uColor;
      uniform float uOpacity;
      uniform float uFresnelPower;
      uniform float uRingDensity;
      uniform float uRingSpeed;
      uniform float uGlow;
      uniform vec3  uCenter;

      varying vec3 vNormalW;
      varying vec3 vViewDirW;
      varying vec3 vPosW;

      float hash(vec2 p){
        p = fract(p * vec2(123.34, 345.45));
        p += dot(p, p + 34.345);
        return fract(p.x * p.y);
      }

      void main() {
        float ndv = clamp(dot(normalize(vNormalW), normalize(vViewDirW)), 0.0, 1.0);
        float fresnel = pow(1.0 - ndv, uFresnelPower);
        float time = uTime * (1.0 - uPaused);

        vec2 p = vPosW.xz - uCenter.xz;
        float r = length(p);

        float rings = sin(r * uRingDensity - time * 6.28318 * uRingSpeed);
        rings = smoothstep(0.2, 1.0, rings);

        float n = hash(vPosW.xz * 0.5);

        float intensity = (0.2 + fresnel * uGlow) * (0.55 + 0.45 * rings);
        intensity *= (0.9 + 0.1 * n);

        vec3 col = uColor * intensity;
        float alpha = uOpacity * (0.35 + 0.65 * fresnel) * (0.6 + 0.4 * rings);

        gl_FragColor = vec4(col, alpha);
      }
    `
  });
}

const terrainHoloMat = createTerrainHologramMaterial();
const pathHoloMat = createPathRadialHologramMaterial();

// Camera fit
function fitCameraToSize(sizeVec3, padding = 1.1) {
  const maxDim = Math.max(sizeVec3.x, sizeVec3.y, sizeVec3.z);
  const fov = camera.fov * (Math.PI / 180);
  let cameraZ = Math.abs((maxDim / 2) / Math.tan(fov / 2));
  cameraZ *= padding;

  camera.near = 0.01;
  camera.far = cameraZ * 50;
  camera.updateProjectionMatrix();

  camera.position.set(0, maxDim * 0.6, cameraZ);
  camera.lookAt(0, 0, 0);

  controls.target.set(0, 0, 0);
  controls.update();
}

// Load terrain
loader.load("./models/soft.gltf", (gltf) => {
  const terrain = gltf.scene;
  applyMaterial(terrain, terrainHoloMat);
  root.add(terrain);

  const box = new THREE.Box3().setFromObject(terrain);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());

  root.position.sub(center);
  pathHoloMat.uniforms.uCenter.value.set(0, 0, 0);
  fitCameraToSize(size, 0.9);

  loader.load("./models/path.gltf", (gltf2) => {
    const path = gltf2.scene;
    applyMaterial(path, pathHoloMat);
    root.add(path);
  });
});

// Resize
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// Animate
function animate() {
  requestAnimationFrame(animate);
  const t = performance.now() * 0.001;
  terrainHoloMat.uniforms.uTime.value = t;
  pathHoloMat.uniforms.uTime.value = t;
  controls.update();
  renderer.render(scene, camera);
}
animate();
