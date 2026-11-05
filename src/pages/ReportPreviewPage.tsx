import { useParams } from "react-router-dom"
import { useEffect, useState } from "react"
import { useGem } from "@/hooks/useGemStore"
import { reportsApi } from "@/lib/api/reports"
import { Loader2, AlertCircle, PlayCircle } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { isHttpUrl, videoEmbedUrl, videoStreamUrl } from "@/lib/video-link"
import { MediumReportPreview } from "@/components/features/reports/MediumReportPreview"
import { LargeReportPreview } from "@/components/features/reports/LargeReportPreview"
import { PremiumReportPreview } from "@/components/features/reports/PremiumReportPreview"
import { SmallReportPreview } from "@/components/features/reports/SmallReportPreview"
import { VerbalReportPreview } from "@/components/features/reports/VerbalReportPreview"
import { CustomSmallReportView } from "@/components/features/reports/custom/CustomSmallReportView"
import { CustomMediumReportView } from "@/components/features/reports/custom/CustomMediumReportView"
import { CustomLargeReportView } from "@/components/features/reports/custom/CustomLargeReportView"
import { CustomPremiumReportView } from "@/components/features/reports/custom/CustomPremiumReportView"
import { primeImageCache } from "@/components/features/gems/GemImage"
import type { Image } from "@/lib/api/images"
import type { Gem, ReportType } from "@/lib/types"
import { signatoryImage, signatoryName, type ReportSignatory } from "@/lib/report-signature"
import type {
  StoredCustomLargeReport,
  StoredCustomPremiumReport,
  StoredCustomMediumReport,
  StoredCustomSmallReport,
} from "@/lib/custom-report"

interface ReportData {
  _id: string
  reportId: string
  reportType: ReportType
  isClientDataAdd?: boolean
  gemId: string | Gem
  signedBy?: ReportSignatory | string | null
  gemImages?: Array<Partial<Image> & { _id: string }>
  /** Link to a video of the stone; when set, this page offers to play it. */
  videoUrl?: string
  /** Set when this report prints a card somebody rewrote rather than the gem's own. */
  customCard?: Partial<StoredCustomSmallReport> | null
  /** The same one paper size up, read only when this report prints at A5. */
  customMediumCard?: Partial<StoredCustomMediumReport> | null
  /** The standard A4, read only when this report prints as a large report. */
  customStandardLargeCard?: Partial<StoredCustomLargeReport> | null
  /**
   * And the premium A4, read only when this report prints as one. The field keeps the
   * name it had when that sheet was called the large report.
   */
  customLargeCard?: Partial<StoredCustomPremiumReport> | null
}

