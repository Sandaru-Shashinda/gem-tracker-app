import { useState, useEffect } from "react"
import { useForm, type SubmitHandler } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { testSchema, type TestFormValues } from "@/lib/validations/test"
import { useParams, useNavigate } from "react-router-dom"
import { Loader2 } from "lucide-react"
import { MainLayout } from "@/components/layout/MainLayout"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useGem } from "@/hooks/useGemStore"
import { gemsApi } from "@/lib/api/gems"
import { customersApi } from "@/lib/api/customers"
import { referencesApi } from "@/lib/api/references"
import { uploadImage } from "@/lib/api/images"
import { compressImage } from "@/lib/image-utils"
import { GemCropDialog, type CropResult } from "@/components/features/gems/GemCropDialog"
import { cropImageFile } from "@/lib/gem-crop"
import { type Gem, type GemReference, type Customer, GEM_STATUSES, UserRole } from "@/lib/types"
import { GemTimeline } from "@/components/features/gems/GemTimeline"
import { GemIntakeAndHistory } from "@/components/features/gems/GemIntakeAndHistory"
import { GemDetailHeader } from "@/components/features/gems/GemDetailHeader"
import { GemWorkflowStatus } from "@/components/features/gems/GemWorkflowStatus"
import { GemAnalysisForm } from "@/components/features/gems/GemAnalysisForm"
import { ApproverCorrectionBanner } from "@/components/features/gems/ApproverCorrectionBanner"
import { GemFormActions } from "@/components/features/gems/GemFormActions"
import { getFormFieldsConfig } from "@/components/shared/common/Formfieldsconfig"
import { addCustomOption } from "@/lib/customDropdownOptions"
import { FORM_DEFAULTS } from "@/lib/validations/gemFormDefaults"
import {
  type SearchSetters,
  mapSourceToFormValues,
  syncSearchStates,
  resolveSubmitStatus,
} from "@/lib/gemFormUtils"

