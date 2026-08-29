import { useState, useEffect } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { ArrowLeft, Loader2, Download, Save, Check } from "lucide-react"
import { useGem } from "@/hooks/useGemStore"
import { MainLayout } from "@/components/layout/MainLayout"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "../components/ui/label"
import { RadioGroup, RadioGroupItem } from "../components/ui/radio-group"
import { Checkbox } from "../components/ui/checkbox"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { reportsApi } from "@/lib/api/reports"
import { usersApi } from "@/lib/api/users"
import { type Gem, type User, GEM_STATUSES, UserRole } from "@/lib/types"
import {
  SIGNATORY_ROLE,
  signatoryName,
  type ReportSignatory,
} from "@/lib/report-signature"
import { LargeReportPreview } from "@/components/features/reports/LargeReportPreview"
import { MediumReportPreview } from "@/components/features/reports/MediumReportPreview"
import { SmallReportPreview } from "@/components/features/reports/SmallReportPreview"
import { VerbalReportPreview } from "@/components/features/reports/VerbalReportPreview"
import { jsPDF } from "jspdf"
import html2canvas from "html2canvas"
import { toJpeg } from "html-to-image"

interface Report {
  _id: string
  reportId: string
  reportType?: string
  isClientDataAdd?: boolean
  gemId: string | Gem
  signedBy?: ReportSignatory | string | null
  reportUrl?: string
  createdAt?: string
  updatedAt?: string
}

