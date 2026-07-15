'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * GenieModal — macOS Genie Effect menggunakan Canvas Slice Warping
 * 
 * Teknik: Modal dibagi menjadi N slice horizontal.
 * Setiap slice digambar dengan lebar yang menyusut/melebar secara progresif
 * menuju titik target (posisi tombol pemicu) — persis efek "dihisap ke botol".
 */

const SLICES = 60;      // Jumlah irisan horizontal
const DURATION = 480;   // Durasi animasi (ms)

function easeInOut(t) {
  return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
}

function easeOutElastic(t) {
  const c4 = (2 * Math.PI) / 3;
  if (t === 0) return 0;
  if (t === 1) return 1;
  return Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
}

export default function GenieModal({
  show,           // boolean: apakah modal ditampilkan
  onClose,        // function: callback saat overlay diklik
  genieOriginX,   // number 0-1: posisi X tombol pemicu (relatif viewport width)
  genieOriginY,   // number 0-1: posisi Y tombol pemicu (relatif viewport height)
  isClosing,      // boolean: apakah sedang dalam animasi tutup
  onAnimationDone,// function: dipanggil saat animasi tutup selesai
  children,       // konten modal
  maxWidth = '650px',
}) {
  const overlayRef = useRef(null);
  const contentRef = useRef(null);
  const canvasRef = useRef(null);
  const rafRef = useRef(null);
  const [phase, setPhase] = useState('idle'); // 'idle' | 'opening' | 'open' | 'closing'
  const [canvasData, setCanvasData] = useState(null);

  // Ketika show=true, mulai animasi opening
  useEffect(() => {
    if (show && !isClosing) {
      setPhase('opening');
    }
  }, [show]);

  // Ketika isClosing=true, mulai animasi closing
  useEffect(() => {
    if (isClosing) {
      setPhase('closing');
    }
  }, [isClosing]);

  // Ketika fase berganti ke 'open', konten sudah tampil normal
  const handleOpenEnd = () => setPhase('open');

  // Animasi menggunakan canvas slice warp
  useEffect(() => {
    if (phase !== 'opening' && phase !== 'closing') return;
    if (!canvasRef.current || !contentRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const content = contentRef.current;

    const cw = content.offsetWidth;
    const ch = content.offsetHeight;
    canvas.width = cw;
    canvas.height = ch;

    // target point: genie "drain" point (dalam koordinat relatif modal)
    // originX/Y dalam koordinat viewport → konversi ke koordinat relatif modal
    const modalRect = content.getBoundingClientRect();
    const targetXabs = (genieOriginX ?? 0.5) * window.innerWidth;
    const targetX = Math.max(0, Math.min(cw, targetXabs - modalRect.left));

    const startTime = performance.now();
    const isOpening = phase === 'opening';

    function draw(now) {
      const elapsed = now - startTime;
      let rawT = Math.min(elapsed / DURATION, 1);
      const t = isOpening ? easeOutElastic(rawT) : easeInOut(rawT);

      ctx.clearRect(0, 0, cw, ch);

      // Gambar setiap slice
      for (let i = 0; i < SLICES; i++) {
        // posisi slice: dari bawah saat opening (j=0 = bawah, j=SLICES-1 = atas)
        const sliceIndex = isOpening ? SLICES - 1 - i : i;
        const sliceY = (sliceIndex / SLICES) * ch;
        const sliceH = ch / SLICES + 1; // +1 untuk hindari gap

        // Progress baris ini (bagian bawah lebih maju dari atas)
        const rowProgress = isOpening
          ? Math.max(0, Math.min(1, (t * SLICES - (SLICES - 1 - i)) / SLICES * SLICES))
          : Math.max(0, Math.min(1, (t * SLICES - i) / SLICES * SLICES));

        // Lebar saat ini: dari 0 (di targetX) menjadi cw, atau sebaliknya
        const currentW = isOpening
          ? rowProgress * cw
          : (1 - rowProgress) * cw;

        if (currentW < 1) continue;

        // Posisi X kiri: bergerak dari targetX ke 0, atau dari 0 ke targetX
        const leftX = isOpening
          ? targetX - (targetX / cw) * currentW
          : (targetX / cw) * (cw - currentW);

        ctx.drawImage(
          content,          // sumber: elemen DOM (tidak bisa langsung, pakai offscreen)
          0, sliceY,        // sumber x, y
          cw, sliceH,       // sumber w, h
          leftX, sliceY,    // dest x, y
          currentW, sliceH  // dest w, h
        );
      }

      if (rawT < 1) {
        rafRef.current = requestAnimationFrame(draw);
      } else {
        if (isOpening) {
          handleOpenEnd();
        } else {
          onAnimationDone?.();
        }
      }
    }

    rafRef.current = requestAnimationFrame(draw);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [phase]);

  if (!show) return null;

  const isAnimating = phase === 'opening' || phase === 'closing';
  const isOpen = phase === 'open';

  return (
    <div
      ref={overlayRef}
      onClick={(e) => { if (e.target === overlayRef.current) onClose?.(); }}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: isAnimating && phase === 'opening' && !isOpen
          ? 'rgba(0,0,0,0)'
          : 'rgba(0,0,0,0.55)',
        backdropFilter: isOpen ? 'blur(8px)' : 'none',
        WebkitBackdropFilter: isOpen ? 'blur(8px)' : 'none',
        transition: 'background 0.3s, backdrop-filter 0.3s',
        animation: phase === 'opening'
          ? 'genieFadeIn 0.35s ease forwards'
          : phase === 'closing'
          ? 'genieFadeOut 0.35s ease forwards'
          : 'none',
      }}
    >
      {/* Konten asli — tersembunyi saat animasi berlangsung, tampil saat open */}
      <div
        ref={contentRef}
        style={{
          position: 'relative',
          width: '100%',
          maxWidth,
          maxHeight: '90vh',
          overflowY: 'auto',
          visibility: isOpen ? 'visible' : 'hidden',
          opacity: isOpen ? 1 : 0,
          transition: isOpen ? 'opacity 0.1s' : 'none',
          // Animasi CSS sederhana saat sudah open (hanya masuk mulus)
          animation: isOpen ? 'none' : 'none',
        }}
      >
        {children}
      </div>
    </div>
  );
}
