import { createContext, useContext, useState, useEffect } from "react"
import type { ReactNode } from "react"
import type { User, Gem, GemReference, GemStatus } from "@/lib/types"
import { GEM_STATUSES } from "@/lib/types"
import { gemsApi } from "@/lib/api/gems"
import { usersApi } from "@/lib/api/users"
import { referencesApi } from "@/lib/api/references"
import { reportsApi } from "@/lib/api/reports"

interface GemContextType {
  user: User | null
  setUser: (user: User | null) => void
  loading: boolean
  refreshing: boolean
  gems: Gem[]
  references: GemReference[]
  species: string[]
  refreshGems: () => Promise<void>
  refreshReferences: () => Promise<void>
  refreshSpecies: () => Promise<void>
  handleIntake: (
    data: {
      color?: string
      weight?: number
      itemDescription?: string
      testerId1?: string
      testerId2?: string
      customerId?: string
      status?: GemStatus
    },
    image?: File,
    id?: string,
  ) => Promise<void>
  getGemById: (id: string) => Promise<Gem>
  handleTestSubmit: (
    gemId: string,
    stage: "test1" | "test2",
    data: any,
    status?: GemStatus,
  ) => Promise<void>
  handleRequestCorrection: (gemId: string, stage: "test1" | "test2", note: string) => Promise<void>

  handleApproval: (gemId: string, data: any, status?: GemStatus) => Promise<void>
  handleOverride: (gemId: string, status: any) => Promise<void>
  handleSaveDraft: (
    gemId: string,
    stage: "test1" | "test2" | "finalApproval",
    data: any,
    status: GemStatus,
  ) => Promise<void>
}

const GemContext = createContext<GemContextType | undefined>(undefined)

