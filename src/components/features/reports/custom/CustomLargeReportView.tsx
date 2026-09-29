import { useEffect, useRef, useState } from "react"
import { Download } from "lucide-react"

import type { Gem } from "@/lib/types"
import {
  buildCustomLargeReport,
  fromStoredCustomLargeReport,
  type StoredCustomLargeReport,
} from "@/lib/custom-report"
import { DEFAULT_SIGNATORY_NAME } from "@/lib/report-signature"
import { A4_H, A4_W, CustomLargeReportCard } from "./CustomLargeReportCard"
import { useCardExport } from "./useCardExport"

/**
 * A saved custom A4 report, as everyone else sees it.
 *
 * This is what the verification page draws when a large report carries a customisation
 * — the same component the builder writes into, with nothing editable on it. A customer
 * scanning the QR code on a custom certificate has to land on that certificate and not
 * on the standard one, or the page in their hand disagrees with the page vouching for it.
 *
 * Interface-compatible with LargeReportPreview on purpose, so the verification page
 * chooses between them and nothing else has to change.
 */

interface CustomLargeReportViewProps {
  gem: Gem
  /** The saved document. Anything missing from it falls back to the gem's own report. */
  customReport?: Partial<StoredCustomLargeReport> | null
  reportId?: string
  signatureName?: string
}

export function CustomLargeReportView({
  gem,
  customReport,
  reportId,
  signatureName = DEFAULT_SIGNATORY_NAME,
}: CustomLargeReportViewProps) {
  const verificationUrl = `${window.location.origin}/reports/${reportId || gem._id}`
  const data = fromStoredCustomLargeReport(
    customReport,
    buildCustomLargeReport(gem, verificationUrl, signatureName),
  )

  const printRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(1)

  const { downloading, downloadingPdf, downloadPng, downloadPdf } = useCardExport(
    printRef,
    `GRC-${gem.gemId || gem._id}-custom-large-report`,
    "large",
  )

  // The page is a fixed-size print artefact; shrink it to fit narrow viewports. The
  // transform lives on a wrapper, so printRef stays at natural size and downloads keep
  // full resolution regardless of the screen they were taken on.
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const updateScale = (width: number) => setScale(width < A4_W ? width / A4_W : 1)
    const observer = new ResizeObserver((entries) => updateScale(entries[0].contentRect.width))
    observer.observe(el)
    updateScale(el.clientWidth)
    return () => observer.disconnect()
  }, [])

  const noop = () => {}
  const cardProps = {
    data,
    onChange: noop,
    onRemoveRow: noop,
    imageId: gem.images && gem.images.length > 0 ? gem.images[0] : undefined,
    obs: gem.finalApproval?.finalObservations || {},
  }

  return (
    <div
      ref={containerRef}
      className='mx-auto flex w-full max-w-[860px] flex-col overflow-hidden pb-8'
      style={{ colorScheme: "light" }}
    >
      <div className='mb-4 flex w-full items-center justify-end gap-2 print:hidden'>
        <span className='mr-auto text-[10px] text-slate-400 sm:text-xs'>
          Print the PDF at 100% — not "fit to page" — for a true-size gem image.
        </span>
        <button
          onClick={downloadPng}
          disabled={downloading}
          className='flex items-center gap-1.5 rounded-md bg-slate-800 px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-slate-700 disabled:opacity-50 sm:px-4 sm:text-sm'
        >
          <Download className='h-3.5 w-3.5 sm:h-4 sm:w-4' />
          {downloading ? "Exporting..." : "Download Report"}
        </button>
        <button
          onClick={downloadPdf}
          disabled={downloadingPdf}
          className='flex items-center gap-1.5 rounded-md bg-blue-600 px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-blue-500 disabled:opacity-50 sm:px-4 sm:text-sm'
        >
          <Download className='h-3.5 w-3.5 sm:h-4 sm:w-4' />
          {downloadingPdf ? "Exporting..." : "Download PDF (1:1)"}
        </button>
      </div>

      <div
        style={{
          width: `${A4_W * scale}px`,
          height: `${A4_H * scale}px`,
          margin: "0 auto",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: A4_W,
            height: A4_H,
            transform: `scale(${scale})`,
            transformOrigin: "top left",
            border: "2px solid #94a3b8",
            borderRadius: "2px",
            overflow: "hidden",
          }}
        >
          <CustomLargeReportCard {...cardProps} target='screen' />
        </div>
      </div>

      {/* CAPTURE ENGINE ISOLATION — natural size, never transformed, so the exports
          keep full resolution and true-to-life sizing whatever screen this is on. */}
      <div style={{ position: "fixed", left: "-9999px", top: 0, zIndex: -1, pointerEvents: "none" }}>
        <div
          ref={printRef}
          style={{
            width: A4_W,
            height: A4_H,
            backgroundColor: "#ffffff",
            position: "relative",
            overflow: "hidden",
          }}
        >
          <CustomLargeReportCard {...cardProps} target='print' />
        </div>
      </div>
    </div>
  )
}
