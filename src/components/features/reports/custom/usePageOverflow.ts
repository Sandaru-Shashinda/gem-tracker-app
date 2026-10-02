import { useEffect, useState, type RefObject } from "react"

/**
 * How far a custom report's content runs past where the page lets it end, in pixels;
 * 0 when it fits.
 *
 * Every sheet is a fixed-size print artefact that clips its own overflow, so a report
 * that has grown too long does not look broken so much as quietly lose its signatures
 * and footer. Row values wrap, prose blocks take whatever length they are given, type
 * can be set larger and the signature moved, so no fixed limit can promise a fit; this
 * is what notices when one no longer does.
 *
 * Read off the print copy — the one that becomes the file. Each card marks what to
 * measure, because the three are built differently:
 *
 * - `data-fit-column` marks a column whose last element is pushed to its foot by an
 *   auto margin: the A4's page, the A5's two panels, the card's right-hand column. The
 *   column fits while that last element's bottom edge sits on the column's bottom
 *   margin; past it, by the overflow. Measured against the margin, not the paper's
 *   edge: content pushed into the margin is still inside the page box, but already in
 *   the strip a printer cannot reach.
 *
 * - `data-fit-signature` marks the card's signature. It is a tall image clipped to its
 *   ink, so its column overflows by design and its last edge says nothing. What matters
 *   is where the ink lands: the asset is 3:2, drawn contain-fit and centred in its box,
 *   with its ink between 0.108–0.916 of the frame's width and 0.286–0.686 of its height —
 *   the same measurement the A5 crops that asset to.
 *
 * - `data-fit-box` marks something the layout lets somebody move or resize — the A5's
 *   and A4's scanned signature, every sheet's gem image frame. It has to stay within
 *   its column's top and bottom margins, and on the page: across, it may run into a
 *   gutter between columns, since nothing is cut off there, but not past the paper's edge.
 *
 * The moved and resized things are moved with a CSS transform, which leaves layout alone,
 * so they are measured by where they actually land (getBoundingClientRect) rather than
 * where layout put them. And since a transform changes no element's size, the
 * ResizeObserver that catches everything else never sees one: the page is also
 * re-measured after each edit, a frame later, once the edit has been laid out.
 */

/** Where the signature asset's ink sits, as shares of its frame. */
const SIGNATURE_INK = { left: 0.108, right: 0.916, bottom: 0.686 }
/** The signature asset is 1800x1200. */
const SIGNATURE_ASPECT = 1.5

function padding(el: HTMLElement) {
  const style = getComputedStyle(el)
  return {
    top: parseFloat(style.paddingTop) || 0,
    bottom: parseFloat(style.paddingBottom) || 0,
  }
}

function columnOverflow(column: HTMLElement): number {
  const last = column.lastElementChild as HTMLElement | null
  if (!last) return 0
  return last.offsetTop + last.offsetHeight - (column.clientHeight - padding(column).bottom)
}

function signatureOverflow(signature: HTMLElement): number {
  const column = signature.offsetParent as HTMLElement | null
  const card = column?.parentElement
  if (!column || !card) return 0
  const box = signature.getBoundingClientRect()
  const col = column.getBoundingClientRect()
  const page = card.getBoundingClientRect()
  // Contain-fit: the drawn image is as wide as the box allows, and centred in it.
  const drawnH = Math.min(box.height, box.width / SIGNATURE_ASPECT)
  const drawnW = drawnH * SIGNATURE_ASPECT
  const drawnTop = box.top + (box.height - drawnH) / 2
  const drawnLeft = box.left + (box.width - drawnW) / 2
  return Math.max(
    drawnTop + drawnH * SIGNATURE_INK.bottom - col.bottom,
    page.left - (drawnLeft + drawnW * SIGNATURE_INK.left),
    drawnLeft + drawnW * SIGNATURE_INK.right - page.right,
  )
}

function boxOverflow(box: HTMLElement, page: HTMLElement): number {
  const column = box.closest<HTMLElement>("[data-fit-column]")
  if (!column) return 0
  const r = box.getBoundingClientRect()
  const c = column.getBoundingClientRect()
  const p = page.getBoundingClientRect()
  const pad = padding(column)
  return Math.max(
    r.bottom - (c.bottom - pad.bottom),
    c.top + pad.top - r.top,
    r.right - p.right,
    p.left - r.left,
  )
}

/**
 * @param revision Anything that changes with the document — re-measures after each edit,
 *   which is what catches a move or a resize that no ResizeObserver can see.
 */
export function usePageOverflow(rootRef: RefObject<HTMLElement | null>, revision: unknown): number {
  const [overflow, setOverflow] = useState(0)

  useEffect(() => {
    const root = rootRef.current
    if (!root) return
    const columns = Array.from(root.querySelectorAll<HTMLElement>("[data-fit-column]"))
    const signatures = Array.from(root.querySelectorAll<HTMLElement>("[data-fit-signature]"))
    const boxes = Array.from(root.querySelectorAll<HTMLElement>("[data-fit-box]"))
    if (!columns.length && !signatures.length && !boxes.length) return

    const measure = () => {
      const worst = Math.max(
        0,
        ...columns.map(columnOverflow),
        ...signatures.map(signatureOverflow),
        ...boxes.map((box) => boxOverflow(box, root)),
      )
      // A pixel of tolerance for sub-pixel rounding between the measurements.
      setOverflow(worst > 1 ? worst : 0)
    }

    // Observing reports each section once straight away; the frame catches the rest.
    const observer = new ResizeObserver(measure)
    for (const column of columns) {
      for (const section of Array.from(column.children)) observer.observe(section)
    }
    for (const signature of signatures) {
      const column = signature.parentElement
      if (column) for (const section of Array.from(column.children)) observer.observe(section)
    }
    const frame = requestAnimationFrame(measure)
    return () => {
      observer.disconnect()
      cancelAnimationFrame(frame)
    }
  }, [rootRef, revision])

  return overflow
}