export function GemProvider({ children }: { children: ReactNode }) {
  const [user, setUserState] = useState<User | null>(usersApi.getCurrentUser())
  const [gems, setGems] = useState<Gem[]>([])
  const [references, setReferences] = useState<GemReference[]>([])
  const [species, setSpecies] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const setUser = (u: User | null) => {
    if (!u) usersApi.logout()
    setUserState(u)
  }

  const refreshGems = async () => {
    setRefreshing(true)
    try {
      const data = await gemsApi.getGems()
      // Handle both paginated ({ gems: [], ... }) and legacy ([]) responses
      const gemsData = Array.isArray(data) ? data : data.gems || []
      setGems(gemsData)
    } catch (err) {
      console.error("Failed to fetch gems:", err)
    } finally {
      setRefreshing(false)
    }
  }

  const refreshReferences = async () => {
    setRefreshing(true)
    try {
      const data = await referencesApi.getReferences()
      setReferences(data)
    } catch (err) {
      console.error("Failed to fetch references:", err)
    } finally {
      setRefreshing(false)
    }
  }

  const refreshSpecies = async () => {
    setRefreshing(true)
    try {
      const data = await referencesApi.getSpecies()
      setSpecies(data)
    } catch (err) {
      console.error("Failed to fetch species:", err)
    } finally {
      setRefreshing(false)
    }
  }

  useEffect(() => {
    const init = async () => {
      setLoading(true)
      await Promise.all([refreshGems(), refreshReferences(), refreshSpecies()])
      setLoading(false)
    }
    init()
  }, [])

  const handleIntake = async (
    data: {
      color?: string
      weight?: number
      itemDescription?: string
      testerId1?: string
      testerId2?: string
      customerId?: string
      status?: GemStatus
    },
    image?: File,
    id?: string,
  ) => {
    if (!user) return
    const formData = new FormData()
    if (data.color) formData.append("color", data.color)
    if (data.weight !== undefined) formData.append("weight", data.weight.toString())
    if (data.itemDescription) formData.append("itemDescription", data.itemDescription)
    if (data.testerId1) {
      formData.append("testerId1", data.testerId1)
    }
    if (data.testerId2) {
      formData.append("testerId2", data.testerId2)
    }
    if (data.customerId) {
      formData.append("customerId", data.customerId)
    }
    if (data.status) {
      formData.append("status", data.status)
    }
    if (image) {
      formData.append("image", image)
    }

    if (id) {
      await gemsApi.updateGem(id, formData)
    } else {
      await gemsApi.createGem(formData)
    }
    await refreshGems()
  }

  const getGemById = async (id: string) => {
    return gemsApi.getGemById(id)
  }

  const handleTestSubmit = async (
    gemId: string,
    stage: "test1" | "test2",
    data: any,
    status?: GemStatus,
  ) => {
    if (!user) return
    const update = {
      ri: parseFloat(data.ri),
      sg: parseFloat(data.sg),
      hardness: parseFloat(data.hardness),
      selectedVariety: data.selectedVariety,
      observations: {
        shape: data.shape,
        cut: data.cut,
        transparency: data.transparency,
        clarity: data.clarityGrade,
        origin: data.origin,
        species: data.species,
        variety: data.selectedVariety,
        comments: data.comments,
        itemDescription: data.itemDescription,
        specialNote: data.specialNote,
        grade: data.grade,
        spectroscopy: data.spectroscopy,
        messurementX: data.messurementX ? parseFloat(data.messurementX) : undefined,
        messurementY: data.messurementY ? parseFloat(data.messurementY) : undefined,
        messurementZ: data.messurementZ ? parseFloat(data.messurementZ) : undefined,
      },
    }
    await gemsApi.updateGem(gemId, {
      [stage]: update,
      status:
        status || (stage === "test1" ? GEM_STATUSES.READY_FOR_T2 : GEM_STATUSES.READY_FOR_APPROVAL),
    })
    await refreshGems()
  }

  const handleApproval = async (gemId: string, data: any, status?: GemStatus) => {
    if (!user) return
    const update = {
      ri: parseFloat(data.ri),
      sg: parseFloat(data.sg),
      hardness: parseFloat(data.hardness),
      finalVariety: data.selectedVariety,
      itemDescription: data.itemDescription || data.comments,
      finalObservations: {
        shape: data.shape,
        cut: data.cut,
        transparency: data.transparency,
        origin: data.origin,
        species: data.species,
        variety: data.selectedVariety,
        cuttingGrade: data.cuttingGrade,
        polishingGrade: data.polishingGrade,
        proportionGrade: data.proportionGrade,
        clarityGrade: data.clarityGrade,
        comments: data.comments,
        itemDescription: data.itemDescription,
        specialNote: data.specialNote,
        grade: data.grade,
        spectroscopy: data.spectroscopy,
        messurementX: data.messurementX ? parseFloat(data.messurementX) : undefined,
        messurementY: data.messurementY ? parseFloat(data.messurementY) : undefined,
        messurementZ: data.messurementZ ? parseFloat(data.messurementZ) : undefined,
      },
    }
    await gemsApi.updateGem(gemId, {
      finalApproval: update,
      status: status || GEM_STATUSES.DONE,
    })
    try {
      await reportsApi.generateReport(gemId)
    } catch (err) {
      console.error("Failed to generate report:", err)
    }
    await refreshGems()
  }

  const handleSaveDraft = async (
    gemId: string,
    stage: "test1" | "test2" | "finalApproval",
    data: any,
    status: GemStatus,
  ) => {
    if (!user) return
    let update: any = {}
    if (stage === "finalApproval") {
      update = {
        ri: parseFloat(data.ri),
        sg: parseFloat(data.sg),
        hardness: parseFloat(data.hardness),
        finalVariety: data.selectedVariety,
        itemDescription: data.itemDescription || data.comments,
        finalObservations: {
          shape: data.shape,
          cut: data.cut,
          transparency: data.transparency,
          origin: data.origin,
          species: data.species,
          variety: data.selectedVariety,
          cuttingGrade: data.cuttingGrade,
          polishingGrade: data.polishingGrade,
          proportionGrade: data.proportionGrade,
          clarityGrade: data.clarityGrade,
          comments: data.comments,
          itemDescription: data.itemDescription,
          specialNote: data.specialNote,
          grade: data.grade,
          spectroscopy: data.spectroscopy,
          messurementX: data.messurementX ? parseFloat(data.messurementX) : undefined,
          messurementY: data.messurementY ? parseFloat(data.messurementY) : undefined,
          messurementZ: data.messurementZ ? parseFloat(data.messurementZ) : undefined,
        },
      }
    } else {
      update = {
        ri: parseFloat(data.ri),
        sg: parseFloat(data.sg),
        hardness: parseFloat(data.hardness),
        selectedVariety: data.selectedVariety,
        observations: {
          shape: data.shape,
          cut: data.cut,
          transparency: data.transparency,
          clarity: data.clarityGrade,
          origin: data.origin,
          species: data.species,
          variety: data.selectedVariety,
          comments: data.comments,
          itemDescription: data.itemDescription,
          specialNote: data.specialNote,
          grade: data.grade,
          spectroscopy: data.spectroscopy,
          messurementX: data.messurementX ? parseFloat(data.messurementX) : undefined,
          messurementY: data.messurementY ? parseFloat(data.messurementY) : undefined,
          messurementZ: data.messurementZ ? parseFloat(data.messurementZ) : undefined,
        },
      }
    }

    await gemsApi.saveDraft(gemId, { [stage]: update, status })
    await refreshGems()
  }

  const handleOverride = async (gemId: string, status: any) => {
    setRefreshing(true)
    try {
      await gemsApi.updateGem(gemId, { status })
      await refreshGems()
    } catch (err) {
      console.error("Failed to override status:", err)
    } finally {
      setRefreshing(false)
    }
  }

  const handleRequestCorrection = async (gemId: string, stage: "test1" | "test2", note: string) => {
    setRefreshing(true)
    try {
      await gemsApi.requestCorrection(gemId, stage, note)
      await refreshGems()
    } catch (err) {
      console.error("Failed to request correction:", err)
    } finally {
      setRefreshing(false)
    }
  }

  return (
    <GemContext.Provider
      value={{
        user,
        setUser,
        loading,
        refreshing,
        gems,
        references,
        species,
        refreshGems,
        refreshReferences,
        refreshSpecies,
        handleIntake,
        getGemById,
        handleTestSubmit,
        handleRequestCorrection,
        handleApproval,
        handleOverride,
        handleSaveDraft,
      }}
    >
      {children}
    </GemContext.Provider>
  )
}

export function useGem() {
  const context = useContext(GemContext)
  if (context === undefined) {
    throw new Error("useGem must be used within a GemProvider")
  }
  return context
}
