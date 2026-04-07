"use client";

import { useRef, useState, useEffect, useCallback } from "react";

// ✅ 반복문을 사용하여 프레임 배열 자동 생성
const createFrameList = (path: string, prefix: string, count: number) => 
  Array.from({ length: count }, (_, i) => `${path}/${prefix}_${String(i + 1).padStart(2, '0')}.png`);

const FRAME_CATEGORIES = {
  BASIC: {
    name: "Standard",
    items: createFrameList("/frames/basic", "basic", 4)
  },
  CUTE: {
    name: "Cute",
    items: createFrameList("/frames/cute", "cute", 4)
  },
  SPECIAL: {
    name: "Special",
    items: createFrameList("/frames/special", "special", 3)
  },
};

// ✅ 필터 프리셋 정의 (뽀샤시, 웜톤, 쿨톤, 흑백)
const FILTERS = [
  { name: "Original", value: "none" },
  { name: "Bright", value: "brightness(1.1) contrast(1.1) saturate(1.1)" }, // 뽀샤시
  { name: "Warm", value: "sepia(20%) saturate(140%) hue-rotate(-10deg)" }, // 웜톤
  {  name: "Cool", 
  value: "brightness(1.05) contrast(1.05) saturate(1.05) hue-rotate(8deg)" }, // 쿨톤
  { name: "B&W", value: "grayscale(100%)" }, // 흑백
];

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
  const [step, setStep] = useState<"start" | "camera" | "preview" | "result">("start");
  const [photos, setPhotos] = useState<string[]>([]);
  
  const [currentCat, setCurrentCat] = useState<keyof typeof FRAME_CATEGORIES>("BASIC");
  const [selectedFrame, setSelectedFrame] = useState(FRAME_CATEGORIES.BASIC.items[0]);
  
  // ✅ 필터 상태 추가
  const [selectedFilter, setSelectedFilter] = useState(FILTERS[0].value);
  
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [isShooting, setIsShooting] = useState(false);
  const [flash, setFlash] = useState(false);

  const shutterSoundRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    shutterSoundRef.current = new Audio("/shutter.mp3");
  }, []);

  const startCamera = async () => {
    setStep("camera");
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
    isDownload = false,
    filterVal: string = selectedFilter // ✅ 필터 값 매개변수 추가
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
      
      // ✅ 사진에만 필터 적용
      ctx.filter = filterVal;
      for (let i = 0; i < images.length; i++) {
        ctx.drawImage(images[i], LAYOUT.x * scale, LAYOUT.yList[i] * scale, LAYOUT.w * scale, LAYOUT.h * scale);
      }
      
      // ✅ 프레임 그리기 전 필터 해제 (프레임 원색 보존)
      ctx.filter = "none";
      const frame = await loadImage(frameSrc);
      ctx.drawImage(frame, 0, 0, canvas.width, canvas.height);
      
      setResultImage(canvas.toDataURL("image/png"));
    } catch (e) { console.error(e); }
  }, [photos, selectedFilter]);

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
    if (photos.length === 4) renderImage(selectedFrame, photos, false, selectedFilter);
  }, [photos, selectedFrame, selectedFilter, renderImage]);

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
  {/* HEADER - 공통 상단 */}
  <header className="header">
    <h1 className="logo animate-pop" onClick={() => window.location.reload()} style={{ cursor: 'pointer' }}>
      <img 
        src="/snapi.png" // public 폴더에 넣은 파일명과 확장자를 정확히 입력하세요.
        alt="snapi" 
        style={{ 
          height: '60px', // 헤더 높이에 맞춰 조정 (필요시 수정)
          width: 'auto', 
          display: 'inline-block',
          transform: 'translateY(50px)',
          verticalAlign: 'middle'
        }} 
      />
    </h1>
      </header>

      {/* 1. START LANDING PAGE */}
      {step === "start" && (
        <div className="landing-wrap animate-up">
          <div className="peek-frame left">
            <img src={FRAME_CATEGORIES.CUTE.items[0]} alt="" />
          </div>
          <div className="peek-frame right">
            <img src={FRAME_CATEGORIES.SPECIAL.items[0]} alt="" />
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
              {/* ✅ 필터 섹션 추가 */}
              <section className="ctrl-section">
                <label>FILTER</label>
                <div className="filter-grid">
                  {FILTERS.map((f) => (
                    <button 
                      key={f.name} 
                      className={`filter-btn ${selectedFilter === f.value ? "active" : ""}`}
                      onClick={() => setSelectedFilter(f.value)}
                    >
                      {f.name}
                    </button>
                  ))}
                </div>
              </section>

              <section className="ctrl-section">
                <label>CATEGORY</label>
                <div className="cat-tabs">
                  {(Object.keys(FRAME_CATEGORIES) as Array<keyof typeof FRAME_CATEGORIES>).map((key) => (
                    <button key={key} className={`cat-btn ${currentCat === key ? "active" : ""}`}
                      onClick={() => {
                        setCurrentCat(key);
                        const firstFrame = FRAME_CATEGORIES[key].items[0];
                        setSelectedFrame(firstFrame);
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
                      onClick={() => setSelectedFrame(f)}>
                      <img src={f} className="f-thumb" alt="" />
                    </div>
                  ))}
                </div>
              </section>
            </div>
          </div>
          <button className="btn-main mt-auto shadow-blue" onClick={async () => {
            await renderImage(selectedFrame, photos, true, selectedFilter);
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
          
          <div className="share-panel">
            <p className="share-label">SHARE MOMENT</p>
            <div className="share-btns">
              <button onClick={shareLink} className="s-btn">LINK</button>
              <button onClick={shareWhatsApp} className="s-btn wa">WA</button>
              <button onClick={shareFacebook} className="s-btn fb">FB</button>
            </div>
          </div>

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
        .container { max-width: 450px; margin: 0 auto; background: #f8fafc; color: #1e293b; min-height: 100vh; padding: 20px; font-family: 'Pretendard', sans-serif; display: flex; flex-direction: column; position: relative; overflow-x: hidden; }

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

        /* --- Components --- */
        .mainContent { display: flex; flex-direction: column; flex: 1; gap: 24px; position: relative; z-index: 1; }
        .cameraCard { width: 100%; aspect-ratio: 4/3; border-radius: 28px; overflow: hidden; position: relative; background: #e2e8f0; border: 4px solid #fff; }
        .cameraCard.shooting { border-color: #2563eb; }
        .video { width: 100%; height: 100%; object-fit: cover; transform: scaleX(-1); }
        .flash-overlay { position: absolute; inset: 0; background: #fff; z-index: 20; }
        .count-overlay { position: absolute; inset: 0; display: flex; justify-content: center; align-items: center; font-size: 100px; font-weight: 900; color: #fff; text-shadow: 0 4px 20px rgba(0,0,0,0.2); z-index: 10; }

        /* --- Buttons --- */
        .btn-main { width: 100%; padding: 20px; background: #2563eb; color: #fff; border-radius: 20px; font-weight: 800; border: none; font-size: 1.05rem; cursor: pointer; transition: 0.3s; }
        .btn-sub { width: 100%; padding: 18px; background: #fff; color: #64748b; border: 1px solid #e2e8f0; border-radius: 20px; font-weight: 700; cursor: pointer; }
        .btn-shutter { width: 84px; height: 84px; border-radius: 50%; border: 8px solid #e2e8f0; background: #2563eb; color: #fff; font-weight: 900; cursor: pointer; }
        .shutter-wrap { display: flex; flex-direction: column; align-items: center; gap: 12px; }
        .hint { font-size: 0.8rem; color: #94a3b8; font-weight: 600; }

        /* --- Editor --- */
        .editor-layout { display: flex; gap: 15px; }
        .preview-img { width: 130px; border-radius: 8px; background: #fff; padding: 4px; border: 1px solid #e2e8f0; }
        .control-side { flex: 1; display: flex; flex-direction: column; gap: 15px; }
        .ctrl-section label { display: block; font-size: 0.65rem; font-weight: 800; color: #94a3b8; margin-bottom: 8px; letter-spacing: 1px; }

        /* ✅ 필터 그리드 스타일 추가 */
        .filter-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 5px; }
        .filter-btn { padding: 6px 2px; background: #fff; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 0.65rem; font-weight: 700; color: #64748b; cursor: pointer; transition: 0.2s; }
        .filter-btn.active { background: #2563eb; color: #fff; border-color: #2563eb; }

        .cat-tabs { display: flex; gap: 4px; flex-wrap: wrap; }
        .cat-btn { background: #fff; border: 1px solid #e2e8f0; color: #64748b; padding: 6px 10px; border-radius: 10px; font-size: 0.7rem; font-weight: 700; cursor: pointer; }
        .cat-btn.active { background: #2563eb; color: #fff; }

        .frame-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; max-height: 200px; overflow-y: auto; padding-right: 5px; }
        .frame-item { aspect-ratio: 2/3; border-radius: 8px; border: 3px solid transparent; cursor: pointer; background: #eee; }
        .frame-item.active { border-color: #2563eb; }
        .f-thumb { width: 100%; height: 100%; object-fit: cover; }

        /* --- Share Panel --- */
        .share-panel { width: 100%; background: #fff; border-radius: 20px; padding: 18px; border: 1px solid #e2e8f0; margin-bottom: 12px; }
        .share-label { font-size: 0.7rem; font-weight: 800; color: #94a3b8; margin-bottom: 12px; text-align: center; }
        .share-btns { display: flex; gap: 8px; }
        .s-btn { flex: 1; padding: 12px; background: #f1f5f9; border: none; border-radius: 14px; color: #475569; font-weight: 800; font-size: 0.75rem; cursor: pointer; }
        .s-btn.wa { background: #25D366; color: #fff; }
        .s-btn.fb { background: #1877F2; color: #fff; }

        /* --- Utilities --- */
        .shadow-card { box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1); }
        .shadow-blue { box-shadow: 0 10px 20px rgba(37, 99, 235, 0.2); }
        .center { align-items: center; text-align: center; }
        .final-img { width: 200px; border-radius: 8px; background: #fff; padding: 5px; margin-bottom: 15px; }
        .deco-none { text-decoration: none; }
        .custom-scroll::-webkit-scrollbar { width: 3px; }
        .custom-scroll::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }

        /* --- Animations --- */
        .animate-up { animation: slideUp 0.8s cubic-bezier(0.16, 1, 0.3, 1); }
        .animate-pop { animation: pop 0.4s cubic-bezier(0.17, 0.67, 0.83, 0.67); }
        @keyframes slideUp { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes pop { from { transform: scale(0.95); opacity: 0; } to { transform: scale(1); opacity: 1; } }
        .pulse { animation: pulse-shadow 2s infinite; }
        @keyframes pulse-shadow { 0% { box-shadow: 0 0 0 0 rgba(37, 99, 235, 0.4); } 70% { box-shadow: 0 0 0 20px rgba(37, 99, 235, 0); } 100% { box-shadow: 0 0 0 0 rgba(37, 99, 235, 0); } }
      `}</style>
    </div>
  );
}