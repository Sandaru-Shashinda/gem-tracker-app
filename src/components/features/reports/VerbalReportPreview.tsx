import { useState, useRef, useEffect } from "react"
import { Download } from "lucide-react"
import { toPng } from "html-to-image"
import type { Gem } from "@/lib/types"
import { useRealSizeGemImage } from "../gems/RealSizeGemImage"
import type { RenderTarget } from "@/lib/real-size"
import { downloadReportPdf } from "@/lib/report-pdf"
import turtlesLogo from "@/assets/Turtles.png"
import signatureImg from "@/assets/signature1.png"

interface VerbalReportPreviewProps {
  gem: Gem
  includeLogo: boolean
  reportId?: string
}

const SCALE_FACTOR = 3
const CARD_W = 794
const CARD_H = 560

/**
 * The signature asset is 1800x1200 (3:2) and mostly whitespace: its ink measures out to
 * x 0.108-0.915, y 0.288-0.685 of the frame. Scaling by height alone therefore spends
 * most of the card's remaining vertical space on empty margin rather than on the
 * signature, so the image is rendered oversized inside a window cropped to the ink band
 * (with a little slack on each edge). Keep the window inside those measured bounds.
 */
const SIG_IMG_H = 180
const SIG_IMG_W = SIG_IMG_H * 1.5
const SIG_CROP_TOP = SIG_IMG_H * 0.26
const SIG_CROP_LEFT = SIG_IMG_W * 0.09
const SIG_BOX_W = SIG_IMG_W * 0.85
const SIG_BOX_H = SIG_IMG_H * 0.44

export function VerbalReportPreview({ gem }: VerbalReportPreviewProps) {
  const [downloading, setDownloading] = useState(false)
  const [downloadingPdf, setDownloadingPdf] = useState(false)
  const innerRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(1)

  useEffect(() => {
    const updateScale = (width: number) => {
      const available = width - 32
      setScale(available < CARD_W ? available / CARD_W : 1)
    }
    const parent = containerRef.current?.parentElement
    if (!parent) return
    const observer = new ResizeObserver((entries) => updateScale(entries[0].contentRect.width))
    observer.observe(parent)
    updateScale(parent.clientWidth)
    return () => observer.disconnect()
  }, [])

  const handleDownload = async () => {
    if (!innerRef.current) return
    setDownloading(true)
    try {
      const dataUrl = await toPng(innerRef.current, { pixelRatio: SCALE_FACTOR, cacheBust: true })
      const link = document.createElement("a")
      link.download = `GRC-${gem.gemId || gem._id}-verbal.png`
      link.href = dataUrl
      link.click()
    } catch (err) {
      console.error("Download failed", err)
    } finally {
      setDownloading(false)
    }
  }

  const handleDownloadPdf = async () => {
    if (!innerRef.current) return
    setDownloadingPdf(true)
    try {
      await downloadReportPdf({
        element: innerRef.current,
        reportSize: "verbal",
        fileName: `GRC-${gem.gemId || gem._id}-verbal-1to1.pdf`,
        pixelRatio: SCALE_FACTOR,
      })
    } catch (err) {
      console.error("PDF download failed", err)
    } finally {
      setDownloadingPdf(false)
    }
  }

  return (
    <div
      ref={containerRef}
      className='flex flex-col w-full max-w-[826px] mx-auto overflow-hidden pb-8'
      style={{ colorScheme: "light" }}
    >
      <div className='flex items-center justify-end gap-2 w-full mb-4 sm:mb-6 print:hidden'>
        <span className='mr-auto text-[10px] sm:text-xs text-slate-400'>
          Print the PDF at 100% — not "fit to page" — for a true-size gem image.
        </span>
        <button
          onClick={handleDownload}
          disabled={downloading}
          className='flex items-center gap-1.5 px-3 py-2 text-xs sm:px-4 sm:text-sm font-medium bg-slate-800 text-white rounded-md hover:bg-slate-700 disabled:opacity-50 transition-colors'
        >
          <Download className='w-3.5 h-3.5 sm:w-4 sm:h-4' />
          {downloading ? "Exporting..." : "Download Report"}
        </button>
        <button
          onClick={handleDownloadPdf}
          disabled={downloadingPdf}
          className='flex items-center gap-1.5 px-3 py-2 text-xs sm:px-4 sm:text-sm font-medium bg-blue-600 text-white rounded-md hover:bg-blue-500 disabled:opacity-50 transition-colors'
        >
          <Download className='w-3.5 h-3.5 sm:w-4 sm:h-4' />
          {downloadingPdf ? "Exporting..." : "Download PDF (1:1)"}
        </button>
      </div>

      <div style={{ width: `${CARD_W * scale}px`, height: `${CARD_H * scale}px`, margin: "0 auto" }}>
        <div
          className='relative bg-white border-2 border-slate-400 overflow-hidden text-slate-900'
          style={{
            width: `${CARD_W}px`,
            height: `${CARD_H}px`,
            transform: `scale(${scale})`,
            transformOrigin: "top left",
          }}
        >
          <VerbalContent gem={gem} target='screen' />
        </div>
      </div>

      {/* Capture engine isolation */}
      <div style={{ position: "fixed", left: "-9999px", top: 0, zIndex: -1, pointerEvents: "none" }}>
        <div
          ref={innerRef}
          style={{
            width: `${CARD_W}px`,
            height: `${CARD_H}px`,
            backgroundColor: "#ffffff",
            position: "relative",
            overflow: "hidden",
            color: "#1e293b",
          }}
        >
          <VerbalContent gem={gem} />
        </div>
      </div>
    </div>
  )
}

