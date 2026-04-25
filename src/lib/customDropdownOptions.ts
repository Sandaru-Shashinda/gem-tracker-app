const STORAGE_KEY = "gem_tracker_custom_options"

export type CustomDropdownField = "cuttingShape" | "crownStyle" | "pavilionStyle" | "colour"

interface StoredOption {
  value: string
  label: string
}

interface AllCustomOptions {
  cuttingShape: StoredOption[]
  crownStyle: StoredOption[]
  pavilionStyle: StoredOption[]
  colour: StoredOption[]
}

function empty(): AllCustomOptions {
  return { cuttingShape: [], crownStyle: [], pavilionStyle: [], colour: [] }
}

export function getCustomOptions(): AllCustomOptions {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) return empty()
    return { ...empty(), ...JSON.parse(stored) }
  } catch {
    return empty()
  }
}

export function addCustomOption(field: CustomDropdownField, value: string): void {
  const trimmed = value.trim()
  if (!trimmed) return
  const all = getCustomOptions()
  if (all[field].some((o) => o.value.toLowerCase() === trimmed.toLowerCase())) return
  all[field].push({ value: trimmed, label: trimmed })
  localStorage.setItem(STORAGE_KEY, JSON.stringify(all))
}
