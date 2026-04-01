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

  const shutterSound = typeof window !== "undefined" ? new Audio("/shutter.mp3") : null;

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" },
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        setStreaming(true);
      }
    } catch {
      alert("카메라를 켤 수 없습니다.");
    }
  };

  const capture = () => {
    if (!videoRef.current) return null;
    const video = videoRef.current;
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const width = LAYOUT.w;
    const height = LAYOUT.h;
    canvas.width = width;
    canvas.height = height;
    if (!ctx) return null;
    ctx.translate(width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0, width, height);
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
    const ctx = canvas.getContext("2d") as CanvasRenderingContext2D;
    if (!ctx) return;
    const scale = isDownload ? 2 : 1;
    canvas.width = LAYOUT.canvasW * scale;
    canvas.height = LAYOUT.canvasH * scale;
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    const images = await Promise.all(photos.map(loadImage));
    images.forEach((img, i) => {
      ctx.filter = FILTERS[filter].value;
      ctx.drawImage(img, LAYOUT.x * scale, LAYOUT.yList[i] * scale, LAYOUT.w * scale, LAYOUT.h * scale);
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
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${url}`, "_blank");
  };

  return (
    <div className="container">
      <header className="header">
        <h1 className="logo animate-fade">SOYKKO <span>BOOTH</span></h1>
      </header>

      {/* 📸 CAMERA STEP */}
      {step === "camera" && (
        <div className="mainContent animate-up">
          <div className={`cameraContainer ${isShooting ? 'active-shoot' : ''}`}>
            <video ref={videoRef} autoPlay muted playsInline className="video" />
            {countdown !== null && <div className="count">{countdown}</div>}
            {flash && <div className="flash" />}
          </div>

          <div className="actionArea">
            {!streaming ? (
              <button className="btn-main pulse" onClick={startCamera}>카메라 연결하기</button>
            ) : (
              <button 
                className="btn-shoot-circle" 
                disabled={isShooting} 
                onClick={startAutoShoot}
              >
                {isShooting ? "..." : "START"}
              </button>
            )}
            <p className="hint-text">{isShooting ? "촬영 중입니다. 카메라를 봐주세요!" : "버튼을 누르면 5초 간격으로 4번 촬영합니다."}</p>
          </div>
        </div>
      )}

      {/* 🖼 PREVIEW STEP */}
      {step === "preview" && (
        <div className="mainContent animate-up">
          <div className="result-layout">
            {resultImage && <img src={resultImage} className="display-photo shadow-xl" alt="result" />}
            
            <div className="edit-controls">
              <section className="control-section">
                <label>FILTERS</label>
                <div className="filter-chips">
                  {Object.entries(FILTERS).map(([key, f]) => (
                    <button
                      key={key}
                      className={filter === key ? "chip active" : "chip"}
                      onClick={async () => {
                        setFilter(key);
                        await renderImage(selectedFrame);
                      }}
                    >
                      {f.name}
                    </button>
                  ))}
                </div>
              </section>

              <section className="control-section">
                <label>FRAMES</label>
                <div className="frame-list">
                  {frames.map((f) => (
                    <div
                      key={f}
                      className={`frame-item ${selectedFrame === f ? "active" : ""}`}
                      onClick={async () => {
                        setSelectedFrame(f);
                        await renderImage(f);
                      }}
                    >
                      <img src={f} alt="frame-thumb" />
                    </div>
                  ))}
                </div>
              </section>
            </div>
          </div>

          <div className="footer-actions">
            <button className="btn-main w-full" onClick={async () => {
              await renderImage(selectedFrame, true);
              setStep("result");
            }}>완료 및 다운로드</button>
          </div>
        </div>
      )}

      {/* 💾 RESULT STEP */}
      {step === "result" && resultImage && (
        <div className="mainContent animate-up">
          <img src={resultImage} className="display-photo final" alt="final-result" />

          <div className="share-panel">
            <p className="share-title">SHARE WITH FRIENDS</p>
            <div className="share-buttons">
              <button onClick={shareLink} className="share-btn">Link</button>
              <button onClick={shareWhatsApp} className="share-btn wa">WhatsApp</button>
              <button onClick={shareFacebook} className="share-btn fb">Facebook</button>
            </div>
          </div>

          <div className="footer-actions vertical">
            <a href={resultImage} download="soykko_booth.png" className="btn-main w-full no-underline">이미지 저장하기</a>
            <button className="btn-sub w-full" onClick={() => window.location.reload()}>다시 촬영하기</button>
          </div>
        </div>
      )}

      <canvas ref={canvasRef} style={{ display: "none" }} />

      <style jsx>{`
        .container {
          max-width: 480px;
          margin: 0 auto;
          background: #09090b;
          color: #f4f4f5;
          min-height: 100vh;
          padding: 24px;
          font-family: 'Pretendard', -apple-system, sans-serif;
        }

        .header { padding-bottom: 32px; text-align: center; }
        .logo { font-size: 1.25rem; font-weight: 800; letter-spacing: -0.5px; opacity: 0.8; }
        .logo span { color: #3b82f6; }

        .mainContent { display: flex; flex-direction: column; align-items: center; gap: 24px; }

        /* 📸 Camera Section */
        .cameraContainer {
          position: relative;
          width: 100%;
          aspect-ratio: 4/3;
          background: #18181b;
          border-radius: 24px;
          overflow: hidden;
          border: 1px solid #27272a;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
        }
        .active-shoot { border: 2px solid #3b82f6; box-shadow: 0 0 20px rgba(59, 130, 246, 0.3); }

        .video { width: 100%; height: 100%; object-fit: cover; transform: scaleX(-1); }
        .count { position: absolute; inset: 0; display: flex; items: center; justify-content: center; font-size: 100px; font-weight: 900; color: white; text-shadow: 0 4px 20px rgba(0,0,0,0.4); z-index: 10; }
        .flash { position: absolute; inset: 0; background: white; z-index: 20; }

        .actionArea { display: flex; flex-direction: column; align-items: center; gap: 16px; width: 100%; }
        .btn-main { background: #3b82f6; color: white; border: none; padding: 16px 32px; border-radius: 16px; font-weight: 700; font-size: 1rem; cursor: pointer; transition: all 0.2s; }
        .btn-main:active { transform: scale(0.96); opacity: 0.9; }
        .no-underline { text-decoration: none; text-align: center; }

        .btn-shoot-circle {
          width: 80px; height: 80px; border-radius: 50%; background: white; color: black; border: 8px solid #27272a; font-weight: 900; font-size: 0.75rem; cursor: pointer; transition: all 0.2s;
        }
        .btn-shoot-circle:active { transform: scale(0.9); }
        .hint-text { font-size: 0.75rem; color: #71717a; text-align: center; }

        /* 🖼 Preview Section */
        .result-layout { display: flex; gap: 20px; align-items: flex-start; width: 100%; }
        .display-photo { width: 180px; border-radius: 4px; border: 1px solid #27272a; }
        .display-photo.final { width: 220px; }

        .edit-controls { flex: 1; display: flex; flex-direction: column; gap: 24px; }
        .control-section label { display: block; font-size: 0.7rem; font-weight: 800; color: #3b82f6; margin-bottom: 12px; letter-spacing: 1px; }

        .filter-chips { display: flex; flex-wrap: wrap; gap: 8px; }
        .chip { background: #18181b; border: 1px solid #27272a; color: #a1a1aa; padding: 6px 12px; border-radius: 99px; font-size: 0.75rem; cursor: pointer; }
        .chip.active { background: #3b82f6; color: white; border-color: #3b82f6; }

        .frame-list { display: flex; flex-direction: column; gap: 10px; }
        .frame-item { width: 50px; height: 70px; border-radius: 6px; overflow: hidden; border: 2px solid transparent; opacity: 0.4; cursor: pointer; transition: 0.2s; }
        .frame-item.active { border-color: #3b82f6; opacity: 1; transform: scale(1.05); }
        .frame-item img { width: 100%; height: 100%; object-fit: cover; }

        .footer-actions { width: 100%; margin-top: 20px; }
        .footer-actions.vertical { display: flex; flex-direction: column; gap: 12px; }
        .btn-sub { background: #18181b; color: #71717a; border: 1px solid #27272a; padding: 16px; border-radius: 16px; font-weight: 600; cursor: pointer; }

        /* 🔗 Share Section */
        .share-panel { width: 100%; background: #18181b; padding: 20px; border-radius: 20px; text-align: center; }
        .share-title { font-size: 0.65rem; font-weight: 800; color: #71717a; margin-bottom: 16px; }
        .share-buttons { display: flex; gap: 8px; }
        .share-btn { flex: 1; background: #27272a; border: none; color: white; padding: 12px; border-radius: 12px; font-size: 0.75rem; font-weight: 600; cursor: pointer; }
        .share-btn.wa { background: #25D366; color: white; }
        .share-btn.fb { background: #1877F2; color: white; }

        /* Animations */
        .animate-up { animation: slideUp 0.6s cubic-bezier(0.16, 1, 0.3, 1); }
        @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        .pulse { animation: pulse 2s infinite; }
        @keyframes pulse { 0% { box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.4); } 70% { box-shadow: 0 0 0 15px rgba(59, 130, 246, 0); } 100% { box-shadow: 0 0 0 0 rgba(59, 130, 246, 0); } }
        .w-full { width: 100%; }
      `}</style>
    </div>
  );
}