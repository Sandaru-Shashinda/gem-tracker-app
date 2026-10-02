import { useEffect, useMemo, useRef, useState } from "react"
import { Check, Download, Loader2, RotateCcw, Save, Undo2 } from "lucide-react"

import type { Gem } from "@/lib/types"
import {
  buildCustomMediumReport,
  fontSizer,
  MEDIUM_FONT_FIELDS,
  pickLayout,
  withRowSize,
  newCustomReportRow,
  toStoredCustomMediumReport,
  CUSTOM_MEDIUM_FIELD_PRESETS,
  type CustomMediumReport,
} from "@/lib/custom-report"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
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
import { CustomMediumReportCard, PAGE_HEIGHT, PAGE_WIDTH } from "./CustomMediumReportCard"
import { OverflowWarning } from "./OverflowWarning"
import { RowList } from "./RowList"
import { useCardExport } from "./useCardExport"
import { usePageOverflow } from "./usePageOverflow"
import { LayoutPanel } from "./LayoutPanel"

/**
 * The custom A5 report: one gem, one editable copy of the medium certificate.
 *
 * The document starts as the gem's own report — the same rows, the same words — and
 * every change made from there is somebody's deliberate departure from it. Saving
 * stores it on the report and nowhere else: the gem's own record is never touched, so a
 * custom report can say whatever a one-off needs it to say without that becoming the
 * lab's finding about the stone.
 *
 * The sheet is drawn twice, as every report preview here is: the screen copy inside a
 * scale transform, carrying the editors, and an off-screen copy at natural size with no
 * editors at all, which is the one the exporters capture.
 */

/**
 * How many rows the sheet holds across both blocks before it starts eating its own
 * footer.
 *
 * One number rather than one per block, because the two blocks are not competing for
 * separate space: they run down the same fixed-height column, above a clarity scale and
 * a QR code that have to stay on the page. Capping them separately let a full main
 * block and a full results block add up to a sheet whose scale was cut in half and
 * whose footer had slid off the bottom entirely.
 *
 * The standard report uses twelve of these. The two spare are what is left once the
 * comment is allowed to run to its full three lines, which is the worst case the panel
 * has to absorb — measured on the sheet, not estimated from the line heights.
 */
const MAX_TOTAL_ROWS = 14

/** Which of the two row blocks a panel control acts on. */
type RowBlock = "rows" | "resultRows"

interface CustomMediumReportBuilderProps {
  gem: Gem
  /** Identifies the report the QR code resolves to, as the standard report's does. */
  reportId?: string
  /** Printed under the left-hand signature rule when the document is first built. */
  signatureName: string
  /** What this report already had saved on it, if anything. */
  initial: CustomMediumReport
  /** Resolves once the report is stored. Absent leaves it export-only. */
  onSave?: (data: CustomMediumReport) => Promise<void>
  /**
   * Drops the customisation, so the report goes back to printing the one built from the
   * gem. Passed only when there is one saved to drop.
   */
  onClear?: () => Promise<void>
}

