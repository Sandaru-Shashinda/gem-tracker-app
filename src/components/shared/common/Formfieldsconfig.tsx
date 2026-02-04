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
}: FormFieldsConfigParams) {
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
      name: "shape",
      label: "Shape",
      type: "text",
      placeholder: "e.g. Oval Cabochon",
      className: "",
    },
    {
      name: "cut",
      label: "Cut",
      type: "text",
      placeholder: "e.g. Cabochon Cut",
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
      type: "select",
      placeholder: "Select Grade",
      options: GRADE_OPTIONS,
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
