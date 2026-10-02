import { useEffect, useRef, useState, type ChangeEvent } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { differenceInYears } from "date-fns"
import { Camera, KeyRound, Loader2, Trash2, UserCircle } from "lucide-react"
import { MainLayout } from "@/components/layout/MainLayout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { UserAvatar } from "@/components/shared/common/UserAvatar"
import { useGem } from "@/hooks/useGemStore"
import { useToast } from "@/hooks/useToast"
import { usersApi } from "@/lib/api/users"
import type { User } from "@/lib/types"
import {
  profileSchema,
  changePasswordSchema,
  type ProfileFormValues,
  type ChangePasswordFormValues,
} from "@/lib/validations/user"

const MAX_IMAGE_BYTES = 5 * 1024 * 1024

const labelClass = "text-[10px] font-black uppercase text-slate-400"
const errorClass = "text-[10px] text-red-500 font-bold"

const toFormValues = (user: User): ProfileFormValues => ({
  name: user.name,
  email: user.email || "",
  age: user.age?.toString() || "",
  dob: user.dob ? new Date(user.dob).toISOString().split("T")[0] : "",
  idNumber: user.idNumber || "",
  address: user.address || "",
  phoneNumber: user.phoneNumber || "",
})

export function ProfilePage() {
  const { user, setUser } = useGem()
  const toast = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [imageBusy, setImageBusy] = useState(false)

  const profileForm = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: user ? toFormValues(user) : undefined,
  })
  const passwordForm = useForm<ChangePasswordFormValues>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { currentPassword: "", newPassword: "", confirmPassword: "" },
  })

  // The cached user may predate fields added later (email, picture), so refresh it once.
  useEffect(() => {
    usersApi
      .getProfile()
      .then((fresh) => {
        setUser(fresh)
        profileForm.reset(toFormValues(fresh))
      })
      .catch((error) => console.error("Failed to load profile:", error))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const dob = profileForm.watch("dob")
  useEffect(() => {
    if (dob) profileForm.setValue("age", differenceInYears(new Date(), new Date(dob)).toString())
  }, [dob, profileForm])

  if (!user) return null

  const saveProfile = async (values: ProfileFormValues) => {
    try {
      const updated = await usersApi.updateProfile(values)
      setUser(updated)
      profileForm.reset(toFormValues(updated))
      toast({ title: "Profile updated", variant: "success" })
    } catch (error) {
      toast({ title: "Could not update profile", description: (error as Error).message, variant: "error" })
    }
  }

  const savePassword = async (values: ChangePasswordFormValues) => {
    try {
      await usersApi.changePassword(values.currentPassword, values.newPassword)
      passwordForm.reset()
      toast({ title: "Password changed", variant: "success" })
    } catch (error) {
      toast({ title: "Could not change password", description: (error as Error).message, variant: "error" })
    }
  }

  const handleImageSelected = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ""
    if (!file) return
    if (file.size > MAX_IMAGE_BYTES) {
      toast({ title: "Image too large", description: "Choose an image of 5 MB or less.", variant: "error" })
      return
    }

    setImageBusy(true)
    try {
      setUser(await usersApi.uploadProfileImage(file))
      toast({ title: "Profile picture updated", variant: "success" })
    } catch (error) {
      toast({ title: "Could not upload picture", description: (error as Error).message, variant: "error" })
    } finally {
      setImageBusy(false)
    }
  }

  const handleRemoveImage = async () => {
    setImageBusy(true)
    try {
      setUser(await usersApi.removeProfileImage())
      toast({ title: "Profile picture removed", variant: "success" })
    } catch (error) {
      toast({ title: "Could not remove picture", description: (error as Error).message, variant: "error" })
    } finally {
      setImageBusy(false)
    }
  }

  const { errors: profileErrors, isSubmitting: savingProfile, isDirty } = profileForm.formState
  const { errors: passwordErrors, isSubmitting: savingPassword } = passwordForm.formState

  return (
    <MainLayout>
      <div className='space-y-6 max-w-3xl'>
        <div className='flex items-center gap-3'>
          <div className='p-2 bg-[#dca54a] rounded-lg shadow-lg shadow-amber-200'>
            <UserCircle className='text-slate-900' size={24} />
          </div>
          <div>
            <h2 className='text-2xl font-bold text-slate-800'>My Profile</h2>
            <p className='text-xs text-slate-500 font-medium'>
              Manage your picture, personal details and password
            </p>
          </div>
        </div>

        {/* Picture */}
        <section className='bg-white rounded-xl border border-slate-200 shadow-sm p-6 flex flex-col sm:flex-row items-center gap-6'>
          <div className='relative'>
            <UserAvatar
              user={user}
              className='w-24 h-24 rounded-full bg-gradient-to-br from-[#dca54a] to-[#d09a40] text-slate-900 font-bold text-3xl shadow-md'
            />
            {imageBusy && (
              <div className='absolute inset-0 rounded-full bg-white/70 flex items-center justify-center'>
                <Loader2 className='animate-spin text-slate-600' size={24} />
              </div>
            )}
          </div>
          <div className='text-center sm:text-left space-y-3'>
            <div>
              <p className='text-lg font-bold text-slate-800'>{user.name}</p>
              <p className='text-[10px] uppercase font-bold text-slate-400'>{user.role}</p>
            </div>
            <div className='flex flex-wrap justify-center sm:justify-start gap-2'>
              <input
                ref={fileInputRef}
                type='file'
                accept='image/jpeg,image/png'
                className='hidden'
                onChange={handleImageSelected}
              />
              <Button
                type='button'
                size='sm'
                disabled={imageBusy}
                onClick={() => fileInputRef.current?.click()}
              >
                <Camera size={14} className='mr-2' />
                {user.profileImage ? "Change picture" : "Upload picture"}
              </Button>
              {user.profileImage && (
                <Button
                  type='button'
                  size='sm'
                  variant='outline'
                  disabled={imageBusy}
                  onClick={handleRemoveImage}
                >
                  <Trash2 size={14} className='mr-2' />
                  Remove
                </Button>
              )}
            </div>
            <p className='text-[10px] text-slate-400'>JPG or PNG, up to 5 MB.</p>
          </div>
        </section>

        {/* Details */}
        <section className='bg-white rounded-xl border border-slate-200 shadow-sm p-6'>
          <h3 className='font-bold text-slate-800 mb-4'>Personal Details</h3>
          <form onSubmit={profileForm.handleSubmit(saveProfile)} className='space-y-4'>
            <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
              <div className='space-y-1.5'>
                <label className={labelClass}>Full Name</label>
                <Input {...profileForm.register("name")} />
                {profileErrors.name && <p className={errorClass}>{profileErrors.name.message}</p>}
              </div>
              <div className='space-y-1.5'>
                <label className={labelClass}>Email Address</label>
                <Input type='email' {...profileForm.register("email")} />
                {profileErrors.email && <p className={errorClass}>{profileErrors.email.message}</p>}
              </div>
              <div className='space-y-1.5'>
                <label className={labelClass}>Phone Number</label>
                <Input {...profileForm.register("phoneNumber")} />
              </div>
              <div className='space-y-1.5'>
                <label className={labelClass}>ID Number</label>
                <Input {...profileForm.register("idNumber")} />
              </div>
              <div className='space-y-1.5'>
                <label className={labelClass}>DOB</label>
                <Input type='date' {...profileForm.register("dob")} />
              </div>
              <div className='space-y-1.5'>
                <label className={labelClass}>Age (Auto)</label>
                <Input
                  className='bg-slate-50 cursor-not-allowed opacity-70'
                  {...profileForm.register("age")}
                  readOnly
                  placeholder='Calculated from DOB'
                />
              </div>
            </div>
            <div className='space-y-1.5'>
              <label className={labelClass}>Address</label>
              <Input {...profileForm.register("address")} />
            </div>
            <div className='flex justify-end'>
              <Button type='submit' className='min-w-[140px]' disabled={savingProfile || !isDirty}>
                {savingProfile ? <Loader2 className='animate-spin' size={18} /> : "Save Changes"}
              </Button>
            </div>
          </form>
        </section>

        {/* Password */}
        <section className='bg-white rounded-xl border border-slate-200 shadow-sm p-6'>
          <h3 className='font-bold text-slate-800 mb-4 flex items-center gap-2'>
            <KeyRound size={16} className='text-slate-400' /> Change Password
          </h3>
          <form onSubmit={passwordForm.handleSubmit(savePassword)} className='space-y-4'>
            <div className='space-y-1.5'>
              <label className={labelClass}>Current Password</label>
              <Input
                type='password'
                autoComplete='current-password'
                {...passwordForm.register("currentPassword")}
              />
              {passwordErrors.currentPassword && (
                <p className={errorClass}>{passwordErrors.currentPassword.message}</p>
              )}
            </div>
            <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
              <div className='space-y-1.5'>
                <label className={labelClass}>New Password</label>
                <Input
                  type='password'
                  autoComplete='new-password'
                  {...passwordForm.register("newPassword")}
                />
                {passwordErrors.newPassword && (
                  <p className={errorClass}>{passwordErrors.newPassword.message}</p>
                )}
              </div>
              <div className='space-y-1.5'>
                <label className={labelClass}>Confirm New Password</label>
                <Input
                  type='password'
                  autoComplete='new-password'
                  {...passwordForm.register("confirmPassword")}
                />
                {passwordErrors.confirmPassword && (
                  <p className={errorClass}>{passwordErrors.confirmPassword.message}</p>
                )}
              </div>
            </div>
            <div className='flex justify-end'>
              <Button type='submit' className='min-w-[140px]' disabled={savingPassword}>
                {savingPassword ? <Loader2 className='animate-spin' size={18} /> : "Update Password"}
              </Button>
            </div>
          </form>
        </section>
      </div>
    </MainLayout>
  )
}