export function CustomMediumReportBuilder({
  gem,
  reportId,
  signatureName,
  initial,
  onSave,
  onClear,
}: CustomMediumReportBuilderProps) {
  const verificationUrl = `${window.location.origin}/reports/${reportId || gem._id}`

  // Seeded once and never re-seeded: a refetch of the report behind the page must not
  // quietly throw away what somebody has typed onto the sheet. Going back to the gem's
  // own wording is what Reset is for.
  const [data, setData] = useState<CustomMediumReport>(initial)
  const [presetLabel, setPresetLabel] = useState("")
  const [saving, setSaving] = useState(false)
  const [clearing, setClearing] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  // What is on the server, as text, so an edit that lands back on the saved wording
  // counts as saved rather than as a change nobody can find.
  const [savedSnapshot, setSavedSnapshot] = useState(() =>
    JSON.stringify(toStoredCustomMediumReport(initial)),
  )
  const snapshot = useMemo(() => JSON.stringify(toStoredCustomMediumReport(data)), [data])
  const dirty = snapshot !== savedSnapshot

  const printRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(1)

  const { downloading, downloadingPdf, downloadPng, downloadPdf } = useCardExport(
    printRef,
    `GRC-${gem.gemId || gem._id}-custom-report`,
    "medium",
  )

  // Values wrap, so the row limit alone cannot promise the sheet fits.
  const overflow = usePageOverflow(printRef, snapshot)

  // The sheet is a fixed-size print artefact; shrink it to fit the column it is given.
  // The transform lives on a wrapper, so printRef stays at natural size and downloads
  // keep full resolution regardless of the screen they were taken on.
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const updateScale = (width: number) => setScale(width < PAGE_WIDTH ? width / PAGE_WIDTH : 1)
    const observer = new ResizeObserver((entries) => updateScale(entries[0].contentRect.width))
    observer.observe(el)
    updateScale(el.clientWidth)
    return () => observer.disconnect()
  }, [])

  const patch = (next: Partial<CustomMediumReport>) => setData((prev) => ({ ...prev, ...next }))

  const totalRows = data.rows.length + data.resultRows.length
  const full = totalRows >= MAX_TOTAL_ROWS

  const addRow = (block: RowBlock, label: string) => {
    if (full) return
    patch({ [block]: [...data[block], newCustomReportRow(label || "New field")] })
  }

  const rowSize = fontSizer(data.fontSizes, MEDIUM_FONT_FIELDS)("rows")
  const setRowSize = (block: RowBlock, rowId: string, size: number | undefined) =>
    patch({
      [block]: data[block].map((row) => (row.id === rowId ? withRowSize(row, size) : row)),
    })

  const removeRow = (block: RowBlock, rowId: string) =>
    patch({ [block]: data[block].filter((row) => row.id !== rowId) })

  const moveRow = (block: RowBlock, index: number, delta: number) => {
    const target = index + delta
    if (target < 0 || target >= data[block].length) return
    const rows = [...data[block]]
    const [row] = rows.splice(index, 1)
    rows.splice(target, 0, row)
    patch({ [block]: rows })
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

  const toggles: Array<{ key: keyof CustomMediumReport; label: string }> = [
    { key: "showWatermark", label: "Watermark" },
    { key: "showGemImage", label: "Gem image & caption" },
    { key: "showHeatLine", label: "Heat treatment line" },
    { key: "showClarityTable", label: "Clarity scale" },
    { key: "showQr", label: "QR code" },
    { key: "showTypedSignature", label: "Typed signature field" },
    { key: "showSignatureImage", label: "Authorized signature" },
  ]

  return (
    <div className='grid grid-cols-1 gap-6 xl:grid-cols-4'>
      <style>{EDITABLE_FIELD_STYLES}</style>

      {/* ── THE SHEET ── */}
      <div className='xl:col-span-3'>
        <div
          ref={containerRef}
          className='flex w-full min-w-0 flex-col items-center justify-start text-slate-900'
          style={{ colorScheme: "light" }}
        >
          <div
            style={{
              width: `${PAGE_WIDTH * scale}px`,
              height: `${PAGE_HEIGHT * scale}px`,
              margin: "0 auto",
            }}
          >
            <div
              style={{
                width: `${PAGE_WIDTH}px`,
                height: `${PAGE_HEIGHT}px`,
                transform: `scale(${scale})`,
                transformOrigin: "top left",
              }}
            >
              <CustomMediumReportCard {...cardProps} target='screen' editable />
            </div>
          </div>

          <div className='mt-4 flex w-full flex-wrap items-center justify-end gap-2'>
            <span className='mr-auto text-[10px] text-slate-400'>
              Click any label, value or heading on the sheet to edit it. Click a clarity grade to
              mark it.
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
              onClick={() =>
                setData({
                  ...buildCustomMediumReport(gem, verificationUrl, signatureName),
                  ...pickLayout(data),
                })
              }
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

          <OverflowWarning overflow={overflow} page='A5' />

          <div className='mt-2 w-full space-y-1'>
            <p className='text-[10px] text-slate-400'>
              Print the PDF at 100% — not "fit to page" — for a true-size gem image.
            </p>
            {onSave && (
              <p className='text-[10px] text-slate-500'>
                {dirty
                  ? "Unsaved changes. Save the report to make it this report's certificate — it is what the QR code and the reports list will show."
                  : onClear
                    ? "Saved on this report. The QR code and the reports list show this sheet."
                    : "Not customised yet — this report still prints the standard A5. Save to change that."}
              </p>
            )}
            {saveError && <p className='text-[10px] text-red-600'>{saveError}</p>}
          </div>
        </div>
      </div>

      {/* ── STRUCTURE & ELEMENTS ── */}
      <Card className='h-fit space-y-6 p-5'>
        <div className='space-y-2'>
          <div className='flex items-baseline justify-between'>
            <Label>Field to add</Label>
            <span className='text-xs text-slate-400'>
              {totalRows} of {MAX_TOTAL_ROWS} rows
            </span>
          </div>
          <Select value={presetLabel || undefined} onValueChange={setPresetLabel}>
            <SelectTrigger className='h-9 w-full'>
              <SelectValue placeholder='Field to add' />
            </SelectTrigger>
            <SelectContent>
              {CUSTOM_MEDIUM_FIELD_PRESETS.map((label) => (
                <SelectItem key={label} value={label}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className='text-xs text-slate-500'>
            Adds an empty row to whichever block you choose below — type its value on the sheet.
            Both blocks share one column, so the limit is across the two of them.
          </p>
        </div>

        <div className='border-t pt-5'>
          <RowList
            heading='Main fields'
            rows={data.rows}
            full={full}
            onMove={(index, delta) => moveRow("rows", index, delta)}
            onRemove={(rowId) => removeRow("rows", rowId)}
            onAdd={() => addRow("rows", presetLabel)}
            rowSize={rowSize}
            onFontSize={(rowId, size) => setRowSize("rows", rowId, size)}
          />
        </div>

        <div className='border-t pt-5'>
          <RowList
            heading='Results'
            rows={data.resultRows}
            full={full}
            onMove={(index, delta) => moveRow("resultRows", index, delta)}
            onRemove={(rowId) => removeRow("resultRows", rowId)}
            onAdd={() => addRow("resultRows", presetLabel)}
            rowSize={rowSize}
            onFontSize={(rowId, size) => setRowSize("resultRows", rowId, size)}
          />
        </div>

        <div className='border-t pt-5'>
          <LayoutPanel layout={data} fontFields={MEDIUM_FONT_FIELDS} onChange={patch} />
        </div>

        <div className='space-y-3 border-t pt-5'>
          <Label>Elements</Label>
          {toggles.map((toggle) => (
            <div key={toggle.key} className='flex items-center space-x-2'>
              <Checkbox
                id={`toggle-${toggle.key}`}
                checked={Boolean(data[toggle.key])}
                onCheckedChange={(checked: boolean | "indeterminate") =>
                  patch({ [toggle.key]: checked === true } as Partial<CustomMediumReport>)
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
        <CustomMediumReportCard {...cardProps} target='print' innerRef={printRef} />
      </div>
    </div>
  )
}
