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
    let sx = 0, sy = 0, sw = vw, sh = vh;
    if (videoRatio > targetRatio) {
      sw = vh * targetRatio;
      sx = (vw - sw) / 2;
    } else {
      sh = vw / targetRatio;
      sy = (vh - sh) / 2;
    }
    canvas.width = targetW;
    canvas.height = targetH;
    ctx.translate(targetW, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, sx, sy, sw, sh, 0, 0, targetW, targetH);
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
        <h1 className="logo animate-pop">SOYKKO <span>BOOTH</span></h1>
        <p className="subtitle">Life's Best 4 Cuts</p>
      </header>

      {/* 📸 CAMERA STEP */}
      {step === "camera" && (
        <div className="mainContent animate-slide-up">
          <div className={`cameraBox ${isShooting ? "active-border" : ""}`}>
            <video ref={videoRef} autoPlay muted playsInline className="video" />
            {countdown !== null && <div className="count-overlay">{countdown}</div>}
            {flash && <div className="flash-white" />}
          </div>

          <div className="buttonArea">
            {!streaming ? (
              <button onClick={startCamera} className="btn-main pulse">
                카메라 켜기
              </button>
            ) : (
              <button
                className={`btn-shutter ${isShooting ? 'disabled' : ''}`}
                disabled={isShooting}
                onClick={startAutoShoot}
              >
                {isShooting ? "촬영 중" : "촬영 시작"}
              </button>
            )}
            <p className="guide-text">5초 간격으로 4번 자동 촬영됩니다.</p>
          </div>
        </div>
      )}

      {/* 🖼 PREVIEW STEP */}
      {step === "preview" && (
        <div className="mainContent animate-slide-up">
          <div className="preview-wrap">
            {resultImage && <img src={resultImage} className="preview-img" alt="result" />}
            
            <div className="editor-panel">
              <div className="edit-group">
                <label>FILTER</label>
                <div className="filter-grid">
                  {Object.entries(FILTERS).map(([key, f]) => (
                    <button
                      key={key}
                      onClick={async () => { setFilter(key); await renderImage(selectedFrame); }}
                      className={filter === key ? "filter-btn active" : "filter-btn"}
                    >
                      {f.name}
                    </button>
                  ))}
                </div>
              </div>

              <div className="edit-group mt-6">
                <label>FRAME</label>
                <div className="frame-grid">
                  {frames.map((f) => (
                    <div 
                      key={f} 
                      className={`frame-thumb ${selectedFrame === f ? "active" : ""}`}
                      onClick={async () => { setSelectedFrame(f); await renderImage(f); }}
                    >
                      <img src={f} alt="thumb" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <button className="btn-main mt-8 w-full" onClick={async () => {
            await renderImage(selectedFrame, true);
            setStep("result");
          }}>
            이대로 결정하기
          </button>
        </div>
      )}

      {/* 💾 RESULT STEP */}
      {step === "result" && resultImage && (
        <div className="mainContent animate-slide-up">
          <img src={resultImage} className="final-img shadow-2xl" alt="final" />

          <div className="share-card">
            <p className="card-label">친구에게 자랑하기</p>
            <div className="share-row">
              <button onClick={shareLink} className="icon-btn">🔗</button>
              <button onClick={shareWhatsApp} className="icon-btn wa">WA</button>
              <button onClick={shareFacebook} className="icon-btn fb">FB</button>
            </div>
          </div>

          <div className="footer-btns">
            <a href={resultImage} download className="btn-main no-deco">갤러리에 저장</a>
            <button onClick={() => window.location.reload()} className="btn-sub">다시 찍기</button>
          </div>
        </div>
      )}

      <canvas ref={canvasRef} style={{ display: "none" }} />

      <style jsx>{`
        .container {
          max-width: 450px;
          margin: 0 auto;
          background: #000;
          color: #fff;
          min-height: 100vh;
          padding: 24px 20px;
          font-family: -apple-system, system-ui, sans-serif;
        }

        .header { text-align: center; margin-bottom: 30px; }
        .logo { font-size: 1.4rem; font-weight: 900; letter-spacing: -1px; }
        .logo span { color: #3b82f6; }
        .subtitle { font-size: 0.7rem; color: #555; font-weight: 600; letter-spacing: 2px; text-transform: uppercase; margin-top: 4px; }

        /* 📸 Camera Design */
        .cameraBox {
          position: relative;
          width: 100%;
          aspect-ratio: 4/3;
          background: #111;
          border-radius: 24px;
          overflow: hidden;
          border: 1px solid #222;
        }
        .active-border { border: 2px solid #3b82f6; box-shadow: 0 0 20px rgba(59, 130, 246, 0.4); }
        .video { width: 100%; height: 100%; object-fit: cover; transform: scaleX(-1); }
        .count-overlay { position: absolute; inset: 0; display: flex; items: center; justify-content: center; font-size: 100px; font-weight: 900; z-index: 10; text-shadow: 0 0 20px rgba(0,0,0,0.5); }
        .flash-white { position: absolute; inset: 0; background: #fff; z-index: 20; }

        .buttonArea { margin-top: 40px; display: flex; flex-direction: column; align-items: center; gap: 16px; }
        .btn-main { background: #3b82f6; color: #fff; border: none; padding: 18px 30px; border-radius: 18px; font-weight: 800; font-size: 1rem; cursor: pointer; transition: 0.2s; }
        .btn-shutter { background: #fff; color: #000; border: none; padding: 22px 60px; border-radius: 50px; font-weight: 900; font-size: 1.1rem; cursor: pointer; }
        .guide-text { font-size: 0.75rem; color: #666; font-weight: 500; }

        /* 🖼 Preview/Result Design */
        .preview-wrap { display: flex; gap: 16px; align-items: flex-start; }
        .preview-img { width: 180px; border-radius: 4px; box-shadow: 0 20px 40px rgba(0,0,0,0.6); }
        .final-img { width: 240px; border-radius: 4px; margin-bottom: 30px; }

        .editor-panel { flex: 1; display: flex; flex-direction: column; }
        .edit-group label { display: block; font-size: 0.65rem; font-weight: 900; color: #3b82f6; margin-bottom: 10px; letter-spacing: 1px; }
        .filter-grid { display: flex; flex-wrap: wrap; gap: 8px; }
        .filter-btn { background: #1a1a1a; border: 1px solid #333; color: #888; padding: 8px 12px; border-radius: 10px; font-size: 0.75rem; font-weight: 700; cursor: pointer; }
        .filter-btn.active { background: #3b82f6; border-color: #3b82f6; color: #fff; }

        .frame-grid { display: flex; flex-direction: column; gap: 10px; }
        .frame-thumb { width: 50px; height: 75px; border-radius: 6px; border: 2px solid transparent; overflow: hidden; opacity: 0.4; cursor: pointer; transition: 0.2s; }
        .frame-thumb.active { border-color: #3b82f6; opacity: 1; transform: scale(1.05); }
        .frame-thumb img { width: 100%; height: 100%; object-fit: cover; }

        .share-card { background: #111; width: 100%; padding: 20px; border-radius: 20px; text-align: center; margin-bottom: 24px; }
        .card-label { font-size: 0.7rem; font-weight: 800; color: #555; margin-bottom: 16px; }
        .share-row { display: flex; justify-content: center; gap: 12px; }
        .icon-btn { width: 50px; height: 50px; border-radius: 15px; border: none; background: #222; color: #fff; font-weight: 800; cursor: pointer; font-size: 0.8rem; }
        .icon-btn.wa { background: #25D366; }
        .icon-btn.fb { background: #1877F2; }

        .footer-btns { width: 100%; display: flex; flex-direction: column; gap: 12px; }
        .btn-sub { background: #111; color: #555; border: 1px solid #222; padding: 18px; border-radius: 18px; font-weight: 700; cursor: pointer; }
        .no-deco { text-decoration: none; text-align: center; }

        /* Animations */
        .animate-pop { animation: pop 0.5s cubic-bezier(0.17, 0.67, 0.83, 0.67); }
        .animate-slide-up { animation: slideUp 0.6s ease-out; }
        @keyframes pop { from { transform: scale(0.8); opacity: 0; } to { transform: scale(1); opacity: 1; } }
        @keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        .pulse { animation: pulse 2s infinite; }
        @keyframes pulse { 0% { box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.4); } 70% { box-shadow: 0 0 0 15px rgba(59, 130, 246, 0); } 100% { box-shadow: 0 0 0 0 rgba(59, 130, 246, 0); } }
        .w-full { width: 100%; }
        .mt-6 { margin-top: 24px; }
        .mt-8 { margin-top: 32px; }
      `}</style>
    </div>
  );
}