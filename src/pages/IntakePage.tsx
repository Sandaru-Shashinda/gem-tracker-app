import { useState, useEffect, useRef } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { Notebook, Plus, ArrowLeft, Loader2, X, Eye } from "lucide-react"
import { MainLayout } from "@/components/layout/MainLayout"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Checkbox } from "@/components/ui/checkbox"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Textarea } from "../components/ui/textarea"
import { BASE_URL } from "@/lib/api/config"
import { useGem } from "@/hooks/useGemStore"
import { usersApi } from "@/lib/api/users"
import { customersApi } from "@/lib/api/customers"
import { gemsApi } from "@/lib/api/gems"
import { type User, type Customer, GEM_STATUSES, UserRole } from "@/lib/types"
import { useForm, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { intakeSchema, type IntakeFormValues } from "@/lib/validations/intake"
import { getImageById, deleteImage } from "@/lib/api/images"

export function IntakePage() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const { handleIntake, getGemById } = useGem()

  const [images, setImages] = useState<File[]>([])
  const [previews, setPreviews] = useState<string[]>([])
  const [existingImageIds, setExistingImageIds] = useState<string[]>([])
  const [existingImagePreviews, setExistingImagePreviews] = useState<string[]>([])
  const [selectedImage, setSelectedImage] = useState<string | null>(null)
  const [deleteImageIndex, setDeleteImageIndex] = useState<number | null>(null)

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoading, setIsLoading] = useState(!!id)
  const [isImageLoading, setIsImageLoading] = useState(false)
  const [testers, setTesters] = useState<User[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [suggestedGrc, setSuggestedGrc] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    control,
    setValue,
    formState: { errors, isValid },
    reset,
    getValues,
  } = useForm<IntakeFormValues>({
    resolver: zodResolver(intakeSchema) as any,
    defaultValues: {
      gemId: "",
      weight: 0,
      color: "",
      itemDescription: "",
      customerId: "",
      testerId1: "",
      testerId2: "",
      reportTypes: [],
    },
    mode: "onChange",
  })

  // Track initialization to prevent duplicate calls (especially in Strict Mode)
  // IMPORTANT: Use a unique sentinel (not undefined) so the initial check doesn't
  // accidentally match when id is also undefined (new intake form).
  const lastInitializedId = useRef<string | null | undefined>(null)

  useEffect(() => {
    // If we've already initialized for this specific ID (or lack thereof), skip
    if (lastInitializedId.current === id) return
    lastInitializedId.current = id

    const initializePage = async () => {
      // Always fetch testers and customers
      try {
        const [users, customersData] = await Promise.all([
          usersApi.getUsers(UserRole.TESTER),
          customersApi.getCustomers(1, 100),
        ])
        setTesters(users)
        setCustomers(customersData.customers)
      } catch (err) {
        console.error("Failed to fetch initial data:", err)
      }

      // If new intake, fetch last GRC for suggestion
      if (!id) {
        try {
          const { gemId: lastGemId } = await gemsApi.getLastGrc()
          setSuggestedGrc(lastGemId)
        } catch (err) {
          console.error("Failed to fetch last GRC:", err)
        }
      }

      // If editing, fetch gem details
      if (id) {
        setIsLoading(true)
        try {
          const gem = await getGemById(id)
          reset({
            gemId: gem.gemId || "",
            weight: gem.weight || 0,
            color: gem.color || "",
            itemDescription: gem.itemDescription || "",
            customerId:
              (gem.customerId as any)?._id || (gem.customerId as any)?.id || gem.customerId || "",
            testerId1:
              (gem.assignedTester1 as any)?._id ||
              (gem.assignedTester1 as any)?.id ||
              gem.assignedTester1 ||
              "",
            testerId2:
              (gem.assignedTester2 as any)?._id ||
              (gem.assignedTester2 as any)?.id ||
              gem.assignedTester2 ||
              "",
            reportTypes: gem.reportTypes || [],
          })

          const gemImageIds = gem.images && gem.images.length > 0 ? gem.images : []
          setExistingImageIds(gemImageIds)

          if (gemImageIds.length > 0) {
            setIsImageLoading(true)
            try {
              const imgPromises = gemImageIds.map((imgId: string) => getImageById(imgId))
              const imgsData = await Promise.all(imgPromises)
              setExistingImagePreviews(imgsData.map((img) => img.url))
            } catch (err) {
              console.error("Failed to fetch image previews:", err)
            } finally {
              setIsImageLoading(false)
            }
          } else if (gem.imageUrl) {
            setExistingImagePreviews([
              gem.imageUrl.startsWith("http") ? gem.imageUrl : `${BASE_URL}${gem.imageUrl}`,
            ])
          }
        } catch (err) {
          console.error("Failed to fetch gem for editing:", err)
        } finally {
          setIsLoading(false)
        }
      } else {
        setIsLoading(false)
      }
    }

    initializePage()
  }, [id, reset, getGemById])

  // Handle image change
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      const newFiles = Array.from(files)
      setImages((prev) => [...prev, ...newFiles])

      newFiles.forEach((file) => {
        const reader = new FileReader()
        reader.onloadend = () => {
          setPreviews((prev) => [...prev, reader.result as string])
        }
        reader.readAsDataURL(file)
      })
    }
  }

  const removeNewImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index))
    setPreviews((prev) => prev.filter((_, i) => i !== index))
  }

  const removeExistingImage = (index: number) => {
    setDeleteImageIndex(index)
  }

  const handleConfirmDelete = async () => {
    if (deleteImageIndex === null) return
    const imageId = existingImageIds[deleteImageIndex]
    if (!imageId) return

    setIsImageLoading(true)
    try {
      await deleteImage(imageId)
      setExistingImageIds((prev) => prev.filter((_, i) => i !== deleteImageIndex))
      setExistingImagePreviews((prev) => prev.filter((_, i) => i !== deleteImageIndex))
    } catch (err) {
      console.error("Failed to delete image:", err)
      alert("Failed to delete image from database")
    } finally {
      setIsImageLoading(false)
      setDeleteImageIndex(null)
    }
  }

  // Handle form submission
  const onSubmit = async (data: IntakeFormValues) => {
    setIsSubmitting(true)
    try {
      await handleIntake(
        { ...data, status: GEM_STATUSES.READY_FOR_T1 },
        images,
        id,
        existingImageIds,
      )
      navigate("/queue")
    } catch (error) {
      console.error("Failed to intake gem:", error)
    } finally {
      setIsSubmitting(false)
    }
  }

  // Save as draft
  const handleDraftList = async (e: React.MouseEvent) => {
    e.preventDefault()
    const values = getValues()
    const hasValue =
      Object.values(values).some((v) => v !== "" && v !== undefined && v !== null) ||
      images.length > 0

    if (!hasValue) {
      console.warn("Cannot save empty draft. Please fill at least one field or upload an image.")
      return
    }

    setIsSubmitting(true)
    try {
      await handleIntake(
        {
          ...values,
          status: GEM_STATUSES.DRAFT_INTAKE,
        },
        images,
        id,
        existingImageIds,
      )
      navigate("/queue")
    } catch (error) {
      console.error("Failed to draft gem:", error)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <MainLayout>
      <div className='max-w-6xl mx-auto space-y-6'>
        <div className='flex items-center gap-4 mb-8 justify-center relative'>
          <Button
            variant='outline'
            size='icon'
            onClick={() => navigate(-1)}
            className='absolute left-0 rounded-full shadow-sm'
          >
            <ArrowLeft size={20} />
          </Button>
          <h2 className='text-3xl font-bold text-slate-800'>
            {id ? "Edit Gem Intake" : "New Gem Intake"}
          </h2>
        </div>
        <Card className='p-8 shadow-xl border-slate-200/60'>
          {isLoading ? (
            <div className='flex flex-col items-center justify-center py-24 space-y-4'>
              <Loader2 className='w-12 h-12 animate-spin text-blue-600' />
              <p className='text-slate-500 font-medium animate-pulse'>Fetching gem details...</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className='space-y-8'>
              <div className='grid grid-cols-1 lg:grid-cols-2 gap-12'>
                {/* Left Column: Gem Details */}
                <div className='space-y-6'>
                  <h3 className='text-lg font-bold text-slate-800 border-b-2 border-slate-100 pb-3 flex items-center gap-2'>
                    <div className='w-1 h-6 bg-blue-600 rounded-full' />
                    Gem Details
                  </h3>

                  <div className='space-y-2'>
                    <label className='text-[11px] font-black uppercase text-slate-400 tracking-wider'>
                      GRC Number
                    </label>
                    <Input
                      type='text'
                      placeholder='e.g. GRC-2026-04-00001'
                      className='bg-slate-50 border-slate-200 h-11 focus:bg-white transition-colors font-mono'
                      readOnly={!!id}
                      {...register("gemId")}
                    />
                    {errors.gemId && (
                      <p className='text-xs text-red-500 font-medium'>{errors.gemId.message}</p>
                    )}
                    {!id && suggestedGrc && (
                      <p className='text-xs text-slate-400 flex'>
                        Last GRC No:{" "}
                        <p className='font-mono text-blue-500 hover:text-blue-700 hover:underline ml-2'>
                          {suggestedGrc}
                        </p>{" "}
                      </p>
                    )}
                  </div>

                  <div className='space-y-2'>
                    <label className='text-[11px] font-black uppercase text-slate-400 tracking-wider'>
                      Weight
                    </label>
                    <Input
                      type='number'
                      step='0.001'
                      placeholder='14.36'
                      className='bg-slate-50 border-slate-200 h-11 focus:bg-white transition-colors'
                      {...register("weight")}
                    />
                    {errors.weight && (
                      <p className='text-xs text-red-500 font-medium'>{errors.weight.message}</p>
                    )}
                  </div>

                  <div className='space-y-2'>
                    <label className='text-[11px] font-black uppercase text-slate-400 tracking-wider'>
                      Color
                    </label>
                    <Input
                      type='text'
                      placeholder='e.g. Blue'
                      className='bg-slate-50 border-slate-200 h-11 focus:bg-white transition-colors'
                      {...register("color")}
                    />
                    {errors.color && (
                      <p className='text-xs text-red-500 font-medium'>{errors.color.message}</p>
                    )}
                  </div>

                  <div className='space-y-2'>
                    <label className='text-[11px] font-black uppercase text-slate-400 tracking-wider'>
                      Item Description
                    </label>
                    <Controller
                      name='itemDescription'
                      control={control}
                      render={({ field }) => (
                        <Textarea
                          placeholder='e.g. One Yellow Gold & Platinum Ring set with One Natural Blue Sapphire & many small Diamonds.'
                          {...field}
                          className='min-h-[120px] bg-slate-50 border-slate-200 focus:bg-white transition-colors resize-none'
                        />
                      )}
                    />
                    {errors.itemDescription && (
                      <p className='text-xs text-red-500 font-medium'>
                        {errors.itemDescription.message}
                      </p>
                    )}
                  </div>

                  <div className='space-y-2'>
                    <label className='text-[11px] font-black uppercase text-slate-400 tracking-wider'>
                      Gem Image
                    </label>
                    <div className='group relative'>
                      <Input
                        type='file'
                        accept='image/*'
                        multiple
                        onChange={handleImageChange}
                        className='cursor-pointer bg-slate-50 border-slate-200 h-11 file:bg-blue-50 file:text-blue-600 file:border-0 file:rounded-md file:px-3 file:mr-4 file:h-full hover:file:bg-blue-100'
                      />
                    </div>
                    {isImageLoading ? (
                      <div className='mt-4 flex flex-col items-center justify-center aspect-video w-full rounded-xl border-2 border-dashed border-slate-200 bg-slate-50/50'>
                        <Loader2 className='w-8 h-8 animate-spin text-blue-500' />
                        <p className='text-xs text-slate-400 mt-2 font-medium'>Loading images...</p>
                      </div>
                    ) : (
                      (existingImagePreviews.length > 0 || previews.length > 0) && (
                        <div className='mt-4 grid grid-cols-2 sm:grid-cols-3 gap-3'>
                          {existingImagePreviews.map((preview, idx) => (
                            <div
                              key={`existing-${idx}`}
                              className='group relative aspect-square rounded-lg border border-slate-200 overflow-hidden bg-slate-50'
                            >
                              <img src={preview} className='w-full h-full object-cover' alt='' />
                              <div className='absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2'>
                                <button
                                  type='button'
                                  onClick={() => setSelectedImage(preview)}
                                  className='p-1.5 bg-white rounded-full text-slate-700 hover:text-blue-600 shadow-sm'
                                >
                                  <Eye size={14} />
                                </button>
                                <button
                                  type='button'
                                  onClick={() => removeExistingImage(idx)}
                                  className='p-1.5 bg-white rounded-full text-slate-700 hover:text-red-600 shadow-sm'
                                >
                                  <X size={14} />
                                </button>
                              </div>
                            </div>
                          ))}
                          {previews.map((preview, idx) => (
                            <div
                              key={`new-${idx}`}
                              className='group relative aspect-square rounded-lg border border-blue-100 overflow-hidden bg-blue-50/30'
                            >
                              <img src={preview} className='w-full h-full object-cover' alt='' />
                              <div className='absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2'>
                                <button
                                  type='button'
                                  onClick={() => setSelectedImage(preview)}
                                  className='p-1.5 bg-white rounded-full text-slate-700 hover:text-blue-600 shadow-sm'
                                >
                                  <Eye size={14} />
                                </button>
                                <button
                                  type='button'
                                  onClick={() => removeNewImage(idx)}
                                  className='p-1.5 bg-white rounded-full text-slate-700 hover:text-red-600 shadow-sm'
                                >
                                  <X size={14} />
                                </button>
                              </div>
                              <div className='absolute top-1 left-1 bg-blue-500 text-[8px] font-bold text-white px-1 rounded'>
                                NEW
                              </div>
                            </div>
                          ))}
                        </div>
                      )
                    )}
                  </div>
                </div>

                {/* Right Column: Workflow Assignment */}
                <div className='space-y-6'>
                  <h3 className='text-lg font-bold text-slate-800 border-b-2 border-slate-100 pb-3 flex items-center gap-2'>
                    <div className='w-1 h-6 bg-purple-600 rounded-full' />
                    Workflow Assignment
                  </h3>

                  <div className='space-y-3'>
                    <label className='text-[11px] font-black uppercase text-slate-400 tracking-wider'>
                      Customer
                    </label>
                    <Controller
                      name='customerId'
                      control={control}
                      render={({ field }) => (
                        <Select onValueChange={field.onChange} value={field.value || undefined}>
                          <SelectTrigger className='w-full bg-slate-50 border-slate-200 h-11 focus:bg-white transition-colors'>
                            <SelectValue placeholder='Select a customer...' />
                          </SelectTrigger>
                          <SelectContent>
                            {customers.map((customer) => (
                              <SelectItem key={customer._id} value={customer._id}>
                                <div className='flex flex-col'>
                                  <span className='font-bold'>{customer.customerName}</span>
                                  <span className='text-[10px] text-slate-400'>
                                    {customer.companyName}
                                  </span>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                    {errors.customerId && (
                      <p className='text-xs text-red-500 font-medium'>
                        {errors.customerId.message}
                      </p>
                    )}
                  </div>

                  <div className='space-y-3 pt-2'>
                    <label className='text-[11px] font-black uppercase text-slate-400 tracking-wider'>
                      Report Types
                    </label>
                    <div className='flex flex-wrap gap-4 p-4 bg-slate-50 rounded-xl border border-slate-100'>
                      {["small", "medium", "large", "verbal"].map((type) => (
                        <Controller
                          key={type}
                          name='reportTypes'
                          control={control}
                          render={({ field }) => (
                            <div className='flex items-center space-x-2'>
                              <Checkbox
                                id={`report-type-${type}`}
                                checked={field.value?.includes(type)}
                                onCheckedChange={(checked) => {
                                  const current = field.value || []
                                  const updated = checked
                                    ? [...current, type]
                                    : current.filter((t: string) => t !== type)
                                  field.onChange(updated)
                                }}
                              />
                              <label
                                htmlFor={`report-type-${type}`}
                                className='text-sm capitalize font-bold text-slate-700 cursor-pointer'
                              >
                                {type}
                              </label>
                            </div>
                          )}
                        />
                      ))}
                    </div>
                    {errors.reportTypes && (
                      <p className='text-xs text-red-500 font-medium'>
                        {errors.reportTypes.message}
                      </p>
                    )}
                  </div>

                  <div className='space-y-6 pt-4'>
                    <div className='space-y-3'>
                      <label className='text-[11px] font-black uppercase text-blue-600 tracking-wider flex items-center gap-2'>
                        Tester 1 (Initial Analysis)
                      </label>
                      <Controller
                        name='testerId1'
                        control={control}
                        render={({ field }) => (
                          <Select onValueChange={field.onChange} value={field.value || undefined}>
                            <SelectTrigger className='w-full bg-blue-50/50 border-blue-100 h-12 focus:bg-white transition-colors'>
                              <SelectValue placeholder='Assign Tester 1...' />
                            </SelectTrigger>
                            <SelectContent>
                              {testers.map((tester) => (
                                <SelectItem key={tester.id} value={tester.id}>
                                  {tester.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      />
                      {errors.testerId1 && (
                        <p className='text-xs text-red-500 font-medium'>
                          {errors.testerId1.message}
                        </p>
                      )}
                    </div>

                    <div className='space-y-3'>
                      <label className='text-[11px] font-black uppercase text-purple-600 tracking-wider flex items-center gap-2'>
                        Tester 2 (Secondary Analysis)
                      </label>
                      <Controller
                        name='testerId2'
                        control={control}
                        render={({ field }) => (
                          <Select onValueChange={field.onChange} value={field.value || undefined}>
                            <SelectTrigger className='w-full bg-purple-50/50 border-purple-100 h-12 focus:bg-white transition-colors'>
                              <SelectValue placeholder='Assign Tester 2...' />
                            </SelectTrigger>
                            <SelectContent>
                              {testers.map((tester) => (
                                <SelectItem key={tester.id} value={tester.id}>
                                  {tester.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      />
                      {errors.testerId2 && (
                        <p className='text-xs text-red-500 font-medium'>
                          {errors.testerId2.message}
                        </p>
                      )}
                    </div>

                    <div className='p-6 bg-slate-50 rounded-2xl border border-slate-100 mt-8'>
                      <div className='flex items-start gap-4'>
                        <div className='p-2 bg-blue-100 rounded-lg'>
                          <Notebook className='text-blue-600' size={12} />
                        </div>
                        <div>
                          <h4 className='text-sm font-bold text-slate-800'>Note</h4>
                          <p className='text-xs text-slate-500 leading-relaxed mt-1'>
                            The gem record will be tracked throughout the entire testing process.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className='pt-8 border-t border-slate-100 grid grid-cols-2 gap-6'>
                <Button
                  type='button'
                  variant='outline'
                  className='h-12 border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300 font-bold transition-all rounded-xl'
                  onClick={handleDraftList}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <span className='flex items-center gap-2'>
                      <div className='w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin' />
                      Processing...
                    </span>
                  ) : (
                    <span className='flex items-center gap-2'>Save as Draft</span>
                  )}
                </Button>
                <Button
                  type='submit'
                  className='h-12 bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-100 font-bold transition-all rounded-xl'
                  disabled={isSubmitting || !isValid}
                >
                  {isSubmitting ? (
                    <span className='flex items-center gap-2'>
                      <div className='w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin' />
                      Processing...
                    </span>
                  ) : (
                    <span className='flex items-center gap-2'>
                      <Plus size={20} />
                      Add to Workflow
                    </span>
                  )}
                </Button>
              </div>
            </form>
          )}
        </Card>
      </div>

      <Dialog open={!!selectedImage} onOpenChange={() => setSelectedImage(null)}>
        <DialogContent className='max-w-4xl p-0 bg-transparent border-none'>
          <DialogHeader className='hidden'>
            <DialogTitle>View Image</DialogTitle>
          </DialogHeader>
          <div className='relative w-full aspect-auto flex items-center justify-center'>
            <img
              src={selectedImage || ""}
              alt='Selected gem'
              className='max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl'
            />
            <button
              onClick={() => setSelectedImage(null)}
              className='absolute -top-12 right-0 p-2 bg-white/20 hover:bg-white/40 rounded-full text-white transition-all'
            >
              <X size={24} />
            </button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={deleteImageIndex !== null}
        onOpenChange={(open) => !open && setDeleteImageIndex(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This image will be permanently deleted from the
              database.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isImageLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className='bg-red-600 hover:bg-red-700 text-white'
              disabled={isImageLoading}
            >
              {isImageLoading ? (
                <>
                  <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </MainLayout>
  )
}
