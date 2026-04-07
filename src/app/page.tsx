"use client";

import { useRef, useState, useEffect, useCallback } from "react";

// ✅ 반복문을 사용하여 프레임 배열 자동 생성
const createFrameList = (path: string, prefix: string, count: number) => 
  Array.from({ length: count }, (_, i) => `${path}/${prefix}_${String(i + 1).padStart(2, '0')}.png`);

const FRAME_CATEGORIES = {
  BASIC: {
    name: "Standard",
    items: createFrameList("/frames/basic", "basic", 8)
  },
  GRADIENTS: {
    name: "Gradients",
    items: createFrameList("/frames/gradients", "grad", 7)
  },
  SPECIAL: {
    name: "Special",
    items: createFrameList("/frames/special", "special", 3)
  },
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
  // ✅ 'start' 단계를 추가하여 랜딩 페이지 구현
  const [step, setStep] = useState<"start" | "camera" | "preview" | "result">("start");
  const [photos, setPhotos] = useState<string[]>([]);
  
  const [currentCat, setCurrentCat] = useState<keyof typeof FRAME_CATEGORIES>("BASIC");
  const [selectedFrame, setSelectedFrame] = useState(FRAME_CATEGORIES.BASIC.items[0]);
  
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [isShooting, setIsShooting] = useState(false);
  const [flash, setFlash] = useState(false);

  const shutterSoundRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    shutterSoundRef.current = new Audio("/shutter.mp3");
  }, []);

  const startCamera = async () => {
    setStep("camera"); // 카메라 단계로 진입
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
      alert("카메라 권한을 허용해주세요!");
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
    new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new window.Image();
      img.src = src;
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error(`Failed to load image at ${src}`));
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

    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    try {
      const images = await Promise.all(photoList.map(loadImage));
      for (let i = 0; i < images.length; i++) {
        ctx.drawImage(images[i], LAYOUT.x * scale, LAYOUT.yList[i] * scale, LAYOUT.w * scale, LAYOUT.h * scale);
      }
      const frame = await loadImage(frameSrc);
      ctx.drawImage(frame, 0, 0, canvas.width, canvas.height);
      setResultImage(canvas.toDataURL("image/png"));
    } catch (e) { console.error(e); }
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
    if (photos.length === 4) renderImage(selectedFrame, photos);
  }, [photos, selectedFrame, renderImage]);

  return (
    <div className="container">
      {/* HEADER - 공통 상단 */}
      <header className="header">
        <h1 className="logo animate-pop" onClick={() => window.location.reload()}>SOYKKO <span>BOOTH</span></h1>
      </header>

      {/* 1. START LANDING PAGE (빼꼼 프레임 포함) */}
      {step === "start" && (
        <div className="landing-wrap animate-up">
          {/* 왼쪽 뺴꼼 프레임 */}
          <div className="peek-frame left">
            <img src={FRAME_CATEGORIES.BASIC.items[0]} alt="" />
          </div>
          {/* 오른쪽 뺴꼼 프레임 */}
          <div className="peek-frame right">
            <img src={FRAME_CATEGORIES.GRADIENTS.items[0]} alt="" />
          </div>

          <div className="hero-content">
            <div className="badge">NEW MOMENT</div>
            <h2>Capture your daily <br/>life in 4 cuts.</h2>
            <p>멕시코에서 가장 힙한 네컷 사진 찍기</p>
            <button className="btn-main pulse mt-20" onClick={startCamera}>
              4컷 사진 찍기 시작 📸
            </button>
          </div>
        </div>
      )}

      {/* 2. CAMERA */}
      {step === "camera" && (
        <div className="mainContent animate-up">
          <div className={`cameraCard shadow-card ${isShooting ? "shooting" : ""}`}>
            <video ref={videoRef} autoPlay playsInline muted className="video" />
            {countdown !== null && <div className="count-overlay">{countdown}</div>}
            {flash && <div className="flash-overlay" />}
          </div>
          <div className="actionArea">
            <div className="shutter-wrap">
              <button className="btn-shutter" disabled={isShooting} onClick={startAutoShoot}>
                {isShooting ? "" : "TAP"}
              </button>
              <p className="hint">버튼을 누르면 5초 간격으로 촬영됩니다</p>
            </div>
          </div>
        </div>
      )}

      {/* 3. PREVIEW & EDITOR */}
      {step === "preview" && (
        <div className="mainContent animate-up">
          <div className="editor-layout">
            <div className="photo-side">
              {resultImage && <img src={resultImage} className="preview-img shadow-card" alt="" />}
            </div>
            <div className="control-side">
              <section className="ctrl-section">
                <label>CATEGORY</label>
                <div className="cat-tabs">
                  {(Object.keys(FRAME_CATEGORIES) as Array<keyof typeof FRAME_CATEGORIES>).map((key) => (
                    <button key={key} className={`cat-btn ${currentCat === key ? "active" : ""}`}
                      onClick={() => {
                        setCurrentCat(key);
                        const firstFrame = FRAME_CATEGORIES[key].items[0];
                        setSelectedFrame(firstFrame);
                        renderImage(firstFrame, photos);
                      }}>
                      {FRAME_CATEGORIES[key].name}
                    </button>
                  ))}
                </div>
              </section>

              <section className="ctrl-section">
                <label>SELECT FRAME</label>
                <div className="frame-grid custom-scroll">
                  {FRAME_CATEGORIES[currentCat].items.map((f) => (
                    <div key={f} className={`frame-item ${selectedFrame === f ? "active" : ""}`}
                      onClick={() => { setSelectedFrame(f); renderImage(f, photos); }}>
                      <img src={f} className="f-thumb" alt="" />
                    </div>
                  ))}
                </div>
              </section>
            </div>
          </div>
          <button className="btn-main mt-auto shadow-blue" onClick={async () => {
            await renderImage(selectedFrame, photos, true);
            setStep("result");
          }}>
            DOWNLOAD READY
          </button>
        </div>
      )}

      {/* 4. RESULT */}
      {step === "result" && resultImage && (
        <div className="mainContent animate-up center">
          <img src={resultImage} className="final-img shadow-card" alt="Final Result" />
          <div className="footer-actions">
            <a href={resultImage} download="soykko_booth.png" className="btn-main deco-none text-center shadow-blue">이미지 저장하기</a>
            <button className="btn-sub" onClick={() => window.location.reload()}>다시 찍기</button>
          </div>
        </div>
      )}

      <canvas ref={canvasRef} style={{ display: "none" }} />

      <style jsx>{`
        /* --- Base Theme --- */
        :global(body) { background: #f8fafc; margin: 0; padding: 0; }
        
        .container {
          max-width: 450px;
          margin: 0 auto;
          background: #f8fafc; /* 밝은 배경 */
          color: #1e293b;
          min-height: 100vh;
          padding: 20px;
          font-family: 'Pretendard', sans-serif;
          display: flex;
          flex-direction: column;
          position: relative;
          overflow-x: hidden;
        }

        /* --- Header --- */
        .header { text-align: center; margin-bottom: 24px; padding-top: 10px; z-index: 10; }
        .logo { font-size: 1.4rem; font-weight: 900; cursor: pointer; color: #1e293b; }
        .logo span { color: #2563eb; }

        /* --- Landing Page --- */
        .landing-wrap { flex: 1; display: flex; flex-direction: column; justify-content: center; align-items: center; text-align: center; position: relative; }
        .hero-content h2 { font-size: 2.2rem; font-weight: 900; line-height: 1.2; margin: 15px 0; color: #0f172a; }
        .hero-content p { color: #64748b; font-weight: 500; }
        .badge { background: #dbeafe; color: #2563eb; padding: 6px 12px; border-radius: 20px; font-size: 0.7rem; font-weight: 800; }
        
        .peek-frame { position: absolute; width: 120px; opacity: 0.8; transition: 0.5s; z-index: 0; filter: drop-shadow(0 10px 20px rgba(0,0,0,0.1)); }
        .peek-frame.left { left: -80px; top: 10%; transform: rotate(-15deg); }
        .peek-frame.right { right: -80px; bottom: 15%; transform: rotate(15deg); }
        .peek-frame img { width: 100%; border-radius: 4px; }
        .landing-wrap:hover .peek-frame.left { left: -60px; }
        .landing-wrap:hover .peek-frame.right { right: -60px; }

        /* --- Components --- */
        .mainContent { display: flex; flex-direction: column; flex: 1; gap: 24px; position: relative; z-index: 1; }
        .cameraCard { width: 100%; aspect-ratio: 4/3; border-radius: 28px; overflow: hidden; position: relative; background: #e2e8f0; border: 4px solid #fff; }
        .cameraCard.shooting { border-color: #2563eb; }
        .video { width: 100%; height: 100%; object-fit: cover; transform: scaleX(-1); }
        .flash-overlay { position: absolute; inset: 0; background: #fff; z-index: 20; }
        .count-overlay { position: absolute; inset: 0; display: flex; justify-content: center; align-items: center; font-size: 100px; font-weight: 900; color: #fff; text-shadow: 0 4px 20px rgba(0,0,0,0.2); z-index: 10; }

        /* --- Buttons --- */
        .btn-main { width: 100%; padding: 20px; background: #2563eb; color: #fff; border-radius: 20px; font-weight: 800; border: none; font-size: 1.05rem; cursor: pointer; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); }
        .btn-main:active { transform: scale(0.96); }
        .btn-sub { width: 100%; padding: 18px; background: #fff; color: #64748b; border: 1px solid #e2e8f0; border-radius: 20px; font-weight: 700; cursor: pointer; }
        
        .btn-shutter { width: 84px; height: 84px; border-radius: 50%; border: 8px solid #e2e8f0; background: #2563eb; color: #fff; font-weight: 900; font-size: 0.8rem; cursor: pointer; box-shadow: 0 10px 20px rgba(37, 99, 235, 0.2); }
        .shutter-wrap { display: flex; flex-direction: column; align-items: center; gap: 12px; margin-top: 10px; }
        .hint { font-size: 0.8rem; color: #94a3b8; font-weight: 600; }

        /* --- Editor --- */
        .editor-layout { display: flex; gap: 20px; }
        .preview-img { width: 140px; border-radius: 8px; background: #fff; padding: 4px; border: 1px solid #e2e8f0; }
        .control-side { flex: 1; display: flex; flex-direction: column; gap: 20px; }
        .ctrl-section label { display: block; font-size: 0.7rem; font-weight: 800; color: #94a3b8; margin-bottom: 10px; letter-spacing: 1px; }

        .cat-tabs { display: flex; gap: 6px; flex-wrap: wrap; }
        .cat-btn { background: #fff; border: 1px solid #e2e8f0; color: #64748b; padding: 8px 12px; border-radius: 12px; font-size: 0.75rem; font-weight: 700; cursor: pointer; }
        .cat-btn.active { background: #2563eb; color: #fff; border-color: #2563eb; box-shadow: 0 4px 12px rgba(37,99,235,0.2); }

        .frame-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; max-height: 280px; overflow-y: auto; padding-right: 5px; }
        .frame-item { aspect-ratio: 2/3; border-radius: 10px; overflow: hidden; border: 3px solid transparent; cursor: pointer; transition: 0.2s; background: #eee; }
        .frame-item.active { border-color: #2563eb; transform: translateY(-4px); box-shadow: 0 10px 15px rgba(0,0,0,0.1); }
        .f-thumb { width: 100%; height: 100%; object-fit: cover; }

        /* --- Utilities --- */
        .shadow-card { box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.05), 0 10px 10px -5px rgba(0, 0, 0, 0.02); }
        .shadow-blue { box-shadow: 0 10px 20px rgba(37, 99, 235, 0.2); }
        .center { align-items: center; text-align: center; }
        .final-img { width: 220px; border-radius: 8px; background: #fff; padding: 5px; margin-bottom: 20px; }
        .mt-20 { margin-top: 20px; }
        .mt-auto { margin-top: auto; }
        .custom-scroll::-webkit-scrollbar { width: 4px; }
        .custom-scroll::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }

        /* --- Animations --- */
        .animate-up { animation: slideUp 0.8s cubic-bezier(0.16, 1, 0.3, 1); }
        .animate-pop { animation: pop 0.4s cubic-bezier(0.17, 0.67, 0.83, 0.67); }
        @keyframes slideUp { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes pop { from { transform: scale(0.95); opacity: 0; } to { transform: scale(1); opacity: 1; } }
        .pulse { animation: pulse-shadow 2s infinite; }
        @keyframes pulse-shadow { 
          0% { box-shadow: 0 0 0 0 rgba(37, 99, 235, 0.4); } 
          70% { box-shadow: 0 0 0 20px rgba(37, 99, 235, 0); } 
          100% { box-shadow: 0 0 0 0 rgba(37, 99, 235, 0); } 
        }
      `}</style>
    </div>
  );
}