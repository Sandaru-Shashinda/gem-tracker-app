import { useParams } from "react-router-dom"
import { useEffect, useState } from "react"
import { useGem } from "@/hooks/useGemStore"
import { reportsApi } from "@/lib/api/reports"
import { Loader2, AlertCircle } from "lucide-react"
import { MediumReportPreview } from "@/components/features/reports/MediumReportPreview"
import { LargeReportPreview } from "@/components/features/reports/LargeReportPreview"
import { SmallReportPreview } from "@/components/features/reports/SmallReportPreview"
import { VerbalReportPreview } from "@/components/features/reports/VerbalReportPreview"
import type { Gem } from "@/lib/types"

interface ReportData {
  _id: string
  reportId: string
  reportType: "small" | "medium" | "large" | "verbal"
  isClientDataAdd?: boolean
  gemId: string | Gem
}

export function ReportPreviewPage() {
  const { id } = useParams<{ id: string }>()
  const { gems, getGemById } = useGem()

  const [report, setReport] = useState<ReportData | null>(null)
  const [gem, setGem] = useState<Gem | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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
  const includeLogo = report?.isClientDataAdd ?? true

  return (
    <div className='min-h-screen bg-slate-100/50 py-12 px-4'>
      <div className='max-w-6xl mx-auto'>
        {/* Status Header */}
        <div className='flex flex-col items-center mb-10 text-center'>
          <div className='bg-emerald-500 text-white px-4 py-1 rounded-full text-xs font-bold uppercase tracking-widest shadow-lg shadow-emerald-200 mb-4 animate-bounce'>
            Verified Authentic
          </div>
          <h1 className='text-2xl font-serif font-bold text-slate-900'>
            Official Gemological Identification
          </h1>
          <p className='text-slate-500 text-sm mt-1'>
            Gemological Report of Ceylon Digital Verification
          </p>
        </div>
        <div className='flex justify-center'>
          {/* Reuse the configured report components for the verification page */}
          {reportType === "large" ? (
            <div className='scale-[0.85] origin-top'>
              <LargeReportPreview
                gem={gem}
                includeLogo={includeLogo}
                reportId={report?._id || gem._id}
              />
            </div>
          ) : reportType === "small" ? (
            <div className='scale-[0.9] origin-top'>
              <SmallReportPreview
                gem={gem}
                includeLogo={includeLogo}
                reportId={report?._id || gem._id}
              />
            </div>
          ) : reportType === "verbal" ? (
            <div className='scale-[0.9] origin-top'>
              <VerbalReportPreview
                gem={gem}
                includeLogo={includeLogo}
                reportId={report?._id || gem._id}
              />
            </div>
          ) : (
            <div className='scale-[0.85] origin-top'>
              <MediumReportPreview
                gem={gem}
                includeLogo={includeLogo}
                reportId={report?._id || gem._id}
              />
            </div>
          )}
        </div>
        {/* Footer Info */}
        <div className='mt-20 text-center text-slate-400 space-y-2'>
          <p className='text-xs'>
            © {new Date().getFullYear()} Gemological Report of Ceylon (Pvt) Ltd. All Rights
            Reserved.
          </p>
          <p className='text-[10px]'>Verification Date: {new Date().toLocaleString()}</p>
        </div>
      </div>

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
