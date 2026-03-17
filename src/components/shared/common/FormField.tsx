import { type ReactNode } from "react"
import { type UseFormRegister, type FieldErrors, Controller, type Control } from "react-hook-form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Star } from "lucide-react"
import { type TestFormValues } from "@/lib/validations/test"

export type FieldType = "text" | "number" | "textarea" | "select" | "custom-search" | "combobox" | "rating" | "checkbox"

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
  // For combobox fields (static options + free typing)
  comboboxOptions?: SelectOption[]
  comboboxSearch?: string
  onComboboxSearchChange?: (value: string) => void
  showComboboxList?: boolean
  onComboboxFocus?: () => void
  onComboboxClose?: () => void
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
    comboboxOptions,
    comboboxSearch,
    onComboboxSearchChange,
    showComboboxList,
    onComboboxFocus,
    onComboboxClose,
  } = config

  const error = errors[name]

  return (
    <div className={`space-y-1.5 ${type === "custom-search" || type === "combobox" ? "relative" : ""} ${className || ""}`}>
      {type !== "checkbox" && <label className='text-xs font-bold text-slate-500 uppercase'>{label}</label>}

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

      {/* 
        IMPORTANT: We use a styled native <select> here instead of Radix UI's <Select>.
        
        Reason: Radix UI Select v2 + React 19 + react-hook-form reset() have a known
        incompatibility — when reset() programmatically sets a value, the <SelectValue>
        trigger text doesn't update because Radix only captures the display text map
        during the initial render of <SelectContent>. This causes the select to appear
        blank even though field.value is correct.
        
        A native <select> always displays the correct option directly via the DOM's
        `value` attribute — no timing or re-render issues.
      */}
      {type === "select" && control && (
        <Controller
          name={name}
          control={control}
          render={({ field }) => {
            const currentValue = (field.value as string) || ""
            const hasMatchingOption = currentValue
              ? options?.some((opt) => opt.value === currentValue)
              : true

            // If saved value is not in options (legacy/manual), add it temporarily
            const augmentedOptions =
              currentValue && !hasMatchingOption
                ? [{ value: currentValue, label: currentValue }, ...(options || [])]
                : options || []

            return (
              <div className='relative'>
                <select
                  value={currentValue}
                  onChange={(e) => field.onChange(e.target.value)}
                  onBlur={field.onBlur}
                  className={`
                    w-full h-8 pl-3 pr-8 text-xs rounded-md border border-slate-200
                    bg-white text-slate-900 shadow-sm
                    focus:outline-none focus:ring-1 focus:ring-slate-950
                    appearance-none cursor-pointer
                    ${!currentValue ? "text-slate-500" : "text-slate-900"}
                  `}
                >
                  <option value='' disabled hidden>
                    {placeholder || "Select..."}
                  </option>
                  {augmentedOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                {/* Custom chevron arrow */}
                <div className='pointer-events-none absolute inset-y-0 right-2 flex items-center'>
                  <svg
                    className='h-3 w-3 text-slate-400'
                    xmlns='http://www.w3.org/2000/svg'
                    viewBox='0 0 20 20'
                    fill='currentColor'
                  >
                    <path
                      fillRule='evenodd'
                      d='M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z'
                      clipRule='evenodd'
                    />
                  </svg>
                </div>
              </div>
            )
          }}
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

      {type === "combobox" && setValue && (
        <>
          <Input
            placeholder={placeholder}
            value={comboboxSearch ?? ""}
            onChange={(e) => {
              onComboboxSearchChange?.(e.target.value)
              setValue(name, e.target.value)
            }}
            onFocus={onComboboxFocus}
          />
          {showComboboxList && (
            <>
              {(() => {
                const filtered = (comboboxOptions || []).filter((opt) =>
                  opt.label.toLowerCase().includes((comboboxSearch || "").toLowerCase())
                )
                return filtered.length > 0 ? (
                  <div className='absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-xl max-h-48 overflow-y-auto overflow-x-hidden'>
                    {filtered.map((opt) => (
                      <button
                        key={opt.value}
                        type='button'
                        className='w-full text-left px-3 py-2 text-sm hover:bg-blue-50 hover:text-blue-700 transition-colors border-b last:border-0 border-slate-100'
                        onClick={() => {
                          setValue(name, opt.value)
                          onComboboxSearchChange?.(opt.label)
                          onComboboxClose?.()
                        }}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                ) : null
              })()}
              <div className='fixed inset-0 z-40' onClick={onComboboxClose}></div>
            </>
          )}
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

      {type === "checkbox" && control && (
        <Controller
          name={name}
          control={control}
          render={({ field }) => (
            <div className='flex items-center gap-2 pt-1'>
              <Checkbox
                checked={field.value as boolean}
                onCheckedChange={field.onChange}
              />
              <label className='text-sm text-slate-700 font-medium leading-none cursor-pointer' onClick={() => field.onChange(!field.value)}>
                {placeholder || label}
              </label>
            </div>
          )}
        />
      )}

      {error && <p className='text-[10px] text-red-500 font-bold'>{error.message as string}</p>}
    </div>
  )
}
