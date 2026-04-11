const WATCH_MODEL_PATH = './assets/models/relogio.glb';
const HAND_MODEL_URL = 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task';

const videoEl = document.getElementById('camera-video');
const threeCanvas = document.getElementById('three-canvas');
const debugCanvas = document.getElementById('debug-canvas');
const stageEl = document.getElementById('stage');

const startCameraBtn = document.getElementById('start-camera-btn');
const switchCameraBtn = document.getElementById('switch-camera-btn');
const toggleDebugBtn = document.getElementById('toggle-debug-btn');

const watchScaleSlider = document.getElementById('watch-scale-slider');
const rotationOffsetSlider = document.getElementById('rotation-offset-slider');
const wristOffsetSlider = document.getElementById('wrist-offset-slider');

const watchScaleOutput = document.getElementById('watch-scale-output');
const rotationOffsetOutput = document.getElementById('rotation-offset-output');
const wristOffsetOutput = document.getElementById('wrist-offset-output');

const statusPill = document.getElementById('status-pill');
const hintText = document.getElementById('hint-text');

const state = {
  facingMode: 'user',
  mirrorPreview: true,
  stream: null,
  animationHandle: 0,
  debug: false,
  modelLoaded: false,
  modelRoot: null,
  modelContent: null,
  modelSize: null,
  renderer: null,
  scene: null,
  camera: null,
  handLandmarker: null,
  lastVideoTime: -1,
  lastDetectionTime: 0,
  smoothed: null,
  detectionMisses: 0,
  booted: false,
  libs: null,
};

setStatus('Booting watch try-on…');
setHint('Preparing camera and tracking libraries.');

watchScaleOutput.textContent = Number(watchScaleSlider.value).toFixed(2);
rotationOffsetOutput.textContent = `${rotationOffsetSlider.value}°`;
wristOffsetOutput.textContent = Number(wristOffsetSlider.value).toFixed(2);

watchScaleSlider.addEventListener('input', () => {
  watchScaleOutput.textContent = Number(watchScaleSlider.value).toFixed(2);
});
rotationOffsetSlider.addEventListener('input', () => {
  rotationOffsetOutput.textContent = `${rotationOffsetSlider.value}°`;
});
wristOffsetSlider.addEventListener('input', () => {
  wristOffsetOutput.textContent = Number(wristOffsetSlider.value).toFixed(2);
});

toggleDebugBtn.addEventListener('click', () => {
  state.debug = !state.debug;
  debugCanvas.hidden = !state.debug;
  toggleDebugBtn.textContent = state.debug ? 'Hide Landmarks' : 'Show Landmarks';
});

switchCameraBtn.addEventListener('click', async () => {
  try {
    state.facingMode = state.facingMode === 'user' ? 'environment' : 'user';
    await startCamera();
  } catch (error) {
    console.error(error);
    setStatus('Could not switch camera');
    setHint(error?.message || 'Camera switch failed.');
  }
});

startCameraBtn.addEventListener('click', async () => {
  try {
    await startCamera();
  } catch (error) {
    console.error(error);
    setStatus('Could not start camera');
    setHint(error?.message || 'Camera start failed. Check browser permission and reload the page.');
  }
});

window.addEventListener('resize', resizeStage);

boot().catch((error) => {
  console.error(error);
  setStatus('Watch try-on failed to load');
  setHint(error?.message || 'Boot failed before camera start.');
});

async function boot() {
  const [
    THREE,
    { GLTFLoader },
    visionBundle,
  ] = await Promise.all([
    import('https://esm.sh/three@0.174.0'),
    import('https://esm.sh/three@0.174.0/examples/jsm/loaders/GLTFLoader'),
    import('https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.22/+esm'),
  ]);

  state.libs = {
    THREE,
    GLTFLoader,
    FilesetResolver: visionBundle.FilesetResolver,
    HandLandmarker: visionBundle.HandLandmarker,
  };

  setupThree();
  await loadWatchModel();
  await initHandLandmarker();

  state.booted = true;
  setStatus('Ready to start camera');
  setHint('Tap Start Camera. Then hold your wrist in frame.');

  try {
    await startCamera();
  } catch (error) {
    console.error(error);
    setStatus('Ready to start camera');
    setHint(error?.message || 'Tap Start Camera. Then hold your wrist in frame.');
  }
}

