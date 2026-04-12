const WATCH_MODEL_PATH = './assets/models/relogio.glb';
const HAND_MODEL_URL = 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task';

const videoEl = document.getElementById('camera-video');
const threeCanvas = document.getElementById('three-canvas');
const debugCanvas = document.getElementById('debug-canvas');
const stageEl = document.getElementById('stage');

const startCameraBtn = document.getElementById('start-camera-btn');
const switchCameraBtn = document.getElementById('switch-camera-btn');
const toggleDebugBtn = document.getElementById('toggle-debug-btn');
const copyLogBtn = document.getElementById('copy-log-btn');
const clearLogBtn = document.getElementById('clear-log-btn');

const watchScaleSlider = document.getElementById('watch-scale-slider');
const rotationOffsetSlider = document.getElementById('rotation-offset-slider');
const wristOffsetSlider = document.getElementById('wrist-offset-slider');

const watchScaleOutput = document.getElementById('watch-scale-output');
const rotationOffsetOutput = document.getElementById('rotation-offset-output');
const wristOffsetOutput = document.getElementById('wrist-offset-output');

const statusPill = document.getElementById('status-pill');
const hintText = document.getElementById('hint-text');
const centerCta = document.getElementById('center-cta');
const debugLog = document.getElementById('debug-log');

const metricDelegate = document.getElementById('metric-delegate');
const metricCamera = document.getElementById('metric-camera');
const metricVideo = document.getElementById('metric-video');
const metricDetections = document.getElementById('metric-detections');
const metricLastHand = document.getElementById('metric-last-hand');

const CONFIG = {
  facingMode: 'environment',
  modelScaleTrim: 1.00,
  rollTrimDeg: 0,
  wristOffsetTrim: 0.24,   // around the last working value
  autoScaleFactor: 1.02,   // closer to true wrist width
  keepVisibleMisses: 12,
  hideAfterMisses: 24,
  minScalePx: 70,
  maxScalePx: 220,
};

const state = {
  stream: null,
  animationHandle: 0,
  debug: false,
  libs: null,
  handLandmarker: null,
  delegate: '—',
  modelLoaded: false,
  modelRoot: null,
  modelSize: null,
  modelRefSize: 0.05,
  renderer: null,
  scene: null,
  camera: null,
  lastVideoTime: -1,
  lastDetectionTime: 0,
  detections: 0,
  lastHandText: '—',
  misses: 0,
  pose: null,
  started: false,
  mirrorPreview: false,
  logLines: [],
  widthHistory: [],
};

watchScaleOutput.textContent = Number(watchScaleSlider.value).toFixed(2);
rotationOffsetOutput.textContent = `${rotationOffsetSlider.value}°`;
wristOffsetOutput.textContent = Number(wristOffsetSlider.value).toFixed(2);
metricDetections.textContent = '0';

watchScaleSlider.addEventListener('input', () => {
  CONFIG.modelScaleTrim = Number(watchScaleSlider.value);
  watchScaleOutput.textContent = CONFIG.modelScaleTrim.toFixed(2);
});
rotationOffsetSlider.addEventListener('input', () => {
  CONFIG.rollTrimDeg = Number(rotationOffsetSlider.value);
  rotationOffsetOutput.textContent = `${CONFIG.rollTrimDeg}°`;
});
wristOffsetSlider.addEventListener('input', () => {
  CONFIG.wristOffsetTrim = Number(wristOffsetSlider.value);
  wristOffsetOutput.textContent = CONFIG.wristOffsetTrim.toFixed(2);
});

toggleDebugBtn.addEventListener('click', () => {
  state.debug = !state.debug;
  debugCanvas.hidden = !state.debug;
  toggleDebugBtn.textContent = state.debug ? 'Hide Landmarks' : 'Show Landmarks';
  logLine(`Debug landmarks: ${state.debug ? 'ON' : 'OFF'}`);
});

copyLogBtn?.addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(state.logLines.join('\n'));
    logLine('Log copied to clipboard.');
  } catch (error) {
    logLine(`Copy failed: ${error?.message || error}`);
  }
});

