import { useEffect, useState, type ReactNode } from "react"
import { type UseFormReturn } from "react-hook-form"
import {
  AlertTriangle,
  Check,
  ChevronDown,
  FlaskConical,
  Loader2,
  RefreshCw,
  Scale,
  Sparkles,
  Wand2,
} from "lucide-react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { type TestFormValues } from "@/lib/validations/test"
import { TREATMENT_LABELS } from "@/lib/treatments"
import {
  AI_FIELD_ORDER,
  type AiFieldKey,
  type AiInsight,
  AiInsightError,
  aiInsightsApi,
  readingsFromForm,
  sameReadings,
} from "@/lib/api/aiInsights"

const FIELD_LABELS: Record<AiFieldKey, string> = {
  colour: "Colour",
  hue: "Hue",
  tone: "Tone",
  saturation: "Saturation",
  transparency: "Transparency",
  cuttingShape: "Shape",
  crownStyle: "Crown style",
  pavilionStyle: "Pavilion style",
  grade: "Shape grade",
  clarityGrade: "Clarity",
  clarityEnhancement: "Clarity enhancement",
}

/** "Fill empty fields" only takes suggestions at least this sure of themselves. */
const FILL_THRESHOLD = 60

/** The readings the AI uses, in the order adding them narrows the answer most. */
const READING_STEPS = [
  { key: "ri", label: "R.I." },
  { key: "hardness", label: "Hardness" },
  { key: "sg", label: "S.G." },
  { key: "size", label: "Size" },
  { key: "weight", label: "Weight" },
  { key: "spectrum", label: "Spectrum" },
] as const

const toneFor = (confidence: number) =>
  confidence >= 75
    ? { bar: "bg-emerald-500", pill: "bg-emerald-50 text-emerald-700 border-emerald-200", word: "High" }
    : confidence >= 50
      ? { bar: "bg-amber-500", pill: "bg-amber-50 text-amber-700 border-amber-200", word: "Medium" }
      : { bar: "bg-slate-400", pill: "bg-slate-50 text-slate-600 border-slate-200", word: "Low" }

