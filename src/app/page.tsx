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

  const shutterSoundRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    shutterSoundRef.current = new Audio("/shutter.mp3");
  }, []);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" },
        audio: false,
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

  // ✅ 핵심 수정: 비율 안깨지게 crop (cover 방식)
  const capture = () => {
    if (!videoRef.current) return null;

    const video = videoRef.current;
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    const vw = video.videoWidth;
    const vh = video.videoHeight;

    const outW = LAYOUT.w;
    const outH = LAYOUT.h;

    canvas.width = outW;
    canvas.height = outH;

    const videoRatio = vw / vh;
    const canvasRatio = outW / outH;

    let sx = 0,
      sy = 0,
      sw = vw,
      sh = vh;

    if (videoRatio > canvasRatio) {
      sw = vh * canvasRatio;
      sx = (vw - sw) / 2;
    } else {
      sh = vw / canvasRatio;
      sy = (vh - sh) / 2;
    }

    ctx.translate(outW, 0);
    ctx.scale(-1, 1);

    ctx.drawImage(video, sx, sy, sw, sh, 0, 0, outW, outH);

    return canvas.toDataURL("image/png");
  };

  const loadImage = (src: string) =>
    new Promise<HTMLImageElement>((resolve) => {
      const img = new window.Image();
      img.src = src;
      img.onload = () => resolve(img);
    });

  const renderImage = async (
    frameSrc: string,
    photoList: string[] = photos,
    filterKey: string = filter,
    isDownload = false
  ) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const scale = isDownload ? 2 : 1;

    canvas.width = LAYOUT.canvasW * scale;
    canvas.height = LAYOUT.canvasH * scale;

    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const images = await Promise.all(photoList.map(loadImage));

    images.forEach((img, i) => {
      ctx.filter = FILTERS[filterKey].value;
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
      setTimeout(() => setFlash(false), 120);

      shutterSoundRef.current?.play().catch(() => {});

      const img = capture();
      if (img) temp.push(img);

      await new Promise((r) => setTimeout(r, 400));
    }

    setPhotos(temp);
    setIsShooting(false);
    setStep("preview");
  };

  useEffect(() => {
    if (photos.length === 4) {
      renderImage(selectedFrame, photos, filter);
    }
  }, [photos]);

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
            <video ref={videoRef} autoPlay playsInline muted className="video" />

            {countdown !== null && (
              <div className="count">{countdown}</div>
            )}

            {flash && <div className="flash" />}
          </div>

          <div className="actionArea">
            {!streaming ? (
              <button className="btn-main" onClick={startCamera}>
                카메라 연결
              </button>
            ) : (
              <button className="btn-shoot" onClick={startAutoShoot}>
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
            <img src={resultImage} className="preview" alt="" />
          )}

          <div className="panel">
            <div className="section">
              <p>FILTER</p>
              <div className="row">
                {Object.entries(FILTERS).map(([k, v]) => (
                  <button
                    key={k}
                    className={filter === k ? "active" : ""}
                    onClick={() => {
                      setFilter(k);
                      renderImage(selectedFrame, photos, k);
                    }}
                  >
                    {v.name}
                  </button>
                ))}
              </div>
            </div>

            <div className="section">
              <p>FRAME</p>
              {frames.map((f) => (
                <img
                  key={f}
                  src={f}
                  className={selectedFrame === f ? "f active" : "f"}
                  onClick={() => {
                    setSelectedFrame(f);
                    renderImage(f, photos, filter);
                  }}
                />
              ))}
            </div>
          </div>

          <button
            className="btn-main"
            onClick={async () => {
              await renderImage(selectedFrame, photos, filter, true);
              setStep("result");
            }}
          >
            DOWNLOAD
          </button>
        </div>
      )}

      {/* RESULT */}
      {step === "result" && resultImage && (
        <div className="mainContent">
          <img src={resultImage} className="preview" />

          <button onClick={shareLink}>LINK</button>
          <button onClick={shareWhatsApp}>WA</button>
          <button onClick={shareFacebook}>FB</button>

          <a href={resultImage} download>
            SAVE
          </a>

          <button onClick={() => window.location.reload()}>
            RETRY
          </button>
        </div>
      )}

      <canvas ref={canvasRef} style={{ display: "none" }} />

      <style jsx>{`
        .container {
          max-width: 480px;
          margin: 0 auto;
          background: #000;
          color: white;
          min-height: 100vh;
          padding: 20px;
        }

        .cameraContainer {
          width: 100%;
          height: 60vh;
          overflow: hidden;
          border-radius: 20px;
          position: relative;
        }

        .video {
          width: 100%;
          height: 100%;
          object-fit: cover;
          transform: scaleX(-1);
        }

        .count {
          position: absolute;
          inset: 0;
          display: flex;
          justify-content: center;
          align-items: center;
          font-size: 80px;
        }

        .flash {
          position: absolute;
          inset: 0;
          background: white;
          opacity: 0.8;
        }

        .preview {
          width: 100%;
          border-radius: 10px;
        }

        .f {
          width: 50px;
          opacity: 0.4;
        }

        .f.active {
          opacity: 1;
          border: 2px solid blue;
        }

        .btn-main {
          width: 100%;
          padding: 16px;
          background: blue;
          color: white;
          border-radius: 12px;
        }

        .btn-shoot {
          width: 80px;
          height: 80px;
          border-radius: 50%;
          background: white;
          color: black;
        }
      `}</style>
    </div>
  );
}