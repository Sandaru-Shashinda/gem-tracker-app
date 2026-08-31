import { useEffect, useMemo, useState } from "react"
import { Columns2, Copy, AlertCircle } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { type Gem, type ObservationData } from "@/lib/types"
import { TREATMENT_SECTIONS, normalizeTreatments } from "@/lib/treatments"
import { formatRi, formatHardness, formatStageWeight } from "@/lib/gemFormUtils"
import { usersApi } from "@/lib/api/users"
import { useToast } from "@/hooks/useToast"

type StageRecord = NonNullable<Gem["test1"]>

/** How a row's two values are drawn. Long text wraps; answers print as Yes/No badges. */
type RowVariant = "text" | "long" | "answer" | "stars"

interface Row {
  label: string
  a: string
  b: string
  variant?: RowVariant
}

interface Section {
  title: string
  rows: Row[]
}

/** Empty string is the single "nothing recorded" value — printed as an em dash. */
const val = (v: unknown): string => (v === null || v === undefined || v === "" ? "" : String(v))

const norm = (v: string) => v.trim().toLowerCase()

/**
 * The two ways a row can need the approver's attention, kept apart because they mean
 * different things: a conflict is two testers reading the same gem differently, while
 * a gap is one tester recording something the other left blank — normal for optional
 * fields like S.G., but still worth seeing before signing.
 */
type RowState = "same" | "conflict" | "gap"

const rowState = (row: Row): RowState => {
  const a = norm(row.a)
  const b = norm(row.b)
  if (!a && !b) return "same"
  if (!a || !b) return "gap"
  return a === b ? "same" : "conflict"
}

const isDiff = (row: Row) => rowState(row) !== "same"

/** X/Y/Z are Length/Width/Height, printed in that order. */
const dimensions = (o?: ObservationData): string => {
  const parts = [o?.messurementX, o?.messurementY, o?.messurementZ]
  if (parts.every((p) => p === null || p === undefined || (p as unknown) === "")) return ""
  return parts
    .map((p) =>
      p === null || p === undefined || (p as unknown) === "" ? "?" : Number(p).toFixed(2),
    )
    .join(" × ")
}

const heat = (o?: ObservationData): string =>
  o?.isHeated === undefined || o?.isHeated === null ? "" : o.isHeated ? "Heated" : "Not Heated"

