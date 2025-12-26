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
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
document.body.appendChild(renderer.domElement);

// Controls
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;

// Lights (important for GLTF)
scene.add(new THREE.AmbientLight(0xffffff, 0.6));
const dir = new THREE.DirectionalLight(0xffffff, 1.0);
dir.position.set(5, 10, 5);
scene.add(dir);

// Load GLTF
const loader = new GLTFLoader();
loader.load(
  "./models/soft.gltf",
  (gltf) => {
    const model = gltf.scene;
    scene.add(model);

    // Auto-center + auto-fit camera to model (so it appears even if huge/tiny)
    const box = new THREE.Box3().setFromObject(model);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());

    model.position.sub(center); // center model at origin

    const maxDim = Math.max(size.x, size.y, size.z);
    const fov = camera.fov * (Math.PI / 180);
    let cameraZ = Math.abs((maxDim / 2) / Math.tan(fov / 2));
    cameraZ *= 0.9; // padding

    camera.position.set(0, maxDim * 0.6, cameraZ);
    camera.lookAt(0, 0, 0);

    controls.target.set(0, 0, 0);
    controls.update();

    console.log("Loaded:", gltf);
  },
  (progress) => {
    // optional
    // console.log((progress.loaded / progress.total) * 100 + "%");
  },
  (error) => {
    console.error("GLTF load error:", error);
  }
);

loader.load(
  "./models/path.gltf",
  (gltf) => {
    const model = gltf.scene;
    scene.add(model);

    // Auto-center + auto-fit camera to model (so it appears even if huge/tiny)
    const box = new THREE.Box3().setFromObject(model);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());

    model.position.sub(center); // center model at origin

    const maxDim = Math.max(size.x, size.y, size.z);
    const fov = camera.fov * (Math.PI / 180);
    let cameraZ = Math.abs((maxDim / 2) / Math.tan(fov / 2));
    cameraZ *= 0.9; // padding

    camera.position.set(0, maxDim * 0.6, cameraZ);
    camera.lookAt(0, 0, 0);

    controls.target.set(0, 0, 0);
    controls.update();

    console.log("Loaded:", gltf);
  },
  (progress) => {
    // optional
    // console.log((progress.loaded / progress.total) * 100 + "%");
  },
  (error) => {
    console.error("GLTF load error:", error);
  }
);

// Resize
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// Animate
function animate() {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
}
animate();
