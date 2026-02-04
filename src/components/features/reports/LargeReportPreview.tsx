import React from "react"
import QRCode from "react-qr-code"
import { BASE_URL } from "@/lib/api/config"
import { ImageIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import type { Gem } from "@/lib/types"

interface LargeReportPreviewProps {
  gem: Gem
  includeLogo: boolean
  reportId?: string
}

export function LargeReportPreview({ gem, reportId }: LargeReportPreviewProps) {
  const finalData = gem.finalApproval || {}
  const obs = finalData.finalObservations || {}
  const verificationUrl = `${window.location.origin}/reports/${reportId || gem._id}`

  // Toggle state
  const [view, setView] = React.useState<"inner" | "outer">("inner")

  const formatDate = (dateString?: string | Date) => {
    if (!dateString) return new Date().toLocaleDateString("en-GB")
    return new Date(dateString).toLocaleDateString("en-GB")
  }

  // Common font base for the report - replicating the serif style
  const fontBase = "font-serif text-[#1a1a1a]"

  return (
    <div className='flex flex-col items-center'>
      {/* View Toggle */}
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
          Inner Pages (Details)
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
          Outer Pages (Covers)
        </button>
      </div>

      <div className='flex flex-col md:flex-row w-full max-w-[1200px] mx-auto bg-white shadow-2xl overflow-hidden text-slate-900 min-h-[900px]'>
        {view === "inner" ? (
          /* =========================================================================
             INNER VIEW (Data + Spread)
             ========================================================================= */
          <>
            {/* LEFT PAGE (Interior Left) */}
            <div className='flex-1 py-14 px-12 relative border-r border-[#e5e5e5]'>
              {/* Header Title */}
              <div className='mb-6'>
                <h1
                  className={`${fontBase} text-[19px] font-bold tracking-[0.02em] text-[#5c4d3c] uppercase border-b border-[#C5A059]/30 pb-3 mb-1`}
                >
                  GEMOLOGICAL REPORT OF CEYLON
                </h1>
              </div>

              {/* Data Table Area */}
              <div className={`${fontBase} text-[13px] leading-[1.65] space-y-[2px]`}>
                <ReportRow label='Date' value={formatDate(gem.updatedAt)} />
                <ReportRow label='GRC No' value={gem.gemId} />
                <ReportRow label='Colour' value={gem.color} />
                <ReportRow label='Grade' value={obs.grade} />
                <ReportRow
                  label='Weight'
                  value={gem.weight ? `${gem.weight.toFixed(2)}ct` : undefined}
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

                {/* Note: In image, UV-Vis is a multi-line text block, not a simple row */}
                <div className='flex items-start mt-2'>
                  <span className='w-[170px] shrink-0 font-medium'>UV-Vis spectroscopy</span>
                  <span className='flex-1 leading-snug -mt-0.5'>
                    {obs.spectroscopy ? `..${obs.spectroscopy}` : "..No Fe²⁺ or Fe³⁺ observed"}
                  </span>
                </div>

                <ReportRow label='Geographic Origin' value={obs.origin} />

                <div className='mt-2 text-md'></div>
                <ReportRow label='Cutting' value={obs.cuttingGrade} />
                <ReportRow label='Polishing' value={obs.polishingGrade} />
                <ReportRow label='Proportion' value={obs.proportionGrade} />
                <ReportRow label='Clarity' value={obs.clarityGrade} />

                <div className='flex items-baseline mt-1'>
                  <span className='w-[170px] shrink-0 font-bold'>Comments:</span>
                  <span className='flex-1 border-b border-dotted border-[#999]'>
                    {obs.comments
                      ? `.......${obs.comments}`
                      : ".......Indication of minor oil treatment"}
                  </span>
                </div>
              </div>

              {/* Images Area (Lower Left) */}
              <div className='mt-16 flex items-end gap-12'>
                {/* Birth Mark / Microscopic View */}
                <div className='flex flex-col items-center'>
                  <div className='w-[140px] h-[100px] bg-[#808080]/10 overflow-hidden flex items-center justify-center relative'>
                    {/* Placeholder for inclusion image - ideally dynamic */}
                    <img
                      src='https://placehold.co/300x200/666666/ffffff?text=Inclusion'
                      className='w-full h-full object-cover opacity-80 grayscale mix-blend-multiply'
                      alt='Microscopic View'
                    />
                  </div>
                  <p className={`${fontBase} text-[11px] mt-2 font-medium`}>Birth Mark</p>
                  <p className={`${fontBase} text-[10px]`}>1 x 600 times</p>
                </div>
              </div>

              {/* Item Description Footer */}
              <div className='absolute bottom-14 left-12 right-12'>
                <p className={`${fontBase} text-[13px] leading-relaxed text-justify`}>
                  <span className='font-bold'>Item Description : </span>
                  {finalData.itemDescription ||
                    `The described ${obs.variety?.toLowerCase() || "gemstone"} is set in gold as the centestone within a two-tone ring featuring a white metal band.`}
                </p>
              </div>
            </div>

            {/* RIGHT PAGE (Interior Right) */}
            <div className='flex-1 py-14 px-12 relative'>
              {/* Special Note Section */}
              <div className='mb-10'>
                <h3 className={`${fontBase} font-bold text-[14px] mb-3`}>
                  Special note from the Gemmologist:
                </h3>
                <p className={`${fontBase} text-[13px] leading-[1.6] text-justify`}>
                  {obs.specialNote ||
                    "This is a rare and highly valuable gemstone within the global gem market. Based on the presence of classic three-phase (multiphase) inclusions, including Colombian-type inclusions, the stone is identified as originating from Colombia. These jagged multiphase inclusions characteristically host a gas bubble along with one or more cubic crystals."}
                </p>
              </div>

              {/* Center Gem Display */}
              <div className='flex flex-col items-center text-center mt-8'>
                {/* Main Image */}
                <div className='mb-4'>
                  {gem.imageUrl ? (
                    <img
                      src={`${BASE_URL}${gem.imageUrl}`}
                      alt='Gem'
                      className='w-[180px] h-[180px] object-contain drop-shadow-xl'
                    />
                  ) : (
                    <div className='w-[180px] h-[180px] bg-slate-100 flex items-center justify-center rounded-full'>
                      <ImageIcon className='w-12 h-12 text-slate-300' />
                    </div>
                  )}
                </div>

                {/* Title Group */}
                <div className='space-y-1'>
                  <h2 className={`${fontBase} text-[22px] font-bold text-[#2a3b8f] tracking-wide`}>
                    Natural {obs.species || "Beryl"} <br />
                    {finalData.finalVariety || obs.variety || "Emerald"}
                  </h2>
                  <p className={`${fontBase} text-[18px] text-[#333]`}>
                    {gem.weight ? gem.weight.toFixed(2) : "0.00"}ct
                  </p>
                </div>

                {/* Secondary Views (Mockup) */}
                <div className='mt-8 grid grid-cols-2 gap-x-12 gap-y-4'>
                  {/* Mocking secondary views by reusing main image or placeholders */}
                  <div className='w-20 h-20 opacity-80'>
                    <img
                      src={`${BASE_URL}${gem.imageUrl}`}
                      className='w-full h-full object-contain'
                    />
                  </div>
                  <div className='w-20 h-20 opacity-80 transform scale-x-[-1]'>
                    <img
                      src={`${BASE_URL}${gem.imageUrl}`}
                      className='w-full h-full object-contain'
                    />
                  </div>
                </div>
                <p className={`${fontBase} text-[10px] mt-2 italic text-slate-500`}>
                  images are approximate
                </p>
              </div>

              {/* Footer: QR & Signature */}
              <div className='absolute bottom-14 left-12 right-12 flex items-end justify-between'>
                {/* QR Code */}
                <div>
                  <QRCode value={verificationUrl} size={90} />
                </div>

                {/* Signature Block */}
                <div className='flex flex-col items-end'>
                  <div className='w-[180px] h-[60px] relative mb-2'>
                    {/* Signature Image Placeholder */}
                    <svg viewBox='0 0 200 80' className='w-full h-full text-[#1a1a1a]'>
                      <path
                        d='M20,60 C50,20 80,70 120,40 S180,60 190,30'
                        fill='none'
                        stroke='currentColor'
                        strokeWidth='1.5'
                      />
                    </svg>
                  </div>
                  <div className='text-right border-t border-dotted border-[#999] pt-2 w-[220px]'>
                    <p className={`${fontBase} font-bold text-[13px] text-[#1a1a1a]`}>
                      R. Milinda Edirisinghe
                    </p>
                    <p className={`${fontBase} text-[11px] text-[#333]`}>
                      CEO / Consultant Gemmologist
                    </p>
                    <p className={`${fontBase} text-[11px] text-[#444]`}>
                      Gemological Report Of Ceylon (Pvt) Ltd
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </>
        ) : (
          /* =========================================================================
             OUTER VIEW (Covers)
             ========================================================================= */
          <>
            {/* BACK COVER (Left in spread) */}
            <div className='flex-1 py-14 px-12 relative border-r border-[#e5e5e5] bg-[#fffdf5]'>
              <h2 className={`${fontBase} font-bold text-sm mb-4`}>
                Terms & Conditions - Gemological Report of Ceylon (GRC)
              </h2>
              <div
                className={`${fontBase} text-[10px] space-y-2 text-justify text-slate-600 leading-relaxed`}
              >
                <p>
                  1. Authenticity: The Gemological Report of Ceylon (GRC) certifies the gem's
                  authenticity based on the knowledge, techniques, and standards available at the
                  time of issue only.
                </p>
                <p>
                  2. Techniques & Features: Characteristics such as inclusions are assessed
                  according to current gemological practices. Future technological advancements may
                  allow artificial replication or reinterpretation of these features.
                </p>
                <p>
                  3. Non-Treatability: The certificate is based solely on the observed
                  characteristics at the time of examination. It does not warrant against future
                  enhancements, nor are covered by this certificate unless explicitly stated.
                </p>
                <p>
                  4. Limitations: GRC and its employees are not liable for any financial or other
                  loss resulting from this report or any errors or omissions, including those
                  arising from negligence, fraud, or other causes.
                </p>
                <p>
                  5. Scope of Certification: The content is applicable only to the specific gem
                  examined and does not imply an appraisal or valuation.
                </p>
                <p>
                  6. Third Party Use: Any improper use of the GRC report by third parties, including
                  but not limited to altering or separating the report from the gem, is strictly
                  prohibited.
                </p>
              </div>

              <div className='absolute bottom-12 left-12'>
                <p className='text-[10px] text-slate-400'>www.grc.lk</p>
              </div>
            </div>

            {/* FRONT COVER (Right in spread) */}
            <div className='flex-1 py-14 px-12 relative flex flex-col items-center justify-center text-center bg-white'>
              {/* Golden Turtle Logo */}
              <div className='mb-8 text-[#D4AF37]'>
                <svg viewBox='0 0 24 24' fill='currentColor' className='w-40 h-40'>
                  <path
                    d='M12 2C13 5 14 7 12 9C10 7 9 5 12 2ZM6.5 7C7.5 9.5 9 11 11 11.5C9 12 7.5 13 6.5 15.5C5.5 13 4 11.5 6.5 11.5C9 11 10.5 9.5 6.5 7ZM17.5 7C13.5 9.5 15 11 17.5 11.5C20 11.5 18.5 13 17.5 15.5C16.5 13 15 12 13 11.5C15 11 16.5 9.5 17.5 7ZM12 4.5C14.5 5.5 16 7.5 16.5 10C17 12.5 16 15 14 16.5L14 18.5L15 20L12 21.5L9 20L10 18.5L10 16.5C8 15 7 12.5 7.5 10C8 7.5 9.5 5.5 12 4.5Z'
                    fill='currentColor'
                    fillOpacity='0.8'
                  />
                </svg>
              </div>

              {/* Title */}
              <h1
                className={`${fontBase} text-[32px] font-bold tracking-widest text-[#1a1a1a] uppercase mb-2`}
              >
                GRC
              </h1>
              <h2
                className={`${fontBase} text-[14px] text-[#C5A059] tracking-[0.2em] font-bold uppercase`}
              >
                Gemological Report of Ceylon
              </h2>

              {/* 3 Gems Logo */}
              <div className='flex justify-center gap-4 mt-20'>
                <div className='w-8 h-10 bg-blue-800 rounded mx-1 shadow-sm'></div>
                <div className='w-8 h-10 bg-green-700 rounded mx-1 shadow-sm'></div>
                <div className='w-8 h-10 bg-red-700 rounded mx-1 shadow-sm'></div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function ReportRow({ label, value }: { label: string; value?: string | number }) {
  // Use non-breaking spaces + padding to push dots
  // The goal: Label [dots...................] Value
  return (
    <div className='flex items-baseline w-full text-[#1a1a1a]'>
      <span className='w-[170px] shrink-0 font-medium'>{label}:</span>
      <span className='flex-1 border-b border-dotted border-[#999] relative top-[-4px] mx-1'></span>
      <span className='font-medium shrink-0'>{value || ""}</span>
    </div>
  )
}
