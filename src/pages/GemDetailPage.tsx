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
import {
  analyzeGemPhotos,
  cropImageFile,
  type CropRect,
  type GemCropMeta,
  type PendingCrop,
} from "@/lib/gem-crop"
import { type Gem, type GemReference, type Customer, GEM_STATUSES, UserRole } from "@/lib/types"
import { GemTimeline } from "@/components/features/gems/GemTimeline"
import { GemIntakeAndHistory } from "@/components/features/gems/GemIntakeAndHistory"
import { GemDetailHeader } from "@/components/features/gems/GemDetailHeader"
import { GemWorkflowStatus } from "@/components/features/gems/GemWorkflowStatus"
import { GemAnalysisForm } from "@/components/features/gems/GemAnalysisForm"
import { GemWeightEditor } from "@/components/features/gems/GemWeightEditor"
import { ApproverCorrectionBanner } from "@/components/features/gems/ApproverCorrectionBanner"
import {
  StageAccessBanner,
  type StageAccessReason,
} from "@/components/features/gems/StageAccessBanner"
import { GemFormActions } from "@/components/features/gems/GemFormActions"
import { getFormFieldsConfig } from "@/components/shared/common/Formfieldsconfig"
import {
  addCustomOption,
  getCustomValues,
  type CustomDropdownField,
} from "@/lib/customDropdownOptions"
import { makeFormDefaults } from "@/lib/validations/gemFormDefaults"
import {
  type SearchSetters,
  mapSourceToFormValues,
  mergeNameOptions,
  syncSearchStates,
  resolveSubmitStatus,
  resolveActiveStage,
  resolveViewStage,
} from "@/lib/gemFormUtils"

