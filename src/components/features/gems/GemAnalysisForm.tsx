import { type ReactNode } from "react"
import { Microscope, Search } from "lucide-react"
import { type UseFormReturn } from "react-hook-form"
import { FormField, type FieldConfig } from "@/components/shared/common/FormField"
import { type TestFormValues } from "@/lib/validations/test"

interface GemAnalysisFormProps {
  form: UseFormReturn<TestFormValues>
  scientificFields: FieldConfig[]
  identificationFields: FieldConfig[]
  gradingFields: FieldConfig[]
  textFields: FieldConfig[]
  /** Rendered after Color & Grade — the gem's weight is saved outside this form. */
  weightField?: ReactNode
}

export function GemAnalysisForm({
  form,
  scientificFields,
  identificationFields,
  gradingFields,
  textFields,
  weightField,
}: GemAnalysisFormProps) {
  const {
    register,
    control,
    setValue,
    formState: { errors },
  } = form

  return (
    <div className='grid grid-cols-1 md:grid-cols-2 gap-8'>
      {/* Left Column: Metrics & Cut */}
      <div className='space-y-6'>
        <h3 className='font-bold text-slate-900 flex items-center gap-2 border-b pb-2 uppercase text-xs tracking-widest'>
          <Microscope size={16} className='text-blue-600' /> Technical Data
        </h3>

        {/* RI, SG, Hardness Group */}
        <div className='bg-slate-50/30 p-3 rounded-lg border border-slate-100/50 space-y-2'>
          <div className='grid grid-cols-3 gap-3'>
            <FormField
              config={scientificFields[0]}
              register={register}
              errors={errors}
              control={control}
              setValue={setValue}
            />
            <FormField
              config={scientificFields[1]}
              register={register}
              errors={errors}
              control={control}
              setValue={setValue}
            />
            <FormField
              config={scientificFields[2]}
              register={register}
              errors={errors}
              control={control}
              setValue={setValue}
            />
          </div>
          {/* Min/Max Hardness side by side */}
          <div className='grid grid-cols-2 gap-3'>
            <FormField
              config={scientificFields[3]}
              register={register}
              errors={errors}
              control={control}
              setValue={setValue}
            />
            <FormField
              config={scientificFields[4]}
              register={register}
              errors={errors}
              control={control}
              setValue={setValue}
            />
          </div>
        </div>

        {/* CUT & STYLE SECTION (Grouped as requested) */}
        <div className='bg-blue-50/30 p-4 rounded-xl border border-blue-100/50 space-y-4 shadow-sm'>
          <div className='flex items-center justify-between border-b border-blue-100/50 pb-2'>
            <h4 className='text-[11px] font-black uppercase text-blue-600 tracking-widest'>
              Cut & Style Details
            </h4>
            <div className='flex items-center gap-2 bg-white px-2 py-1 rounded-lg border border-blue-100 shadow-sm'>
              <span className='text-[9px] font-bold text-blue-400 uppercase'>Cut Grade:</span>
              <FormField
                config={gradingFields[3]}
                register={register}
                errors={errors}
                control={control}
                setValue={setValue}
              />
            </div>
          </div>

          <div className='grid grid-cols-1 gap-4'>
            <FormField
              config={scientificFields[5]}
              register={register}
              errors={errors}
              control={control}
              setValue={setValue}
            />
            <FormField
              config={scientificFields[6]}
              register={register}
              errors={errors}
              control={control}
              setValue={setValue}
            />
            <div className='grid grid-cols-2 gap-4'>
              <FormField
                config={scientificFields[7]}
                register={register}
                errors={errors}
                control={control}
                setValue={setValue}
              />
              <FormField
                config={scientificFields[8]}
                register={register}
                errors={errors}
                control={control}
                setValue={setValue}
              />
            </div>
          </div>
        </div>

        {/* Transparency & Measurements */}
        <div className='space-y-4'>
          <FormField
            config={scientificFields[9]}
            register={register}
            errors={errors}
            control={control}
            setValue={setValue}
          />
          <div className='grid grid-cols-3 gap-4'>
            {scientificFields.slice(10, 13).map((field) => (
              <FormField
                key={field.name}
                config={field}
                register={register}
                errors={errors}
                control={control}
                setValue={setValue}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Right Column: Identification & Finish */}
      <div className='space-y-6'>
        <h3 className='font-bold text-slate-900 flex items-center gap-2 border-b pb-2 uppercase text-xs tracking-widest'>
          <Search size={16} className='text-amber-600' /> Laboratory Grading
        </h3>

        {/* Identification Block */}
        <div className='grid grid-cols-2 gap-4'>
          <FormField
            config={identificationFields[0]}
            register={register}
            errors={errors}
            control={control}
            setValue={setValue}
          />
          <FormField
            config={identificationFields[1]}
            register={register}
            errors={errors}
            control={control}
            setValue={setValue}
          />
        </div>
        <FormField
          config={identificationFields[2]}
          register={register}
          errors={errors}
          control={control}
          setValue={setValue}
        />
        <FormField
          config={identificationFields[4]}
          register={register}
          errors={errors}
          control={control}
          setValue={setValue}
        />
        <FormField
          config={identificationFields[3]}
          register={register}
          errors={errors}
          control={control}
          setValue={setValue}
        />

        {/* FINISH SECTION (Separate as requested) */}
        <div className='bg-amber-50/20 p-4 rounded-xl border border-amber-100/50 shadow-sm space-y-4'>
          <h4 className='text-[11px] font-black uppercase text-amber-600 tracking-widest border-b border-amber-100 pb-2'>
            Finish & Polish
          </h4>
          <div className='grid grid-cols-2 gap-4'>
            <FormField
              config={gradingFields[4]}
              register={register}
              errors={errors}
              control={control}
              setValue={setValue}
            />
            <FormField
              config={gradingFields[5]}
              register={register}
              errors={errors}
              control={control}
              setValue={setValue}
            />
          </div>
        </div>

        {/* Color & Clarity */}
        <div className='bg-amber-50/20 p-4 rounded-xl border border-amber-100/50 shadow-sm space-y-4'>
          <h4 className='text-[11px] font-black uppercase text-amber-600 tracking-widest border-b border-amber-100 pb-2'>
            Color & Grade
          </h4>
          <div className='grid grid-cols-2 gap-4'>
            <FormField
              config={gradingFields[0]}
              register={register}
              errors={errors}
              control={control}
              setValue={setValue}
            />
            <FormField
              config={gradingFields[1]}
              register={register}
              errors={errors}
              control={control}
              setValue={setValue}
            />
          </div>
        </div>

        {weightField}

        <div className='grid grid-cols-2 gap-4 pt-4'>
          <FormField
            config={gradingFields[6]}
            register={register}
            errors={errors}
            control={control}
            setValue={setValue}
          />
          <FormField
            config={gradingFields[7]}
            register={register}
            errors={errors}
            control={control}
            setValue={setValue}
          />
        </div>

        {/* Heat */}
        <div className='flex items-center gap-6 p-4 rounded-xl border border-slate-100/50 bg-slate-50/30'>
          <FormField
            config={gradingFields[8]}
            register={register}
            errors={errors}
            control={control}
            setValue={setValue}
          />
          <FormField
            config={gradingFields[9]}
            register={register}
            errors={errors}
            control={control}
            setValue={setValue}
          />
        </div>

        {/* Overall Lab Assessment */}
        <div className='p-4 rounded-xl shadow-lg'>
          <FormField
            config={gradingFields[10]}
            register={register}
            errors={errors}
            control={control}
            setValue={setValue}
          />
        </div>

        {/* Text Fields */}
        <div className='space-y-4'>
          {textFields.map((field) => (
            <FormField
              key={field.name}
              config={field}
              register={register}
              errors={errors}
              control={control}
              setValue={setValue}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
