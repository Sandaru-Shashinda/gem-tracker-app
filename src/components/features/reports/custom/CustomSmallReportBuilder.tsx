import { useEffect, useMemo, useRef, useState } from "react"
import {
  ArrowDown,
  ArrowUp,
  Check,
  Download,
  Loader2,
  Plus,
  RotateCcw,
  Save,
  Trash2,
  Undo2,
} from "lucide-react"

import type { Gem } from "@/lib/types"
import {
  buildCustomSmallReport,
  fontSizer,
  pickLayout,
  SMALL_FONT_FIELDS,
  withRowSize,
  newCustomReportRow,
  toStoredCustomReport,
  CUSTOM_REPORT_FIELD_PRESETS,
  type CustomSmallReport,
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
import { CARD_HEIGHT, CARD_WIDTH, CustomSmallReportCard } from "./CustomSmallReportCard"
import { OverflowWarning } from "./OverflowWarning"
import { useCardExport } from "./useCardExport"
import { usePageOverflow } from "./usePageOverflow"
import { LayoutPanel, SizeInput } from "./LayoutPanel"

/**
 * The custom card report: one gem, one editable copy of the small certificate.
 *
 * The document starts as the gem's own card — the same rows, the same words — and every
 * change made from there is somebody's deliberate departure from it. Saving stores it on
 * the report and nowhere else: the gem's own record is never touched, so a custom card
 * can say whatever a one-off needs it to say without that becoming the lab's finding
 * about the stone.
 *
 * The card is drawn twice, as every report preview here is: the screen copy inside a
 * scale transform, carrying the editors, and an off-screen copy at natural size with no
 * editors at all, which is the one the exporters capture.
 */

/** Past this the rows start to crowd the signature; the card's height is fixed. */
const MAX_ROWS = 10

interface CustomSmallReportBuilderProps {
  gem: Gem
  /** Identifies the report the QR code resolves to, as the standard card's does. */
  reportId?: string
  /** What this report already had saved on it, if anything. */
  initial: CustomSmallReport
  /** Resolves once the card is stored. Absent leaves the card export-only. */
  onSave?: (data: CustomSmallReport) => Promise<void>
  /**
   * Drops the customisation, so the report goes back to printing the card built from
   * the gem. Passed only when there is one saved to drop.
   */
  onClear?: () => Promise<void>
}

export function CustomSmallReportBuilder({
  gem,
  reportId,
  initial,
  onSave,
  onClear,
}: CustomSmallReportBuilderProps) {
  const verificationUrl = `${window.location.origin}/reports/${reportId || gem._id}`

  // Seeded once and never re-seeded: a refetch of the report behind the page must not
  // quietly throw away what somebody has typed onto the card. Going back to the gem's
  // own wording is what Reset is for.
  const [data, setData] = useState<CustomSmallReport>(initial)
  const [presetLabel, setPresetLabel] = useState("")
  const [saving, setSaving] = useState(false)
  const [clearing, setClearing] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  // What is on the server, as text, so an edit that lands back on the saved wording
  // counts as saved rather than as a change nobody can find.
  const [savedSnapshot, setSavedSnapshot] = useState(() =>
    JSON.stringify(toStoredCustomReport(initial)),
  )
  const snapshot = useMemo(() => JSON.stringify(toStoredCustomReport(data)), [data])
  const dirty = snapshot !== savedSnapshot

  const printRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(1)

  const { downloading, downloadingPdf, downloadPng, downloadPdf } = useCardExport(
    printRef,
    `GRC-${gem.gemId || gem._id}-custom-card`,
  )

  // Values wrap, so the row limit alone cannot promise the card fits.
  const overflow = usePageOverflow(printRef, snapshot)

  // The card is a fixed-size print artefact; shrink it to fit narrow viewports. The
  // transform lives on a wrapper, so printRef stays at natural size and downloads keep
  // full resolution regardless of the screen they were taken on.
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const updateScale = (width: number) => setScale(width < CARD_WIDTH ? width / CARD_WIDTH : 1)
    const observer = new ResizeObserver((entries) => updateScale(entries[0].contentRect.width))
    observer.observe(el)
    updateScale(el.clientWidth)
    return () => observer.disconnect()
  }, [])

  const patch = (next: Partial<CustomSmallReport>) => setData((prev) => ({ ...prev, ...next }))

  const addRow = (label: string) => {
    if (data.rows.length >= MAX_ROWS) return
    patch({ rows: [...data.rows, newCustomReportRow(label || "New field")] })
  }

  const rowSize = fontSizer(data.fontSizes, SMALL_FONT_FIELDS)("rows")
  const setRowSize = (rowId: string, size: number | undefined) =>
    patch({
      rows: data.rows.map((row) => (row.id === rowId ? withRowSize(row, size) : row)),
    })

  const removeRow = (rowId: string) =>
    patch({ rows: data.rows.filter((row) => row.id !== rowId) })

  const moveRow = (index: number, delta: number) => {
    const target = index + delta
    if (target < 0 || target >= data.rows.length) return
    const rows = [...data.rows]
    const [row] = rows.splice(index, 1)
    rows.splice(target, 0, row)
    patch({ rows })
  }

  const handleClear = async () => {
    if (!onClear) return
    setClearing(true)
    setSaveError(null)
    try {
      await onClear()
    } catch (err) {
      console.error("Failed to remove the custom card", err)
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
      console.error("Failed to save custom card", err)
      setSaveError(err instanceof Error ? err.message : "Could not save this card.")
    } finally {
      setSaving(false)
    }
  }

  const obs = gem.finalApproval?.finalObservations || {}
  const imageId = gem.images && gem.images.length > 0 ? gem.images[0] : undefined

  const cardProps = {
    data,
    onChange: patch,
    onRemoveRow: removeRow,
    imageId,
    obs,
  }

  const toggles: Array<{ key: keyof CustomSmallReport; label: string }> = [
    { key: "showLogo", label: "GRC logo" },
    { key: "showWatermark", label: "Watermark" },
    { key: "showGemImage", label: "Gem image & caption" },
    { key: "showHeatLine", label: "Heat treatment line" },
    { key: "showSignature", label: "Signature" },
    { key: "showQr", label: "QR code" },
  ]

  return (
    <div className='grid grid-cols-1 gap-6 xl:grid-cols-3'>
      <style>{EDITABLE_FIELD_STYLES}</style>

      {/* ── THE CARD ── */}
      <div className='xl:col-span-2'>
        <div
          ref={containerRef}
          className='flex w-full min-w-0 flex-col items-center justify-start font-serif text-slate-900'
        >
          <div
            style={{
              width: `${CARD_WIDTH * scale}px`,
              height: `${CARD_HEIGHT * scale}px`,
              margin: "0 auto",
            }}
          >
            <div
              style={{
                width: `${CARD_WIDTH}px`,
                height: `${CARD_HEIGHT}px`,
                transform: `scale(${scale})`,
                transformOrigin: "top left",
              }}
            >
              <CustomSmallReportCard {...cardProps} target='screen' editable />
            </div>
          </div>

          <div
            className='mt-4 flex w-full flex-wrap items-center justify-end gap-2'
            style={{ maxWidth: `${CARD_WIDTH}px` }}
          >
            <span className='mr-auto text-[10px] text-slate-400'>
              Click any label or value on the card to edit it.
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
                setData({ ...buildCustomSmallReport(gem, verificationUrl), ...pickLayout(data) })
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
                {saving ? "Saving..." : dirty ? "Save card" : "Saved"}
              </Button>
            )}
            <Button size='sm' onClick={downloadPng} disabled={downloading}>
              <Download className='mr-1.5 h-3 w-3' />
              {downloading ? "Exporting..." : "Download Card"}
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

          <div className='w-full' style={{ maxWidth: `${CARD_WIDTH}px` }}>
            <OverflowWarning overflow={overflow} page='card' />
          </div>

          <div className='mt-2 w-full space-y-1' style={{ maxWidth: `${CARD_WIDTH}px` }}>
            <p className='text-[10px] text-slate-400'>
              Print the PDF at 100% — not "fit to page" — for a true-size gem image.
            </p>
            {onSave && (
              <p className='text-[10px] text-slate-500'>
                {dirty
                  ? "Unsaved changes. Save the card to make it this report's certificate — it is what the QR code and the reports list will show."
                  : onClear
                    ? "Saved on this report. The QR code and the reports list show this card."
                    : "Not customised yet — this report still prints the standard card. Save to change that."}
              </p>
            )}
            {saveError && <p className='text-[10px] text-red-600'>{saveError}</p>}
          </div>
        </div>
      </div>

      {/* ── STRUCTURE & ELEMENTS ── */}
      <Card className='h-fit space-y-6 p-5'>
        <div className='space-y-3'>
          <div className='flex items-baseline justify-between'>
            <Label>Fields</Label>
            <span className='text-xs text-slate-400'>
              {data.rows.length} of {MAX_ROWS}
            </span>
          </div>

          <div className='space-y-1'>
            {data.rows.map((row, index) => (
              <div
                key={row.id}
                className='flex items-center gap-1 rounded-md border px-2 py-1.5 text-sm'
              >
                <span className='flex-1 truncate text-slate-700'>{row.label || "Untitled"}</span>
                <SizeInput
                  value={row.fontSize}
                  fallback={rowSize}
                  onChange={(size) => setRowSize(row.id, size)}
                  title={`Type size for this row — blank prints at ${rowSize}px`}
                />
                <Button
                  variant='ghost'
                  size='icon'
                  className='h-6 w-6'
                  disabled={index === 0}
                  onClick={() => moveRow(index, -1)}
                  title='Move up'
                >
                  <ArrowUp className='h-3 w-3' />
                </Button>
                <Button
                  variant='ghost'
                  size='icon'
                  className='h-6 w-6'
                  disabled={index === data.rows.length - 1}
                  onClick={() => moveRow(index, 1)}
                  title='Move down'
                >
                  <ArrowDown className='h-3 w-3' />
                </Button>
                <Button
                  variant='ghost'
                  size='icon'
                  className='h-6 w-6 text-red-600 hover:text-red-700'
                  onClick={() => removeRow(row.id)}
                  title='Remove'
                >
                  <Trash2 className='h-3 w-3' />
                </Button>
              </div>
            ))}
            {data.rows.length === 0 && (
              <p className='rounded-md border border-dashed px-2 py-3 text-center text-xs text-slate-400'>
                No fields. Add one below.
              </p>
            )}
          </div>

          <div className='flex gap-2'>
            <Select value={presetLabel || undefined} onValueChange={setPresetLabel}>
              <SelectTrigger className='h-9 flex-1'>
                <SelectValue placeholder='Field to add' />
              </SelectTrigger>
              <SelectContent>
                {CUSTOM_REPORT_FIELD_PRESETS.map((label) => (
                  <SelectItem key={label} value={label}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant='outline'
              size='sm'
              className='h-9'
              disabled={data.rows.length >= MAX_ROWS}
              onClick={() => addRow(presetLabel)}
            >
              <Plus className='mr-1 h-3 w-3' />
              Add
            </Button>
          </div>
          <p className='text-xs text-slate-500'>
            Adds an empty row — type its value on the card. Leave the list unset to add a blank
            field and name it there too.
          </p>
        </div>

        <div className='border-t pt-5'>
          <LayoutPanel layout={data} fontFields={SMALL_FONT_FIELDS} onChange={patch} />
        </div>

        <div className='space-y-3 border-t pt-5'>
          <Label>Elements</Label>
          {toggles.map((toggle) => (
            <div key={toggle.key} className='flex items-center space-x-2'>
              <Checkbox
                id={`toggle-${toggle.key}`}
                checked={Boolean(data[toggle.key])}
                onCheckedChange={(checked: boolean | "indeterminate") =>
                  patch({ [toggle.key]: checked === true } as Partial<CustomSmallReport>)
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
            Where a scan of this card lands. Defaults to this report's verification page.
          </p>
        </div>
      </Card>

      {/* CAPTURE ENGINE ISOLATION — natural size, never transformed and never editable,
          so the exports keep full resolution and carry no editing chrome. */}
      <div style={{ position: "fixed", left: "-9999px", top: 0, zIndex: -1, pointerEvents: "none" }}>
        <CustomSmallReportCard {...cardProps} target='print' innerRef={printRef} />
      </div>
    </div>
  )
}
