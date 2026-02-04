import { useState } from "react"
import { Link, useLocation } from "react-router-dom"
import {
  LayoutDashboard,
  ClipboardCheck,
  Plus,
  Activity,
  LogOut,
  Microscope,
  Users,
  Building2,
  FileText,
  ChevronLeft,
  ChevronRight,
  type LucideIcon,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { useGem } from "@/hooks/useGemStore"

interface NavButtonProps {
  icon: LucideIcon
  label: string
  to: string
  collapsed: boolean
}

function NavButton({ icon: Icon, label, to, collapsed }: NavButtonProps) {
  const location = useLocation()
  const active = location.pathname === to

  return (
    <Link to={to} title={collapsed ? label : undefined}>
      <button
        className={`w-full flex items-center px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
          active
            ? "bg-blue-600 text-white shadow-sm"
            : "text-slate-400 hover:text-white hover:bg-slate-800"
        } ${collapsed ? "justify-center px-2" : ""}`}
      >
        <Icon size={20} className={`${collapsed ? "" : "mr-3 text-slate-100"}`} />
        {!collapsed && (
          <span className='animate-in fade-in slide-in-from-left-2 duration-300'>{label}</span>
        )}
      </button>
    </Link>
  )
}

export function Sidebar() {
  const { user, setUser } = useGem()
  const [collapsed, setCollapsed] = useState(true)

  if (!user) return null

  return (
    <aside
      className={`hidden md:flex flex-col bg-slate-900 text-white transition-all duration-300 relative border-r border-slate-800 ${
        collapsed ? "w-20" : "w-64"
      }`}
    >
      {/* Toggle Button */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className='absolute -right-3 top-9 bg-slate-800 text-slate-400 border border-slate-700 rounded-full p-1 hover:text-white hover:bg-blue-600 transition-colors z-50 shadow-md'
      >
        {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
      </button>

      <div
        className={`h-20 border-b border-slate-800 flex items-center ${
          collapsed ? "justify-center" : "px-6 gap-3"
        }`}
      >
        <div className='w-8 h-8 min-w-[32px] bg-blue-500 rounded-lg flex items-center justify-center shadow-lg shadow-blue-900/20'>
          <Microscope size={18} className='text-white' />
        </div>
        {!collapsed && (
          <span className='font-bold text-lg tracking-tight whitespace-nowrap animate-in fade-in slide-in-from-left-2 duration-300'>
            GemChecker
          </span>
        )}
      </div>

      <nav className='flex-1 p-3 space-y-2 overflow-y-auto overflow-x-hidden scrollbar-thin scrollbar-thumb-slate-700'>
        <NavButton icon={LayoutDashboard} label='Dashboard' to='/dashboard' collapsed={collapsed} />
        <NavButton icon={ClipboardCheck} label='My Queue' to='/queue' collapsed={collapsed} />
        {user.role === "HELPER" && (
          <NavButton icon={Plus} label='Intake Gem' to='/intake' collapsed={collapsed} />
        )}
        {(user.role === "ADMIN" || user.role === "HELPER") && (
          <>
            <NavButton icon={Building2} label='Customers' to='/customers' collapsed={collapsed} />
            <NavButton icon={FileText} label='Reports' to='/reports' collapsed={collapsed} />
          </>
        )}
        {user.role === "ADMIN" && (
          <>
            <div
              className={`pt-4 pb-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider ${
                collapsed ? "text-center" : "px-3"
              }`}
            >
              {collapsed ? "---" : "Admin"}
            </div>
            <NavButton icon={Activity} label='Tester Stats' to='/stats' collapsed={collapsed} />
            <NavButton icon={Users} label='Users' to='/users' collapsed={collapsed} />
          </>
        )}
      </nav>

      <div className='p-3 border-t border-slate-800'>
        <div className={`flex items-center mb-4 ${collapsed ? "justify-center" : "gap-3 px-1"}`}>
          <div className='w-9 h-9 min-w-[36px] rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center font-bold text-sm shadow-md'>
            {user.avatar}
          </div>
          {!collapsed && (
            <div className='overflow-hidden animate-in fade-in slide-in-from-left-2 duration-300'>
              <p className='text-sm font-medium truncate'>{user.name}</p>
              <p className='text-[10px] uppercase font-bold text-slate-400 truncate'>
                {user.role.replace("_", " ")}
              </p>
            </div>
          )}
        </div>
        <Button
          variant='secondary'
          className={`w-full text-xs border-slate-700 bg-slate-800/50 text-slate-300 hover:bg-slate-700 hover:text-white transition-all ${
            collapsed ? "justify-center px-0 h-10 w-10 mx-auto rounded-xl" : "justify-start h-9"
          }`}
          onClick={() => setUser(null)}
          title='Sign Out'
        >
          <LogOut size={16} className={`${collapsed ? "" : "mr-2"}`} />
          {!collapsed && "Sign Out"}
        </Button>
      </div>
    </aside>
  )
}
