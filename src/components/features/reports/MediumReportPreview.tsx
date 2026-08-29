import { useState, useRef, useEffect } from "react"
import QRCode from "react-qr-code"
import { Download } from "lucide-react"
import { toPng } from "html-to-image"
import type { Gem } from "@/lib/types"
import { useRealSizeGemImage } from "../gems/RealSizeGemImage"
import type { RenderTarget } from "@/lib/real-size"
import { downloadReportPdf } from "@/lib/report-pdf"
import turtlesLogo from "@/assets/Turtles.png"
import signatureImg from "@/assets/signature1.png"

interface MediumReportPreviewProps {
  gem: Gem
  includeLogo: boolean
  reportId?: string
}

const SCALE_FACTOR = 3

/**
 * The signature asset is 1800x1200 (3:2) and mostly whitespace: its ink measures out to
 * x 0.108-0.915, y 0.288-0.685 of the frame. Rendering it at its natural aspect spends
 * most of the footer on empty margin, so the image is rendered oversized inside a window
 * cropped to the ink band. Keep the window inside those measured bounds.
 *
 * The typed block (Kishani Dayananda) is drawn to the same box so the two signature
 * fields line up: its dotted rule sits at the same fraction of the box height as the
 * printed rule inside the cropped image.
 */
const SIG_IMG_W = 262
const SIG_IMG_H = SIG_IMG_W / 1.5
const SIG_CROP_TOP = SIG_IMG_H * 0.26
const SIG_CROP_LEFT = SIG_IMG_W * 0.09
const SIG_BOX_W = SIG_IMG_W * 0.85
const SIG_BOX_H = SIG_IMG_H * 0.44
/* Fraction of the box above the rule: blank on the typed block, ink on the image. */
const SIG_RULE_OFFSET = 0.49

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
          <DetailView gem={gem} reportId={reportId} target='screen' />
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

function DetailView({
  gem,
  reportId,
  target = "print",
}: {
  gem: Gem
  reportId?: string
  target?: RenderTarget
}) {
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
    target,
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

          /**
           * The selected grade is marked with a heavy border and a light tint rather
           * than reversed type. The table prints at 9px on a 210mm-wide page, i.e.
           * about 4.8pt: at that size white-on-black closes up as soon as ink spreads,
           * and it disappears altogether when a browser's print dialog has background
           * graphics switched off. Black-on-tint survives both, and the 2px rule still
           * reads as the marker even if the fill is dropped.
           */
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
            <div
              style={{
                fontFamily: "Arial, sans-serif",
                fontSize: "9px",
                color: "#111",
                width: "100%",
                maxWidth: "460px",
                margin: "0 11px",
                marginTop: "15px",
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

        {/* Footer: QR verification code centred in the panel, terms line beneath it */}
        <div
          style={{
            marginTop: "auto",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "8px",
          }}
        >
          <div style={{ flexShrink: 0, lineHeight: 0 }}>
            <QRCode value={verificationUrl} size={70} />
          </div>
          <div
            style={{
              fontSize: "10px",
              color: "#666",
              fontFamily: "Arial, sans-serif",
              textAlign: "center",
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

        {/* Two signature fields at the bottom: consultant gemologist + authorized signature */}
        {/*
          The pair is wider than the panel's 420px content box, so the row stretches and
          then claws back part of the side padding: 420 + 26 + 16 = 462px, which leaves
          the block edges 6px inside the panel on the left and 36px from the page edge on
          the right. Widen SIG_IMG_W further and these two numbers have to grow with it.
        */}
        <div
          style={{
            marginTop: "auto",
            alignSelf: "stretch",
            marginLeft: "-26px",
            marginRight: "-16px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
            gap: "16px",
          }}
        >
          <TypedSignature name='Kishani Dayananda' role='Consultant Gemologist' />

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
                objectFit: "contain",
              }}
            />
          </div>
        </div>
      </div>
    </>
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
      <div style={{ fontSize: "9px", color: "#8d8b8b", fontWeight: 700, lineHeight: "8px", whiteSpace: "nowrap" }}>
        {role}
      </div>
      <div style={{ fontSize: "9px", color: "#8d8b8b", fontWeight: 700, lineHeight: "10px", whiteSpace: "nowrap" }}>
        Gemological Report Of Ceylon (Pvt) Ltd
      </div>
    </div>
  )
}
