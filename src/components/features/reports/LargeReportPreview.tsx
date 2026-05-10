import { useState, useRef, useEffect } from "react"
import QRCode from "react-qr-code"
import { Download, ImageIcon } from "lucide-react"
import { toPng } from "html-to-image"
import type { Gem } from "@/lib/types"
import { GemImage } from "../gems/GemImage"
import turtlesLogo from "@/assets/Turtles.png"
import signatureImg from "@/assets/signature1.png"
import grcMemoLogo from "@/assets/grc_memo_logo.png"

// A4 at 96 dpi → 794 × 1123 px  (portrait)
const A4_W = 794
const A4_H = 1123
const DOWNLOAD_SCALE = 3

interface LargeReportPreviewProps {
  gem: Gem
  includeLogo: boolean
  reportId?: string
}

export function LargeReportPreview({ gem, reportId }: LargeReportPreviewProps) {
  const [downloading, setDownloading] = useState(false)
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

  return (
    <div
      ref={containerRef}
      className='flex flex-col w-full max-w-[860px] mx-auto pb-8 overflow-hidden'
      style={{ colorScheme: "light" }}
    >
      {/* Download button */}
      <div className='flex items-center justify-end w-full mb-4 print:hidden'>
        <button
          onClick={handleDownload}
          disabled={downloading}
          className='flex items-center gap-1.5 px-4 py-2 text-sm font-medium bg-slate-800 text-white rounded-md hover:bg-slate-700 disabled:opacity-50 transition-colors'
        >
          <Download className='w-4 h-4' />
          {downloading ? "Exporting..." : "Download Report"}
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
          <ReportPage gem={gem} reportId={reportId} />
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
          <ReportPage gem={gem} reportId={reportId} />
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// The actual A4 page – shared by preview and capture engine
// ---------------------------------------------------------------------------

function ReportPage({ gem, reportId }: { gem: Gem; reportId?: string }) {
  const finalData = gem.finalApproval || {}
  const obs = finalData.finalObservations || {}
  const verificationUrl = `${window.location.origin}/reports/${reportId || gem._id}`
  const firstImageId = gem.images && gem.images.length > 0 ? gem.images[0] : null

  const formatDate = (d?: string | Date) =>
    d
      ? new Date(d).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
      : new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })

  const COURIER: React.CSSProperties = {
    fontFamily: "'Nimbus Mono', 'Courier New', Courier, monospace",
    color: "#1a1a1a",
  }

  const tdStyle: React.CSSProperties = {
    border: "1px solid #111",
    padding: "3px 5px",
    textAlign: "center",
    fontSize: "8px",
    fontFamily: "Arial, sans-serif",
    verticalAlign: "middle",
  }

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
        padding: "52px 56px 40px 56px",
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

      {/* ── HEADER ── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "28px",
          position: "relative",
          zIndex: 2,
        }}
      >
        {/* GRC Logo */}
        <div style={{ width: "220px" }}>
          <img src={grcMemoLogo} alt='GRC Logo' style={{ height: "90px", objectFit: "contain" }} />
        </div>
        {/* Title block */}
        <div style={{ textAlign: "center" }}>
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
          <p style={{ ...COURIER, fontSize: "12px", margin: "4px 0 0", fontWeight: 500 }}>
            GRC Report Number – {gem.gemId || "—"}
          </p>
          <p style={{ ...COURIER, fontSize: "12px", margin: "2px 0 0" }}>
            {formatDate(gem.updatedAt)}
          </p>
        </div>
        <div style={{ width: "120px" }} /> {/* spacer */}
      </div>

      {/* ── DIVIDER ── */}
      <div
        style={{
          height: "1px",
          backgroundColor: "#ddd",
          marginBottom: "26px",
          position: "relative",
          zIndex: 2,
        }}
      />

      {/* ── DETAILS SECTION ── */}
      <div style={{ marginBottom: "6px", position: "relative", zIndex: 2 }}>
        <Title>DETAILS</Title>
        <div
          style={{
            display: "flex",
            gap: "32px",
            ...COURIER,
            fontSize: "11.5px",
            fontWeight: 600,
            marginTop: "8px",
          }}
        >
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "2px" }}>
            <TypewriterRow
              label='Item Description'
              value={finalData.itemDescription || obs.itemDescription || "One loose stone"}
            />
            <TypewriterRow
              label='Weight'
              value={gem.weight ? `${gem.weight.toFixed(2)} ct` : undefined}
            />
            <TypewriterRow label='Shape' value={obs.shape || obs.cuttingShape} />
            <TypewriterRow label='Cutting Style: Crown' value={obs.crownStyle} />
            <TypewriterRow label='Cutting Style: Pavilion' value={obs.pavilionStyle} />
          </div>
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "2px" }}>
            <TypewriterRow
              label='Measurements'
              value={
                obs.messurementX
                  ? `${Number(obs.messurementX).toFixed(2)} x ${Number(obs.messurementY).toFixed(2)} x ${Number(obs.messurementZ).toFixed(2)} mm`
                  : undefined
              }
            />
            <TypewriterRow label='Transparency' value={obs.transparency} />
            <TypewriterRow label='Color' value={gem.color} />
          </div>
        </div>
      </div>

      {/* ── DIVIDER ── */}
      <div
        style={{
          height: "1px",
          backgroundColor: "#ddd",
          margin: "18px 0",
          position: "relative",
          zIndex: 2,
        }}
      />

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
        {/* Results */}
        <div>
          <Title>RESULTS</Title>
          <div
            style={{
              ...COURIER,
              fontSize: "11.5px",
              fontWeight: 600,
              display: "flex",
              flexDirection: "column",
              gap: "2px",
              marginTop: "8px",
            }}
          >
            <TypewriterRow label='Species' value={obs.species} />
            <TypewriterRow label='Variety' value={finalData.finalVariety || obs.variety} />
            <TypewriterRow label='Geographic Origin' value={obs.origin} />
            <TypewriterRow label='Clarity' value={obs.clarityGrade} />
          </div>

          {/* Comments paragraph */}
          <p
            style={{
              ...COURIER,
              fontSize: "11px",
              fontWeight: 600,
              marginTop: "12px",
              lineHeight: 1.55,
              textAlign: "justify",
            }}
          >
            Comments.{" "}
            {obs.comments ||
              "The geographic origin and color description are an expert opinion based on a collection of observations and analytical data."}
          </p>
        </div>

        {/* Treatment */}
        <div>
          <Title>TREATMENT</Title>
          <p style={{ ...COURIER, fontSize: "11.5px", fontWeight: 600, marginTop: "8px" }}>
            {obs.treatment || "None."}
          </p>
          {obs.specialNote && (
            <>
              <Title style={{ marginTop: "20px" }}>SPECIAL NOTE</Title>
              <p
                style={{
                  ...COURIER,
                  fontSize: "11px",
                  fontWeight: 600,
                  marginTop: "8px",
                  lineHeight: 1.55,
                  textAlign: "justify",
                }}
              >
                {obs.specialNote}
              </p>
            </>
          )}

          {/* Clarity table */}
          <div style={{ marginTop: "20px" }}>
            <table style={{ borderCollapse: "collapse", width: "100%" }}>
              <thead>
                <tr>
                  <td style={tdStyle} rowSpan={2}></td>
                  <td style={{ ...tdStyle, fontWeight: 700 }} colSpan={2}>
                    Loupe Clean
                  </td>
                  <td style={{ ...tdStyle, fontWeight: 700 }} colSpan={2}>
                    Eye Clean
                  </td>
                  <td style={{ ...tdStyle, fontWeight: 700 }} colSpan={2}>
                    Visible Inclusions
                  </td>
                  <td style={{ ...tdStyle, fontWeight: 700 }} colSpan={2}>
                    Highly Included
                  </td>
                </tr>
                <tr>
                  {[
                    "Minor\nInclusions",
                    "Highly\nIncluded",
                    "Minor\nInclusions",
                    "Highly\nIncluded",
                    "Minor\nInclusions",
                    "Highly\nIncluded",
                    "Minor\nInclusions",
                    "Highly\nIncluded",
                  ].map((t, i) => (
                    <td key={i} style={tdStyle}>
                      {t}
                    </td>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={{ ...tdStyle, fontWeight: 700 }}>Eye</td>
                  {["LC 1", "LC 2", "EC 1", "EC 2", "vl 1", "vl 2", "HI 1", "HI 2"].map((g, i) => (
                    <td key={i} style={tdStyle}>
                      {g}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ── GEM IMAGE + NAME + SIGNATURE/QR ── */}
      <div
        style={{
          display: "flex",
          flex: 1,
          alignItems: "flex-end",
          justifyContent: "space-between",
          position: "relative",
          zIndex: 2,
          paddingTop: "20px",
        }}
      >
        {/* Left: Image + name */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
          {/* Image box */}
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
              <GemImage imageId={firstImageId} className='w-full h-full object-contain' />
            ) : (
              <ImageIcon style={{ width: "48px", height: "48px", color: "#d1d5db" }} />
            )}
          </div>
          <p
            style={{
              fontFamily: "Arial, sans-serif",
              fontSize: "9px",
              color: "#888",
              marginTop: "4px",
              marginBottom: "8px",
            }}
          >
            Image is approximate
          </p>

          {/* Gem name + weight */}
          <div style={{ textAlign: "left" }}>
            <p
              style={{
                fontFamily: "'Nimbus Mono', 'Courier New', Courier, monospace",
                fontSize: "22px",
                fontWeight: 900,
                color: "#C5A259",
                margin: 0,
                letterSpacing: "0.5px",
              }}
            >
              {finalData.finalVariety || obs.variety || "—"}
            </p>
            {gem.weight && (
              <p
                style={{
                  fontFamily: "'Nimbus Mono', 'Courier New', Courier, monospace",
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
        </div>

        {/* Right: QR + Signature */}
        <div
          style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "10px" }}
        >
          {/* QR + Signature side by side */}
          <div style={{ display: "flex", alignItems: "flex-end", gap: "12px" }}>
            <QRCode value={verificationUrl} size={75} />
            <img
              src={signatureImg}
              alt='Signature'
              style={{ height: "175px", objectFit: "contain" }}
            />
          </div>

          {/* Footer */}
          <p
            style={{
              fontFamily: "Arial, sans-serif",
              fontSize: "8.5px",
              color: "#888",
              margin: 0,
              textAlign: "right",
            }}
          >
            For complete terms and updates, visit www.grc.lk
          </p>
        </div>
      </div>
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
