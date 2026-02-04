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
}

export function GemAnalysisForm({
  form,
  scientificFields,
  identificationFields,
  gradingFields,
  textFields,
}: GemAnalysisFormProps) {
  const {
    register,
    control,
    setValue,
    formState: { errors },
  } = form

  return (
    <div className='grid grid-cols-1 md:grid-cols-2 gap-8'>
      {/* Scientific Measurements Section */}
      <div className='space-y-6'>
        <h3 className='font-bold text-slate-900 flex items-center gap-2 border-b pb-2'>
          <Microscope size={18} className='text-blue-600' /> Scientific Measurements
        </h3>

        {/* R.I., S.G., Hardness */}
        <div className='grid grid-cols-2 gap-4'>
          {scientificFields.slice(0, 3).map((field) => (
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

        {/* Shape and Cut */}
        <div className='grid grid-cols-2 gap-4'>
          {scientificFields.slice(3, 5).map((field) => (
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

        {/* Transparency */}
        <FormField
          config={scientificFields[5]}
          register={register}
          errors={errors}
          control={control}
          setValue={setValue}
        />

        {/* Measurements */}
        <div className='grid grid-cols-2 gap-4'>
          {scientificFields.slice(6, 9).map((field) => (
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

      {/* Identification & Grading Section */}
      <div className='space-y-6'>
        <h3 className='font-bold text-slate-900 flex items-center gap-2 border-b pb-2'>
          <Search size={18} className='text-amber-600' /> Identification & Grading
        </h3>

        {/* Species and Variety */}
        <div className='grid grid-cols-2 gap-4'>
          {identificationFields.slice(0, 2).map((field) => (
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

        {/* Origin and Cutting Grade */}
        <div className='grid grid-cols-1 gap-4'>
          {identificationFields.slice(2, 4).map((field) => (
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

        {/* Polishing, Proportion, Clarity */}
        <div className='grid grid-cols-3 gap-3'>
          {gradingFields.map((field) => (
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
