import { useState } from "react"
import QRCode from "react-qr-code"
import { ImageIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import type { Gem } from "@/lib/types"
import { GemImage } from "../gems/GemImage"

interface MediumReportPreviewProps {
  gem: Gem
  includeLogo: boolean
  reportId?: string
}

/**
 * ARCHITECT LEVEL PDF FIX (RELIABILITY FOCUS):
 * We bypass Tailwind 4's modern color system (oklch) which crashes legacy PDF tools.
 * Everything in the 'Capture' view is 100% hardcoded HEX.
 * We also treat the layout as a fixed-pixel 'Blueprint' (1000x700).
 */
export function MediumReportPreview({ gem, reportId }: MediumReportPreviewProps) {
  const [view, setView] = useState<"inner" | "outer">("inner")

  return (
    <div
      className='flex flex-col items-center'
      style={{ colorScheme: "light" }} // Force light mode for capture logic
    >
      <div className='flex items-center gap-2 mb-6 bg-slate-100 p-1 rounded-lg'>
        <button
          onClick={() => setView("inner")}
          className={cn(
            "px-4 py-1.5 text-sm font-medium rounded-md transition-all",
            view === "inner"
              ? "bg-white text-slate-900 shadow-sm"
              : "text-slate-500 hover:text-slate-700",
          )}
        >
          Inner (Details)
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
          Outer (Covers)
        </button>
      </div>

      {/* Interactive Screen Preview */}
      <div
        id='medium-report-inner'
        className='w-[1000px] h-[700px] bg-white shadow-2xl overflow-hidden text-slate-900 relative border border-slate-100 flex'
      >
        {view === "inner" ? <DetailView gem={gem} reportId={reportId} /> : <CoverView />}
      </div>

      {/* 
          STABLE CAPTURE ENGINE (ISOLATED)
          Hardcoded 1000x700 canvas.
          Note: No 'visibility: hidden' because html2canvas ignores hidden elements.
      */}
      <div
        style={{
          position: "fixed",
          left: "-5000px",
          top: "0",
          zIndex: -1,
          pointerEvents: "none",
        }}
      >
        <div
          id='medium-report-capture-inner'
          style={{
            width: "1000px",
            height: "700px",
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

  // PRIMARY COLORS (STRICT HEX)
  const GOLD = "#b2945b"
  const DARK = "#1e293b"
  const LIGHT = "#94a3b8"
  const BORDER = "#f1f5f9"
  const FONT = "'Times New Roman', serif"

  const formatDate = (dateString?: string | Date) => {
    if (!dateString) return new Date().toLocaleDateString("en-GB")
    return new Date(dateString).toLocaleDateString("en-GB")
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
        <svg viewBox='0 0 100 100' style={{ width: "600px", height: "600px", color: GOLD }}>
          <path
            d='M50 20 C35 20 25 35 25 50 C25 65 35 80 50 80 C65 80 75 65 75 50 C75 35 65 20 50 20 Z'
            fill='currentColor'
          />
          <path
            d='M50 15 C30 15 15 35 15 50 C15 65 30 85 50 85 C70 85 85 65 85 50 C85 35 70 15 50 15'
            stroke='currentColor'
            fill='none'
          />
        </svg>
      </div>

      {/* LEFT PANEL: DATA */}
      <div
        style={{
          width: "500px",
          height: "700px",
          padding: "40px",
          display: "flex",
          flexDirection: "column",
          boxSizing: "border-box",
          position: "relative",
          borderRight: `1px solid ${BORDER}`,
          fontFamily: FONT,
        }}
      >
        <h1
          style={{
            color: GOLD,
            fontSize: "26px",
            fontWeight: 700,
            textTransform: "uppercase",
            margin: "0 0 30px 0",
            lineHeight: "1.2",
          }}
        >
          Gemological Report of Ceylon
        </h1>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "9px",
            color: DARK,
            fontSize: "14px",
          }}
        >
          <PrintRow
            label='Date'
            value={formatDate(gem.updatedAt)}
            dottedColor={LIGHT}
            textColor={DARK}
          />
          <PrintRow label='GRC Number' value={gem.gemId} dottedColor={LIGHT} textColor={DARK} />
          <PrintRow label='Color' value={gem.color} dottedColor={LIGHT} textColor={DARK} />
          <div style={{ height: "4px" }}></div>
          <PrintRow
            label='Weight'
            value={gem.weight ? `${gem.weight.toFixed(2)} ct` : undefined}
            dottedColor={LIGHT}
            textColor={DARK}
          />
          <PrintRow label='Shape' value={obs.shape} dottedColor={LIGHT} textColor={DARK} />
          <PrintRow label='Cut' value={obs.cut} dottedColor={LIGHT} textColor={DARK} />
          <PrintRow
            label='Measurements'
            value={
              obs.messurementX
                ? `${obs.messurementX} x ${obs.messurementY} x ${obs.messurementZ} mm`
                : undefined
            }
            dottedColor={LIGHT}
            textColor={DARK}
          />
          <PrintRow
            label='Transparency'
            value={obs.transparency}
            dottedColor={LIGHT}
            textColor={DARK}
          />
          <PrintRow label='Species' value={obs.species} dottedColor={LIGHT} textColor={DARK} />
          <PrintRow
            label='Variety'
            value={finalData.finalVariety || obs.variety}
            dottedColor={LIGHT}
            textColor={DARK}
          />

          <div style={{ height: "15px" }}></div>
          <PrintRow
            label='Geographic Origin'
            value={obs.origin}
            dottedColor={LIGHT}
            textColor={DARK}
          />
          <div style={{ height: "4px" }}></div>
          <PrintRow label='Cutting' value={obs.cuttingGrade} dottedColor={LIGHT} textColor={DARK} />
          <PrintRow
            label='Polishing'
            value={obs.polishingGrade}
            dottedColor={LIGHT}
            textColor={DARK}
          />
          <PrintRow
            label='Proportion'
            value={obs.proportionGrade}
            dottedColor={LIGHT}
            textColor={DARK}
          />
          <PrintRow label='Clarity' value={obs.clarityGrade} dottedColor={LIGHT} textColor={DARK} />
          <PrintRow
            label='Comments'
            value={obs.comments || "No Indications of heating"}
            dottedColor={LIGHT}
            textColor={DARK}
          />
        </div>

        <div
          style={{
            marginTop: "auto",
            marginBottom: "20px",
            fontSize: "11px",
            color: "#0f172a",
            textAlign: "justify",
            lineHeight: "1.6",
          }}
        >
          <p style={{ margin: 0 }}>
            <span style={{ fontWeight: 700, marginRight: "5px" }}>Item Description:</span>
            {finalData.itemDescription ||
              "Natural gemstone certificated by Gemological Report of Ceylon. Validates origin and authenticity."}
          </p>
          <p style={{ fontWeight: 800, marginTop: "10px", margin: 0 }}>
            Total Weight: {gem.weight ? gem.weight.toFixed(3) : "0.000"} ct.
          </p>
        </div>

        <div
          style={{
            position: "absolute",
            bottom: "20px",
            left: "40px",
            color: LIGHT,
            fontSize: "10px",
          }}
        >
          Verify authenticity at www.grc.lk
        </div>
      </div>

      {/* RIGHT PANEL: VISUALS */}
      <div
        style={{
          width: "500px",
          height: "700px",
          padding: "40px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          boxSizing: "border-box",
          position: "relative",
          fontFamily: FONT,
        }}
      >
        <div
          style={{
            width: "250px",
            height: "250px",
            border: "1px solid #e2e8f0",
            backgroundColor: "#ffffff",
            padding: "10px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: "15px",
          }}
        >
          {firstImageId ? (
            <GemImage imageId={firstImageId} className='w-full h-full object-contain' />
          ) : (
            <ImageIcon size={48} color='#cbd5e1' />
          )}
        </div>
        <p
          style={{
            color: LIGHT,
            fontSize: "11px",
            marginBottom: "30px",
            textAlign: "center",
            width: "100%",
          }}
        >
          Image represents the actual item.
        </p>

        <div style={{ textAlign: "center", width: "100%", marginBottom: "40px" }}>
          <h2
            style={{
              fontSize: "32px",
              fontWeight: 800,
              textTransform: "uppercase",
              margin: 0,
              color: DARK,
              lineHeight: "1.1",
            }}
          >
            NATURAL <br /> {obs.variety || "GEMSTONE"}
          </h2>
          <p
            style={{
              fontSize: "18px",
              color: "#475569",
              textTransform: "uppercase",
              letterSpacing: "0.2em",
              marginTop: "10px",
              fontWeight: 500,
            }}
          >
            {obs.origin}
          </p>
        </div>

        <div
          style={{
            display: "flex",
            width: "100%",
            alignItems: "flex-end",
            justifyContent: "space-between",
            marginTop: "auto",
          }}
        >
          <div
            style={{ border: `1px solid ${BORDER}`, padding: "8px", backgroundColor: "#ffffff" }}
          >
            <QRCode value={verificationUrl} size={85} />
          </div>

          <div
            style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "2px" }}
          >
            <div
              style={{
                height: "60px",
                width: "160px",
                color: "#1e3a8a",
                opacity: 0.8,
                marginBottom: "-5px",
              }}
            >
              <svg viewBox='0 0 200 80' style={{ width: "100%", height: "100%" }}>
                <path
                  d='M30,50 Q60,20 100,50 T170,30'
                  fill='none'
                  stroke='currentColor'
                  strokeWidth='2.5'
                />
              </svg>
            </div>
            <div
              style={{
                borderTop: "1.5px solid #1a1a1a",
                width: "220px",
                paddingTop: "5px",
                textAlign: "right",
              }}
            >
              <p style={{ fontWeight: 700, fontSize: "13px", color: DARK, margin: 0 }}>
                R. Milinda Edirisinghe
              </p>
              <p style={{ fontSize: "11px", fontWeight: 500, color: "#475569", margin: 0 }}>
                CEO / Consultant Gemmologist
              </p>
              <p style={{ fontSize: "10px", color: LIGHT, margin: 0 }}>
                Gemological Report Of Ceylon (Pvt) Ltd
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

function CoverView() {
  const GOLD = "#b2945b"
  const serif = "'Times New Roman', serif"
  return (
    <>
      <div className='w-1/2 h-full bg-white relative flex flex-col items-center justify-center p-12 border-r border-slate-100'>
        <div className='absolute left-0 top-0 bottom-0 w-3' style={{ backgroundColor: GOLD }}></div>
        <div className='flex-1 flex items-center justify-center'>
          <div style={{ width: "224px", height: "224px", color: GOLD }}>
            <svg viewBox='0 0 100 100' fill='none' stroke='currentColor' strokeWidth='1.2'>
              <path d='M50 20 C35 20 25 35 25 50 C25 65 35 80 50 80 C65 80 75 65 75 50 C75 35 65 20 50 20 Z' />
              <path d='M50 20 L50 80 M25 50 L75 50' strokeWidth='0.8' />
              <circle cx='50' cy='15' r='7' />
            </svg>
          </div>
        </div>
        <div className='absolute bottom-12 w-full text-center'>
          <p className='font-bold text-[#1a1a1a] text-sm'>Gemological Report Of Ceylon (Pvt) Ltd</p>
          <p className='text-[11px] mt-1 text-slate-500'>info@grc.lk | www.grc.lk</p>
        </div>
      </div>
      <div className='w-1/2 h-full bg-white relative flex flex-col items-center justify-center p-12'>
        <h1
          style={{ color: GOLD, fontSize: "120px", fontWeight: 700, fontFamily: serif, margin: 0 }}
        >
          GRC
        </h1>
        <p
          style={{
            color: GOLD,
            fontSize: "18px",
            letterSpacing: "0.3em",
            fontWeight: 800,
            marginTop: "20px",
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

function PrintRow({
  label,
  value,
  dottedColor,
  textColor,
}: {
  label: string
  value?: string | number
  dottedColor: string
  textColor: string
}) {
  return (
    <div style={{ display: "flex", width: "100%", alignItems: "baseline", color: textColor }}>
      <span style={{ fontWeight: 700, paddingRight: "5px", flexShrink: 0 }}>{label}</span>
      <div
        style={{
          flex: 1,
          borderBottom: `1.5px dotted ${dottedColor}`,
          margin: "0 5px",
          position: "relative",
          top: "-4px",
        }}
      ></div>
      <span
        style={{
          fontWeight: 700,
          paddingLeft: "5px",
          textAlign: "right",
          flexShrink: 0,
          minWidth: "40px",
        }}
      >
        {value || "--"}
      </span>
    </div>
  )
}