function VerbalContent({ gem, target = "print" }: { gem: Gem; target?: RenderTarget }) {
  const finalData = gem.finalApproval || {}
  const obs = finalData.finalObservations || {}
  const firstImageId = gem.images && gem.images.length > 0 ? gem.images[0] : null

  // 110px box, less its 1px border on each side.
  const gemImage = useRealSizeGemImage({
    imageId: firstImageId ?? undefined,
    obs,
    reportSize: "verbal",
    box: { w: 108, h: 108 },
    target,
  })

  const GOLD = "#D4AF37"
  const DARK = "#111111"

  const variety = finalData.finalVariety || obs.variety || ""
  const isJewelry =
    (finalData.itemDescription || obs.itemDescription || gem.itemDescription || "")
      .toLowerCase()
      .includes("bracelet") ||
    variety.toLowerCase().includes("bracelet")

  const weightUnit = isJewelry ? "g" : "ct"
  const weightStr = gem.weight ? `${Number(gem.weight).toFixed(2)} ${weightUnit}` : ""

  const formatDate = (d?: string | Date) =>
    d ? new Date(d).toLocaleDateString("en-GB") : new Date().toLocaleDateString("en-GB")

  const heatStatement = obs.showHeatInReport
    ? obs.isHeated
      ? "Evidence of heat treatment detected"
      : "No indications of heating detected"
    : ""

  // Shape and cut read as one field, matching SmallReportPreview: the shape carries
  // the cut, and a mix cut is a suffix rather than a separate style value.
  const shapeValue = obs.shape || obs.cuttingShape || ""
  const shapeAndCut = obs.isMixCut ? `${shapeValue} mix cut`.trim() : shapeValue

  // X/Y/Z are Length/Width/Height — always presented in that order and spelled out.
  const dimensions = obs.messurementX
    ? `${Number(obs.messurementX).toFixed(2)} × ${Number(obs.messurementY).toFixed(2)} × ${Number(
        obs.messurementZ
      ).toFixed(2)} mm (L × W × H)`
    : ""

  // `wide` points span both grid columns — their values are prose-length and would
  // wrap badly in a half-width cell, and the card height leaves no room for that.
  const points: { label: string; value: string; wide?: boolean }[] = [
    { label: "Species", value: obs.species || "" },
    { label: "Variety", value: variety },
    { label: "Weight", value: weightStr },
    { label: "Color", value: gem.color || "" },
    { label: "Shape & Cut", value: shapeAndCut, wide: true },
    { label: "Dimensions", value: dimensions, wide: true },
    { label: "Heat Treatment", value: heatStatement, wide: true },
    { label: "Comments", value: obs.comments || "", wide: true },
  ].filter((p) => Boolean(p.value))

  return (
    <>
      {/* Watermark */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          opacity: 1,
          pointerEvents: "none",
          zIndex: 0,
        }}
      >
        <img
          src={turtlesLogo}
          alt=''
          style={{ width: "700px", height: "700px", objectFit: "contain", filter: "grayscale(100%)" }}
        />
      </div>

      {/* Content */}
      <div
        style={{
          position: "relative",
          zIndex: 1,
          display: "flex",
          flexDirection: "column",
          height: "100%",
          padding: "40px 52px 28px 52px",
          boxSizing: "border-box",
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <h1
              style={{
                color: GOLD,
                fontSize: "20px",
                fontWeight: 700,
                textTransform: "uppercase",
                margin: 0,
                letterSpacing: "0.5px",
                fontFamily: "'Nimbus Mono', 'Courier New', Courier, monospace",
              }}
            >
              Gemological Report of Ceylon
            </h1>
            <p
              style={{
                margin: "4px 0 0 0",
                fontSize: "12px",
                color: "#555",
                fontFamily: "Arial, sans-serif",
                letterSpacing: "3px",
                textTransform: "uppercase",
              }}
            >
              Verbal Assessment
            </p>
          </div>

          {/* Gem image */}
          <div style={{ flexShrink: 0 }}>
            <div
              style={{
                width: "110px",
                height: "110px",
                border: "1px solid #ccc",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                overflow: "hidden",
              }}
            >
              {firstImageId ? (
                gemImage.node
              ) : (
                <img src={turtlesLogo} style={{ opacity: 0.1, width: "100%", height: "100%", objectFit: "contain" }} alt='' />
              )}
            </div>
            <p
              style={{
                fontFamily: "Arial, sans-serif",
                fontSize: "8px",
                color: "#888",
                textAlign: "center",
                marginTop: "3px",
              }}
            >
              Image is approximate
            </p>
          </div>
        </div>

        {/* Divider */}
        <div style={{ borderBottom: `2px solid ${GOLD}`, margin: "16px 0 18px 0" }} />

        {/* Meta row */}
        <div
          style={{
            display: "flex",
            gap: "40px",
            fontSize: "12px",
            fontFamily: "'Nimbus Mono', 'Courier New', Courier, monospace",
            color: DARK,
            marginBottom: "18px",
          }}
        >
          {gem.gemId && <span><strong>GRC No:</strong> {gem.gemId}</span>}
          <span><strong>Date:</strong> {formatDate(gem.updatedAt)}</span>
          {weightStr && <span><strong>Weight:</strong> {weightStr}</span>}
        </div>

        {/* Verbal statement — point wise. minHeight/overflow keep an unusually long
            Comments value from pushing the signature off the fixed-height card. */}
        <div
          style={{
            flex: 1,
            minHeight: 0,
            overflow: "hidden",
            fontSize: "12px",
            color: DARK,
            fontFamily: "'Nimbus Mono Antique', 'Courier New', Courier, monospace",
            fontWeight: 400,
          }}
        >
          <p style={{ margin: "0 0 16px 0", fontSize: "11px", lineHeight: 1.5, color: "#444" }}>
            The submitted specimen has been examined, with the following results:
          </p>
          <ul
            style={{
              margin: 0,
              padding: 0,
              listStyle: "none",
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              columnGap: "28px",
              rowGap: "7px",
            }}
          >
            {points.map((p) => (
              <li
                key={p.label}
                style={{
                  gridColumn: p.wide ? "1 / -1" : "auto",
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "6px",
                  lineHeight: 1.5,
                }}
              >
                <span style={{ color: GOLD, flexShrink: 0 }}>•</span>
                <span style={{ width: "104px", flexShrink: 0 }}>{p.label}</span>
                <span style={{ flexShrink: 0 }}>:</span>
                <span style={{ flex: 1 }}>{p.value}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Footer row: signature */}
        <div
          style={{
            display: "flex",
            justifyContent: "flex-start",
            alignItems: "flex-end",
            marginTop: "12px",
          }}
        >
          <div
            style={{
              position: "relative",
              width: `${SIG_BOX_W}px`,
              height: `${SIG_BOX_H}px`,
              overflow: "hidden",
              marginLeft: "-4px",
            }}
          >
            <img
              src={signatureImg}
              alt='Signature'
              style={{
                position: "absolute",
                top: `${-SIG_CROP_TOP}px`,
                left: `${-SIG_CROP_LEFT}px`,
                width: `${SIG_IMG_W}px`,
                height: `${SIG_IMG_H}px`,
                objectFit: "contain",
              }}
            />
          </div>
        </div>
      </div>
    </>
  )
}
