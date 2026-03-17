import { useState, useRef, useEffect } from "react"
import QRCode from "react-qr-code"
import { Download } from "lucide-react"
import { toPng } from "html-to-image"
import { cn } from "@/lib/utils"
import type { Gem } from "@/lib/types"
import { GemImage } from "../gems/GemImage"
import turtlesLogo from "@/assets/Turtles.png"
import signatureImg from "@/assets/signature.png"

interface MediumReportPreviewProps {
  gem: Gem
  includeLogo: boolean
  reportId?: string
}

const SCALE_FACTOR = 3

export function MediumReportPreview({ gem, reportId }: MediumReportPreviewProps) {
  const [view, setView] = useState<"inner" | "outer">("inner")
  const [downloading, setDownloading] = useState(false)

  const innerRef = useRef<HTMLDivElement>(null)
  const outerRef = useRef<HTMLDivElement>(null)

  const containerRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(1)

  useEffect(() => {
    const updateScale = () => {
      if (containerRef.current) {
        const parentWidth = containerRef.current.parentElement?.clientWidth || window.innerWidth
        const availableWidth = parentWidth - 32 // padding
        if (availableWidth < 1120) {
          setScale(availableWidth / 1120)
        } else {
          setScale(1)
        }
      }
    }

    setTimeout(updateScale, 10)
    window.addEventListener("resize", updateScale)
    return () => window.removeEventListener("resize", updateScale)
  }, [])

  const handleDownload = async () => {
    const activeRef = view === "inner" ? innerRef.current : outerRef.current
    if (!activeRef) return

    setDownloading(true)
    try {
      const dataUrl = await toPng(activeRef, {
        pixelRatio: SCALE_FACTOR,
        cacheBust: true,
      })
      const link = document.createElement("a")
      link.download = `GRC-${gem.gemId || gem._id}-A5-${view}.png`
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
      className='flex flex-col w-full max-w-[1240px] mx-auto overflow-hidden pb-8'
      style={{ colorScheme: "light" }}
    >
      <div className='flex items-center justify-between w-full mb-6 print:hidden'>
        <div className='flex items-center gap-2 bg-slate-100 p-1 rounded-lg'>
          <button
            onClick={() => setView("inner")}
            className={cn(
              "px-4 py-1.5 text-sm font-medium rounded-md transition-all",
              view === "inner"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-700",
            )}
          >
            Front (Report)
          </button>
          <button
            onClick={() => setView("outer")}
            className={cn(
              "px-4 py-1.5 text-sm font-medium rounded-md transition-all",
              view === "outer"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-700",
            )}
          >
            Back (Cover)
          </button>
        </div>

        <button
          onClick={handleDownload}
          disabled={downloading}
          className='flex items-center gap-1.5 px-4 py-2 text-sm font-medium bg-slate-800 text-white rounded-md hover:bg-slate-700 disabled:opacity-50 transition-colors'
        >
          <Download className='w-4 h-4' />
          {downloading ? "Exporting..." : "Download " + (view === "inner" ? "Report" : "Cover")}
        </button>
      </div>

      {/* Interactive Screen Preview */}
      <div className='w-full flex justify-center' style={{ height: `${792 * scale}px` }}>
        <div
          className='relative transition-all duration-300 bg-white shadow-2xl rounded-sm overflow-hidden text-slate-900 border border-slate-200 flex flex-row'
          style={{
            width: "1120px",
            minWidth: "1120px",
            height: "792px",
            minHeight: "792px",
            flexShrink: 0,
            transform: `scale(${scale})`,
            transformOrigin: "top center",
          }}
        >
          {view === "inner" ? <DetailView gem={gem} reportId={reportId} /> : <CoverView />}
        </div>
      </div>

      {/* CAPTURE ENGINE ISOLATION */}
      <div
        style={{
          position: "fixed",
          left: "-9999px",
          top: "0",
          zIndex: -1,
          pointerEvents: "none",
        }}
      >
        <div
          ref={innerRef}
          style={{
            width: "1120px",
            height: "792px",
            backgroundColor: "#ffffff",
            display: "flex",
            flexDirection: "row",
            position: "relative",
            overflow: "hidden",
            color: "#1e293b",
          }}
        >
          <DetailView gem={gem} reportId={reportId} />
        </div>

        <div
          ref={outerRef}
          style={{
            width: "1120px",
            height: "792px",
            backgroundColor: "#ffffff",
            display: "flex",
            flexDirection: "row",
            position: "relative",
            overflow: "hidden",
            color: "#1e293b",
          }}
        >
          <CoverView />
        </div>
      </div>
    </div>
  )
}

function DetailView({ gem, reportId }: { gem: Gem; reportId?: string }) {
  const finalData = gem.finalApproval || {}
  const obs = finalData.finalObservations || {}
  const verificationUrl = `${window.location.origin}/reports/${reportId || gem._id}`
  const firstImageId = gem.images && gem.images.length > 0 ? gem.images[0] : null

  const GOLD = "#D4AF37"
  const DARK = "#111111"

  const formatDate = (dateString?: string | Date) => {
    if (!dateString) return new Date().toLocaleDateString("en-GB")
    return new Date(dateString).toLocaleDateString("en-GB")
  }

  const isJewelry =
    (finalData.itemDescription || obs.itemDescription || gem.itemDescription || "")
      .toLowerCase()
      .includes("bracelet") ||
    (finalData.finalVariety || obs.variety || "").toLowerCase().includes("bracelet")

  const displayWeight = gem.weight ? `${gem.weight} ${isJewelry ? "g" : "ct"}` : ""

  const rowsBlock1 = [
    { label: "Date", value: formatDate(gem.updatedAt) },
    { label: "GRC Number", value: gem.gemId },
    {
      label: "Description",
      value: finalData.itemDescription || obs.itemDescription || gem.itemDescription,
    },
    { label: "Weight", value: displayWeight || undefined },
    { label: "Color", value: gem.color },
    { label: "Shape", value: obs.shape || obs.cuttingShape },
    { label: "Cut", value: obs.cut || obs.cuttingStyle },
    {
      label: "Measurements (Approx)",
      value: obs.messurementX
        ? `${obs.messurementX} x ${obs.messurementY} x ${obs.messurementZ} mm`
        : undefined,
    },
    { label: "Transparency", value: obs.transparency },
    { label: "Clarity", value: obs.clarityGrade },
  ]

  const rowsBlock2 = [
    { label: "Species", value: obs.species },
    { label: "Variety", value: finalData.finalVariety || obs.variety },
    { label: "Comments", value: obs.comments },
    { label: "Treatment", value: obs.treatment },
  ]

  const TypewriterRow = ({ label, value }: { label: string; value?: string | number }) => (
    <div style={{ display: "flex", alignItems: "baseline", width: "100%", gap: "10px" }}>
      <span style={{ flexShrink: 0, paddingRight: "8px" }}>{label}:</span>
      <div
        style={{
          flexGrow: 1,
          borderBottom: "1.5px dotted #a3a3a3",
          margin: "0 6px",
          position: "relative",
        }}
      ></div>
      <span style={{ flexShrink: 0, paddingLeft: "8px", textAlign: "right", whiteSpace: "nowrap" }}>
        {value || ""}
      </span>
    </div>
  )

  const tdStyle = {
    border: "1px solid #111",
    padding: "6px 2px",
    verticalAlign: "middle",
  }

  const tdStyleCell = {
    border: "1px solid #111",
    padding: "6px 2px",
    fontSize: "8px",
    lineHeight: "1.2",
    verticalAlign: "middle",
  }

  const tdStyleBold = {
    border: "1px solid #111",
    padding: "8px 2px",
    fontWeight: "bold",
    verticalAlign: "middle",
  }

  return (
    <>
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          opacity: 0.04,
          pointerEvents: "none",
        }}
      >
        <img
          src={turtlesLogo}
          alt='Watermark'
          style={{
            width: "600px",
            height: "600px",
            objectFit: "contain",
            filter: "grayscale(100%)",
          }}
        />
      </div>

      {/* LEFT PANEL */}
      <div
        style={{
          flex: "0 0 55%",
          width: "55%",
          height: "100%",
          padding: "70px 40px 50px 70px",
          display: "flex",
          flexDirection: "column",
          boxSizing: "border-box",
          position: "relative",
          zIndex: 2,
        }}
      >
        <h1
          style={{
            color: GOLD,
            fontSize: "26px",
            fontWeight: 700,
            textTransform: "uppercase",
            margin: "0 0 50px 0",
            letterSpacing: "0.5px",
            fontFamily: "'Times New Roman', Times, serif",
          }}
        >
          GEMOLOGICAL REPORT OF CEYLON
        </h1>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "7px",
            color: DARK,
            fontSize: "14px",
            fontFamily: "'Courier New', Courier, monospace",
            fontWeight: 600,
            width: "100%",
            maxWidth: "480px",
          }}
        >
          {rowsBlock1.map((row, i) => (
            <TypewriterRow key={`r1-${i}`} label={row.label} value={row.value} />
          ))}
        </div>

        <div style={{ height: "40px" }}></div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "7px",
            color: DARK,
            fontSize: "14px",
            fontFamily: "'Courier New', Courier, monospace",
            fontWeight: 600,
            width: "100%",
            maxWidth: "480px",
          }}
        >
          {rowsBlock2.map((row, i) => (
            <TypewriterRow key={`r2-${i}`} label={row.label} value={row.value} />
          ))}
          <br />
          <div
            style={{
              fontFamily: "'Courier New', Courier, monospace",
              fontSize: "13px",
              color: "#333",
              marginTop: "4px",
              maxWidth: "480px",
              lineHeight: "1.5",
              fontWeight: 600,
            }}
          >
            {finalData.finalVariety || obs.variety || "Blue Sapphires"} (4.15 ct) set with 160
            Diamonds (0.79 ct) <br /> mounted on 18K white gold bracelet. <br />
            <span style={{ fontSize: "10px", fontWeight: "normal" }}>
              (Based on customer references)
            </span>
          </div>
        </div>

        {/* The Clarity Scale Table */}
        <div
          style={{
            marginTop: "auto",
            marginBottom: "0px",
            fontFamily: "Arial, sans-serif",
            fontSize: "8px",
            color: "#111",
            width: "100%",
            maxWidth: "460px",
          }}
        >
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "center" }}>
            <tbody>
              <tr>
                <td style={tdStyle}>Excellent</td>
                <td style={tdStyle} colSpan={2}>
                  Loupe Clean
                </td>
                <td style={tdStyle} colSpan={2}>
                  Eye Clean
                </td>
                <td style={tdStyle} colSpan={2}>
                  Visible Inclusions
                </td>
                <td style={tdStyle} colSpan={2}>
                  Highly Included
                </td>
              </tr>
              <tr>
                <td rowSpan={2} style={{ ...tdStyle, fontWeight: "bold", fontSize: "10px" }}>
                  Exc
                </td>
                <td style={tdStyleCell}>
                  Minor
                  <br />
                  Inclusions
                </td>
                <td style={tdStyleCell}>
                  Highly
                  <br />
                  Included
                </td>
                <td style={tdStyleCell}>
                  Minor
                  <br />
                  Inclusions
                </td>
                <td style={tdStyleCell}>
                  Highly
                  <br />
                  Included
                </td>
                <td style={tdStyleCell}>
                  Minor
                  <br />
                  Inclusions
                </td>
                <td style={tdStyleCell}>
                  Highly
                  <br />
                  Included
                </td>
                <td style={tdStyleCell}>
                  Minor
                  <br />
                  Inclusions
                </td>
                <td style={tdStyleCell}>
                  Highly
                  <br />
                  Included
                </td>
              </tr>
              <tr>
                <td style={tdStyleBold}>LC 1</td>
                <td style={tdStyleBold}>LC 2</td>
                <td style={tdStyleBold}>EC 1</td>
                <td style={tdStyleBold}>EC 2</td>
                <td style={tdStyleBold}>VI 1</td>
                <td style={tdStyleBold}>VI 2</td>
                <td style={tdStyleBold}>HI 1</td>
                <td style={tdStyleBold}>HI 2</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div
          style={{
            fontSize: "10px",
            color: "#666",
            fontFamily: "Arial, sans-serif",
            marginTop: "40px",
          }}
        >
          For complete terms and updates, visit www.grc.lk
        </div>
      </div>

      {/* RIGHT PANEL */}
      <div
        style={{
          flex: "0 0 45%",
          width: "45%",
          height: "100%",
          padding: "70px 80px 50px 20px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          boxSizing: "border-box",
          position: "relative",
          zIndex: 2,
        }}
      >
        <div
          style={{
            width: "320px",
            height: "300px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: "15px",
          }}
        >
          {firstImageId ? (
            <GemImage imageId={firstImageId} className='w-full h-full object-contain' />
          ) : (
            <img
              src={turtlesLogo}
              style={{ opacity: 0.1, width: "100%", height: "100%", objectFit: "contain" }}
              alt=''
            />
          )}
        </div>

        <div
          style={{
            fontFamily: "Arial, sans-serif",
            fontSize: "11px",
            color: "#666",
            marginBottom: "40px",
          }}
        >
          Image is approximate
        </div>

        <div
          style={{
            textAlign: "center",
            width: "100%",
            fontFamily: "'Courier New', Courier, monospace",
          }}
        >
          <h2
            style={{
              fontSize: "30px",
              fontWeight: 900,
              margin: 0,
              textTransform: "uppercase",
              color: "#111",
              letterSpacing: "0.5px",
              fontFamily: "'Courier New', Courier, monospace",
            }}
          >
            {finalData.finalVariety || obs.variety || "BLUE SAPPHIRE"}
          </h2>
          {(finalData.itemDescription || gem.itemDescription || "BRACELET") && (
            <h2
              style={{
                fontSize: "26px",
                fontWeight: 800,
                margin: "16px 0 0 0",
                textTransform: "uppercase",
                color: "#111",
                letterSpacing: "0.5px",
              }}
            >
              {finalData.itemDescription || gem.itemDescription || "BRACELET"}
            </h2>
          )}
          {gem.weight && (
            <div
              style={{
                marginTop: "20px",
                fontSize: "22px",
                fontWeight: 600,
                color: "#333",
                letterSpacing: "1px",
              }}
            >
              {displayWeight}
            </div>
          )}
        </div>

        {/* QR Code and Signature at Bottom Right */}
        <div
          style={{
            marginTop: "auto",
            width: "100%",
            display: "flex",
            justifyContent: "flex-end",
            alignItems: "flex-end",
            gap: "25px",
            paddingRight: "10px",
          }}
        >
          <div style={{ marginBottom: "15px" }}>
            <QRCode value={verificationUrl} size={70} />
          </div>

          <img
            src={signatureImg}
            alt='Signature'
            style={{
              height: "255px",
              marginBottom: "5px",
              objectFit: "contain",
              alignSelf: "center",
              marginLeft: "15px",
            }}
          />
        </div>
      </div>
    </>
  )
}

