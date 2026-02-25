import { type FieldConfig } from "@/components/shared/common/FormField"

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
]

export const CLARITY_OPTIONS = [
  { value: "Clean", label: "Clean" },
  { value: "Fine", label: "Fine" },
  { value: "Good", label: "Good" },
  { value: "Fair", label: "Fair" },
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
}: FormFieldsConfigParams) {
  let colorOptions = OTHER_COLORS
  if (watchedSpecies) {
    const lowerSpecies = watchedSpecies.toLowerCase()
    if (lowerSpecies.includes("ruby")) {
      colorOptions = RUBY_COLORS
    } else if (lowerSpecies.includes("emerald")) {
      colorOptions = EMERALD_COLORS
    } else if (lowerSpecies.includes("sapphire") && lowerSpecies.includes("blue")) {
      colorOptions = SAPPHIRE_COLORS
    }
  }

  const scientificFields: FieldConfig[] = [
    {
      name: "ri",
      label: "R.I.",
      type: "number",
      step: "0.001",
      placeholder: "e.g. 1.66",
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
      name: "hardness",
      label: "Hardness",
      type: "number",
      step: "0.5",
      placeholder: "e.g. 7.5",
      className: "",
    },
    {
      name: "cuttingShape",
      label: "Cutting Shape",
      type: "select",
      placeholder: "e.g. Round",
      options: CUTTING_SHAPE_OPTIONS,
      className: "",
    },
    {
      name: "cuttingStyle",
      label: "Cutting Style",
      type: "select",
      placeholder: "e.g. Brilliant cut",
      options: CUTTING_STYLE_OPTIONS,
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
      label: "Measurement X",
      type: "number",
      step: "0.01",
      placeholder: "L",
      className: "",
    },
    {
      name: "messurementY",
      label: "Measurement Y",
      type: "number",
      step: "0.01",
      placeholder: "W",
      className: "",
    },
    {
      name: "messurementZ",
      label: "Measurement Z",
      type: "number",
      step: "0.01",
      placeholder: "D",
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
      name: "spectroscopy",
      label: "Spectroscopy",
      type: "textarea",
      placeholder: "Spectroscopy details",
      className: "",
      rows: 60,
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
      type: "select",
      placeholder: "Select Colour",
      options: colorOptions,
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
      label: "Clarity",
      type: "select",
      placeholder: "Grade",
      options: CLARITY_OPTIONS,
      className: "",
    },
  ]

  const textFields: FieldConfig[] = [
    {
      name: "comments",
      label: "Comments",
      type: "textarea",
      placeholder: "Laboratory comments...",
      rows: 60,
    },
    {
      name: "itemDescription",
      label: "Item Description",
      type: "textarea",
      placeholder: "Detailed item description...",
      rows: 60,
    },
    {
      name: "specialNote",
      label: "Special Note",
      type: "textarea",
      placeholder: "Special internal notes...",
      rows: 60,
    },
  ]

  return {
    scientificFields,
    identificationFields,
    gradingFields,
    textFields,
  }
}
