import { useState, type RefObject } from "react"
import { toPng } from "html-to-image"

import { downloadReportPdf } from "@/lib/report-pdf"
import type { ReportSize } from "@/lib/real-size"

/**
 * Taking a card off the screen and onto disk.
 *
 * Shared by the builder and the read-only view, which is the point: a custom card that
 * exported differently depending on whether it was being written or being looked at
 * would be two different certificates. Both hand this the off-screen copy — the one
 * rendered at natural size with no editing chrome on it — and both get the same file.
 */

/** Raster oversampling. 3x on a bank card is comfortably past 300dpi. */
const DOWNLOAD_SCALE = 3

export function useCardExport(
  printRef: RefObject<HTMLDivElement | null>,
  fileStem: string,
  /** Which paper size the PDF page is cut to. */
  reportSize: ReportSize = "small",
) {
  const [downloading, setDownloading] = useState(false)
  const [downloadingPdf, setDownloadingPdf] = useState(false)

  const downloadPng = async () => {
    if (!printRef.current) return
    setDownloading(true)
    try {
      const dataUrl = await toPng(printRef.current, {
        pixelRatio: DOWNLOAD_SCALE,
        cacheBust: true,
      })
      const link = document.createElement("a")
      link.download = `${fileStem}.png`
      link.href = dataUrl
      link.click()
    } catch (err) {
      console.error("Download failed", err)
    } finally {
      setDownloading(false)
    }
  }

  const downloadPdf = async () => {
    if (!printRef.current) return
    setDownloadingPdf(true)
    try {
      await downloadReportPdf({
        element: printRef.current,
        reportSize,
        fileName: `${fileStem}-1to1.pdf`,
        pixelRatio: DOWNLOAD_SCALE,
      })
    } catch (err) {
      console.error("PDF download failed", err)
    } finally {
      setDownloadingPdf(false)
    }
  }

  return { downloading, downloadingPdf, downloadPng, downloadPdf }
}
