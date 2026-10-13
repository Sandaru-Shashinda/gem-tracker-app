import { useState, useRef, useEffect } from "react"
import QRCode from "react-qr-code"
import { Download, ImageIcon } from "lucide-react"
import { toPng } from "html-to-image"
import type { Gem } from "@/lib/types"
import { useRealSizeGemImage } from "../gems/RealSizeGemImage"
import type { RenderTarget } from "@/lib/real-size"
import { downloadReportPdf } from "@/lib/report-pdf"
import { layoutGemName } from "@/lib/gem-name"
import { DEFAULT_SIGNATORY_NAME, SIGNATORY_ROLE } from "@/lib/report-signature"
import { LARGE_STATEMENT_TEXT } from "@/lib/custom-report"
import { treatmentStatement } from "@/lib/treatments"
import turtlesLogo from "@/assets/Turtles.png"
import signatureImg from "@/assets/signature1.png"
import grcMemoLogo from "@/assets/grc_memo_logo_trimmed.png"
import {
  A4_H,
  A4_W,
  ClarityChart,
  DOWNLOAD_SCALE,
  NAME_COL_W,
  NAME_FONT_SIZE,
  SIG_BOX_H,
  SIG_BOX_W,
  SIG_CROP_LEFT,
  SIG_CROP_TOP,
  SIG_IMG_H,
  SIG_IMG_W,
  Title,
  TypedSignature,
  TypewriterRow,
} from "./PremiumReportPreview"

/**
 * The lab's standard A4.
 *
 * The same sheet, header and signature block as the premium report, with the page pared
 * back to what identifies the stone: no colour breakdown, and the treatment finding
 * stated in a sentence rather than as the premium's full checklist. The shared pieces
 * are imported from PremiumReportPreview so the two A4s cannot drift apart.
 */

interface LargeReportPreviewProps {
  gem: Gem
  includeLogo: boolean
  reportId?: string
  /** Name typed under the left-hand signature rule; the report's configured signatory. */
  signatureName?: string
  /**
   * The signatory's own signature, written above that rule. Passed only for the digital
   * copy a QR scan opens; the copy downloaded for printing leaves the rule blank to sign.
   */
  signatureImage?: string
}