const timeAgo = (iso: string) => {
  const minutes = Math.round((Date.now() - new Date(iso).getTime()) / 60000)
  if (minutes < 1) return "just now"
  if (minutes < 60) return `${minutes} min ago`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours} h ago`
  return new Date(iso).toLocaleDateString()
}

interface AiInsightsPanelProps {
  gemId: string
  form: UseFormReturn<TestFormValues>
  /** Intake photos on the gem; Drive photos are counted by the server once it has run. */
  intakePhotoCount: number
  /** True when the analysis form is locked: suggestions are shown but cannot be applied. */
  readOnly?: boolean
  /** Called after values are written into the form, so the combobox search texts follow. */
  onApplied: () => void
}

/**
 * AI suggestions for the analysis form, from the gem's photos and the readings entered
 * so far. Nothing reaches the form until someone presses Apply or Use, and
 * "Fill empty fields" never overwrites what a tester has already typed.
 */
export function AiInsightsPanel({ gemId, form, intakePhotoCount, readOnly, onApplied }: AiInsightsPanelProps) {
  const { watch, setValue, getValues } = form
  const [insight, setInsight] = useState<AiInsight | null>(null)
  const [running, setRunning] = useState(false)
  const [error, setError] = useState<AiInsightError | null>(null)
  const [showAllCandidates, setShowAllCandidates] = useState(false)

  useEffect(() => {
    let cancelled = false
    setInsight(null)
    setError(null)
    aiInsightsApi
      .getLatest(gemId)
      .then((latest) => !cancelled && setInsight(latest))
      .catch((err) => console.error("Failed to load AI insights:", err))
    return () => {
      cancelled = true
    }
  }, [gemId])

  const values = watch()
  const current = readingsFromForm(values)
  const stale = !!insight && !sameReadings(current, insight.readings)

  const have: Record<(typeof READING_STEPS)[number]["key"], boolean> = {
    ri: current.riMin !== null || current.riMax !== null,
    hardness: current.hardness !== null,
    sg: current.sg !== null,
    size: current.length !== null && current.width !== null && current.height !== null,
    weight: current.weight !== null,
    spectrum: current.spectroscopy !== null,
  }
  const nextReading = READING_STEPS.find((step) => !have[step.key])
  const photoCount = insight?.imageCount ?? intakePhotoCount

  const run = async () => {
    setRunning(true)
    setError(null)
    try {
      setInsight(await aiInsightsApi.generate(gemId, readingsFromForm(getValues())))
      setShowAllCandidates(false)
    } catch (err) {
      setError(err instanceof AiInsightError ? err : new AiInsightError(String(err)))
    } finally {
      setRunning(false)
    }
  }

  const write = (name: keyof TestFormValues, value: string) =>
    setValue(name, value as never, { shouldDirty: true, shouldValidate: true })

  const applyField = (key: AiFieldKey, value: string) => {
    write(key, value)
    onApplied()
  }

  const result = insight?.result
  const suggestedFields = result
    ? AI_FIELD_ORDER.filter((key) => result.fields[key]).map((key) => ({ key, ...result.fields[key]! }))
    : []
  const fillable = suggestedFields.filter(
    (f) => f.confidence >= FILL_THRESHOLD && !String(values[f.key] ?? "").trim(),
  )

  const fillEmpty = () => {
    fillable.forEach((f) => write(f.key, f.value))
    onApplied()
  }

  const applyCandidate = (species: string, variety: string) => {
    write("species", species)
    write("selectedVariety", variety)
    onApplied()
  }

  const candidates = result?.candidates ?? []
  const shownCandidates = showAllCandidates ? candidates : candidates.slice(0, 2)
  const currentVariety = (values.selectedVariety || "").trim().toLowerCase()

  return (
    <Card className='p-5 border-violet-100 bg-gradient-to-b from-violet-50/70 to-white shadow-md space-y-4'>
      {/* Header */}
      <div className='flex items-start justify-between gap-3'>
        <div className='flex items-center gap-2'>
          <div className='p-1.5 bg-violet-100 rounded-lg'>
            <Sparkles size={16} className='text-violet-600' />
          </div>
          <div>
            <h3 className='text-xs font-bold text-violet-900 uppercase tracking-wider'>AI Insights</h3>
            <p className='text-[10px] text-violet-500'>Photos + your readings → suggestions</p>
          </div>
        </div>
        <Button
          type='button'
          size='sm'
          onClick={run}
          disabled={running}
          className={
            insight && !stale
              ? "bg-white text-violet-700 border border-violet-200 hover:bg-violet-50"
              : "bg-violet-600 hover:bg-violet-700 text-white"
          }
        >
          {running ? (
            <Loader2 className='animate-spin' />
          ) : insight ? (
            <RefreshCw />
          ) : (
            <Sparkles />
          )}
          {running ? "Analysing…" : insight ? (stale ? "Update" : "Re-run") : "Analyse"}
        </Button>
      </div>

      {/* What the AI is working from */}
      <div className='space-y-1.5'>
        <div className='flex flex-wrap gap-1'>
          <InputChip done={photoCount > 0} label={photoCount > 0 ? `${photoCount} photo${photoCount === 1 ? "" : "s"}` : "No photos"} />
          {READING_STEPS.map((step) => (
            <InputChip key={step.key} done={have[step.key]} label={step.label} />
          ))}
        </div>
        {nextReading && (
          <p className='text-[10px] text-violet-600'>
            Tip: add <span className='font-semibold'>{nextReading.label}</span> to narrow the result further.
          </p>
        )}
      </div>

      {/* Errors */}
      {error && (
        <div className='rounded-lg border border-red-200 bg-red-50 p-3 text-[11px] text-red-700 flex gap-2'>
          <AlertTriangle className='h-4 w-4 shrink-0 mt-0.5' />
          <div>
            <p className='font-semibold'>
              {error.code === "AI_NOT_CONFIGURED"
                ? "AI isn't set up yet"
                : error.code === "AI_QUOTA"
                  ? "Free AI limit reached"
                  : "Couldn't analyse this gem"}
            </p>
            <p>
              {error.code === "AI_NOT_CONFIGURED"
                ? "An admin needs to add GEMINI_API_KEY to the API server's environment."
                : error.message}
            </p>
          </div>
        </div>
      )}

      {/* Working */}
      {running && (
        <div className='space-y-2 animate-pulse' aria-live='polite'>
          <p className='text-[11px] text-violet-600'>Looking at the photos and readings — usually 10–30 seconds…</p>
          <div className='h-12 rounded-xl bg-violet-100/70' />
          <div className='h-8 rounded-lg bg-violet-100/50' />
          <div className='h-8 rounded-lg bg-violet-100/40' />
        </div>
      )}

      {/* Empty state */}
      {!running && !insight && !error && (
        <div className='rounded-xl border-2 border-dashed border-violet-100 bg-white/60 p-4 text-center'>
          <Sparkles className='mx-auto h-7 w-7 text-violet-200 mb-2' />
          <p className='text-[11px] text-slate-600'>
            Press <span className='font-semibold text-violet-700'>Analyse</span> for suggested identification,
            colour, cut and clarity.
          </p>
          <p className='text-[10px] text-slate-400 mt-1'>
            Works from photos alone; each reading you add makes it more accurate.
          </p>
        </div>
      )}

      {/* Result */}
      {!running && insight && result && stale && (
        <button
          type='button'
          onClick={run}
          className='w-full rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-left text-[11px] text-amber-800 flex items-center gap-2 hover:bg-amber-100'
        >
          <RefreshCw className='h-3.5 w-3.5 shrink-0' />
          Readings changed since this analysis — <span className='font-semibold underline'>update it</span>
        </button>
      )}

      {!running && insight && result && (
        <div className={`space-y-4 transition-opacity ${stale ? "opacity-60" : ""}`}>

          {result.summary && <p className='text-xs text-slate-700 leading-relaxed'>{result.summary}</p>}

          {/* Identification */}
          {candidates.length > 0 && (
            <section className='space-y-2'>
              <SectionTitle>
                Identification
                {result.narrowedFrom !== null && (
                  <span className='ml-1 normal-case font-medium text-slate-400'>
                    · readings allow {result.narrowedFrom} species
                  </span>
                )}
              </SectionTitle>
              {shownCandidates.map((c, i) => {
                const tone = toneFor(c.confidence)
                const isCurrent = currentVariety && currentVariety === c.variety.toLowerCase()
                return (
                  <div
                    key={`${c.species}-${c.variety}`}
                    className={`rounded-xl border bg-white p-3 ${i === 0 ? "border-violet-200 shadow-sm" : "border-slate-100"}`}
                  >
                    <div className='flex items-start justify-between gap-2'>
                      <div className='min-w-0'>
                        <p className={`font-serif font-black text-slate-800 ${i === 0 ? "text-sm" : "text-xs"}`}>
                          {c.variety}
                        </p>
                        <p className='text-[10px] italic text-slate-500'>{c.species}</p>
                      </div>
                      {!readOnly &&
                        (isCurrent ? (
                          <span className='flex items-center gap-1 text-[10px] font-semibold text-emerald-600'>
                            <Check className='h-3 w-3' /> In form
                          </span>
                        ) : (
                          <Button
                            type='button'
                            size='sm'
                            variant='outline'
                            className='h-7 text-[11px] border-violet-200 text-violet-700 hover:bg-violet-50'
                            onClick={() => applyCandidate(c.species, c.variety)}
                          >
                            Use
                          </Button>
                        ))}
                    </div>
                    <div className='mt-2 flex items-center gap-2'>
                      <div className='h-1.5 flex-1 rounded-full bg-slate-100 overflow-hidden'>
                        <div className={`h-full rounded-full ${tone.bar}`} style={{ width: `${c.confidence}%` }} />
                      </div>
                      <span className='text-[10px] font-bold text-slate-600 tabular-nums'>{c.confidence}%</span>
                    </div>
                    <div className='mt-1.5 flex flex-wrap gap-1'>
                      {c.readingMatch !== null && (
                        <MiniTag tone='blue'>Readings match {c.readingMatch}%</MiniTag>
                      )}
                      {c.sgFit === true && <MiniTag tone='green'>Weight &amp; size fit</MiniTag>}
                      {c.sgFit === false && <MiniTag tone='amber'>S.G. vs weight &amp; size: check</MiniTag>}
                      {!c.inReferenceTable && <MiniTag tone='slate'>Not in reference table</MiniTag>}
                    </div>
                    {c.reasoning && <p className='mt-1.5 text-[10px] text-slate-500 leading-snug'>{c.reasoning}</p>}
                  </div>
                )
              })}
              {candidates.length > 2 && (
                <button
                  type='button'
                  onClick={() => setShowAllCandidates((v) => !v)}
                  className='flex items-center gap-1 text-[10px] font-semibold text-violet-600 hover:text-violet-800'
                >
                  <ChevronDown className={`h-3 w-3 transition-transform ${showAllCandidates ? "rotate-180" : ""}`} />
                  {showAllCandidates ? "Show fewer" : `${candidates.length - 2} more possibilities`}
                </button>
              )}
            </section>
          )}

          {/* Report fields */}
          {suggestedFields.length > 0 && (
            <section className='space-y-2'>
              <div className='flex items-center justify-between gap-2'>
                <SectionTitle>Report fields</SectionTitle>
                {!readOnly && fillable.length > 0 && (
                  <Button
                    type='button'
                    size='sm'
                    className='h-7 text-[11px] bg-violet-600 hover:bg-violet-700 text-white'
                    onClick={fillEmpty}
                    title={`Fills empty fields with suggestions at ${FILL_THRESHOLD}%+ confidence. Never overwrites what you've entered.`}
                  >
                    <Wand2 className='size-3.5' />
                    Fill {fillable.length} empty field{fillable.length === 1 ? "" : "s"}
                  </Button>
                )}
              </div>
              <div className='rounded-xl border border-slate-100 bg-white divide-y divide-slate-50'>
                {suggestedFields.map((f) => {
                  const tone = toneFor(f.confidence)
                  const inForm = String(values[f.key] ?? "").trim()
                  const matches = inForm.toLowerCase() === f.value.toLowerCase()
                  return (
                    <div key={f.key} className='flex items-start gap-2 px-3 py-2'>
                      <div className='min-w-0 flex-1'>
                        <p className='text-[9px] font-bold uppercase tracking-wide text-slate-400'>
                          {FIELD_LABELS[f.key]}
                        </p>
                        <p className='text-xs font-semibold text-slate-800'>{f.value}</p>
                        {f.reason && <p className='text-[10px] text-slate-400 leading-snug'>{f.reason}</p>}
                      </div>
                      <span
                        className={`mt-0.5 shrink-0 rounded-full border px-1.5 py-0.5 text-[9px] font-bold ${tone.pill}`}
                        title={`${tone.word} confidence`}
                      >
                        {f.confidence}%
                      </span>
                      {!readOnly &&
                        (matches ? (
                          <span className='mt-0.5 flex w-14 shrink-0 items-center justify-end gap-1 text-[10px] font-semibold text-emerald-600'>
                            <Check className='h-3 w-3' /> Set
                          </span>
                        ) : (
                          <Button
                            type='button'
                            size='sm'
                            variant='ghost'
                            className='h-6 w-14 shrink-0 px-0 text-[11px] text-violet-700 hover:bg-violet-50'
                            onClick={() => applyField(f.key, f.value)}
                            title={inForm ? `Replaces "${inForm}"` : undefined}
                          >
                            {inForm ? "Replace" : "Apply"}
                          </Button>
                        ))}
                    </div>
                  )
                })}
              </div>
            </section>
          )}

          {/* Item description */}
          {result.itemDescription && (
            <section className='space-y-1.5'>
              <div className='flex items-center justify-between'>
                <SectionTitle>Item description draft</SectionTitle>
                {!readOnly &&
                  (String(values.itemDescription ?? "").trim() === result.itemDescription ? (
                    <span className='flex items-center gap-1 text-[10px] font-semibold text-emerald-600'>
                      <Check className='h-3 w-3' /> Set
                    </span>
                  ) : (
                    <Button
                      type='button'
                      size='sm'
                      variant='ghost'
                      className='h-6 px-2 text-[11px] text-violet-700 hover:bg-violet-50'
                      onClick={() => {
                        write("itemDescription", result.itemDescription)
                        onApplied()
                      }}
                    >
                      {String(values.itemDescription ?? "").trim() ? "Replace" : "Use"}
                    </Button>
                  ))}
              </div>
              <p className='rounded-lg border border-slate-100 bg-white p-2 text-[11px] text-slate-700 italic'>
                {result.itemDescription}
              </p>
            </section>
          )}

          {/* Weight & size check */}
          {result.impliedSg && (
            <Note icon={<Scale className='h-3.5 w-3.5' />} tone='slate'>
              Weight and size suggest an S.G. of about <b>{result.impliedSg.value}</b> (
              {result.impliedSg.low}–{result.impliedSg.high}
              {result.impliedSg.shape ? `, ${result.impliedSg.shape.toLowerCase()} cut` : ""}). A rough
              estimate: it depends on the cut's proportions.
            </Note>
          )}

          {/* Warnings and next steps */}
          {result.conflicts.length > 0 && (
            <Note icon={<AlertTriangle className='h-3.5 w-3.5' />} tone='amber' title='Check these'>
              <ul className='list-disc pl-4 space-y-0.5'>
                {result.conflicts.map((c) => (
                  <li key={c}>{c}</li>
                ))}
              </ul>
            </Note>
          )}

          {result.nextSteps.length > 0 && (
            <Note icon={<FlaskConical className='h-3.5 w-3.5' />} tone='blue' title='Best next tests'>
              <ol className='list-decimal pl-4 space-y-0.5'>
                {result.nextSteps.map((s) => (
                  <li key={s.test}>
                    <b>{s.test}</b> — {s.why}
                  </li>
                ))}
              </ol>
            </Note>
          )}

          {result.checkFor.length > 0 && (
            <Note icon={<AlertTriangle className='h-3.5 w-3.5' />} tone='purple' title='Worth checking for treatment'>
              <ul className='list-disc pl-4 space-y-0.5'>
                {result.checkFor.map((t) => (
                  <li key={t.treatment}>
                    <b>{TREATMENT_LABELS[t.treatment] ?? t.treatment}</b> — {t.sign}
                  </li>
                ))}
              </ul>
            </Note>
          )}

          {result.notDeterminable.length > 0 && (
            <p className='text-[10px] text-slate-400'>
              <span className='font-semibold'>Needs lab tests, not photos:</span> {result.notDeterminable.join(", ")}
            </p>
          )}

          <p className='border-t border-violet-100 pt-2 text-[9px] text-slate-400'>
            {timeAgo(insight.createdAt)} · {insight.model}
            {insight.cached ? " · saved result" : ""} · AI suggestions — confirm before submitting.
          </p>
        </div>
      )}
    </Card>
  )
}

