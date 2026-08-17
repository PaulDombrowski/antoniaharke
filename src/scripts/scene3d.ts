import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

const canvas = document.querySelector<HTMLCanvasElement>("[data-scene-3d]");

function createStudioEnvironmentMap() {
  const environmentCanvas = document.createElement("canvas");
  const width = 1024;
  const height = 512;
  const context = environmentCanvas.getContext("2d");

  environmentCanvas.width = width;
  environmentCanvas.height = height;

  if (!context) {
    return null;
  }

  const baseGradient = context.createLinearGradient(0, 0, 0, height);
  baseGradient.addColorStop(0, "#ffffff");
  baseGradient.addColorStop(0.42, "#eef1f4");
  baseGradient.addColorStop(0.58, "#d9dde2");
  baseGradient.addColorStop(1, "#ffffff");
  context.fillStyle = baseGradient;
  context.fillRect(0, 0, width, height);

  context.filter = "blur(18px)";
  context.fillStyle = "#060708";
  context.fillRect(94, 50, 92, 410);
  context.fillRect(650, 42, 130, 430);

  context.fillStyle = "#ffffff";
  context.fillRect(500, 26, 72, 460);
  context.fillRect(300, 32, 54, 448);
  context.fillRect(852, 70, 42, 372);

  context.fillStyle = "#111418";
  context.fillRect(588, 46, 78, 420);

  context.fillStyle = "#cbd3db";
  context.fillRect(438, 96, 74, 318);
  context.fillRect(914, 120, 64, 260);

  context.filter = "none";
  context.globalAlpha = 0.28;
  context.fillStyle = "#ffffff";
  context.fillRect(0, 68, width, 38);
  context.fillRect(0, 406, width, 28);
  context.globalAlpha = 1;

  const texture = new THREE.CanvasTexture(environmentCanvas);
  texture.mapping = THREE.EquirectangularReflectionMapping;
  texture.colorSpace = THREE.SRGBColorSpace;

  return texture;
}

