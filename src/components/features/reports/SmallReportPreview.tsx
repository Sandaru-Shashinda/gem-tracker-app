import { useState, useRef } from "react"
import QRCode from "react-qr-code"
import { ImageIcon, Repeat, Download } from "lucide-react"
import { toPng } from "html-to-image"
import { cn } from "@/lib/utils"
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

const DOWNLOAD_SCALE = 3

export function SmallReportPreview({ gem, reportId }: SmallReportPreviewProps) {
  const finalData = gem.finalApproval || {}
  const obs = finalData.finalObservations || {}
  const verificationUrl = `${window.location.origin}/reports/${reportId || gem._id}`

  const [cardSide, setCardSide] = useState<"front" | "back">("front")
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
    {
      label: "Shape & Cut",
      value: `${obs.cuttingShape || ""} ${obs.cut || ""}`.trim() || undefined,
    },
    {
      label: "Dimension",
      value: obs.messurementX
        ? `${obs.messurementX} x ${obs.messurementY} x ${obs.messurementZ} mm`
        : undefined,
    },
    { label: "Color", value: gem.color },
    { label: "Species", value: obs.species },
    { label: "Variety", value: obs.variety },
    { label: "Comments", value: obs.treatment || "" },
  ]

  return (
    <div className='flex flex-col items-center justify-start font-serif text-slate-900'>
      {/* View Toggle */}
      <div className='flex items-center gap-2 mb-6 bg-slate-100 p-1 rounded-lg print:hidden'>
        <button
          onClick={() => setCardSide("front")}
          className={cn(
            "px-4 py-1.5 text-sm font-medium rounded-md transition-all",
            cardSide === "front"
              ? "bg-white text-slate-900 shadow-sm"
              : "text-slate-500 hover:text-slate-700",
          )}
        >
          Front View
        </button>
        <button
          onClick={() => setCardSide("back")}
          className={cn(
            "px-4 py-1.5 text-sm font-medium rounded-md transition-all",
            cardSide === "back"
              ? "bg-white text-slate-900 shadow-sm"
              : "text-slate-500 hover:text-slate-700",
          )}
        >
          Back View
        </button>
      </div>

      {/* CARD CONTAINER */}
      <div className='relative transition-all duration-300 w-full flex justify-center'>
        {/* ── FRONT VIEW (original, untouched) ── */}
        <div
          id='small-report-front-view'
          className={cn(
            "bg-white shadow-xl overflow-hidden flex flex-col items-center text-center",
            cardSide === "front" ? "relative" : "absolute opacity-0 pointer-events-none z-[-1]",
          )}
          style={{
            width: "340px",
            height: "540px",
            borderRadius: "20px",
            boxShadow: "0 10px 30px -5px rgba(0,0,0,0.15)",
          }}
        >
          {/* Turtle Icon */}
          <div className='mt-12 mb-2 text-[#D4AF37]'>
            <svg viewBox='0 0 24 24' fill='currentColor' className='w-16 h-16'>
              <path
                d='M12 2C13 5 14 7 12 9C10 7 9 5 12 2ZM6.5 7C7.5 9.5 9 11 11 11.5C9 12 7.5 13 6.5 15.5C5.5 13 4 11.5 6.5 11.5C9 11 10.5 9.5 6.5 7ZM17.5 7C13.5 9.5 15 11 17.5 11.5C20 11.5 18.5 13 17.5 15.5C16.5 13 15 12 13 11.5C15 11 16.5 9.5 17.5 7ZM12 4.5C14.5 5.5 16 7.5 16.5 10C17 12.5 16 15 14 16.5L14 18.5L15 20L12 21.5L9 20L10 18.5L10 16.5C8 15 7 12.5 7.5 10C8 7.5 9.5 5.5 12 4.5Z'
                fill='currentColor'
                fillOpacity='0.8'
              />
            </svg>
          </div>

          {/* GRC Logo */}
          <div className='flex justify-center mb-6 mt-4'>
            <img
              src={grcMemoLogo}
              alt='GRC Logo'
              style={{ height: "60px", objectFit: "contain" }}
            />
          </div>

          {/* 3 Gems */}
          <div className='flex justify-center gap-6 my-10'>
            <div className='w-12 h-14 bg-linear-to-br from-blue-700 to-blue-900 shadow-md border border-white/20 relative rounded-[4px]'>
              <div className='absolute inset-2 border border-blue-400/30 opacity-50'></div>
            </div>
            <div className='w-12 h-14 bg-linear-to-br from-green-600 to-green-800 shadow-md border border-white/20 relative rounded-[4px]'>
              <div className='absolute inset-2 border border-green-400/30 opacity-50'></div>
            </div>
            <div className='w-12 h-14 bg-linear-to-br from-red-600 to-red-800 shadow-md border border-white/20 relative rounded-[4px]'>
              <div className='absolute inset-2 border border-red-400/30 opacity-50'></div>
            </div>
          </div>

          {/* Footer */}
          <div className='mt-auto w-full pb-8'>
            <div className='mb-8 px-4'>
              <h2 className='text-[#D4AF37] font-bold text-sm tracking-widest leading-relaxed uppercase'>
                Gemological Report <br /> of Ceylon
              </h2>
            </div>
            <div className='px-6 text-[9px] text-slate-400 font-sans leading-relaxed'>
              <p>No.97, Galle Rd, Colombo 03, Sri Lanka. | www.grc.lk</p>
              <p>Email: info@grc.lk | Whatsapp: +94 778204525</p>
            </div>
          </div>
        </div>

        {/* ── BACK VIEW — CR80 credit card: 640×400px ── */}
        <div
          className={cn(cardSide === "back" ? "relative" : "absolute pointer-events-none")}
          style={{
            opacity: cardSide === "back" ? 1 : 0,
            zIndex: cardSide === "back" ? 1 : -1,
          }}
        >
          <div
            id='small-report-back-view'
            ref={backRef}
            style={{
              width: "640px",
              height: "400px",
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
                top: "43%",
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
                style={{ width: "500px", height: "700px", objectFit: "contain" }}
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
                  // overflow: "hidden",
                }}
              >
                <img src={grcMemoLogo} alt='GRC Logo' style={{ height: "175px" }} />
              </div>

              {/* Data rows */}
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 4,
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
                        borderBottom: "1.5px dotted #a3a3a3",
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
                {obs.isHeated === false && (
                  <p
                    style={{
                      fontWeight: 700,
                      fontSize: "14px",
                      color: "#1e293b",
                      lineHeight: 1.2,
                      margin: 0,
                      marginBottom: "4px",
                    }}
                  >
                    Un - Heated
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
      </div>

      {/* Footer row */}
      <div className='mt-4 flex items-center gap-4 print:hidden'>
        <p className='text-xs text-slate-400 italic flex items-center gap-1'>
          <Repeat className='w-3 h-3' />
          Switch view to verify Front/Back printing details
        </p>
        {cardSide === "back" && (
          <button
            onClick={handleDownload}
            disabled={downloading}
            className='flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-slate-800 text-white rounded-md hover:bg-slate-700 disabled:opacity-50 transition-colors'
          >
            <Download className='w-3 h-3' />
            {downloading ? "Exporting..." : "Download Card"}
          </button>
        )}
      </div>
    </div>
  )
}
