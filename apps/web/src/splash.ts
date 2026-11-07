// Fades out the #splash screen from index.html once the first screen is ready.

const MIN_VISIBLE_MS = 500; // long enough to read as intentional, not a flicker
let done = false;

export function hideSplash(): void {
  if (done) return;
  done = true;
  const el = document.getElementById("splash");
  if (!el) return;
  const wait = Math.max(0, MIN_VISIBLE_MS - performance.now());
  setTimeout(() => {
    el.classList.add("is-done");
    setTimeout(() => el.remove(), 400); // after the fade
  }, wait);
}
