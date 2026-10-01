// Sizing for PDF pages drawn on canvases by pdf.js.

/** Zoom steps offered by the preview's − and + buttons. 1 fits the page to the pane's width. */
export const ZOOM_STEPS = [0.5, 0.75, 1, 1.5, 2, 3] as const;

/**
 * Largest canvas, in pixels, drawn for one page. iOS Safari refuses canvases
 * above about 16.7 million pixels; staying under that keeps zoomed pages
 * visible there, at the cost of some sharpness.
 */
export const MAX_CANVAS_PIXELS = 16_000_000;

export interface PageSize {
  /** Width and height the page takes up on screen, in CSS pixels. */
  cssWidth: number;
  cssHeight: number;
  /** pdf.js render scale: canvas pixels per PDF point. */
  renderScale: number;
}

/**
 * Size of one page, given its width and height in PDF points, the pane's
 * width in CSS pixels, the zoom, and the screen's pixel ratio.
 */
export function pageSize(
  page: { width: number; height: number },
  paneWidth: number,
  zoom: number,
  pixelRatio: number,
): PageSize {
  const cssScale = (paneWidth * zoom) / page.width;
  const cssWidth = page.width * cssScale;
  const cssHeight = page.height * cssScale;
  const wanted = Math.min(pixelRatio, 2);
  const fits = Math.sqrt(MAX_CANVAS_PIXELS / (cssWidth * cssHeight));
  return {
    cssWidth,
    cssHeight,
    renderScale: cssScale * Math.min(wanted, fits),
  };
}

/** The next zoom step in a direction, or the same zoom at either end. */
export function stepZoom(zoom: number, direction: 1 | -1): number {
  const index = ZOOM_STEPS.findIndex((step) => step === zoom);
  const next = ZOOM_STEPS[index + direction];
  return next ?? zoom;
}