clearLogBtn?.addEventListener('click', () => {
  state.logLines = [];
  renderLog();
  logLine('Log cleared.');
});

switchCameraBtn.addEventListener('click', async () => {
  CONFIG.facingMode = CONFIG.facingMode === 'user' ? 'environment' : 'user';
  try {
    await startCamera();
  } catch (error) {
    logLine(`Switch camera failed: ${error?.message || error}`);
    setStatus('Could not switch camera');
    setHint(error?.message || 'Camera switch failed.');
  }
});

startCameraBtn.addEventListener('click', async () => {
  try {
    await startCamera();
  } catch (error) {
    logLine(`Start camera failed: ${error?.message || error}`);
    setStatus('Could not start camera');
    setHint(error?.message || 'Camera start failed.');
  }
});

window.addEventListener('resize', resizeStage);
window.addEventListener('error', (event) => {
  logLine(`window.error: ${event.message} @ ${event.filename}:${event.lineno}`);
});
window.addEventListener('unhandledrejection', (event) => {
  logLine(`unhandledrejection: ${event.reason?.message || event.reason || 'unknown reason'}`);
});

setStatus('Preparing try-on…');
setHint('Loading camera and tracking.');
logLine(`Secure context: ${window.isSecureContext}`);
logLine(`User agent: ${navigator.userAgent}`);

boot().catch((error) => {
  logLine(`Boot failed: ${error?.message || error}`);
  setStatus('Try-on failed to load');
  setHint(error?.message || 'Boot failed.');
});

async function boot() {
  logLine('Boot start.');
  const [
    THREE,
    { GLTFLoader },
    visionBundle,
  ] = await Promise.all([
    import('https://esm.sh/three@0.174.0'),
    import('https://esm.sh/three@0.174.0/examples/jsm/loaders/GLTFLoader'),
    import('https://unpkg.com/@mediapipe/tasks-vision@0.10.34/vision_bundle.mjs'),
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

  setStatus('Ready');
  setHint('Tap Start Try-On or wait for camera to start.');
  logLine('Boot finished.');

  try {
    await startCamera();
  } catch (error) {
    logLine(`Auto camera start failed: ${error?.message || error}`);
    setStatus('Ready');
    setHint('Tap Start Try-On to continue.');
  }
}

async function initHandLandmarker() {
  logLine('Loading MediaPipe hand tracker.');
  const vision = await state.libs.FilesetResolver.forVisionTasks(
    'https://unpkg.com/@mediapipe/tasks-vision@0.10.34/wasm'
  );

  try {
    state.handLandmarker = await state.libs.HandLandmarker.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath: HAND_MODEL_URL,
        delegate: 'GPU',
      },
      runningMode: 'VIDEO',
      numHands: 1,
      minHandDetectionConfidence: 0.45,
      minHandPresenceConfidence: 0.45,
      minTrackingConfidence: 0.45,
    });
    state.delegate = 'GPU';
    metricDelegate.textContent = 'GPU';
    logLine('Hand tracker initialized with GPU.');
  } catch (gpuError) {
    logLine(`GPU delegate failed: ${gpuError?.message || gpuError}`);
    state.handLandmarker = await state.libs.HandLandmarker.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath: HAND_MODEL_URL,
        delegate: 'CPU',
      },
      runningMode: 'VIDEO',
      numHands: 1,
      minHandDetectionConfidence: 0.45,
      minHandPresenceConfidence: 0.45,
      minTrackingConfidence: 0.45,
    });
    state.delegate = 'CPU';
    metricDelegate.textContent = 'CPU';
    logLine('Hand tracker initialized with CPU fallback.');
  }
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

  const ambient = new THREE.AmbientLight(0xffffff, 1.32);
  state.scene.add(ambient);

  const key = new THREE.DirectionalLight(0xffffff, 1.18);
  key.position.set(0, 0, 420);
  state.scene.add(key);

  const fill = new THREE.DirectionalLight(0xffffff, 0.55);
  fill.position.set(-250, 120, 240);
  state.scene.add(fill);

  resizeStage();
}

