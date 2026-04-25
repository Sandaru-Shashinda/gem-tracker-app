import { useState, useRef } from "react"
import QRCode from "react-qr-code"
import { ImageIcon, Download } from "lucide-react"
import { toPng } from "html-to-image"
import type { Gem } from "@/lib/types"
import { GemImage } from "../gems/GemImage"
import turtlesLogo from "@/assets/Turtles.png"
import signatureImg from "@/assets/signature1.png"
import grcMemoLogo from "@/assets/grc_memo_logo.png"

interface SmallReportPreviewProps {
  gem: Gem
  includeLogo: boolean
  reportId?: string
}

const CARD_WIDTH = 640
const CARD_HEIGHT = 403.5
const DOWNLOAD_SCALE = 3

export function SmallReportPreview({ gem, reportId }: SmallReportPreviewProps) {
  const finalData = gem.finalApproval || {}
  const obs = finalData.finalObservations || {}
  const verificationUrl = `${window.location.origin}/reports/${reportId || gem._id}`

  const [downloading, setDownloading] = useState(false)
  const firstImageId = gem.images && gem.images.length > 0 ? gem.images[0] : null
  const backRef = useRef<HTMLDivElement>(null)

  const handleDownload = async () => {
    if (!backRef.current) return
    setDownloading(true)
    try {
      const dataUrl = await toPng(backRef.current, {
        pixelRatio: DOWNLOAD_SCALE,
        cacheBust: true,
      })
      const link = document.createElement("a")
      link.download = `GRC-${gem.gemId || gem._id}-card.png`
      link.href = dataUrl
      link.click()
    } catch (err) {
      console.error("Download failed", err)
    } finally {
      setDownloading(false)
    }
  }

  const rows = [
    { label: "GRC Number", value: gem.gemId },
    { label: "Date", value: new Date(gem.updatedAt).toLocaleDateString("en-GB") },
    { label: "Weight", value: gem.weight ? `${gem.weight} ct` : undefined },
    { label: "Color", value: gem.color },
    {
      label: "Shape & Cut",
      value: obs.isMixCut
        ? `${obs.cuttingShape || ""} mix cut`.trim() || undefined
        : obs.cuttingShape || undefined,
    },
    {
      label: "Dimension",
      value: obs.messurementX
        ? `${obs.messurementX} x ${obs.messurementY} x ${obs.messurementZ} mm`
        : undefined,
    },
    { label: "Species", value: obs.species },
    { label: "Variety", value: obs.variety },
    { label: "Comments", value: obs.comments },
  ]

  return (
    <div className='flex flex-col items-center justify-start font-serif text-slate-900'>
      {/* CARD CONTAINER */}
      <div className='relative w-full flex justify-center'>
        <div
          id='small-report-back-view'
          ref={backRef}
          style={{
            width: `${CARD_WIDTH}px`,
            height: `${CARD_HEIGHT}px`,
            backgroundColor: "#ffffff",
            overflow: "hidden",
            display: "flex",
            border: "1px solid #e2e8f0",
            padding: "30px 30px 24px 30px",
            boxSizing: "border-box",
            position: "relative",
            boxShadow: "0 10px 30px -5px rgba(0,0,0,0.15)",
          }}
        >
          {/* Watermark */}
          <div
            style={{
              position: "absolute",
              top: "50%",
              left: "38%",
              transform: "translate(-50%, -50%)",
              opacity: 1,
              pointerEvents: "none",
              zIndex: 0,
            }}
          >
            <img
              src={turtlesLogo}
              alt=''
              style={{ width: "600px", height: "900px", objectFit: "contain" }}
            />
          </div>

          {/* ── LEFT COLUMN ── */}
          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              marginRight: "65px",
              position: "relative",
              minWidth: 0,
            }}
          >
            {/* Logo */}
            <div
              style={{
                width: "175px",
                marginTop: "-60px",
                zIndex: 1,
                marginLeft: "-15px",
              }}
            >
              <img src={grcMemoLogo} alt='GRC Logo' style={{ height: "175px" }} />
            </div>

            {/* Data rows */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 3,
                fontSize: "14px",
                marginTop: "-57px",
                padding: "10px 0",
                fontFamily: "Arial, Helvetica, sans-serif",
                color: "#1a1a1a",
                lineHeight: 1.3,
                flex: 1,
                zIndex: 2,
              }}
            >
              {rows.map((row, i) => (
                <div key={i} style={{ display: "flex" }}>
                  <span style={{ whiteSpace: "nowrap", paddingRight: "4px", minWidth: "10px" }}>
                    {row.label}:
                  </span>
                  <span
                    style={{
                      flex: 1,
                      borderBottom: "2px dotted #a3a3a3",
                      position: "relative",
                      top: "-4px",
                      minWidth: "20px",
                    }}
                  />
                  <span
                    style={{
                      whiteSpace: "nowrap",
                      paddingLeft: "6px",
                      maxWidth: "220px",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {row.value || " "}
                  </span>
                </div>
              ))}
            </div>

            {/* Signature */}
            <img
              src={signatureImg}
              alt='Signature'
              style={{
                height: "450px",
                objectFit: "contain",
                marginTop: "-22px",
                marginLeft: "-12px",
                maxWidth: "58%",
                clipPath: "inset(25% 0 10% 0)",
              }}
            />
          </div>

          {/* ── RIGHT COLUMN ── */}
          <div
            style={{
              width: "160px",
              flexShrink: 0,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "flex-start",
              paddingTop: "4px",
              position: "relative",
              zIndex: 1,
            }}
          >
            {/* Gem image */}
            <div
              style={{
                width: "135px",
                height: "135px",
                backgroundColor: "#ffffff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                overflow: "hidden",
                border: "1px solid #666",
              }}
            >
              {firstImageId ? (
                <div
                  style={{
                    width: "85%",
                    height: "85%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <GemImage imageId={firstImageId} className='w-full h-full object-contain' />
                </div>
              ) : (
                <ImageIcon style={{ width: "48px", height: "48px", color: "#d1d5db" }} />
              )}
            </div>

            <p
              style={{
                fontSize: "9px",
                fontFamily: "Arial, Helvetica, sans-serif",
                color: "#888",
                textAlign: "center",
                marginTop: "5px",
                marginBottom: "16px",
                lineHeight: 1.3,
              }}
            >
              Image is approximate
            </p>

            {/* Gem name & weight */}
            <div
              style={{
                textAlign: "center",
                marginBottom: "16px",
                fontFamily: "Arial, Helvetica, sans-serif",
              }}
            >
              {obs.showHeatInReport && (
                <p
                  style={{
                    fontWeight: 600,
                    fontSize: "12px",
                    color: "#1e293b",
                    lineHeight: 1.2,
                    margin: 0,
                    marginBottom: "4px",
                  }}
                >
                  {obs.isHeated ? "Heated" : "Un - Heated"}
                </p>
              )}
              <p
                style={{
                  fontWeight: 700,
                  fontSize: "18px",
                  color: "#1e293b",
                  lineHeight: 1.2,
                  margin: 0,
                }}
              >
                {finalData.finalVariety || obs.variety || "—"}
              </p>

              <p
                style={{
                  fontSize: "16px",
                  color: "#1e293b",
                  fontWeight: 700,
                  marginTop: "4px",
                  margin: 0,
                }}
              >
                {gem.weight ? `${gem.weight} ct` : ""}
              </p>
            </div>

            {/* QR code */}
            <div style={{ marginTop: "0px", marginBottom: "4px" }}>
              <QRCode value={verificationUrl} size={88} />
            </div>
          </div>
        </div>
      </div>

      {/* Download button */}
      <div className='mt-4 flex justify-end w-full max-w-[640px] print:hidden'>
        <button
          onClick={handleDownload}
          disabled={downloading}
          className='flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-slate-800 text-white rounded-md hover:bg-slate-700 disabled:opacity-50 transition-colors'
        >
          <Download className='w-3 h-3' />
          {downloading ? "Exporting..." : "Download Card"}
        </button>
      </div>
    </div>
  )
}
