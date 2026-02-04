import { Search, Activity, Building2 } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { BASE_URL } from "@/lib/api/config"
import { type Gem, type Customer, type GemReference } from "@/lib/types"

interface GemIntakeAndHistoryProps {
  gem: Gem
  user: any
  customer: Customer | null
  suggestions: GemReference[]
  watchedHardness: string
  onReset: (values: any) => void
  onWatch: () => any
  onSetSpeciesSearch: (val: string) => void
  onSetVarietySearch: (val: string) => void
  onImageUpdate: (e: React.ChangeEvent<HTMLInputElement>) => void
  onCopyValues: (source: any) => void
  onHandleRequestCorrection: (gemId: string, stage: "test1" | "test2", note: string) => void
  isApproval: boolean
}

export function GemIntakeAndHistory({
  gem,
  user,
  customer,
  suggestions,
  watchedHardness,
  onReset,
  onWatch,
  onSetSpeciesSearch,
  onSetVarietySearch,
  onImageUpdate,
  onCopyValues,
  onHandleRequestCorrection,
  isApproval,
}: GemIntakeAndHistoryProps) {
  return (
    <div className='lg:col-span-1 space-y-6'>
      <Card className='p-5 bg-slate-50 border-slate-200'>
        <h3 className='text-xs font-bold text-slate-500 uppercase tracking-wider mb-4'>
          Intake Details
        </h3>
        {gem.imageUrl && (
          <div className='mb-4 relative aspect-video w-full overflow-hidden rounded-xl border border-slate-200 bg-white group'>
            <img
              src={gem.imageUrl.startsWith("http") ? gem.imageUrl : `${BASE_URL}${gem.imageUrl}`}
              alt={gem.gemId}
              className='h-full w-full object-cover animate-in fade-in zoom-in duration-700'
            />
            {(user?.role === "ADMIN" || user?.role === "HELPER") && (
              <div className='absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity'>
                <label className='cursor-pointer bg-white/20 hover:bg-white/30 backdrop-blur-md text-white px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider border border-white/30 transition-all'>
                  Change Image
                  <input type='file' className='hidden' accept='image/*' onChange={onImageUpdate} />
                </label>
              </div>
            )}
          </div>
        )}
        {customer && (
          <div className='mb-4 p-3 bg-white rounded-lg border border-slate-200'>
            <div className='flex items-center gap-2 mb-2'>
              <Building2 size={14} className='text-blue-500' />
              <span className='text-[10px] font-black uppercase text-slate-400'>
                Associated Customer
              </span>
            </div>
            <p className='text-xs font-bold text-slate-800 leading-tight'>
              {customer.customerName}
            </p>
            <p className='text-[10px] text-slate-500'>{customer.companyName}</p>
          </div>
        )}
        <div className='space-y-3 text-sm'>
          <div className='flex justify-between border-b border-slate-200 pb-1'>
            <span className='text-slate-500'>Color:</span>{" "}
            <span className='font-bold'>{gem.color}</span>
          </div>
          <div className='flex justify-between border-b border-slate-200 pb-1'>
            <span className='text-slate-500'>Weight:</span>{" "}
            <span className='font-bold'>{gem.weight}</span>
          </div>
          <div className='pt-2'>
            <p className='text-[10px] uppercase font-bold text-slate-400 mb-1'>Description</p>
            <p className='text-xs text-slate-600 leading-relaxed'>{gem.itemDescription}</p>
          </div>
        </div>
      </Card>

      {/* Scientific Suggestions */}
      {user?.role !== "HELPER" && (
        <Card className='p-5 bg-blue-50/50 border-blue-100 shadow-md animate-in fade-in slide-in-from-left-4 duration-500'>
          <div className='flex items-center gap-2 mb-4'>
            <div className='p-1.5 bg-blue-100 rounded-lg'>
              <Activity size={16} className='text-blue-600' />
            </div>
            <h3 className='text-xs font-bold text-blue-800 uppercase tracking-wider'>
              Scientific Suggestions
            </h3>
          </div>

          <p className='text-[10px] text-blue-600 mb-3 leading-relaxed'>
            Matching species based on current RI, SG, and Hardness readings:
          </p>

          <div className='space-y-2'>
            {suggestions.length > 0 ? (
              <>
                {suggestions.slice(0, 5).map((s, i) => (
                  <button
                    key={i}
                    type='button'
                    onClick={() => {
                      onReset({
                        ...onWatch(),
                        species: s.species || "",
                        selectedVariety: s.variety,
                        hardness:
                          s.hardnessMin?.toString() || s.hardnessMax?.toString() || watchedHardness,
                      })
                      onSetSpeciesSearch(s.species || "")
                      onSetVarietySearch(s.variety || "")
                    }}
                    className='w-full text-left p-3 bg-white border border-blue-100 rounded-xl hover:border-blue-400 hover:shadow-lg transition-all group relative overflow-hidden'
                  >
                    <div className='absolute top-0 right-0 p-1'>
                      <Badge
                        variant='outline'
                        className='text-[7px] h-3 bg-blue-50 border-blue-100 text-blue-600 font-bold px-1'
                      >
                        MATCH
                      </Badge>
                    </div>
                    <div className='flex flex-col'>
                      <p className='text-xs font-black text-slate-800 group-hover:text-blue-700 font-serif transition-colors'>
                        {s.variety}
                      </p>
                      <p className='text-[10px] text-slate-500 italic opacity-80 mb-2'>
                        {s.species || "Unknown Species"}
                      </p>
                      <div className='flex flex-wrap gap-x-3 gap-y-1 mt-1 pt-1 border-t border-blue-50/50'>
                        <div className='flex flex-col'>
                          <span className='text-[8px] font-bold text-slate-400 uppercase leading-none'>
                            R.I.
                          </span>
                          <span className='text-[9px] font-bold text-blue-700'>
                            {s.refractiveIndexMin}
                            {s.refractiveIndexMax !== s.refractiveIndexMin
                              ? ` - ${s.refractiveIndexMax}`
                              : ""}
                          </span>
                        </div>
                        <div className='flex flex-col'>
                          <span className='text-[8px] font-bold text-slate-400 uppercase leading-none'>
                            S.G.
                          </span>
                          <span className='text-[9px] font-bold text-blue-700'>
                            {s.specificGravityMin}
                            {s.specificGravityMax !== s.specificGravityMin
                              ? ` - ${s.specificGravityMax}`
                              : ""}
                          </span>
                        </div>
                        <div className='flex flex-col'>
                          <span className='text-[8px] font-bold text-slate-400 uppercase leading-none'>
                            H
                          </span>
                          <span className='text-[9px] font-bold text-blue-700'>
                            {s.hardnessMin}
                            {s.hardnessMax !== s.hardnessMin ? ` - ${s.hardnessMax}` : ""}
                          </span>
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
                {suggestions.length > 5 && (
                  <p className='text-[9px] text-center text-slate-400 pt-1 italic'>
                    + {suggestions.length - 5} more scientific matches
                  </p>
                )}
              </>
            ) : (
              <div className='py-8 text-center border-2 border-dashed border-blue-100 rounded-2xl bg-white/40 animate-in fade-in duration-700'>
                <Search className='mx-auto h-8 w-8 text-blue-200 mb-2' />
                <p className='text-[10px] font-black text-blue-400 uppercase tracking-[0.2em]'>
                  No matching gems found
                </p>
                <p className='text-[9px] text-blue-300 mt-1 italic'>
                  Enter Scientific Data to see suggestions
                </p>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Historical Blocks */}
      {(gem.test1?.ri || gem.test2?.ri) && (
        <div className='space-y-4'>
          {gem.test1?.ri && (
            <Card className='p-4 border-l-4 border-l-blue-500 shadow-sm'>
              <div className='flex justify-between items-center mb-2'>
                <span className='text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded'>
                  TESTER 1
                </span>
                <div className='flex items-center gap-1'>
                  {isApproval && (
                    <Button
                      variant='ghost'
                      size='sm'
                      className='h-6 text-[10px]'
                      onClick={() => onCopyValues(gem.test1)}
                    >
                      Copy Data
                    </Button>
                  )}
                  {user?.role === "ADMIN" && (
                    <Button
                      variant='ghost'
                      size='sm'
                      className='h-6 text-[10px] text-red-600 hover:text-red-700 hover:bg-red-50'
                      onClick={() => {
                        const note = window.prompt("Enter correction note for Tester 1:")
                        if (note) onHandleRequestCorrection(gem._id, "test1", note)
                      }}
                    >
                      Correct
                    </Button>
                  )}
                </div>
              </div>
              <div className='text-xs space-y-1'>
                <p>
                  RI: <strong>{gem.test1.ri}</strong> | SG: <strong>{gem.test1.sg}</strong>
                </p>
                <p>
                  Var: <strong>{gem.test1.selectedVariety}</strong>
                </p>
                {gem.test1.correctionRequested && (
                  <div className='mt-2 p-2 bg-red-50 rounded border border-red-100'>
                    <p className='text-[9px] font-bold text-red-600 uppercase'>
                      Correction Requested
                    </p>
                    <p className='text-[10px] text-red-800 italic'>{gem.test1.correctionNote}</p>
                  </div>
                )}
                {gem.test1.history && gem.test1.history.length > 0 && (
                  <div className='mt-3 pt-3 border-t border-slate-100'>
                    <p className='text-[9px] font-bold text-slate-400 uppercase mb-2'>
                      Resubmission History
                    </p>
                    <div className='space-y-1 max-h-32 overflow-y-auto pr-1'>
                      {gem.test1.history
                        .slice()
                        .reverse()
                        .map((h: any, idx: number) => (
                          <div
                            key={idx}
                            className='text-[10px] bg-white p-2 rounded border border-slate-100 opacity-80'
                          >
                            <div className='flex justify-between mb-1'>
                              <span className='font-bold'>
                                #{(gem.test1?.history?.length || 0) - idx}
                              </span>
                              <span className='text-[8px] text-slate-400'>
                                {new Date(h.timestamp).toLocaleString()}
                              </span>
                            </div>
                            RI: {h.ri} | SG: {h.sg} | Var: {h.selectedVariety}
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            </Card>
          )}
          {gem.test2?.ri && (
            <Card className='p-4 border-l-4 border-l-purple-500 shadow-sm'>
              <div className='flex justify-between items-center mb-2'>
                <span className='text-[10px] font-bold text-purple-600 bg-purple-50 px-2 py-0.5 rounded'>
                  TESTER 2
                </span>
                <div className='flex items-center gap-1'>
                  {isApproval && (
                    <Button
                      variant='ghost'
                      size='sm'
                      className='h-6 text-[10px]'
                      onClick={() => onCopyValues(gem.test2)}
                    >
                      Copy Data
                    </Button>
                  )}
                  {user?.role === "ADMIN" && (
                    <Button
                      variant='ghost'
                      size='sm'
                      className='h-6 text-[10px] text-red-600 hover:text-red-700 hover:bg-red-50'
                      onClick={() => {
                        const note = window.prompt("Enter correction note for Tester 2:")
                        if (note) onHandleRequestCorrection(gem._id, "test2", note)
                      }}
                    >
                      Correct
                    </Button>
                  )}
                </div>
              </div>
              <div className='text-xs space-y-1'>
                <p>
                  RI: <strong>{gem.test2.ri}</strong> | SG: <strong>{gem.test2.sg}</strong>
                </p>
                <p>
                  Var: <strong>{gem.test2.selectedVariety}</strong>
                </p>
                {gem.test2.correctionRequested && (
                  <div className='mt-2 p-2 bg-red-50 rounded border border-red-100'>
                    <p className='text-[9px] font-bold text-red-600 uppercase'>
                      Correction Requested
                    </p>
                    <p className='text-[10px] text-red-800 italic'>{gem.test2.correctionNote}</p>
                  </div>
                )}
                {gem.test2.history && gem.test2.history.length > 0 && (
                  <div className='mt-3 pt-3 border-t border-slate-100'>
                    <p className='text-[9px] font-bold text-slate-400 uppercase mb-2'>
                      Resubmission History
                    </p>
                    <div className='space-y-1 max-h-32 overflow-y-auto pr-1'>
                      {gem.test2.history
                        .slice()
                        .reverse()
                        .map((h: any, idx: number) => (
                          <div
                            key={idx}
                            className='text-[10px] bg-white p-2 rounded border border-slate-100 opacity-80'
                          >
                            <div className='flex justify-between mb-1'>
                              <span className='font-bold'>
                                #{(gem.test2?.history?.length || 0) - idx}
                              </span>
                              <span className='text-[8px] text-slate-400'>
                                {new Date(h.timestamp).toLocaleString()}
                              </span>
                            </div>
                            RI: {h.ri} | SG: {h.sg} | Var: {h.selectedVariety}
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            </Card>
          )}
        </div>
      )}
    </div>
  )
}
