"use client";

import { useRef, useState, useEffect } from "react";

const frames = [
  "/frames/frame1.png",
  "/frames/frame2.png",
  "/frames/frame3.png",
];

const FILTERS: Record<string, { name: string; value: string }> = {
  normal: { name: "기본", value: "none" },
  soft: { name: "뽀샤시", value: "brightness(1.15) contrast(0.95) saturate(1.2)" },
  vivid: { name: "생기", value: "contrast(1.2) saturate(1.4) brightness(1.05)" },
  cool: { name: "쿨톤", value: "contrast(1.1) brightness(1.05) hue-rotate(10deg) saturate(1.1)" },
};

const LAYOUT = {
  canvasW: 620,
  canvasH: 2100,
  x: 30,
  w: 560,
  h: 420,
  yList: [40, 480, 920, 1360],
};

export default function Home() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [streaming, setStreaming] = useState(false);
  const [step, setStep] = useState<"camera" | "preview" | "result">("camera");
  const [photos, setPhotos] = useState<string[]>([]);
  const [selectedFrame, setSelectedFrame] = useState(frames[0]);
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [isShooting, setIsShooting] = useState(false);
  const [flash, setFlash] = useState(false);
  const [filter, setFilter] = useState("soft");

  const shutterSound =
    typeof window !== "undefined" ? new Audio("/shutter.mp3") : null;

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" },
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setStreaming(true);
      }
    } catch {
      alert("카메라를 켤 수 없습니다.");
    }
  };

  // 🔥 FIXED CAPTURE (핵심)
  const capture = () => {
    if (!videoRef.current) return null;

    const video = videoRef.current;

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    const vw = video.videoWidth;
    const vh = video.videoHeight;

    const targetW = LAYOUT.w;
    const targetH = LAYOUT.h;

    const targetRatio = targetW / targetH;
    const videoRatio = vw / vh;

    let sx = 0,
      sy = 0,
      sw = vw,
      sh = vh;

    // cover crop (비율 유지)
    if (videoRatio > targetRatio) {
      sw = vh * targetRatio;
      sx = (vw - sw) / 2;
    } else {
      sh = vw / targetRatio;
      sy = (vh - sh) / 2;
    }

    canvas.width = targetW;
    canvas.height = targetH;

    // 좌우 반전 (카메라 mirror 대응)
    ctx.translate(targetW, 0);
    ctx.scale(-1, 1);

    ctx.drawImage(
      video,
      sx,
      sy,
      sw,
      sh,
      0,
      0,
      targetW,
      targetH
    );

    return canvas.toDataURL("image/png");
  };

  const loadImage = (src: string) =>
    new Promise<HTMLImageElement>((resolve) => {
      const img = new Image();
      img.src = src;
      img.onload = () => resolve(img);
    });

  const renderImage = async (frameSrc: string, isDownload = false) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const scale = isDownload ? 2 : 1;

    canvas.width = LAYOUT.canvasW * scale;
    canvas.height = LAYOUT.canvasH * scale;

    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const images = await Promise.all(photos.map(loadImage));

    images.forEach((img, i) => {
      ctx.filter = FILTERS[filter].value;

      ctx.drawImage(
        img,
        LAYOUT.x * scale,
        LAYOUT.yList[i] * scale,
        LAYOUT.w * scale,
        LAYOUT.h * scale
      );
    });

    ctx.filter = "none";

    const frame = await loadImage(frameSrc);
    ctx.drawImage(frame, 0, 0, canvas.width, canvas.height);

    const final = canvas.toDataURL("image/png");
    setResultImage(final);
  };

  useEffect(() => {
    if (photos.length === 4) {
      renderImage(selectedFrame);
    }
  }, [photos]);

  const startAutoShoot = async () => {
    if (isShooting) return;

    setIsShooting(true);

    const temp: string[] = [];

    for (let i = 0; i < 4; i++) {
      for (let t = 5; t > 0; t--) {
        setCountdown(t);
        await new Promise((r) => setTimeout(r, 1000));
      }

      setCountdown(null);
      setFlash(true);
      setTimeout(() => setFlash(false), 100);

      shutterSound?.play();

      const img = capture();
      if (img) temp.push(img);

      await new Promise((r) => setTimeout(r, 500));
    }

    setPhotos(temp);
    setIsShooting(false);
    setStep("preview");
  };

  const shareLink = async () => {
    await navigator.clipboard.writeText(window.location.href);
    alert("링크 복사 완료");
  };

  const shareWhatsApp = () => {
    const url = encodeURIComponent(window.location.href);
    window.open(`https://wa.me/?text=${url}`, "_blank");
  };

  const shareFacebook = () => {
    const url = encodeURIComponent(window.location.href);
    window.open(
      `https://www.facebook.com/sharer/sharer.php?u=${url}`,
      "_blank"
    );
  };

  return (
    <div className="container">
      <header className="header">
        <h1 className="logo">
          SOYKKO <span>BOOTH</span>
        </h1>
      </header>

      {/* CAMERA */}
      {step === "camera" && (
        <div className="mainContent">
          <div className={`cameraContainer ${isShooting ? "active" : ""}`}>
            <video
              ref={videoRef}
              autoPlay
              muted
              playsInline
              className="video"
            />

            {countdown !== null && (
              <div className="count">{countdown}</div>
            )}

            {flash && <div className="flash" />}
          </div>

          <div className="actionArea">
            {!streaming ? (
              <button onClick={startCamera} className="btn-main">
                카메라 연결하기
              </button>
            ) : (
              <button
                className="btn-shoot"
                disabled={isShooting}
                onClick={startAutoShoot}
              >
                START
              </button>
            )}
          </div>
        </div>
      )}

      {/* PREVIEW */}
      {step === "preview" && (
        <div className="mainContent">
          {resultImage && (
            <img src={resultImage} className="preview" alt="result" />
          )}

          <div className="controls">
            {Object.entries(FILTERS).map(([key, f]) => (
              <button
                key={key}
                onClick={async () => {
                  setFilter(key);
                  await renderImage(selectedFrame);
                }}
                className={filter === key ? "active" : ""}
              >
                {f.name}
              </button>
            ))}
          </div>

          <div className="frames">
            {frames.map((f) => (
              <img
                key={f}
                src={f}
                className={selectedFrame === f ? "active" : ""}
                onClick={async () => {
                  setSelectedFrame(f);
                  await renderImage(f);
                }}
              />
            ))}
          </div>

          <button
            onClick={async () => {
              await renderImage(selectedFrame, true);
              setStep("result");
            }}
          >
            다운로드
          </button>
        </div>
      )}

      {/* RESULT */}
      {step === "result" && resultImage && (
        <div className="mainContent">
          <img src={resultImage} className="final" />

          <button onClick={shareLink}>링크 복사</button>
          <button onClick={shareWhatsApp}>WhatsApp</button>
          <button onClick={shareFacebook}>Facebook</button>

          <a href={resultImage} download>
            저장
          </a>

          <button onClick={() => window.location.reload()}>
            다시 촬영
          </button>
        </div>
      )}

      <canvas ref={canvasRef} style={{ display: "none" }} />

      <style jsx>{`
        .container {
          max-width: 480px;
          margin: 0 auto;
          background: #000;
          color: #fff;
          min-height: 100vh;
          padding: 20px;
        }

        .cameraContainer {
          width: 100%;
          aspect-ratio: 4/3;
          overflow: hidden;
          border-radius: 20px;
          background: #111;
        }

        .video {
          width: 100%;
          height: 100%;
          object-fit: cover;
          transform: scaleX(-1);
        }

        .btn-main,
        .btn-shoot {
          padding: 16px;
          background: #3b82f6;
          color: #fff;
          border: none;
          border-radius: 12px;
        }

        .preview {
          width: 100%;
          border-radius: 12px;
        }

        .final {
          width: 100%;
        }

        .count {
          position: absolute;
          font-size: 80px;
          text-align: center;
          width: 100%;
        }

        .flash {
          position: absolute;
          inset: 0;
          background: white;
        }
      `}</style>
    </div>
  );
}