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
import { type GemReference, type Customer, type GemStatus, GEM_STATUSES } from "@/lib/types"
import { GemTimeline } from "@/components/features/gems/GemTimeline"
import { GemIntakeAndHistory } from "@/components/features/gems/GemIntakeAndHistory"
import { GemDetailHeader } from "@/components/features/gems/GemDetailHeader"
import { GemWorkflowStatus } from "@/components/features/gems/GemWorkflowStatus"
import { GemAnalysisForm } from "@/components/features/gems/GemAnalysisForm"
import { getFormFieldsConfig } from "@/components/shared/common/Formfieldsconfig"

export function GemDetailPage() {
  const { id } = useParams<{ id: string }>()
  const {
    user,
    gems,
    references: globalReferences,
    species: globalSpecies,
    handleTestSubmit,
    handleRequestCorrection,
    handleApproval,
    handleSaveDraft,
    loading,
    refreshGems,
  } = useGem()
  const navigate = useNavigate()

  const gem = gems.find((g: any) => g._id === id)

  const form = useForm<TestFormValues>({
    resolver: zodResolver(testSchema) as any,
    defaultValues: {},
    mode: "onChange",
  })

  const {
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { isSubmitting, isValid },
  } = form

  // Watch fields for suggestions
  const watchedRi = watch("ri")
  const watchedSg = watch("sg")
  const watchedHardness = watch("hardness")
  const watchedSpecies = watch("species")

  const [speciesSearch, setSpeciesSearch] = useState("")
  const [showSpeciesList, setShowSpeciesList] = useState(false)
  const [varietySearch, setVarietySearch] = useState("")
  const [showVarietyList, setShowVarietyList] = useState(false)
  const [suggestions, setSuggestions] = useState<GemReference[]>([])
  const [isActionLoading, setIsActionLoading] = useState(false)
  const [customer, setCustomer] = useState<Customer | null>(null)

  const filteredSpecies = globalSpecies.filter((s) =>
    s.toLowerCase().includes(speciesSearch.toLowerCase()),
  )

  const filteredVarieties = globalReferences.filter((r) =>
    r.variety.toLowerCase().includes(varietySearch.toLowerCase()),
  )

  const isHelper = user?.role === "HELPER"
  const isAdmin = user?.role === "ADMIN"

  const isT1 =
    gem?.status === GEM_STATUSES.READY_FOR_T1 || gem?.status === GEM_STATUSES.DRAFT_TEST_1
  const isT2 =
    gem?.status === GEM_STATUSES.READY_FOR_T2 || gem?.status === GEM_STATUSES.DRAFT_TEST_2
  const isApproval =
    gem?.status === GEM_STATUSES.READY_FOR_APPROVAL || gem?.status === GEM_STATUSES.DRAFT_APPROVAL

  // Get form fields configuration
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
    },
  )

  useEffect(() => {
    if (gem) {
      const activeData = isT1 ? gem.test1 : isT2 ? gem.test2 : gem.finalApproval
      if (activeData) {
        const obs = (activeData as any).observations || (activeData as any).finalObservations || {}
        reset({
          ri: activeData.ri?.toString() || "",
          sg: activeData.sg?.toString() || "",
          hardness: activeData.hardness?.toString() || "",
          species: obs.species || "",
          selectedVariety:
            (activeData as any).selectedVariety ||
            (activeData as any).finalVariety ||
            obs.variety ||
            "",
          comments: obs.comments || "",
          itemDescription:
            obs.itemDescription || (activeData as any).itemDescription || gem.itemDescription || "",
          specialNote: obs.specialNote || "",
          cuttingShape: obs.cuttingShape || obs.shape || "",
          cuttingStyle: obs.cuttingStyle || obs.cut || "",
          messurementX: obs.messurementX?.toString() || "",
          messurementY: obs.messurementY?.toString() || "",
          messurementZ: obs.messurementZ?.toString() || "",
          transparency: obs.transparency || "",
          origin: obs.origin || "",
          cuttingGrade: Number(obs.cuttingGrade) || 0,
          polishingGrade: obs.polishingGrade || "Fine",
          proportionGrade: obs.proportionGrade || "Fine",
          clarityGrade: obs.clarityGrade || "Fine",
          grade: obs.grade || "",
          spectroscopy: obs.spectroscopy || "",
          colour: obs.colour || "",
          colourGrade: obs.colourGrade || 0,
        })
        if (obs.species) {
          setSpeciesSearch(obs.species)
        }
        const currentVariety =
          (activeData as any).selectedVariety ||
          (activeData as any).finalVariety ||
          obs.variety ||
          ""
        if (currentVariety) {
          setVarietySearch(currentVariety)
        }
      }
    }
  }, [gem, isT1, isT2, reset])

  useEffect(() => {
    if (gem?.customerId) {
      customersApi.getCustomer(gem.customerId).then(setCustomer).catch(console.error)
    }
  }, [gem?.customerId])

  // Auto-suggestion Logic
  useEffect(() => {
    const getSuggestions = async () => {
      if (watchedRi || watchedSg || watchedHardness) {
        try {
          const matches = await referencesApi.searchReferences(
            watchedRi,
            watchedSg,
            watchedHardness,
          )
          setSuggestions(matches)
        } catch (err) {
          console.error("Failed to get suggestions:", err)
        }
      } else {
        setSuggestions([])
      }
    }
    getSuggestions()
  }, [watchedRi, watchedSg, watchedHardness])

  if (loading && !gem) {
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

  const canTest = user?.role === "TESTER" || user?.role === "ADMIN"
  const canApprove = user?.role === "ADMIN"

  const onSubmit: SubmitHandler<TestFormValues> = async (data) => {
    try {
      let status: GemStatus
      if (user?.role === "ADMIN") {
        status = GEM_STATUSES.SUBMITTED_FOR_REPORT
      } else if (isT1) {
        status = GEM_STATUSES.READY_FOR_T2
      } else if (isT2) {
        status = GEM_STATUSES.READY_FOR_APPROVAL
      } else {
        status = GEM_STATUSES.SUBMITTED_FOR_REPORT
      }

      if (isAdmin) {
        await handleApproval(gem!._id, data, status)
        navigate("/queue")
      } else if (canTest) {
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
      const data = watch() // Get current form values
      const stage = isApproval ? "finalApproval" : isT1 ? "test1" : "test2"
      const status = isApproval
        ? GEM_STATUSES.DRAFT_APPROVAL
        : isT1
          ? GEM_STATUSES.DRAFT_TEST_1
          : GEM_STATUSES.DRAFT_TEST_2
      await handleSaveDraft(gem!._id, stage, data, status)
    } catch (error) {
      console.error("Failed to save draft:", error)
    } finally {
      setIsActionLoading(false)
    }
  }

  const handleImageUpdate = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0 || !gem) return

    setIsActionLoading(true)
    try {
      const uploadPromises = Array.from(files).map(async (file) => {
        const compressedImage = await compressImage(file, 30)
        const uploadedImage = await uploadImage({
          file: compressedImage,
          category: "gem",
          metadata: { gemId: gem.gemId },
        })
        return uploadedImage._id
      })

      const newImageIds = await Promise.all(uploadPromises)
      await gemsApi.addGemImages(gem._id, newImageIds)
      await refreshGems()
    } catch (error) {
      console.error("Failed to update images:", error)
    } finally {
      setIsActionLoading(false)
    }
  }

  const copyValues = (source: any) => {
    const obs = source.observations || source.finalObservations || {}
    const newValues = {
      ri: source.ri?.toString() || "",
      sg: source.sg?.toString() || "",
      hardness: source.hardness?.toString() || "",
      cuttingShape: obs.cuttingShape || obs.shape || "",
      cuttingStyle: obs.cuttingStyle || obs.cut || "",
      messurementX: obs.messurementX?.toString() || "",
      messurementY: obs.messurementY?.toString() || "",
      messurementZ: obs.messurementZ?.toString() || "",
      transparency: obs.transparency || "",
      origin: obs.origin || "",
      cuttingGrade: Number(obs.cuttingGrade) || 0,
      polishingGrade: obs.polishingGrade || "Fine",
      proportionGrade: obs.proportionGrade || "Fine",
      clarityGrade: obs.clarityGrade || "Fine",
      grade: obs.grade || "",
      spectroscopy: obs.spectroscopy || "",
      colour: obs.colour || "",
      colourGrade: obs.colourGrade || 0,
      species: obs.species || "",
      selectedVariety: source.selectedVariety || source.finalVariety || obs.variety || "",
      comments: obs.comments || "",
      itemDescription: obs.itemDescription || source.itemDescription || "",
      specialNote: obs.specialNote || "",
    }
    reset(newValues)
    setSpeciesSearch(obs.species || "")
    setVarietySearch(source.selectedVariety || source.finalVariety || obs.variety || "")
  }

  return (
    <MainLayout>
      <div className='space-y-6'>
        <GemDetailHeader gem={gem} />

        <Card className='p-8 bg-white shadow-sm border-slate-100 overflow-hidden'>
          <GemTimeline gem={gem} />
        </Card>

        <div className='grid grid-cols-1 lg:grid-cols-5 gap-6'>
          <GemIntakeAndHistory
            gem={gem}
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
          />

          {/* Main Column */}
          <div className='lg:col-span-3'>
            {(isT1 || isT2 || canApprove) && !isHelper ? (
              <Card className='p-6'>
                <form onSubmit={handleSubmit(onSubmit)} className='space-y-8'>
                  <GemAnalysisForm
                    form={form}
                    scientificFields={scientificFields}
                    identificationFields={identificationFields}
                    gradingFields={gradingFields}
                    textFields={textFields}
                  />

                  <div className='flex justify-end gap-4 pt-4 border-t'>
                    <Button
                      type='submit'
                      className='h-12 px-8 font-bold border-blue-200 text-blue-700 hover:bg-blue-50'
                      variant='outline'
                      disabled={isSubmitting || isActionLoading || !isValid}
                    >
                      {isSubmitting || isActionLoading ? (
                        <Loader2 className='animate-spin h-6 w-6' />
                      ) : (
                        "Submit Lab Analysis"
                      )}
                    </Button>
                    {gem?.status !== GEM_STATUSES.SUBMITTED_FOR_REPORT &&
                      gem?.status !== GEM_STATUSES.DONE && (
                        <Button
                          type='button'
                          variant='outline'
                          className='h-12 px-8 font-bold border-blue-200 text-blue-700 hover:bg-blue-50'
                          onClick={handleDraft}
                          disabled={isSubmitting || isActionLoading}
                        >
                          {isActionLoading ? (
                            <Loader2 className='animate-spin h-5 w-5' />
                          ) : (
                            "Save Draft"
                          )}
                        </Button>
                      )}
                  </div>
                </form>
              </Card>
            ) : (
              <GemWorkflowStatus gem={gem} />
            )}
          </div>
        </div>
      </div>
    </MainLayout>
  )
}
