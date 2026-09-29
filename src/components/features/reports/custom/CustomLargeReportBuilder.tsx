import { useEffect, useMemo, useRef, useState } from "react"
import { Check, Download, Loader2, RotateCcw, Save, Undo2 } from "lucide-react"

import type { Gem } from "@/lib/types"
import {
  buildCustomLargeReport,
  newCustomReportRow,
  toStoredCustomLargeReport,
  CUSTOM_LARGE_FIELD_PRESETS,
  type CustomLargeReport,
  type LargeRowList,
} from "@/lib/custom-report"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { EDITABLE_FIELD_STYLES } from "./EditableField"
import { A4_H, A4_W, CustomLargeReportCard } from "./CustomLargeReportCard"
import { OverflowWarning } from "./OverflowWarning"
import { RowList } from "./RowList"
import { useCardExport } from "./useCardExport"
import { usePageOverflow } from "./usePageOverflow"

/**
 * The custom A4 report: one gem, one editable copy of the full certificate.
 *
 * The document starts as the gem's own report — the same rows, the same words, the same
 * ticks on the checklist — and every change made from there is somebody's deliberate
 * departure from it. Saving stores it on the report and nowhere else: the gem's own
 * record is never touched.
 *
 * The page is drawn twice, as every report preview here is: the screen copy inside a
 * scale transform, carrying the editors, and an off-screen copy at natural size with no
 * editors at all, which is the one the exporters capture.
 */

/**
 * Ceilings on each block, not a guarantee that the page fits.
 *
 * Measured on the sheet: the standard A4 leaves 48px free, a left-hand detail row costs
 * 20px, and the colour and results blocks grow into room their neighbour already takes
 * — colour for three rows, results for about as many as the treatment column is taller
 * than them. So each block has its own ceiling rather than one number across the page.
 *
 * But the A4 also carries two blocks of free prose, the special note and the statement,
 * and a three-line special note alone costs 95px — twice the free space. No row limit
 * can make that fit, so these only stop the absurd, and the page itself is measured
 * after every edit (see usePageOverflow) to say when it no longer fits.
 */
const ROW_LIMITS: Record<LargeRowList, number> = {
  detailRows: 5,
  cutRows: 5,
  colourRows: 4,
  resultRows: 12,
}

/** The left details column prints both groups, so they share one allowance. */
const MAX_LEFT_DETAIL_ROWS = 8

const LIST_HEADINGS: Record<LargeRowList, string> = {
  detailRows: "Details",
  cutRows: "Shape & cut",
  colourRows: "Colour",
  resultRows: "Results",
}

interface CustomLargeReportBuilderProps {
  gem: Gem
  /** Identifies the report the QR code resolves to, as the standard report's does. */
  reportId?: string
  /** Printed under the left-hand signature rule when the document is first built. */
  signatureName: string
  /** What this report already had saved on it, if anything. */
  initial: CustomLargeReport
  /** Resolves once the report is stored. Absent leaves it export-only. */
  onSave?: (data: CustomLargeReport) => Promise<void>
  /**
   * Drops the customisation, so the report goes back to printing the one built from the
   * gem. Passed only when there is one saved to drop.
   */
  onClear?: () => Promise<void>
}