function SectionTitle({ children }: { children: ReactNode }) {
  return <h4 className='text-[10px] font-bold uppercase tracking-wider text-violet-800'>{children}</h4>
}

function InputChip({ done, label }: { done: boolean; label: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium ${
        done ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-dashed border-slate-200 bg-white text-slate-400"
      }`}
    >
      {done && <Check className='h-2.5 w-2.5' />}
      {label}
    </span>
  )
}

const TAG_TONES = {
  blue: "bg-blue-50 text-blue-700 border-blue-100",
  green: "bg-emerald-50 text-emerald-700 border-emerald-100",
  amber: "bg-amber-50 text-amber-700 border-amber-100",
  slate: "bg-slate-50 text-slate-500 border-slate-100",
}

function MiniTag({ tone, children }: { tone: keyof typeof TAG_TONES; children: ReactNode }) {
  return <span className={`rounded border px-1.5 py-px text-[9px] font-semibold ${TAG_TONES[tone]}`}>{children}</span>
}

const NOTE_TONES = {
  amber: "border-amber-200 bg-amber-50 text-amber-800",
  blue: "border-blue-100 bg-blue-50 text-blue-800",
  purple: "border-purple-100 bg-purple-50 text-purple-800",
  slate: "border-slate-100 bg-slate-50 text-slate-600",
}

function Note({
  icon,
  tone,
  title,
  children,
}: {
  icon: ReactNode
  tone: keyof typeof NOTE_TONES
  title?: string
  children: ReactNode
}) {
  return (
    <div className={`rounded-lg border p-2.5 text-[11px] leading-snug flex gap-2 ${NOTE_TONES[tone]}`}>
      <span className='mt-0.5 shrink-0'>{icon}</span>
      <div className='min-w-0'>
        {title && <p className='font-semibold mb-0.5'>{title}</p>}
        {children}
      </div>
    </div>
  )
}
