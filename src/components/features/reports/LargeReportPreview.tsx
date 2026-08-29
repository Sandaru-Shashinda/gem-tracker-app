import { useState, useRef, useEffect } from "react"
import QRCode from "react-qr-code"
import { Download, ImageIcon } from "lucide-react"
import { toPng } from "html-to-image"
import type { Gem } from "@/lib/types"
import { useRealSizeGemImage } from "../gems/RealSizeGemImage"
import type { RenderTarget } from "@/lib/real-size"
import { downloadReportPdf } from "@/lib/report-pdf"
import { DEFAULT_SIGNATORY_NAME, SIGNATORY_ROLE } from "@/lib/report-signature"
import {
  TREATMENT_ANSWERS,
  TREATMENT_SECTIONS,
  normalizeTreatments,
  type TreatmentAnswer,
} from "@/lib/treatments"
import turtlesLogo from "@/assets/Turtles.png"
import signatureImg from "@/assets/signature1.png"
import grcMemoLogo from "@/assets/grc_memo_logo_trimmed.png"

// A4 at 96 dpi → 794 × 1123 px  (portrait)
const A4_W = 794
const A4_H = 1123
const DOWNLOAD_SCALE = 3

interface LargeReportPreviewProps {
  gem: Gem
  includeLogo: boolean
  reportId?: string
  /** Name typed under the left-hand signature rule; the report's configured signatory. */
  signatureName?: string
}