export function CustomLargeReportBuilder({
  gem,
  reportId,
  signatureName,
  initial,
  onSave,
  onClear,
}: CustomLargeReportBuilderProps) {
  const verificationUrl = `${window.location.origin}/reports/${reportId || gem._id}`

  // Seeded once and never re-seeded: a refetch of the report behind the page must not
  // quietly throw away what somebody has typed onto it. Going back to the gem's own
  // wording is what Reset is for.
  const [data, setData] = useState<CustomLargeReport>(initial)
  const [presetLabel, setPresetLabel] = useState("")
  const [saving, setSaving] = useState(false)
  const [clearing, setClearing] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  // What is on the server, as text, so an edit that lands back on the saved wording
  // counts as saved rather than as a change nobody can find.
  const [savedSnapshot, setSavedSnapshot] = useState(() =>
    JSON.stringify(toStoredCustomLargeReport(initial)),
  )
  const snapshot = useMemo(() => JSON.stringify(toStoredCustomLargeReport(data)), [data])
  const dirty = snapshot !== savedSnapshot

  const printRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(1)

  const { downloading, downloadingPdf, downloadPng, downloadPdf } = useCardExport(
    printRef,
    `GRC-${gem.gemId || gem._id}-custom-large-report`,
    "large",
  )

  const overflow = usePageOverflow(printRef)

  // The page is a fixed-size print artefact; shrink it to fit the column it is given.
  // The transform lives on a wrapper, so printRef stays at natural size and downloads
  // keep full resolution regardless of the screen they were taken on.
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const updateScale = (width: number) => setScale(width < A4_W ? width / A4_W : 1)
    const observer = new ResizeObserver((entries) => updateScale(entries[0].contentRect.width))
    observer.observe(el)
    updateScale(el.clientWidth)
    return () => observer.disconnect()
  }, [])

  const patch = (next: Partial<CustomLargeReport>) => setData((prev) => ({ ...prev, ...next }))

  const leftDetailRows = data.detailRows.length + data.cutRows.length
  const isFull = (list: LargeRowList) =>
    data[list].length >= ROW_LIMITS[list] ||
    ((list === "detailRows" || list === "cutRows") && leftDetailRows >= MAX_LEFT_DETAIL_ROWS)

  const addRow = (list: LargeRowList, label: string) => {
    if (isFull(list)) return
    patch({ [list]: [...data[list], newCustomReportRow(label || "New field")] })
  }

  const removeRow = (list: LargeRowList, rowId: string) =>
    patch({ [list]: data[list].filter((row) => row.id !== rowId) })

  const moveRow = (list: LargeRowList, index: number, delta: number) => {
    const target = index + delta
    if (target < 0 || target >= data[list].length) return
    const rows = [...data[list]]
    const [row] = rows.splice(index, 1)
    rows.splice(target, 0, row)
    patch({ [list]: rows })
  }

  const handleClear = async () => {
    if (!onClear) return
    setClearing(true)
    setSaveError(null)
    try {
      await onClear()
    } catch (err) {
      console.error("Failed to remove the custom report", err)
      setSaveError(err instanceof Error ? err.message : "Could not remove this customisation.")
    } finally {
      setClearing(false)
    }
  }

  const handleSave = async () => {
    if (!onSave) return
    setSaving(true)
    setSaveError(null)
    // Taken before the request, so an edit made while it is in flight stays unsaved
    // rather than being marked as stored by a save that did not include it.
    const inFlight = snapshot
    try {
      await onSave(data)
      setSavedSnapshot(inFlight)
    } catch (err) {
      console.error("Failed to save custom report", err)
      setSaveError(err instanceof Error ? err.message : "Could not save this report.")
    } finally {
      setSaving(false)
    }
  }

  const cardProps = {
    data,
    onChange: patch,
    onRemoveRow: removeRow,
    imageId: gem.images && gem.images.length > 0 ? gem.images[0] : undefined,
    obs: gem.finalApproval?.finalObservations || {},
  }

  const toggles: Array<{ key: keyof CustomLargeReport; label: string }> = [
    { key: "showLogo", label: "GRC logo" },
    { key: "showQr", label: "QR code" },
    { key: "showWatermark", label: "Watermark" },
    { key: "showSpecialNote", label: "Special note" },
    { key: "showClarityChart", label: "Clarity chart" },
    { key: "showStatement", label: "Statement" },
    { key: "showGemImage", label: "Gem image & caption" },
    { key: "showHeatLine", label: "Heat treatment line" },
    { key: "showTypedSignature", label: "Typed signature field" },
    { key: "showSignatureImage", label: "Authorized signature" },
  ]

  const lists: LargeRowList[] = ["detailRows", "cutRows", "colourRows", "resultRows"]

  return (
    <div className='grid grid-cols-1 gap-6 xl:grid-cols-3'>
      <style>{EDITABLE_FIELD_STYLES}</style>

      {/* ── THE PAGE ── */}
      <div className='xl:col-span-2'>
        <div
          ref={containerRef}
          className='flex w-full min-w-0 flex-col items-center justify-start text-slate-900'
          style={{ colorScheme: "light" }}
        >
          <div
            style={{
              width: `${A4_W * scale}px`,
              height: `${A4_H * scale}px`,
              margin: "0 auto",
              overflow: "hidden",
            }}
          >
            {/* Framed exactly as the standard report frames its screen copy. */}
            <div
              style={{
                width: A4_W,
                height: A4_H,
                transform: `scale(${scale})`,
                transformOrigin: "top left",
                border: "2px solid #94a3b8",
                borderRadius: "2px",
                overflow: "hidden",
              }}
            >
              <CustomLargeReportCard {...cardProps} target='screen' editable />
            </div>
          </div>

          <div className='mt-4 flex w-full flex-wrap items-center justify-end gap-2'>
            <span className='mr-auto text-[10px] text-slate-400'>
              Click any label, value or heading to edit it. Tick a box to mark a grade or a
              treatment; tick it again to clear it.
            </span>
            {onClear && (
              <Button
                variant='outline'
                size='sm'
                className='text-red-600 hover:text-red-700'
                onClick={handleClear}
                disabled={clearing}
              >
                {clearing ? (
                  <Loader2 className='mr-1.5 h-3 w-3 animate-spin' />
                ) : (
                  <Undo2 className='mr-1.5 h-3 w-3' />
                )}
                {clearing ? "Removing..." : "Remove customisation"}
              </Button>
            )}
            <Button
              variant='outline'
              size='sm'
              onClick={() => setData(buildCustomLargeReport(gem, verificationUrl, signatureName))}
            >
              <RotateCcw className='mr-1.5 h-3 w-3' />
              Reset wording
            </Button>
            {onSave && (
              <Button
                size='sm'
                className='bg-emerald-600 hover:bg-emerald-700'
                onClick={handleSave}
                disabled={saving || !dirty}
              >
                {saving ? (
                  <Loader2 className='mr-1.5 h-3 w-3 animate-spin' />
                ) : dirty ? (
                  <Save className='mr-1.5 h-3 w-3' />
                ) : (
                  <Check className='mr-1.5 h-3 w-3' />
                )}
                {saving ? "Saving..." : dirty ? "Save report" : "Saved"}
              </Button>
            )}
            <Button size='sm' onClick={downloadPng} disabled={downloading}>
              <Download className='mr-1.5 h-3 w-3' />
              {downloading ? "Exporting..." : "Download Report"}
            </Button>
            <Button
              size='sm'
              className='bg-blue-600 hover:bg-blue-700'
              onClick={downloadPdf}
              disabled={downloadingPdf}
            >
              <Download className='mr-1.5 h-3 w-3' />
              {downloadingPdf ? "Exporting..." : "Download PDF (1:1)"}
            </Button>
          </div>

          <OverflowWarning overflow={overflow} page='A4' />

          <div className='mt-2 w-full space-y-1'>
            <p className='text-[10px] text-slate-400'>
              Print the PDF at 100% — not "fit to page" — for a true-size gem image.
            </p>
            {onSave && (
              <p className='text-[10px] text-slate-500'>
                {dirty
                  ? "Unsaved changes. Save the report to make it this report's certificate — it is what the QR code and the reports list will show."
                  : onClear
                    ? "Saved on this report. The QR code and the reports list show this page."
                    : "Not customised yet — this report still prints the standard A4. Save to change that."}
              </p>
            )}
            {saveError && <p className='text-[10px] text-red-600'>{saveError}</p>}
          </div>
        </div>
      </div>

      {/* ── STRUCTURE & ELEMENTS ── */}
      <Card className='h-fit space-y-6 p-5'>
        <div className='space-y-2'>
          <Label>Field to add</Label>
          <Select value={presetLabel || undefined} onValueChange={setPresetLabel}>
            <SelectTrigger className='h-9 w-full'>
              <SelectValue placeholder='Field to add' />
            </SelectTrigger>
            <SelectContent>
              {CUSTOM_LARGE_FIELD_PRESETS.map((label) => (
                <SelectItem key={label} value={label}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className='text-xs text-slate-500'>
            Adds an empty row to whichever block you choose below — type its value on the page.
          </p>
        </div>

        {lists.map((list) => (
          <div key={list} className='border-t pt-5'>
            <RowList
              heading={LIST_HEADINGS[list]}
              rows={data[list]}
              full={isFull(list)}
              onMove={(index, delta) => moveRow(list, index, delta)}
              onRemove={(rowId) => removeRow(list, rowId)}
              onAdd={() => addRow(list, presetLabel)}
            />
          </div>
        ))}

        <div className='space-y-3 border-t pt-5'>
          <Label>Elements</Label>
          {toggles.map((toggle) => (
            <div key={toggle.key} className='flex items-center space-x-2'>
              <Checkbox
                id={`toggle-${toggle.key}`}
                checked={Boolean(data[toggle.key])}
                onCheckedChange={(checked: boolean | "indeterminate") =>
                  patch({ [toggle.key]: checked === true } as Partial<CustomLargeReport>)
                }
              />
              <Label htmlFor={`toggle-${toggle.key}`} className='cursor-pointer font-normal'>
                {toggle.label}
              </Label>
            </div>
          ))}
        </div>

        <div className='space-y-2 border-t pt-5'>
          <Label htmlFor='qr-value'>QR code link</Label>
          <Input
            id='qr-value'
            value={data.qrValue}
            onChange={(e) => patch({ qrValue: e.target.value })}
            className='h-9 text-xs'
          />
          <p className='text-xs text-slate-500'>
            Where a scan of this report lands. Defaults to its verification page.
          </p>
        </div>
      </Card>

      {/* CAPTURE ENGINE ISOLATION — natural size, never transformed and never editable,
          so the exports keep full resolution and carry no editing chrome. */}
      <div style={{ position: "fixed", left: "-9999px", top: 0, zIndex: -1, pointerEvents: "none" }}>
        <div
          ref={printRef}
          style={{
            width: A4_W,
            height: A4_H,
            backgroundColor: "#ffffff",
            position: "relative",
            overflow: "hidden",
          }}
        >
          <CustomLargeReportCard {...cardProps} target='print' />
        </div>
      </div>
    </div>
  )
}
