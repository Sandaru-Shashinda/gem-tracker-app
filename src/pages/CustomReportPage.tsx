import { useEffect, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { ArrowLeft, Eye, Loader2 } from "lucide-react"

import { MainLayout } from "@/components/layout/MainLayout"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Skeleton } from "@/components/ui/skeleton"
import { CustomSmallReportBuilder } from "@/components/features/reports/custom/CustomSmallReportBuilder"
import { CustomMediumReportBuilder } from "@/components/features/reports/custom/CustomMediumReportBuilder"
import { CustomLargeReportBuilder } from "@/components/features/reports/custom/CustomLargeReportBuilder"
import { useGem } from "@/hooks/useGemStore"
import { reportsApi } from "@/lib/api/reports"
import {
  buildCustomLargeReport,
  buildCustomMediumReport,
  buildCustomSmallReport,
  fromStoredCustomLargeReport,
  fromStoredCustomMediumReport,
  fromStoredCustomReport,
  toStoredCustomLargeReport,
  toStoredCustomMediumReport,
  toStoredCustomReport,
  type CustomLargeReport,
  type CustomMediumReport,
  type CustomSmallReport,
  type StoredCustomLargeReport,
  type StoredCustomMediumReport,
  type StoredCustomSmallReport,
} from "@/lib/custom-report"
import { signatoryName } from "@/lib/report-signature"
import { CUSTOM_REPORT_SIZES, type CustomReportSize, type Gem } from "@/lib/types"

/**
 * Where a custom certificate is written.
 *
 * Reached from the reports list and from a report's configuration page, and
 * deliberately a page of its own: the configuration page decides which of the lab's
 * standard certificates a gem gets, and this decides what one report actually says.
 *
 * This is the whole of a custom report's settings, not half of them: the configuration
 * page has nothing to offer one — no paper size from the lab's four, no signatory, no
 * customer logo — so it redirects here instead. The size therefore lives here too, and
 * switching it swaps the editor.
 *
 * Each size keeps its own saved wording, so moving between them is not destructive: a
 * report switched to A4 and back finds its card exactly as it left it.
 */

/** What the size switch offers, in order, and how each is described. */
const SIZE_OPTIONS: Record<CustomReportSize, { title: string; hint: string; heading: string }> = {
  small: { title: "Small", hint: "Card, 85.60 × 53.98 mm", heading: "Custom Small Report" },
  medium: { title: "Medium", hint: "A5, half page", heading: "Custom Medium Report" },
  large: { title: "Large", hint: "A4, full page", heading: "Custom Large Report" },
}

/** A report's size as this page reads it: any of the three, else the card. */
function toCustomSize(reportType: unknown): CustomReportSize {
  return (CUSTOM_REPORT_SIZES as readonly string[]).includes(reportType as string)
    ? (reportType as CustomReportSize)
    : "small"
}

