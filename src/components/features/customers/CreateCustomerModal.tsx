import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Loader2, Upload } from "lucide-react"
import { api } from "@/lib/api"
import { customerSchema, type CustomerFormValues } from "@/lib/validations/customer"

interface CreateCustomerModalProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export function CreateCustomerModal({ isOpen, onOpenChange, onSuccess }: CreateCustomerModalProps) {
  const [logo, setLogo] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
    reset,
  } = useForm<CustomerFormValues>({
    resolver: zodResolver(customerSchema),
    defaultValues: {
      customerName: "",
      companyName: "",
      email: "",
      phoneNumber: "",
      address: "",
    },
  })

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setLogo(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setLogoPreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const onSubmit = async (values: CustomerFormValues) => {
    setIsSubmitting(true)
    try {
      const data = new FormData()
      data.append("customerName", values.customerName)
      data.append("companyName", values.companyName)
      data.append("email", values.email)
      data.append("phoneNumber", values.phoneNumber || "")
      data.append("address", values.address || "")
      if (logo) {
        data.append("logo", logo)
      }

      await api.createCustomer(data)
      onSuccess()
      onOpenChange(false)
      reset()
      setLogo(null)
      setLogoPreview(null)
    } catch (error) {
      console.error("Failed to create customer:", error)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-[425px]'>
        <DialogHeader>
          <DialogTitle>Add New Customer</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className='grid gap-4 py-4'>
          <div className='grid grid-cols-2 gap-4'>
            <div className='grid gap-2'>
              <label
                htmlFor='customerName'
                className='text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70'
              >
                Customer Name
              </label>
              <Input id='customerName' {...register("customerName")} />
              {errors.customerName && (
                <p className='text-[10px] text-red-500 font-bold'>{errors.customerName.message}</p>
              )}
            </div>
            <div className='grid gap-2'>
              <label
                htmlFor='companyName'
                className='text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70'
              >
                Company
              </label>
              <Input id='companyName' {...register("companyName")} />
              {errors.companyName && (
                <p className='text-[10px] text-red-500 font-bold'>{errors.companyName.message}</p>
              )}
            </div>
          </div>
          <div className='grid gap-2'>
            <label
              htmlFor='email'
              className='text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70'
            >
              Email
            </label>
            <Input id='email' type='email' {...register("email")} />
            {errors.email && (
              <p className='text-[10px] text-red-500 font-bold'>{errors.email.message}</p>
            )}
          </div>
          <div className='grid gap-2'>
            <label
              htmlFor='phoneNumber'
              className='text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70'
            >
              Phone Number
            </label>
            <Input id='phoneNumber' {...register("phoneNumber")} placeholder='e.g. 0712345678' />
          </div>
          <div className='grid gap-2'>
            <label
              htmlFor='address'
              className='text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70'
            >
              Address
            </label>
            <Textarea id='address' {...register("address")} />
          </div>
          <div className='grid gap-2'>
            <label
              htmlFor='logo'
              className='text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70'
            >
              Logo
            </label>
            <div className='flex items-center gap-4'>
              <div className='relative w-16 h-16 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center overflow-hidden shrink-0'>
                {logoPreview ? (
                  <img
                    src={logoPreview}
                    alt='Logo Preview'
                    className='w-full h-full object-cover'
                  />
                ) : (
                  <Upload className='text-slate-400' size={20} />
                )}
              </div>
              <Input
                id='logo'
                type='file'
                accept='image/*'
                onChange={handleLogoChange}
                className='flex-1 cursor-pointer'
              />
            </div>
          </div>
          <DialogFooter>
            <Button type='submit' disabled={isSubmitting || !isValid}>
              {isSubmitting && <Loader2 className='mr-2 h-4 w-4 animate-spin' />}
              Create Customer
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
