import React from 'react'
import { Search, Activity } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { type GemReference } from "@/lib/types"

interface ScientificSuggestionsProps {
  suggestions: GemReference[]
  watchedHardness: string
  onReset: (values: any) => void
  onWatch: () => any
  onSetSpeciesSearch: (val: string) => void
  onSetVarietySearch: (val: string) => void
}

export function ScientificSuggestions({
  suggestions,
  watchedHardness,
  onReset,
  onWatch,
  onSetSpeciesSearch,
  onSetVarietySearch,
}: ScientificSuggestionsProps) {
  const getScoreBadgeClass = (score: number) => {
    if (score >= 80) return 'bg-green-100 border-green-300 text-green-700'
    if (score >= 50) return 'bg-yellow-100 border-yellow-300 text-yellow-700'
    return 'bg-orange-100 border-orange-300 text-orange-700'
  }

  return (
    <Card className='p-5 bg-blue-50/50 border-blue-100 shadow-md animate-in fade-in slide-in-from-left-4 duration-500 flex flex-col max-h-[500px]'>
      <div className='flex items-center gap-2 mb-4 shrink-0'>
        <div className='p-1.5 bg-blue-100 rounded-lg'>
          <Activity size={16} className='text-blue-600' />
        </div>
        <h3 className='text-xs font-bold text-blue-800 uppercase tracking-wider'>
          Scientific Suggestions
        </h3>
      </div>

      <p className='text-[10px] text-blue-600 mb-3 leading-relaxed shrink-0'>
        Matching species based on current RI, SG, and Hardness readings:
      </p>

      <div className='space-y-2 pr-1 overflow-y-auto flex-1'>
        {suggestions.length > 0 ? (
          <>
            {suggestions.map((s, i) => {
              const prevScore = i > 0 ? (suggestions[i - 1].matchScore ?? 0) : 100
              const currScore = s.matchScore ?? 0
              const showSeparator = i > 0 && prevScore >= 90 && currScore < 90
              return (
                <React.Fragment key={i}>
                  {showSeparator && (
                    <div className='flex items-center gap-2 my-1'>
                      <div className='flex-1 h-px bg-blue-100' />
                      <span className='text-[8px] text-blue-300 font-bold uppercase tracking-wider whitespace-nowrap'>
                        Nearby Matches
                      </span>
                      <div className='flex-1 h-px bg-blue-100' />
                    </div>
                  )}
                  <button
                    type='button'
                    onClick={() => {
                      onReset({
                        ...onWatch(),
                        species: s.species || "",
                        selectedVariety: s.variety,
                        hardnessMin: s.hardnessMin?.toString() || watchedHardness,
                        hardnessMax: s.hardnessMax?.toString() || watchedHardness,
                      })
                      onSetSpeciesSearch(s.species || "")
                      onSetVarietySearch(s.variety || "")
                    }}
                    className='w-full text-left p-3 bg-white border border-blue-100 rounded-xl hover:border-blue-400 hover:shadow-lg transition-all group relative overflow-hidden'
                  >
                    <div className='absolute top-0 right-0 p-1'>
                      <Badge
                        variant='outline'
                        className={`text-[7px] h-3 font-bold px-1 ${getScoreBadgeClass(currScore)}`}
                      >
                        {s.matchScore !== undefined ? `${s.matchScore}%` : 'MATCH'}
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
                </React.Fragment>
              )
            })}
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
  )
}
