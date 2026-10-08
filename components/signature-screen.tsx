'use client';

import { useRef, useState, useEffect, useCallback } from 'react';
import { Eraser, Save, ArrowLeft, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface SignatureScreenProps {
  onSave: (data: string) => void;
  onBack: () => void;
  title?: string;
  subtitle?: string;
}

export function SignatureScreen({
  onSave,
  onBack,
  title = 'Assinatura',
  subtitle = 'Desenhe a assinatura do cliente',
}: SignatureScreenProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);
  const hasDrawnRef = useRef(false);
  const [isLandscape, setIsLandscape] = useState(false);
  const [showRotateHint, setShowRotateHint] = useState(true);
  const lastSizeRef = useRef<string>('');
  const savedImageRef = useRef<string | null>(null);
  const isInitializedRef = useRef(false);

  // Detect orientation changes
  useEffect(() => {
    const checkOrientation = () => {
      const landscape = window.innerWidth > window.innerHeight;
      setIsLandscape(landscape);
      if (landscape) setShowRotateHint(false);
    };
    checkOrientation();
    window.addEventListener('resize', checkOrientation);
    window.addEventListener('orientationchange', () => {
      setTimeout(checkOrientation, 100);
    });
    return () => {
      window.removeEventListener('resize', checkOrientation);
      window.removeEventListener('orientationchange', checkOrientation);
    };
  }, []);

  // Hide rotate hint after 5 seconds
  useEffect(() => {
    if (showRotateHint) {
      const timer = setTimeout(() => setShowRotateHint(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [showRotateHint]);

  // Save current canvas content to ref (uses refs only, no state deps)
  const saveCanvasContent = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !hasDrawnRef.current) return;
    try {
      const data = canvas.toDataURL('image/png');
      if (data && data !== 'data:,') {
        savedImageRef.current = data;
      }
    } catch { /* ignore */ }
  }, []);

  // Restore saved canvas content after resize
  const restoreCanvasContent = useCallback((canvas: HTMLCanvasElement) => {
    const saved = savedImageRef.current;
    if (!saved) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const img = new window.Image();
    img.onload = () => {
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      ctx.restore();
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.strokeStyle = '#000';
      hasDrawnRef.current = true;
      setHasDrawn(true);
    };
    img.src = saved;
  }, []);

  // Stable setupCanvas — no state dependencies, only refs
  const setupCanvas = useCallback((canvas: HTMLCanvasElement | null, forceReset = false) => {
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;

    const sizeKey = `${Math.round(rect.width)}x${Math.round(rect.height)}`;
    if (lastSizeRef.current === sizeKey && !forceReset) return;

    // Save existing drawing before resizing
    if (lastSizeRef.current !== '' && hasDrawnRef.current) {
      saveCanvasContent();
    }

    lastSizeRef.current = sizeKey;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#000';

    if (savedImageRef.current) {
      restoreCanvasContent(canvas);
    } else if (forceReset) {
      hasDrawnRef.current = false;
      setHasDrawn(false);
    }

    isInitializedRef.current = true;
  }, [saveCanvasContent, restoreCanvasContent]);

  // Save canvas before orientation change
  useEffect(() => {
    const handler = () => saveCanvasContent();
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, [saveCanvasContent]);

  // Setup canvas when orientation changes or component mounts
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Small delay for layout to settle after orientation change
    const initTimer = setTimeout(() => {
      if (!isInitializedRef.current) {
        setupCanvas(canvas);
      } else {
        // Orientation changed — force re-init with saved content
        lastSizeRef.current = '';
        setupCanvas(canvas);
      }
    }, 50);

    const observer = new ResizeObserver(() => {
      setupCanvas(canvas);
    });
    observer.observe(canvas);

    return () => {
      clearTimeout(initTimer);
      observer.disconnect();
    };
  }, [isLandscape, setupCanvas]);

  const getCoordinates = useCallback((e: React.TouchEvent | React.MouseEvent) => {
    const canvas = canvasRef?.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    if ('touches' in e) {
      const touch = (e as React.TouchEvent)?.touches?.[0];
      return {
        x: ((touch?.clientX ?? 0) - rect.left),
        y: ((touch?.clientY ?? 0) - rect.top),
      };
    }
    const mouse = e as React.MouseEvent;
    return {
      x: ((mouse?.clientX ?? 0) - rect.left),
      y: ((mouse?.clientY ?? 0) - rect.top),
    };
  }, []);

  const startDrawing = useCallback((e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault();
    const canvas = canvasRef?.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Only re-init if canvas is truly uninitialized (width=0), never mid-drawing
    if (canvas.width === 0 || canvas.height === 0) {
      setupCanvas(canvas);
    }

    const { x, y } = getCoordinates(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
    hasDrawnRef.current = true;
    setHasDrawn(true);
  }, [getCoordinates, setupCanvas]);

  const draw = useCallback((e: React.TouchEvent | React.MouseEvent) => {
    if (!isDrawing) return;
    e.preventDefault();
    const ctx = canvasRef?.current?.getContext?.('2d');
    if (!ctx) return;
    const { x, y } = getCoordinates(e);
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#000';
    ctx.lineTo(x, y);
    ctx.stroke();
  }, [isDrawing, getCoordinates]);

  const stopDrawing = useCallback(() => {
    setIsDrawing(false);
  }, []);

  const clearCanvas = useCallback(() => {
    savedImageRef.current = null;
    hasDrawnRef.current = false;
    lastSizeRef.current = '';
    setupCanvas(canvasRef.current, true);
    setHasDrawn(false);
  }, [setupCanvas]);

  const saveSignature = useCallback(() => {
    if (!hasDrawn) {
      toast.error('Desenhe a assinatura antes de salvar');
      return;
    }
    const canvas = canvasRef?.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Find the bounding box of actual drawn content (non-white pixels)
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const { data: pixels, width: imgW, height: imgH } = imageData;
    let minX = imgW, minY = imgH, maxX = 0, maxY = 0;
    for (let py = 0; py < imgH; py++) {
      for (let px = 0; px < imgW; px++) {
        const i = (py * imgW + px) * 4;
        // Check if pixel is not white/transparent (has actual content)
        if (pixels[i] < 240 || pixels[i + 1] < 240 || pixels[i + 2] < 240) {
          if (px < minX) minX = px;
          if (px > maxX) maxX = px;
          if (py < minY) minY = py;
          if (py > maxY) maxY = py;
        }
      }
    }

    // If no drawn content found, use full canvas
    if (maxX <= minX || maxY <= minY) {
      minX = 0; minY = 0; maxX = imgW - 1; maxY = imgH - 1;
    }

    // Add padding around the cropped area (10% of dimensions)
    const padX = Math.round((maxX - minX) * 0.1);
    const padY = Math.round((maxY - minY) * 0.1);
    const cropX = Math.max(0, minX - padX);
    const cropY = Math.max(0, minY - padY);
    const cropW = Math.min(imgW - cropX, maxX - minX + 2 * padX);
    const cropH = Math.min(imgH - cropY, maxY - minY + 2 * padY);

    // Create cropped export canvas (max 600px wide) with white background
    const maxExportWidth = 600;
    const scale = Math.min(1, maxExportWidth / cropW);
    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = Math.round(cropW * scale);
    exportCanvas.height = Math.round(cropH * scale);
    const exportCtx = exportCanvas.getContext('2d');
    if (exportCtx) {
      exportCtx.fillStyle = '#ffffff';
      exportCtx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);
      exportCtx.drawImage(canvas, cropX, cropY, cropW, cropH, 0, 0, exportCanvas.width, exportCanvas.height);
    }
    const dataUrl = exportCanvas.toDataURL?.('image/jpeg', 0.7);
    if (dataUrl) {
      onSave?.(dataUrl);
      toast.success('Assinatura salva!');
    }
  }, [hasDrawn, onSave]);

  // Landscape fullscreen layout
  if (isLandscape) {
    return (
      <div className="fixed inset-0 z-[100] bg-background flex flex-col">
        {/* Compact header */}
        <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-background/95 backdrop-blur-sm">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon-sm" onClick={onBack} className="rounded-lg h-8 w-8">
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <h2 className="text-sm font-display font-bold">{title}</h2>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="destructive"
              size="sm"
              onClick={clearCanvas}
              className="h-8 rounded-lg text-xs font-semibold px-3"
            >
              <Eraser className="w-3.5 h-3.5 mr-1" />
              Limpar
            </Button>
            <Button
              size="sm"
              onClick={saveSignature}
              className="h-8 rounded-lg text-xs font-semibold px-3 bg-green-600 hover:bg-green-700"
            >
              <Save className="w-3.5 h-3.5 mr-1" />
              Salvar
            </Button>
          </div>
        </div>

        {/* Full canvas area */}
        <div className="flex-1 p-2">
          <div className="w-full h-full bg-card rounded-xl shadow-sm border border-border overflow-hidden relative">
            {/* Guide line as CSS overlay - won't appear in exported image */}
            <div className="absolute left-5 right-5 border-b border-dashed border-red-400" style={{ top: '75%' }} />
            <canvas
              ref={canvasRef}
              className="w-full h-full touch-none"
              onTouchStart={startDrawing}
              onTouchMove={draw}
              onTouchEnd={stopDrawing}
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
            />
          </div>
        </div>
      </div>
    );
  }

  // Portrait layout
  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <Button variant="outline" size="icon" onClick={onBack} className="rounded-xl flex-shrink-0">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h2 className="text-xl font-display font-bold tracking-tight">{title}</h2>
          <p className="text-sm text-muted-foreground">{subtitle}</p>
        </div>
      </div>

      {/* Rotate hint */}
      {showRotateHint && (
        <div className="mb-4 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-xl p-3 flex items-center gap-3 animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/50 rounded-lg flex items-center justify-center flex-shrink-0">
            <Smartphone className="w-5 h-5 text-blue-600 dark:text-blue-400 rotate-90" />
          </div>
          <p className="text-xs text-blue-700 dark:text-blue-300">
            <span className="font-semibold">Dica:</span> Vire o celular na horizontal para uma área de assinatura maior
          </p>
        </div>
      )}

      <div className="bg-card rounded-xl shadow-sm border border-border overflow-hidden relative">
        {/* Guide line as CSS overlay - won't appear in exported image */}
        <div className="absolute left-5 right-5 border-b border-dashed border-red-400" style={{ top: '75%' }} />
        <canvas
          ref={canvasRef}
          className="w-full touch-none"
          style={{ height: '280px' }}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
        />
      </div>

      <div className="mt-6 flex gap-3">
        <Button variant="destructive" onClick={clearCanvas} className="flex-1 h-12 rounded-xl font-semibold">
          <Eraser className="w-5 h-5 mr-2" />
          Limpar
        </Button>
        <Button onClick={saveSignature} className="flex-1 h-12 rounded-xl font-semibold bg-green-600 hover:bg-green-700">
          <Save className="w-5 h-5 mr-2" />
          Salvar
        </Button>
      </div>
    </div>
  );
}