async function loadWatchModel() {
  const THREE = state.libs.THREE;
  const loader = new state.libs.GLTFLoader();
  logLine(`Loading watch model from ${WATCH_MODEL_PATH}`);

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
        state.modelSize = size;

        const dims = [size.x, size.y, size.z].sort((a, b) => a - b);
        state.modelRefSize = dims[1] || size.x || 0.05;

        state.scene.add(root);
        state.modelLoaded = true;

        logLine(`Watch model loaded. Size=${size.x.toFixed(4)} x ${size.y.toFixed(4)} x ${size.z.toFixed(4)} ref=${state.modelRefSize.toFixed(4)}`);
        resolve();
      },
      undefined,
      (error) => reject(error)
    );
  });
}

async function startCamera() {
  if (!window.isSecureContext) throw new Error('This page needs HTTPS to open the camera.');
  if (!navigator.mediaDevices?.getUserMedia) throw new Error('Camera access is not available in this browser.');

  stopCamera();
  setStatus('Starting camera…');
  setHint('Allow camera permission if asked.');

  const tries = [
    {
      audio: false,
      video: {
        facingMode: { ideal: CONFIG.facingMode },
        width: { ideal: 1280 },
        height: { ideal: 720 },
      },
    },
    {
      audio: false,
      video: { facingMode: CONFIG.facingMode },
    },
    { audio: false, video: true },
  ];

  let stream = null;
  let lastError = null;
  for (const constraints of tries) {
    try {
      logLine(`Trying getUserMedia: ${JSON.stringify(constraints)}`);
      stream = await navigator.mediaDevices.getUserMedia(constraints);
      break;
    } catch (error) {
      lastError = error;
      logLine(`getUserMedia failed: ${error?.name || 'Error'} - ${error?.message || error}`);
    }
  }
  if (!stream) throw lastError || new Error('Could not start camera.');

  state.stream = stream;
  state.started = true;
  centerCta.classList.add('is-hidden');

  videoEl.srcObject = stream;
  await videoEl.play();

  const settings = stream.getVideoTracks()[0]?.getSettings?.() || {};
  metricCamera.textContent = settings.facingMode || CONFIG.facingMode;
  metricVideo.textContent = `${settings.width || videoEl.videoWidth || '?'} x ${settings.height || videoEl.videoHeight || '?'}`;
  logLine(`Camera started. settings=${JSON.stringify(settings)}`);

  state.mirrorPreview = CONFIG.facingMode === 'user';
  videoEl.style.transform = state.mirrorPreview ? 'scaleX(-1)' : 'none';

  resizeStage();
  setStatus('Point at the back of your hand');
  setHint('Keep one full hand and wrist visible. Move slowly when the watch appears.');

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
    logLine('Previous camera stream stopped.');
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

  if (!state.handLandmarker || !state.modelLoaded || !videoEl.srcObject || videoEl.readyState < 2) {
    renderScene();
    return;
  }

  const now = performance.now();
  if (videoEl.currentTime !== state.lastVideoTime && now - state.lastDetectionTime > 20) {
    const results = state.handLandmarker.detectForVideo(videoEl, now);
    processResults(results);
    state.lastVideoTime = videoEl.currentTime;
    state.lastDetectionTime = now;
  }

  updateVisibilityOnMiss();
  renderScene();
}

function renderScene() {
  if (state.renderer && state.scene && state.camera) {
    state.renderer.render(state.scene, state.camera);
  }
}

