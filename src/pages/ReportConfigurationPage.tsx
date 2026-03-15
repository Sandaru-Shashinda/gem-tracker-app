import { useState, useEffect } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { ArrowLeft, Loader2, Download, Printer, Save, Check } from "lucide-react"
import { useGem } from "@/hooks/useGemStore"
import { MainLayout } from "@/components/layout/MainLayout"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "../components/ui/label"
import { RadioGroup, RadioGroupItem } from "../components/ui/radio-group"
import { Checkbox } from "../components/ui/checkbox"
import { Skeleton } from "@/components/ui/skeleton"
import { reportsApi } from "@/lib/api/reports"
import { type Gem, GEM_STATUSES } from "@/lib/types"
import { LargeReportPreview } from "@/components/features/reports/LargeReportPreview"
import { MediumReportPreview } from "@/components/features/reports/MediumReportPreview"
import { SmallReportPreview } from "@/components/features/reports/SmallReportPreview"
import { jsPDF } from "jspdf"
import html2canvas from "html2canvas"

interface Report {
  _id: string
  reportId: string
  reportType?: string
  isClientDataAdd?: boolean
  gemId: string | Gem
  reportUrl?: string
  createdAt?: string
  updatedAt?: string
}

export function ReportConfigurationPage() {
  const { id } = useParams<{ id: string }>() // This ID is now treated as Report ID
  const navigate = useNavigate()
  const { gems, loading: storeLoading } = useGem()

  const [report, setReport] = useState<Report | null>(null)
  const [gem, setGem] = useState<Gem | null>(null)

  const [size, setSize] = useState<"small" | "medium" | "large">("medium")
  const [includeLogo, setIncludeLogo] = useState(true)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isDownloading, setIsDownloading] = useState(false)
  const [showPreview, setShowPreview] = useState(false)

  // Fetch report and associated gem
  useEffect(() => {
    const fetchReportAndGem = async () => {
      if (!id) return
      setIsLoading(true)
      try {
        // Fetch the specific report by ID.
        // This ID should be a valid Report ID. If navigating from a Gem,
        // the caller should ensure they have the Report ID or the API should handle Gem IDs.
        const reportData = await reportsApi.getReportById(id)

        if (!reportData) {
          console.error("Report not found for ID:", id)
          return
        }

        setReport(reportData)
        if (reportData?.reportType) setSize(reportData.reportType as "small" | "medium" | "large")
        if (reportData?.isClientDataAdd !== undefined) setIncludeLogo(reportData.isClientDataAdd)

        // Find associated gem
        const foundGem = gems.find(
          (g) =>
            // Check if matches generic ID string references
            g._id ===
            (typeof reportData.gemId === "string" ? reportData.gemId : reportData.gemId._id),
        )
        if (foundGem) {
          setGem(foundGem)
          // If gem is already completed, show preview automatically
          if (foundGem.status === GEM_STATUSES.DONE) {
            setShowPreview(true)
          }
        } else {
          // Need to fetch gem if not in store (though store usually has all active gems)
          // Or maybe the reportData.gemId object is fully populated?
          if (typeof reportData.gemId === "object") {
            const gemData = reportData.gemId as Gem
            setGem(gemData)
            if (gemData.status === GEM_STATUSES.DONE) {
              setShowPreview(true)
            }
          }
        }
      } catch (error) {
        console.error("Failed to load report data", error)
      } finally {
        setIsLoading(false)
      }
    }
    fetchReportAndGem()
  }, [id, gems])

  // Fallback: If passed ID finds a gem directly (e.g. from Gem Detail), we might want to handle that too?
  // But let's assume the user flow generates a report first then configures.

  if (isLoading || storeLoading) {
    return (
      <MainLayout>
        <div className='max-w-7xl mx-auto space-y-6'>
          <div className='flex items-center gap-4'>
            <Skeleton className='h-10 w-10' />
            <Skeleton className='h-8 w-64' />
            <Skeleton className='ml-auto h-5 w-32' />
          </div>

          <div className='grid grid-cols-1 lg:grid-cols-3 gap-8'>
            <Card className='p-6 h-fit space-y-8'>
              <div className='space-y-4'>
                <Skeleton className='h-6 w-32' />
                <div className='space-y-3'>
                  <Skeleton className='h-5 w-24' />
                  <Skeleton className='h-24 w-full' />
                  <Skeleton className='h-24 w-full' />
                  <Skeleton className='h-24 w-full' />
                </div>
                <Skeleton className='h-14 w-full' />
                <Skeleton className='h-12 w-full' />
              </div>
            </Card>

            <div className='lg:col-span-2'>
              <Skeleton className='h-[600px] w-full rounded-xl' />
            </div>
          </div>
        </div>
      </MainLayout>
    )
  }

  const handleSaveConfiguration = async () => {
    try {
      setIsSaving(true)
      const updates = {
        reportType: size,
        isClientDataAdd: includeLogo,
      }
      if (report) {
        const updatedReport = await reportsApi.updateReport(report._id, updates)
        setReport(updatedReport)
      }
      setShowPreview(true)
    } catch (error) {
      console.error("Failed to update report:", error)
      alert("Failed to save configuration")
    } finally {
      setIsSaving(false)
    }
  }

  const handleDownload = async () => {
    if (size === "medium") {
      const element = document.getElementById("medium-report-capture-inner")
      if (!element) {
        alert("Preview not ready.")
        return
      }

      try {
        setIsDownloading(true)
        // Ensure all images are loaded before capture
        await new Promise((resolve) => setTimeout(resolve, 1200))

        const canvas = await html2canvas(element, {
          scale: 4, // Professional high-resolution sharpness
          useCORS: true,
          logging: false,
          backgroundColor: "#ffffff",
          width: 1000,
          height: 700,
          onclone: (clonedDoc) => {
            // DEEP CLEAN: Absolute immunity to Tailwind 4 oklch crashes.
            const styles = Array.from(clonedDoc.getElementsByTagName("style"))
            const links = Array.from(clonedDoc.getElementsByTagName("link"))
            const scripts = Array.from(clonedDoc.getElementsByTagName("script"))

            scripts.forEach((s) => s.remove())
            styles.forEach((s) => s.remove())
            links.forEach((l) => {
              if (l.rel === "stylesheet") l.remove()
            })

            // FORCED COLOR NORMALIZATION
            const allElements = clonedDoc.getElementsByTagName("*")
            for (let i = 0; i < allElements.length; i++) {
              const el = allElements[i] as HTMLElement
              if (el.className) el.className = "" // Strip all tailwind logic

              const styles = window.getComputedStyle(el)
              if (styles.color?.includes("oklch")) el.style.color = "#1e293b"
              if (styles.backgroundColor?.includes("oklch"))
                el.style.backgroundColor = "transparent"
              if (styles.borderColor?.includes("oklch")) el.style.borderColor = "#f1f5f9"
              if (styles.fill?.includes("oklch")) el.style.fill = "currentColor"
              if (styles.stroke?.includes("oklch")) el.style.stroke = "currentColor"
            }
          },
        })

        const imgData = canvas.toDataURL("image/jpeg", 0.98)
        const pdf = new jsPDF({
          orientation: "landscape",
          unit: "mm",
          format: "a5",
        })

        pdf.addImage(imgData, "JPEG", 0, 0, 210, 148, undefined, "FAST")
        pdf.save(`GRC-Report-${gem?.gemId || "Medium"}.pdf`)
      } catch (error) {
        console.error("Direct PDF Export failed:", error)
        alert("Enhanced export failed. Falling back to native system print...")
        window.print()
      } finally {
        setIsDownloading(false)
      }
      return
    }

    if (!report?.reportUrl) {
      alert("Please save configuration first to generate the report PDF.")
      return
    }
    window.open(report.reportUrl, "_blank")
  }

  const currentGem = gem || (report && typeof report.gemId === "object" ? report.gemId : null)

  if (!currentGem) {
    return (
      <MainLayout>
        <div className='flex items-center justify-center min-h-screen'>
          <p className='text-slate-500'>Gem data not found.</p>
        </div>
      </MainLayout>
    )
  }

  return (
    <MainLayout>
      <div className='max-w-7xl mx-auto space-y-6'>
        <div className='flex items-center gap-4'>
          <Button variant='outline' size='icon' onClick={() => navigate(-1)}>
            <ArrowLeft className='h-4 w-4' />
          </Button>
          <h1 className='text-2xl font-bold text-slate-800'>Report Configuration</h1>
          <div className='ml-auto text-sm text-slate-500'>
            Report ID: {report?.reportId || "New"}
          </div>
        </div>

        <div className='grid grid-cols-1 lg:grid-cols-3 gap-8'>
          {/* Configuration Panel */}
          <Card className='p-6 h-fit space-y-8'>
            <div>
              <h3 className='text-lg font-semibold mb-4'>Report Settings</h3>

              <div className='space-y-6'>
                <div className='space-y-3'>
                  <Label>Paper Size</Label>
                  <RadioGroup
                    value={size}
                    onValueChange={(val: "small" | "medium" | "large") => setSize(val)}
                    className='grid grid-cols-1 gap-3'
                  >
                    <div className='flex items-center space-x-2 border p-3 rounded-lg hover:bg-slate-50 cursor-pointer transition-colors'>
                      <RadioGroupItem value='small' id='r-small' />
                      <Label htmlFor='r-small' className='flex-1 cursor-pointer'>
                        <span className='font-semibold block'>Small (Card)</span>
                        <span className='text-xs text-slate-500'>
                          Visa card size (85.60 × 53.98 mm)
                        </span>
                      </Label>
                    </div>
                    <div className='flex items-center space-x-2 border p-3 rounded-lg hover:bg-slate-50 cursor-pointer transition-colors bg-blue-50/50 border-blue-200'>
                      <RadioGroupItem value='medium' id='r-medium' />
                      <Label htmlFor='r-medium' className='flex-1 cursor-pointer'>
                        <span className='font-semibold block'>Medium (A5)</span>
                        <span className='text-xs text-slate-500'>Half-page size</span>
                      </Label>
                    </div>
                    <div className='flex items-center space-x-2 border p-3 rounded-lg hover:bg-slate-50 cursor-pointer transition-colors'>
                      <RadioGroupItem value='large' id='r-large' />
                      <Label htmlFor='r-large' className='flex-1 cursor-pointer'>
                        <span className='font-semibold block'>Large (A4 Booklet)</span>
                        <span className='text-xs text-slate-500'>Detailed folded report</span>
                      </Label>
                    </div>
                  </RadioGroup>
                </div>

                <div className='flex items-center space-x-2 border p-4 rounded-lg bg-slate-50'>
                  <Checkbox
                    id='include-logo'
                    checked={includeLogo}
                    onCheckedChange={(checked: boolean | "indeterminate") =>
                      setIncludeLogo(checked === true)
                    }
                  />
                  <Label htmlFor='include-logo' className='cursor-pointer'>
                    Include Customer Logo
                  </Label>
                </div>

                <Button
                  onClick={handleSaveConfiguration}
                  className='w-full h-12 text-lg bg-blue-600 hover:bg-blue-700'
                  disabled={isSaving}
                >
                  {isSaving ? (
                    <Loader2 className='animate-spin mr-2' />
                  ) : (
                    <Save className='w-4 h-4 mr-2' />
                  )}
                  Save Configuration
                </Button>
              </div>
            </div>

            {showPreview && (
              <div className='pt-6 border-t space-y-4 animate-in fade-in slide-in-from-top-4 duration-500'>
                <div className='flex items-center gap-2 text-emerald-600 bg-emerald-50 p-3 rounded-lg mb-2'>
                  <Check className='w-4 h-4' />
                  <span className='text-sm font-medium'>Configuration Saved</span>
                </div>
                <h3 className='text-lg font-semibold'>Actions</h3>
                <div className='grid grid-cols-2 gap-4'>
                  <Button variant='outline' className='w-full' onClick={() => window.print()}>
                    <Printer className='w-4 h-4 mr-2' />
                    Print
                  </Button>
                  <Button
                    className='w-full bg-emerald-600 hover:bg-emerald-700'
                    onClick={handleDownload}
                    disabled={isDownloading}
                  >
                    {isDownloading ? (
                      <Loader2 className='w-4 h-4 mr-2 animate-spin' />
                    ) : (
                      <Download className='w-4 h-4 mr-2' />
                    )}
                    Download PDF
                  </Button>
                </div>
              </div>
            )}
          </Card>

          {/* Preview Panel */}
          <div className='lg:col-span-2'>
            {showPreview ? (
              <div className='border rounded-xl overflow-auto shadow-lg bg-white relative max-h-[calc(100vh-200px)]'>
                <div
                  className={`
                        origin-top transform transition-all p-8
                        ${size === "small" ? "scale-75 max-w-sm mx-auto shadow-2xl my-10" : ""}
                        ${size === "medium" ? "scale-[0.55] w-[1000px] h-[700px] mx-auto origin-top mt-10 mb-[-100px]" : ""}
                        ${size === "large" ? "scale-[0.5] w-[1200px] min-h-[950px] mx-auto origin-top mt-4 mb-[-400px]" : ""}
                    `}
                >
                  {size === "large" ? (
                    <LargeReportPreview
                      gem={currentGem}
                      includeLogo={includeLogo}
                      reportId={report?._id}
                    />
                  ) : size === "medium" ? (
                    <MediumReportPreview
                      gem={currentGem}
                      includeLogo={includeLogo}
                      reportId={report?._id}
                    />
                  ) : (
                    <SmallReportPreview
                      gem={currentGem}
                      includeLogo={includeLogo}
                      reportId={report?._id}
                    />
                  )}
                </div>
              </div>
            ) : (
              <div className='h-full min-h-[500px] flex flex-col items-center justify-center text-slate-400 border-2 border-dashed rounded-xl bg-slate-50/50'>
                <div className='bg-slate-100 p-4 rounded-full mb-4'>
                  <Save className='w-8 h-8 text-slate-300' />
                </div>
                <p>Configure options and click "Save Configuration" to view report</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </MainLayout>
  )
}
