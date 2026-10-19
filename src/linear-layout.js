/**
 * Choose balanced row lengths for a phone-width LCARS linear sequencer.
 * Prefer one row and only wrap when a numbered step would become too narrow.
 * Every produced row is independently stretched to the full available width.
 */
export function linearRowSizes(count, availableWidth, minStepWidth = 30, gap = 4) {
  if (!Number.isInteger(count) || count < 1 || count > 20) throw new RangeError('Invalid step count');
  const width = Math.max(1, Number.isFinite(availableWidth) ? availableWidth : 1);
  const capacity = Math.max(1, Math.floor((width + gap) / (minStepWidth + gap)));
  const rows = Math.ceil(count / capacity);
  const base = Math.floor(count / rows);
  const extra = count % rows;
  return Array.from({length: rows}, (_, i) => base + (i < extra ? 1 : 0));
}

/** Visible viewport height in CSS pixels, independent from browser CSS `zoom`. */
export function mobileFrameHeight(viewportHeight, scale) {
  if (!Number.isFinite(viewportHeight) || viewportHeight <= 0) throw new RangeError('Invalid viewport height');
  if (!Number.isFinite(scale) || scale <= 0) throw new RangeError('Invalid scale');
  return viewportHeight / scale;
}
