  "use client";

  import { useRef, useState, useEffect, useCallback } from "react";

  const createFrameList = (path: string, prefix: string, count: number) => 
    Array.from({ length: count }, (_, i) => `${path}/${prefix}_${String(i + 1).padStart(2, '0')}.png`);

  const FRAME_CATEGORIES = {
    BASIC: {
      name: "Básico",
      items: createFrameList("/frames/basic", "basic", 4)
    },
    CUTE: {
      name: "Lindo",
      items: createFrameList("/frames/cute", "cute", 4)
    },
    SPECIAL: {
      name: "Especial",
      items: createFrameList("/frames/special", "special", 1)
    },
  };

  const FILTERS = [
    { name: "Original", value: "none" },
    { name: "Claro", value: "brightness(1.1) contrast(1.1) saturate(1.1)" }, 
    { name: "Cálido", value: "sepia(20%) saturate(140%) hue-rotate(-10deg)" }, 
    { name: "Frío", value: "brightness(1.05) contrast(1.05) saturate(1.05) hue-rotate(8deg)" }, 
    { name: "B y N", value: "grayscale(100%)" }, 
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
    const images = await Promise.all(photoList.map((src) => loadImage(src)));

    for (let i = 0; i < images.length; i++) {
      const x = LAYOUT.x * scale;
      const y = LAYOUT.yList[i] * scale;
      const w = LAYOUT.w * scale;
      const h = LAYOUT.h * scale;

      // 1. 사진을 먼저 그립니다.
      ctx.drawImage(images[i], x, y, w, h);

      // 2. 필터가 설정된 경우 픽셀 데이터를 직접 수정 (iOS 호환성 100%)
      if (filterVal && filterVal !== "none") {
        const imageData = ctx.getImageData(x, y, w, h);
        const data = imageData.data;

        for (let j = 0; j < data.length; j += 4) {
          const r = data[j];
          const g = data[j + 1];
          const b = data[j + 2];

          if (filterVal.includes("grayscale(100%)")) {
            const gray = 0.2126 * r + 0.7152 * g + 0.0722 * b;
            data[j] = data[j + 1] = data[j + 2] = gray;
          } else if (filterVal.includes("sepia")) {
            data[j] = (r * 0.393) + (g * 0.769) + (b * 0.189);
            data[j+1] = (r * 0.349) + (g * 0.686) + (b * 0.168);
            data[j+2] = (r * 0.272) + (g * 0.534) + (b * 0.131);
          } else if (filterVal.includes("brightness(1.1)")) {
            data[j] = Math.min(255, r * 1.1);
            data[j+1] = Math.min(255, g * 1.1);
            data[j+2] = Math.min(255, b * 1.1);
          }
        }
        ctx.putImageData(imageData, x, y);
      }
    }

    // 3. 마지막으로 프레임을 덮습니다.
    const frame = await loadImage(frameSrc);
    ctx.drawImage(frame, 0, 0, canvas.width, canvas.height);
    
    setResultImage(canvas.toDataURL("image/png"));
  } catch (e) { console.error(e); }
}, [photos, selectedFilter]);

    const startAutoShoot = async () => {
  if (isShooting) return;
  setIsShooting(true);
  // ✅ 22초 뒤에 전면 광고(Vignette) 실행 로직 추가
      
  // 촬영 시작 전 사진첩 비우기
  setPhotos([]); 
  const currentPhotos: string[] = [];

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
    if (img) {
      // 찰칵! 소리와 함께 사진을 즉시 리스트에 추가 (실시간 업데이트)
      currentPhotos.push(img);
      setPhotos([...currentPhotos]); 
    }
    await new Promise((r) => setTimeout(r, 400));
  }

  setIsShooting(false);
  // 모든 촬영이 끝나고 0.5초 뒤에 편집 화면으로 이동
  setTimeout(() => setStep("preview"), 500);
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
              <div className="badge">Nuevo momento</div>
              <h2>4 fotos<br/>un estilo único </h2>
              <p>Tu día en 4 fotos</p>
              <button className="btn-main pulse mt-20" onClick={startCamera}>
                Captura tus 4 momentos
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
      {/* 촬영 중일 때 1/4, 2/4 진행도가 버튼에 나타납니다 */}
      {isShooting ? `${photos.length + 1}/4` : "Pulsa"}
    </button>
    <p className="hint" style={{ fontSize: '1.5rem', marginTop: '5px' }}>
  Haz clic y crea tus 4 fotos
