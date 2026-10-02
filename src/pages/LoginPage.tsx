import { useState } from "react"
import { Navigate } from "react-router-dom"
import { Loader2, Eye, EyeOff } from "lucide-react"
import { Card } from "@/components/ui/card"
import { useGem } from "@/hooks/useGemStore"
import { usersApi } from "@/lib/api/users"
import grcLogo from "@/assets/grc-logo.png"

export function LoginPage() {
  const { user, setUser } = useGem()
  const [loading, setLoading] = useState<string | null>(null)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (user) return <Navigate to='/dashboard' replace />

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading("manual")
    setError(null)
    try {
      const loggedInUser = await usersApi.login(email, password)
      setUser(loggedInUser)
    } catch (err: any) {
      setError(err.message || "Login failed")
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className='min-h-screen bg-[#faf5e5] flex items-center justify-center p-4'>
      <Card className='w-full max-w-md p-8 space-y-8'>
        <div className='text-center'>
          <div className='w-20 h-20 bg-slate-900 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-slate-300 p-3'>
            <img src={grcLogo} alt='GRC logo' className='w-full h-auto' />
          </div>
          <h1 className='text-3xl font-bold text-slate-900'>GRC Portal</h1>
          <p className='text-slate-500 mt-2'>Gemological Report of Ceylon</p>
        </div>

        <form onSubmit={handleLogin} className='space-y-4'>
          <div className='space-y-2'>
            <label className='text-xs font-bold text-slate-500 uppercase'>Email</label>
            <input
              type='text'
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className='w-full px-4 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-[#dca54a]'
              placeholder='e.g. admin, assistant, tester'
            />
          </div>
          <div className='space-y-2'>
            <label className='text-xs font-bold text-slate-500 uppercase'>Password</label>
            <div className='relative'>
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className='w-full px-4 py-2 pr-12 border rounded-lg outline-none focus:ring-2 focus:ring-[#dca54a]'
              />
              <button
                type='button'
                onClick={() => setShowPassword(!showPassword)}
                className='absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors'
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>
          {error && <p className='text-xs text-red-500 font-medium'>{error}</p>}
          <button
            type='submit'
            disabled={!!loading}
            className='w-full h-11 bg-[#dca54a] hover:bg-[#d09a40] text-slate-900 rounded-lg font-bold transition-all disabled:opacity-50 flex items-center justify-center'
          >
            {loading === "manual" ? <Loader2 className='animate-spin' size={20} /> : "Sign In"}
          </button>
        </form>
      </Card>
    </div>
  )
}