export function LargeReportPreview({
  gem,
  reportId,
  signatureName = DEFAULT_SIGNATORY_NAME,
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
          <ReportPage gem={gem} reportId={reportId} signatureName={signatureName} target='screen' />
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
          <ReportPage gem={gem} reportId={reportId} signatureName={signatureName} />
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// The actual A4 page – shared by preview and capture engine
// ---------------------------------------------------------------------------

/**
 * The scanned signature asset is 1800x1200 (3:2) and mostly whitespace: its ink measures
 * out to x 0.108-0.915, y 0.288-0.685 of the frame. It is rendered oversized inside a
 * window cropped to that ink band, and the typed field beside it is drawn to the same box
 * so the two signature fields line up. Same treatment as the medium report.
 */
/** Fixed wording of the statement panel — the same on every large report. */
const STATEMENT_TEXT =
  "The geographic origin and color description are an expert opinion based on a collection of observation and analytical data."

/*
 * Sized so the pair takes ~58% of the 682px content width, leaving 268px for the gem
 * name beside it — enough for a long variety ("Star Pink Sapphire") to stay on one line.
 * Widen these and NAME_COL_W below has to shrink to match, or the name wraps.
 */
const SIG_IMG_W = 215
const SIG_IMG_H = SIG_IMG_W / 1.5
const SIG_CROP_TOP = SIG_IMG_H * 0.26
const SIG_CROP_LEFT = SIG_IMG_W * 0.09
const SIG_BOX_W = SIG_IMG_W * 0.85
const SIG_BOX_H = SIG_IMG_H * 0.44
/* Fraction of the box above the rule: blank on the typed block, ink on the image. */
const SIG_RULE_OFFSET = 0.49

/* 268 + 24 gap + the signature pair (2 × 182.75 + 24) fills the 682px content width. */
const NAME_COL_W = 268

function ReportPage({
  gem,
  reportId,
  signatureName,
  target = "print",
}: {
  gem: Gem
  reportId?: string
  signatureName: string
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
    fontFamily: "'Nimbus Mono', 'Courier New', Courier, monospace",
    color: "#1a1a1a",
  }

  const columnStyle: React.CSSProperties = {
    ...COURIER,
    fontSize: "11.5px",
    fontWeight: 600,
    display: "flex",
    flexDirection: "column",
    gap: "3px",
  }

  const treatments = normalizeTreatments(obs.treatments)

  const measurements = obs.messurementX
    ? `${Number(obs.messurementX).toFixed(2)} x ${Number(obs.messurementY).toFixed(2)} x ${Number(obs.messurementZ).toFixed(2)} mm`
    : undefined

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

      {/* ── HEADER: logo left, title centred, verification QR right ── */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: "16px",
          position: "relative",
          zIndex: 2,
        }}
      >
        {/* The logo column is matched to the QR column so the title stays centred. */}
        <div style={{ width: "150px", flexShrink: 0 }}>
          {/* The asset is trimmed to the mark itself (1828x756), so filling the 150px
              column renders it ~62px tall — the largest the header band allows. */}
          <img
            src={grcMemoLogo}
            alt='GRC Logo'
            style={{
              width: "120px",
              height: "auto",
              objectFit: "contain",
              display: "block",
              filter: "brightness(0)",
            }}
          />
        </div>

        <div style={{ flex: 1, textAlign: "end" }}>
          <h1
            style={{
              fontFamily: "'Nimbus Mono', 'Courier New', Courier, monospace",
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
          <p style={{ ...COURIER, fontSize: "12px", margin: "0px 0 0", fontWeight: 500 }}>
            GRC Report Number – {gem.gemId || "—"}
          </p>
          <p style={{ ...COURIER, fontSize: "12px", margin: "2px 0 0" }}>
            {formatDate(gem.updatedAt)}
          </p>
        </div>

        <div
          style={{
            width: "150px",
            flexShrink: 0,
            display: "flex",
            justifyContent: "flex-end",
            paddingTop: "4px",
          }}
        >
          <QRCode value={verificationUrl} size={72} />
        </div>
      </div>

      {/* Sections are separated by whitespace alone — the 15px keeps the rhythm the
          rule used to carry (1px line + its 14px margin). */}
      <div style={{ height: "15px" }} />

      {/* ── DETAILS ── */}
      <div style={{ position: "relative", zIndex: 2 }}>
        <Title>DETAILS</Title>
        <div style={{ display: "flex", gap: "40px", marginTop: "10px" }}>
          {/* Left: identity, size and cut */}
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
            <div style={{ height: "8px" }} />
            <TypewriterRow label='Shape' value={obs.shape || obs.cuttingShape} />
            <TypewriterRow label='Cutting Style: Crown' value={obs.crownStyle} />
            <TypewriterRow label='Cutting Style: Pavilion' value={obs.pavilionStyle} />
          </div>

          {/* Right: colour breakdown */}
          <div style={{ ...columnStyle, flex: 1 }}>
            <TypewriterRow label='Hue' value={obs.hue} />
            <GradeRow label='Tone' value={obs.tone} />
            <GradeRow label='Saturation' value={obs.saturation} />
          </div>
        </div>
      </div>

      <div style={{ height: "29px" }} />

      {/* ── RESULTS + TREATMENT ── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "0 40px",
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


          {/* The checklist sits directly under the treatment note it qualifies, and is
              always printed: on a certificate an unticked row is itself a statement.
              A stone assessed for nothing at all prints an empty grid, which reads as
              "not examined" rather than as a clean bill. */}
          <div style={{ marginTop: "9px" }}>
            {TREATMENT_SECTIONS.map((section, i) => (
              <div key={section.title} style={{ marginTop: i === 0 ? 0 : "5px" }}>
                <p
                  style={{
                    ...COURIER,
                    fontSize: "10px",
                    fontWeight: 900,
                    textTransform: "uppercase",
                    letterSpacing: "0.4px",
                    lineHeight: 1.8,
                    margin: "0 0 2px",
                  }}
                >
                  {section.title}
                </p>
                {section.items.map((item) => (
                  <TreatmentRow key={item.key} label={item.label} value={treatments[item.key]} />
                ))}
              </div>
            ))}
          </div>
          {obs.specialNote && (
            <>
              <Title style={{ marginTop: "16px" }}>SPECIAL NOTE</Title>
              <p
                style={{
                  ...COURIER,
                  fontSize: "11px",
                  fontWeight: 600,
                  margin: "8px 0 0",
                  lineHeight: 1.55,
                  textAlign: "justify",
                }}
              >
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
          alignItems: "stretch",
          marginTop: "20px",
          position: "relative",
          zIndex: 2,
        }}
      >
        <Panel title='CLARITY CHART'>
          <ClarityChart grade={obs.clarityGrade} />
        </Panel>

        <Panel title='STATEMENT'>
          <p
            style={{
              ...COURIER,
              fontSize: "10.5px",
              fontWeight: 600,
              margin: 0,
              lineHeight: 1.6,
              textAlign: "justify",
            }}
          >
            {STATEMENT_TEXT}
          </p>
        </Panel>
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
        {/* Left: the true-size gem image */}
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
              fontSize: "22px",
              fontWeight: 900,
              color: "#C5A259",
              letterSpacing: "0.5px",
              margin: "6px 0 0",
            }}
          >
            {finalData.finalVariety || obs.variety || "—"}
          </p>
          {gem.weight && (
            <p
              style={{
                ...COURIER,
                fontSize: "14px",
                fontWeight: 600,
                color: "#444",
                margin: "3px 0 0",
              }}
            >
              {gem.weight.toFixed(2)} ct
            </p>
          )}
        </div>

        {/* Right: the two signature fields */}
        <div style={{ display: "flex", alignItems: "flex-end", gap: "24px", marginLeft: "30px" }}>
          <TypedSignature name={signatureName} role={SIGNATORY_ROLE} />

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

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function Title({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <p
      style={{
        fontFamily: "'Nimbus Mono', 'Courier New', Courier, monospace",
        fontSize: "12px",
        fontWeight: 900,
        color: "#1a1a1a",
        textTransform: "uppercase",
        letterSpacing: "1px",
        margin: 0,
        paddingBottom: "2px",
        display: "inline-block",
        ...style,
      }}
    >
      {children}
    </p>
  )
}

function TypewriterRow({ label, value }: { label: string; value?: string | number }) {
  return (
    <div style={{ display: "flex", alignItems: "baseline", width: "100%" }}>
      <span style={{ whiteSpace: "nowrap", paddingRight: "4px", flexShrink: 0 }}>{label}:</span>
      <span
        style={{
          flex: 1,
          borderBottom: "1.5px dotted #a3a3a3",
          position: "relative",
          top: "-3px",
          minWidth: "12px",
        }}
      />
      <span style={{ whiteSpace: "nowrap", paddingLeft: "6px", flexShrink: 0 }}>{value || ""}</span>
    </div>
  )
}

/**
 * Tone and saturation are graded on a three-step scale, so they print as a row of boxes
 * with the graded step ticked. An ungraded stone leaves every box empty.
 */
function GradeRow({ label, value }: { label: string; value?: string }) {
  const selected = (value || "").trim().toLowerCase()
  return (
    <div style={{ display: "flex", alignItems: "center", width: "100%", gap: "10px" }}>
      <span style={{ whiteSpace: "nowrap", flexShrink: 0 }}>{label}:</span>
      {/* Pushed to the right edge so the three steps line up under the typed values. */}
      <div style={{ display: "flex", alignItems: "center", gap: "10px", marginLeft: "auto" }}>
        {["Low", "Medium", "High"].map((option) => (
          <span
            key={option}
            style={{ display: "flex", alignItems: "center", gap: "4px", whiteSpace: "nowrap" }}
          >
            {option}
            <CheckBox checked={option.toLowerCase() === selected} />
          </span>
        ))}
      </div>
    </div>
  )
}

/**
 * One treatment on the report's checklist. An unassessed treatment leaves both boxes
 * empty, so "no answer" stays visibly different from a certified "No".
 */
function TreatmentRow({ label, value }: { label: string; value?: TreatmentAnswer }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "6px",
        fontFamily: "'Nimbus Mono', 'Courier New', Courier, monospace",
        color: "#1a1a1a",
        fontSize: "10px",
        fontWeight: 600,
        lineHeight: 1.2,
      }}
    >
      <span>{label}</span>
      <span style={{ display: "flex", alignItems: "center", gap: "5px", marginLeft: "auto" }}>
        {TREATMENT_ANSWERS.map((answer) => (
          <span
            key={answer}
            style={{ display: "flex", alignItems: "center", gap: "2px", whiteSpace: "nowrap" }}
          >
            {answer}
            <CheckBox checked={value === answer} size={8} />
          </span>
        ))}
      </span>
    </div>
  )
}

