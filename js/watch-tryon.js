
const WATCH_MODEL_PATH = './assets/models/relogio.glb';
const HAND_MODEL_URL = 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task';

const videoEl = document.getElementById('camera-video');
const threeCanvas = document.getElementById('three-canvas');
const occlusionCanvas = document.getElementById('occlusion-canvas');
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
  modelScaleTrim: 1.0,
  rollTrimDeg: 0,
  wristOffsetTrim: 0.26,
  centerAlongFactor: 0.26,
  centerNormalOffsetFactor: 0.03,
  autoScaleFactor: 0.82,
  keepVisibleMisses: 18,
  hideAfterMisses: 34,
  posAlphaStable: 0.18,
  posAlphaRecover: 0.48,
  rotAlphaStable: 0.14,
  rotAlphaRecover: 0.42,
  scaleAlphaStable: 0.14,
  scaleAlphaRecover: 0.36,
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
      minHandDetectionConfidence: 0.5,
      minHandPresenceConfidence: 0.5,
      minTrackingConfidence: 0.5,
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
      minHandDetectionConfidence: 0.5,
      minHandPresenceConfidence: 0.5,
      minTrackingConfidence: 0.5,
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

  const ambient = new THREE.AmbientLight(0xffffff, 1.22);
  state.scene.add(ambient);

  const key = new THREE.DirectionalLight(0xffffff, 1.1);
  key.position.set(0, 0, 400);
  state.scene.add(key);

  const fill = new THREE.DirectionalLight(0xffffff, 0.5);
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
        state.scene.add(root);
        state.modelLoaded = true;

        logLine(`Watch model loaded. Size=${size.x.toFixed(4)} x ${size.y.toFixed(4)} x ${size.z.toFixed(4)}`);
        resolve();
      },
      undefined,
      (error) => reject(error)
    );
  });
}

async function startCamera() {
  if (!window.isSecureContext) {
    throw new Error('This page needs HTTPS to open the camera.');
  }
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error('Camera access is not available in this browser.');
  }

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
      video: {
        facingMode: CONFIG.facingMode,
      },
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
  occlusionCanvas.width = width;
  occlusionCanvas.height = height;
}

function loop() {
  state.animationHandle = requestAnimationFrame(loop);

  drawOcclusion(null);

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
    drawOcclusion(null);
    return;
  }

  state.misses = 0;
  state.detections += 1;
  metricDetections.textContent = String(state.detections);

  const handedness = results.handedness?.[0]?.[0]?.categoryName || 'Hand';
  state.lastHandText = handedness;
  metricLastHand.textContent = handedness;

  const lm3 = landmarks.map(toCameraSpacePoint);
  const wrist3 = lm3[0];
  const index3 = lm3[5];
  const pinky3 = lm3[17];
  const middle3 = lm3[9];
  const knuckleMid3 = avgVec3(index3, pinky3);

  let along3 = normVec3(subVec3(knuckleMid3, wrist3));
  let across3 = normVec3(subVec3(index3, pinky3));
  let normal3 = normVec3(crossVec3(across3, along3));

  if (normal3.z < 0) {
    normal3 = mulVec3(normal3, -1);
    across3 = mulVec3(across3, -1);
  }

  const wrist2 = mapLandmark(landmarks[0]);
  const knuckleMid2 = avgVec2(mapLandmark(landmarks[5]), mapLandmark(landmarks[17]));
  const along2 = normVec2(subVec2(knuckleMid2, wrist2));
  const normal2 = { x: -along2.y, y: along2.x };

  const handWidthPx = dist2(mapLandmark(landmarks[5]), mapLandmark(landmarks[17]));
  const anchorBase = lerpVec2(wrist2, knuckleMid2, CONFIG.centerAlongFactor + (CONFIG.wristOffsetTrim - 0.26));
  const anchor2 = addVec2(anchorBase, mulVec2(normal2, handWidthPx * CONFIG.centerNormalOffsetFactor));

  const desiredWidthPx = handWidthPx * CONFIG.autoScaleFactor * CONFIG.modelScaleTrim;
  const modelWidth = state.modelSize ? state.modelSize.x : 0.07;
  const targetScale = desiredWidthPx / modelWidth;

  const THREE = state.libs.THREE;
  const basis = new THREE.Matrix4().makeBasis(
    new THREE.Vector3(across3.x, across3.y, across3.z),
    new THREE.Vector3(along3.x, along3.y, along3.z),
    new THREE.Vector3(normal3.x, normal3.y, normal3.z)
  );
  const targetQuat = new THREE.Quaternion().setFromRotationMatrix(basis);
  const rollTrim = new THREE.Quaternion().setFromAxisAngle(
    new THREE.Vector3(0, 0, 1),
    degToRad(CONFIG.rollTrimDeg)
  );
  targetQuat.multiply(rollTrim);

  const targetRotX = clamp((wrist3.z - knuckleMid3.z) * 1.4, -0.45, 0.45);
  const pitchTrim = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), targetRotX);
  targetQuat.multiply(pitchTrim);

  if (!state.pose) {
    state.pose = {
      x: anchor2.x,
      y: anchor2.y,
      scale: targetScale,
      quat: targetQuat.clone(),
    };
    logLine(`First hand detected. handWidth=${handWidthPx.toFixed(2)} scale=${targetScale.toFixed(2)}`);
  } else {
    const recovering = state.misses > 0;
    const posAlpha = recovering ? CONFIG.posAlphaRecover : CONFIG.posAlphaStable;
    const rotAlpha = recovering ? CONFIG.rotAlphaRecover : CONFIG.rotAlphaStable;
    const scaleAlpha = recovering ? CONFIG.scaleAlphaRecover : CONFIG.scaleAlphaStable;

    state.pose.x = lerp(state.pose.x, anchor2.x, posAlpha);
    state.pose.y = lerp(state.pose.y, anchor2.y, posAlpha);
    state.pose.scale = lerp(state.pose.scale, targetScale, scaleAlpha);
    state.pose.quat.slerp(targetQuat, rotAlpha);
  }

  placeWatch(state.pose);
  drawOcclusion(landmarks);

  setStatus(`${handedness} wrist detected`);
  setHint('Move slowly. The watch will stay visible longer when tracking is briefly lost.');

  if (state.debug && debugCtx) {
    drawDebug(debugCtx, landmarks, [0, 5, 9, 17]);
  }
}

