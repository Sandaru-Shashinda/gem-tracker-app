import { useEffect, useRef, useState } from "react"
import { Download } from "lucide-react"

import type { Gem } from "@/lib/types"
import {
  buildCustomMediumReport,
  fromStoredCustomMediumReport,
  type StoredCustomMediumReport,
} from "@/lib/custom-report"
import { DEFAULT_SIGNATORY_NAME } from "@/lib/report-signature"
import { CustomMediumReportCard, PAGE_HEIGHT, PAGE_WIDTH } from "./CustomMediumReportCard"
import { useCardExport } from "./useCardExport"

/**
 * A saved custom A5 report, as everyone else sees it.
 *
 * This is what the verification page draws when a medium report carries a
 * customisation — the same component the builder writes into, with nothing editable on
 * it. A customer scanning the QR code on a custom certificate has to land on that
 * certificate and not on the standard one, or the sheet in their hand disagrees with
 * the page vouching for it.
 *
 * Interface-compatible with MediumReportPreview on purpose, so the verification page
 * chooses between them and nothing else has to change.
 */

interface CustomMediumReportViewProps {
  gem: Gem
  /** The saved document. Anything missing from it falls back to the gem's own report. */
  customReport?: Partial<StoredCustomMediumReport> | null
  reportId?: string
  signatureName?: string
}

export function CustomMediumReportView({
  gem,
  customReport,
  reportId,
  signatureName = DEFAULT_SIGNATORY_NAME,
}: CustomMediumReportViewProps) {
  const verificationUrl = `${window.location.origin}/reports/${reportId || gem._id}`
  const data = fromStoredCustomMediumReport(
    customReport,
    buildCustomMediumReport(gem, verificationUrl, signatureName),
  )

  const printRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(1)

  const { downloading, downloadingPdf, downloadPng, downloadPdf } = useCardExport(
    printRef,
    `GRC-${gem.gemId || gem._id}-custom-report`,
    "medium",
  )

  // The sheet is a fixed-size print artefact; shrink it to fit narrow viewports. The
  // transform lives on a wrapper, so printRef stays at natural size and downloads keep
  // full resolution regardless of the screen they were taken on.
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const updateScale = (width: number) => setScale(width < PAGE_WIDTH ? width / PAGE_WIDTH : 1)
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
      className='flex w-full min-w-0 flex-col items-center justify-start text-slate-900'
      style={{ colorScheme: "light" }}
    >
      <div
        className='mb-4 flex items-center justify-end gap-2 print:hidden'
        style={{ width: `${PAGE_WIDTH * scale}px` }}
      >
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
          width: `${PAGE_WIDTH * scale}px`,
          height: `${PAGE_HEIGHT * scale}px`,
          margin: "0 auto",
        }}
      >
        <div
          style={{
            width: `${PAGE_WIDTH}px`,
            height: `${PAGE_HEIGHT}px`,
            transform: `scale(${scale})`,
            transformOrigin: "top left",
          }}
        >
          <CustomMediumReportCard {...cardProps} target='screen' />
        </div>
      </div>

      {/* CAPTURE ENGINE ISOLATION — natural size, never transformed, so the exports
          keep full resolution and true-to-life sizing whatever screen this is on. */}
      <div style={{ position: "fixed", left: "-9999px", top: 0, zIndex: -1, pointerEvents: "none" }}>
        <CustomMediumReportCard {...cardProps} target='print' innerRef={printRef} />
      </div>
    </div>
  )
}
