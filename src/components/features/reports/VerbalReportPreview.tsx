import { useState, useRef, useEffect } from "react"
import QRCode from "react-qr-code"
import { Download } from "lucide-react"
import { toPng } from "html-to-image"
import type { Gem } from "@/lib/types"
import { GemImage } from "../gems/GemImage"
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

export function VerbalReportPreview({ gem, reportId }: VerbalReportPreviewProps) {
  const [downloading, setDownloading] = useState(false)
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

  return (
    <div
      ref={containerRef}
      className='flex flex-col w-full max-w-[826px] mx-auto overflow-hidden pb-8'
      style={{ colorScheme: "light" }}
    >
      <div className='flex items-center justify-end w-full mb-6 print:hidden'>
        <button
          onClick={handleDownload}
          disabled={downloading}
          className='flex items-center gap-1.5 px-4 py-2 text-sm font-medium bg-slate-800 text-white rounded-md hover:bg-slate-700 disabled:opacity-50 transition-colors'
        >
          <Download className='w-4 h-4' />
          {downloading ? "Exporting..." : "Download Report"}
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
          <VerbalContent gem={gem} reportId={reportId} />
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
          <VerbalContent gem={gem} reportId={reportId} />
        </div>
      </div>
    </div>
  )
}

function VerbalContent({ gem, reportId }: { gem: Gem; reportId?: string }) {
  const finalData = gem.finalApproval || {}
  const obs = finalData.finalObservations || {}
  const verificationUrl = `${window.location.origin}/reports/${reportId || gem._id}`
  const firstImageId = gem.images && gem.images.length > 0 ? gem.images[0] : null

  const GOLD = "#D4AF37"
  const DARK = "#111111"

  const variety = finalData.finalVariety || obs.variety || ""
  const isJewelry =
    (finalData.itemDescription || obs.itemDescription || gem.itemDescription || "")
      .toLowerCase()
      .includes("bracelet") ||
    variety.toLowerCase().includes("bracelet")

  const weightUnit = isJewelry ? "g" : "ct"
  const weightStr = gem.weight ? `${gem.weight} ${weightUnit}` : ""

  const formatDate = (d?: string | Date) =>
    d ? new Date(d).toLocaleDateString("en-GB") : new Date().toLocaleDateString("en-GB")

  const heatStatement = obs.showHeatInReport
    ? obs.isHeated
      ? "Evidence of heat treatment has been detected."
      : "No indications of heating have been detected."
    : ""

  const statement = [
    `The submitted specimen has been examined and identified as a natural`,
    variety ? `${variety}` : "gemstone",
    obs.species ? `(${obs.species})` : "",
    weightStr ? `weighing ${weightStr}.` : ".",
    obs.shape || obs.cuttingShape
      ? `The stone is ${obs.shape || obs.cuttingShape} shaped`
      : "",
    obs.crownStyle || obs.cuttingStyle
      ? `with a ${obs.crownStyle || obs.cuttingStyle} cut.`
      : obs.shape || obs.cuttingShape
      ? "."
      : "",
    gem.color ? `The color is ${gem.color}.` : "",
    obs.transparency ? `Transparency: ${obs.transparency}.` : "",
    obs.clarityGrade ? `Clarity grade: ${obs.clarityGrade}.` : "",
    heatStatement,
    obs.comments ? `Additional observations: ${obs.comments}.` : "",
  ]
    .filter(Boolean)
    .join(" ")

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
          padding: "44px 52px 36px 52px",
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
          <div
            style={{
              width: "110px",
              height: "110px",
              border: "1px solid #ccc",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              overflow: "hidden",
              flexShrink: 0,
            }}
          >
            {firstImageId ? (
              <GemImage imageId={firstImageId} className='w-full h-full object-contain' />
            ) : (
              <img src={turtlesLogo} style={{ opacity: 0.1, width: "100%", height: "100%", objectFit: "contain" }} alt='' />
            )}
          </div>
        </div>

        {/* Divider */}
        <div style={{ borderBottom: `2px solid ${GOLD}`, margin: "20px 0 24px 0" }} />

        {/* Meta row */}
        <div
          style={{
            display: "flex",
            gap: "40px",
            fontSize: "12px",
            fontFamily: "'Nimbus Mono', 'Courier New', Courier, monospace",
            color: DARK,
            marginBottom: "24px",
          }}
        >
          {gem.gemId && <span><strong>GRC No:</strong> {gem.gemId}</span>}
          <span><strong>Date:</strong> {formatDate(gem.updatedAt)}</span>
          {weightStr && <span><strong>Weight:</strong> {weightStr}</span>}
        </div>

        {/* Verbal statement */}
        <div
          style={{
            flex: 1,
            fontSize: "15px",
            lineHeight: "1.85",
            color: DARK,
            fontFamily: "'Nimbus Mono Antique', 'Courier New', Courier, monospace",
            fontWeight: 400,
            maxWidth: "600px",
          }}
        >
          {statement}
        </div>

        {/* Footer row: signature + QR */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
            marginTop: "16px",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column" }}>
            <img
              src={signatureImg}
              alt='Signature'
              style={{ height: "130px", objectFit: "contain", marginLeft: "-8px" }}
            />
            <span
              style={{
                fontSize: "10px",
                color: "#555",
                fontFamily: "Arial, sans-serif",
                marginTop: "2px",
              }}
            >
              R. Milinda Edirisinghe — Authorized Signature
            </span>
            <span style={{ fontSize: "9px", color: "#888", fontFamily: "Arial, sans-serif" }}>
              Gemological Report of Ceylon (Pvt) Ltd
            </span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "6px" }}>
            <QRCode value={verificationUrl} size={72} />
            <span style={{ fontSize: "9px", color: "#888", fontFamily: "Arial, sans-serif" }}>
              Scan to verify
            </span>
          </div>
        </div>
      </div>
    </>
  )
}