export function ReportConfigurationPage() {
  const { id } = useParams<{ id: string }>() // This ID is now treated as Report ID
  const navigate = useNavigate()
  const { loading: storeLoading, getGemById } = useGem()

  const [report, setReport] = useState<Report | null>(null)
  const [gem, setGem] = useState<Gem | null>(null)

  const [size, setSize] = useState<"small" | "medium" | "large" | "verbal">("medium")
  const [includeLogo, setIncludeLogo] = useState(true)
  const [testers, setTesters] = useState<User[]>([])
  const [signedById, setSignedById] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isDownloading, setIsDownloading] = useState(false)
  const [showPreview, setShowPreview] = useState(false)

  useEffect(() => {
    usersApi
      .getUsers(UserRole.TESTER)
      .then(setTesters)
      .catch((error) => console.error("Failed to load testers", error))
  }, [])

  // Fetch report and associated gem
  useEffect(() => {
    const fetchReportAndGem = async () => {
      if (!id) return
      setIsLoading(true)
      try {
        const reportData = await reportsApi.getReportById(id)

        if (!reportData) {
          console.error("Report not found for ID:", id)
          return
        }

        setReport(reportData)
        if (reportData?.reportType) setSize(reportData.reportType as "small" | "medium" | "large" | "verbal")
        if (reportData?.isClientDataAdd !== undefined) setIncludeLogo(reportData.isClientDataAdd)
        // signedBy arrives populated from the API; older reports have none.
        const signatory = reportData?.signedBy
        setSignedById(typeof signatory === "object" ? (signatory?._id ?? "") : (signatory ?? ""))

        // Always fetch the full gem document so nested finalApproval data is complete
        const gemId =
          typeof reportData.gemId === "string" ? reportData.gemId : reportData.gemId._id
        let foundGem: Gem | null = null
        try {
          foundGem = await getGemById(gemId)
        } catch {
          // Fall back to the populated object if the direct fetch fails
          if (typeof reportData.gemId === "object") {
            foundGem = reportData.gemId as Gem
          }
        }

        if (foundGem) {
          setGem(foundGem)
          if (foundGem.status === GEM_STATUSES.DONE) {
            setShowPreview(true)
          }
        }
      } catch (error) {
        console.error("Failed to load report data", error)
      } finally {
        setIsLoading(false)
      }
    }
    fetchReportAndGem()
  }, [id, getGemById])

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
        signedBy: signedById || null,
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
    if (size === "small") {
      const element = document.getElementById("small-report-back-view")
      if (!element) {
        alert("Preview not ready.")
        return
      }

      try {
        setIsDownloading(true)
        // Ensure images are loaded before capture
        await new Promise((resolve) => setTimeout(resolve, 500))

        // Temporarily make the back view fully visible for capture
        const origPosition = element.style.position
        const origOpacity = element.style.opacity
        const origZIndex = element.style.zIndex
        const origPointerEvents = element.style.pointerEvents
        element.style.position = "relative"
        element.style.opacity = "1"
        element.style.zIndex = "1"
        element.style.pointerEvents = "auto"

        // Use html-to-image (SVG foreignObject approach — no CSS color parsing)
        const dataUrl = await toJpeg(element, {
          quality: 1.0,
          pixelRatio: 4, // 300+ DPI for debit card size print
          backgroundColor: "#ffffff",
          width: 640,
          height: 400,
          canvasWidth: 640 * 4,
          canvasHeight: 400 * 4,
        })

        // Restore original visibility
        element.style.position = origPosition
        element.style.opacity = origOpacity
        element.style.zIndex = origZIndex
        element.style.pointerEvents = origPointerEvents

        // Trigger download
        const link = document.createElement("a")
        link.download = `GRC-Report-${gem?.gemId || "Small"}-Back-Print.jpg`
        link.href = dataUrl
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
      } catch (error) {
        console.error("JPG Export failed:", error)
        alert("Export failed.")
      } finally {
        setIsDownloading(false)
      }
      return
    }

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

  const selectedSignatory = testers.find((t) => t.id === signedById)
  const signatureName = selectedSignatory?.name || signatoryName(report?.signedBy)

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
                    onValueChange={(val: "small" | "medium" | "large" | "verbal") => setSize(val)}
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
                    <div className='flex items-center space-x-2 border p-3 rounded-lg hover:bg-slate-50 cursor-pointer transition-colors'>
                      <RadioGroupItem value='verbal' id='r-verbal' />
                      <Label htmlFor='r-verbal' className='flex-1 cursor-pointer'>
                        <span className='font-semibold block'>Verbal</span>
                        <span className='text-xs text-slate-500'>Brief verbal assessment</span>
                      </Label>
                    </div>
                  </RadioGroup>
                </div>

                {/* Only the medium and large layouts print a typed signature field. */}
                {(size === "medium" || size === "large") && (
                  <div className='space-y-3'>
                    <Label htmlFor='signed-by'>{SIGNATORY_ROLE}</Label>
                    <Select value={signedById || undefined} onValueChange={setSignedById}>
                      <SelectTrigger id='signed-by' className='w-full h-11'>
                        <SelectValue placeholder={signatureName} />
                      </SelectTrigger>
                      <SelectContent>
                        {testers.map((tester) => (
                          <SelectItem key={tester.id} value={tester.id}>
                            {tester.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className='text-xs text-slate-500'>
                      Printed under the left-hand signature line of the report, which stays blank
                      for a handwritten signature.
                    </p>
                  </div>
                )}

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
                <Button
                  className='w-full bg-emerald-600 hover:bg-emerald-700 h-10'
                  onClick={handleDownload}
                  disabled={isDownloading}
                >
                  {isDownloading ? (
                    <Loader2 className='w-4 h-4 mr-2 animate-spin' />
                  ) : (
                    <Download className='w-4 h-4 mr-2' />
                  )}
                  {size === "small" ? "Download Print Ready JPG" : "Download"}
                </Button>
              </div>
            )}
          </Card>

          {/* Preview Panel */}
          <div className='lg:col-span-2'>
            {showPreview ? (
              <div className='border rounded-xl overflow-auto shadow-lg bg-white relative max-h-[calc(100vh-200px)]'>
                <div
                  className={`
                        origin-top transform transition-all p-8 flex justify-center
                        ${size === "small" ? "scale-90 w-full max-w-[800px] mx-auto my-4" : ""}
                        ${size === "medium" ? "w-full" : ""}
                        ${size === "large" ? "w-full" : ""}
                    `}
                >
                  {size === "large" ? (
                    <LargeReportPreview
                      gem={currentGem}
                      includeLogo={includeLogo}
                      reportId={report?._id}
                      signatureName={signatureName}
                    />
                  ) : size === "medium" ? (
                    <MediumReportPreview
                      gem={currentGem}
                      includeLogo={includeLogo}
                      reportId={report?._id}
                      signatureName={signatureName}
                    />
                  ) : size === "verbal" ? (
                    <VerbalReportPreview
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
