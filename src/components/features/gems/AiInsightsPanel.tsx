import { useEffect, useState, type ReactNode } from "react"
import { type UseFormReturn, useWatch } from "react-hook-form"
import {
  AlertTriangle,
  Check,
  ChevronDown,
  FlaskConical,
  Loader2,
  RefreshCw,
  Scale,
  Sparkles,
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
  photosForAi,
  readingsFromForm,
  sameReadings,
} from "@/lib/api/aiInsights"
import { GEM_MEDIA_CHANGED, type GemMediaChangedDetail, type GemMediaFile, mediaApi } from "@/lib/api/media"

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

/** The form fields readingsFromForm reads. */
const READING_FIELDS = [
  "riMin",
  "riMax",
  "sg",
  "hardness",
  "weight",
  "messurementX",
  "messurementY",
  "messurementZ",
  "spectroscopy",
] as const satisfies readonly (keyof TestFormValues)[]

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
  /** Intake photos on the gem; its Drive photos are listed here. */
  intakePhotoCount: number
}

/**
 * AI analysis of the gem, from its photos and the readings entered so far. Display only:
 * the form is read for the readings, but nothing is ever written back into it.
 */
export function AiInsightsPanel({ gemId, form, intakePhotoCount }: AiInsightsPanelProps) {
  const { control, getValues } = form
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

  // The gem's Drive photos: loaded here, then kept current by the media panel's uploads and deletes.
  const [driveFiles, setDriveFiles] = useState<GemMediaFile[] | null>(null)
  useEffect(() => {
    let cancelled = false
    setDriveFiles(null)
    mediaApi
      .list(gemId)
      .then((listing) => !cancelled && setDriveFiles(listing.files))
      .catch(() => !cancelled && setDriveFiles([])) // Drive not set up, or unreachable: count none.
    const onChange = (event: Event) => {
      const { detail } = event as CustomEvent<GemMediaChangedDetail>
      if (detail.gemId === gemId) setDriveFiles(detail.files)
    }
    window.addEventListener(GEM_MEDIA_CHANGED, onChange)
    return () => {
      cancelled = true
      window.removeEventListener(GEM_MEDIA_CHANGED, onChange)
    }
  }, [gemId])

  // Only the reading fields, and with useWatch: watch() with no names would re-render the
  // whole page that owns the form on every keystroke in any field.
  const readingValues = useWatch({ control, name: READING_FIELDS })
  const current = readingsFromForm(
    Object.fromEntries(READING_FIELDS.map((name, i) => [name, readingValues[i]])) as Partial<TestFormValues>,
  )
  /** Photos the next run will be given; null until the Drive listing is in. */
  const photosNow = driveFiles ? photosForAi(intakePhotoCount, driveFiles) : null
  const photosUsed = insight ? (insight.imageSourceCount ?? insight.imageCount) : null
  const readingsChanged = !!insight && !sameReadings(current, insight.readings)
  const photosChanged = photosNow !== null && photosUsed !== null && photosNow !== photosUsed
  const stale = readingsChanged || photosChanged

  const have: Record<(typeof READING_STEPS)[number]["key"], boolean> = {
    ri: current.riMin !== null || current.riMax !== null,
    hardness: current.hardness !== null,
    sg: current.sg !== null,
    size: current.length !== null && current.width !== null && current.height !== null,
    weight: current.weight !== null,
    spectrum: current.spectroscopy !== null,
  }
  const nextReading = READING_STEPS.find((step) => !have[step.key])
  // What the next run will see; the last run's count only until the Drive listing loads.
  const photoCount = photosNow ?? photosUsed ?? Math.min(intakePhotoCount, 2)
  const unreadablePhotos =
    insight && !photosChanged && insight.imageSourceCount ? insight.imageSourceCount - insight.imageCount : 0

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

  const result = insight?.result
  // Results saved before the model kept empty objects have no `fields` when there were no photos.
  const resultFields = result?.fields ?? {}
  const suggestedFields = AI_FIELD_ORDER.filter((key) => resultFields[key]).map((key) => ({
    key,
    ...resultFields[key]!,
  }))

  const candidates = result?.candidates ?? []
  const shownCandidates = showAllCandidates ? candidates : candidates.slice(0, 2)

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
        {unreadablePhotos > 0 && (
          <p className='text-[10px] text-amber-700'>
            {unreadablePhotos} of {insight!.imageSourceCount} photos couldn't be read (unsupported format?), so
            the AI didn't see {unreadablePhotos === 1 ? "it" : "them"}.
          </p>
        )}
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
          {readingsChanged && photosChanged
            ? "Readings and photos"
            : photosChanged
              ? "Photos"
              : "Readings"}{" "}
          changed since this analysis — <span className='font-semibold underline'>update it</span>
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
                return (
                  <div
                    key={`${c.species}-${c.variety}`}
                    className={`rounded-xl border bg-white p-3 ${i === 0 ? "border-violet-200 shadow-sm" : "border-slate-100"}`}
                  >
                    <div className='min-w-0'>
                      <p className={`font-serif font-black text-slate-800 ${i === 0 ? "text-sm" : "text-xs"}`}>
                        {c.variety}
                      </p>
                      <p className='text-[10px] italic text-slate-500'>{c.species}</p>
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
              <SectionTitle>Report fields</SectionTitle>
              <div className='rounded-xl border border-slate-100 bg-white divide-y divide-slate-50'>
                {suggestedFields.map((f) => {
                  const tone = toneFor(f.confidence)
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
                    </div>
                  )
                })}
              </div>
            </section>
          )}

          {/* Item description */}
          {result.itemDescription && (
            <section className='space-y-1.5'>
              <SectionTitle>Item description</SectionTitle>
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
            {insight.cached ? " · saved result" : ""} · AI suggestions for reference only.
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
