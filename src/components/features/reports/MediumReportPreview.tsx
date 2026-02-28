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

export function MediumReportPreview({ gem, reportId }: MediumReportPreviewProps) {
  const [view, setView] = useState<"inner" | "outer">("inner")
  const goldText = "text-[#b2945b]"

  return (
    <div className='flex flex-col items-center'>
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

      {/* Landscape Container: Strictly defined Landscape Aspect Ratio for A4 Folded (A5 Panels) */}
      <div
        id='medium-report-inner'
        className='w-[1000px] h-[700px] bg-white shadow-2xl overflow-hidden text-slate-900 relative border border-slate-100 flex'
      >
        {view === "inner" ? (
          <InnerView gem={gem} reportId={reportId} />
        ) : (
          <OuterView goldText={goldText} />
        )}
      </div>

      {/* Hidden container for PDF capture (Always "inner" view) */}
      <div className='fixed -left-[4000px] top-0 pointer-events-none'>
        <div
          id='medium-report-capture-inner'
          className='bg-white text-slate-900 relative flex overflow-hidden'
          style={{ width: "210mm", height: "148mm" }}
        >
          <InnerView gem={gem} reportId={reportId} />
        </div>
      </div>
    </div>
  )
}

function InnerView({ gem, reportId }: { gem: Gem; reportId?: string }) {
  const finalData = gem.finalApproval || {}
  const obs = finalData.finalObservations || {}
  const verificationUrl = `${window.location.origin}/reports/${reportId || gem._id}`
  const goldText = "text-[#b2945b]"
  const firstImageId = gem.images && gem.images.length > 0 ? gem.images[0] : null

  const formatDate = (dateString?: string | Date) => {
    if (!dateString) return new Date().toLocaleDateString("en-GB")
    return new Date(dateString).toLocaleDateString("en-GB")
  }

  return (
    <>
      {/* Watermark Background (Spanning across - centered) */}
      <div className='absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.04] z-0'>
        <svg viewBox='0 0 100 100' className='w-[60%] h-[60%] text-[#b2945b]'>
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

      {/* LEFT HALF PANEL (50%) */}
      <div
        className='w-1/2 h-full p-10 z-10 flex flex-col border-r relative'
        style={{ borderColor: "#f1f5f9" }}
      >
        <div className='mb-6'>
          <h1
            className={`font-serif text-[24px] font-bold ${goldText} uppercase tracking-wide leading-tight`}
          >
            Gemological Report of Ceylon
          </h1>
        </div>

        <div className='flex-1 flex flex-col justify-center'>
          <div
            className='space-y-[6px] text-[13px] leading-snug font-medium'
            style={{ color: "#1e293b" }}
          >
            <ReportRow label='Date' value={formatDate(gem.updatedAt)} />
            <ReportRow label='GRC Number' value={gem.gemId} />
            <ReportRow label='Color' value={gem.color} />
            <div className='my-[2px]'></div>
            <ReportRow
              label='Weight'
              value={gem.weight ? `${gem.weight.toFixed(2)} ct` : undefined}
            />
            <ReportRow label='Shape' value={obs.shape} />
            <ReportRow label='Cut' value={obs.cut} />
            <ReportRow
              label='Measurements'
              value={
                obs.messurementX
                  ? `${obs.messurementX} x ${obs.messurementY} x ${obs.messurementZ} mm`
                  : undefined
              }
            />
            <ReportRow label='Transparency' value={obs.transparency} />
            <ReportRow label='Species' value={obs.species} />
            <ReportRow label='Variety' value={finalData.finalVariety || obs.variety} />
            <div className='h-4'></div>
            <ReportRow label='Geographic Origin' value={obs.origin} />
            <div className='h-1'></div>
            <ReportRow label='Cutting' value={obs.cuttingGrade} />
            <ReportRow label='Polishing' value={obs.polishingGrade} />
            <ReportRow label='Proportion' value={obs.proportionGrade} />
            <ReportRow label='Clarity' value={obs.clarityGrade} />
            <ReportRow label='Comments' value={obs.comments || "Minor Oil"} />
          </div>

          <div
            className='mt-auto mb-6 text-[11px] leading-relaxed text-justify'
            style={{ color: "#0f172a" }}
          >
            <p>
              <span className='font-semibold mr-1'>Item Description:</span>
              {finalData.itemDescription ||
                "One white metal ring set with a natural Island Emerald, oval cabochon cut, as the center stone, surrounded by round-cut natural diamonds."}
            </p>
            <p className='mt-2 font-bold'>
              Total article weight: {gem.weight ? (gem.weight + 5).toFixed(3) : "0.000"} g.
            </p>
          </div>
        </div>

        <div className='absolute bottom-4 left-10 text-[9px]' style={{ color: "#94a3b8" }}>
          For complete terms and updates, visit www.grc.lk
        </div>
      </div>

      {/* RIGHT HALF PANEL (50%) */}
      <div className='w-1/2 h-full p-10 z-10 flex flex-col items-center justify-center'>
        <div className='h-4'></div>
        <div
          className='w-[200px] h-[200px] border bg-white flex items-center justify-center p-2 relative shadow-sm mb-2'
          style={{ borderColor: "#e2e8f0" }}
        >
          {firstImageId ? (
            <GemImage imageId={firstImageId} className='w-full h-full object-contain' />
          ) : (
            <ImageIcon className='w-12 h-12' style={{ color: "#cbd5e1" }} />
          )}
        </div>
        <p
          className='text-[10px] mb-6 w-full text-center tracking-wide'
          style={{ color: "#94a3b8" }}
        >
          Image is approximate
        </p>

        <div className='text-center w-full mb-8'>
          <h2
            className={`text-[28px] font-bold uppercase font-serif tracking-wide leading-none`}
            style={{ color: "#1e293b" }}
          >
            NATURAL <br /> {obs.species || "GEMSTONE"}
          </h2>
          <p
            className='text-[16px] font-serif mt-3 font-medium uppercase tracking-widest'
            style={{ color: "#475569" }}
          >
            {obs.origin}
          </p>
        </div>

        <div className='w-full flex items-end justify-between mt-auto mb-2'>
          <div className='border p-2 bg-white shadow-sm' style={{ borderColor: "#f1f5f9" }}>
            <QRCode value={verificationUrl} size={75} />
          </div>

          <div className='flex-1 flex flex-col items-end pl-4'>
            <div className='h-16 w-[180px] relative -mb-3'>
              <svg
                viewBox='0 0 200 80'
                className='w-full h-full opacity-90'
                style={{ color: "#1e3a8a" }}
              >
                <path
                  d='M40,50 C70,20 100,60 140,30 S180,50 190,30'
                  fill='none'
                  stroke='currentColor'
                  strokeWidth='2'
                />
              </svg>
            </div>
            <div className='border-t w-[200px] pt-1 text-right' style={{ borderColor: "#1a1a1a" }}>
              <p className='font-bold text-[12px] text-[#1a1a1a]'>R. Milinda Edirisinghe</p>
              <p className='text-[10px] font-medium' style={{ color: "#475569" }}>
                CEO / Consultant Gemmologist
              </p>
              <p className='text-[10px]' style={{ color: "#64748b" }}>
                Gemological Report Of Ceylon (Pvt) Ltd
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

function OuterView({ goldText }: { goldText: string }) {
  return (
    <>
      <div className='w-1/2 h-full bg-white relative flex flex-col items-center justify-center p-12 border-r border-slate-100'>
        <div className='absolute left-0 top-0 bottom-0 w-3 bg-[#b2945b]'></div>
        <div className='flex-1 flex items-center justify-center'>
          <div className='w-56 h-56 text-[#b2945b]'>
            <svg viewBox='0 0 100 100' fill='none' stroke='currentColor' strokeWidth='1.2'>
              <path d='M50 20 C35 20 25 35 25 50 C25 65 35 80 50 80 C65 80 75 65 75 50 C75 35 65 20 50 20 Z' />
              <path d='M50 20 L50 80 M25 50 L75 50 M35 30 L65 70 M65 30 L35 70' strokeWidth='0.8' />
              <circle cx='50' cy='15' r='7' />
              <path d='M25 35 L12 25 M75 35 L88 25 M25 65 L12 75 M75 65 L88 75' />
            </svg>
          </div>
        </div>
        <div className='absolute bottom-12 w-full pl-8 text-center'>
          <p className='font-bold text-[#1a1a1a] text-sm'>Gemological Report Of Ceylon (Pvt) Ltd</p>
          <p className='text-[11px] text-slate-600 mt-1'>
            Email: info@grc.lk | Whatsapp: +94 778204525
            <br />
            No. 97, Galle Rd, Colombo 03, Sri Lanka. | www.grc.lk
          </p>
        </div>
      </div>
      <div className='w-1/2 h-full bg-white relative flex flex-col items-center justify-center p-12'>
        <div className='flex flex-col items-center gap-10 -mt-10'>
          <div className='text-center relative'>
            <h1
              className={`text-[120px] leading-none font-serif ${goldText} font-bold tracking-tight`}
            >
              GRC
            </h1>
            <div className='absolute top-4 -right-6 text-2xl font-bold text-slate-400'>®</div>
          </div>
          <div className='flex gap-6 mt-4'>
            <GemIcon color='bg-[#1e3a8a]' />
            <GemIcon color='bg-[#15803d]' />
            <GemIcon color='bg-[#b91c1c]' />
          </div>
        </div>
        <div className='absolute bottom-16 text-center w-full px-8'>
          <h2 className={`font-serif font-bold text-[20px] ${goldText} uppercase tracking-[0.2em]`}>
            GEMOLOGICAL REPORT OF CEYLON
          </h2>
        </div>
      </div>
    </>
  )
}

function ReportRow({ label, value }: { label: string; value?: string | number }) {
  // Classic dotted leader line style
  return (
    <div className='flex items-baseline w-full text-[#1a1a1a]'>
      <span className='shrink-0 font-medium font-serif pr-1'>{label}</span>
      <span
        className='flex-1 border-b-[1.5px] border-dotted mx-1 relative -top-1'
        style={{ borderColor: "#94a3b8" }}
      ></span>
      {/* Ensure the line of dots is visible by giving flex-1 */}
      <span className='shrink-0 font-medium font-serif pl-1 min-w-[20px] text-right'>
        {value || ""}
      </span>
    </div>
  )
}

function GemIcon({ color }: { color: string }) {
  return (
    <div
      className={`w-16 h-20 ${color} rounded-md shadow-md relative overflow-hidden ring-1 ring-black/5`}
    >
      {/* Simple faceted gem simulation */}
      <div className='absolute inset-0 bg-linear-to-br from-white/30 to-black/10'></div>
      <div className='absolute top-0 right-0 w-10 h-10 bg-white/20 -rotate-45 transform translate-x-3 -translate-y-3 blur-sm'></div>
      <div className='absolute inset-3 border border-white/30 opacity-70'></div>
    </div>
  )
}
