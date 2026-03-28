import { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from "react"
import type { ReactNode } from "react"
import type { User, Gem, GemReference, GemStatus } from "@/lib/types"
import { GEM_STATUSES } from "@/lib/types"
import { gemsApi } from "@/lib/api/gems"
import { usersApi } from "@/lib/api/users"
import { referencesApi } from "@/lib/api/references"
import { uploadImage } from "@/lib/api/images"
import { compressImage } from "@/lib/image-utils"

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
      reportTypes?: string[]
    },
    images?: File[],
    id?: string,
    existingImageIds?: string[],
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

  const refreshGems = useCallback(async () => {
    if (!user) return
    setRefreshing(true)
    try {
      const data = await gemsApi.getGems()
      const gemsData = Array.isArray(data) ? data : data.gems || []
      setGems(gemsData)
    } catch (err) {
      console.error("Failed to fetch gems:", err)
    } finally {
      setRefreshing(false)
    }
  }, [user])

  const refreshReferences = useCallback(async () => {
    if (!user) return
    setRefreshing(true)
    try {
      const data = await referencesApi.getReferences()
      setReferences(data)
    } catch (err) {
      console.error("Failed to fetch references:", err)
    } finally {
      setRefreshing(false)
    }
  }, [user])

  const refreshSpecies = useCallback(async () => {
    if (!user) return
    setRefreshing(true)
    try {
      const data = await referencesApi.getSpecies()
      setSpecies(data)
    } catch (err) {
      console.error("Failed to fetch species:", err)
    } finally {
      setRefreshing(false)
    }
  }, [user])

  const lastInitUserId = useRef<string | null>(null)

  useEffect(() => {
    if (user && lastInitUserId.current !== user.id) {
      lastInitUserId.current = user.id
      const init = async () => {
        setLoading(true)
        await Promise.all([refreshGems(), refreshReferences(), refreshSpecies()])
        setLoading(false)
      }
      init()
    } else if (!user) {
      lastInitUserId.current = null
      setGems([])
      setReferences([])
      setSpecies([])
      setLoading(false)
    }
  }, [user, refreshGems, refreshReferences, refreshSpecies])

  const handleIntake = useCallback(
    async (
      data: {
        color?: string
        weight?: number
        itemDescription?: string
        testerId1?: string
        testerId2?: string
        customerId?: string
        status?: GemStatus
        reportTypes?: string[]
      },
      images?: File[],
      id?: string,
      existingImageIds: string[] = [],
    ) => {
      if (!user) return

      let newImageIds: string[] = []
      if (images && images.length > 0) {
        try {
          const uploadPromises = images.map(async (file) => {
            const compressed = await compressImage(file, 30)
            const uploaded = await uploadImage({
              file: compressed,
              category: "gem",
            })
            return uploaded._id
          })
          newImageIds = await Promise.all(uploadPromises)
        } catch (err) {
          console.error("Failed to upload images during intake:", err)
          throw new Error("One or more image uploads failed")
        }
      }

      const payload = {
        ...data,
        imageIds: [...existingImageIds, ...newImageIds],
      }

      if (id) {
        await gemsApi.updateGem(id, payload)
      } else {
        await gemsApi.createGem(payload)
      }
      await refreshGems()
    },
    [user, refreshGems],
  )

  const getGemById = useCallback(async (id: string) => {
    return gemsApi.getGemById(id)
  }, [])

  const handleTestSubmit = useCallback(
    async (gemId: string, stage: "test1" | "test2", data: any, status?: GemStatus) => {
      if (!user) return
      const update = {
        riMin: data.riMin ? parseFloat(data.riMin) : undefined,
        riMax: data.riMax ? parseFloat(data.riMax) : undefined,
        sg: data.sg ? parseFloat(data.sg) : undefined,
        hardnessMin: data.hardnessMin ? parseFloat(data.hardnessMin) : undefined,
        hardnessMax: data.hardnessMax ? parseFloat(data.hardnessMax) : undefined,
        selectedVariety: data.selectedVariety,
        observations: {
          cuttingShape: data.cuttingShape,
          crownStyle: data.crownStyle,
          pavilionStyle: data.pavilionStyle,
          transparency: data.transparency,
          cuttingGrade: data.cuttingGrade,
          polishingGrade: data.polishingGrade,
          proportionGrade: data.proportionGrade,
          clarityGrade: data.clarityGrade,
          clarityEnhancement: data.clarityEnhancement,
          origin: data.origin,
          species: data.species,
          variety: data.selectedVariety,
          comments: data.comments,
          itemDescription: data.itemDescription,
          specialNote: data.specialNote,
          treatment: data.treatment,
          colour: data.colour,
          colourGrade: data.colourGrade,
          grade: data.grade,
          finalGrade: data.finalGrade,
          spectroscopy: data.spectroscopy,
          messurementX: data.messurementX ? parseFloat(data.messurementX) : undefined,
          messurementY: data.messurementY ? parseFloat(data.messurementY) : undefined,
          messurementZ: data.messurementZ ? parseFloat(data.messurementZ) : undefined,
        },
      }
      await gemsApi.updateGem(gemId, {
        [stage]: update,
        status:
          status ||
          (stage === "test1" ? GEM_STATUSES.READY_FOR_T2 : GEM_STATUSES.READY_FOR_APPROVAL),
      })
      await refreshGems()
    },
    [user, refreshGems],
  )

  const handleApproval = useCallback(
    async (gemId: string, data: any, status?: GemStatus) => {
      if (!user) return
      const update = {
        riMin: data.riMin ? parseFloat(data.riMin) : undefined,
        riMax: data.riMax ? parseFloat(data.riMax) : undefined,
        sg: data.sg ? parseFloat(data.sg) : undefined,
        hardnessMin: data.hardnessMin ? parseFloat(data.hardnessMin) : undefined,
        hardnessMax: data.hardnessMax ? parseFloat(data.hardnessMax) : undefined,
        finalVariety: data.selectedVariety,
        itemDescription: data.itemDescription || data.comments,
        finalObservations: {
          cuttingShape: data.cuttingShape,
          crownStyle: data.crownStyle,
          pavilionStyle: data.pavilionStyle,
          transparency: data.transparency,
          origin: data.origin,
          species: data.species,
          variety: data.selectedVariety,
          cuttingGrade: data.cuttingGrade,
          polishingGrade: data.polishingGrade,
          proportionGrade: data.proportionGrade,
          clarityGrade: data.clarityGrade,
          clarityEnhancement: data.clarityEnhancement,
          comments: data.comments,
          itemDescription: data.itemDescription,
          specialNote: data.specialNote,
          treatment: data.treatment,
          colour: data.colour,
          colourGrade: data.colourGrade,
          grade: data.grade,
          finalGrade: data.finalGrade,
          spectroscopy: data.spectroscopy,
          messurementX: data.messurementX ? parseFloat(data.messurementX) : undefined,
          messurementY: data.messurementY ? parseFloat(data.messurementY) : undefined,
          messurementZ: data.messurementZ ? parseFloat(data.messurementZ) : undefined,
        },
      }
      await gemsApi.submitApproval(gemId, {
        ...update,
        status: status || GEM_STATUSES.DONE,
      })
      await refreshGems()
    },
    [user, refreshGems],
  )

  const handleSaveDraft = useCallback(
    async (
      gemId: string,
      stage: "test1" | "test2" | "finalApproval",
      data: any,
      status: GemStatus,
    ) => {
      if (!user) return
      let update: any = {}
      if (stage === "finalApproval") {
        update = {
          riMin: data.riMin ? parseFloat(data.riMin) : undefined,
          riMax: data.riMax ? parseFloat(data.riMax) : undefined,
          sg: data.sg ? parseFloat(data.sg) : undefined,
          hardnessMin: data.hardnessMin ? parseFloat(data.hardnessMin) : undefined,
          hardnessMax: data.hardnessMax ? parseFloat(data.hardnessMax) : undefined,
          finalVariety: data.selectedVariety,
          itemDescription: data.itemDescription || data.comments,
          finalObservations: {
            cuttingShape: data.cuttingShape,
            crownStyle: data.crownStyle,
            pavilionStyle: data.pavilionStyle,
            transparency: data.transparency,
            origin: data.origin,
            species: data.species,
            variety: data.selectedVariety,
            cuttingGrade: data.cuttingGrade,
            polishingGrade: data.polishingGrade,
            proportionGrade: data.proportionGrade,
            clarityGrade: data.clarityGrade,
            clarityEnhancement: data.clarityEnhancement,
            comments: data.comments,
            itemDescription: data.itemDescription,
            specialNote: data.specialNote,
            treatment: data.treatment,
            colour: data.colour,
            colourGrade: data.colourGrade,
            grade: data.grade,
            finalGrade: data.finalGrade,
            spectroscopy: data.spectroscopy,
            messurementX: data.messurementX ? parseFloat(data.messurementX) : undefined,
            messurementY: data.messurementY ? parseFloat(data.messurementY) : undefined,
            messurementZ: data.messurementZ ? parseFloat(data.messurementZ) : undefined,
          },
        }
      } else {
        update = {
          riMin: data.riMin ? parseFloat(data.riMin) : undefined,
          riMax: data.riMax ? parseFloat(data.riMax) : undefined,
          sg: data.sg ? parseFloat(data.sg) : undefined,
          hardnessMin: data.hardnessMin ? parseFloat(data.hardnessMin) : undefined,
          hardnessMax: data.hardnessMax ? parseFloat(data.hardnessMax) : undefined,
          selectedVariety: data.selectedVariety,
          observations: {
            cuttingShape: data.cuttingShape,
            crownStyle: data.crownStyle,
            pavilionStyle: data.pavilionStyle,
            transparency: data.transparency,
            cuttingGrade: data.cuttingGrade,
            polishingGrade: data.polishingGrade,
            proportionGrade: data.proportionGrade,
            clarityGrade: data.clarityGrade,
            clarityEnhancement: data.clarityEnhancement,
            origin: data.origin,
            species: data.species,
            variety: data.selectedVariety,
            comments: data.comments,
            itemDescription: data.itemDescription,
            specialNote: data.specialNote,
            treatment: data.treatment,
            colour: data.colour,
            colourGrade: data.colourGrade,
            grade: data.grade,
            finalGrade: data.finalGrade,
            spectroscopy: data.spectroscopy,
            messurementX: data.messurementX ? parseFloat(data.messurementX) : undefined,
            messurementY: data.messurementY ? parseFloat(data.messurementY) : undefined,
            messurementZ: data.messurementZ ? parseFloat(data.messurementZ) : undefined,
          },
        }
      }

      await gemsApi.saveDraft(gemId, { [stage]: update, status })
      await refreshGems()
    },
    [user, refreshGems],
  )

  const handleOverride = useCallback(
    async (gemId: string, status: any) => {
      setRefreshing(true)
      try {
        await gemsApi.updateGem(gemId, { status })
        await refreshGems()
      } catch (err) {
        console.error("Failed to override status:", err)
      } finally {
        setRefreshing(false)
      }
    },
    [refreshGems],
  )

  const handleRequestCorrection = useCallback(
    async (gemId: string, stage: "test1" | "test2", note: string) => {
      setRefreshing(true)
      try {
        await gemsApi.requestCorrection(gemId, stage, note)
        await refreshGems()
      } catch (err) {
        console.error("Failed to request correction:", err)
      } finally {
        setRefreshing(false)
      }
    },
    [refreshGems],
  )

  return (
    <GemContext.Provider
      value={useMemo(
        () => ({
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
        }),
        [
          user,
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
        ],
      )}
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
