import { useState } from "react"
import { Link, useLocation } from "react-router-dom"
import { Menu, X, LayoutDashboard, ClipboardCheck, UserCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useGem } from "@/hooks/useGemStore"
import grcLogo from "@/assets/grc-logo.png"

export function MobileHeader() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const { setUser } = useGem()
  const location = useLocation()

  return (
    <>
      <div className='md:hidden fixed top-0 left-0 right-0 h-16 bg-slate-900 text-white z-50 flex items-center justify-between px-4'>
        <div className='flex items-center gap-2'>
          <img src={grcLogo} alt='GRC logo' className='w-12 h-auto' />
          <span className='font-bold text-lg'>Portal</span>
        </div>
        <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
          {mobileMenuOpen ? <X /> : <Menu />}
        </button>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className='md:hidden fixed inset-0 z-40 bg-slate-900 pt-20 px-4 space-y-2'>
          <Link
            to='/dashboard'
            onClick={() => setMobileMenuOpen(false)}
            className={`flex items-center px-3 py-2.5 rounded-lg text-sm font-medium ${
              location.pathname === "/dashboard"
                ? "bg-[#dca54a] text-slate-900"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <LayoutDashboard size={18} className='mr-3' />
            Dashboard
          </Link>
          <Link
            to='/queue'
            onClick={() => setMobileMenuOpen(false)}
            className={`flex items-center px-3 py-2.5 rounded-lg text-sm font-medium ${
              location.pathname === "/queue"
                ? "bg-[#dca54a] text-slate-900"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <ClipboardCheck size={18} className='mr-3' />
            Queue
          </Link>
          <Link
            to='/profile'
            onClick={() => setMobileMenuOpen(false)}
            className={`flex items-center px-3 py-2.5 rounded-lg text-sm font-medium ${
              location.pathname === "/profile"
                ? "bg-[#dca54a] text-slate-900"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <UserCircle size={18} className='mr-3' />
            My Profile
          </Link>
          <Button variant='destructive' className='w-full mt-8' onClick={() => setUser(null)}>
            Sign Out
          </Button>
        </div>
      )}
    </>
  )
}
