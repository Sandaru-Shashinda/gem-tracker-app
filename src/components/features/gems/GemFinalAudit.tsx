import { ShieldCheck } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"

import { type Gem, type ObservationData } from "@/lib/types"
import { TREATMENT_SECTIONS, hasAnyTreatment, normalizeTreatments } from "@/lib/treatments"

interface GemFinalAuditProps {
  gem: Gem
  onNavigateToReport: (gemId: string) => void
}

export function GemFinalAudit({ gem, onNavigateToReport }: GemFinalAuditProps) {
  if (!gem.finalApproval) return null

  return (
    <div className='space-y-6'>
      <Card className='p-8 border-l-4 border-l-emerald-500 shadow-md'>
        <div className='flex items-center justify-between mb-8'>
          <div className='flex items-center gap-3'>
            <div className='w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center'>
              <ShieldCheck className='text-emerald-600' size={24} />
            </div>
            <div>
              <h3 className='text-xl font-bold text-slate-900'>Final Technical Audit</h3>
              <p className='text-sm text-slate-500'>Verified Laboratory Record</p>
            </div>
          </div>
          <Badge
            variant='outline'
            className='px-4 py-1 text-emerald-700 bg-emerald-50 border-emerald-200'
          >
            Official Certificate Data
          </Badge>
        </div>

        <div className='grid grid-cols-1 md:grid-cols-2 gap-10'>
          <div className='space-y-8'>
            <div>
              <h4 className='text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4 border-b pb-2 flex justify-between'>
                Laboratory Measurements <span>[METRIC]</span>
              </h4>
              <div className='grid grid-cols-3 gap-3'>
                <div className='p-4 bg-slate-50 rounded-xl border border-slate-100'>
                  <p className='text-[9px] font-bold text-slate-400 uppercase mb-1'>R.I.</p>
                  <p className='text-base font-black text-slate-800'>
                    {gem.finalApproval.ri ?? "N/A"}
                  </p>
                </div>
                <div className='p-4 bg-slate-50 rounded-xl border border-slate-100'>
                  <p className='text-[9px] font-bold text-slate-400 uppercase mb-1'>S.G.</p>
                  <p className='text-base font-black text-slate-800'>
                    {gem.finalApproval.sg || "N/A"}
                  </p>
                </div>
                <div className='p-4 bg-slate-50 rounded-xl border border-slate-100'>
                  <p className='text-[9px] font-bold text-slate-400 uppercase mb-1'>Hardness</p>
                  <p className='text-base font-black text-slate-800'>
                    {gem.finalApproval.hardnessMin && gem.finalApproval.hardnessMax
                      ? gem.finalApproval.hardnessMin === gem.finalApproval.hardnessMax
                        ? gem.finalApproval.hardnessMin
                        : `${gem.finalApproval.hardnessMin} - ${gem.finalApproval.hardnessMax}`
                      : gem.finalApproval.hardnessMin || gem.finalApproval.hardnessMax || "N/A"}
                  </p>
                </div>
              </div>
            </div>

            <div className='space-y-4 bg-white p-5 rounded-2xl border border-slate-100 shadow-sm'>
              <div className='flex justify-between items-center text-sm'>
                <span className='font-bold text-slate-500 italic'>Shape:</span>
                <span className='font-black text-slate-800 bg-slate-50 px-3 py-1 rounded'>
                  {gem.finalApproval.finalObservations?.shape}
                </span>
              </div>
              <div className='flex justify-between items-center text-sm'>
                <span className='font-bold text-slate-500 italic'>Cut:</span>
                <span className='font-black text-slate-800 bg-slate-50 px-3 py-1 rounded'>
                  {gem.finalApproval.finalObservations?.cut}
                </span>
              </div>
              <div className='flex justify-between items-center text-sm'>
                <span className='font-bold text-slate-500 italic'>Transparency:</span>
                <span className='font-black text-slate-800'>
                  {gem.finalApproval.finalObservations?.transparency}
                </span>
              </div>
            </div>

            {/* Colour breakdown — printed in the large report's DETAILS block */}
            <div>
              <h4 className='text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4 border-b pb-2'>
                Colour Profile
              </h4>
              <div className='grid grid-cols-3 gap-3'>
                {[
                  { label: "Hue", value: gem.finalApproval.finalObservations?.hue },
                  { label: "Tone", value: gem.finalApproval.finalObservations?.tone },
                  { label: "Saturation", value: gem.finalApproval.finalObservations?.saturation },
                ].map((item) => (
                  <div
                    key={item.label}
                    className='p-4 bg-slate-50 rounded-xl border border-slate-100'
                  >
                    <p className='text-[9px] font-bold text-slate-400 uppercase mb-1'>
                      {item.label}
                    </p>
                    <p className='text-base font-black text-slate-800'>{item.value || "N/A"}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className='space-y-8'>
            <div>
              <h4 className='text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4 border-b pb-2'>
                Authenticity & Grading
              </h4>
              <div className='p-6 bg-emerald-950 rounded-2xl shadow-xl shadow-emerald-900/10 mb-6'>
                <div className='flex justify-between items-center mb-4'>
                  <span className='text-[10px] font-bold text-emerald-400 uppercase'>Variety</span>
                  <Badge className='bg-emerald-500 text-white border-0 text-xs py-1 px-4'>
                    {gem.finalApproval.finalVariety}
                  </Badge>
                </div>
                <div className='flex justify-between items-center'>
                  <span className='text-[10px] font-bold text-emerald-400 uppercase'>
                    Geographic Origin
                  </span>
                  <span className='text-sm font-black text-white italic'>
                    {gem.finalApproval.finalObservations?.origin}
                  </span>
                </div>
              </div>

              <div className='grid grid-cols-2 gap-3'>
                {[
                  { label: "Cutting", key: "cuttingGrade" },
                  { label: "Polishing", key: "polishingGrade" },
                  { label: "Proportion", key: "proportionGrade" },
                  { label: "Clarity", key: "clarityGrade" },
                ].map((item) => (
                  <div
                    key={item.key}
                    className='p-4 bg-white rounded-xl border border-slate-200 flex flex-col items-center text-center'
                  >
                    <p className='text-[9px] font-black text-slate-400 uppercase mb-2'>
                      {item.label}
                    </p>
                    <p className='text-sm font-black text-emerald-600 italic'>
                      {(gem.finalApproval!.finalObservations as any)?.[item.key] || "Fine"}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className='mt-10 space-y-4'>
          <div className='p-6 bg-slate-900 rounded-2xl relative overflow-hidden'>
            <div className='absolute top-0 right-0 w-32 h-32 bg-slate-800/50 rounded-full blur-3xl -mr-16 -mt-16'></div>
            <p className='text-[10px] uppercase font-black text-slate-500 mb-3 tracking-widest relative z-10'>
              Item Description (Permanent Record)
            </p>
            <p className='text-base text-slate-300 leading-relaxed font-light relative z-10 italic'>
              "
              {gem.finalApproval.itemDescription ||
                gem.finalApproval.finalObservations?.itemDescription ||
                "N/A"}
              "
            </p>
          </div>

          <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
            <div className='p-5 bg-slate-50 rounded-2xl border border-slate-100'>
              <p className='text-[10px] uppercase font-black text-slate-400 mb-2 tracking-widest'>
                Laboratory Comments
              </p>
              <p className='text-sm text-slate-600'>
                {gem.finalApproval.finalObservations?.comments || "No comments provided"}
              </p>
            </div>
            <div className='p-5 bg-amber-50 rounded-2xl border border-amber-100'>
              <p className='text-[10px] uppercase font-black text-amber-600 mb-2 tracking-widest'>
                Special Note
              </p>
              <p className='text-sm text-slate-600 font-medium'>
                {gem.finalApproval.finalObservations?.specialNote || "No special notes provided"}
              </p>
            </div>
            <div className='p-5 bg-purple-50 rounded-2xl border border-purple-100'>
              <p className='text-[10px] uppercase font-black text-purple-600 mb-2 tracking-widest'>
                Treatment
              </p>
              <p className='text-sm text-slate-600 font-medium'>
                {gem.finalApproval.finalObservations?.treatment || "No specific treatment"}
              </p>
            </div>
          </div>

          {/* The approved Yes/No checklist, in the same three categories the large
              report prints. Unanswered treatments show a dash, not a "No". */}
          <TreatmentAudit treatments={gem.finalApproval.finalObservations?.treatments} />
        </div>

        <Button variant='outline' onClick={() => onNavigateToReport(gem._id)}>
          View Certificate
        </Button>
      </Card>
    </div>
  )
}

/**
 * The approved treatment checklist. Rendered whole rather than as a "detected" summary:
 * on a certificate a recorded "No" is a finding in its own right, and the reader needs
 * to see which treatments were never assessed at all.
 */
function TreatmentAudit({ treatments }: { treatments?: ObservationData["treatments"] }) {
  const values = normalizeTreatments(treatments)
  const assessed = hasAnyTreatment(values)

  return (
    <div className='p-5 bg-purple-50/60 rounded-2xl border border-purple-100'>
      <div className='flex items-center justify-between mb-4'>
        <p className='text-[10px] uppercase font-black text-purple-600 tracking-widest'>
          Treatment Analysis
        </p>
        {!assessed && (
          <span className='text-[9px] font-bold uppercase text-slate-400'>Not assessed</span>
        )}
      </div>

      <div className='grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-5'>
        {TREATMENT_SECTIONS.map((section) => (
          <div key={section.title} className='space-y-2'>
            <p className='text-[9px] font-bold text-purple-400 uppercase tracking-wider'>
              {section.title}
            </p>
            <div className='space-y-1'>
              {section.items.map((item) => {
                const value = values[item.key]
                return (
                  <div
                    key={item.key}
                    className='flex items-center justify-between gap-2 bg-white rounded-md border border-purple-100/60 px-2 py-1'
                  >
                    <span className='text-[11px] text-slate-700 font-medium leading-tight'>
                      {item.label}
                    </span>
                    <span
                      className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded shrink-0 ${
                        value === "Yes"
                          ? "bg-purple-600 text-white"
                          : value === "No"
                            ? "bg-slate-100 text-slate-600"
                            : "text-slate-300"
                      }`}
                    >
                      {value || "—"}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