export function GemDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const {
    user,
    gems,
    species: globalSpecies,
    varieties: globalVarieties,
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
  // A stage has been written once it has an owner — every save stamps testerId.
  const hasSubmittedT1 = !!gemDetail?.test1?.testerId
  const hasSubmittedT2 = !!gemDetail?.test2?.testerId
  // const canApprove = isAdmin
  const approverCorrectionActive = gemDetail?.finalApproval?.approverCorrectionRequested === true

  const stageAccess = { isAdmin, isTester, isT1, isT2, isAssignedT1, isAssignedT2 }

  // Two separate questions, and running them together is what let a submitted analysis
  // be rewritten after the next stage had already read it. activeStage is the one stage
  // this user may save to; viewStage is the one whose record the form shows, which
  // includes a tester's own work after they have handed the stone on.
  const activeStage = resolveActiveStage(stageAccess)
  const canWrite = activeStage !== null
  const viewStage = resolveViewStage({ ...stageAccess, hasSubmittedT1, hasSubmittedT2 })

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
  const [pendingCrops, setPendingCrops] = useState<PendingCrop[]>([])
  const [customer, setCustomer] = useState<Customer | null>(null)
  const [, setCustomOptTick] = useState(0)
  // Re-fetching the gem after a weight save would reset the analysis form and lose
  // whatever is being typed, so the saved value is patched in locally instead.
  const [savedWeight, setSavedWeight] = useState<number | null>(null)
  // Submitting and drafting used to fail silently or throw only to the console, which is
  // why a full, valid form could look like it was doing nothing at all.
  const [formError, setFormError] = useState<string | null>(null)

  const makeOptionAdder =
    (field: CustomDropdownField) => (value: string) => {
      addCustomOption(field, value)
      setCustomOptTick((t) => t + 1)
    }

  // Species and variety already have a lab-wide list behind them, so only a name that
  // list does not hold is worth keeping in this browser. Remembering the rest would just
  // be a second copy of the reference table sitting in local storage.
  const rememberIfNew =
    (field: CustomDropdownField, known: string[]) => (value: string) => {
      const trimmed = value.trim()
      if (!trimmed || known.some((name) => name.toLowerCase() === trimmed.toLowerCase())) return
      addCustomOption(field, trimmed)
      setCustomOptTick((t) => t + 1)
    }

  // ── Derived data ────────────────────────────────────────────────────────
  // Species and variety are free text: a stone the reference table does not cover still
  // has to be named. So each list offers the lab-wide history the API returns *and*
  // whatever has been typed in this browser since — that second half is what makes a
  // name entered a minute ago suggestable before it has been saved and fetched back.
  const speciesOptions = mergeNameOptions(globalSpecies, getCustomValues("species"))
  const varietyOptions = mergeNameOptions(globalVarieties, getCustomValues("variety"))
  const filteredSpecies = speciesOptions.filter((s) =>
    s.toLowerCase().includes(speciesSearch.toLowerCase()),
  )
  const filteredVarieties = varietyOptions.filter((v) =>
    v.toLowerCase().includes(varietySearch.toLowerCase()),
  )

  // ── Form ────────────────────────────────────────────────────────────────
  const form = useForm<TestFormValues>({
    resolver: zodResolver(testSchema) as any,
    defaultValues: makeFormDefaults(),
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
  const watchedHardness = watch("hardness")
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

  const fields = getFormFieldsConfig(
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
      onAddSpeciesOption: rememberIfNew("species", globalSpecies),
      onAddVarietyOption: rememberIfNew("variety", globalVarieties),
      onAddCuttingShapeOption: makeOptionAdder("cuttingShape"),
      onAddCrownStyleOption: makeOptionAdder("crownStyle"),
      onAddPavilionStyleOption: makeOptionAdder("pavilionStyle"),
      onAddColourOption: makeOptionAdder("colour"),
    },
  )

  // ── Effects ─────────────────────────────────────────────────────────────

  // Populate the form when the full gem detail loads or the viewed stage changes.
  // For Approval stage: always use finalApproval data only.
  // The approver must manually copy from Tester 1 or Tester 2 — no auto pre-fill.
  useEffect(() => {
    if (!gemDetail) return
    const activeData: any =
      viewStage === "test1"
        ? gemDetail.test1
        : viewStage === "test2"
          ? gemDetail.test2
          : viewStage === "finalApproval"
            ? gemDetail.finalApproval
            : null
    // Gems that bypassed testing have no Test 1 / Test 2 data to copy from, so
    // seed the approval form straight from the intake record.
    if (!activeData && gemDetail.skipTesting && isApproval) {
      const seeded = makeFormDefaults()
      seeded.itemDescription = gemDetail.itemDescription || ""
      seeded.colour = gemDetail.color || ""
      seeded.weight = gemDetail.weight == null ? "" : String(gemDetail.weight)
      reset(seeded)
      syncSearchStates(seeded, searchSetters)
      return
    }

    if (!activeData) return

    // Only the approval is seeded from the gem's latest colour and weight. Testers get
    // no seed, so neither tester's reading pre-fills the other's form.
    const values = mapSourceToFormValues(
      activeData,
      viewStage === "finalApproval" ? { colour: gemDetail.color, weight: gemDetail.weight } : {},
    )
    if (!values.itemDescription) values.itemDescription = gemDetail.itemDescription || ""

    reset(values)
    syncSearchStates(values, searchSetters)
  }, [gemDetail, viewStage, isApproval, reset])

  useEffect(() => {
    if (!gem?.customerId) return
    customersApi.getCustomer(gem.customerId).then(setCustomer).catch(console.error)
  }, [gem?.customerId])

  useEffect(() => {
    if (!id) return
    setDetailLoading(true)
    setSavedWeight(null)
    getGemById(id)
      .then(setGemDetail)
      .catch(console.error)
      .finally(() => setDetailLoading(false))
  }, [id, detailVersion, getGemById])

  // Auto-suggestion based on scientific measurements.
  useEffect(() => {
    if (!watchedRiMin && !watchedRiMax && !watchedSg && !watchedHardness) {
      setSuggestions([])
      return
    }
    referencesApi
      .searchReferences(watchedRiMin, watchedRiMax, watchedSg, watchedHardness)
      .then(setSuggestions)
      .catch((err) => console.error("Failed to get suggestions:", err))
  }, [watchedRiMin, watchedRiMax, watchedSg, watchedHardness])

  // ── Handlers ────────────────────────────────────────────────────────────

  const onSubmit: SubmitHandler<TestFormValues> = async (data) => {
    setFormError(null)
    if (!activeStage) {
      setFormError(
        "This gem is not assigned to you at its current stage, so there is nothing to submit. " +
          "Ask an admin to assign it to you or to move it to your stage.",
      )
      return
    }
    try {
      const status = resolveSubmitStatus(user?.role, isT1, isT2, !!gem!.assignedTester2)
      // An admin submitting closes the gem out through approval whatever stage it sits
      // at; a tester submits the stage they hold, which is the only one they can hold.
      if (isAdmin) {
        await handleApproval(gem!._id, data, status)
      } else {
        await handleTestSubmit(gem!._id, activeStage === "test2" ? "test2" : "test1", data, status)
      }
      navigate("/queue")
    } catch (error) {
      console.error("Failed to submit:", error)
      setFormError(error instanceof Error ? error.message : "Failed to submit the analysis.")
    }
  }

  const handleDraft = async () => {
    setFormError(null)
    if (!activeStage) {
      setFormError("This gem is not assigned to you at its current stage, so there is no draft to save.")
      return
    }
    try {
      setIsActionLoading(true)
      const data = watch()
      // The draft goes to the stage this user owns. Deriving it from the gem's status
      // instead sent a tester's draft to the admin-only approval endpoint, and could
      // write Test 1's work into the Test 2 record.
      const status =
        activeStage === "finalApproval"
          ? GEM_STATUSES.DRAFT_APPROVAL
          : activeStage === "test1"
            ? GEM_STATUSES.DRAFT_TEST_1
            : GEM_STATUSES.DRAFT_TEST_2
      await handleSaveDraft(gem!._id, activeStage, data, status)
      setDetailVersion((v) => v + 1)
    } catch (error) {
      console.error("Failed to save draft:", error)
      setFormError(error instanceof Error ? error.message : "Failed to save the draft.")
    } finally {
      setIsActionLoading(false)
    }
  }

  /** Crops each photo to its detected outline, then compresses and uploads it. */
  const uploadCroppedImages = async (
    jobs: Array<{ file: File; rect: CropRect; meta: GemCropMeta }>,
  ) => {
    if (jobs.length === 0 || !gem) return
    setIsActionLoading(true)
    try {
      const newImageIds = await Promise.all(
        jobs.map(async ({ file, rect, meta }) => {
          const cropped = await cropImageFile(file, rect)
          const compressed = await compressImage(cropped, 30)
          const uploaded = await uploadImage({
            file: compressed,
            category: "gem",
            metadata: { gemId: gem.gemId, gemCrop: meta },
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

  // Photos are cropped to the gem outline automatically. The review dialog only opens
  // for the ones detection wasn't confident about — a clean shot never interrupts.
  const handleImageUpdate = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    // Let the same file be picked again after a cancel.
    const picked = files ? Array.from(files) : []
    e.target.value = ""
    if (picked.length === 0 || !gem) return

    setIsActionLoading(true)
    let decision
    try {
      decision = await analyzeGemPhotos(picked)
    } finally {
      setIsActionLoading(false)
    }
    await uploadCroppedImages(decision.auto)
    setPendingCrops(decision.review)
  }

  const handleCropComplete = async (results: CropResult[]) => {
    const queued = pendingCrops
    setPendingCrops([])
    await uploadCroppedImages(
      results.map((result, i) => ({ file: queued[i].file, rect: result.rect, meta: result.meta })),
    )
  }

  // "Copy from Tester 1 / Tester 2" at the approval stage: the tester's own colour and
  // weight come across with the rest of their findings, falling back to the gem's latest
  // for records written before the split.
  const copyValues = (source: any) => {
    const values = mapSourceToFormValues(source, {
      colour: gemDetail?.color,
      weight: gemDetail?.weight,
    })
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

  const intakeGem = gemDetail ?? gem
  const weight = savedWeight ?? intakeGem.weight
  // Colour belongs to the gem, and the analysis form is where it gets entered, so the
  // intake panel shows whatever the form holds rather than a second, stale value.
  const color = intakeGem.color

  const weightEditor = (
    <GemWeightEditor gemId={gem._id} weight={weight} onSaved={setSavedWeight} disabled={isDone} />
  )

  // Why the form is locked, when it is. A tester reading back their own submitted work
  // is a different situation from one waiting on a colleague, which is different again
  // from one waiting on the workflow — and only the first has anything filled in below.
  const lockReason: StageAccessReason | null = canWrite
    ? null
    : viewStage
      ? "submitted"
      : isTester && ((isT1 && !isAssignedT1) || (isT2 && !isAssignedT2))
        ? "assigned-elsewhere"
        : "not-your-stage"

  const showDraftButton =
    gem.status !== GEM_STATUSES.SUBMITTED_FOR_REPORT && gem.status !== GEM_STATUSES.DONE

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
            gem={{ ...intakeGem, weight, color }}
            user={user}
            customer={customer}
            suggestions={suggestions}
            watchedHardness={watchedHardness as string}
            onReset={reset}
            onWatch={watch}
            onSetSpeciesSearch={setSpeciesSearch}
            onSetVarietySearch={setVarietySearch}
            onImageUpdate={handleImageUpdate}
            onCopyValues={copyValues}
            onHandleRequestCorrection={handleRequestCorrection}
            isApproval={isApproval}
            canWrite={canWrite}
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

            {lockReason && !isHelper && <StageAccessBanner reason={lockReason} />}

            {!isHelper ? (
              <Card className='p-6'>
                <form
                  onSubmit={handleSubmit(onSubmit)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") e.preventDefault()
                  }}
                  className='space-y-8'
                >
                  <GemAnalysisForm form={form} fields={fields} disabled={!canWrite} />
                  {canWrite && (
                    <GemFormActions
                      isSubmitting={isSubmitting}
                      isActionLoading={isActionLoading}
                      isValid={isValid}
                      showDraft={showDraftButton}
                      error={formError}
                      onDraft={handleDraft}
                    />
                  )}
                </form>
              </Card>
            ) : (
              // Helpers don't get the analysis form, but they still own intake data.
              <div className='space-y-6'>
                {weightEditor}
                <GemWorkflowStatus gem={gem} />
              </div>
            )}
          </div>
        </div>
      </div>

      <GemCropDialog
        items={pendingCrops}
        open={pendingCrops.length > 0}
        onComplete={handleCropComplete}
        onCancel={() => setPendingCrops([])}
      />
    </MainLayout>
  )
}
