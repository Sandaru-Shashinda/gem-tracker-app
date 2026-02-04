import { useState, useEffect } from "react"
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
import { customersApi } from "@/lib/api/customers"
import { BASE_URL } from "@/lib/api/config"
import type { Customer } from "@/lib/types"

interface EditCustomerModalProps {
  customer: Customer | null
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export function EditCustomerModal({
  customer,
  isOpen,
  onOpenChange,
  onSuccess,
}: EditCustomerModalProps) {
  const [formData, setFormData] = useState({
    customerName: "",
    companyName: "",
    email: "",
    phoneNumber: "",
    address: "",
  })
  const [logo, setLogo] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (customer) {
      setFormData({
        customerName: customer.customerName,
        companyName: customer.companyName,
        email: customer.email,
        phoneNumber: customer.phoneNumber || "",
        address: customer.address || "",
      })
      if (customer.logo) {
        setLogoPreview(`${BASE_URL}/${customer.logo}`) // Ensure correct logo path
      } else {
        setLogoPreview(null)
      }
    }
  }, [customer])

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!customer) return

    setIsSubmitting(true)
    try {
      const data = new FormData()
      data.append("customerName", formData.customerName)
      data.append("companyName", formData.companyName)
      data.append("email", formData.email)
      data.append("phoneNumber", formData.phoneNumber)
      data.append("address", formData.address)
      if (logo) {
        data.append("logo", logo)
      }

      await customersApi.updateCustomer(customer._id, data)
      onSuccess()
      onOpenChange(false)
    } catch (error) {
      console.error("Failed to update customer:", error)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-[425px]'>
        <DialogHeader>
          <DialogTitle>Edit Customer</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className='grid gap-4 py-4'>
          <div className='grid grid-cols-2 gap-4'>
            <div className='grid gap-2'>
              <label
                htmlFor='customerName'
                className='text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70'
              >
                Customer Name
              </label>
              <Input
                id='customerName'
                value={formData.customerName}
                onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                required
              />
            </div>
            <div className='grid gap-2'>
              <label
                htmlFor='companyName'
                className='text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70'
              >
                Company
              </label>
              <Input
                id='companyName'
                value={formData.companyName}
                onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                required
              />
            </div>
          </div>
          <div className='grid gap-2'>
            <label
              htmlFor='email'
              className='text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70'
            >
              Email
            </label>
            <Input
              id='email'
              type='email'
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
            />
          </div>
          <div className='grid gap-2'>
            <label
              htmlFor='phoneNumber'
              className='text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70'
            >
              Phone Number
            </label>
            <Input
              id='phoneNumber'
              value={formData.phoneNumber}
              onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
            />
          </div>
          <div className='grid gap-2'>
            <label
              htmlFor='address'
              className='text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70'
            >
              Address
            </label>
            <Textarea
              id='address'
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            />
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
            <Button type='submit' disabled={isSubmitting}>
              {isSubmitting && <Loader2 className='mr-2 h-4 w-4 animate-spin' />}
              Save Changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
