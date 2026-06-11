import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";

type Rect = { x: number; y: number; w: number; h: number };

type Props = {
  file: File;
  onSave: (dataUrl: string) => void;
  onCancel: () => void;
};

export function ScanRedactor({ file, onSave, onCancel }: Props) {
  const imgRef = useRef<HTMLImageElement | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const [src, setSrc] = useState<string | null>(null);
  const [rects, setRects] = useState<Rect[]>([]);
  const [draft, setDraft] = useState<Rect | null>(null);
  const dragStart = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const reader = new FileReader();
    reader.onload = () => setSrc(reader.result as string);
    reader.readAsDataURL(file);
  }, [file]);

  function relative(e: React.PointerEvent<HTMLDivElement>) {
    const rect = wrapRef.current!.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) / rect.width,
      y: (e.clientY - rect.top) / rect.height,
    };
  }

  function down(e: React.PointerEvent<HTMLDivElement>) {
    e.currentTarget.setPointerCapture(e.pointerId);
    const p = relative(e);
    dragStart.current = p;
    setDraft({ x: p.x, y: p.y, w: 0, h: 0 });
  }
  function move(e: React.PointerEvent<HTMLDivElement>) {
    if (!dragStart.current) return;
    const p = relative(e);
    const s = dragStart.current;
    setDraft({
      x: Math.min(s.x, p.x),
      y: Math.min(s.y, p.y),
      w: Math.abs(p.x - s.x),
      h: Math.abs(p.y - s.y),
    });
  }
  function up() {
    if (draft && draft.w > 0.01 && draft.h > 0.01) {
      setRects((r) => [...r, draft]);
    }
    setDraft(null);
    dragStart.current = null;
  }

  async function save() {
    const img = imgRef.current;
    if (!img) return;
    const canvas = document.createElement("canvas");
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(img, 0, 0);
    // Apply heavy pixelation/blur to each rect by drawing a black bar with mosaic.
    for (const r of rects) {
      const x = r.x * canvas.width;
      const y = r.y * canvas.height;
      const w = r.w * canvas.width;
      const h = r.h * canvas.height;
      // Strong blur via repeated downscale-upscale.
      const tmp = document.createElement("canvas");
      tmp.width = Math.max(1, Math.floor(w / 18));
      tmp.height = Math.max(1, Math.floor(h / 18));
      const tctx = tmp.getContext("2d")!;
      tctx.drawImage(canvas, x, y, w, h, 0, 0, tmp.width, tmp.height);
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(tmp, 0, 0, tmp.width, tmp.height, x, y, w, h);
      ctx.imageSmoothingEnabled = true;
      // Subtle warm tint to make redaction obvious
      ctx.fillStyle = "rgba(214, 138, 36, 0.18)";
      ctx.fillRect(x, y, w, h);
    }
    const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
    onSave(dataUrl);
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        தொலைபேசி எண் / முகவரி இடங்களின் மீது விரலால் இழுத்து மறைக்கவும். தேவையான அனைத்தும்
        மறைத்த பின் <span className="font-medium text-foreground">"சேமி"</span> பொத்தானை அழுத்தவும்.
      </p>
      <div
        ref={wrapRef}
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        className="relative w-full overflow-hidden rounded-2xl border border-border bg-secondary/40 touch-none select-none"
      >
        {src && (
          <img
            ref={imgRef}
            src={src}
            alt="upload preview"
            className="block w-full h-auto pointer-events-none"
            crossOrigin="anonymous"
          />
        )}
        {[...rects, ...(draft ? [draft] : [])].map((r, i) => (
          <div
            key={i}
            className="absolute bg-foreground/70 backdrop-blur-md ring-1 ring-accent/60"
            style={{
              left: `${r.x * 100}%`,
              top: `${r.y * 100}%`,
              width: `${r.w * 100}%`,
              height: `${r.h * 100}%`,
            }}
          />
        ))}
      </div>
      <div className="flex flex-wrap gap-2 justify-end">
        <Button type="button" variant="ghost" onClick={() => setRects([])}>
          மறை நீக்கு
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>
          ரத்து
        </Button>
        <Button type="button" onClick={save} disabled={rects.length === 0}>
          சேமி ({rects.length})
        </Button>
      </div>
    </div>
  );
}