function buildSections(t1?: StageRecord | null, t2?: StageRecord | null): Section[] {
  const a = t1?.observations
  const b = t2?.observations
  const row = (
    label: string,
    pick: (stage?: StageRecord | null, obs?: ObservationData) => unknown,
    variant?: RowVariant,
  ): Row => ({ label, a: val(pick(t1, a)), b: val(pick(t2, b)), variant })

  const treatmentSections: Section[] = TREATMENT_SECTIONS.map((section) => {
    const va = normalizeTreatments(a?.treatments)
    const vb = normalizeTreatments(b?.treatments)
    return {
      title: `Treatments · ${section.title}`,
      rows: section.items.map((item) => ({
        label: item.label,
        a: va[item.key],
        b: vb[item.key],
        variant: "answer" as const,
      })),
    }
  })

  return [
    {
      title: "Scientific Readings",
      rows: [
        row("R.I.", (s) => formatRi(s, "")),
        // S.G. is optional at every stage, so a blank here is a legitimate record.
        row("S.G.", (s) => s?.sg),
        row("Hardness", (s) => formatHardness(s, "")),
        row("Weight", (s) => formatStageWeight(s, "")),
        row("Dimensions L × W × H (mm)", (_s, o) => dimensions(o)),
      ],
    },
    {
      title: "Identification",
      rows: [
        row("Species", (_s, o) => o?.species),
        row("Variety", (s, o) => o?.variety || s?.selectedVariety),
        row("Origin", (_s, o) => o?.origin),
        row("Transparency", (_s, o) => o?.transparency),
        row("Spectroscopy", (_s, o) => o?.spectroscopy),
      ],
    },
    {
      title: "Cut & Shape",
      rows: [
        row("Shape", (_s, o) => o?.cuttingShape || o?.shape),
        row("Crown Style", (_s, o) => o?.crownStyle || o?.cuttingStyle || o?.cut),
        row("Pavilion Style", (_s, o) => o?.pavilionStyle),
      ],
    },
    {
      title: "Colour",
      rows: [
        row("Colour", (s, o) => s?.colour || o?.colour),
        row("Hue", (_s, o) => o?.hue),
        row("Tone", (_s, o) => o?.tone),
        row("Saturation", (_s, o) => o?.saturation),
      ],
    },
    {
      title: "Grading",
      rows: [
        row("Cutting", (_s, o) => o?.cuttingGrade),
        row("Polishing", (_s, o) => o?.polishingGrade),
        row("Proportion", (_s, o) => o?.proportionGrade),
        row("Clarity", (_s, o) => o?.clarityGrade),
        row("Clarity Enhancement", (_s, o) => o?.clarityEnhancement),
        row("Grade", (_s, o) => o?.grade),
        row("Final Grade", (_s, o) => o?.finalGrade, "stars"),
      ],
    },
    {
      title: "Heat & Treatment",
      rows: [
        row("Heat", (_s, o) => heat(o)),
        row("Shown in Report", (_s, o) =>
          o?.showHeatInReport === undefined ? "" : o.showHeatInReport ? "Yes" : "No",
        ),
        row("Treatment", (_s, o) => o?.treatment, "long"),
      ],
    },
    ...treatmentSections,
    {
      title: "Notes",
      rows: [
        row("Item Description", (_s, o) => o?.itemDescription, "long"),
        row("Comments", (_s, o) => o?.comments, "long"),
        row("Special Note", (_s, o) => o?.specialNote, "long"),
        row("Tester Notes", (s) => s?.notes, "long"),
      ],
    },
  ]
}

interface TesterComparisonDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  gem: Gem
  /** Copies a tester's findings into the approval form. Omitted outside the approval stage. */
  onCopyValues?: (source: StageRecord) => void
}

/**
 * Both testers' submissions in one aligned, two-column read.
 *
 * The sidebar stacks the two stage cards vertically, which makes the approver scroll
 * between them and hold values in their head. Here every field sits on one row with
 * Tester 1 and Tester 2 next to each other, and any row the two disagree on — a value
 * only one of them recorded included — is flagged in amber and can be isolated with
 * "Differences only".
 */
