import { useState, useRef, useEffect } from "react"
import QRCode from "react-qr-code"
import { Download } from "lucide-react"
import { toPng } from "html-to-image"
import type { Gem } from "@/lib/types"
import { useRealSizeGemImage } from "../gems/RealSizeGemImage"
import { downloadReportPdf } from "@/lib/report-pdf"
import turtlesLogo from "@/assets/Turtles.png"
import signatureImg from "@/assets/signature1.png"

interface MediumReportPreviewProps {
  gem: Gem
  includeLogo: boolean
  reportId?: string
}

const SCALE_FACTOR = 3

export function MediumReportPreview({ gem, reportId }: MediumReportPreviewProps) {
  const [downloading, setDownloading] = useState(false)
  const [downloadingPdf, setDownloadingPdf] = useState(false)

  const innerRef = useRef<HTMLDivElement>(null)

  const containerRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(1)

  useEffect(() => {
    const updateScale = (width: number) => {
      const availableWidth = width - 32
      setScale(availableWidth < 1120 ? availableWidth / 1120 : 1)
    }

    const parent = containerRef.current?.parentElement
    if (!parent) return

    const observer = new ResizeObserver((entries) => {
      updateScale(entries[0].contentRect.width)
    })
    observer.observe(parent)
    updateScale(parent.clientWidth)

    return () => observer.disconnect()
  }, [])

  const handleDownload = async () => {
    if (!innerRef.current) return

    setDownloading(true)
    try {
      const dataUrl = await toPng(innerRef.current, {
        pixelRatio: SCALE_FACTOR,
        cacheBust: true,
      })
      const link = document.createElement("a")
      link.download = `GRC-${gem.gemId || gem._id}-report.png`
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
        reportSize: "medium",
        fileName: `GRC-${gem.gemId || gem._id}-report-1to1.pdf`,
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
      className='flex flex-col w-full max-w-[1240px] mx-auto overflow-hidden pb-8'
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

      {/* Interactive Screen Preview */}
      <div
        style={{
          width: `${1120 * scale}px`,
          height: `${792 * scale}px`,
          margin: "0 auto",
        }}
      >
        <div
          className='relative transition-all duration-300 bg-white rounded-sm overflow-hidden text-slate-900 border-2 border-slate-400 flex flex-row'
          style={{
            width: "1120px",
            height: "792px",
            transform: `scale(${scale})`,
            transformOrigin: "top left",
          }}
        >
          <DetailView gem={gem} reportId={reportId} />
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
      </div>
    </div>
  )
}

function DetailView({ gem, reportId }: { gem: Gem; reportId?: string }) {
  const finalData = gem.finalApproval || {}
  const obs = finalData.finalObservations || {}
  const verificationUrl = `${window.location.origin}/reports/${reportId || gem._id}`
  const firstImageId = gem.images && gem.images.length > 0 ? gem.images[0] : null

  // 200px box, less its 2px border on each side.
  const gemImage = useRealSizeGemImage({
    imageId: firstImageId ?? undefined,
    obs,
    reportSize: "medium",
    box: { w: 196, h: 196 },
  })

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

  const displayWeight = gem.weight ? `${Number(gem.weight).toFixed(2)} ${isJewelry ? "g" : "ct"}` : ""

  const rowsBlock1 = [
    { label: "Date", value: formatDate(gem.updatedAt) },
    { label: "GRC Number", value: gem.gemId },
    { label: "Color", value: gem.color },
    {
      label: "Description",
      value: finalData.itemDescription || obs.itemDescription || gem.itemDescription,
    },
    { label: "Weight", value: displayWeight || undefined },
    { label: "Shape", value: obs.shape || obs.cuttingShape },
    { label: "Cut", value: obs.crownStyle || obs.cuttingStyle || obs.cut },
    {
      label: "Measurements",
      value: obs.messurementX
        ? `${Number(obs.messurementX).toFixed(2)} x ${Number(obs.messurementY).toFixed(2)} x ${Number(obs.messurementZ).toFixed(2)} mm`
        : undefined,
    },
    { label: "Transparency", value: obs.transparency },
    { label: "Species", value: obs.species },
    { label: "Variety", value: finalData.finalVariety || obs.variety },
  ]

  const rowsBlock2 = [
    { label: "Clarity", value: obs.clarityGrade },
    { label: "Comments", value: obs.comments },
  ]

  const TypewriterRow = ({ label, value }: { label: string; value?: string | number }) => (
    <div style={{ display: "flex", alignItems: "baseline", width: "100%", gap: "10px" }}>
      <span style={{ flexShrink: 0 }}>{label}:</span>
      <div
        style={{
          flexGrow: 1,
          borderBottom: "2px dotted #a3a3a3",
          margin: "0",
          position: "relative",
        }}
      ></div>
      <span style={{ flexShrink: 0, textAlign: "right", whiteSpace: "nowrap" }}>{value || "-"}</span>
    </div>
  )

  const tdStyle: React.CSSProperties = {
    border: "1px solid #111",
    padding: "4px 6px",
    verticalAlign: "middle",
    textAlign: "center",
    fontSize: "9px",
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
          opacity: 1,
          pointerEvents: "none",
        }}
      >
        <img
          src={turtlesLogo}
          alt='Watermark'
          style={{
            width: "1000px",
            height: "1000px",
            objectFit: "contain",
            filter: "grayscale(100%)",
          }}
        />
      </div>

      {/* LEFT PANEL */}
      <div
        style={{
          flex: "0 0 55%",
          width: "50%",
          height: "100%",
          padding: "50px",
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
            fontSize: "28px",
            fontWeight: 700,
            textTransform: "uppercase",
            margin: "0 0 36px 0",
            letterSpacing: "0.5px",
            fontFamily: "'Nimbus Mono', 'Courier New', Courier, monospace",
          }}
        >
          GEMOLOGICAL REPORT OF CEYLON
        </h1>

        {/* Block 1: Main fields */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "6px",
            color: DARK,
            fontSize: "14px",
            fontFamily: "'Nimbus Mono Antique', 'Courier New', Courier, monospace",
            fontWeight: 400,
            width: "100%",
            maxWidth: "480px",
          }}
        >
          {rowsBlock1.map((row, i) => (
            <TypewriterRow key={`r1-${i}`} label={row.label} value={row.value} />
          ))}
        </div>

        <div style={{ height: "28px" }}></div>

        {/* Block 2: Clarity & Comments */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "6px",
            color: DARK,
            fontSize: "14px",
            fontFamily: "'Nimbus Mono Antique', 'Courier New', Courier, monospace",
            fontWeight: 400,
            width: "100%",
            maxWidth: "480px",
            marginTop: "10px",
          }}
        >
          {rowsBlock2.map((row, i) => (
            <TypewriterRow key={`r2-${i}`} label={row.label} value={row.value} />
          ))}
        </div>

        <div style={{ height: "20px" }}></div>

        {/* Clarity Scale Table */}
        {(() => {
          const clarityGrade = (obs.clarityGrade || "").replace(/[\s()]/g, "").toUpperCase()
          const isActive = (key: string) => key.toUpperCase() === clarityGrade

          const activeTd: React.CSSProperties = {
            ...tdStyle,
            backgroundColor: "#1a1a2e",
            color: "#fff",
            fontWeight: 700,
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
            <div
              style={{
                fontFamily: "Arial, sans-serif",
                fontSize: "9px",
                color: "#111",
                width: "100%",
                maxWidth: "460px",
                margin: "auto",
              }}
            >
              <table style={{ width: "90%", borderCollapse: "collapse", textAlign: "center" }}>
                <tbody>
                  <tr>
                    <td rowSpan={2} style={tdStyle}>
                      Excellent
                    </td>
                    <td colSpan={2} style={tdStyle}>
                      Loup Clean
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
                      <td key={key} style={isActive(key) ? activeTd : tdStyle}>
                        {label}
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          )
        })()}

        <div style={{ margin: "auto" }}>
          <div
            style={{
              fontSize: "10px",
              color: "#666",
              fontFamily: "Arial, sans-serif",
              marginTop: "20px",
            }}
          >
            For complete terms and updates, visit www.grc.lk
          </div>
        </div>
      </div>

      {/* RIGHT PANEL */}
      <div
        style={{
          flex: "0 0 45%",
          width: "45%",
          height: "100%",
          padding: "125px 52px 38px 32px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          boxSizing: "border-box",
          position: "relative",
          zIndex: 2,
        }}
      >
        {/* Gem Image */}
        <div
          style={{
            width: "200px",
            height: "200px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: "10px",
            border: "2px solid #ccc",
          }}
        >
          {firstImageId ? (
            gemImage.node
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
            fontSize: "10px",
            color: "#666",
            marginBottom: "30px",
          }}
        >
          Image is approximate
        </div>

        {/* Gem Name + Weight */}
        <div
          style={{
            textAlign: "center",
            width: "100%",
            fontFamily: "'Nimbus Mono', 'Courier New', Courier, monospace",
          }}
        >
          {obs.showHeatInReport && (
            <div
              style={{
                marginTop: "8px",
                fontSize: "18px",
                fontWeight: 400,
                color: "#333",
                letterSpacing: "1px",
              }}
            >
              {obs.isHeated ? "Heated" : "Un - Heated"}
            </div>
          )}

          <h2
            style={{
              fontSize: "30px",
              fontWeight: 900,
              margin: 0,
              textTransform: "uppercase",
              color: "#111",
              letterSpacing: "0.5px",
              fontFamily: "'Nimbus Mono', 'Courier New', Courier, monospace",
            }}
          >
            {finalData.finalVariety || obs.variety || "BLUE SAPPHIRE"}
          </h2>

          {gem.weight && (
            <div
              style={{
                marginTop: "12px",
                fontSize: "18px",
                fontWeight: 400,
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
            marginTop: "100px",
            // width: "100%",
            display: "flex",
            justifyContent: "flex-start",
            alignItems: "flex-end",
            gap: "16px",
          }}
        >
          <div style={{ flexShrink: 0, marginBottom: "60px" }}>
            <QRCode value={verificationUrl} size={70} />
          </div>

          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
            <img
              src={signatureImg}
              alt='Signature'
              style={{
                height: "200px",
                objectFit: "contain",
              }}
            />
          </div>
        </div>
      </div>
    </>
  )
}
