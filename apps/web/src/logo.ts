// Turns an uploaded image into a small data: URL that fits comfortably in localStorage.

const MAX_W = 800;
const MAX_H = 320;

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Couldn't read that file."));
    reader.readAsDataURL(file);
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("That file doesn't look like an image."));
    img.src = src;
  });
}

export async function processLogo(file: File): Promise<string> {
  if (file.size > 5 * 1024 * 1024) throw new Error("That file is over 5 MB. Try a smaller image.");

  if (file.type === "image/svg+xml") {
    if (file.size > 200 * 1024) throw new Error("SVG logos need to be under 200 KB.");
    return readAsDataUrl(file); // rendered through <img>, so scripts inside never run
  }
  if (!/^image\/(png|jpeg|webp|gif)$/.test(file.type)) throw new Error("Use a PNG, JPG, WebP or SVG image.");

  const img = await loadImage(await readAsDataUrl(file));
  const scale = Math.min(1, MAX_W / img.naturalWidth, MAX_H / img.naturalHeight);
  const w = Math.max(1, Math.round(img.naturalWidth * scale));
  const h = Math.max(1, Math.round(img.naturalHeight * scale));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  canvas.getContext("2d")!.drawImage(img, 0, 0, w, h);

  let out = canvas.toDataURL("image/png"); // keeps transparency
  if (out.length > 400_000) out = canvas.toDataURL("image/webp", 0.9);
  if (out.length > 600_000) throw new Error("That logo is too large to store. Try a simpler or smaller image.");
  return out;
}

/** Pick white or near-black text, whichever reads better on `hex`. */
export function readableInk(hex: string): string {
  const L = luminance(hex);
  return 1.05 / (L + 0.05) >= (L + 0.05) / 0.06 ? "#ffffff" : "#1a1917";
}

/** Colour to use for text on white: the brand colour if it has enough contrast, else ink. */
export function brandTextColor(hex: string): string {
  return 1.05 / (luminance(hex) + 0.05) >= 3 ? hex : "#1a1917";
}

function luminance(hex: string): number {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex);
  if (!m) return 0;
  const n = parseInt(m[1], 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