function updateVisibilityOnMiss() {
  if (!state.modelRoot) return;
  if (state.misses <= CONFIG.keepVisibleMisses) {
    if (state.modelRoot.visible && state.modelRoot.userData.fade < 1) {
      state.modelRoot.userData.fade = Math.min(1, (state.modelRoot.userData.fade || 1) + 0.08);
      applyModelOpacity(state.modelRoot.userData.fade);
    }
    return;
  }
  if (state.misses <= CONFIG.hideAfterMisses) {
    state.modelRoot.userData.fade = Math.max(0, (state.modelRoot.userData.fade ?? 1) - 0.08);
    applyModelOpacity(state.modelRoot.userData.fade);
    return;
  }
  state.modelRoot.visible = false;
  applyModelOpacity(1);
}

function placeWatch(pose) {
  if (!state.modelRoot) return;
  const rect = stageEl.getBoundingClientRect();

  state.modelRoot.visible = true;
  state.modelRoot.userData.fade = 1;
  state.modelRoot.position.set(
    pose.x - rect.width / 2,
    -(pose.y - rect.height / 2),
    0
  );
  state.modelRoot.scale.setScalar(pose.scale);
  state.modelRoot.quaternion.copy(pose.quat);
  applyModelOpacity(1);
}

function applyModelOpacity(alpha) {
  if (!state.modelRoot) return;
  state.modelRoot.traverse((obj) => {
    if (!obj.material) return;
    const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
    mats.forEach((mat) => {
      mat.transparent = alpha < 0.999;
      mat.opacity = alpha;
      mat.depthWrite = alpha >= 0.999;
      mat.needsUpdate = true;
    });
  });
}

function drawOcclusion(landmarks) {
  const ctx = occlusionCanvas.getContext('2d');
  ctx.clearRect(0, 0, occlusionCanvas.width, occlusionCanvas.height);
  if (!landmarks || videoEl.readyState < 2) return;

  const pts = [0,1,2,3,4,8,12,16,20,19,18,17].map((idx) => mapLandmark(landmarks[idx]));
  const centroid = pts.reduce((acc, p) => ({ x: acc.x + p.x / pts.length, y: acc.y + p.y / pts.length }), { x: 0, y: 0 });
  const expanded = pts.map((p) => {
    const dx = p.x - centroid.x;
    const dy = p.y - centroid.y;
    return { x: centroid.x + dx * 1.10, y: centroid.y + dy * 1.10 };
  });

  ctx.save();
  ctx.beginPath();
  expanded.forEach((p, i) => {
    if (i === 0) ctx.moveTo(p.x, p.y);
    else ctx.lineTo(p.x, p.y);
  });
  ctx.closePath();
  ctx.clip();
  drawVideoCover(ctx);
  ctx.restore();
}

