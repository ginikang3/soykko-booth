  "use client";

  import { useRef, useState, useEffect, useCallback } from "react";

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

  const FILTERS = [
    { name: "Original", value: "none" },
    { name: "Bright", value: "brightness(1.1) contrast(1.1) saturate(1.1)" }, 
    { name: "Warm", value: "sepia(20%) saturate(140%) hue-rotate(-10deg)" }, 
    { name: "Cool", value: "brightness(1.05) contrast(1.05) saturate(1.05) hue-rotate(8deg)" }, 
    { name: "B&W", value: "grayscale(100%)" }, 
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
        img.crossOrigin = "anonymous"; 
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error(`Failed to load image at ${src}`));
      });

    

    const renderImage = useCallback(async (
      frameSrc: string,
      photoList: string[] = photos,
      isDownload = false,
      filterVal: string = selectedFilter 
    ) => {
      const canvas = canvasRef.current;
      if (!canvas || photoList.length < 4) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const scale = isDownload ? 2 : 1;
      canvas.width = LAYOUT.canvasW * scale;
      canvas.height = LAYOUT.canvasH * scale;

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "#fff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      try {
        const images = await Promise.all(
  photoList.map((src) => loadImage(src))
);

// ✅ 1. 사진 먼저 필터 적용해서 그림
ctx.save(); // 상태 저장
ctx.filter = filterVal;

for (let i = 0; i < images.length; i++) {
  ctx.drawImage(
    images[i],
    LAYOUT.x * scale,
    LAYOUT.yList[i] * scale,
    LAYOUT.w * scale,
    LAYOUT.h * scale
  );
}

ctx.restore(); // ✅ filter 완전 초기화

// ✅ 2. 프레임은 필터 없이 그림
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
        <header className="header">
          <h1 className="logo animate-pop" onClick={() => window.location.reload()} style={{ cursor: 'pointer' }}>
            <img 
              src="/snapi.png" 
              alt="snapi" 
              style={{ 
                height: '60px', 
                width: 'auto', 
                display: 'inline-block',
                transform: 'translateY(20px)',
                verticalAlign: 'middle'
              }} 
            />
          </h1>
        </header>

        {step === "start" && (
          <div className="landing-wrap animate-up">
            <div className="peek-frame left"><img src={FRAME_CATEGORIES.CUTE.items[0]} alt="" /></div>
            <div className="peek-frame right"><img src={FRAME_CATEGORIES.SPECIAL.items[0]} alt="" /></div>
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

        {step === "preview" && (
          <div className="mainContent animate-up">
            <div className="editor-layout">
              <div className="photo-side">
                {resultImage && (
  <img 
    src={resultImage} 
    className="preview-img shadow-card" 
    style={{ filter: selectedFilter }} 
    alt="" 
  />
)}
              </div>
              <div className="control-side">
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
                          setSelectedFrame(FRAME_CATEGORIES[key].items[0]);
                        }}>
                        {FRAME_CATEGORIES[key].name}
                      </button>
                    ))}
                  </div>
                </section>

                <section className="ctrl-section">
                  <label>SELECT FRAME</label>
                  <div className="frame-grid no-scroll">
                    {FRAME_CATEGORIES[currentCat].items.map((f) => (
                      <div key={f} className={`frame-item ${selectedFrame === f ? "active" : ""}`}
                        onClick={() => setSelectedFrame(f)}>
                        <img src={f} className="f-thumb" alt="" />
                      </div>
                    ))}
                  </div>
                </section>

                {/* ✅ 다운로드 버튼을 컨트롤 사이드 하단으로 이동 (접근성 향상) */}
                <button className="btn-main shadow-blue mt-10" style={{ padding: '15px', fontSize: '0.9rem' }} onClick={async () => {
                  await renderImage(selectedFrame, photos, true, selectedFilter);
                  setStep("result");
                }}>
                  DOWNLOAD READY
                </button>
              </div>
            </div>
          </div>
        )}

        {step === "result" && resultImage && (
          <div className="mainContent animate-up center">
            <img 
  src={resultImage} 
  className="final-img shadow-card" 
  style={{ filter: selectedFilter }} 
  alt="Final Result" 
/>
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
          :global(body) { background: #f8fafc; margin: 0; padding: 0; overflow-x: hidden; }
          .container { max-width: 450px; margin: 0 auto; background: #f8fafc; color: #1e293b; min-height: 100vh; padding: 15px; font-family: 'Pretendard', sans-serif; display: flex; flex-direction: column; position: relative; }
          .header { text-align: center; margin-bottom: 20px; padding-top: 5px; z-index: 10; }
          .logo { font-size: 1.4rem; font-weight: 900; cursor: pointer; color: #1e293b; }
          .landing-wrap { flex: 1; display: flex; flex-direction: column; justify-content: center; align-items: center; text-align: center; position: relative; }
          .hero-content h2 { font-size: 2.2rem; font-weight: 900; line-height: 1.2; margin: 15px 0; color: #0f172a; }
          .hero-content p { color: #64748b; font-weight: 500; }
          .badge { background: #dbeafe; color: #2563eb; padding: 6px 12px; border-radius: 20px; font-size: 0.7rem; font-weight: 800; }
          .peek-frame { position: absolute; width: 100px; opacity: 0.8; z-index: 0; }
          .peek-frame.left { left: -60px; top: 10%; transform: rotate(-15deg); }
          .peek-frame.right { right: -60px; bottom: 15%; transform: rotate(15deg); }
          .peek-frame img { width: 100%; border-radius: 4px; }
          .mainContent { display: flex; flex-direction: column; flex: 1; gap: 15px; position: relative; z-index: 1; }
          .cameraCard { width: 100%; aspect-ratio: 4/3; border-radius: 28px; overflow: hidden; position: relative; background: #e2e8f0; border: 4px solid #fff; }
          .video { width: 100%; height: 100%; object-fit: cover; transform: scaleX(-1); }
          .flash-overlay { position: absolute; inset: 0; background: #fff; z-index: 20; }
          .count-overlay { position: absolute; inset: 0; display: flex; justify-content: center; align-items: center; font-size: 100px; font-weight: 900; color: #fff; text-shadow: 0 4px 20px rgba(0,0,0,0.2); z-index: 10; }
          .btn-main { width: 100%; padding: 18px; background: #2563eb; color: #fff; border-radius: 20px; font-weight: 800; border: none; font-size: 1rem; cursor: pointer; transition: 0.3s; }
          .btn-sub { width: 100%; padding: 16px; background: #fff; color: #64748b; border: 1px solid #e2e8f0; border-radius: 20px; font-weight: 700; cursor: pointer; }
          .btn-shutter { width: 80px; height: 80px; border-radius: 50%; border: 8px solid #e2e8f0; background: #2563eb; color: #fff; font-weight: 900; cursor: pointer; }
          .shutter-wrap { display: flex; flex-direction: column; align-items: center; gap: 10px; }
          .hint { font-size: 0.75rem; color: #94a3b8; font-weight: 600; }
          .editor-layout { display: flex; gap: 12px; align-items: flex-start; }
          .photo-side { flex: 0 0 auto; }
          .preview-img { width: 110px; border-radius: 8px; background: #fff; padding: 3px; border: 1px solid #e2e8f0; }
          .control-side { flex: 1; display: flex; flex-direction: column; gap: 12px; }
          .ctrl-section label { display: block; font-size: 0.6rem; font-weight: 800; color: #94a3b8; margin-bottom: 6px; letter-spacing: 1px; }
          .filter-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 4px; }
          .filter-btn { padding: 6px 2px; background: #fff; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 0.6rem; font-weight: 700; color: #64748b; cursor: pointer; }
          .filter-btn.active { background: #2563eb; color: #fff; border-color: #2563eb; }
          .cat-tabs { display: flex; gap: 3px; }
          .cat-btn { background: #fff; border: 1px solid #e2e8f0; color: #64748b; padding: 5px 8px; border-radius: 8px; font-size: 0.65rem; font-weight: 700; }
          .cat-btn.active { background: #2563eb; color: #fff; }
          
          /* ✅ 프레임 그리드 고정 및 스크롤 제거 */
          .frame-grid.no-scroll { 
            display: grid; 
            grid-template-columns: repeat(2, 1fr); 
            gap: 6px; 
            min-height: 150px;
          }
          .frame-item { aspect-ratio: 620/2100; border-radius: 4px; border: 2px solid transparent; cursor: pointer; background: #f1f5f9; overflow: hidden; }
          .frame-item.active { border-color: #2563eb; }
          .f-thumb { width: 100%; height: 100%; object-fit: cover; }

          .share-panel { width: 100%; background: #fff; border-radius: 20px; padding: 15px; border: 1px solid #e2e8f0; }
          .share-label { font-size: 0.7rem; font-weight: 800; color: #94a3b8; margin-bottom: 10px; text-align: center; }
          .share-btns { display: flex; gap: 6px; }
          .s-btn { flex: 1; padding: 10px; background: #f1f5f9; border: none; border-radius: 12px; color: #475569; font-weight: 800; font-size: 0.7rem; }
          .s-btn.wa { background: #25D366; color: #fff; }
          .s-btn.fb { background: #1877F2; color: #fff; }
          .shadow-card { box-shadow: 0 4px 10px rgba(0,0,0,0.05); }
          .shadow-blue { box-shadow: 0 8px 15px rgba(37, 99, 235, 0.2); }
          .center { align-items: center; text-align: center; }
          .final-img { width: 180px; border-radius: 6px; background: #fff; padding: 4px; margin-bottom: 10px; }
          .deco-none { text-decoration: none; }
          .animate-up { animation: slideUp 0.6s ease-out; }
          @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
          .pulse { animation: pulse-shadow 2s infinite; }
          @keyframes pulse-shadow { 0% { box-shadow: 0 0 0 0 rgba(37, 99, 235, 0.4); } 70% { box-shadow: 0 0 0 15px rgba(37, 99, 235, 0); } 100% { box-shadow: 0 0 0 0 rgba(37, 99, 235, 0); } }
          .mt-10 { margin-top: 10px; }
        `}</style>
      </div>
    );
  }