async function initHandLandmarker() {
  setStatus('Loading hand tracker…');
  const vision = await state.libs.FilesetResolver.forVisionTasks(
    'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.22/wasm'
  );

  state.handLandmarker = await state.libs.HandLandmarker.createFromOptions(vision, {
    baseOptions: {
      modelAssetPath: HAND_MODEL_URL,
      delegate: 'GPU',
    },
    runningMode: 'VIDEO',
    numHands: 1,
    minHandDetectionConfidence: 0.65,
    minHandPresenceConfidence: 0.65,
    minTrackingConfidence: 0.65,
  });
}

function setupThree() {
  const THREE = state.libs.THREE;

  state.renderer = new THREE.WebGLRenderer({
    canvas: threeCanvas,
    alpha: true,
    antialias: true,
    powerPreference: 'high-performance',
  });
  state.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

  state.scene = new THREE.Scene();
  state.camera = new THREE.OrthographicCamera(-100, 100, 100, -100, 0.1, 2000);
  state.camera.position.z = 1000;

  const ambient = new THREE.AmbientLight(0xffffff, 1.35);
  state.scene.add(ambient);

  const key = new THREE.DirectionalLight(0xffffff, 1.25);
  key.position.set(0, 0, 400);
  state.scene.add(key);

  const fill = new THREE.DirectionalLight(0xffffff, 0.65);
  fill.position.set(-250, 120, 240);
  state.scene.add(fill);

  resizeStage();
}

async function loadWatchModel() {
  setStatus('Loading watch model…');
  const THREE = state.libs.THREE;
  const loader = new state.libs.GLTFLoader();

  await new Promise((resolve, reject) => {
    loader.load(
      WATCH_MODEL_PATH,
      (gltf) => {
        const root = new THREE.Group();
        const content = gltf.scene;

        const box = new THREE.Box3().setFromObject(content);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());

        content.position.sub(center);

        root.add(content);
        root.visible = false;

        state.modelRoot = root;
        state.modelContent = content;
        state.modelSize = size;

        state.scene.add(root);
        state.modelLoaded = true;
        resolve();
      },
      undefined,
      reject
    );
  });
}

async function startCamera() {
  if (!window.isSecureContext) {
    throw new Error('This page needs HTTPS to open the camera.');
  }

  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error('Camera access is not available in this browser or context.');
  }

  stopCamera();
  setStatus('Starting camera…');
  setHint('Allow camera permission to continue.');

  const preferredConstraints = [
    {
      audio: false,
      video: {
        facingMode: { ideal: state.facingMode },
        width: { ideal: 1280 },
        height: { ideal: 720 },
      },
    },
    {
      audio: false,
      video: {
        facingMode: state.facingMode,
      },
    },
    { audio: false, video: true },
  ];

  let stream = null;
  let lastError = null;

  for (const constraints of preferredConstraints) {
    try {
      stream = await navigator.mediaDevices.getUserMedia(constraints);
      break;
    } catch (error) {
      lastError = error;
    }
  }

  if (!stream) {
    throw lastError || new Error('Could not start camera.');
  }

  state.stream = stream;
  videoEl.srcObject = stream;
  await videoEl.play();

  state.mirrorPreview = state.facingMode === 'user';
  videoEl.style.transform = state.mirrorPreview ? 'scaleX(-1)' : 'none';

  resizeStage();
  setStatus('Camera started');
  setHint('Show the top side of your wrist. Keep it well lit and steady.');

  cancelAnimationFrame(state.animationHandle);
  state.lastVideoTime = -1;
  loop();
}

function stopCamera() {
  cancelAnimationFrame(state.animationHandle);
  state.animationHandle = 0;

  if (state.stream) {
    state.stream.getTracks().forEach((track) => track.stop());
    state.stream = null;
  }

  videoEl.srcObject = null;
}