function drawVideoCover(ctx) {
  const stageW = occlusionCanvas.width;
  const stageH = occlusionCanvas.height;
  const videoW = videoEl.videoWidth || stageW;
  const videoH = videoEl.videoHeight || stageH;

  const stageAspect = stageW / stageH;
  const videoAspect = videoW / videoH;

  let drawW, drawH, dx, dy;
  if (videoAspect > stageAspect) {
    drawH = stageH;
    drawW = drawH * videoAspect;
    dx = (stageW - drawW) / 2;
    dy = 0;
  } else {
    drawW = stageW;
    drawH = drawW / videoAspect;
    dx = 0;
    dy = (stageH - drawH) / 2;
  }

  if (state.mirrorPreview) {
    ctx.save();
    ctx.translate(stageW, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(videoEl, stageW - (dx + drawW), dy, drawW, drawH);
    ctx.restore();
  } else {
    ctx.drawImage(videoEl, dx, dy, drawW, drawH);
  }
}

function drawDebug(ctx, landmarks, highlightIndices = []) {
  ctx.clearRect(0, 0, debugCanvas.width, debugCanvas.height);
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
    ctx.arc(p.x, p.y, highlightIndices.includes(i) ? 6.5 : 4, 0, Math.PI * 2);
    ctx.fillStyle = highlightIndices.includes(i) ? 'rgba(255, 221, 0, 0.98)' : 'rgba(255,255,255,0.95)';
    ctx.fill();
  });
  ctx.restore();
}

function toCameraSpacePoint(lm) {
  const x = (state.mirrorPreview ? 1 - lm.x : lm.x) - 0.5;
  const y = 0.5 - lm.y;
  const z = -lm.z;
  return { x, y, z };
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

function setStatus(text) {
  statusPill.textContent = text;
}
function setHint(text) {
  hintText.textContent = text;
}
function logLine(text) {
  const timestamp = new Date().toLocaleTimeString();
  const line = `[${timestamp}] ${text}`;
  console.log(line);
  state.logLines.push(line);
  if (state.logLines.length > 160) state.logLines = state.logLines.slice(-160);
  renderLog();
}
function renderLog() {
  debugLog.textContent = state.logLines.join('\n');
  debugLog.scrollTop = debugLog.scrollHeight;
}

function subVec2(a,b){ return { x:a.x-b.x, y:a.y-b.y }; }
function addVec2(a,b){ return { x:a.x+b.x, y:a.y+b.y }; }
function mulVec2(v,s){ return { x:v.x*s, y:v.y*s }; }
function avgVec2(a,b){ return { x:(a.x+b.x)/2, y:(a.y+b.y)/2 }; }
function lerpVec2(a,b,t){ return { x: lerp(a.x,b.x,t), y: lerp(a.y,b.y,t) }; }
function normVec2(v){ const l=Math.hypot(v.x,v.y)||1; return { x:v.x/l, y:v.y/l }; }
function dist2(a,b){ return Math.hypot(a.x-b.x,a.y-b.y); }

function subVec3(a,b){ return { x:a.x-b.x, y:a.y-b.y, z:a.z-b.z }; }
function mulVec3(v,s){ return { x:v.x*s, y:v.y*s, z:v.z*s }; }
function avgVec3(a,b){ return { x:(a.x+b.x)/2, y:(a.y+b.y)/2, z:(a.z+b.z)/2 }; }
function normVec3(v){ const l=Math.hypot(v.x,v.y,v.z)||1; return { x:v.x/l, y:v.y/l, z:v.z/l }; }
function crossVec3(a,b){ return { x:a.y*b.z - a.z*b.y, y:a.z*b.x - a.x*b.z, z:a.x*b.y - a.y*b.x }; }

function degToRad(v){ return v * Math.PI / 180; }
function lerp(a,b,t){ return a + (b-a) * t; }
function clamp(v,min,max){ return Math.min(max, Math.max(min, v)); }
