import { useState } from "react"
import QRCode from "react-qr-code"
import { ImageIcon, Repeat } from "lucide-react"
import { cn } from "@/lib/utils"
import type { Gem } from "@/lib/types"
import { GemImage } from "../gems/GemImage"

interface SmallReportPreviewProps {
  gem: Gem
  includeLogo: boolean
  reportId?: string
}

export function SmallReportPreview({ gem, reportId }: SmallReportPreviewProps) {
  const finalData = gem.finalApproval || {}
  const obs = finalData.finalObservations || {}
  const verificationUrl = `${window.location.origin}/reports/${reportId || gem._id}`

  const [cardSide, setCardSide] = useState<"front" | "back">("front")
  const firstImageId = gem.images && gem.images.length > 0 ? gem.images[0] : null

  return (
    <div className='flex flex-col items-center justify-start font-serif text-slate-900'>
      {/* View Toggle */}
      <div className='flex items-center gap-2 mb-6 bg-slate-100 p-1 rounded-lg print:hidden'>
        <button
          onClick={() => setCardSide("front")}
          className={cn(
            "px-4 py-1.5 text-sm font-medium rounded-md transition-all",
            cardSide === "front"
              ? "bg-white text-slate-900 shadow-sm"
              : "text-slate-500 hover:text-slate-700",
          )}
        >
          Front View
        </button>
        <button
          onClick={() => setCardSide("back")}
          className={cn(
            "px-4 py-1.5 text-sm font-medium rounded-md transition-all",
            cardSide === "back"
              ? "bg-white text-slate-900 shadow-sm"
              : "text-slate-500 hover:text-slate-700",
          )}
        >
          Back View
        </button>
      </div>

      {/* CARD CONTAINER */}
      <div className='relative transition-all duration-300'>
        {cardSide === "front" ? (
          /* --- FRONT VIEW --- */
          <div
            className='relative bg-white shadow-xl overflow-hidden flex flex-col items-center text-center border-0 border-slate-100'
            style={{
              width: "340px",
              height: "540px",
              borderRadius: "20px",
              boxShadow: "0 10px 30px -5px rgba(0,0,0,0.15)",
            }}
          >
            {/* Turtle Icon */}
            <div className='mt-12 mb-2 text-[#D4AF37]'>
              <svg viewBox='0 0 24 24' fill='currentColor' className='w-16 h-16'>
                <path
                  d='M12 2C13 5 14 7 12 9C10 7 9 5 12 2ZM6.5 7C7.5 9.5 9 11 11 11.5C9 12 7.5 13 6.5 15.5C5.5 13 4 11.5 6.5 11.5C9 11 10.5 9.5 6.5 7ZM17.5 7C13.5 9.5 15 11 17.5 11.5C20 11.5 18.5 13 17.5 15.5C16.5 13 15 12 13 11.5C15 11 16.5 9.5 17.5 7ZM12 4.5C14.5 5.5 16 7.5 16.5 10C17 12.5 16 15 14 16.5L14 18.5L15 20L12 21.5L9 20L10 18.5L10 16.5C8 15 7 12.5 7.5 10C8 7.5 9.5 5.5 12 4.5Z'
                  fill='currentColor'
                  fillOpacity='0.8'
                />
              </svg>
            </div>

            {/* GRC Title */}
            <h1 className='text-[80px] leading-none font-serif text-[#D4AF37] tracking-widest font-medium'>
              GRC
            </h1>
            <span className='absolute top-[170px] right-[80px] text-[10px] text-[#D4AF37]'>®</span>

            {/* 3 Gems */}
            <div className='flex justify-center gap-6 my-10'>
              <div className='w-12 h-14 bg-linear-to-br from-blue-700 to-blue-900 shadow-md border border-white/20 relative rounded-[4px]'>
                <div className='absolute inset-2 border border-blue-400/30 opacity-50'></div>
              </div>
              <div className='w-12 h-14 bg-linear-to-br from-green-600 to-green-800 shadow-md border border-white/20 relative rounded-[4px]'>
                <div className='absolute inset-2 border border-green-400/30 opacity-50'></div>
              </div>
              <div className='w-12 h-14 bg-linear-to-br from-red-600 to-red-800 shadow-md border border-white/20 relative rounded-[4px]'>
                <div className='absolute inset-2 border border-red-400/30 opacity-50'></div>
              </div>
            </div>

            {/* Footer Group */}
            <div className='mt-auto w-full pb-8'>
              <div className='mb-8 px-4'>
                <h2 className='text-[#D4AF37] font-bold text-sm tracking-widest leading-relaxed uppercase'>
                  Gemological Report <br /> of Ceylon
                </h2>
              </div>

              <div className='px-6 text-[9px] text-slate-400 font-sans leading-relaxed'>
                <p>No.97, Galle Rd, Colombo 03, Sri Lanka. | www.grc.lk</p>
                <p>Email: info@grc.lk | Whatsapp: +94 778204525</p>
              </div>
            </div>
          </div>
        ) : (
          /* --- BACK VIEW --- */
          <div
            className='relative bg-white shadow-xl overflow-hidden flex border-0 border-slate-100 p-5'
            style={{
              width: "540px",
              height: "340px",
              borderRadius: "20px",
              boxShadow: "0 10px 30px -5px rgba(0,0,0,0.15)",
            }}
          >
            {/* Left Details Column */}
            <div className='flex-1 flex flex-col pr-4 font-sans'>
              {/* Header Logo */}
              <div className='mb-3 relative'>
                <span className='text-3xl font-serif font-bold text-[#1e293b] tracking-wide'>
                  GRC
                </span>
                <span className='text-[10px] text-slate-500 absolute top-0 -right-2'>®</span>
              </div>

              {/* Data Grid */}
              <div className='space-y-[5px] text-[11px] text-slate-700 leading-tight'>
                <div className='flex items-baseline'>
                  <span className='w-24 text-slate-900 font-medium'>GRC Number:</span>
                  <span className='text-slate-600 border-b border-dotted border-slate-300 flex-1 uppercase'>
                    {gem.gemId}
                  </span>
                </div>
                <div className='flex items-baseline'>
                  <span className='w-24 text-slate-900 font-medium'>Date:</span>
                  <span className='text-slate-600 border-b border-dotted border-slate-300 flex-1'>
                    {new Date(gem.updatedAt).toLocaleDateString()}
                  </span>
                </div>
                <div className='flex items-baseline'>
                  <span className='w-24 text-slate-900 font-medium'>Weight:</span>
                  <span className='text-slate-600 border-b border-dotted border-slate-300 flex-1'>
                    {gem.weight} ct
                  </span>
                </div>
                <div className='flex items-baseline'>
                  <span className='w-24 text-slate-900 font-medium'>Shape & Cut:</span>
                  <span className='text-slate-600 border-b border-dotted border-slate-300 flex-1 truncate'>
                    {obs.shape} {obs.cut}
                  </span>
                </div>
                <div className='flex items-baseline'>
                  <span className='w-24 text-slate-900 font-medium'>Dimension:</span>
                  <span className='text-slate-600 border-b border-dotted border-slate-300 flex-1 truncate'>
                    {obs.messurementX} x {obs.messurementY} x {obs.messurementZ} mm
                  </span>
                </div>
                <div className='flex items-baseline'>
                  <span className='w-24 text-slate-900 font-medium'>Color:</span>
                  <span className='text-slate-600 border-b border-dotted border-slate-300 flex-1'>
                    {gem.color}
                  </span>
                </div>
                <div className='flex items-baseline'>
                  <span className='w-24 text-slate-900 font-medium'>Species:</span>
                  <span className='text-slate-600 border-b border-dotted border-slate-300 flex-1'>
                    {obs.species}
                  </span>
                </div>
                <div className='flex items-baseline'>
                  <span className='w-24 text-slate-900 font-medium'>Variety:</span>
                  <span className='text-slate-600 border-b border-dotted border-slate-300 flex-1 font-semibold'>
                    {finalData.finalVariety || obs.variety}
                  </span>
                </div>
                <div className='flex items-baseline mt-1'>
                  <span className='w-24 text-slate-900 font-medium'>Comments:</span>
                  <span className='text-slate-600 flex-1 text-[10px]'>
                    {obs.comments || "No Indication Of Heating"}
                  </span>
                </div>
              </div>

              {/* Signature Block */}
              <div className='mt-auto pt-2'>
                <div className='w-28 h-6 relative mb-1'>
                  <svg
                    viewBox='0 0 100 30'
                    fill='none'
                    stroke='currentColor'
                    className='text-slate-800 w-full h-full transform -rotate-2'
                  >
                    <path d='M10,20 C20,10 30,30 40,20 S 60,10 70,25' strokeWidth='2' />
                  </svg>
                </div>
                <div>
                  <p className='text-[10px] font-bold text-slate-800 leading-none'>
                    R. Milinda Edirisinghe
                  </p>
                  <p className='text-[8px] text-slate-500 leading-tight'>
                    CEO / Consultant Gemmologist
                  </p>
                  <p className='text-[8px] text-slate-400 italic leading-tight'>
                    Gemological Report Of Ceylon (Pvt) Ltd
                  </p>
                </div>
              </div>
            </div>

            {/* Right Image/QR Column */}
            <div className='w-[140px] flex flex-col items-center justify-between pl-3 border-l border-slate-100 py-2'>
              <div className='w-[120px] h-[120px] bg-white rounded-lg border border-slate-100 flex items-center justify-center overflow-hidden shadow-sm'>
                {firstImageId ? (
                  <GemImage imageId={firstImageId} className='w-full h-full' />
                ) : (
                  <ImageIcon className='w-8 h-8 text-slate-200' />
                )}
              </div>

              <div className='text-center my-2'>
                <p className='font-bold text-sm text-slate-800 leading-tight'>
                  {finalData.finalVariety || "Gemstone"}
                </p>
                <p className='text-xs text-slate-500 font-medium'>{gem.weight}ct</p>
              </div>

              <div className='mt-auto bg-white p-1 shadow-sm rounded border border-slate-100'>
                <QRCode value={verificationUrl} size={70} />
              </div>
            </div>
          </div>
        )}
      </div>

      <p className='mt-4 text-xs text-slate-400 italic flex items-center gap-1 print:hidden'>
        <Repeat className='w-3 h-3' />
        Switch view to verify Front/Back printing details
      </p>
    </div>
  )
}
