import { ShieldCheck } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"

import { type Gem } from "@/lib/types"

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
                    {gem.finalApproval.ri || "N/A"}
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
                    {gem.finalApproval.hardness || "N/A"}
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
              <div className='pt-2 grid grid-cols-2 gap-4'>
                <div>
                  <p className='text-[9px] font-bold text-slate-400 uppercase mb-1'>Cluster Size</p>
                  <p className='text-xs font-bold text-slate-800'>
                    {gem.finalApproval.finalObservations?.cluster} mm
                  </p>
                </div>
                <div>
                  <p className='text-[9px] font-bold text-slate-400 uppercase mb-1'>Stone Size</p>
                  <p className='text-xs font-bold text-slate-800'>
                    {gem.finalApproval.finalObservations?.stone} mm
                  </p>
                </div>
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
          </div>
        </div>

        <Button variant='outline' onClick={() => onNavigateToReport(gem._id)}>
          View Certificate
        </Button>
      </Card>
    </div>
  )
}