function processResults(results) {
  const debugCtx = debugCanvas.getContext('2d');
  if (debugCtx) debugCtx.clearRect(0, 0, debugCanvas.width, debugCanvas.height);

  const landmarks = results?.landmarks?.[0];
  if (!landmarks) {
    state.misses += 1;
    if ([1, 10, 30].includes(state.misses)) {
      logLine(`No hand detected. misses=${state.misses}`);
    }
    if (state.misses > 10) {
      setStatus('Searching for a wrist…');
      setHint('Show the full hand and wrist. Fingers slightly apart works best.');
    }
    return;
  }

  state.misses = 0;
  state.detections += 1;
  metricDetections.textContent = String(state.detections);

  const handedness = results.handedness?.[0]?.[0]?.categoryName || 'Hand';
  state.lastHandText = handedness;
  metricLastHand.textContent = handedness;

  const wrist2 = mapLandmark(landmarks[0]);
  const index2 = mapLandmark(landmarks[5]);
  const pinky2 = mapLandmark(landmarks[17]);
  const middle2 = mapLandmark(landmarks[9]);

  const wrist3 = toCameraSpacePoint(landmarks[0]);
  const index3 = toCameraSpacePoint(landmarks[5]);
  const pinky3 = toCameraSpacePoint(landmarks[17]);
  const middle3 = toCameraSpacePoint(landmarks[9]);

  const knuckleMid2 = avgVec2(index2, pinky2);
  const along2 = normVec2(subVec2(knuckleMid2, wrist2));
  const across2 = normVec2(subVec2(pinky2, index2));

  // Anchor BACK TO THE WRIST, not the center of the hand
  const handWidthPxRaw = dist2(index2, pinky2);
  state.widthHistory.push(handWidthPxRaw);
  if (state.widthHistory.length > 6) state.widthHistory.shift();
  const stableHandWidth = median(state.widthHistory);

  const wristOffsetPx = stableHandWidth * CONFIG.wristOffsetTrim;
  const anchor2 = {
    x: wrist2.x - along2.x * wristOffsetPx,
    y: wrist2.y - along2.y * wristOffsetPx,
  };

  // Roll from wrist -> knuckle direction
  const roll = -Math.atan2(along2.y, along2.x) + degToRad(CONFIG.rollTrimDeg);

  // Stronger 3D rotation from depth variation
  const zAcross = (index3.z - pinky3.z);
  const zAlong = (middle3.z - wrist3.z);

  let yaw = clamp(zAcross * 7.0, -0.95, 0.95);
  let pitch = clamp(-0.28 + zAlong * 5.0, -0.95, 0.65);

  // Correct left/right handedness so crown side feels more coherent
  if (handedness.toLowerCase().includes('left')) {
    yaw *= -1;
  }

  // Scale should mostly vary with distance to camera
  const desiredWidthPx = clamp(stableHandWidth * CONFIG.autoScaleFactor * CONFIG.modelScaleTrim, CONFIG.minScalePx, CONFIG.maxScalePx);
  const targetScale = desiredWidthPx / Math.max(state.modelRefSize, 0.001);

  const target = {
    x: anchor2.x,
    y: anchor2.y,
    scale: targetScale,
    rx: pitch,
    ry: yaw,
    rz: roll,
  };

  if (!state.pose) {
    state.pose = { ...target };
    logLine(`First hand detected. width=${handWidthPxRaw.toFixed(2)} stable=${stableHandWidth.toFixed(2)} scale=${targetScale.toFixed(2)}`);
  } else {
    const movement = Math.hypot(target.x - state.pose.x, target.y - state.pose.y);
    const fast = movement > 22;

    const posAlpha = fast ? 0.34 : 0.22;
    const rotAlpha = fast ? 0.30 : 0.18;
    const scaleAlpha = 0.10;

    state.pose.x = lerp(state.pose.x, target.x, posAlpha);
    state.pose.y = lerp(state.pose.y, target.y, posAlpha);
    state.pose.scale = lerp(state.pose.scale, target.scale, scaleAlpha);
    state.pose.rx = lerp(state.pose.rx, target.rx, rotAlpha);
    state.pose.ry = lerp(state.pose.ry, target.ry, rotAlpha);
    state.pose.rz = lerpAngle(state.pose.rz, target.rz, rotAlpha);
  }

  placeWatch(state.pose);
  setStatus(`${handedness} wrist detected`);
  setHint('Move slowly. The watch should stay anchored closer to the wrist now.');

  if (state.debug && debugCtx) {
    drawDebug(debugCtx, landmarks, [0, 5, 9, 17]);
      // visualize wrist anchor
      debugCtx.save();
      debugCtx.fillStyle = 'rgba(0, 220, 255, 0.95)';
      debugCtx.beginPath();
      debugCtx.arc(anchor2.x, anchor2.y, 6, 0, Math.PI * 2);
      debugCtx.fill();
      debugCtx.restore();
  }
}

