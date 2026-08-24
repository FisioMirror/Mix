import { useEffect, useRef, useState, useCallback } from 'react';

// MediaPipe Pose is loaded via CDN <script> tags in index.html, which expose
// the globals `window.Pose` and `window.Camera`.
declare global {
  interface Window {
    Pose?: any;
    Camera?: any;
  }
}

interface PoseLandmark {
  x: number;
  y: number;
  z: number;
  visibility: number;
}

interface PoseData {
  landmarks: PoseLandmark[];
  leftArmAngle: number;
  rightArmAngle: number;
  leftElbowAngle: number;
  rightElbowAngle: number;
  postureScore: number;
  isTracking: boolean;
}

interface UsePoseDetectionResult {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  poseData: PoseData | null;
  isReady: boolean;
  error: string | null;
  repCount: number;
  resetReps: () => void;
  startCamera: () => void;
  cameraStarted: boolean;
  setTargetAngle: (angle: number) => void;
}

// MediaPipe pose landmark indices
const LM = {
  NOSE: 0,
  LEFT_SHOULDER: 11,
  RIGHT_SHOULDER: 12,
  LEFT_ELBOW: 13,
  RIGHT_ELBOW: 14,
  LEFT_WRIST: 15,
  RIGHT_WRIST: 16,
  LEFT_HIP: 23,
  RIGHT_HIP: 24,
  LEFT_KNEE: 25,
  RIGHT_KNEE: 26,
  LEFT_ANKLE: 27,
  RIGHT_ANKLE: 28,
};

// Skeleton connections drawn on the canvas
const POSE_CONNECTIONS: [number, number][] = [
  [LM.LEFT_SHOULDER, LM.RIGHT_SHOULDER],
  [LM.LEFT_SHOULDER, LM.LEFT_ELBOW],
  [LM.LEFT_ELBOW, LM.LEFT_WRIST],
  [LM.RIGHT_SHOULDER, LM.RIGHT_ELBOW],
  [LM.RIGHT_ELBOW, LM.RIGHT_WRIST],
  [LM.LEFT_SHOULDER, LM.LEFT_HIP],
  [LM.RIGHT_SHOULDER, LM.RIGHT_HIP],
  [LM.LEFT_HIP, LM.RIGHT_HIP],
  [LM.LEFT_HIP, LM.LEFT_KNEE],
  [LM.LEFT_KNEE, LM.LEFT_ANKLE],
  [LM.RIGHT_HIP, LM.RIGHT_KNEE],
  [LM.RIGHT_KNEE, LM.RIGHT_ANKLE],
];

// Dynamic posture colors: red (bad), yellow (near), green (correct)
const COLOR_BAD = '#ef4444';
const COLOR_NEAR = '#eab308';
const COLOR_GOOD = '#22c55e';

function getPostureColor(score: number): string {
  if (score >= 75) return COLOR_GOOD;
  if (score >= 50) return COLOR_NEAR;
  return COLOR_BAD;
}

function calculateAngle(a: PoseLandmark, b: PoseLandmark, c: PoseLandmark): number {
  const radians = Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(a.y - b.y, a.x - b.x);
  let angle = Math.abs((radians * 180) / Math.PI);
  if (angle > 180) angle = 360 - angle;
  return Math.round(angle);
}