/** The tick is drawn as SVG so it survives export and does not depend on a glyph font. */
function CheckBox({ checked, size = 11 }: { checked: boolean; size?: number }) {
  return (
    <span
      style={{
        width: `${size}px`,
        height: `${size}px`,
        border: "1.2px solid #1a1a1a",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      }}
    >
      {checked && (
        <svg
          width={size - 2}
          height={size - 2}
          viewBox='0 0 10 10'
          style={{ display: "block" }}
        >
          <path
            d='M1.3 5.2 L3.9 7.9 L8.7 1.9'
            fill='none'
            stroke='#1a1a1a'
            strokeWidth='1.6'
            strokeLinecap='round'
            strokeLinejoin='round'
          />
        </svg>
      )}
    </span>
  )
}

/** Titled, outlined region – used for the clarity chart and the statement. */
function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div
      style={{
        border: "1px solid #cfcfcf",
        borderRadius: "4px",
        padding: "10px 12px 12px",
        display: "flex",
        flexDirection: "column",
        gap: "8px",
      }}
    >
      <Title style={{ fontSize: "11px", paddingBottom: 0 }}>{title}</Title>
      {children}
    </div>
  )
}

/**
 * The graded clarity scale. The stone's grade is marked with a heavy border and a light
 * tint rather than reversed type: at this size white-on-black closes up as soon as ink
 * spreads, and it disappears altogether when a print dialog has background graphics
 * switched off. The 2px rule still reads as the marker even if the fill is dropped.
 */