export function GemDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const {
    user,
    gems,
    references: globalReferences,
    species: globalSpecies,
    handleTestSubmit,
    handleRequestCorrection,
    handleDismissApproverCorrection,
    handleApproval,
    handleSaveDraft,
    getGemById,
    loading,
    refreshGems,
  } = useGem()

  const gemFromStore = gems.find((g: any) => g._id === id)
  const [gemDetail, setGemDetail] = useState<Gem | null>(null)
  const [detailLoading, setDetailLoading] = useState(true)
  const [detailVersion, setDetailVersion] = useState(0)
  const gem = gemFromStore ?? gemDetail

  // ── Role flags ──────────────────────────────────────────────────────────
  const isHelper = user?.role === UserRole.HELPER
  const isAdmin = user?.role === UserRole.ADMIN
  const isTester = user?.role === UserRole.TESTER

  // ── Stage flags ─────────────────────────────────────────────────────────
  const isT1 =
    gem?.status === GEM_STATUSES.READY_FOR_T1 || gem?.status === GEM_STATUSES.DRAFT_TEST_1
  const isT2 =
    gem?.status === GEM_STATUSES.READY_FOR_T2 || gem?.status === GEM_STATUSES.DRAFT_TEST_2
  const isApproval =
    gem?.status === GEM_STATUSES.READY_FOR_APPROVAL || gem?.status === GEM_STATUSES.DRAFT_APPROVAL

  // ── Permission flags ────────────────────────────────────────────────────
  const isAssignedT1 = gem?.assignedTester1 === user?.id
  const isAssignedT2 = gem?.assignedTester2 === user?.id
  const isDone = gem?.status === GEM_STATUSES.DONE
  const isEditingT1AfterSubmit =
    isTester && isAssignedT1 && !!gemDetail?.test1?.testerId && !isT1 && !isDone
  const isEditingT2AfterSubmit =
    isTester && isAssignedT2 && !!gemDetail?.test2?.testerId && !isT2 && !isDone
  const canTest =
    (isTester &&
      ((isT1 && isAssignedT1) ||
        (isT2 && isAssignedT2) ||
        isEditingT1AfterSubmit ||
        isEditingT2AfterSubmit)) ||
    isAdmin
  // const canApprove = isAdmin
  const approverCorrectionActive = gemDetail?.finalApproval?.approverCorrectionRequested === true

  // ── Search state ────────────────────────────────────────────────────────
  const [speciesSearch, setSpeciesSearch] = useState("")
  const [showSpeciesList, setShowSpeciesList] = useState(false)
  const [varietySearch, setVarietySearch] = useState("")
  const [showVarietyList, setShowVarietyList] = useState(false)
  const [crownStyleSearch, setCrownStyleSearch] = useState("")
  const [showCrownStyleList, setShowCrownStyleList] = useState(false)
  const [pavilionStyleSearch, setPavilionStyleSearch] = useState("")
  const [showPavilionStyleList, setShowPavilionStyleList] = useState(false)
  const [cuttingShapeSearch, setCuttingShapeSearch] = useState("")
  const [showCuttingShapeList, setShowCuttingShapeList] = useState(false)
  const [colourSearch, setColourSearch] = useState("")
  const [showColourList, setShowColourList] = useState(false)

  // ── Other state ─────────────────────────────────────────────────────────
  const [suggestions, setSuggestions] = useState<GemReference[]>([])
  const [isActionLoading, setIsActionLoading] = useState(false)
  const [pendingCropFiles, setPendingCropFiles] = useState<File[]>([])
  const [customer, setCustomer] = useState<Customer | null>(null)
  const [, setCustomOptTick] = useState(0)

  const makeOptionAdder =
    (field: "cuttingShape" | "crownStyle" | "pavilionStyle" | "colour") => (value: string) => {
      addCustomOption(field, value)
      setCustomOptTick((t) => t + 1)
    }

  // ── Derived data ────────────────────────────────────────────────────────
  const filteredSpecies = globalSpecies.filter((s) =>
    s.toLowerCase().includes(speciesSearch.toLowerCase()),
  )
  const filteredVarieties = globalReferences.filter((r) =>
    r.variety.toLowerCase().includes(varietySearch.toLowerCase()),
  )

  // ── Form ────────────────────────────────────────────────────────────────
  const form = useForm<TestFormValues>({
    resolver: zodResolver(testSchema) as any,
    defaultValues: FORM_DEFAULTS,
    mode: "onChange",
  })

  const {
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { isSubmitting, isValid },
  } = form

  const watchedRiMin = watch("riMin")
  const watchedRiMax = watch("riMax")
  const watchedSg = watch("sg")
  const watchedHardnessMin = watch("hardnessMin")
  const watchedHardnessMax = watch("hardnessMax")
  const watchedSpecies = watch("species")
  const watchedVariety = watch("selectedVariety")

  const searchSetters: SearchSetters = {
    setSpeciesSearch,
    setVarietySearch,
    setCrownStyleSearch,
    setPavilionStyleSearch,
    setCuttingShapeSearch,
    setColourSearch,
  }

  const { scientificFields, identificationFields, gradingFields, textFields } = getFormFieldsConfig(
    {
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
      onAddCuttingShapeOption: makeOptionAdder("cuttingShape"),
      onAddCrownStyleOption: makeOptionAdder("crownStyle"),
      onAddPavilionStyleOption: makeOptionAdder("pavilionStyle"),
      onAddColourOption: makeOptionAdder("colour"),
    },
  )

  // ── Effects ─────────────────────────────────────────────────────────────

  // Populate form when full gem detail loads or active stage changes.
  // For Approval stage: always use finalApproval data only.
  // The approver must manually copy from Tester 1 or Tester 2 — no auto pre-fill.
  useEffect(() => {
    console.log(gemDetail)
    if (!gemDetail) return
    let activeData: any = null
    if (isAdmin) {
      activeData = isT1 ? gemDetail.test1 : isT2 ? gemDetail.test2 : gemDetail.finalApproval
    } else if (isTester) {
      if (isAssignedT2 && (isT2 || isEditingT2AfterSubmit)) {
        activeData = gemDetail.test2
      } else if (isAssignedT1 && (isT1 || isEditingT1AfterSubmit)) {
        activeData = gemDetail.test1
      }
    }
    // Gems that bypassed testing have no Test 1 / Test 2 data to copy from, so
    // seed the approval form straight from the intake record.
    if (!activeData && gemDetail.skipTesting && isApproval) {
      const seeded = { ...FORM_DEFAULTS }
      seeded.itemDescription = gemDetail.itemDescription || ""
      seeded.colour = gemDetail.color || ""
      reset(seeded)
      syncSearchStates(seeded, searchSetters)
      return
    }

    if (!activeData) return

    const values = mapSourceToFormValues(activeData)
    if (!values.itemDescription) values.itemDescription = gemDetail.itemDescription || ""
    if (!values.colour) values.colour = gemDetail.color || ""

    reset(values)
    syncSearchStates(values, searchSetters)
  }, [
    gemDetail,
    isT1,
    isT2,
    isApproval,
    isAdmin,
    isTester,
    isAssignedT1,
    isAssignedT2,
    isEditingT1AfterSubmit,
    isEditingT2AfterSubmit,
    reset,
  ])

  useEffect(() => {
    if (!gem?.customerId) return
    customersApi.getCustomer(gem.customerId).then(setCustomer).catch(console.error)
  }, [gem?.customerId])

  useEffect(() => {
    if (!id) return
    setDetailLoading(true)
    getGemById(id)
      .then(setGemDetail)
      .catch(console.error)
      .finally(() => setDetailLoading(false))
  }, [id, detailVersion, getGemById])

  // Auto-suggestion based on scientific measurements.
  useEffect(() => {
    if (
      !watchedRiMin &&
      !watchedRiMax &&
      !watchedSg &&
      !watchedHardnessMin &&
      !watchedHardnessMax
    ) {
      setSuggestions([])
      return
    }
    referencesApi
      .searchReferences(
        watchedRiMin,
        watchedRiMax,
        watchedSg,
        watchedHardnessMin,
        watchedHardnessMax,
      )
      .then(setSuggestions)
      .catch((err) => console.error("Failed to get suggestions:", err))
  }, [watchedRiMin, watchedRiMax, watchedSg, watchedHardnessMin, watchedHardnessMax])

  // ── Handlers ────────────────────────────────────────────────────────────

  const onSubmit: SubmitHandler<TestFormValues> = async (data) => {
    try {
      if (isAdmin) {
        const status = resolveSubmitStatus(user?.role, isT1, isT2)
        await handleApproval(gem!._id, data, status)
        navigate("/queue")
      } else if (isEditingT1AfterSubmit || isEditingT2AfterSubmit) {
        const stage = isEditingT1AfterSubmit ? "test1" : "test2"
        await handleTestSubmit(gem!._id, stage, data, gem!.status)
        setDetailVersion((v) => v + 1)
      } else if (canTest) {
        const status = resolveSubmitStatus(user?.role, isT1, isT2)
        await handleTestSubmit(gem!._id, isT1 ? "test1" : "test2", data, status)
        navigate("/queue")
      }
    } catch (error) {
      console.error("Failed to submit:", error)
    }
  }

  const handleDraft = async () => {
    try {
      setIsActionLoading(true)
      const data = watch()
      const stage = isApproval ? "finalApproval" : isT1 ? "test1" : "test2"
      const status = isApproval
        ? GEM_STATUSES.DRAFT_APPROVAL
        : isT1
          ? GEM_STATUSES.DRAFT_TEST_1
          : GEM_STATUSES.DRAFT_TEST_2
      await handleSaveDraft(gem!._id, stage, data, status)
      setDetailVersion((v) => v + 1)
    } catch (error) {
      console.error("Failed to save draft:", error)
    } finally {
      setIsActionLoading(false)
    }
  }

  // Photos are confirmed against the detected gem outline before upload, so the stored
  // image is tight to the stone and the certificate can print it at real size.
  const handleImageUpdate = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0 || !gem) return
    setPendingCropFiles(Array.from(files))
    // Let the same file be picked again after a cancel.
    e.target.value = ""
  }

  const handleCropComplete = async (results: CropResult[]) => {
    const queued = pendingCropFiles
    setPendingCropFiles([])
    if (queued.length === 0 || !gem) return

    setIsActionLoading(true)
    try {
      const newImageIds = await Promise.all(
        results.map(async (result, i) => {
          const cropped = await cropImageFile(queued[i], result.rect)
          const compressed = await compressImage(cropped, 30)
          const uploaded = await uploadImage({
            file: compressed,
            category: "gem",
            metadata: { gemId: gem.gemId, gemCrop: result.meta },
          })
          return uploaded._id
        }),
      )
      await gemsApi.addGemImages(gem._id, newImageIds)
      await refreshGems()
    } catch (error) {
      console.error("Failed to update images:", error)
    } finally {
      setIsActionLoading(false)
    }
  }

  const copyValues = (source: any) => {
    const values = mapSourceToFormValues(source)
    reset(values)
    syncSearchStates(values, searchSetters)
  }

  // ── Early returns ────────────────────────────────────────────────────────

  if ((loading || detailLoading) && !gem) {
    return (
      <MainLayout>
        <div className='h-full flex items-center justify-center p-20'>
          <Loader2 className='animate-spin h-12 w-12 text-blue-500' />
        </div>
      </MainLayout>
    )
  }

  if (!gem) {
    return (
      <MainLayout>
        <div className='text-center py-20'>
          <h2 className='text-2xl font-bold text-slate-800'>Gem not found</h2>
          <Button onClick={() => navigate("/queue")} className='mt-4'>
            Back to Queue
          </Button>
        </div>
      </MainLayout>
    )
  }

  const showDraftButton =
    !isEditingT1AfterSubmit &&
    !isEditingT2AfterSubmit &&
    gem.status !== GEM_STATUSES.SUBMITTED_FOR_REPORT &&
    gem.status !== GEM_STATUSES.DONE

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <MainLayout>
      <div className='space-y-6'>
        <GemDetailHeader gem={gem} />

        <Card className='p-8 bg-white shadow-sm border-slate-100 overflow-hidden'>
          <GemTimeline gem={gem} />
        </Card>

        <div className='grid grid-cols-1 lg:grid-cols-5 gap-6'>
          <GemIntakeAndHistory
            gem={gemDetail ?? gem}
            user={user}
            customer={customer}
            suggestions={suggestions}
            watchedHardness={watchedHardnessMin as string}
            onReset={reset}
            onWatch={watch}
            onSetSpeciesSearch={setSpeciesSearch}
            onSetVarietySearch={setVarietySearch}
            onImageUpdate={handleImageUpdate}
            onCopyValues={copyValues}
            onHandleRequestCorrection={handleRequestCorrection}
            isApproval={isApproval}
          />

          {/* Main Column */}
          <div className='lg:col-span-3'>
            {approverCorrectionActive && (
              <ApproverCorrectionBanner
                note={gemDetail?.finalApproval?.approverCorrectionNote}
                isAdmin={isAdmin}
                onDismiss={() => handleDismissApproverCorrection(gem._id)}
              />
            )}

            {/* {(canTest || (canApprove && isApproval)) && !isHelper ? ( */}
            {!isHelper ? (
              <Card className='p-6'>
                <form
                  onSubmit={handleSubmit(onSubmit)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") e.preventDefault()
                  }}
                  className='space-y-8'
                >
                  <GemAnalysisForm
                    form={form}
                    scientificFields={scientificFields}
                    identificationFields={identificationFields}
                    gradingFields={gradingFields}
                    textFields={textFields}
                  />
                  <GemFormActions
                    isSubmitting={isSubmitting}
                    isActionLoading={isActionLoading}
                    isValid={isValid}
                    showDraft={showDraftButton}
                    onDraft={handleDraft}
                  />
                </form>
              </Card>
            ) : (
              <GemWorkflowStatus gem={gem} />
            )}
          </div>
        </div>
      </div>

      <GemCropDialog
        files={pendingCropFiles}
        open={pendingCropFiles.length > 0}
        onComplete={handleCropComplete}
        onCancel={() => setPendingCropFiles([])}
      />
    </MainLayout>
  )
}