function resizeStage() {
  if (!state.renderer || !state.camera) return;
  const rect = stageEl.getBoundingClientRect();
  const width = Math.max(1, Math.floor(rect.width));
  const height = Math.max(1, Math.floor(rect.height));

  state.renderer.setSize(width, height, false);
  state.camera.left = -width / 2;
  state.camera.right = width / 2;
  state.camera.top = height / 2;
  state.camera.bottom = -height / 2;
  state.camera.updateProjectionMatrix();

  debugCanvas.width = width;
  debugCanvas.height = height;
}

function loop() {
  state.animationHandle = requestAnimationFrame(loop);

  if (!state.handLandmarker || !state.modelLoaded || !videoEl.srcObject) {
    renderScene();
    return;
  }

  if (videoEl.readyState < 2) {
    renderScene();
    return;
  }

  const now = performance.now();

  if (videoEl.currentTime !== state.lastVideoTime && now - state.lastDetectionTime > 25) {
    const results = state.handLandmarker.detectForVideo(videoEl, now);
    processResults(results);
    state.lastVideoTime = videoEl.currentTime;
    state.lastDetectionTime = now;
  }

  renderScene();
}

function renderScene() {
  if (state.renderer && state.scene && state.camera) {
    state.renderer.render(state.scene, state.camera);
  }
}

function processResults(results) {
  const debugCtx = debugCanvas.getContext('2d');
  if (debugCtx) {
    debugCtx.clearRect(0, 0, debugCanvas.width, debugCanvas.height);
  }

  if (!results?.landmarks?.length) {
    state.detectionMisses += 1;

    if (state.detectionMisses > 6 && state.modelRoot) {
      state.modelRoot.visible = false;
    }

    if (state.detectionMisses > 10) {
      setStatus('No wrist detected');
      setHint('Show one wrist clearly to the camera. Good light helps a lot.');
    }
    return;
  }

  state.detectionMisses = 0;

  const landmarks = results.landmarks[0];
  const handedness = results.handedness?.[0]?.[0]?.categoryName || 'Hand';

  const wrist = mapLandmark(landmarks[0]);
  const middle = mapLandmark(landmarks[9]);
  const indexMcp = mapLandmark(landmarks[5]);
  const pinkyMcp = mapLandmark(landmarks[17]);

  const along = normalizeVec({
    x: middle.x - wrist.x,
    y: middle.y - wrist.y,
  });

  const handWidth = distance(indexMcp, pinkyMcp);
  const wristOffsetPx = handWidth * Number(wristOffsetSlider.value);

  const targetX = wrist.x - along.x * wristOffsetPx;
  const targetY = wrist.y - along.y * wristOffsetPx;

  const angle = Math.atan2(along.y, along.x);
  const rotationOffsetRad = degToRad(Number(rotationOffsetSlider.value));
  const targetRotationZ = -angle + rotationOffsetRad;

  const sizeReference = Math.max(
    state.modelSize.x || 1,
    state.modelSize.y || 1,
    state.modelSize.z || 1
  );
  const desiredScreenSize = handWidth * Number(watchScaleSlider.value);
  const targetScale = Math.max(12, desiredScreenSize) / sizeReference;

  const zBetweenKnuckles = (landmarks[5].z - landmarks[17].z);
  const zAlongHand = (landmarks[9].z - landmarks[0].z);

  const targetRotationY = clamp(zBetweenKnuckles * 8, -0.9, 0.9);
  const targetRotationX = clamp(-0.45 + zAlongHand * 6, -1.0, 0.7);

  const smoothedTarget = {
    x: targetX,
    y: targetY,
    scale: targetScale,
    rz: targetRotationZ,
    rx: targetRotationX,
    ry: targetRotationY,
  };

  if (!state.smoothed) {
    state.smoothed = { ...smoothedTarget };
  } else {
    const lerpAlpha = 0.28;
    state.smoothed.x = lerp(state.smoothed.x, smoothedTarget.x, lerpAlpha);
    state.smoothed.y = lerp(state.smoothed.y, smoothedTarget.y, lerpAlpha);
    state.smoothed.scale = lerp(state.smoothed.scale, smoothedTarget.scale, lerpAlpha);
    state.smoothed.rz = lerpAngle(state.smoothed.rz, smoothedTarget.rz, lerpAlpha);
    state.smoothed.rx = lerp(state.smoothed.rx, smoothedTarget.rx, lerpAlpha);
    state.smoothed.ry = lerp(state.smoothed.ry, smoothedTarget.ry, lerpAlpha);
  }

  placeWatch(state.smoothed);
  setStatus(`${handedness} wrist detected`);
  setHint('Move slowly. Use the fit sliders if the watch looks too big or rotated.');

  if (state.debug && debugCtx) {
    drawDebug(debugCtx, landmarks, [0, 5, 9, 17]);
  }
}

