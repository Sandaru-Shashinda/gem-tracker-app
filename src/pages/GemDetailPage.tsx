import { useState, useEffect } from "react"
import { useForm, type SubmitHandler } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { testSchema, type TestFormValues } from "@/lib/validations/test"
import { useParams, useNavigate } from "react-router-dom"
import { Microscope, Search, ArrowLeft, ShieldCheck, Loader2 } from "lucide-react"
import { MainLayout } from "@/components/layout/MainLayout"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useGem } from "@/hooks/useGemStore"
import { gemsApi } from "@/lib/api/gems"
import { customersApi } from "@/lib/api/customers"
import { referencesApi } from "@/lib/api/references"
import { type GemReference, type Customer, type GemStatus, GEM_STATUSES } from "@/lib/types"
import { GemTimeline } from "@/components/features/gems/GemTimeline"
import { GemIntakeAndHistory } from "@/components/features/gems/GemIntakeAndHistory"
import { GemFinalAudit } from "@/components/features/gems/GemFinalAudit"
import { StatusBadge } from "@/components/shared/common/StatusBadge"
import { FormField } from "@/components/shared/common/FormField"
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
    handleOverride,
    handleSaveDraft,
    loading,
    refreshGems,
  } = useGem()
  const navigate = useNavigate()

  const gem = gems.find((g: any) => g._id === id)

  const {
    register,
    handleSubmit,
    control,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting, isValid },
  } = useForm<TestFormValues>({
    resolver: zodResolver(testSchema) as any,
    defaultValues: {},
    mode: "onChange",
  })

  // Watch fields for suggestions
  const watchedRi = watch("ri")
  const watchedSg = watch("sg")
  const watchedHardness = watch("hardness")

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
          shape: obs.shape || "",
          cut: obs.cut || "",
          clusterSize: obs.cluster || "",
          stoneSize: obs.stone || "",
          transparency: obs.transparency || "",
          origin: obs.origin || "",
          cuttingGrade: obs.cuttingGrade || "Fine",
          polishingGrade: obs.polishingGrade || "Fine",
          proportionGrade: obs.proportionGrade || "Fine",
          clarityGrade: obs.clarityGrade || "Fine",
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

      if (isApproval && canApprove) {
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
    const file = e.target.files?.[0]
    if (!file || !gem) return

    setIsActionLoading(true)
    try {
      const formData = new FormData()
      formData.append("image", file)
      await gemsApi.updateGem(gem._id, formData)
      await refreshGems()
    } catch (error) {
      console.error("Failed to update image:", error)
    } finally {
      setIsActionLoading(false)
    }
  }

  const handleOverrideRequest = async (gemId: string, status: string) => {
    setIsActionLoading(true)
    try {
      await handleOverride(gemId, status as GemStatus)
    } catch (error) {
      console.error("Override failed:", error)
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
      shape: obs.shape || "",
      cut: obs.cut || "",
      clusterSize: obs.cluster || "",
      stoneSize: obs.stone || "",
      transparency: obs.transparency || "",
      origin: obs.origin || "",
      cuttingGrade: obs.cuttingGrade || "Fine",
      polishingGrade: obs.polishingGrade || "Fine",
      proportionGrade: obs.proportionGrade || "Fine",
      clarityGrade: obs.clarityGrade || "Fine",
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
        <div className='flex items-center justify-between'>
          <div className='flex items-center gap-4'>
            <Button variant='outline' size='icon' onClick={() => navigate(-1)}>
              <ArrowLeft className='h-4 w-4' />
            </Button>
            <div>
              <h2 className='text-2xl font-bold text-slate-800'>Processing: {gem.gemId}</h2>
              <p className='text-sm text-slate-500'>
                Updated: {new Date(gem.updatedAt).toLocaleString()}
              </p>
            </div>
            <StatusBadge status={gem.status} />
          </div>
          {gem.status === GEM_STATUSES.DONE && (
            <Button
              variant='default'
              className='bg-emerald-600 hover:bg-emerald-700'
              onClick={() => navigate(`/reports/${gem._id}`)}
            >
              View Report Certificate
            </Button>
          )}
        </div>

        <Card className='p-8 bg-white shadow-sm border-slate-100 overflow-hidden'>
          <GemTimeline gem={gem} />
        </Card>

        <div className='grid grid-cols-1 lg:grid-cols-4 gap-6'>
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
            {((isT1 || isT2) && canTest) || (isApproval && canApprove) ? (
              <Card className='p-6'>
                <form onSubmit={handleSubmit(onSubmit)} className='space-y-8'>
                  <div className='grid grid-cols-1 md:grid-cols-2 gap-8'>
                    {/* Scientific Measurements Section */}
                    <div className='space-y-6'>
                      <h3 className='font-bold text-slate-900 flex items-center gap-2 border-b pb-2'>
                        <Microscope size={18} className='text-blue-600' /> Scientific Measurements
                      </h3>

                      {/* R.I., S.G., Hardness */}
                      <div className='grid grid-cols-3 gap-4'>
                        {scientificFields.slice(0, 3).map((field) => (
                          <FormField
                            key={field.name}
                            config={field}
                            register={register}
                            errors={errors}
                            control={control}
                            setValue={setValue}
                          />
                        ))}
                      </div>

                      {/* Shape and Cut */}
                      <div className='grid grid-cols-2 gap-4'>
                        {scientificFields.slice(3, 5).map((field) => (
                          <FormField
                            key={field.name}
                            config={field}
                            register={register}
                            errors={errors}
                            control={control}
                            setValue={setValue}
                          />
                        ))}
                      </div>

                      {/* Transparency */}
                      <FormField
                        config={scientificFields[5]}
                        register={register}
                        errors={errors}
                        control={control}
                        setValue={setValue}
                      />

                      {/* Cluster and Stone Size */}
                      <div className='grid grid-cols-2 gap-4'>
                        {scientificFields.slice(6, 8).map((field) => (
                          <FormField
                            key={field.name}
                            config={field}
                            register={register}
                            errors={errors}
                            control={control}
                            setValue={setValue}
                          />
                        ))}
                      </div>
                    </div>

                    {/* Identification & Grading Section */}
                    <div className='space-y-6'>
                      <h3 className='font-bold text-slate-900 flex items-center gap-2 border-b pb-2'>
                        <Search size={18} className='text-amber-600' /> Identification & Grading
                      </h3>

                      {/* Species and Variety */}
                      <div className='grid grid-cols-2 gap-4'>
                        {identificationFields.slice(0, 2).map((field) => (
                          <FormField
                            key={field.name}
                            config={field}
                            register={register}
                            errors={errors}
                            control={control}
                            setValue={setValue}
                          />
                        ))}
                      </div>

                      {/* Origin and Cutting Grade */}
                      <div className='grid grid-cols-2 gap-4'>
                        {identificationFields.slice(2, 4).map((field) => (
                          <FormField
                            key={field.name}
                            config={field}
                            register={register}
                            errors={errors}
                            control={control}
                            setValue={setValue}
                          />
                        ))}
                      </div>

                      {/* Polishing, Proportion, Clarity */}
                      <div className='grid grid-cols-3 gap-3'>
                        {gradingFields.map((field) => (
                          <FormField
                            key={field.name}
                            config={field}
                            register={register}
                            errors={errors}
                            control={control}
                            setValue={setValue}
                          />
                        ))}
                      </div>

                      {/* Text Fields */}
                      <div className='space-y-4'>
                        {textFields.map((field) => (
                          <FormField
                            key={field.name}
                            config={field}
                            register={register}
                            errors={errors}
                            control={control}
                            setValue={setValue}
                          />
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className='flex justify-end gap-4 pt-4 border-t'>
                    <Button
                      type='submit'
                      className='h-12 px-8 font-bold border-blue-200 text-blue-700 hover:bg-blue-50'
                      variant='outline'
                      disabled={isSubmitting || isActionLoading || !isValid}
                    >
                      {isSubmitting || isActionLoading ? (
                        <Loader2 className='animate-spin h-6 w-6' />
                      ) : isApproval ? (
                        "Finalize Certificate"
                      ) : (
                        "Submit Lab Analysis"
                      )}
                    </Button>
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

                    {user?.role === "ADMIN" && (
                      <div className='flex items-center gap-2 bg-red-50 px-4 rounded-lg border border-red-100'>
                        <ShieldCheck size={16} className='text-red-600' />
                        <Select
                          value={gem.status}
                          onValueChange={(value) => handleOverrideRequest(gem._id, value)}
                        >
                          <SelectTrigger className='h-8 text-[10px] w-28 bg-white border-blue-200 text-blue-700 font-bold'>
                            <SelectValue placeholder='Status' />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value={GEM_STATUSES.READY_FOR_T1}>RST T1</SelectItem>
                            <SelectItem value={GEM_STATUSES.READY_FOR_T2}>RST T2</SelectItem>
                            <SelectItem value={GEM_STATUSES.READY_FOR_APPROVAL}>RST APP</SelectItem>
                            <SelectItem value={GEM_STATUSES.DONE}>DONE</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>
                </form>
              </Card>
            ) : gem.status === GEM_STATUSES.DONE && user?.role === "ADMIN" ? (
              <GemFinalAudit
                gem={gem}
                onNavigateToReport={(id) => navigate(`/reports/${id}`)}
                onHandleOverride={handleOverrideRequest}
              />
            ) : (
              <div className='h-full min-h-[500px] flex flex-col items-center justify-center p-12 bg-white rounded-2xl border border-slate-200 shadow-sm'>
                <div className='w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-6'>
                  <Microscope className='text-slate-300' size={40} />
                </div>
                <h3 className='text-xl font-bold text-slate-800 mb-2'>
                  {gem.status === GEM_STATUSES.DONE ? "Workflow Finalized" : "Pending Next Stage"}
                </h3>
                <p className='text-slate-500 text-center max-w-sm'>
                  {gem.status === GEM_STATUSES.DONE ? (
                    "The scientific analysis is complete. You can view or print the official certificate above."
                  ) : (
                    <>
                      This record is currently in <StatusBadge status={gem.status} />. Please wait
                      for the assigned staff to complete their tasks.
                    </>
                  )}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </MainLayout>
  )
}