function updateVisibilityOnMiss() {
  if (!state.modelRoot) return;
  if (state.misses > CONFIG.keepVisibleMisses && state.misses < CONFIG.hideAfterMisses) {
    state.modelRoot.visible = true;
  } else if (state.misses >= CONFIG.hideAfterMisses) {
    state.modelRoot.visible = false;
    state.pose = null;
    state.widthHistory = [];
  }
}

function placeWatch(pose) {
  if (!state.modelRoot) return;
  const rect = stageEl.getBoundingClientRect();
  state.modelRoot.visible = true;
  state.modelRoot.position.set(
    pose.x - rect.width / 2,
    -(pose.y - rect.height / 2),
    0
  );
  state.modelRoot.scale.setScalar(pose.scale);
  state.modelRoot.rotation.set(pose.rx, pose.ry, pose.rz);
}

function mapLandmark(lm) {
  const rect = stageEl.getBoundingClientRect();
  const videoW = videoEl.videoWidth || rect.width;
  const videoH = videoEl.videoHeight || rect.height;
  const stageW = rect.width;
  const stageH = rect.height;

  let nx = lm.x;
  if (state.mirrorPreview) nx = 1 - nx;

  const videoAspect = videoW / videoH;
  const stageAspect = stageW / stageH;

  if (videoAspect > stageAspect) {
    const scale = stageH / videoH;
    const displayW = videoW * scale;
    const offsetX = (stageW - displayW) / 2;
    return { x: nx * displayW + offsetX, y: lm.y * stageH };
  } else {
    const scale = stageW / videoW;
    const displayH = videoH * scale;
    const offsetY = (stageH - displayH) / 2;
    return { x: nx * stageW, y: lm.y * displayH + offsetY };
  }
}

function toCameraSpacePoint(lm) {
  let x = lm.x;
  if (state.mirrorPreview) x = 1 - x;
  return { x, y: lm.y, z: lm.z };
}

function drawDebug(ctx, landmarks, highlightIndices = []) {
  ctx.save();
  ctx.lineWidth = 2;
  ctx.strokeStyle = 'rgba(207, 220, 122, 0.95)';

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
    ctx.arc(p.x, p.y, highlightIndices.includes(i) ? 7 : 4, 0, Math.PI * 2);
    ctx.fillStyle = highlightIndices.includes(i) ? 'rgba(255, 221, 0, 0.98)' : 'rgba(255,255,255,0.95)';
    ctx.fill();
  });

  ctx.restore();
}

function setStatus(text) { statusPill.textContent = text; }
function setHint(text) { hintText.textContent = text; }

function logLine(text) {
  const timestamp = new Date().toLocaleTimeString();
  const line = `[${timestamp}] ${text}`;
  console.log(line);
  state.logLines.push(line);
  if (state.logLines.length > 120) state.logLines = state.logLines.slice(-120);
  renderLog();
}

function renderLog() {
  debugLog.textContent = state.logLines.join('\n');
  debugLog.scrollTop = debugLog.scrollHeight;
}

function lerp(a, b, t) { return a + (b - a) * t; }
function degToRad(v) { return (v * Math.PI) / 180; }
function clamp(v, min, max) { return Math.min(max, Math.max(min, v)); }
function median(values) {
  const arr = [...values].sort((a,b)=>a-b);
  if (!arr.length) return 0;
  const mid = Math.floor(arr.length / 2);
  return arr.length % 2 ? arr[mid] : (arr[mid - 1] + arr[mid]) / 2;
}
function lerpAngle(a, b, t) {
  let delta = b - a;
  while (delta > Math.PI) delta -= Math.PI * 2;
  while (delta < -Math.PI) delta += Math.PI * 2;
  return a + delta * t;
}
function subVec2(a, b) { return { x: a.x - b.x, y: a.y - b.y }; }
function avgVec2(a, b) { return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }; }
function normVec2(v) {
  const len = Math.hypot(v.x, v.y) || 1;
  return { x: v.x / len, y: v.y / len };
}
function dist2(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }
