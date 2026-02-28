import { useState } from "react"
import { Search, Activity, Building2, AlertCircle, Eye, X, Plus, Loader2 } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { type Gem, type Customer, type GemReference } from "@/lib/types"
import { gemsApi } from "@/lib/api/gems"
import { getImageById, deleteImage } from "@/lib/api/images"
import { useGem } from "@/hooks/useGemStore"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Textarea } from "@/components/ui/textarea"

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

import { GemImage } from "./GemImage"

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
  const [isCorrectionModalOpen, setIsCorrectionModalOpen] = useState(false)
  const [correctionStage, setCorrectionStage] = useState<"test1" | "test2" | null>(null)
  const [correctionNote, setCorrectionNote] = useState("")

  const openCorrectionModal = (stage: "test1" | "test2") => {
    setCorrectionStage(stage)
    setCorrectionNote("")
    setIsCorrectionModalOpen(true)
  }

  const submitCorrection = () => {
    if (correctionStage && correctionNote.trim()) {
      onHandleRequestCorrection(gem._id, correctionStage, correctionNote)
      setIsCorrectionModalOpen(false)
    }
  }

  const { refreshGems } = useGem()
  const [selectedImage, setSelectedImage] = useState<string | null>(null)
  const [activeImageId, setActiveImageId] = useState<string | null>(
    gem.images && gem.images.length > 0 ? gem.images[0] : null,
  )
  const [imageToDeleteId, setImageToDeleteId] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const handleRemoveImage = (imgId: string) => {
    setImageToDeleteId(imgId)
  }

  const handleConfirmDelete = async () => {
    if (!imageToDeleteId) return
    setIsDeleting(true)
    try {
      // First delete the image from the database
      await deleteImage(imageToDeleteId)

      const remainingIds = (gem.images || []).filter((id) => id !== imageToDeleteId)
      await gemsApi.updateGem(gem._id, { imageIds: remainingIds })

      await refreshGems()
      if (activeImageId === imageToDeleteId) {
        setActiveImageId(remainingIds[0] || null)
      }
    } catch (err) {
      console.error("Failed to remove image:", err)
      alert("Failed to delete image from database")
    } finally {
      setIsDeleting(false)
      setImageToDeleteId(null)
    }
  }

  const images = gem.images || []
  const firstImageId = activeImageId || (images.length > 0 ? images[0] : null)

  return (
    <div className='lg:col-span-2 space-y-6'>
      <Card className='p-5 bg-slate-50 border-slate-200'>
        {firstImageId ? (
          <div className='space-y-3'>
            <div className='relative aspect-video w-full overflow-hidden rounded-xl border border-slate-200 bg-white group'>
              <GemImage
                imageId={firstImageId}
                alt={gem.gemId}
                className='h-full w-full object-cover animate-in fade-in zoom-in duration-700'
              />
              <div className='absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity gap-2'>
                <Button
                  variant='ghost'
                  size='icon'
                  className='bg-white/20 hover:bg-white/30 backdrop-blur-md text-white rounded-full'
                  onClick={async () => {
                    if (firstImageId) {
                      try {
                        const imgData = await getImageById(firstImageId)
                        setSelectedImage(imgData.url)
                      } catch (err) {
                        console.error("Failed to fetch image for view:", err)
                      }
                    }
                  }}
                >
                  <Eye size={18} />
                </Button>
                {(user?.role === "ADMIN" || user?.role === "HELPER") && (
                  <label className='cursor-pointer p-2 bg-blue-600/80 hover:bg-blue-600 rounded-full text-white transition-all'>
                    <Plus size={18} />
                    <input
                      type='file'
                      className='hidden'
                      accept='image/*'
                      multiple
                      onChange={onImageUpdate}
                    />
                  </label>
                )}
              </div>
            </div>

            {images.length > 1 && (
              <div className='flex gap-2 overflow-x-auto pb-2 scrollbar-hide'>
                {images.map((imgId) => (
                  <div
                    key={imgId}
                    className={`relative shrink-0 w-16 h-12 rounded-lg border-2 overflow-hidden transition-all cursor-pointer ${
                      activeImageId === imgId ? "border-blue-500" : "border-transparent"
                    }`}
                    onClick={() => setActiveImageId(imgId)}
                  >
                    <GemImage imageId={imgId} className='w-full h-full object-cover' />
                    {(user?.role === "ADMIN" || user?.role === "HELPER") && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleRemoveImage(imgId)
                        }}
                        className='absolute top-0.5 right-0.5 bg-red-500 text-white rounded-full p-0.5 opacity-0 hover:opacity-100'
                      >
                        <X size={8} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          (user?.role === "ADMIN" || user?.role === "HELPER") && (
            <div className='mb-4 flex items-center justify-center aspect-video w-full rounded-xl border-2 border-dashed border-slate-200 bg-white group'>
              <label className='cursor-pointer flex flex-col items-center gap-2 text-slate-400 group-hover:text-blue-500 transition-colors'>
                <Plus size={24} />
                <span className='text-[10px] font-bold uppercase tracking-wider'>Add Images</span>
                <input
                  type='file'
                  className='hidden'
                  accept='image/*'
                  multiple
                  onChange={onImageUpdate}
                />
              </label>
            </div>
          )
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
        <div className='space-y-3 text-sm grid grid-cols-2 gap-4'>
          <div className='flex border-b border-slate-200 pb-1'>
            <span className='text-slate-500 pr-2'>Color:</span>{" "}
            <span className='font-bold'>{gem.color}</span>
          </div>
          <div className='flex border-b border-slate-200 pb-1'>
            <span className='text-slate-500 pr-2'>Weight:</span>{" "}
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

          <div className='space-y-2 overflow-y-auto pr-1' style={{ maxHeight: "calc(5 * 88px)" }}>
            {suggestions.length > 0 ? (
              <>
                {suggestions.map((s, i) => (
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
      {(gem.test1?.ri || gem.test2?.ri) && (user?.role === "ADMIN" || user?.role === "TESTER") && (
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
                      onClick={() => openCorrectionModal("test1")}
                    >
                      Correct
                    </Button>
                  )}
                </div>
              </div>
              <div className='text-xs space-y-1'>
                <p>
                  RI: <strong>{gem.test1.ri}</strong> | SG: <strong>{gem.test1.sg}</strong> |
                  Hardness: <strong>{gem.test1.hardness}</strong>
                </p>
                <div className='mt-3 space-y-3'>
                  {/* Identification */}
                  <div className='bg-slate-50 p-2.5 rounded-lg border border-slate-100'>
                    <div className='flex items-center justify-between mb-2'>
                      <span className='text-[10px] font-bold text-slate-500 uppercase tracking-wider'>
                        Identification
                      </span>
                    </div>
                    <div className='grid grid-cols-2 gap-x-4 gap-y-2 text-[11px]'>
                      <div>
                        <span className='text-slate-400 text-[10px]'>Species:</span>{" "}
                        <span className='font-bold text-slate-700'>
                          {gem.test1.observations?.species || "-"}
                        </span>
                      </div>
                      <div>
                        <span className='text-slate-400 text-[10px]'>Variety:</span>{" "}
                        <span className='font-bold text-slate-700'>
                          {gem.test1.observations?.variety || "-"}
                        </span>
                      </div>
                      <div className='col-span-2'>
                        <span className='text-slate-400 text-[10px]'>Origin:</span>{" "}
                        <span className='font-bold text-slate-700'>
                          {gem.test1.observations?.origin || "-"}
                        </span>
                      </div>
                      <div className='col-span-2 flex flex-wrap gap-x-6 gap-y-2 pt-1 border-t border-slate-200/50 mt-1'>
                        <div>
                          <span className='text-slate-400 text-[10px]'>Shape:</span>{" "}
                          <span className='font-medium text-slate-700'>
                            {gem.test1.observations?.cuttingShape ||
                              gem.test1.observations?.shape ||
                              "-"}
                          </span>
                        </div>
                        <div>
                          <span className='text-slate-400 text-[10px]'>Crown Style:</span>{" "}
                          <span className='font-medium text-slate-700'>
                            {gem.test1.observations?.crownStyle ||
                              gem.test1.observations?.cuttingStyle ||
                              gem.test1.observations?.cut ||
                              "-"}
                          </span>
                        </div>
                        <div>
                          <span className='text-slate-400 text-[10px]'>Pavilion Style:</span>{" "}
                          <span className='font-medium text-slate-700'>
                            {gem.test1.observations?.pavilionStyle || "-"}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Measurements & Properties */}
                  <div className='grid grid-cols-2 gap-3'>
                    <div className='bg-slate-50 p-2.5 rounded-lg border border-slate-100'>
                      <p className='text-[9px] font-bold text-slate-400 uppercase mb-1'>
                        Dimensions
                      </p>
                      <p className='font-mono text-[11px] font-medium text-slate-600 tracking-tight'>
                        {gem.test1.observations?.messurementX} x{" "}
                        {gem.test1.observations?.messurementY} x{" "}
                        {gem.test1.observations?.messurementZ}
                      </p>
                      <p className='text-[9px] text-slate-400 mt-0.5'>mm</p>
                    </div>
                    <div className='bg-slate-50 p-2.5 rounded-lg border border-slate-100'>
                      <p className='text-[9px] font-bold text-slate-400 uppercase mb-1'>
                        Transparency
                      </p>
                      <p className='font-medium text-[11px] text-slate-700'>
                        {gem.test1.observations?.transparency || "-"}
                      </p>
                      {gem.test1.observations?.spectroscopy && (
                        <p className='text-[9px] text-slate-500 mt-1 truncate'>
                          Spec: {gem.test1.observations?.spectroscopy}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Grading */}
                  <div className='bg-indigo-50/30 p-2.5 rounded-lg border border-indigo-50'>
                    <div className='flex justify-between items-center mb-2'>
                      <span className='text-[9px] font-bold text-indigo-400 uppercase tracking-wider'>
                        Grading Report
                      </span>
                      {gem.test1.observations?.grade && (
                        <Badge
                          variant='secondary'
                          className='h-4 text-[9px] px-2 bg-indigo-100 text-indigo-700 border-indigo-200'
                        >
                          {gem.test1.observations?.grade}
                        </Badge>
                      )}
                    </div>
                    <div className='grid grid-cols-4 gap-2 text-[10px] text-center'>
                      <div className='p-1.5 bg-white rounded-md border border-slate-100 shadow-sm'>
                        <span className='block text-slate-400 text-[8px] uppercase mb-0.5'>
                          Cut
                        </span>
                        <span className='font-bold text-slate-700'>
                          {gem.test1.observations?.cuttingGrade || "-"}
                        </span>
                      </div>
                      <div className='p-1.5 bg-white rounded-md border border-slate-100 shadow-sm'>
                        <span className='block text-slate-400 text-[8px] uppercase mb-0.5'>
                          Polish
                        </span>
                        <span className='font-bold text-slate-700'>
                          {gem.test1.observations?.polishingGrade || "-"}
                        </span>
                      </div>
                      <div className='p-1.5 bg-white rounded-md border border-slate-100 shadow-sm'>
                        <span className='block text-slate-400 text-[8px] uppercase mb-0.5'>
                          Sym
                        </span>
                        <span className='font-bold text-slate-700'>
                          {gem.test1.observations?.proportionGrade || "-"}
                        </span>
                      </div>
                      <div className='p-1.5 bg-white rounded-md border border-slate-100 shadow-sm'>
                        <span className='block text-slate-400 text-[8px] uppercase mb-0.5'>
                          Clarity
                        </span>
                        <div className='flex flex-col'>
                          <span className='font-bold text-slate-700 leading-tight'>
                            {gem.test1.observations?.clarityGrade || "-"}
                          </span>
                          {gem.test1.observations?.clarityEnhancement && (
                            <span className='text-[7px] text-blue-500 font-bold'>
                              {gem.test1.observations.clarityEnhancement}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className='p-1.5 bg-indigo-50/50 rounded-md border border-indigo-100 shadow-sm col-span-4 flex items-center justify-center gap-2 mt-1'>
                        <span className='text-indigo-500 text-[8px] font-black uppercase tracking-widest'>
                          Final Grade
                        </span>
                        <div className='flex gap-1'>
                          {[1, 2, 3, 4, 5].map((star) => (
                            <svg
                              key={star}
                              className={`w-3.5 h-3.5 ${star <= (gem.test1.observations?.finalGrade || 0) ? "text-amber-500 fill-amber-500" : "text-slate-300"}`}
                              viewBox='0 0 24 24'
                            >
                              <path d='M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z' />
                            </svg>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Description */}
                  {gem.test1.observations?.itemDescription && (
                    <div className='bg-slate-50 p-2.5 rounded-lg border border-slate-100'>
                      <p className='text-[9px] font-bold text-slate-500 uppercase mb-1'>
                        Item Description
                      </p>
                      <p className='text-[10px] text-slate-700 leading-relaxed font-serif italic'>
                        {gem.test1.observations?.itemDescription}
                      </p>
                    </div>
                  )}

                  {/* Comments */}
                  {gem.test1.observations?.comments && (
                    <div className='bg-yellow-50/50 p-2.5 rounded-lg border border-yellow-100/50'>
                      <p className='text-[9px] font-bold text-yellow-600/80 uppercase mb-1'>
                        Comments
                      </p>
                      <p className='text-[10px] text-yellow-800 leading-relaxed'>
                        {gem.test1.observations?.comments}
                      </p>
                    </div>
                  )}
                  {/* Special Note */}
                  {gem.test1.observations?.specialNote && (
                    <div className='bg-orange-50/50 p-2.5 rounded-lg border border-orange-100/50'>
                      <p className='text-[9px] font-bold text-orange-600/80 uppercase mb-1'>
                        Special Note
                      </p>
                      <p className='text-[10px] text-orange-800 leading-relaxed'>
                        {gem.test1.observations?.specialNote}
                      </p>
                    </div>
                  )}
                </div>
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
                      onClick={() => openCorrectionModal("test2")}
                    >
                      Correct
                    </Button>
                  )}
                </div>
              </div>
              <div className='text-xs space-y-1'>
                <p>
                  RI: <strong>{gem.test2.ri}</strong> | SG: <strong>{gem.test2.sg}</strong> |
                  Hardness: <strong>{gem.test2.hardness}</strong>
                </p>
                <div className='mt-3 space-y-3'>
                  {/* Identification */}
                  <div className='bg-slate-50 p-2.5 rounded-lg border border-slate-100'>
                    <div className='flex items-center justify-between mb-2'>
                      <span className='text-[10px] font-bold text-slate-500 uppercase tracking-wider'>
                        Identification
                      </span>
                    </div>
                    <div className='grid grid-cols-2 gap-x-4 gap-y-2 text-[11px]'>
                      <div>
                        <span className='text-slate-400 text-[10px]'>Species:</span>{" "}
                        <span className='font-bold text-slate-700'>
                          {gem.test2.observations?.species || "-"}
                        </span>
                      </div>
                      <div>
                        <span className='text-slate-400 text-[10px]'>Variety:</span>{" "}
                        <span className='font-bold text-slate-700'>
                          {gem.test2.observations?.variety || "-"}
                        </span>
                      </div>
                      <div className='col-span-2'>
                        <span className='text-slate-400 text-[10px]'>Origin:</span>{" "}
                        <span className='font-bold text-slate-700'>
                          {gem.test2.observations?.origin || "-"}
                        </span>
                      </div>
                      <div className='col-span-2 flex flex-wrap gap-x-6 gap-y-2 pt-1 border-t border-slate-200/50 mt-1'>
                        <div>
                          <span className='text-slate-400 text-[10px]'>Shape:</span>{" "}
                          <span className='font-medium text-slate-700'>
                            {gem.test2.observations?.cuttingShape ||
                              gem.test2.observations?.shape ||
                              "-"}
                          </span>
                        </div>
                        <div>
                          <span className='text-slate-400 text-[10px]'>Crown Style:</span>{" "}
                          <span className='font-medium text-slate-700'>
                            {gem.test2.observations?.crownStyle ||
                              gem.test2.observations?.cuttingStyle ||
                              gem.test2.observations?.cut ||
                              "-"}
                          </span>
                        </div>
                        <div>
                          <span className='text-slate-400 text-[10px]'>Pavilion Style:</span>{" "}
                          <span className='font-medium text-slate-700'>
                            {gem.test2.observations?.pavilionStyle || "-"}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Measurements & Properties */}
                  <div className='grid grid-cols-2 gap-3'>
                    <div className='bg-slate-50 p-2.5 rounded-lg border border-slate-100'>
                      <p className='text-[9px] font-bold text-slate-400 uppercase mb-1'>
                        Dimensions
                      </p>
                      <p className='font-mono text-[11px] font-medium text-slate-600 tracking-tight'>
                        {gem.test2.observations?.messurementX} x{" "}
                        {gem.test2.observations?.messurementY} x{" "}
                        {gem.test2.observations?.messurementZ}
                      </p>
                      <p className='text-[9px] text-slate-400 mt-0.5'>mm</p>
                    </div>
                    <div className='bg-slate-50 p-2.5 rounded-lg border border-slate-100'>
                      <p className='text-[9px] font-bold text-slate-400 uppercase mb-1'>
                        Transparency
                      </p>
                      <p className='font-medium text-[11px] text-slate-700'>
                        {gem.test2.observations?.transparency || "-"}
                      </p>
                      {gem.test2.observations?.spectroscopy && (
                        <p className='text-[9px] text-slate-500 mt-1 truncate'>
                          Spec: {gem.test2.observations?.spectroscopy}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Grading */}
                  <div className='bg-purple-50/30 p-2.5 rounded-lg border border-purple-50'>
                    <div className='flex justify-between items-center mb-2'>
                      <span className='text-[9px] font-bold text-purple-400 uppercase tracking-wider'>
                        Grading Report
                      </span>
                      {gem.test2.observations?.grade && (
                        <Badge
                          variant='secondary'
                          className='h-4 text-[9px] px-2 bg-purple-100 text-purple-700 border-purple-200'
                        >
                          {gem.test2.observations?.grade}
                        </Badge>
                      )}
                    </div>
                    <div className='grid grid-cols-4 gap-2 text-[10px] text-center'>
                      <div className='p-1.5 bg-white rounded-md border border-slate-100 shadow-sm'>
                        <span className='block text-slate-400 text-[8px] uppercase mb-0.5'>
                          Cut
                        </span>
                        <span className='font-bold text-slate-700'>
                          {gem.test2.observations?.cuttingGrade || "-"}
                        </span>
                      </div>
                      <div className='p-1.5 bg-white rounded-md border border-slate-100 shadow-sm'>
                        <span className='block text-slate-400 text-[8px] uppercase mb-0.5'>
                          Polish
                        </span>
                        <span className='font-bold text-slate-700'>
                          {gem.test2.observations?.polishingGrade || "-"}
                        </span>
                      </div>
                      <div className='p-1.5 bg-white rounded-md border border-slate-100 shadow-sm'>
                        <span className='block text-slate-400 text-[8px] uppercase mb-0.5'>
                          Sym
                        </span>
                        <span className='font-bold text-slate-700'>
                          {gem.test2.observations?.proportionGrade || "-"}
                        </span>
                      </div>
                      <div className='p-1.5 bg-white rounded-md border border-slate-100 shadow-sm'>
                        <span className='block text-slate-400 text-[8px] uppercase mb-0.5'>
                          Clarity
                        </span>
                        <div className='flex flex-col'>
                          <span className='font-bold text-slate-700 leading-tight'>
                            {gem.test2.observations?.clarityGrade || "-"}
                          </span>
                          {gem.test2.observations?.clarityEnhancement && (
                            <span className='text-[7px] text-purple-500 font-bold'>
                              {gem.test2.observations.clarityEnhancement}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className='p-1.5 bg-purple-50/50 rounded-md border border-purple-100 shadow-sm col-span-4 flex items-center justify-center gap-2 mt-1'>
                        <span className='text-purple-500 text-[8px] font-black uppercase tracking-widest'>
                          Final Grade
                        </span>
                        <div className='flex gap-1'>
                          {[1, 2, 3, 4, 5].map((star) => (
                            <svg
                              key={star}
                              className={`w-3.5 h-3.5 ${star <= (gem.test2.observations?.finalGrade || 0) ? "text-amber-500 fill-amber-500" : "text-slate-300"}`}
                              viewBox='0 0 24 24'
                            >
                              <path d='M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z' />
                            </svg>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Description */}
                  {gem.test2.observations?.itemDescription && (
                    <div className='bg-slate-50 p-2.5 rounded-lg border border-slate-100'>
                      <p className='text-[9px] font-bold text-slate-500 uppercase mb-1'>
                        Item Description
                      </p>
                      <p className='text-[10px] text-slate-700 leading-relaxed font-serif italic'>
                        {gem.test2.observations?.itemDescription}
                      </p>
                    </div>
                  )}

                  {/* Comments */}
                  {gem.test2.observations?.comments && (
                    <div className='bg-yellow-50/50 p-2.5 rounded-lg border border-yellow-100/50'>
                      <p className='text-[9px] font-bold text-yellow-600/80 uppercase mb-1'>
                        Comments
                      </p>
                      <p className='text-[10px] text-yellow-800 leading-relaxed'>
                        {gem.test2.observations?.comments}
                      </p>
                    </div>
                  )}
                  {/* Special Note */}
                  {gem.test2.observations?.specialNote && (
                    <div className='bg-orange-50/50 p-2.5 rounded-lg border border-orange-100/50'>
                      <p className='text-[9px] font-bold text-orange-600/80 uppercase mb-1'>
                        Special Note
                      </p>
                      <p className='text-[10px] text-orange-800 leading-relaxed'>
                        {gem.test2.observations?.specialNote}
                      </p>
                    </div>
                  )}
                </div>
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

      {/* Correction Request Modal */}
      <Dialog open={isCorrectionModalOpen} onOpenChange={setIsCorrectionModalOpen}>
        <DialogContent className='sm:max-w-md'>
          <DialogHeader>
            <DialogTitle className='flex items-center gap-2'>
              <AlertCircle className='h-5 w-5 text-red-500' />
              Request Correction
            </DialogTitle>
            <DialogDescription>
              Specify what needs to be corrected for{" "}
              <span className='font-bold uppercase tracking-tight text-slate-900'>
                {correctionStage === "test1" ? "Tester 1" : "Tester 2"}
              </span>{" "}
              submission.
            </DialogDescription>
          </DialogHeader>

          <div className='py-4'>
            <Textarea
              placeholder='Enter your correction instructions here...'
              value={correctionNote}
              onChange={(e) => setCorrectionNote(e.target.value)}
              className='min-h-[120px] text-sm focus-visible:ring-red-500'
            />
          </div>

          <DialogFooter className='sm:justify-end gap-2'>
            <Button variant='outline' onClick={() => setIsCorrectionModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant='destructive'
              onClick={submitCorrection}
              disabled={!correctionNote.trim()}
              className='bg-red-600 hover:bg-red-700'
            >
              Send Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Image Dialog */}
      <Dialog open={!!selectedImage} onOpenChange={() => setSelectedImage(null)}>
        <DialogContent className='max-w-4xl p-0 bg-transparent border-none'>
          <DialogHeader className='hidden'>
            <DialogTitle>View Image</DialogTitle>
          </DialogHeader>
          <div className='relative w-full aspect-auto flex items-center justify-center'>
            <img
              src={selectedImage || ""}
              alt='Selected gem'
              className='max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl'
            />
            <button
              onClick={() => setSelectedImage(null)}
              className='absolute -top-12 right-0 p-2 bg-white/20 hover:bg-white/40 rounded-full text-white transition-all'
            >
              <X size={24} />
            </button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={imageToDeleteId !== null}
        onOpenChange={(open) => !open && setImageToDeleteId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This image will be permanently deleted from the
              database.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className='bg-red-600 hover:bg-red-700 text-white'
              disabled={isDeleting}
            >
              {isDeleting ? (
                <>
                  <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
