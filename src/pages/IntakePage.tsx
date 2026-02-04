import { useState, useEffect } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { Notebook, Plus, ArrowLeft } from "lucide-react"
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
import { Textarea } from "../components/ui/textarea"
import { BASE_URL } from "@/lib/api/config"
import { useGem } from "@/hooks/useGemStore"
import { usersApi } from "@/lib/api/users"
import { customersApi } from "@/lib/api/customers"
import { type User, type Customer, GEM_STATUSES } from "@/lib/types"
import { useForm, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { intakeSchema, type IntakeFormValues } from "@/lib/validations/intake"

export function IntakePage() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const { handleIntake, getGemById } = useGem()

  const [image, setImage] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [testers, setTesters] = useState<User[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isValid },
    reset,
    getValues,
  } = useForm<IntakeFormValues>({
    resolver: zodResolver(intakeSchema) as any,
    defaultValues: {
      weight: 0,
      color: "",
      itemDescription: "",
      customerId: "",
      testerId1: "",
      testerId2: "",
    },
    mode: "onChange",
  })

  useEffect(() => {
    const fetchTesters = async () => {
      try {
        const users = await usersApi.getUsers("TESTER")
        setTesters(users)
      } catch (err) {
        console.error("Failed to fetch testers:", err)
      }
    }
    fetchTesters()

    const fetchCustomers = async () => {
      try {
        const data = await customersApi.getCustomers(1, 100)
        setCustomers(data.customers)
      } catch (err) {
        console.error("Failed to fetch customers:", err)
      }
    }
    fetchCustomers()
  }, [])

  console.log(errors)

  useEffect(() => {
    if (id) {
      const fetchGem = async () => {
        try {
          const gem = await getGemById(id)
          reset({
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
          })
          if (gem.imageUrl) {
            setImagePreview(
              gem.imageUrl.startsWith("http") ? gem.imageUrl : `${BASE_URL}${gem.imageUrl}`,
            )
          }
        } catch (err) {
          console.error("Failed to fetch gem for editing:", err)
        }
      }
      fetchGem()
    }
  }, [id, reset, getGemById])

  // Handle image change
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setImage(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setImagePreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  // Handle form submission
  const onSubmit = async (data: IntakeFormValues) => {
    setIsSubmitting(true)
    try {
      await handleIntake({ ...data, status: GEM_STATUSES.READY_FOR_T1 }, image || undefined, id)
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
      Object.values(values).some((v) => v !== "" && v !== undefined && v !== null) || !!image

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
        image || undefined,
        id,
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
                      onChange={handleImageChange}
                      className='cursor-pointer bg-slate-50 border-slate-200 h-11 file:bg-blue-50 file:text-blue-600 file:border-0 file:rounded-md file:px-3 file:mr-4 file:h-full hover:file:bg-blue-100'
                    />
                  </div>
                  {imagePreview && (
                    <div className='mt-4 relative aspect-video w-full overflow-hidden rounded-xl border-2 border-slate-100 bg-slate-50 group hover:border-blue-200 transition-all'>
                      <img
                        src={imagePreview}
                        alt='Preview'
                        className='h-full w-full object-cover shadow-inner'
                      />
                    </div>
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
                      <Select onValueChange={field.onChange} value={field.value}>
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
                    <p className='text-xs text-red-500 font-medium'>{errors.customerId.message}</p>
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
                        <Select onValueChange={field.onChange} value={field.value}>
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
                      <p className='text-xs text-red-500 font-medium'>{errors.testerId1.message}</p>
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
                        <Select onValueChange={field.onChange} value={field.value}>
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
                      <p className='text-xs text-red-500 font-medium'>{errors.testerId2.message}</p>
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
        </Card>
      </div>
    </MainLayout>
  )
}
