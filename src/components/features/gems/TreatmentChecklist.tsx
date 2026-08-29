import { Controller, type Control } from "react-hook-form"
import { FlaskConical } from "lucide-react"
import { Checkbox } from "@/components/ui/checkbox"
import { type TestFormValues } from "@/lib/validations/test"
import {
  TREATMENT_ANSWERS,
  TREATMENT_SECTIONS,
  type TreatmentAnswer,
  type TreatmentKey,
} from "@/lib/treatments"

interface TreatmentChecklistProps {
  control: Control<TestFormValues>
}

/**
 * The Yes/No treatment checklist, grouped into the three assessment categories.
 *
 * Neither box ticked means the treatment was not assessed — that is the initial state
 * and it stays reachable, because clicking the ticked box clears the answer again. The
 * large report distinguishes the three states, so the form has to be able to produce
 * all three.
 */
export function TreatmentChecklist({ control }: TreatmentChecklistProps) {
  return (
    <div className='bg-purple-50/20 p-4 rounded-xl border border-purple-100/50 shadow-sm space-y-4'>
      <h4 className='text-[11px] font-black uppercase text-purple-600 tracking-widest border-b border-purple-100 pb-2 flex items-center gap-2'>
        <FlaskConical size={13} /> Treatment Analysis
      </h4>

      <div className='grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-5'>
        {TREATMENT_SECTIONS.map((section) => (
          <div key={section.title} className='space-y-2'>
            <p className='text-[9px] font-bold text-purple-400 uppercase tracking-wider'>
              {section.title}
            </p>
            <div className='space-y-1'>
              {section.items.map((item) => (
                <TreatmentRow key={item.key} name={item.key} label={item.label} control={control} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function TreatmentRow({
  name,
  label,
  control,
}: {
  name: TreatmentKey
  label: string
  control: Control<TestFormValues>
}) {
  return (
    <Controller
      name={`treatments.${name}` as const}
      control={control}
      render={({ field }) => {
        const value = (field.value as TreatmentAnswer) || ""
        return (
          <div className='flex items-center justify-between gap-2 bg-white/70 rounded-md border border-slate-100 px-2 py-1'>
            <span className='text-[11px] text-slate-700 font-medium leading-tight'>{label}</span>
            <div className='flex items-center gap-2.5 shrink-0'>
              {TREATMENT_ANSWERS.map((answer) => (
                <label
                  key={answer}
                  className='flex items-center gap-1 cursor-pointer select-none'
                  title={`${label}: ${answer}`}
                >
                  <Checkbox
                    className='h-3.5 w-3.5'
                    checked={value === answer}
                    // Ticking the already-ticked box clears the answer back to
                    // "not assessed" rather than leaving it stuck.
                    onCheckedChange={() => field.onChange(value === answer ? "" : answer)}
                  />
                  <span
                    className={`text-[10px] font-bold uppercase ${
                      value === answer ? "text-purple-700" : "text-slate-400"
                    }`}
                  >
                    {answer}
                  </span>
                </label>
              ))}
            </div>
          </div>
        )
      }}
    />
  )
}