function CoverView() {
  const GOLD = "#D4AF37"
  const serif = "'Times New Roman', serif"
  return (
    <>
      <div
        className='h-full bg-white relative flex flex-col items-center justify-center p-12 border-r border-slate-100'
        style={{ flex: "0 0 50%", width: "50%" }}
      >
        <div className='absolute left-0 top-0 bottom-0 w-4' style={{ backgroundColor: GOLD }}></div>

        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            opacity: 0.04,
            pointerEvents: "none",
          }}
        >
          <img
            src={turtlesLogo}
            alt='Watermark'
            style={{
              width: "400px",
              height: "400px",
              objectFit: "contain",
              filter: "grayscale(100%)",
            }}
          />
        </div>

        <div className='flex-1 flex items-center justify-center relative z-10'>
          <div style={{ width: "260px", height: "260px", color: GOLD }}>
            <svg viewBox='0 0 100 100' fill='none' stroke='currentColor' strokeWidth='1.2'>
              <path d='M50 20 C35 20 25 35 25 50 C25 65 35 80 50 80 C65 80 75 65 75 50 C75 35 65 20 50 20 Z' />
              <path d='M50 20 L50 80 M25 50 L75 50' strokeWidth='0.8' />
              <circle cx='50' cy='15' r='7' />
            </svg>
          </div>
        </div>
        <div className='absolute bottom-16 w-full text-center z-10'>
          <p className='font-bold text-[#1a1a1a] text-base'>
            Gemological Report Of Ceylon (Pvt) Ltd
          </p>
          <p className='text-xs mt-1 text-slate-500'>info@grc.lk | www.grc.lk</p>
        </div>
      </div>

      <div
        className='h-full bg-white relative flex flex-col items-center justify-center p-12'
        style={{ flex: "0 0 50%", width: "50%" }}
      >
        <h1
          style={{
            color: GOLD,
            fontSize: "160px",
            fontWeight: 700,
            fontFamily: serif,
            margin: 0,
            lineHeight: 1,
          }}
        >
          GRC
        </h1>
        <p
          style={{
            color: GOLD,
            fontSize: "22px",
            letterSpacing: "0.4em",
            fontWeight: 800,
            marginTop: "10px",
            textTransform: "uppercase",
            fontFamily: serif,
          }}
        >
          Gemological Report of Ceylon
        </p>
      </div>
    </>
  )
}
