import { useEffect, useState, type RefObject } from "react"

/**
 * How far a custom report's content runs past where the page lets it end, in pixels;
 * 0 when it fits.
 *
 * Every sheet is a fixed-size print artefact that clips its own overflow, so a report
 * that has grown too long does not look broken so much as quietly lose its signatures
 * and footer. Row values wrap, and prose blocks take whatever length they are given, so
 * no row limit can promise a fit; this is what notices when one no longer does.
 *
 * Read off the print copy — the one that becomes the file. Each card marks what to
 * measure, because the three are built differently:
 *
 * - `data-fit-column` marks a column whose last element is pushed to its foot by an
 *   auto margin: the A4's page, the A5's two panels. The column fits while that last
 *   element's bottom edge sits on the column's bottom margin; past it, by the overflow.
 *   Measured against the margin, not the paper's edge: content pushed into the margin is
 *   still inside the page box, but already in the strip a printer cannot reach.
 *
 * - `data-fit-signature` marks the card's signature, which has to be measured another
 *   way. It is a tall image clipped to its ink, so its column overflows by design and
 *   its last edge says nothing. What matters is where the ink lands: the asset is 3:2,
 *   drawn contain-fit and centred in its box, with its ink between 0.286 and 0.686 of
 *   the frame's height — the same measurement the A5 crops that asset to.
 *
 * Driven by a ResizeObserver on the marked columns' sections rather than an effect keyed
 * on the document. Any edit that can move the end of the page changes the height of the
 * section it is in, so the observer sees every one of them — and it also sees what such
 * an effect would miss: a font or the gem image finishing loading after the edit.
 */

/** Bottom of the signature asset's ink, as a share of its frame's height. */
const SIGNATURE_INK_BOTTOM = 0.686
/** The signature asset is 1800x1200. */
const SIGNATURE_ASPECT = 1.5

function columnOverflow(column: HTMLElement): number {
  const last = column.lastElementChild as HTMLElement | null
  if (!last) return 0
  const margin = parseFloat(getComputedStyle(column).paddingBottom) || 0
  return last.offsetTop + last.offsetHeight - (column.clientHeight - margin)
}

function signatureOverflow(signature: HTMLElement): number {
  const column = signature.offsetParent as HTMLElement | null
  if (!column) return 0
  // Contain-fit: the drawn image is as wide as the box allows, and centred in its height.
  const drawn = Math.min(signature.offsetHeight, signature.offsetWidth / SIGNATURE_ASPECT)
  const drawnTop = signature.offsetTop + (signature.offsetHeight - drawn) / 2
  const inkBottom = drawnTop + drawn * SIGNATURE_INK_BOTTOM
  return inkBottom - column.clientHeight
}

export function usePageOverflow(rootRef: RefObject<HTMLElement | null>): number {
  const [overflow, setOverflow] = useState(0)

  useEffect(() => {
    const root = rootRef.current
    if (!root) return
    const columns = Array.from(root.querySelectorAll<HTMLElement>("[data-fit-column]"))
    const signatures = Array.from(root.querySelectorAll<HTMLElement>("[data-fit-signature]"))
    if (!columns.length && !signatures.length) return

    const measure = () => {
      const worst = Math.max(
        0,
        ...columns.map(columnOverflow),
        ...signatures.map(signatureOverflow),
      )
      // A pixel of tolerance for sub-pixel rounding between the measurements.
      setOverflow(worst > 1 ? worst : 0)
    }

    // Observing reports each section once straight away, which is the first measurement.
    const observer = new ResizeObserver(measure)
    for (const column of columns) {
      for (const section of Array.from(column.children)) observer.observe(section)
    }
    for (const signature of signatures) {
      const column = signature.parentElement
      if (column) for (const section of Array.from(column.children)) observer.observe(section)
    }
    return () => observer.disconnect()
  }, [rootRef])

  return overflow
}
