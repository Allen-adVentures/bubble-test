'use client';

import React, { useEffect, useRef, useState } from 'react';

const WebGLCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationRef = useRef<number | null>(null);
  const [info, setInfo] = useState<{
    version: string;
    renderer?: string;
    vendor?: string;
    enabled: boolean;
  } | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')) as WebGLRenderingContext | null;
    if (!gl) {
      setInfo({ version: 'N/A', enabled: false });
      return;
    }

    // Capture renderer/vendor info (if available)
    try {
      const version = gl.getParameter(gl.VERSION) as string;
      const debugExt = gl.getExtension('WEBGL_debug_renderer_info') as WEBGL_debug_renderer_info | null;
      const renderer = debugExt ? gl.getParameter(debugExt.UNMASKED_RENDERER_WEBGL) as string : undefined;
      const vendor = debugExt ? gl.getParameter(debugExt.UNMASKED_VENDOR_WEBGL) as string : undefined;
      setInfo({ version, renderer, vendor, enabled: true });
    } catch {
      setInfo({ version: 'Unknown', enabled: true });
    }

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      const displayWidth = Math.floor(width * dpr);
      const displayHeight = Math.floor(height * dpr);
      if (canvas.width !== displayWidth || canvas.height !== displayHeight) {
        canvas.width = displayWidth;
        canvas.height = displayHeight;
      }
      gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
    };

    const render = (timeMs: number) => {
      resize();
      const t = timeMs * 0.001;
      const r = (Math.sin(t * 0.7) + 1) * 0.5;
      const g = (Math.sin(t * 1.1 + 2.0) + 1) * 0.5;
      const b = (Math.sin(t * 1.3 + 4.0) + 1) * 0.5;
      gl.clearColor(r, g, b, 1.0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      animationRef.current = requestAnimationFrame(render);
    };

    animationRef.current = requestAnimationFrame(render);
    window.addEventListener('resize', resize);

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <div className="absolute inset-0">
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full block"
        style={{ display: 'block' }}
      />
      <div className="absolute top-3 left-3 z-20 bg-black/60 text-white px-3 py-1 rounded-md text-xs font-mono">
        {info?.enabled ? (
          <div>
            <div>WebGL: ON</div>
            {info.renderer && <div className="opacity-80">{info.renderer}</div>}
          </div>
        ) : (
          <div>WebGL: OFF</div>
        )}
      </div>
    </div>
  );
};

export default WebGLCanvas;