export function TesterComparisonDialog({
  open,
  onOpenChange,
  gem,
  onCopyValues,
}: TesterComparisonDialogProps) {
  const toast = useToast()
  const [diffOnly, setDiffOnly] = useState(false)
  const [testerNames, setTesterNames] = useState<Record<string, string>>({})

  const sections = useMemo(() => buildSections(gem.test1, gem.test2), [gem.test1, gem.test2])
  const { conflicts, gaps } = useMemo(() => {
    const rows = sections.flatMap((s) => s.rows)
    return {
      conflicts: rows.filter((r) => rowState(r) === "conflict").length,
      gaps: rows.filter((r) => rowState(r) === "gap").length,
    }
  }, [sections])
  const diffCount = conflicts + gaps

  // Names are a convenience only — the columns stay labelled Tester 1 / Tester 2 if the
  // lookup fails or the record only carries an id.
  useEffect(() => {
    if (!open) return
    let cancelled = false
    usersApi
      .getUsers()
      .then((users) => {
        if (cancelled) return
        setTesterNames(Object.fromEntries(users.map((u) => [u.id, u.name])))
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [open])

  // A stage's testerId is an id string on some records and a populated user on others.
  const idOf = (v: unknown): string => {
    if (typeof v === "string") return v
    const ref = v as { _id?: string; id?: string } | null | undefined
    return ref?._id ?? ref?.id ?? ""
  }

  const nameOf = (v: unknown): string => {
    const ref = v as { name?: string } | null | undefined
    if (ref && typeof v === "object" && ref.name) return ref.name
    return testerNames[idOf(v)] || ""
  }

  const visible = diffOnly
    ? sections.map((s) => ({ ...s, rows: s.rows.filter(isDiff) })).filter((s) => s.rows.length > 0)
    : sections

  // Copying closes the dialog, so the confirmation has to come from the app-level toast
  // layer — otherwise it would unmount with the dialog that raised it.
  const copy = (source: StageRecord | null | undefined, label: string, name: string) => {
    if (!source) return
    onCopyValues?.(source)
    onOpenChange(false)
    toast({
      title: `${label}'s findings copied`,
      description: `The approval form now holds ${name || label.toLowerCase()}'s readings. Review them before submitting the final report.`,
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='flex flex-col gap-0 p-0 w-[96vw] max-w-[1400px] max-h-[92vh] overflow-hidden'>
        <DialogHeader className='px-6 pt-6 pb-4 pr-14 border-b border-slate-100 shrink-0'>
          <DialogTitle className='flex items-center gap-2'>
            <Columns2 className='h-5 w-5 text-slate-500' />
            Tester Reports — Side by Side
          </DialogTitle>
          <DialogDescription className='flex flex-wrap items-center gap-3'>
            <span>
              Both submissions for <span className='font-bold text-slate-900'>{gem.gemId}</span>,
              field by field.
            </span>
            {diffCount === 0 && (
              <Badge
                variant='outline'
                className='bg-emerald-50 text-emerald-700 border-emerald-200'
              >
                Testers agree on every field
              </Badge>
            )}
            {conflicts > 0 && (
              <Badge variant='outline' className='bg-amber-50 text-amber-700 border-amber-200'>
                {conflicts} {conflicts === 1 ? "conflict" : "conflicts"}
              </Badge>
            )}
            {gaps > 0 && (
              <Badge variant='outline' className='bg-sky-50 text-sky-700 border-sky-200'>
                {gaps} recorded by one tester only
              </Badge>
            )}
            <Button
              type='button'
              size='sm'
              variant={diffOnly ? "default" : "outline"}
              className='h-7 text-[11px]'
              onClick={() => setDiffOnly((v) => !v)}
              disabled={diffCount === 0}
            >
              Differences only
            </Button>
          </DialogDescription>
        </DialogHeader>

        <div className='flex-1 overflow-auto px-6 pb-6'>
          <div className='min-w-[720px]'>
            {/* Column headers stay put, so a value halfway down still has a tester above it. */}
            <div className='sticky top-0 z-10 bg-white pt-4 pb-2 grid grid-cols-[minmax(150px,210px)_minmax(0,1fr)_minmax(0,1fr)] gap-3'>
              <div />
              <TesterColumnHeader
                stage={gem.test1}
                label='Tester 1'
                name={nameOf(gem.test1?.testerId ?? gem.assignedTester1)}
                tone='blue'
                onCopy={
                  onCopyValues && gem.test1
                    ? () => copy(gem.test1, "Tester 1", nameOf(gem.test1?.testerId))
                    : undefined
                }
              />
              <TesterColumnHeader
                stage={gem.test2}
                label='Tester 2'
                name={nameOf(gem.test2?.testerId ?? gem.assignedTester2)}
                tone='purple'
                onCopy={
                  onCopyValues && gem.test2
                    ? () => copy(gem.test2, "Tester 2", nameOf(gem.test2?.testerId))
                    : undefined
                }
              />
            </div>

            {visible.length === 0 ? (
              <p className='py-12 text-center text-sm text-slate-400'>No differences to show.</p>
            ) : (
              <div className='space-y-6 pt-2'>
                {visible.map((section) => (
                  <div key={section.title}>
                    <p className='text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 border-b border-slate-100 pb-2 mb-2'>
                      {section.title}
                    </p>
                    <div className='space-y-1'>
                      {section.rows.map((row) => (
                        <ComparisonRow key={`${section.title}-${row.label}`} row={row} />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function TesterColumnHeader({
  stage,
  label,
  name,
  tone,
  onCopy,
}: {
  stage?: StageRecord | null
  label: string
  name: string
  tone: "blue" | "purple"
  onCopy?: () => void
}) {
  const accent =
    tone === "blue"
      ? "text-blue-600 bg-blue-50 border-blue-100"
      : "text-purple-600 bg-purple-50 border-purple-100"

  return (
    <div className={`rounded-lg border px-3 py-2 ${accent}`}>
      <p className='text-[10px] font-black uppercase tracking-wider'>{label}</p>
      {/* The action sits against the name so picking a base for the certificate is a
          choice between two people, not between two anonymous columns. */}
      <div className='flex flex-wrap items-center justify-between gap-2'>
        <p className='min-w-0 truncate text-xs font-bold text-slate-700'>
          {name || "Unassigned"}
        </p>
       
          <Button
            type='button'
            variant='outline'
            size='sm'
            className='h-6 shrink-0 gap-1 border-slate-300 bg-white px-2 text-[10px] font-bold text-slate-700 hover:bg-slate-50'
            onClick={onCopy}
            title="Fill the approval form with this tester's findings"
          >
            <Copy className='h-3 w-3' />
            Use for Final Report
          </Button>
       
      </div>
      <div className='mt-1 flex flex-wrap items-center gap-x-3 gap-y-1'>
        <span className='text-[10px] text-slate-500'>
          {stage?.timestamp
            ? `Submitted ${new Date(stage.timestamp).toLocaleString()}`
            : "Not submitted"}
        </span>
        {stage?.correctionRequested && (
          <span className='flex items-center gap-1 text-[10px] font-bold text-red-600'>
            <AlertCircle className='h-3 w-3' />
            Correction requested
          </span>
        )}
      </div>
    </div>
  )
}

function ComparisonRow({ row }: { row: Row }) {
  const state = rowState(row)
  // On a gap only the tester who recorded something is tinted, so the eye lands on the
  // value that exists rather than on the blank.
  const cell = (value: string) =>
    `rounded-md border px-3 py-2 text-xs min-w-0 ${
      state === "conflict"
        ? "bg-amber-50/70 border-amber-200"
        : state === "gap" && value
          ? "bg-sky-50/60 border-sky-200"
          : "bg-slate-50 border-slate-100"
    }`

  return (
    <div className='grid grid-cols-[minmax(150px,210px)_minmax(0,1fr)_minmax(0,1fr)] gap-3 items-stretch'>
      <div className='flex items-center gap-1.5 px-1 py-2'>
        <span
          className={`text-[11px] leading-tight ${
            state === "conflict"
              ? "text-amber-700 font-bold"
              : state === "gap"
                ? "text-sky-700 font-semibold"
                : "text-slate-500 font-medium"
          }`}
        >
          {row.label}
        </span>
      </div>
      <div className={cell(row.a)}>
        <CellValue value={row.a} variant={row.variant} />
      </div>
      <div className={cell(row.b)}>
        <CellValue value={row.b} variant={row.variant} />
      </div>
    </div>
  )
}

function CellValue({ value, variant = "text" }: { value: string; variant?: RowVariant }) {
  if (!value) return <span className='text-slate-300'>—</span>

  if (variant === "answer") {
    return (
      <Badge
        variant='secondary'
        className={`h-5 text-[10px] px-2 border ${
          value === "Yes"
            ? "bg-purple-100 text-purple-700 border-purple-200"
            : "bg-slate-100 text-slate-600 border-slate-200"
        }`}
      >
        {value}
      </Badge>
    )
  }

  if (variant === "stars") {
    const score = Number(value) || 0
    return (
      <div className='flex items-center gap-1'>
        {[1, 2, 3, 4, 5].map((star) => (
          <svg
            key={star}
            className={`w-3.5 h-3.5 ${star <= score ? "text-amber-500 fill-amber-500" : "text-slate-300"}`}
            viewBox='0 0 24 24'
          >
            <path d='M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z' />
          </svg>
        ))}
        <span className='ml-1 text-[10px] text-slate-500'>{score}/5</span>
      </div>
    )
  }

  if (variant === "long") {
    return <p className='text-[11px] leading-relaxed text-slate-700 whitespace-pre-wrap'>{value}</p>
  }

  return <span className='font-bold text-slate-800 break-words'>{value}</span>
}