export function usePoseDetection(): UsePoseDetectionResult {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const poseRef = useRef<any>(null);
  const cameraRef = useRef<any>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const lastLandmarksRef = useRef<PoseLandmark[] | null>(null);

  const [poseData, setPoseData] = useState<PoseData | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [repCount, setRepCount] = useState(0);
  const [cameraStarted, setCameraStarted] = useState(false);

  const repPhaseRef = useRef<'up' | 'down'>('down');
  const targetAngleRef = useRef<number>(90);

  const resetReps = useCallback(() => {
    setRepCount(0);
    repPhaseRef.current = 'down';
  }, []);

  const startCamera = useCallback(() => {
    setCameraStarted(true);
  }, []);

  const setTargetAngle = useCallback((angle: number) => {
    targetAngleRef.current = angle;
  }, []);

  useEffect(() => {
    if (!cameraStarted) return;
    let mounted = true;

    const initPose = async () => {
      try {
        // 1) Request the camera with the spec'd constraints.
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: 'user',
            width: { ideal: 640 },
            height: { ideal: 480 },
          },
          audio: false,
        });

        if (!mounted) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;

        // 2) Attach the stream directly to the <video> element.
        const video = videoRef.current;
        if (video) {
          video.srcObject = stream;
          await video.play().catch(() => {
            /* autoplay can throw if not user-gesture initiated; ignore */
          });
        }

        // 3) Wait for MediaPipe globals (loaded via CDN in index.html).
        if (typeof window.Pose === 'undefined') {
          throw new Error('MediaPipe no disponible. Verifica tu conexión a internet.');
        }

        const pose = new window.Pose({
          locateFile: (file: string) =>
            `https://cdn.jsdelivr.net/npm/@mediapipe/pose@0.5.1675469404/${file}`,
        });

        pose.setOptions({
          modelComplexity: 2,
          smoothLandmarks: true,
          enableSegmentation: false,
          minDetectionConfidence: 0.5,
          minTrackingConfidence: 0.5,
        });

        // 4) Handle detection results: draw skeleton + expose pose data.
        pose.onResults((results: any) => {
          if (!mounted) return;

          const canvas = canvasRef.current;
          const vid = videoRef.current;
          if (!canvas || !vid) return;

          const ctx = canvas.getContext('2d');
          if (!ctx) return;

          const w = vid.videoWidth || 640;
          const h = vid.videoHeight || 480;
          if (canvas.width !== w) canvas.width = w;
          if (canvas.height !== h) canvas.height = h;

          ctx.save();
          ctx.clearRect(0, 0, canvas.width, canvas.height);

          if (results.poseLandmarks) {
            let landmarks = results.poseLandmarks as PoseLandmark[];

            // Light exponential smoothing for stability without lag.
            if (lastLandmarksRef.current) {
              const alpha = 0.5;
              landmarks = landmarks.map((lm, i) => {
                const prev = lastLandmarksRef.current![i];
                if (!prev) return lm;
                return {
                  x: prev.x + alpha * (lm.x - prev.x),
                  y: prev.y + alpha * (lm.y - prev.y),
                  z: prev.z + alpha * (lm.z - prev.z),
                  visibility: lm.visibility,
                };
              });
            }
            lastLandmarksRef.current = landmarks;

            // Joint angles for the AR HUD.
            const leftArmAngle =
              landmarks[LM.LEFT_SHOULDER] && landmarks[LM.LEFT_ELBOW] && landmarks[LM.LEFT_WRIST]
                ? calculateAngle(landmarks[LM.LEFT_SHOULDER], landmarks[LM.LEFT_ELBOW], landmarks[LM.LEFT_WRIST])
                : 0;
            const rightArmAngle =
              landmarks[LM.RIGHT_SHOULDER] && landmarks[LM.RIGHT_ELBOW] && landmarks[LM.RIGHT_WRIST]
                ? calculateAngle(landmarks[LM.RIGHT_SHOULDER], landmarks[LM.RIGHT_ELBOW], landmarks[LM.RIGHT_WRIST])
                : 0;

            const visibleCount = landmarks.filter((lm) => lm.visibility > 0.5).length;
            const postureScore = Math.round((visibleCount / 33) * 100);

            // Dynamic posture color based on quality score
            const postureColor = getPostureColor(postureScore);

            // Draw connections with posture-based color, thicker lines (min 3px)
            ctx.strokeStyle = postureColor;
            ctx.lineWidth = 5;
            ctx.lineCap = 'round';
            ctx.shadowBlur = 8;
            ctx.shadowColor = postureColor;
            for (const [a, b] of POSE_CONNECTIONS) {
              const pa = landmarks[a];
              const pb = landmarks[b];
              if (pa && pb && pa.visibility > 0.3 && pb.visibility > 0.3) {
                ctx.beginPath();
                ctx.moveTo(pa.x * canvas.width, pa.y * canvas.height);
                ctx.lineTo(pb.x * canvas.width, pb.y * canvas.height);
                ctx.stroke();
              }
            }
            ctx.shadowBlur = 0;

            // Draw joints as filled circles with white border
            for (const lm of landmarks) {
              if (lm.visibility > 0.3) {
                // White border
                ctx.beginPath();
                ctx.arc(lm.x * canvas.width, lm.y * canvas.height, 8, 0, Math.PI * 2);
                ctx.fillStyle = '#ffffff';
                ctx.fill();
                // Inner colored dot
                ctx.beginPath();
                ctx.arc(lm.x * canvas.width, lm.y * canvas.height, 5, 0, Math.PI * 2);
                ctx.fillStyle = postureColor;
                ctx.fill();
              }
            }

            // Rep counting driven by the dominant elbow angle.
            const currentAngle = Math.max(leftArmAngle, rightArmAngle);
            if (currentAngle > 160 && repPhaseRef.current === 'down') {
              repPhaseRef.current = 'up';
            } else if (currentAngle < 60 && repPhaseRef.current === 'up') {
              repPhaseRef.current = 'down';
              setRepCount((r) => r + 1);
            }

            setPoseData({
              landmarks,
              leftArmAngle,
              rightArmAngle,
              leftElbowAngle: leftArmAngle,
              rightElbowAngle: rightArmAngle,
              postureScore,
              isTracking: true,
            });
          } else {
            lastLandmarksRef.current = null;
            setPoseData((prev) => (prev ? { ...prev, isTracking: false } : null));
          }

          ctx.restore();
        });

        poseRef.current = pose;

        // 5) Frame loop. Prefer MediaPipe's Camera utility when present;
        //    otherwise fall back to a requestAnimationFrame loop.
        if (typeof window.Camera !== 'undefined' && video) {
          cameraRef.current = new window.Camera(video, {
            onFrame: async () => {
              if (poseRef.current && video) {
                try {
                  await poseRef.current.send({ image: video });
                } catch {
                  /* ignore transient frame errors */
                }
              }
            },
            width: 640,
            height: 480,
          });
          cameraRef.current.start();
        } else if (video) {
          const loop = async () => {
            if (!mounted) return;
            if (poseRef.current && video.readyState >= 2) {
              try {
                await poseRef.current.send({ image: video });
              } catch {
                /* ignore */
              }
            }
            rafRef.current = requestAnimationFrame(loop);
          };
          rafRef.current = requestAnimationFrame(loop);
        }

        setIsReady(true);
      } catch (e: any) {
        if (!mounted) return;
        const msg = String(e?.message || e || '');
        if (msg.includes('Permission') || msg.includes('denied') || msg.includes('NotAllowed')) {
          setError('Permiso de cámara denegado. Activa la cámara en los permisos del navegador.');
        } else if (msg.includes('NotFound') || msg.includes('NotReadable') || msg.includes('device')) {
          setError('No se encontró ninguna cámara disponible en tu dispositivo.');
        } else if (msg.includes('MediaPipe')) {
          setError(msg);
        } else {
          setError('No se pudo inicializar la cámara: ' + msg);
        }
        setIsReady(true);
      }
    };

    initPose();

    return () => {
      mounted = false;
      if (rafRef.current != null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      if (cameraRef.current) {
        try { cameraRef.current.stop(); } catch { /* */ }
        cameraRef.current = null;
      }
      if (poseRef.current) {
        try { poseRef.current.close(); } catch { /* */ }
        poseRef.current = null;
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
    };
  }, [cameraStarted]);

  return {
    videoRef,
    canvasRef,
    poseData,
    isReady,
    error,
    repCount,
    resetReps,
    startCamera,
    cameraStarted,
    setTargetAngle,
  };
}
