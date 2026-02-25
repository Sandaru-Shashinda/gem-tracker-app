import { type ReactNode } from "react"
import { type UseFormRegister, type FieldErrors, Controller, type Control } from "react-hook-form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Star } from "lucide-react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { type TestFormValues } from "@/lib/validations/test"

export type FieldType = "text" | "number" | "textarea" | "select" | "custom-search" | "rating"

export interface SelectOption {
  value: string
  label: string
}

export interface FieldConfig {
  name: keyof TestFormValues
  label: string
  type: FieldType
  placeholder?: string
  step?: string
  options?: SelectOption[]
  className?: string
  rows?: number
  // For custom search fields
  searchValue?: string
  onSearchChange?: (value: string) => void
  onFocus?: () => void
  filteredItems?: any[]
  showList?: boolean
  onItemSelect?: (item: any) => void
  onCloseList?: () => void
  renderItem?: (item: any) => ReactNode
}

interface FormFieldProps {
  config: FieldConfig
  register: UseFormRegister<TestFormValues>
  errors: FieldErrors<TestFormValues>
  control?: Control<TestFormValues>
  setValue?: (name: keyof TestFormValues, value: any) => void
}

export function FormField({ config, register, errors, control, setValue }: FormFieldProps) {
  const {
    name,
    label,
    type,
    placeholder,
    step,
    options,
    className,
    rows,
    searchValue,
    onSearchChange,
    onFocus,
    filteredItems,
    showList,
    onItemSelect,
    onCloseList,
    renderItem,
  } = config

  const error = errors[name]

  return (
    <div className={`space-y-1.5 ${type === "custom-search" ? "relative" : ""} ${className || ""}`}>
      <label className='text-xs font-bold text-slate-500 uppercase'>{label}</label>

      {type === "text" && <Input placeholder={placeholder} {...register(name)} />}

      {type === "number" && (
        <Input type='number' step={step} placeholder={placeholder} {...register(name)} />
      )}

      {type === "textarea" && (
        <Textarea
          placeholder={placeholder}
          {...register(name)}
          className={`min-h-[${rows || 60}px]`}
        />
      )}

      {type === "select" && control && (
        <Controller
          name={name}
          control={control}
          render={({ field }) => (
            <Select value={field.value as string} onValueChange={field.onChange}>
              <SelectTrigger className='w-full bg-white'>
                <SelectValue placeholder={placeholder || "Select..."} />
              </SelectTrigger>
              <SelectContent>
                {options?.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
      )}

      {type === "custom-search" && setValue && (
        <>
          <Input
            placeholder={placeholder}
            value={searchValue}
            onChange={(e) => {
              onSearchChange?.(e.target.value)
              setValue(name, e.target.value)
            }}
            onFocus={onFocus}
          />
          {showList && filteredItems && filteredItems.length > 0 && (
            <div className='absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-xl max-h-48 overflow-y-auto overflow-x-hidden'>
              {filteredItems.map((item, i) => (
                <button
                  key={i}
                  type='button'
                  className='w-full text-left px-3 py-2 text-sm hover:bg-blue-50 hover:text-blue-700 transition-colors border-b last:border-0 border-slate-100'
                  onClick={() => onItemSelect?.(item)}
                >
                  {renderItem ? renderItem(item) : item}
                </button>
              ))}
            </div>
          )}
          {showList && <div className='fixed inset-0 z-40' onClick={onCloseList}></div>}
        </>
      )}

      {type === "rating" && control && (
        <Controller
          name={name}
          control={control}
          render={({ field }) => (
            <div className='flex gap-1.5 pt-1'>
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className={`w-6 h-6 cursor-pointer transition-colors ${
                    star <= ((field.value as number) || 0)
                      ? "fill-yellow-400 text-yellow-400"
                      : "text-slate-200 hover:text-slate-300"
                  }`}
                  onClick={() => field.onChange(star)}
                />
              ))}
            </div>
          )}
        />
      )}

      {error && <p className='text-[10px] text-red-500 font-bold'>{error.message as string}</p>}
    </div>
  )
}
