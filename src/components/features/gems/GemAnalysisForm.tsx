import { type ReactNode } from "react"
import { type UseFormReturn } from "react-hook-form"
import { FormField, type FieldConfig } from "@/components/shared/common/FormField"
import { TreatmentChecklist } from "@/components/features/gems/TreatmentChecklist"
import { type GemFormFields } from "@/components/shared/common/Formfieldsconfig"
import { type TestFormValues } from "@/lib/validations/test"

interface GemAnalysisFormProps {
  form: UseFormReturn<TestFormValues>
  /** Every field config, addressed by name — see getFormFieldsConfig. */
  fields: GemFormFields
  /**
   * Read-only mode. The form still renders in full so anyone can read a gem's analysis;
   * only the stage's owner can change it. See resolveActiveStage.
   */
  disabled?: boolean
}

const TONES = {
  slate: "border-slate-200/70 bg-slate-50/40",
  blue: "border-blue-100/70 bg-blue-50/30",
  amber: "border-amber-100/70 bg-amber-50/20",
} as const

const HEADINGS = {
  slate: "text-slate-500",
  blue: "text-blue-600",
  amber: "text-amber-600",
} as const

const RULES = {
  slate: "border-slate-200/70",
  blue: "border-blue-100",
  amber: "border-amber-100",
} as const

function Section({
  title,
  tone = "slate",
  children,
}: {
  title: string
  tone?: keyof typeof TONES
  children: ReactNode
}) {
  return (
    <section className={`space-y-4 rounded-xl border p-4 shadow-sm ${TONES[tone]}`}>
      <h4
        className={`border-b pb-2 text-[11px] font-black uppercase tracking-widest ${RULES[tone]} ${HEADINGS[tone]}`}
      >
        {title}
      </h4>
      {children}
    </section>
  )
}

/**
 * The analysis form, laid out in the order the lab fills it in: description and weight,
 * then colour, then the cut, then the measured properties, then identification, and
 * finally the written findings. Sections read top to bottom in that one order — this
 * component is the only place that order is expressed, and the field configs it draws
 * from are keyed by name so a section can be moved without disturbing any other.
 */
export function GemAnalysisForm({ form, fields, disabled }: GemAnalysisFormProps) {
  const {
    register,
    control,
    setValue,
    formState: { errors },
  } = form

  // A plain function, not a component: returning the element keeps FormField in the same
  // position in the tree across renders, so text inputs don't lose focus mid-keystroke.
  const field = (config: FieldConfig) => (
    <FormField
      key={config.name}
      config={config}
      register={register}
      errors={errors}
      control={control}
      setValue={setValue}
      disabled={disabled}
    />
  )

  return (
    // The fieldset is a second line of defence: every control is disabled explicitly
    // above, and this catches anything added later that forgets to honour the prop.
    // `min-w-0` because a fieldset otherwise refuses to shrink below its content.
    <fieldset disabled={disabled} className='min-w-0 space-y-6'>
      {/* 1–2. Item description and weight */}
      <Section title='Item & Weight'>
        {field(fields.itemDescription)}
        {field(fields.weight)}
      </Section>

      {/* 3. Colour, and the breakdown printed on the large report */}
      <Section title='Colour' tone='amber'>
        {field(fields.colour)}
        {field(fields.hue)}
        <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
          {field(fields.tone)}
          {field(fields.saturation)}
        </div>
        {field(fields.colourGrade)}
      </Section>

      {/* 4–5. Shape, then cutting style */}
      <Section title='Shape & Cutting Style' tone='blue'>
        <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
          {field(fields.cuttingShape)}
          {field(fields.grade)}
        </div>
        <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
          {field(fields.crownStyle)}
          {field(fields.pavilionStyle)}
        </div>
        <div className='grid grid-cols-1 gap-4 md:grid-cols-3'>
          {field(fields.cuttingGrade)}
          {field(fields.polishingGrade)}
          {field(fields.proportionGrade)}
        </div>
        {field(fields.isMixCut)}
      </Section>

      {/* 6. Dimensions, always to 2 decimals */}
      <Section title='Dimensions (mm)' tone='blue'>
        <div className='grid grid-cols-3 gap-4'>
          {field(fields.messurementX)}
          {field(fields.messurementY)}
          {field(fields.messurementZ)}
        </div>
      </Section>

      {/* 7–9. R.I. as a range, then the two single readings */}
      <Section title='Optical & Physical Properties' tone='blue'>
        <div className='grid grid-cols-2 gap-4'>
          {field(fields.riMin)}
          {field(fields.riMax)}
        </div>
        <div className='grid grid-cols-2 gap-4'>
          {field(fields.sg)}
          {field(fields.hardness)}
        </div>
      </Section>

      {/* 10. Spectrum. 11 (Inclusions) is future development — camera capture and
          per-GRC photos land here when they are built. */}
      <Section title='Spectrum'>{field(fields.spectroscopy)}</Section>

      {/* 12–13. Transparency and clarity */}
      <Section title='Transparency & Clarity' tone='amber'>
        {field(fields.transparency)}
        {field(fields.clarityGrade)}
        {field(fields.clarityEnhancement)}
        {field(fields.isEmerald)}
      </Section>

      {/* 14–16. Identification */}
      <Section title='Identification'>
        <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
          {field(fields.species)}
          {field(fields.selectedVariety)}
        </div>
        {field(fields.origin)}
      </Section>

      {/* 17. Comments */}
      <Section title='Comments'>
        {field(fields.comments)}
        {field(fields.specialNote)}
      </Section>

      {/* 18. Treatments — the written note, the heat flags it summarises, and the
          full checklist those three qualify. */}
      <Section title='Treatments' tone='amber'>
        {field(fields.treatment)}
        <div className='flex flex-wrap items-center gap-6'>
          {field(fields.isHeated)}
          {field(fields.showHeatInReport)}
        </div>
        <TreatmentChecklist control={control} disabled={disabled} />
      </Section>

      {/* The lab's closing assessment of the stone. */}
      <Section title='Overall Assessment'>{field(fields.finalGrade)}</Section>
    </fieldset>
  )
}
