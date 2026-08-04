import { toPng } from "html-to-image"
import jsPDF from "jspdf"

import { PX_PER_MM, type ReportSize } from "./real-size"

/**
 * Exports a report preview as a PDF whose page is the certificate's real paper size.
 *
 * This is what makes real-size rendering actually mean anything. A PNG carries no
 * physical dimensions, so its printed size depends entirely on the viewer's app and
 * whether someone left "fit to page" ticked — a gem sized perfectly in CSS pixels
 * still comes out wrong. Placing the same raster on a page measured in millimetres
 * pins it down.
 */

interface DownloadReportPdfArgs {
  element: HTMLElement
  reportSize: ReportSize
  fileName: string
  /** Raster oversampling. 3x on A4 is ~300dpi. */
  pixelRatio?: number
}

export async function downloadReportPdf({
  element,
  reportSize,
  fileName,
  pixelRatio = 3,
}: DownloadReportPdfArgs): Promise<void> {
  // offsetWidth/Height ignore the CSS transform the previews use to fit narrow
  // viewports, so these are the layout pixels the px-per-mm scale is defined against.
  const pxW = element.offsetWidth
  const pxH = element.offsetHeight
  if (!pxW || !pxH) throw new Error("Report preview has no size to export")

  const scale = PX_PER_MM[reportSize]
  const mmW = pxW / scale
  const mmH = pxH / scale

  const dataUrl = await toPng(element, { pixelRatio, cacheBust: true, backgroundColor: "#ffffff" })

  const pdf = new jsPDF({
    unit: "mm",
    // Passing the orientation that already matches the format stops jsPDF from
    // swapping the page dimensions on us.
    orientation: mmW >= mmH ? "landscape" : "portrait",
    format: [mmW, mmH],
  })
  pdf.addImage(dataUrl, "PNG", 0, 0, mmW, mmH, undefined, "FAST")
  pdf.save(fileName)
}