function ClarityChart({ grade }: { grade?: string }) {
  const normalized = (grade || "").replace(/[\s()]/g, "").toUpperCase()

  const tdStyle: React.CSSProperties = {
    border: "1px solid #111",
    padding: "2px 1px",
    textAlign: "center",
    fontSize: "6.5px",
    lineHeight: 1.25,
    fontFamily: "Arial, sans-serif",
    color: "#111",
    verticalAlign: "middle",
  }

  const activeTd: React.CSSProperties = {
    ...tdStyle,
    backgroundColor: "#c9cbdd",
    color: "#000",
    fontWeight: 700,
    border: "2px solid #111",
    WebkitPrintColorAdjust: "exact",
    printColorAdjust: "exact",
  }

  const grades = [
    { key: "EXC", label: "Exc" },
    { key: "LC1", label: "LC 1" },
    { key: "LC2", label: "LC 2" },
    { key: "EC1", label: "EC 1" },
    { key: "EC2", label: "EC 2" },
    { key: "VI1", label: "VI 1" },
    { key: "VI2", label: "VI 2" },
    { key: "HI1", label: "HI 1" },
    { key: "HI2", label: "HI 2" },
  ]

  return (
    <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed" }}>
      <tbody>
        <tr>
          <td rowSpan={2} style={tdStyle}>
            Excellent
          </td>
          <td colSpan={2} style={tdStyle}>
            Loupe Clean
          </td>
          <td colSpan={2} style={tdStyle}>
            Eye Clean
          </td>
          <td colSpan={2} style={tdStyle}>
            Visible Inclusions
          </td>
          <td colSpan={2} style={tdStyle}>
            Highly Included
          </td>
        </tr>
        <tr>
          {(["LC", "EC", "VI", "HI"] as const).flatMap((cat) => [
            <td key={`${cat}-minor`} style={tdStyle}>
              Minor Inclusions
            </td>,
            <td key={`${cat}-highly`} style={tdStyle}>
              Highly Included
            </td>,
          ])}
        </tr>
        <tr>
          {grades.map(({ key, label }) => (
            <td
              key={key}
              style={{ ...(key === normalized ? activeTd : tdStyle), fontSize: "7.5px" }}
            >
              {label}
            </td>
          ))}
        </tr>
      </tbody>
    </table>
  )
}

/**
 * The unsigned counterpart to the scanned signature asset: same box, same rule position,
 * so the pair reads as two matching fields with room to sign the left one by hand.
 */
function TypedSignature({ name, role }: { name: string; role: string }) {
  return (
    <div
      style={{
        width: `${SIG_BOX_W}px`,
        height: `${SIG_BOX_H}px`,
        display: "flex",
        flexDirection: "column",
        flexShrink: 0,
        fontFamily: "Arial, Helvetica, sans-serif",
      }}
    >
      {/* Left blank for the handwritten signature */}
      <div style={{ height: `${SIG_BOX_H * SIG_RULE_OFFSET}px`, flexShrink: 0 }}></div>
      <div style={{ borderTop: "1.5px dotted #333", width: "70%" }}></div>
      <div
        style={{
          fontSize: "10px",
          fontWeight: 700,
          color: "#1a1a1a",
          lineHeight: "12px",
          whiteSpace: "nowrap",
          marginTop: "2px",
        }}
      >
        {name}
      </div>
      <div
        style={{
          fontSize: "8px",
          color: "#8d8b8b",
          fontWeight: 750,
          lineHeight: "8px",
          whiteSpace: "nowrap",
        }}
      >
        {role}
      </div>
      <div
        style={{
          fontSize: "8px",
          color: "#8d8b8b",
          fontWeight: 750,
          lineHeight: "10px",
          whiteSpace: "nowrap",
        }}
      >
        Gemological Report Of Ceylon (Pvt) Ltd
      </div>
    </div>
  )
}
