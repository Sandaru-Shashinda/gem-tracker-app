import { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from "react"
import type { ReactNode } from "react"
import type { User, Gem, GemReference, GemStatus } from "@/lib/types"
import { GEM_STATUSES } from "@/lib/types"
import { gemsApi } from "@/lib/api/gems"
import { usersApi } from "@/lib/api/users"
import { referencesApi } from "@/lib/api/references"
import { uploadImage } from "@/lib/api/images"
import { compressImage } from "@/lib/image-utils"
import { getCropMeta } from "@/lib/gem-crop"

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
      gemId?: string
      color?: string
      weight?: number
      itemDescription?: string
      testerId1?: string
      testerId2?: string
      customerId?: string
      status?: GemStatus
      reportTypes?: string[]
      skipTesting?: boolean
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
  handleRequestApproverCorrection: (gemId: string, note: string) => Promise<void>
  handleDismissApproverCorrection: (gemId: string) => Promise<void>

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
        gemId?: string
        color?: string
        weight?: number
        itemDescription?: string
        testerId1?: string
        testerId2?: string
        customerId?: string
        status?: GemStatus
        reportTypes?: string[]
        skipTesting?: boolean
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
            // Read the crop before compressing — compressImage returns a new File,
            // and the crop registry is keyed by the file the dialog handed back.
            const gemCrop = getCropMeta(file)
            const compressed = await compressImage(file, 30)
            const uploaded = await uploadImage({
              file: compressed,
              category: "gem",
              ...(gemCrop ? { metadata: { gemCrop } } : {}),
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
        ri: data.ri ? parseFloat(data.ri) : undefined,
        sg: data.sg ? parseFloat(data.sg) : undefined,
        hardnessMin: data.hardnessMin ? parseFloat(data.hardnessMin) : undefined,
        hardnessMax: data.hardnessMax ? parseFloat(data.hardnessMax) : undefined,
        selectedVariety: data.selectedVariety,
        // Colour is stored on the gem, not on this stage.
        color: data.colour,
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
          colourGrade: data.colourGrade,
          hue: data.hue,
          tone: data.tone,
          saturation: data.saturation,
          grade: data.grade,
          finalGrade: data.finalGrade,
          spectroscopy: data.spectroscopy,
          messurementX: data.messurementX ? parseFloat(data.messurementX) : undefined,
          messurementY: data.messurementY ? parseFloat(data.messurementY) : undefined,
          messurementZ: data.messurementZ ? parseFloat(data.messurementZ) : undefined,
          isHeated: data.isHeated ?? false,
          showHeatInReport: data.showHeatInReport ?? false,
          isEmerald: data.isEmerald ?? false,
          isMixCut: data.isMixCut ?? false,
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
        ri: data.ri ? parseFloat(data.ri) : undefined,
        sg: data.sg ? parseFloat(data.sg) : undefined,
        hardnessMin: data.hardnessMin ? parseFloat(data.hardnessMin) : undefined,
        hardnessMax: data.hardnessMax ? parseFloat(data.hardnessMax) : undefined,
        finalVariety: data.selectedVariety,
        // Colour is stored on the gem, not on this stage.
        color: data.colour,
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
          colourGrade: data.colourGrade,
          hue: data.hue,
          tone: data.tone,
          saturation: data.saturation,
          grade: data.grade,
          finalGrade: data.finalGrade,
          spectroscopy: data.spectroscopy,
          messurementX: data.messurementX ? parseFloat(data.messurementX) : undefined,
          messurementY: data.messurementY ? parseFloat(data.messurementY) : undefined,
          messurementZ: data.messurementZ ? parseFloat(data.messurementZ) : undefined,
          isHeated: data.isHeated ?? false,
          showHeatInReport: data.showHeatInReport ?? false,
          isEmerald: data.isEmerald ?? false,
          isMixCut: data.isMixCut ?? false,
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
          ri: data.ri ? parseFloat(data.ri) : undefined,
          sg: data.sg ? parseFloat(data.sg) : undefined,
          hardnessMin: data.hardnessMin ? parseFloat(data.hardnessMin) : undefined,
          hardnessMax: data.hardnessMax ? parseFloat(data.hardnessMax) : undefined,
          finalVariety: data.selectedVariety,
          // Colour is stored on the gem, not on this stage.
          color: data.colour,
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
            colourGrade: data.colourGrade,
            hue: data.hue,
            tone: data.tone,
            saturation: data.saturation,
            grade: data.grade,
            finalGrade: data.finalGrade,
            spectroscopy: data.spectroscopy,
            messurementX: data.messurementX ? parseFloat(data.messurementX) : undefined,
            messurementY: data.messurementY ? parseFloat(data.messurementY) : undefined,
            messurementZ: data.messurementZ ? parseFloat(data.messurementZ) : undefined,
            isHeated: data.isHeated ?? false,
            showHeatInReport: data.showHeatInReport ?? false,
            isEmerald: data.isEmerald ?? false,
            isMixCut: data.isMixCut ?? false,
          },
        }
      } else {
        update = {
          ri: data.ri ? parseFloat(data.ri) : undefined,
          sg: data.sg ? parseFloat(data.sg) : undefined,
          hardnessMin: data.hardnessMin ? parseFloat(data.hardnessMin) : undefined,
          hardnessMax: data.hardnessMax ? parseFloat(data.hardnessMax) : undefined,
          selectedVariety: data.selectedVariety,
          // Colour is stored on the gem, not on this stage.
          color: data.colour,
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
            colourGrade: data.colourGrade,
            hue: data.hue,
            tone: data.tone,
            saturation: data.saturation,
            grade: data.grade,
            finalGrade: data.finalGrade,
            spectroscopy: data.spectroscopy,
            messurementX: data.messurementX ? parseFloat(data.messurementX) : undefined,
            messurementY: data.messurementY ? parseFloat(data.messurementY) : undefined,
            messurementZ: data.messurementZ ? parseFloat(data.messurementZ) : undefined,
            isHeated: data.isHeated ?? false,
            showHeatInReport: data.showHeatInReport ?? false,
            isEmerald: data.isEmerald ?? false,
            isMixCut: data.isMixCut ?? false,
          },
        }
      }

      await gemsApi.updateGem(gemId, { [stage]: update, status })
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

  const handleRequestApproverCorrection = useCallback(
    async (gemId: string, note: string) => {
      setRefreshing(true)
      try {
        await gemsApi.requestApproverCorrection(gemId, note)
        await refreshGems()
      } catch (err) {
        console.error("Failed to request approver correction:", err)
      } finally {
        setRefreshing(false)
      }
    },
    [refreshGems],
  )

  const handleDismissApproverCorrection = useCallback(
    async (gemId: string) => {
      setRefreshing(true)
      try {
        await gemsApi.dismissApproverCorrection(gemId)
        await refreshGems()
      } catch (err) {
        console.error("Failed to dismiss approver correction:", err)
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
          handleRequestApproverCorrection,
          handleDismissApproverCorrection,
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
          handleRequestApproverCorrection,
          handleDismissApproverCorrection,
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
