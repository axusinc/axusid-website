'use client';

import { useEffect, useRef, type CSSProperties } from "react";

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  brand: boolean;
};

const LINK_DISTANCE = 120;
const MOUSE_RADIUS = 140;

function particleCountForArea(width: number, height: number) {
  const area = width * height;
  return Math.min(110, Math.max(40, Math.floor(area / 18000)));
}

export function LandingBackground() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const glowRef = useRef<HTMLDivElement | null>(null);
  const cellsRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let particles: Particle[] = [];
    let width = 0;
    let height = 0;
    let raf = 0;
    let running = true;
    const mouse = { x: -9999, y: -9999, tx: -9999, ty: -9999, active: false };
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    function seed() {
      particles = Array.from({ length: particleCountForArea(width, height) }, (_, i) => ({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.35,
        vy: (Math.random() - 0.5) * 0.35,
        r: 1 + Math.random() * 1.4,
        brand: i % 9 === 0,
      }));
    }

    function resize() {
      const rect = canvas!.getBoundingClientRect();
      width = Math.max(1, Math.floor(rect.width));
      height = Math.max(1, Math.floor(rect.height));
      canvas!.width = Math.floor(width * dpr);
      canvas!.height = Math.floor(height * dpr);
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
      seed();
      if (reducedMotion) draw(0);
    }

    function draw(time: number) {
      ctx!.clearRect(0, 0, width, height);

      mouse.x += (mouse.tx - mouse.x) * 0.12;
      mouse.y += (mouse.ty - mouse.y) * 0.12;

      if (containerRef.current) {
        containerRef.current.style.setProperty("--mx", `${mouse.x.toFixed(1)}px`);
        containerRef.current.style.setProperty("--my", `${mouse.y.toFixed(1)}px`);
      }
      const spotlightOpacity = mouse.active ? "1" : "0";
      if (glowRef.current && glowRef.current.style.opacity !== spotlightOpacity) {
        glowRef.current.style.opacity = spotlightOpacity;
      }
      if (cellsRef.current && cellsRef.current.style.opacity !== spotlightOpacity) {
        cellsRef.current.style.opacity = spotlightOpacity;
      }

      for (const p of particles) {
        if (!reducedMotion) {
          const dx = p.x - mouse.x;
          const dy = p.y - mouse.y;
          const dist = Math.hypot(dx, dy);
          if (mouse.active && dist < MOUSE_RADIUS && dist > 0.01) {
            const force = ((MOUSE_RADIUS - dist) / MOUSE_RADIUS) * 0.6;
            p.vx += (dx / dist) * force * 0.08;
            p.vy += (dy / dist) * force * 0.08;
          }

          p.vx *= 0.985;
          p.vy *= 0.985;
          const driftX = Math.sin(time / 2400 + p.y / 140) * 0.08;
          const driftY = Math.cos(time / 2600 + p.x / 140) * 0.08;
          p.x += p.vx + driftX;
          p.y += p.vy + driftY;

          if (p.x < -20) p.x = width + 20;
          if (p.x > width + 20) p.x = -20;
          if (p.y < -20) p.y = height + 20;
          if (p.y > height + 20) p.y = -20;
        }

        ctx!.beginPath();
        ctx!.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx!.fillStyle = p.brand ? "rgba(182,28,28,0.35)" : "rgba(0,0,0,0.22)";
        ctx!.fill();
      }

      ctx!.lineWidth = 1;
      for (let i = 0; i < particles.length; i++) {
        const a = particles[i];
        for (let j = i + 1; j < particles.length; j++) {
          const b = particles[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const distSq = dx * dx + dy * dy;
          if (distSq > LINK_DISTANCE * LINK_DISTANCE) continue;
          const dist = Math.sqrt(distSq);
          const alpha = (1 - dist / LINK_DISTANCE) * 0.12;
          const midX = (a.x + b.x) / 2;
          const midY = (a.y + b.y) / 2;
          const mouseDist = Math.hypot(midX - mouse.x, midY - mouse.y);
          const highlight = mouse.active && mouseDist < MOUSE_RADIUS;
          ctx!.strokeStyle = highlight
            ? `rgba(182,28,28,${(alpha + 0.1).toFixed(3)})`
            : `rgba(0,0,0,${alpha.toFixed(3)})`;
          ctx!.beginPath();
          ctx!.moveTo(a.x, a.y);
          ctx!.lineTo(b.x, b.y);
          ctx!.stroke();
        }
      }
    }

    function loop(time: number) {
      if (!running) return;
      if (!document.hidden) draw(time);
      raf = requestAnimationFrame(loop);
    }

    function onPointerMove(e: PointerEvent) {
      mouse.tx = e.clientX;
      mouse.ty = e.clientY;
      mouse.active = true;
    }

    function onPointerLeave() {
      mouse.active = false;
      mouse.tx = -9999;
      mouse.ty = -9999;
    }

    let resizeTimer = 0;
    function onResize() {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(resize, 150);
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        running = entry.isIntersecting && !reducedMotion;
        if (running) {
          cancelAnimationFrame(raf);
          raf = requestAnimationFrame(loop);
        } else {
          cancelAnimationFrame(raf);
        }
      },
      { threshold: 0 },
    );
    observer.observe(canvas);

    function onVisibilityChange() {
      if (reducedMotion) return;
      if (document.hidden) {
        running = false;
        cancelAnimationFrame(raf);
      } else {
        running = true;
        cancelAnimationFrame(raf);
        raf = requestAnimationFrame(loop);
      }
    }

    resize();
    window.addEventListener("pointermove", onPointerMove, { passive: true });
    window.addEventListener("pointerleave", onPointerLeave);
    window.addEventListener("blur", onPointerLeave);
    window.addEventListener("resize", onResize);
    document.addEventListener("visibilitychange", onVisibilityChange);
    if (!reducedMotion) raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(resizeTimer);
      observer.disconnect();
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerleave", onPointerLeave);
      window.removeEventListener("blur", onPointerLeave);
      window.removeEventListener("resize", onResize);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      aria-hidden
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-[#fafafa]"
      style={{ "--mx": "50%", "--my": "40%" } as CSSProperties}
    >
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_12%_0%,rgba(182,28,28,0.07),transparent_42%),radial-gradient(ellipse_at_88%_100%,rgba(0,0,0,0.045),transparent_45%)]" />
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(0,0,0,0.025)_1px,transparent_1px),linear-gradient(to_bottom,rgba(0,0,0,0.025)_1px,transparent_1px)] bg-[size:56px_56px] [mask-image:radial-gradient(ellipse_at_center,black_20%,transparent_75%)]" />
      {/* Cursor spotlight: soft brand glow */}
      <div
        ref={glowRef}
        className="absolute inset-0 opacity-0 transition-opacity duration-300"
        style={{
          background:
            "radial-gradient(300px circle at var(--mx, 50%) var(--my, 40%), rgba(182,28,28,0.09), transparent 70%)",
        }}
      />
      {/* Cursor spotlight: grid cells light up near the pointer */}
      <div
        ref={cellsRef}
        className="absolute inset-0 bg-[size:56px_56px] opacity-0 transition-opacity duration-300"
        style={{
          backgroundImage:
            "linear-gradient(to right, rgba(182,28,28,0.12) 1px, transparent 1px), linear-gradient(to bottom, rgba(0,0,0,0.09) 1px, transparent 1px)",
          maskImage:
            "radial-gradient(260px circle at var(--mx, 50%) var(--my, 40%), black 0%, transparent 70%)",
          WebkitMaskImage:
            "radial-gradient(260px circle at var(--mx, 50%) var(--my, 40%), black 0%, transparent 70%)",
        }}
      />
    </div>
  );
}