export function LargeReportPreview({
  gem,
  reportId,
  signatureName = DEFAULT_SIGNATORY_NAME,
  signatureImage,
}: LargeReportPreviewProps) {
  const [downloading, setDownloading] = useState(false)
  const [downloadingPdf, setDownloadingPdf] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const captureRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(1)

  useEffect(() => {
    const updateScale = (width: number) => {
      setScale(width < A4_W ? width / A4_W : 1)
    }

    const el = containerRef.current
    if (!el) return

    const observer = new ResizeObserver((entries) => {
      updateScale(entries[0].contentRect.width)
    })
    observer.observe(el)
    updateScale(el.clientWidth)

    return () => observer.disconnect()
  }, [])

  const handleDownload = async () => {
    if (!captureRef.current) return
    setDownloading(true)
    try {
      const dataUrl = await toPng(captureRef.current, {
        pixelRatio: DOWNLOAD_SCALE,
        cacheBust: true,
      })
      const link = document.createElement("a")
      link.download = `GRC-${gem.gemId || gem._id}-large-report.png`
      link.href = dataUrl
      link.click()
    } catch (err) {
      console.error("Download failed", err)
    } finally {
      setDownloading(false)
    }
  }

  const handleDownloadPdf = async () => {
    if (!captureRef.current) return
    setDownloadingPdf(true)
    try {
      await downloadReportPdf({
        element: captureRef.current,
        reportSize: "large",
        fileName: `GRC-${gem.gemId || gem._id}-report-1to1.pdf`,
        pixelRatio: DOWNLOAD_SCALE,
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
      className='flex flex-col w-full max-w-[860px] mx-auto pb-8 overflow-hidden'
      style={{ colorScheme: "light" }}
    >
      {/* Download buttons */}
      <div className='flex items-center justify-end gap-2 w-full mb-4 print:hidden'>
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

      {/* ── SCREEN PREVIEW ── */}
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
          <ReportPage gem={gem} reportId={reportId} signatureName={signatureName} signatureImage={signatureImage} target='screen' />
        </div>
      </div>

      {/* ── INVISIBLE CAPTURE ENGINE ── */}
      <div
        style={{
          position: "fixed",
          left: "-9999px",
          top: 0,
          zIndex: -1,
          pointerEvents: "none",
        }}
      >
        <div
          ref={captureRef}
          style={{
            width: A4_W,
            height: A4_H,
            backgroundColor: "#ffffff",
            position: "relative",
            overflow: "hidden",
          }}
        >
          <ReportPage gem={gem} reportId={reportId} signatureName={signatureName} signatureImage={signatureImage} />
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// The actual A4 page – shared by preview and capture engine
// ---------------------------------------------------------------------------


const MONO = "'Nimbus Mono', 'Courier New', Courier, monospace"
/** The gem name's own colour on this sheet; the title above it stays the lab's gold. */
const NAME_COLOR = "#2f55a4"

function ReportPage({
  gem,
  reportId,
  signatureName,
  signatureImage,
  target = "print",
}: {
  gem: Gem
  reportId?: string
  signatureName: string
  signatureImage?: string
  target?: RenderTarget
}) {
  const finalData = gem.finalApproval || {}
  const obs = finalData.finalObservations || {}
  const verificationUrl = `${window.location.origin}/reports/${reportId || gem._id}`
  const firstImageId = gem.images && gem.images.length > 0 ? gem.images[0] : null

  // 170x160px box, less its 1px border on each side.
  const gemImage = useRealSizeGemImage({
    imageId: firstImageId ?? undefined,
    obs,
    reportSize: "large",
    box: { w: 168, h: 158 },
    target,
  })

  const formatDate = (d?: string | Date) =>
    d
      ? new Date(d).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
      : new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })

  const COURIER: React.CSSProperties = {
    fontFamily: MONO,
    color: "#1a1a1a",
  }

  // Set in caps on this sheet, so it is measured in caps; a name too long for the
  // column breaks before the colour and species rather than wrapping into the signatures.
  const gemName = layoutGemName(finalData.finalVariety || obs.variety, {
    maxWidth: NAME_COL_W,
    fontSize: NAME_FONT_SIZE,
    fontFamily: MONO,
    fontWeight: 900,
    letterSpacing: 0.5,
    uppercase: true,
  })

  const columnStyle: React.CSSProperties = {
    ...COURIER,
    fontSize: "11.5px",
    fontWeight: 400,
    display: "flex",
    flexDirection: "column",
    gap: "3px",
  }

  const measurements = obs.messurementX
    ? `${Number(obs.messurementX).toFixed(2)} x ${Number(obs.messurementY).toFixed(2)} x ${Number(obs.messurementZ).toFixed(2)} mm`
    : undefined

  const treatmentLines = treatmentStatement(obs)

  return (
    <div
      style={{
        width: A4_W,
        height: A4_H,
        backgroundColor: "#ffffff",
        position: "relative",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        boxSizing: "border-box",
        padding: "44px 56px 36px 56px",
      }}
    >
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
          style={{ width: "700px", height: "700px", objectFit: "contain" }}
        />
      </div>

      {/* ── HEADER: logo left, title beside it, verification QR right ── */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          gap: "28px",
          position: "relative",
          zIndex: 2,
        }}
      >
        <img
          src={grcMemoLogo}
          alt='GRC Logo'
          style={{
            width: "150px",
            height: "auto",
            objectFit: "contain",
            display: "block",
            flexShrink: 0,
            filter: "brightness(0)",
          }}
        />

        <div style={{ flex: 1, paddingTop: "4px" }}>
          <h1
            style={{
              fontFamily: MONO,
              fontSize: "18px",
              fontWeight: 700,
              color: "#C5A259",
              textTransform: "uppercase",
              letterSpacing: "1.5px",
              margin: 0,
            }}
          >
            Gemological Report of Ceylon
          </h1>
          <p style={{ ...COURIER, fontSize: "12px", margin: "2px 0 0", fontWeight: 500 }}>
            GRC Report Number – {gem.gemId || "—"}
          </p>
          <p style={{ ...COURIER, fontSize: "12px", margin: "2px 0 0" }}>
            {formatDate(gem.updatedAt)}
          </p>
        </div>

        <div style={{ flexShrink: 0, paddingTop: "4px" }}>
          <QRCode value={verificationUrl} size={72} />
        </div>
      </div>

      {/* ── DETAILS ── */}
      <div style={{ position: "relative", zIndex: 2, marginTop: "56px" }}>
        <Title>DETAILS</Title>
        <div style={{ display: "flex", gap: "40px", marginTop: "10px" }}>
          {/* Left: identity and size */}
          <div style={{ ...columnStyle, flex: 1 }}>
            <TypewriterRow
              label='Item Description'
              value={finalData.itemDescription || obs.itemDescription || "One loose stone"}
            />
            <TypewriterRow
              label='Weight'
              value={gem.weight ? `${gem.weight.toFixed(2)} ct` : undefined}
            />
            <TypewriterRow label='Measurements' value={measurements} />
          </div>

          {/* Right: shape and cut */}
          <div style={{ ...columnStyle, flex: 1 }}>
            <TypewriterRow label='Shape' value={obs.shape || obs.cuttingShape} />
            <TypewriterRow label='Cutting Style: Crown' value={obs.crownStyle} />
            <TypewriterRow label='Cutting Style: Pavilion' value={obs.pavilionStyle} />
          </div>
        </div>
      </div>

      {/* ── RESULTS + TREATMENT ── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "0 40px",
          marginTop: "110px",
          position: "relative",
          zIndex: 2,
        }}
      >
        <div>
          <Title>RESULTS</Title>
          <div style={{ ...columnStyle, marginTop: "10px" }}>
            <TypewriterRow label='Color' value={gem.color} />
            <TypewriterRow label='Clarity' value={obs.clarityGrade} />
            <TypewriterRow label='Transparency' value={obs.transparency} />
            <TypewriterRow label='Species' value={obs.species} />
            <TypewriterRow label='Variety' value={finalData.finalVariety || obs.variety} />
            <TypewriterRow label='Geographic Origin' value={obs.origin} />
          </div>
        </div>

        <div>
          <Title>TREATMENT</Title>
          <div style={{ marginTop: "10px" }}>
            {treatmentLines.map((line) => (
              <p
                key={line}
                style={{ ...COURIER, fontSize: "11.5px", margin: "0 0 3px", lineHeight: 1.5 }}
              >
                {line}
              </p>
            ))}
          </div>
          {obs.specialNote && (
            <>
              <Title style={{ marginTop: "16px" }}>SPECIAL NOTE</Title>
              <p style={{ ...COURIER, fontSize: "11.5px", margin: "8px 0 0", lineHeight: 1.5 }}>
                {obs.specialNote}
              </p>
            </>
          )}
        </div>
      </div>

      {/* ── CLARITY CHART + STATEMENT ── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "0 40px",
          alignItems: "start",
          marginTop: "44px",
          position: "relative",
          zIndex: 2,
        }}
      >
        <div>
          <p
            style={{
              fontFamily: "Arial, sans-serif",
              fontSize: "7.5px",
              color: "#111",
              margin: "0 0 3px",
            }}
          >
            Clarity Chart
          </p>
          <ClarityChart grade={obs.clarityGrade} />
        </div>

        <p style={{ ...COURIER, fontSize: "11.5px", margin: 0, lineHeight: 1.6 }}>
          Statement: {LARGE_STATEMENT_TEXT}
        </p>
      </div>

      {/* ── GEM IMAGE + SIGNATURES ── */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "space-between",
          gap: "24px",
          marginTop: "auto",
          paddingTop: "16px",
          position: "relative",
          zIndex: 2,
        }}
      >
        {/* Left: the true-size gem image, named beneath */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            width: `${NAME_COL_W}px`,
            flexShrink: 0,
          }}
        >
          <div
            style={{
              width: "170px",
              height: "160px",
              border: "1px solid #aaa",
              backgroundColor: "#f9f9f9",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              overflow: "hidden",
            }}
          >
            {firstImageId ? (
              gemImage.node
            ) : (
              <ImageIcon style={{ width: "48px", height: "48px", color: "#d1d5db" }} />
            )}
          </div>
          {/* Centred under the image box, not the wider name column. */}
          <p
            style={{
              fontFamily: "Arial, sans-serif",
              fontSize: "9px",
              color: "#888",
              margin: "4px 0 0",
              width: "170px",
              textAlign: "center",
            }}
          >
            Image is approximate
          </p>

          {/* Heat status: an unheated stone is called out, a heated one is left unsaid. */}
          {obs.showHeatInReport && !obs.isHeated && (
            <p
              style={{
                ...COURIER,
                fontSize: "12px",
                fontWeight: 400,
                color: "#333",
                letterSpacing: "1px",
                margin: "14px 0 0",
              }}
            >
              Un - Heated
            </p>
          )}

          {/* Gem name + weight */}
          <p
            style={{
              ...COURIER,
              fontSize: `${gemName.fontSize}px`,
              fontWeight: 900,
              lineHeight: gemName.lines.length > 1 ? 1.15 : undefined,
              color: NAME_COLOR,
              letterSpacing: "0.5px",
              textTransform: "uppercase",
              textAlign: "center",
              margin: "12px 0 0",
            }}
          >
            {gemName.lines.length
              ? gemName.lines.map((line) => (
                  <span key={line} style={{ display: "block" }}>
                    {line}
                  </span>
                ))
              : "—"}
          </p>
          {gem.weight && (
            <p style={{ ...COURIER, fontSize: "11px", color: "#444", margin: "3px 0 0" }}>
              {gem.weight.toFixed(2)} ct
            </p>
          )}
        </div>

        {/* Right: the two signature fields */}
        <div style={{ display: "flex", alignItems: "flex-end", gap: "24px", marginLeft: "30px" }}>
          <TypedSignature name={signatureName} role={SIGNATORY_ROLE} signatureImage={signatureImage} />

          {/* Already-signed block, kept as the scanned asset */}
          <div
            style={{
              position: "relative",
              width: `${SIG_BOX_W}px`,
              height: `${SIG_BOX_H}px`,
              overflow: "hidden",
              flexShrink: 0,
            }}
          >
            <img
              src={signatureImg}
              alt='Authorized Signature'
              style={{
                position: "absolute",
                top: `${-SIG_CROP_TOP}px`,
                left: `${-SIG_CROP_LEFT}px`,
                width: `${SIG_IMG_W}px`,
                height: `${SIG_IMG_H}px`,
              }}
            />
          </div>
        </div>
      </div>

      {/* ── FOOTER ── */}
      <p
        style={{
          fontFamily: "Arial, sans-serif",
          fontSize: "8.5px",
          color: "#888",
          margin: "12px 100px 0 0",
          textAlign: "end",
          position: "relative",
          zIndex: 2,
        }}
      >
        For complete terms and updates, visit www.grc.lk
      </p>
    </div>
  )
}
