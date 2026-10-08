import type { TreatmentValues } from "@/lib/treatments"

export const UserRole = {
  ADMIN: "ADMIN",
  HELPER: "HELPER",
  TESTER: "TESTER",
} as const

export type UserRole = (typeof UserRole)[keyof typeof UserRole]

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
  /** Data URI of the user's profile picture; `avatar` (initials) is shown when absent. */
  profileImage?: string
  /** Transparent PNG data URI of the user's signature, printed on reports they sign. */
  signatureImage?: string
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

/**
 * Which kind of certificate a gem was taken in for.
 *
 * Chosen at intake, and read from there on as the answer to a question nothing else
 * asks twice: a default gem is offered the lab's standard paper sizes and never the
 * card editor, a custom gem the other way round. Missing means default — every gem
 * taken in before the choice existed was getting the standard certificate.
 */
export const REPORT_MODES = {
  DEFAULT: "default",
  CUSTOM: "custom",
} as const

export type ReportMode = (typeof REPORT_MODES)[keyof typeof REPORT_MODES]

/**
 * The sizes a custom certificate can be written at — the two that have an editor.
 *
 * Chosen at intake and stored in the gem's own reportTypes, so a custom job carries its
 * size the same way a standard one carries the sizes it asked for, and the report is
 * raised at that size without anybody having to configure it afterwards.
 */
export const CUSTOM_REPORT_SIZES = ["small", "medium", "large"] as const

export type CustomReportSize = (typeof CUSTOM_REPORT_SIZES)[number]

/**
 * What each custom size is called wherever a badge or a heading names it — the same
 * Small / Medium / Large a standard report goes by, so the two kinds read alike in
 * every list and count. The paper each one is (card, A5, A4) is told in its hint.
 */
export const CUSTOM_SIZE_LABELS: Record<CustomReportSize, string> = {
  small: "Small",
  medium: "Medium",
  large: "Large",
}

/** The badge label for a custom job's size, read off its reportTypes or its report. */
export function customSizeLabel(size: string | undefined): string {
  return CUSTOM_SIZE_LABELS[size as CustomReportSize] ?? CUSTOM_SIZE_LABELS.small
}

export interface ObservationData {
  grade?: string
  shape?: string
  cut?: string
  cuttingShape?: string
  crownStyle?: string
  pavilionStyle?: string
  cuttingStyle?: string
  transparency?: string
  messurementX?: number
  messurementY?: number
  messurementZ?: number
  species?: string
  variety?: string
  spectroscopy?: string
  origin?: string
  cuttingGrade?: string | number
  polishingGrade?: string
  proportionGrade?: string
  clarityGrade?: string
  clarityEnhancement?: string
  comments?: string
  itemDescription?: string
  specialNote?: string
  treatment?: string
  /** Per-treatment "Yes" | "No" checklist; "" / missing means not assessed. */
  treatments?: Partial<TreatmentValues>
  colour?: string
  // Colour breakdown printed in the large report's DETAILS block. Tone and
  // saturation are graded Low | Medium | High and print as ticked boxes.
  hue?: string
  tone?: string
  saturation?: string
  colourGrade?: number
  finalGrade?: number
  isHeated?: boolean
  showHeatInReport?: boolean
  isEmerald?: boolean
  isMixCut?: boolean
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
  reportTypes?: string[]
  reportMode?: ReportMode
  skipTesting?: boolean
  /** The customer asked for a video reachable from the certificate's QR code. */
  videoPreview?: boolean

  intake: {
    helperId?: string
    timestamp?: Date
  }

  test1?: null | {
    riMin?: number
    riMax?: number
    /** Written before R.I. became a range again; read as a fallback for both ends. */
    ri?: number
    sg?: number
    hardness?: number
    /** Recorded by this stage's own owner; the gem carries the most recent of them. */
    colour?: string
    weight?: number
    observations?: ObservationData
    selectedVariety?: string
    notes?: string
    testerId?: string
    timestamp?: Date
    correctionRequested?: boolean
    correctionNote?: string
    history?: any[]
  }

  test2?: null | {
    riMin?: number
    riMax?: number
    /** Written before R.I. became a range again; read as a fallback for both ends. */
    ri?: number
    sg?: number
    hardness?: number
    /** Recorded by this stage's own owner; the gem carries the most recent of them. */
    colour?: string
    weight?: number
    observations?: ObservationData
    selectedVariety?: string
    notes?: string
    testerId?: string
    timestamp?: Date
    correctionRequested?: boolean
    correctionNote?: string
    history?: any[]
  }

