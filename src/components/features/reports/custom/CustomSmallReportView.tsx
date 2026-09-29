import { useEffect, useRef, useState } from "react"
import { Download } from "lucide-react"

import type { Gem } from "@/lib/types"
import {
  buildCustomSmallReport,
  fromStoredCustomReport,
  type StoredCustomSmallReport,
} from "@/lib/custom-report"
import { CARD_HEIGHT, CARD_WIDTH, CustomSmallReportCard } from "./CustomSmallReportCard"
import { useCardExport } from "./useCardExport"

/**
 * A saved custom card, as everyone else sees it.
 *
 * This is what the verification page draws when the report carries a customisation —
 * the same component the builder writes into, with nothing editable on it. A customer
 * scanning the QR code on a custom certificate has to land on that certificate and not
 * on the standard one, or the card in their hand disagrees with the page vouching for
 * it.
 *
 * Interface-compatible with SmallReportPreview on purpose, so the verification page
 * chooses between them and nothing else has to change.
 */

interface CustomSmallReportViewProps {
  gem: Gem
  /** The saved document. Anything missing from it falls back to the gem's own card. */
  customCard?: Partial<StoredCustomSmallReport> | null
  reportId?: string
}

export function CustomSmallReportView({ gem, customCard, reportId }: CustomSmallReportViewProps) {
  const verificationUrl = `${window.location.origin}/reports/${reportId || gem._id}`
  const data = fromStoredCustomReport(customCard, buildCustomSmallReport(gem, verificationUrl))

  const printRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(1)

  const { downloading, downloadingPdf, downloadPng, downloadPdf } = useCardExport(
    printRef,
    `GRC-${gem.gemId || gem._id}-custom-card`,
  )

  // The card is a fixed-size print artefact; shrink it to fit narrow viewports. The
  // transform lives on a wrapper, so printRef stays at natural size and downloads keep
  // full resolution regardless of the screen they were taken on.
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const updateScale = (width: number) => setScale(width < CARD_WIDTH ? width / CARD_WIDTH : 1)
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
      className='flex w-full min-w-0 flex-col items-center justify-start font-serif text-slate-900'
    >
      <div
        style={{
          width: `${CARD_WIDTH * scale}px`,
          height: `${CARD_HEIGHT * scale}px`,
          margin: "0 auto",
        }}
      >
        <div
          style={{
            width: `${CARD_WIDTH}px`,
            height: `${CARD_HEIGHT}px`,
            transform: `scale(${scale})`,
            transformOrigin: "top left",
          }}
        >
          <CustomSmallReportCard {...cardProps} target='screen' />
        </div>
      </div>

      <div
        className='mt-4 flex items-center justify-end gap-2 print:hidden'
        style={{ width: `${CARD_WIDTH * scale}px` }}
      >
        <span className='mr-auto text-[10px] text-slate-400'>
          Print the PDF at 100% — not "fit to page" — for a true-size gem image.
        </span>
        <button
          onClick={downloadPng}
          disabled={downloading}
          className='flex items-center gap-1.5 rounded-md bg-slate-800 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-slate-700 disabled:opacity-50'
        >
          <Download className='h-3 w-3' />
          {downloading ? "Exporting..." : "Download Card"}
        </button>
        <button
          onClick={downloadPdf}
          disabled={downloadingPdf}
          className='flex items-center gap-1.5 rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-blue-500 disabled:opacity-50'
        >
          <Download className='h-3 w-3' />
          {downloadingPdf ? "Exporting..." : "Download PDF (1:1)"}
        </button>
      </div>

      {/* CAPTURE ENGINE ISOLATION — natural size, never transformed, so the exports
          keep full resolution and true-to-life sizing whatever screen this is on. */}
      <div style={{ position: "fixed", left: "-9999px", top: 0, zIndex: -1, pointerEvents: "none" }}>
        <CustomSmallReportCard {...cardProps} target='print' innerRef={printRef} />
      </div>
    </div>
  )
}