function placeWatch(data) {
  if (!state.modelRoot) return;

  const rect = stageEl.getBoundingClientRect();
  state.modelRoot.visible = true;
  state.modelRoot.position.set(
    data.x - rect.width / 2,
    -(data.y - rect.height / 2),
    0
  );
  state.modelRoot.scale.setScalar(data.scale);
  state.modelRoot.rotation.set(data.rx, data.ry, data.rz);
}

function mapLandmark(lm) {
  const rect = stageEl.getBoundingClientRect();
  const videoW = videoEl.videoWidth || rect.width;
  const videoH = videoEl.videoHeight || rect.height;

  const stageW = rect.width;
  const stageH = rect.height;

  let nx = lm.x;
  if (state.mirrorPreview) {
    nx = 1 - nx;
  }

  const videoAspect = videoW / videoH;
  const stageAspect = stageW / stageH;

  if (videoAspect > stageAspect) {
    const scale = stageH / videoH;
    const displayW = videoW * scale;
    const offsetX = (stageW - displayW) / 2;
    return {
      x: nx * displayW + offsetX,
      y: lm.y * stageH,
    };
  } else {
    const scale = stageW / videoW;
    const displayH = videoH * scale;
    const offsetY = (stageH - displayH) / 2;
    return {
      x: nx * stageW,
      y: lm.y * displayH + offsetY,
    };
  }
}

function drawDebug(ctx, landmarks, highlightIndices = []) {
  ctx.save();
  ctx.lineWidth = 2;
  ctx.strokeStyle = 'rgba(207, 220, 122, 0.9)';

  const connections = [
    [0,1],[1,2],[2,3],[3,4],
    [0,5],[5,6],[6,7],[7,8],
    [5,9],[9,10],[10,11],[11,12],
    [9,13],[13,14],[14,15],[15,16],
    [13,17],[17,18],[18,19],[19,20],[0,17]
  ];

  for (const [a, b] of connections) {
    const pa = mapLandmark(landmarks[a]);
    const pb = mapLandmark(landmarks[b]);
    ctx.beginPath();
    ctx.moveTo(pa.x, pa.y);
    ctx.lineTo(pb.x, pb.y);
    ctx.stroke();
  }

  landmarks.forEach((lm, i) => {
    const p = mapLandmark(lm);
    ctx.beginPath();
    ctx.arc(p.x, p.y, highlightIndices.includes(i) ? 6 : 4, 0, Math.PI * 2);
    ctx.fillStyle = highlightIndices.includes(i) ? 'rgba(255, 221, 0, 0.95)' : 'rgba(255,255,255,0.9)';
    ctx.fill();
  });

  ctx.restore();
}

function setStatus(text) {
  if (statusPill) statusPill.textContent = text;
}

function setHint(text) {
  if (hintText) hintText.textContent = text;
}

function normalizeVec(v) {
  const len = Math.hypot(v.x, v.y) || 1;
  return { x: v.x / len, y: v.y / len };
}

function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function degToRad(v) {
  return (v * Math.PI) / 180;
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function clamp(v, min, max) {
  return Math.min(max, Math.max(min, v));
}

function lerpAngle(a, b, t) {
  let delta = b - a;
  while (delta > Math.PI) delta -= Math.PI * 2;
  while (delta < -Math.PI) delta += Math.PI * 2;
  return a + delta * t;
}