</p>
  </div>
  
  {/* 하단에 지금까지 찍은 사진 4칸 미리보기 추가 */}
  <div className="recent-photos-bar">
    {photos.map((p, i) => (
      <img key={i} src={p} alt="" className="mini-photo animate-pop" />
    ))}
    {/* 아직 찍지 않은 남은 칸들을 회색 박스로 표시 */}
    {Array.from({ length: 4 - photos.length }).map((_, i) => (
      <div key={i} className="mini-photo-empty" />
    ))}
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
    key={resultImage}   // ⭐ 여기 추가
    src={resultImage} 
    className="preview-img shadow-card" 
    alt="" 
  />
)}
              </div>
              <div className="control-side">
                <section className="ctrl-section">
                  <label>FILTRO</label>
                  <div className="filter-grid">
                    {FILTERS.map((f) => (
                      <button 
                        key={f.name} 
                        className={`filter-btn ${selectedFilter === f.value ? "active" : ""}`}
                        onClick={() => {
  setSelectedFilter(f.value);
  renderImage(selectedFrame, photos, false, f.value);
}}
                      >
                        {f.name}
                      </button>
                    ))}
                  </div>
                </section>

                <section className="ctrl-section">
                  <label>Categoría</label>
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
    /* 클래스 이름을 frame-item-compact로 바꿔서 높이를 줄입니다 */
    <div key={f} className={`frame-item-compact ${selectedFrame === f ? "active" : ""}`}
      onClick={() => setSelectedFrame(f)}>
      <img src={f} className="f-thumb" alt="" />
    </div>
  ))}
</div>
                </section>

                {/* ✅ 다운로드 버튼을 컨트롤 사이드 하단으로 이동 (접근성 향상) */}
                <button 
  className="btn-main shadow-blue mt-10" 
  style={{ padding: '15px', fontSize: '0.9rem', width: '90%', margin: '10px auto', display: 'block' }} 
  onClick={async () => {
    await renderImage(selectedFrame, photos, true, selectedFilter);
    setStep("result");
  }}
>
  Descarga lista
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
  alt="Final Result" 
/>
<p style={{ fontSize: "1.1rem", marginTop: "15px", fontWeight: "800", color: "#1e293b" }}>
  📱 Mantén presionado para guardar
</p>
            <div className="share-panel">
              <p className="share-label">Comparte el momento</p>
              <div className="share-btns">
                <button onClick={shareLink} className="s-btn">LINK</button>
                <button onClick={shareWhatsApp} className="s-btn wa">WA</button>
                <button onClick={shareFacebook} className="s-btn fb">FB</button>
              </div>
            </div>
            <div className="footer-actions">
              <button className="btn-sub" onClick={() => window.location.reload()}>Volver a tomar</button>
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
          /* 프레임 선택창 디자인: 높이를 줄이고 둥글게 */
.frame-item-compact { 
  aspect-ratio: 1 / 1.1; 
  border-radius: 12px; 
  border: 2px solid transparent; 
  cursor: pointer; 
  background: #f1f5f9; 
  overflow: hidden; 
}
.frame-item-compact.active { border-color: #2563eb; transform: scale(1.02); }

/* 이미지의 아래쪽(로고 부분)이 보이도록 고정 */
.f-thumb { 
  width: 100%; 
  height: 100%; 
  object-fit: cover; 
  object-position: bottom; 
}

/* 카메라 모드 하단 미리보기 사진 스타일 */
.recent-photos-bar {
  display: flex;
  justify-content: center;
  gap: 8px;
  margin-top: 20px;
  min-height: 70px;
}
.mini-photo {
  /* 가로 길이를 조금 늘리고 비율을 4:3으로 고정 */
  width: 70px; 
  aspect-ratio: 4 / 3; 
  object-fit: cover;
  border-radius: 8px;
  border: 2px solid #fff;
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
}

.mini-photo-empty {
  /* 빈 칸도 사진과 똑같은 크기로 설정 */
  width: 70px;
  aspect-ratio: 4 / 3;
  background: #f1f5f9;
  border-radius: 8px;
  border: 2px dashed #e2e8f0;
}

/* 사진들이 너무 다닥다닥 붙지 않게 간격 살짝 조정 */
.recent-photos-bar {
  display: flex;
  justify-content: center;
  gap: 10px;
  margin-top: 25px;
  min-height: 60px;
}

/* 프레임 그리드 높이 제한하여 버튼이 올라오게 수정 */
.frame-grid.no-scroll { 
  display: grid; 
  /* 한 줄에 3개씩 배치해서 더 많이 보이게 수정 */
  grid-template-columns: repeat(3, 1fr); 
  gap: 10px; 
  /* 스크롤 제거 */
  max-height: none; 
  overflow: visible; 
  padding: 5px 0;
}

.frame-item-compact { 
  aspect-ratio: 1 / 1.2; /* 비율을 살짝 더 보기 좋게 조정 */
  border-radius: 12px; 
  border: 3px solid transparent; /* 테두리를 조금 더 두껍게 해서 선택 표시 강조 */
  cursor: pointer; 
  background: #f1f5f9; 
  overflow: hidden; 
  transition: all 0.2s ease;
}

.frame-item-compact.active { 
  border-color: #2563eb; 
  transform: scale(1.05); /* 선택 시 살짝 커지는 효과 추가 */
  box-shadow: 0 4px 12px rgba(37, 99, 235, 0.2);
}

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