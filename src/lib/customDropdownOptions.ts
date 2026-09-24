const STORAGE_KEY = "gem_tracker_custom_options"

/**
 * The free-text fields that remember what gets typed into them. Species and variety are
 * also backed by the lab-wide list the API returns; this store is what makes a name
 * typed a moment ago suggestable before it has been saved and fetched back.
 */
export type CustomDropdownField =
  | "cuttingShape"
  | "crownStyle"
  | "pavilionStyle"
  | "colour"
  | "species"
  | "variety"

interface StoredOption {
  value: string
  label: string
}

type AllCustomOptions = Record<CustomDropdownField, StoredOption[]>

function empty(): AllCustomOptions {
  return {
    cuttingShape: [],
    crownStyle: [],
    pavilionStyle: [],
    colour: [],
    species: [],
    variety: [],
  }
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

/** Just the values for one field, which is all any dropdown actually needs. */
export function getCustomValues(field: CustomDropdownField): string[] {
  return getCustomOptions()[field].map((o) => o.value)
}

export function addCustomOption(field: CustomDropdownField, value: string): void {
  const trimmed = value.trim()
  if (!trimmed) return
  const all = getCustomOptions()
  if (all[field].some((o) => o.value.toLowerCase() === trimmed.toLowerCase())) return
  all[field].push({ value: trimmed, label: trimmed })
  localStorage.setItem(STORAGE_KEY, JSON.stringify(all))
}
