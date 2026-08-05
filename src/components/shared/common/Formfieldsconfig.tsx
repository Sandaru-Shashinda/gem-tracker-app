import { type FieldConfig } from "@/components/shared/common/FormField"
import { getCustomOptions } from "@/lib/customDropdownOptions"

export const GRADE_OPTIONS = [
  { value: "Ex", label: "Excellent" },
  { value: "Fine", label: "Fine" },
  { value: "Good", label: "Good" },
  { value: "Fair", label: "Fair" },
  { value: "Poor", label: "Poor" },
]

export const SIMPLE_GRADE_OPTIONS = [
  { value: "Ex", label: "Excellent" },
  { value: "Fine", label: "Fine" },
  { value: "Good", label: "Good" },
  { value: "Fair", label: "Fair" },
  { value: "Poor", label: "Poor" },
]

export const CLARITY_OTHER_OPTIONS = [
  { value: "Exc", label: "Exc (Excellent)" },
  { value: "LC 1", label: "LC 1" },
  { value: "LC 2", label: "LC 2" },
  { value: "EC 1", label: "EC 1" },
  { value: "EC 2", label: "EC 2" },
  { value: "VI 1", label: "VI 1" },
  { value: "VI 2", label: "VI 2" },
  { value: "HI 1", label: "HI 1" },
  { value: "HI 2", label: "HI 2" },
]

export const CLARITY_EMERALD_OPTIONS = [
  { value: "LC", label: "LC (Loop Clean)" },
  { value: "EC", label: "EC (Eye Clean)" },
  { value: "SI", label: "SI (Slightly Included)" },
  { value: "MI", label: "MI (Moderately Included)" },
  { value: "HI", label: "HI (Highly Included)" },
]

export const CLARITY_ENHANCEMENT_OPTIONS = [
  { value: "None", label: "None (No Significant Clarity Enhancement)" },
  { value: "E 1", label: "E 1 (Minor Clarity Enhancement)" },
  { value: "E 2", label: "E 2 (Moderate Clarity Enhancement)" },
  { value: "E 3", label: "E 3 (Significant Clarity Enhancement)" },
]

export const CUTTING_STYLE_OPTIONS = [
  { value: "Brilliant cut", label: "Brilliant cut" },
  { value: "Princess cut", label: "Princess cut" },
  { value: "Step cut", label: "Step cut" },
  { value: "Asscher cut", label: "Asscher cut" },
  { value: "Fancy cut", label: "Fancy cut" },
  { value: "Flower cut", label: "Flower cut" },
  { value: "Scissor cut", label: "Scissor cut" },
  { value: "Rose cut", label: "Rose cut" },
  { value: "Radiant cut", label: "Radiant cut" },
  { value: "French cut", label: "French cut" },
  { value: "Single cabochon", label: "Single cabochon" },
  { value: "Double cabochon", label: "Double cabochon" },
  { value: "None", label: "None" },
]

export const CUTTING_SHAPE_OPTIONS = [
  { value: "Round", label: "Round" },
  { value: "Oval", label: "Oval" },
  { value: "Rectangle", label: "Rectangle" },
  { value: "Square", label: "Square" },
  { value: "Triangle", label: "Triangle" },
  { value: "Hexagon", label: "Hexagon" },
  { value: "Pentagon", label: "Pentagon" },
  { value: "Rectangular octagon", label: "Rectangular octagon" },
  { value: "Square octagon", label: "Square octagon" },
  { value: "Rectangular cushion", label: "Rectangular cushion" },
  { value: "Square cushion", label: "Square cushion" },
  { value: "Pear", label: "Pear" },
  { value: "Heart", label: "Heart" },
  { value: "Drop", label: "Drop" },
  { value: "Briolette", label: "Briolette" },
  { value: "Ball", label: "Ball" },
  { value: "Maquise (Navette)", label: "Maquise (Navette)" },
  { value: "Baguette", label: "Baguette" },
  { value: "Tapered baguette", label: "Tapered baguette" },
  { value: "Lozenge", label: "Lozenge" },
  { value: "Trillion", label: "Trillion" },
  { value: "Trapeze", label: "Trapeze" },
  { value: "Freeform", label: "Freeform" },
  { value: "None", label: "None" },
]

const RUBY_COLORS = [
  { value: "Medium intense red (Hot Pink)", label: "Medium intense red (Hot Pink)" },
  { value: "Intense red", label: "Intense red" },
  { value: "Vivid red (Pigeon blood red)", label: "Vivid red (Pigeon blood red)" },
  { value: "Deep red (Royal red)", label: "Deep red (Royal red)" },
  { value: "Dark red", label: "Dark red" },
]

