"use client";

import { useRef, useState, useEffect, useCallback } from "react";

const frames = [
  "/frames/frame1.png",
  "/frames/frame2.png",
  "/frames/frame3.png",
];

// 필터 로직 제거를 위해 기본값만 유지
const DEFAULT_FILTER = "none";

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

  const shutterSoundRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    shutterSoundRef.current = new Audio("/shutter.mp3");
  }, []);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", aspectRatio: 4 / 3 },
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
    const targetRatio = outW / outH;

    let sx = 0, sy = 0, sw = vw, sh = vh;

    if (videoRatio > targetRatio) {
      sw = vh * targetRatio;
      sx = (vw - sw) / 2;
    } else {
      sh = vw / targetRatio;
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

  const renderImage = useCallback(async (
    frameSrc: string,
    photoList: string[] = photos,
    isDownload = false
  ) => {
    const canvas = canvasRef.current;
    if (!canvas || photoList.length < 4) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const scale = isDownload ? 2 : 1;
    canvas.width = LAYOUT.canvasW * scale;
    canvas.height = LAYOUT.canvasH * scale;

    ctx.filter = "none";
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const images = await Promise.all(photoList.map(loadImage));

    for (let i = 0; i < images.length; i++) {
      ctx.drawImage(
        images[i],
        LAYOUT.x * scale,
        LAYOUT.yList[i] * scale,
        LAYOUT.w * scale,
        LAYOUT.h * scale
      );
    }

    const frame = await loadImage(frameSrc);
    ctx.drawImage(frame, 0, 0, canvas.width, canvas.height);

    const final = canvas.toDataURL("image/png");
    setResultImage(final);
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
      renderImage(selectedFrame, photos);
    }
  }, [photos, selectedFrame, renderImage]);

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
        <div className="status-bar">
          <div className={`dot ${streaming ? 'active' : ''}`} />
          <span>{step.toUpperCase()} MODE</span>
        </div>
      </header>

      {/* CAMERA */}
      {step === "camera" && (
        <div className="mainContent animate-up">
          <div className={`cameraContainer shadow-neon ${isShooting ? "shooting" : ""}`}>
            <video ref={videoRef} autoPlay playsInline muted className="video" />
            {countdown !== null && <div className="count-overlay">{countdown}</div>}
            {flash && <div className="flash-overlay" />}
            <div className="corner-tl" /><div className="corner-tr" />
            <div className="corner-bl" /><div className="corner-br" />
          </div>
          
          {/* ✅ 버튼 위치 상향 조정 */}
          <div className="actionArea cameraMode">
            {!streaming ? (
              <button className="btn-main pulse" onClick={startCamera}>카메라 연결하기</button>
            ) : (
              <div className="shutter-wrap">
                <button className="btn-shutter" disabled={isShooting} onClick={startAutoShoot}>
                  {isShooting ? "" : "PUSH"}
                </button>
                <p className="hint">버튼을 누르면 4컷 촬영이 시작됩니다</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* PREVIEW */}
      {step === "preview" && (
        <div className="mainContent animate-up">
          <div className="editor-layout">
            <div className="photo-side">
              {resultImage && <img src={resultImage} className="preview-img shadow-lg" alt="" />}
            </div>
            <div className="control-side">
              <section className="ctrl-section">
                <label>FRAME SELECT</label>
                <div className="frame-grid">
                  {frames.map((f) => (
                    <div 
                      key={f} 
                      className={`frame-item ${selectedFrame === f ? "active" : ""}`}
                      onClick={() => { setSelectedFrame(f); renderImage(f, photos); }}
                    >
                      <img src={f} className="f-thumb" />
                    </div>
                  ))}
                </div>
              </section>
            </div>
          </div>
          <button className="btn-main mt-auto" onClick={async () => {
            await renderImage(selectedFrame, photos, true);
            setStep("result");
          }}>
            DOWNLOAD READY
          </button>
        </div>
      )}

      {/* RESULT */}
      {step === "result" && resultImage && (
        <div className="mainContent animate-up">
          <img src={resultImage} className="final-img shadow-neon" alt="Final Result" />
          <div className="share-panel">
            <p className="share-label">SHARE MOMENT</p>
            <div className="share-btns">
              <button onClick={shareLink} className="s-btn">LINK</button>
              <button onClick={shareWhatsApp} className="s-btn wa">WA</button>
              <button onClick={shareFacebook} className="s-btn fb">FB</button>
            </div>
          </div>
          <div className="footer-actions">
            <a href={resultImage} download="soykko_booth.png" className="btn-main deco-none text-center">이미지 저장</a>
            <button className="btn-sub" onClick={() => window.location.reload()}>다시 촬영하기</button>
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
          padding: 20px;
          font-family: 'Pretendard', -apple-system, BlinkMacSystemFont, system-ui, Roboto, sans-serif;
          display: flex;
          flex-direction: column;
        }

        .header { text-align: center; margin-bottom: 20px; }
        .logo { font-size: 1.5rem; font-weight: 900; letter-spacing: -1px; margin-bottom: 8px; }
        .logo span { color: #2563eb; }
        .status-bar { display: flex; align-items: center; justify-content: center; gap: 6px; font-size: 0.65rem; color: #555; font-weight: 800; }
        .dot { width: 6px; height: 6px; border-radius: 50%; background: #222; }
        .dot.active { background: #2563eb; box-shadow: 0 0 8px #2563eb; }

        .mainContent { display: flex; flex-direction: column; flex: 1; gap: 20px; }

        .cameraContainer {
          width: 100%;
          aspect-ratio: 4 / 3;
          overflow: hidden;
          border-radius: 24px;
          position: relative;
          background: #111;
          border: 1px solid #222;
        }
        .cameraContainer.shooting { border-color: #2563eb; }
        .video { width: 100%; height: 100%; object-fit: cover; transform: scaleX(-1); }
        .count-overlay { position: absolute; inset: 0; display: flex; justify-content: center; align-items: center; font-size: 120px; font-weight: 900; z-index: 10; color: #fff; text-shadow: 0 0 30px rgba(0,0,0,0.5); }
        .flash-overlay { position: absolute; inset: 0; background: #fff; z-index: 20; }
        
        [class^="corner-"] { position: absolute; width: 20px; height: 20px; border: 2px solid #333; z-index: 5; }
        .corner-tl { top: 20px; left: 20px; border-right: 0; border-bottom: 0; }
        .corner-tr { top: 20px; right: 20px; border-left: 0; border-bottom: 0; }
        .corner-bl { bottom: 20px; left: 20px; border-right: 0; border-top: 0; }
        .corner-br { bottom: 20px; right: 20px; border-left: 0; border-top: 0; }

        /* ✅ 버튼 위치 상향 조정: margin-top을 줄여서 위로 올림 */
        .actionArea { text-align: center; margin-top: 10px; padding-bottom: 20px; }
        .actionArea.cameraMode { margin-top: 20px; }

        .btn-main { width: 100%; padding: 20px; background: #2563eb; color: #fff; border-radius: 18px; font-weight: 800; border: none; font-size: 1rem; cursor: pointer; transition: 0.2s; }
        .btn-sub { width: 100%; padding: 18px; background: transparent; color: #555; border: 1px solid #222; border-radius: 18px; font-weight: 700; cursor: pointer; }
        
        .shutter-wrap { display: flex; flex-direction: column; align-items: center; gap: 12px; }
        .btn-shutter { width: 80px; height: 80px; border-radius: 50%; border: 6px solid #222; background: #fff; color: #000; font-weight: 900; font-size: 0.7rem; cursor: pointer; }
        .hint { font-size: 0.75rem; color: #444; font-weight: 500; }

        .editor-layout { display: flex; gap: 20px; align-items: flex-start; }
        .preview-img { width: 180px; border-radius: 4px; border: 1px solid #222; }
        .final-img { width: 240px; align-self: center; border-radius: 4px; }
        
        .control-side { flex: 1; display: flex; flex-direction: column; gap: 20px; }
        .ctrl-section label { display: block; font-size: 0.65rem; font-weight: 800; color: #2563eb; margin-bottom: 12px; letter-spacing: 1px; }

        .frame-grid { display: flex; flex-direction: column; gap: 10px; }
        .frame-item { width: 60px; height: 90px; border-radius: 6px; overflow: hidden; border: 2px solid transparent; opacity: 0.3; cursor: pointer; }
        .frame-item.active { opacity: 1; border-color: #2563eb; transform: scale(1.05); }
        .f-thumb { width: 100%; height: 100%; object-fit: cover; }

        .share-panel { background: #111; border-radius: 20px; padding: 20px; text-align: center; }
        .share-label { font-size: 0.65rem; font-weight: 800; color: #444; margin-bottom: 15px; }
        .share-btns { display: flex; gap: 10px; }
        .s-btn { flex: 1; padding: 12px; background: #222; border: none; border-radius: 12px; color: #fff; font-weight: 700; font-size: 0.75rem; cursor: pointer; }
        .s-btn.wa { background: #25D366; }
        .s-btn.fb { background: #1877F2; }

        .footer-actions { display: flex; flex-direction: column; gap: 12px; width: 100%; margin-top: auto; }
        .deco-none { text-decoration: none; }
        .shadow-neon { box-shadow: 0 0 20px rgba(37, 99, 235, 0.1); }
        .animate-up { animation: slideUp 0.6s cubic-bezier(0.16, 1, 0.3, 1); }
        .animate-pop { animation: pop 0.4s cubic-bezier(0.17, 0.67, 0.83, 0.67); }
        @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes pop { from { transform: scale(0.9); opacity: 0; } to { transform: scale(1); opacity: 1; } }
        .pulse { animation: pulse-shadow 2s infinite; }
        @keyframes pulse-shadow { 0% { box-shadow: 0 0 0 0 rgba(37, 99, 235, 0.4); } 70% { box-shadow: 0 0 0 15px rgba(37, 99, 235, 0); } 100% { box-shadow: 0 0 0 0 rgba(37, 99, 235, 0); } }
        .mt-auto { margin-top: auto; }
      `}</style>
    </div>
  );
}