  finalApproval?: null | {
    riMin?: number
    riMax?: number
    /** Written before R.I. became a range again; read as a fallback for both ends. */
    ri?: number
    sg?: number
    hardness?: number
    /** Recorded by this stage's own owner; the gem carries the most recent of them. */
    colour?: string
    weight?: number
    finalObservations?: ObservationData
    finalVariety?: string
    itemDescription?: string
    reportUrl?: string
    qrCode?: string
    approverId?: string
    timestamp?: Date
    approverCorrectionRequested?: boolean
    approverCorrectionNote?: string
  }
}

export type ReportType = "small" | "medium" | "large" | "verbal"

/** Lab-wide figures for the dashboard, aggregated by the API over every gem. */
export interface DashboardStats {
  totalGems: number
  pendingWorkflow: number
  completedGems: number
  myActionItems: number
  /** Completed gems by report size; a gem taken in for several sizes counts under each. */
  reportTypesDone: Partial<Record<ReportType, number>>
  /** The same count, for gems given final approval in the current lab month. */
  reportTypesDoneThisMonth: Partial<Record<ReportType, number>>
  /** The species named most often among this month's completed gems; null if none. */
  topSpeciesThisMonth: { name: string; count: number } | null
  totalCarats: number
  averageCarats: number
  /** Intake to final approval, averaged over completed gems; null until one completes. */
  averageTurnaroundDays: number | null
  statusCounts: Partial<Record<GemStatus, number>>
  reportModes: Partial<Record<ReportMode, number>>
  /** Completed gems by species, largest first, with the tail folded into "Other". */
  species: { name: string; count: number }[]
  topCustomers: { name: string; count: number }[]
}

/** The spans the dashboard's activity chart can show. */
export type ActivityRange = "month" | "6m" | "year" | "all"

/**
 * Gems taken in and completed per bucket, oldest first, with empty buckets included.
 * Keys are lab-calendar dates: "YYYY-MM-DD" by day, "YYYY-MM" by month, "YYYY" by year.
 */
export interface ActivityData {
  range: ActivityRange
  granularity: "day" | "month" | "year"
  buckets: { key: string; intake: number; completed: number }[]
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
  matchScore?: number
}

export const CONTACT_STATUSES = {
  NEW: "NEW",
  READ: "READ",
  ARCHIVED: "ARCHIVED",
} as const

export type ContactStatus = (typeof CONTACT_STATUSES)[keyof typeof CONTACT_STATUSES]

/** A message sent from the public "Send Us a Message" form on grc.lk. */
export interface ContactMessage {
  _id: string
  name: string
  phone: string
  email: string
  message: string
  status: ContactStatus
  source?: string
  /** Populated by the API once someone on the GRC side picks the message up. */
  handledBy?: { _id: string; name?: string; email?: string } | null
  handledAt?: string
  createdAt: string
  updatedAt?: string
}

export const POST_STATUSES = {
  DRAFT: "DRAFT",
  PUBLISHED: "PUBLISHED",
  ARCHIVED: "ARCHIVED",
} as const

export type PostStatus = (typeof POST_STATUSES)[keyof typeof POST_STATUSES]

/** Slugs match the categories linked from the grc.lk navigation. */
export const POST_CATEGORIES = {
  BLOG: "blog",
  GRC_NEWS: "grc-news",
  UNCATEGORIZED: "uncategorized",
} as const

export type PostCategory = (typeof POST_CATEGORIES)[keyof typeof POST_CATEGORIES]

export const POST_CATEGORY_LABELS: Record<PostCategory, string> = {
  [POST_CATEGORIES.BLOG]: "Blog",
  [POST_CATEGORIES.GRC_NEWS]: "GRC News",
  [POST_CATEGORIES.UNCATEGORIZED]: "Uncategorized",
}

/** An article written by laboratory staff for the Post section of grc.lk. */
export interface Post {
  _id: string
  title: string
  slug: string
  excerpt: string
  body: string
  category: PostCategory
  status: PostStatus
  coverImage?: string
  author?: { _id: string; name?: string; email?: string; role?: UserRole } | null
  publishedBy?: { _id: string; name?: string } | null
  publishedAt?: string
  createdAt: string
  updatedAt?: string
}