const EMERALD_COLORS = [
  { value: "Light green", label: "Light green" },
  { value: "Medium green", label: "Medium green" },
  { value: "Intense green", label: "Intense green" },
  { value: "Vivid green", label: "Vivid green" },
  { value: "Vibrant green", label: "Vibrant green" },
  { value: "Deep green", label: "Deep green" },
  { value: "Dark green", label: "Dark green" },
]

const SAPPHIRE_COLORS = [
  { value: "Light blue", label: "Light blue" },
  { value: "Intense blue", label: "Intense blue" },
  { value: "Vivid Blue", label: "Vivid Blue" },
  { value: "Cornflower blue", label: "Cornflower blue" },
  { value: "Royal blue", label: "Royal blue" },
  { value: "Deep blue", label: "Deep blue" },
  { value: "Dark blue", label: "Dark blue" },
]

const OTHER_COLORS = [
  { value: "Light", label: "Light" },
  { value: "Intense", label: "Intense" },
  { value: "Medium", label: "Medium" },
  { value: "Vivid", label: "Vivid" },
  { value: "Deep", label: "Deep" },
  { value: "Dark", label: "Dark" },
]

interface FormFieldsConfigParams {
  speciesSearch: string
  setSpeciesSearch: (value: string) => void
  showSpeciesList: boolean
  setShowSpeciesList: (value: boolean) => void
  filteredSpecies: string[]
  varietySearch: string
  setVarietySearch: (value: string) => void
  showVarietyList: boolean
  setShowVarietyList: (value: boolean) => void
  filteredVarieties: any[]
  setValue: (name: any, value: any) => void
  watchedSpecies?: string
  watchedVariety?: string
  // Combobox states for Crown Style
  crownStyleSearch: string
  setCrownStyleSearch: (value: string) => void
  showCrownStyleList: boolean
  setShowCrownStyleList: (value: boolean) => void
  // Combobox states for Pavilion Style
  pavilionStyleSearch: string
  setPavilionStyleSearch: (value: string) => void
  showPavilionStyleList: boolean
  setShowPavilionStyleList: (value: boolean) => void
  // Combobox states for Cutting Shape
  cuttingShapeSearch: string
  setCuttingShapeSearch: (value: string) => void
  showCuttingShapeList: boolean
  setShowCuttingShapeList: (value: boolean) => void
  // Combobox states for Colour
  colourSearch: string
  setColourSearch: (value: string) => void
  showColourList: boolean
  setShowColourList: (value: boolean) => void
  // Custom option callbacks
  onAddCuttingShapeOption?: (value: string) => void
  onAddCrownStyleOption?: (value: string) => void
  onAddPavilionStyleOption?: (value: string) => void
  onAddColourOption?: (value: string) => void
}