if (canvas) {
  const renderer = new THREE.WebGLRenderer({
    alpha: true,
    antialias: true,
    canvas,
    powerPreference: "low-power",
  });

  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;

  const pmremGenerator = new THREE.PMREMGenerator(renderer);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 100);
  const model = new THREE.Group();
  const loader = new GLTFLoader();
  const studioEnvironmentMap = createStudioEnvironmentMap();
  const baseUrl = new URL(import.meta.env.BASE_URL, window.location.origin);
  const modelUrl = new URL("antonia%20harke.glb", baseUrl).toString();
  const chromeMaterial = new THREE.MeshPhysicalMaterial({
    color: 0x0b0c0e,
    metalness: 0.08,
    roughness: 0.08,
    clearcoat: 1,
    clearcoatRoughness: 0.018,
    envMapIntensity: 3.8,
    ior: 1.9,
    specularIntensity: 1,
    specularColor: 0xffffff,
    side: THREE.DoubleSide,
  });
  const keyLight = new THREE.DirectionalLight(0xffffff, 7.5);
  const rimLight = new THREE.DirectionalLight(0xe8eef8, 4);
  const bounceLight = new THREE.DirectionalLight(0xffffff, 2.2);
  const fillLight = new THREE.HemisphereLight(0xffffff, 0xd6d6d6, 1.45);
  const pointerStart = new THREE.Vector2();
  const rotationStart = new THREE.Vector2();
  const targetRotation = new THREE.Vector2();
  const modelRotation = new THREE.Euler(Math.PI / 2, 0, 0);
  let loadedModel: THREE.Object3D | null = null;
  let modelCenter = new THREE.Vector3();
  let modelSize = new THREE.Vector3();
  let isDragging = false;
  const prefersReducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  ).matches;

  const environmentTexture = studioEnvironmentMap
    ? pmremGenerator.fromEquirectangular(studioEnvironmentMap).texture
    : null;
  scene.environment = environmentTexture;
  scene.background = null;
  chromeMaterial.envMap = environmentTexture;
  chromeMaterial.needsUpdate = true;

  renderer.setClearColor(0xffffff, 0);
  camera.position.set(0, 0.05, 4.8);
  keyLight.position.set(3.5, 5.5, 4.5);
  rimLight.position.set(-4.5, 2.75, -3.5);
  bounceLight.position.set(-2.5, -3, 2.5);
  scene.add(model, keyLight, rimLight, bounceLight, fillLight);

  const fitModel = () => {
    if (!loadedModel) {
      return;
    }

    const distance = camera.position.z;
    const visibleHeight =
      2 * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2) * distance;
    const visibleWidth = visibleHeight * camera.aspect;
    const widthFill = camera.aspect < 0.7 ? 0.58 : 0.86;
    model.position.x = camera.aspect < 0.7 ? -visibleWidth * 0.14 : 0;
    const scale = Math.min(
      (visibleWidth * widthFill) / Math.max(modelSize.x, 0.001),
      (visibleHeight * 0.74) / Math.max(modelSize.y, 0.001),
    );

    loadedModel.scale.setScalar(scale);
    loadedModel.position.set(
      -modelCenter.x * scale,
      -modelCenter.y * scale,
      -modelCenter.z * scale,
    );
  };

  loader.load(modelUrl, (gltf) => {
    loadedModel = gltf.scene;
    loadedModel.rotation.copy(modelRotation);
    loadedModel.position.set(0, 0, 0);
    loadedModel.scale.setScalar(1);

    const box = new THREE.Box3().setFromObject(loadedModel);
    modelCenter = box.getCenter(new THREE.Vector3());
    modelSize = box.getSize(new THREE.Vector3());

    loadedModel.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.material = chromeMaterial;
        child.castShadow = false;
        child.receiveShadow = false;
      }
    });

    fitModel();
    model.add(loadedModel);
  });

  const resize = () => {
    const rect = canvas.getBoundingClientRect();
    const width = Math.max(1, rect.width);
    const height = Math.max(1, rect.height);

    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    fitModel();
  };

  const onPointerDown = (event: PointerEvent) => {
    isDragging = true;
    pointerStart.set(event.clientX, event.clientY);
    rotationStart.copy(targetRotation);
    canvas.setPointerCapture(event.pointerId);
    canvas.style.cursor = "grabbing";
  };

  const onPointerMove = (event: PointerEvent) => {
    if (!isDragging) {
      return;
    }

    const deltaX = (event.clientX - pointerStart.x) / window.innerWidth;
    const deltaY = (event.clientY - pointerStart.y) / window.innerHeight;

    targetRotation.x = THREE.MathUtils.clamp(
      rotationStart.x + deltaY * 0.45,
      -0.16,
      0.16,
    );
    targetRotation.y = THREE.MathUtils.clamp(
      rotationStart.y + deltaX * 0.7,
      -0.28,
      0.28,
    );
  };

  const onPointerUp = (event: PointerEvent) => {
    isDragging = false;
    canvas.releasePointerCapture(event.pointerId);
    canvas.style.cursor = "grab";
  };

  const render = () => {
    if (!prefersReducedMotion) {
      model.rotation.x = THREE.MathUtils.lerp(
        model.rotation.x,
        targetRotation.x,
        0.075,
      );
      model.rotation.y = THREE.MathUtils.lerp(
        model.rotation.y,
        targetRotation.y,
        0.075,
      );
    }

    renderer.render(scene, camera);
    requestAnimationFrame(render);
  };

  resize();
  window.addEventListener("resize", resize);
  canvas.addEventListener("pointerdown", onPointerDown);
  canvas.addEventListener("pointermove", onPointerMove, { passive: true });
  canvas.addEventListener("pointerup", onPointerUp);
  canvas.addEventListener("pointercancel", onPointerUp);
  render();
}