export function ReportPreviewPage() {
  const { id } = useParams<{ id: string }>()
  const { gems, getGemById } = useGem()

  const [report, setReport] = useState<ReportData | null>(null)
  const [gem, setGem] = useState<Gem | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [videoOpen, setVideoOpen] = useState(false)
  // Set once our own player cannot load the file (download blocked by the owner, Drive
  // quota, unsupported codec); the dialog then falls back to a locked-down Drive player.
  const [nativeVideoFailed, setNativeVideoFailed] = useState(false)

  useEffect(() => {
    const fetchData = async () => {
      if (!id) return
      setLoading(true)
      setError(null)

      try {
        // 1. Try to fetch as a Report ID
        let reportData: ReportData | null = null
        try {
          reportData = await reportsApi.getReportById(id)
          // Visitors here are usually anonymous (QR scan), so the protected image
          // endpoint is unavailable. The report carries its images inline instead.
          primeImageCache(reportData?.gemImages)
          setReport(reportData)
        } catch (e) {
          // It might be a Gem ID
        }

        // 2. Fetch the full gem document by ID so nested data is always complete
        let targetGem: Gem | null = null

        if (reportData) {
          const gemId =
            typeof reportData.gemId === "object"
              ? (reportData.gemId as Gem)._id
              : (reportData.gemId as string)
          try {
            targetGem = await getGemById(gemId)
          } catch {
            // Fall back to the populated object from the report response
            if (typeof reportData.gemId === "object") {
              targetGem = reportData.gemId as Gem
            }
          }
        }

        // 3. Fallback: treat the route param as a gem ID
        if (!targetGem) {
          try {
            targetGem = await getGemById(id)
          } catch {
            // Last resort: search the store
            targetGem = gems.find((g) => g._id === id || g.gemId === id) || null
          }
        }

        setGem(targetGem)

        if (!reportData && !targetGem) {
          setError("The requested report or gem could not be found.")
        }
      } catch (err) {
        console.error("Fetch error:", err)
        setError("An error occurred while verifying the report.")
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [id])

  if (loading) {
    return (
      <div className='flex flex-col items-center justify-center min-h-screen bg-slate-50 gap-4'>
        <Loader2 className='w-8 h-8 animate-spin text-blue-600' />
        <p className='text-slate-500 font-medium'>Verifying Report Authenticity...</p>
      </div>
    )
  }

  if (error || !gem) {
    return (
      <div className='flex items-center justify-center min-h-screen bg-slate-50 px-4'>
        <div className='bg-white p-8 rounded-2xl shadow-xl max-w-sm w-full text-center'>
          <div className='w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4'>
            <AlertCircle className='w-8 h-8' />
          </div>
          <h2 className='text-xl font-bold text-slate-900 mb-2'>Invalid Report</h2>
          <p className='text-slate-500 mb-6'>
            {error || "This GRC ID does not match our records."}
          </p>
          <div className='text-[10px] text-slate-400 font-mono bg-slate-50 p-2 rounded'>
            ID: {id}
          </div>
        </div>
      </div>
    )
  }

  // Determine which UI to show
  // If we have a report, use its type. Default to 'medium' for gem-only views
  const reportType = report?.reportType || "medium"
  // A customised report prints its saved certificate wherever the certificate is drawn,
  // this page included. A customer scanning the QR on a custom one has to land on that
  // certificate — a page showing the standard one instead reads as a mismatch between
  // what is in their hand and the record vouching for it.
  //
  // Each size reads only its own saved document, so a report that was customised at one
  // size and then switched to another prints the standard certificate rather than the
  // wording of a sheet it is no longer printing.
  const customCard = reportType === "small" ? report?.customCard : null
  const customMediumCard = reportType === "medium" ? report?.customMediumCard : null
  const customLargeCard = reportType === "large" ? report?.customStandardLargeCard : null
  const customPremiumCard = reportType === "premium" ? report?.customLargeCard : null
  const includeLogo = report?.isClientDataAdd ?? true
  // The video only ever plays here, in a dialog — the visitor is never sent off to Drive
  // or anywhere else. A Drive link plays from the file itself; any other link is taken to
  // point straight at a video file. Nothing plays on arrival.
  const videoUrl = report?.videoUrl && isHttpUrl(report.videoUrl) ? report.videoUrl : null
  const videoEmbed = videoEmbedUrl(videoUrl)
  const videoStream = videoStreamUrl(videoUrl) ?? videoUrl

  const previewProps = {
    gem,
    includeLogo,
    reportId: report?._id || gem._id,
    signatureName: signatoryName(report?.signedBy),
    // This page is the digital copy a QR scan opens. On paper the signatory signs the
    // typed field by hand; here their uploaded signature stands in for the ink.
    signatureImage: signatoryImage(report?.signedBy),
  }

  return (
    <div className='min-h-screen w-full overflow-x-hidden bg-slate-100/50 py-6 px-3 sm:py-12 sm:px-4'>
      <div className='w-full max-w-6xl mx-auto'>
        {/* Status Header */}
        <div className='flex flex-col items-center mb-6 sm:mb-10 text-center'>
          <div className='bg-emerald-500 text-white px-3 py-1 rounded-full text-[10px] sm:text-xs font-bold uppercase tracking-widest shadow-lg shadow-emerald-200 mb-3 sm:mb-4 animate-bounce'>
            Verified Authentic
          </div>
          <h1 className='text-lg sm:text-2xl font-serif font-bold text-slate-900 text-balance'>
            Official Gemological Identification
          </h1>
          <p className='text-slate-500 text-xs sm:text-sm mt-1'>
            Gemological Report of Ceylon Digital Verification
          </p>
          {videoUrl && (
            <button
              type='button'
              onClick={() => setVideoOpen(true)}
              className='mt-4 inline-flex items-center gap-2 rounded-full bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white shadow-lg transition-colors hover:bg-slate-700 print:hidden'
            >
              <PlayCircle className='h-5 w-5' />
              Watch Gem Video
            </button>
          )}
        </div>
        {/* Reuse the configured report components — each scales itself to the
            width we give it and centres itself, so this stays a plain block. A
            flex row here would let the fixed-size cards stretch it past the
            viewport via min-width:auto, defeating their own scaling. */}
        <div className='w-full'>
          {customPremiumCard ? (
            <CustomPremiumReportView
              gem={gem}
              customReport={customPremiumCard}
              reportId={report?._id || gem._id}
              signatureName={previewProps.signatureName}
              signatureImage={previewProps.signatureImage}
            />
          ) : customLargeCard ? (
            <CustomLargeReportView
              gem={gem}
              customReport={customLargeCard}
              reportId={report?._id || gem._id}
              signatureName={previewProps.signatureName}
              signatureImage={previewProps.signatureImage}
            />
          ) : customMediumCard ? (
            <CustomMediumReportView
              gem={gem}
              customReport={customMediumCard}
              reportId={report?._id || gem._id}
              signatureName={previewProps.signatureName}
              signatureImage={previewProps.signatureImage}
            />
          ) : customCard ? (
            <CustomSmallReportView
              gem={gem}
              customCard={customCard}
              reportId={report?._id || gem._id}
            />
          ) : reportType === "premium" ? (
            <PremiumReportPreview {...previewProps} />
          ) : reportType === "large" ? (
            <LargeReportPreview {...previewProps} />
          ) : reportType === "small" ? (
            <SmallReportPreview {...previewProps} />
          ) : reportType === "verbal" ? (
            <VerbalReportPreview {...previewProps} />
          ) : (
            <MediumReportPreview {...previewProps} />
          )}
        </div>
        {/* Footer Info */}
        <div className='mt-10 sm:mt-20 text-center text-slate-400 space-y-2'>
          <p className='text-xs'>
            © {new Date().getFullYear()} Gemological Report of Ceylon (Pvt) Ltd. All Rights
            Reserved.
          </p>
          <p className='text-[10px] break-words'>
            Verification Date: {new Date().toLocaleString()}
          </p>
        </div>
      </div>

      {videoUrl && videoStream && (
        <Dialog open={videoOpen} onOpenChange={setVideoOpen}>
          <DialogContent className='w-[calc(100%-1.5rem)] max-w-3xl max-h-[92dvh] min-w-0 grid-cols-1 gap-3 rounded-lg p-3 sm:p-6'>
            <DialogHeader className='min-w-0 pr-8 text-left'>
              <DialogTitle className='truncate text-base sm:text-lg'>
                Gem Video — {gem.gemId}
              </DialogTitle>
            </DialogHeader>
            {/* Mounted only while open, so closing the dialog stops playback. */}
            {!nativeVideoFailed ? (
              // No fixed aspect box: a stone filmed upright on a phone keeps its own
              // shape and is capped by the screen height instead of shrunk into 16:9.
              <div className='flex min-w-0 justify-center overflow-hidden rounded-md bg-black'>
                <video
                  src={videoStream}
                  title={`Video of gem ${gem.gemId}`}
                  className='block h-auto max-h-[75dvh] w-full object-contain'
                  controls
                  controlsList='nodownload'
                  autoPlay
                  playsInline
                  preload='metadata'
                  onError={() => setNativeVideoFailed(true)}
                />
              </div>
            ) : videoEmbed ? (
              // Drive's own player, only when the file will not play in ours. The sandbox
              // leaves out popups and top navigation, so nothing in it can open Drive, and
              // the shield covers its pop-out button.
              <div className='relative aspect-video max-h-[75dvh] w-full min-w-0 overflow-hidden rounded-md bg-black'>
                <iframe
                  src={videoEmbed}
                  title={`Video of gem ${gem.gemId}`}
                  className='h-full w-full'
                  sandbox='allow-scripts allow-same-origin allow-presentation'
                  allow='autoplay; fullscreen'
                  allowFullScreen
                />
                <div className='absolute right-0 top-0 h-16 w-16' aria-hidden='true' />
              </div>
            ) : (
              <div className='flex aspect-video w-full flex-col items-center justify-center gap-2 rounded-md bg-slate-900 px-4 text-center text-sm text-slate-300'>
                <AlertCircle className='h-6 w-6 text-slate-400' />
                This video cannot be played right now. Please try again later.
              </div>
            )}
          </DialogContent>
        </Dialog>
      )}

      <style>{`
        @media print {
          @page { margin: 0; }
          body { background: white; -webkit-print-color-adjust: exact; }
          .bg-slate-100\\/50 { background: white !important; }
        }
      `}</style>
    </div>
  )
}