export function getFormFieldsConfig({
  speciesSearch,
  setSpeciesSearch,
  showSpeciesList,
  setShowSpeciesList,
  filteredSpecies,
  varietySearch,
  setVarietySearch,
  showVarietyList,
  setShowVarietyList,
  filteredVarieties,
  setValue,
  watchedSpecies,
  watchedVariety,
  crownStyleSearch,
  setCrownStyleSearch,
  showCrownStyleList,
  setShowCrownStyleList,
  pavilionStyleSearch,
  setPavilionStyleSearch,
  showPavilionStyleList,
  setShowPavilionStyleList,
  cuttingShapeSearch,
  setCuttingShapeSearch,
  showCuttingShapeList,
  setShowCuttingShapeList,
  colourSearch,
  setColourSearch,
  showColourList,
  setShowColourList,
  onAddCuttingShapeOption,
  onAddCrownStyleOption,
  onAddPavilionStyleOption,
  onAddColourOption,
}: FormFieldsConfigParams) {
  const customOpts = getCustomOptions()

  function mergeCustom<T extends { value: string }>(base: T[], custom: T[]): T[] {
    const baseKeys = new Set(base.map((o) => o.value.toLowerCase()))
    return [...base, ...custom.filter((o) => !baseKeys.has(o.value.toLowerCase()))]
  }

  const allCuttingShapeOptions = mergeCustom(CUTTING_SHAPE_OPTIONS, customOpts.cuttingShape as typeof CUTTING_SHAPE_OPTIONS)
  const allCrownStyleOptions = mergeCustom(CUTTING_STYLE_OPTIONS, customOpts.crownStyle as typeof CUTTING_STYLE_OPTIONS)
  const allPavilionStyleOptions = mergeCustom(CUTTING_STYLE_OPTIONS, customOpts.pavilionStyle as typeof CUTTING_STYLE_OPTIONS)
  let colorOptions = OTHER_COLORS
  let clarityOptions = CLARITY_OTHER_OPTIONS

  // Apply species-based defaults if any (like Emerald clarity)
  if (watchedSpecies) {
    const lowerSpecies = watchedSpecies.toLowerCase()
    if (lowerSpecies.includes("emerald")) {
      clarityOptions = CLARITY_EMERALD_OPTIONS
    }
  }

  // Override options based on Variety (Priority)
  if (watchedVariety) {
    const lowerVariety = watchedVariety.toLowerCase()
    if (lowerVariety.includes("ruby")) {
      colorOptions = RUBY_COLORS
    } else if (lowerVariety.includes("emerald")) {
      colorOptions = EMERALD_COLORS
      clarityOptions = CLARITY_EMERALD_OPTIONS // Emerald variety always uses emerald clarity
    } else if (lowerVariety.includes("sapphire") && lowerVariety.includes("blue")) {
      colorOptions = SAPPHIRE_COLORS
    }
  } else if (watchedSpecies) {
    // Fallback to species if variety not selected
    const lowerSpecies = watchedSpecies.toLowerCase()
    if (lowerSpecies.includes("ruby")) {
      colorOptions = RUBY_COLORS
    } else if (lowerSpecies.includes("emerald")) {
      colorOptions = EMERALD_COLORS
    } else if (lowerSpecies.includes("sapphire") && lowerSpecies.includes("blue")) {
      colorOptions = SAPPHIRE_COLORS
    }
  }

  const allColourOptions = mergeCustom(colorOptions, customOpts.colour as typeof colorOptions)

  const scientificFields: FieldConfig[] = [
    {
      name: "riMin",
      label: "Min R.I.",
      type: "number",
      step: "0.001",
      placeholder: "e.g. 1.62",
      className: "",
    },
    {
      name: "riMax",
      label: "Max R.I.",
      type: "number",
      step: "0.001",
      placeholder: "e.g. 1.70",
      className: "",
    },
    {
      name: "sg",
      label: "S.G.",
      type: "number",
      step: "0.01",
      placeholder: "e.g. 2.66",
      className: "",
    },
    {
      name: "hardnessMin",
      label: "Min Hardness",
      type: "number",
      step: "0.01",
      placeholder: "e.g. 7.0",
      className: "",
    },
    {
      name: "hardnessMax",
      label: "Max Hardness",
      type: "number",
      step: "0.01",
      placeholder: "e.g. 7.5",
      className: "",
    },
    {
      name: "cuttingShape",
      label: "Cutting Shape",
      type: "combobox",
      placeholder: "e.g. Round",
      comboboxOptions: allCuttingShapeOptions,
      comboboxSearch: cuttingShapeSearch,
      onComboboxSearchChange: (value) => {
        setCuttingShapeSearch(value)
        setShowCuttingShapeList(true)
      },
      onComboboxFocus: () => setShowCuttingShapeList(true),
      showComboboxList: showCuttingShapeList,
      onComboboxClose: () => setShowCuttingShapeList(false),
      onAddCustomOption: onAddCuttingShapeOption,
      className: "",
    },
    {
      name: "isMixCut",
      label: "Is Mix Cut",
      type: "checkbox",
      className: "",
    },
    {
      name: "crownStyle",
      label: "Crown Style",
      type: "combobox",
      placeholder: "e.g. Brilliant cut",
      comboboxOptions: allCrownStyleOptions,
      comboboxSearch: crownStyleSearch,
      onComboboxSearchChange: (value) => {
        setCrownStyleSearch(value)
        setShowCrownStyleList(true)
      },
      onComboboxFocus: () => setShowCrownStyleList(true),
      showComboboxList: showCrownStyleList,
      onComboboxClose: () => setShowCrownStyleList(false),
      onAddCustomOption: onAddCrownStyleOption,
      className: "",
    },
    {
      name: "pavilionStyle",
      label: "Pavilion Style",
      type: "combobox",
      placeholder: "e.g. Step cut",
      comboboxOptions: allPavilionStyleOptions,
      comboboxSearch: pavilionStyleSearch,
      onComboboxSearchChange: (value) => {
        setPavilionStyleSearch(value)
        setShowPavilionStyleList(true)
      },
      onComboboxFocus: () => setShowPavilionStyleList(true),
      showComboboxList: showPavilionStyleList,
      onComboboxClose: () => setShowPavilionStyleList(false),
      onAddCustomOption: onAddPavilionStyleOption,
      className: "",
    },
    {
      name: "transparency",
      label: "Transparency",
      type: "text",
      placeholder: "e.g. Transparent",
      className: "",
    },
    {
      name: "messurementX",
      label: "Measurement X (Length)",
      type: "number",
      step: "0.01",
      placeholder: "L",
      className: "",
    },
    {
      name: "messurementY",
      label: "Measurement Y (Width)",
      type: "number",
      step: "0.01",
      placeholder: "W",
      className: "",
    },
    {
      name: "messurementZ",
      label: "Measurement Z (Height)",
      type: "number",
      step: "0.01",
      placeholder: "H",
      className: "",
    },
  ]

  const identificationFields: FieldConfig[] = [
    {
      name: "species",
      label: "Species",
      type: "custom-search",
      placeholder: "Type to search species...",
      searchValue: speciesSearch,
      onSearchChange: (value) => {
        setSpeciesSearch(value)
        setShowSpeciesList(true)
      },
      onFocus: () => setShowSpeciesList(true),
      filteredItems: filteredSpecies,
      showList: showSpeciesList,
      onItemSelect: (species) => {
        setValue("species", species)
        setSpeciesSearch(species)
        setShowSpeciesList(false)
      },
      onCloseList: () => setShowSpeciesList(false),
      renderItem: (species) => species,
    },
    {
      name: "selectedVariety",
      label: "Variety",
      type: "custom-search",
      placeholder: "Type to search variety...",
      searchValue: varietySearch,
      onSearchChange: (value) => {
        setVarietySearch(value)
        setShowVarietyList(true)
      },
      onFocus: () => setShowVarietyList(true),
      filteredItems: filteredVarieties,
      showList: showVarietyList,
      onItemSelect: (reference) => {
        setValue("selectedVariety", reference.variety)
        setVarietySearch(reference.variety)
        setShowVarietyList(false)
      },
      onCloseList: () => setShowVarietyList(false),
      renderItem: (reference) => reference.variety,
    },
    {
      name: "isEmerald",
      label: "Is Emerald",
      type: "checkbox",
      className: "",
    },
    {
      name: "spectroscopy",
      label: "Spectroscopy",
      type: "textarea",
      placeholder: "Spectroscopy details",
      className: "",
      rows: 3,
    },
    {
      name: "origin",
      label: "Origin",
      type: "text",
      placeholder: "Colombia",
      className: "",
    },
  ]

  const gradingFields: FieldConfig[] = [
    {
      name: "colour",
      label: "Colour",
      type: "combobox",
      placeholder: "Select or type colour...",
      comboboxOptions: allColourOptions,
      comboboxSearch: colourSearch,
      onComboboxSearchChange: (value) => {
        setColourSearch(value)
        setShowColourList(true)
      },
      onComboboxFocus: () => setShowColourList(true),
      showComboboxList: showColourList,
      onComboboxClose: () => setShowColourList(false),
      onAddCustomOption: onAddColourOption,
      className: "",
    },
    {
      name: "colourGrade",
      label: "Colour Grade",
      type: "rating",
      className: "",
    },
    {
      name: "grade",
      label: "Grade",
      type: "select",
      placeholder: "Select Grade",
      options: GRADE_OPTIONS,
      className: "",
    },
    {
      name: "cuttingGrade",
      label: "Cutting",
      type: "rating",
      className: "",
    },
    {
      name: "polishingGrade",
      label: "Polishing",
      type: "select",
      placeholder: "Grade",
      options: SIMPLE_GRADE_OPTIONS,
      className: "",
    },
    {
      name: "proportionGrade",
      label: "Proportion",
      type: "select",
      placeholder: "Grade",
      options: SIMPLE_GRADE_OPTIONS,
      className: "",
    },
    {
      name: "clarityGrade",
      label: "Clarity Grade",
      type: "select",
      placeholder: "Select Clarity",
      options: clarityOptions,
      className: "",
    },
    {
      name: "clarityEnhancement",
      label: "Clarity Enhancement",
      type: "select",
      placeholder: "Select Enhancement",
      options: CLARITY_ENHANCEMENT_OPTIONS,
      className: "",
    },
    {
      name: "isHeated",
      label: "Is Heated",
      type: "checkbox",
      className: "",
    },
    {
      name: "showHeatInReport",
      label: "Show Heat In Report",
      type: "checkbox",
      className: "",
    },
    {
      name: "finalGrade",
      label: "Final Grade",
      type: "rating",
      className: "",
    },
  ]

  const textFields: FieldConfig[] = [
    {
      name: "comments",
      label: "Comments",
      type: "textarea",
      placeholder: "Laboratory comments...",
      rows: 4,
    },
    {
      name: "itemDescription",
      label: "Item Description",
      type: "textarea",
      placeholder: "Detailed item description...",
      rows: 4,
    },
    {
      name: "specialNote",
      label: "Special Note",
      type: "textarea",
      placeholder: "Special internal notes...",
      rows: 4,
    },
    {
      name: "treatment",
      label: "Treatment",
      type: "textarea",
      placeholder: "Treatment details...",
      rows: 4,
    },
  ]

  return {
    scientificFields,
    identificationFields,
    gradingFields,
    textFields,
  }
}
