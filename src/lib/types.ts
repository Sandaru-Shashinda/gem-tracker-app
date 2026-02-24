export type UserRole = "ADMIN" | "HELPER" | "TESTER"

export interface User {
  id: string
  name: string
  role: UserRole
  avatar: string
  age?: number
  dob?: string
  idNumber?: string
  address?: string
  email?: string
  phoneNumber?: string
  isDeleted?: boolean
}

export interface Customer {
  _id: string
  customerName: string
  companyName: string
  email: string
  logo?: string
  phoneNumber?: string
  address?: string
  isDeleted?: boolean
}

export const GEM_STATUSES = {
  DRAFT_INTAKE: "DRAFT_INTAKE",
  TOOK_IN: "TOOK_IN",
  DRAFT_TEST_1: "DRAFT_TEST_1",
  READY_FOR_T1: "READY_FOR_T1",
  DRAFT_TEST_2: "DRAFT_TEST_2",
  READY_FOR_T2: "READY_FOR_T2",
  READY_FOR_APPROVAL: "READY_FOR_APPROVAL",
  DRAFT_APPROVAL: "DRAFT_APPROVAL",
  SUBMITTED_FOR_REPORT: "SUBMITTED_FOR_REPORT",
  REQUEST_CHANGES: "REQUEST_CHANGES",
  DONE: "DONE",
}

export type GemStatus = (typeof GEM_STATUSES)[keyof typeof GEM_STATUSES]

export interface ObservationData {
  grade?: string
  shape?: string
  cut?: string
  transparency?: string
  messurementX?: number
  messurementY?: number
  messurementZ?: number
  species?: string
  variety?: string
  spectroscopy?: string
  origin?: string
  cuttingGrade?: string
  polishingGrade?: string
  proportionGrade?: string
  clarityGrade?: string
  comments?: string
  itemDescription?: string
  specialNote?: string
}

export interface Gem {
  _id: string
  gemId: string // GRC Number
  status: GemStatus
  updatedAt: string

  // Base Data
  color?: string
  weight?: number
  shape?: string
  cut?: string
  itemDescription?: string
  imageUrl?: string // Backwards compatibility or generated on frontend
  images?: string[] // Array of image IDs for separate fetching
  customerId?: string
  currentAssignee?: string
  assignedTester1?: string
  assignedTester2?: string

  intake: {
    helperId?: string
    timestamp?: Date
  }

  test1: {
    ri?: number
    sg?: number
    hardness?: number
    observations?: ObservationData
    selectedVariety?: string
    notes?: string
    testerId?: string
    timestamp?: Date
    correctionRequested?: boolean
    correctionNote?: string
    history?: any[]
  }

  test2: {
    ri?: number
    sg?: number
    hardness?: number
    observations?: ObservationData
    selectedVariety?: string
    notes?: string
    testerId?: string
    timestamp?: Date
    correctionRequested?: boolean
    correctionNote?: string
    history?: any[]
  }

  finalApproval: {
    ri?: number
    sg?: number
    hardness?: number
    finalObservations?: ObservationData
    finalVariety?: string
    itemDescription?: string
    reportUrl?: string
    qrCode?: string
    approverId?: string
    timestamp?: Date
  }
}

export interface GemReference {
  species: string
  variety: string
  refractiveIndexMin: number
  refractiveIndexMax: number
  specificGravityMin: number
  specificGravityMax: number
  hardnessMin: number
  hardnessMax: number
}