export function CustomReportPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { getGemById } = useGem()

  const [gem, setGem] = useState<Gem | null>(null)
  const [size, setSize] = useState<CustomReportSize>("small")
  const [savingSize, setSavingSize] = useState(false)
  const [signature, setSignature] = useState<string>(signatoryName(null))
  const [smallInitial, setSmallInitial] = useState<CustomSmallReport | null>(null)
  const [mediumInitial, setMediumInitial] = useState<CustomMediumReport | null>(null)
  const [largeInitial, setLargeInitial] = useState<CustomLargeReport | null>(null)
  // Which sizes already have wording saved against them, which is what decides whether
  // there is a customisation to remove. Tracked per size because each keeps its own.
  // Bumping the key alongside it remounts the builder on a clean document rather than
  // leaving it holding the one it just deleted.
  const [saved, setSaved] = useState<Record<CustomReportSize, boolean>>({
    small: false,
    medium: false,
    large: false,
  })
  const [builderKey, setBuilderKey] = useState(0)
  const [reportLabel, setReportLabel] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      if (!id) return
      setIsLoading(true)
      setError(null)
      try {
        const report = await reportsApi.getReportById(id)
        setReportLabel(report?.reportId || "")

        const name = signatoryName(report?.signedBy)
        setSize(toCustomSize(report?.reportType))
        setSignature(name)

        const gemId = typeof report.gemId === "string" ? report.gemId : report.gemId._id
        let found: Gem | null = null
        try {
          found = await getGemById(gemId)
        } catch {
          // Fall back to the populated object if the direct fetch fails.
          if (typeof report.gemId === "object") found = report.gemId as Gem
        }

        if (!found) {
          setError("Gem data not found for this report.")
          return
        }

        const url = `${window.location.origin}/reports/${id}`
        setGem(found)

        // Every size's document is seeded, whichever is showing, so switching between
        // them is a re-render rather than a reload — and none is built from a gem that
        // has since been refetched out from under it.
        setSaved({
          small: Boolean(report?.customCard),
          medium: Boolean(report?.customMediumCard),
          large: Boolean(report?.customLargeCard),
        })
        setSmallInitial(
          fromStoredCustomReport(
            report?.customCard as Partial<StoredCustomSmallReport> | null,
            buildCustomSmallReport(found, url),
          ),
        )
        setMediumInitial(
          fromStoredCustomMediumReport(
            report?.customMediumCard as Partial<StoredCustomMediumReport> | null,
            buildCustomMediumReport(found, url, name),
          ),
        )
        setLargeInitial(
          fromStoredCustomLargeReport(
            report?.customLargeCard as Partial<StoredCustomLargeReport> | null,
            buildCustomLargeReport(found, url, name),
          ),
        )
      } catch (err) {
        console.error("Failed to load report data", err)
        setError("Failed to load this report.")
      } finally {
        setIsLoading(false)
      }
    }
    load()
  }, [id, getGemById])

  /** Stores one size's document and marks that size as having wording saved. */
  const saveAs = (reportSize: CustomReportSize) => async (stored: unknown) => {
    if (!id) throw new Error("No report to save against")
    await reportsApi.saveCustomCard(id, stored, reportSize)
    setSaved((prev) => ({ ...prev, [reportSize]: true }))
  }

  const handleSaveSmall = (data: CustomSmallReport) => saveAs("small")(toStoredCustomReport(data))
  const handleSaveMedium = (data: CustomMediumReport) =>
    saveAs("medium")(toStoredCustomMediumReport(data))
  const handleSaveLarge = (data: CustomLargeReport) =>
    saveAs("large")(toStoredCustomLargeReport(data))

  /**
   * Moves the report to another size.
   *
   * Stored on the report straight away rather than behind a Save button, because the
   * size is what everything else keys off — the QR page, the reports list, and which of
   * the saved documents is the one being printed. Leaving it unsaved while the editor
   * below had already swapped would be showing a certificate this report is not printing.
   */
  const handleSizeChange = async (next: CustomReportSize) => {
    if (!id || next === size) return
    const previous = size
    setSize(next)
    setSavingSize(true)
    try {
      await reportsApi.updateReport(id, { reportType: next })
    } catch (err) {
      console.error("Failed to change the report size", err)
      setSize(previous)
    } finally {
      setSavingSize(false)
    }
  }

  const handleClear = async () => {
    if (!id || !gem) throw new Error("No report to clear")
    if (
      !window.confirm(
        "Remove this customisation? The report goes back to printing the standard certificate, and the wording saved here is lost.",
      )
    ) {
      return
    }
    await reportsApi.saveCustomCard(id, null, size)
    setSaved((prev) => ({ ...prev, [size]: false }))
    const url = `${window.location.origin}/reports/${id}`
    if (size === "large") setLargeInitial(buildCustomLargeReport(gem, url, signature))
    else if (size === "medium") setMediumInitial(buildCustomMediumReport(gem, url, signature))
    else setSmallInitial(buildCustomSmallReport(gem, url))
    setBuilderKey((key) => key + 1)
  }

  const ready = gem && smallInitial && mediumInitial && largeInitial
  const onClear = saved[size] ? handleClear : undefined

  return (
    <MainLayout>
      <div className='mx-auto max-w-[1600px] space-y-6'>
        <div className='flex flex-wrap items-center gap-4'>
          <Button variant='outline' size='icon' onClick={() => navigate(-1)}>
            <ArrowLeft className='h-4 w-4' />
          </Button>
          <div>
            <h1 className='text-2xl font-bold text-slate-800'>{SIZE_OPTIONS[size].heading}</h1>
            <p className='text-sm text-slate-500'>
              This report's own wording. Saved against the report — the gem's record is untouched.
            </p>
          </div>
          <div className='ml-auto flex items-center gap-3'>
            <span className='text-sm text-slate-500'>Report ID: {reportLabel || "—"}</span>
            <Button variant='outline' size='sm' onClick={() => navigate(`/reports/${id}`)}>
              <Eye className='mr-2 h-4 w-4' />
              View report
            </Button>
          </div>
        </div>

        {!isLoading && !error && ready && (
          <div className='flex flex-wrap items-center gap-3 rounded-xl border bg-white p-4'>
            <Label className='text-slate-600'>Certificate size</Label>
            <RadioGroup
              value={size}
              onValueChange={(val: CustomReportSize) => handleSizeChange(val)}
              className='flex flex-wrap gap-4'
            >
              {CUSTOM_REPORT_SIZES.map((value) => (
                <div key={value} className='flex items-center space-x-2'>
                  <RadioGroupItem value={value} id={`size-${value}`} />
                  <Label htmlFor={`size-${value}`} className='cursor-pointer font-normal'>
                    {SIZE_OPTIONS[value].title}
                    <span className='ml-1.5 text-xs text-slate-400'>{SIZE_OPTIONS[value].hint}</span>
                    {saved[value] && (
                      <span className='ml-1.5 text-xs text-emerald-600'>· saved</span>
                    )}
                  </Label>
                </div>
              ))}
            </RadioGroup>
            {savingSize && <Loader2 className='h-4 w-4 animate-spin text-slate-400' />}
            <span className='ml-auto text-xs text-slate-400'>Each size keeps its own wording.</span>
          </div>
        )}

        {isLoading ? (
          <div className='grid grid-cols-1 gap-6 xl:grid-cols-4'>
            <Skeleton className='h-[500px] w-full rounded-xl xl:col-span-3' />
            <Skeleton className='h-[500px] w-full rounded-xl' />
          </div>
        ) : error || !ready ? (
          <div className='flex min-h-[400px] items-center justify-center rounded-xl border-2 border-dashed bg-slate-50/50'>
            <p className='text-slate-500'>{error || "Gem data not found."}</p>
          </div>
        ) : size === "large" ? (
          <CustomLargeReportBuilder
            key={`large-${builderKey}`}
            gem={gem}
            reportId={id}
            signatureName={signature}
            initial={largeInitial}
            onSave={handleSaveLarge}
            onClear={onClear}
          />
        ) : size === "medium" ? (
          <CustomMediumReportBuilder
            key={`medium-${builderKey}`}
            gem={gem}
            reportId={id}
            signatureName={signature}
            initial={mediumInitial}
            onSave={handleSaveMedium}
            onClear={onClear}
          />
        ) : (
          <CustomSmallReportBuilder
            key={`small-${builderKey}`}
            gem={gem}
            reportId={id}
            initial={smallInitial}
            onSave={handleSaveSmall}
            onClear={onClear}
          />
        )}
      </div>
    </MainLayout>
  )
}
