import { useCallback, useEffect, useMemo, useState } from "react"
import { BookMarked, Loader2, RotateCcw, Search, Trash2 } from "lucide-react"
import { MainLayout } from "@/components/layout/MainLayout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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
import {
  CUTTING_SHAPE_OPTIONS,
  CUTTING_STYLE_OPTIONS,
  STANDARD_COLOUR_OPTIONS,
} from "@/components/shared/common/Formfieldsconfig"
import { useGem } from "@/hooks/useGemStore"
import { useToast } from "@/hooks/useToast"
import { referencesApi, type HiddenSuggestion, type SuggestionField } from "@/lib/api/references"

/** The dropdowns, in the order they appear on the analysis form. */
const FIELDS: { field: SuggestionField; label: string }[] = [
  { field: "itemDescription", label: "Item Description" },
  { field: "colour", label: "Colour" },
  { field: "cuttingShape", label: "Shape" },
  { field: "crownStyle", label: "Crown Style" },
  { field: "pavilionStyle", label: "Pavilion Style" },
  { field: "species", label: "Species" },
  { field: "varieties", label: "Variety" },
  { field: "comments", label: "Comments" },
  { field: "specialNote", label: "Special Note" },
  { field: "treatment", label: "Treatment" },
]

const labelOf = (field: SuggestionField) => FIELDS.find((f) => f.field === field)?.label ?? field

/**
 * Values the form offers from code rather than from saved gems. They are on the dropdown
 * whatever is deleted here, so they are left off this page instead of offering a delete
 * that would not take.
 */
const STANDARD: Partial<Record<SuggestionField, Set<string>>> = {
  colour: new Set(STANDARD_COLOUR_OPTIONS.map((o) => o.value.toLowerCase())),
  cuttingShape: new Set(CUTTING_SHAPE_OPTIONS.map((o) => o.value.toLowerCase())),
  crownStyle: new Set(CUTTING_STYLE_OPTIONS.map((o) => o.value.toLowerCase())),
  pavilionStyle: new Set(CUTTING_STYLE_OPTIONS.map((o) => o.value.toLowerCase())),
}

export function ReferencesPage() {
  const { species, varieties, history, refreshIdentifications } = useGem()
  const toast = useToast()

  const [active, setActive] = useState<SuggestionField>("itemDescription")
  const [search, setSearch] = useState("")
  const [deleting, setDeleting] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [hidden, setHidden] = useState<HiddenSuggestion[]>([])
  const [restoringId, setRestoringId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const loadHidden = useCallback(async () => {
    try {
      setHidden(await referencesApi.getHiddenSuggestions())
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load deleted suggestions")
    }
  }, [])

  useEffect(() => {
    loadHidden()
  }, [loadHidden])

  const listFor = useCallback(
    (field: SuggestionField): string[] => {
      const all = field === "species" ? species : field === "varieties" ? varieties : history[field]
      const standard = STANDARD[field]
      return standard ? all.filter((v) => !standard.has(v.toLowerCase())) : all
    },
    [species, varieties, history],
  )

  const values = useMemo(() => {
    const term = search.trim().toLowerCase()
    const list = listFor(active)
    return term ? list.filter((v) => v.toLowerCase().includes(term)) : list
  }, [active, search, listFor])

  const hiddenHere = hidden.filter((h) => h.field === active)

  const confirmDelete = async () => {
    if (!deleting) return
    setIsDeleting(true)
    try {
      await referencesApi.hideSuggestion(active, deleting)
      await Promise.all([refreshIdentifications(), loadHidden()])
      toast({ title: "Suggestion deleted", variant: "success" })
      setDeleting(null)
    } catch (err) {
      toast({
        title: "Could not delete the suggestion",
        description: err instanceof Error ? err.message : undefined,
        variant: "error",
      })
    } finally {
      setIsDeleting(false)
    }
  }

  const restore = async (row: HiddenSuggestion) => {
    setRestoringId(row._id)
    try {
      await referencesApi.restoreSuggestion(row._id)
      await Promise.all([refreshIdentifications(), loadHidden()])
      toast({ title: "Suggestion restored", variant: "success" })
    } catch (err) {
      toast({
        title: "Could not restore the suggestion",
        description: err instanceof Error ? err.message : undefined,
        variant: "error",
      })
    } finally {
      setRestoringId(null)
    }
  }

  return (
    <MainLayout>
      <div className='space-y-6'>
        <div className='flex items-center gap-3'>
          <div className='p-2 bg-[#dca54a] rounded-lg shadow-lg shadow-amber-100'>
            <BookMarked className='text-slate-900' size={24} />
          </div>
          <div>
            <h2 className='text-2xl font-bold text-slate-800'>References</h2>
            <p className='text-xs text-slate-500 font-medium'>
              The suggestions offered when typing in the analysis form. Deleting one only takes it
              off the dropdown — gems that already use it keep it.
            </p>
          </div>
        </div>

        {error && (
          <div className='p-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700'>{error}</div>
        )}

        <div className='flex flex-col lg:flex-row gap-6'>
          {/* Field picker */}
          <nav className='lg:w-60 shrink-0 flex lg:flex-col gap-2 overflow-x-auto pb-1 lg:pb-0'>
            {FIELDS.map(({ field, label }) => {
              const isActive = field === active
              return (
                <button
                  key={field}
                  type='button'
                  onClick={() => {
                    setActive(field)
                    setSearch("")
                  }}
                  className={`flex items-center justify-between gap-3 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-slate-900 text-white"
                      : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
                  }`}
                >
                  <span>{label}</span>
                  <span
                    className={`text-[11px] font-bold rounded-full px-2 py-0.5 ${
                      isActive ? "bg-white/15 text-white" : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {listFor(field).length}
                  </span>
                </button>
              )
            })}
          </nav>

          <div className='flex-1 min-w-0 space-y-6'>
            <div className='bg-white border border-slate-200 rounded-xl shadow-sm'>
              <div className='flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 border-b border-slate-100'>
                <h3 className='font-semibold text-slate-800'>
                  {labelOf(active)}
                  <span className='ml-2 text-xs font-medium text-slate-400'>
                    {values.length} suggestion{values.length === 1 ? "" : "s"}
                  </span>
                </h3>
                <div className='relative w-full sm:w-64'>
                  <Search className='absolute left-3 top-1/2 -translate-y-1/2 text-slate-400' size={16} />
                  <Input
                    placeholder='Search...'
                    className='pl-9 bg-white border-slate-200'
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
              </div>

              {values.length === 0 ? (
                <p className='p-8 text-center text-sm text-slate-400'>
                  {search ? "Nothing matches that search." : "No saved suggestions for this field yet."}
                </p>
              ) : (
                <ul className='divide-y divide-slate-100 max-h-[60vh] overflow-y-auto'>
                  {values.map((value) => (
                    <li key={value} className='flex items-start justify-between gap-3 px-4 py-2.5 hover:bg-slate-50'>
                      <span className='text-sm text-slate-700 whitespace-pre-wrap break-words min-w-0'>{value}</span>
                      <Button
                        variant='ghost'
                        size='sm'
                        className='shrink-0 text-red-500 hover:text-red-600 hover:bg-red-50'
                        onClick={() => setDeleting(value)}
                        title='Delete suggestion'
                      >
                        <Trash2 size={16} />
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {hiddenHere.length > 0 && (
              <div className='bg-white border border-slate-200 rounded-xl shadow-sm'>
                <div className='p-4 border-b border-slate-100'>
                  <h3 className='font-semibold text-slate-800'>Deleted</h3>
                  <p className='text-xs text-slate-500'>Restore one to offer it on the dropdown again.</p>
                </div>
                <ul className='divide-y divide-slate-100'>
                  {hiddenHere.map((row) => (
                    <li key={row._id} className='flex items-start justify-between gap-3 px-4 py-2.5'>
                      <span className='text-sm text-slate-400 line-through whitespace-pre-wrap break-words min-w-0'>
                        {row.value}
                      </span>
                      <Button
                        variant='outline'
                        size='sm'
                        className='shrink-0'
                        disabled={restoringId === row._id}
                        onClick={() => restore(row)}
                      >
                        {restoringId === row._id ? (
                          <Loader2 className='mr-1.5 h-3.5 w-3.5 animate-spin' />
                        ) : (
                          <RotateCcw className='mr-1.5 h-3.5 w-3.5' />
                        )}
                        Restore
                      </Button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>

        <AlertDialog open={!!deleting} onOpenChange={(open) => !open && !isDeleting && setDeleting(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete this suggestion?</AlertDialogTitle>
              <AlertDialogDescription>
                “{deleting}” will no longer be offered under {labelOf(active)}. Gems that already
                use it keep it, and you can restore it from this page.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={(e) => {
                  e.preventDefault()
                  confirmDelete()
                }}
                className='bg-red-600 hover:bg-red-700'
                disabled={isDeleting}
              >
                {isDeleting && <Loader2 className='mr-2 h-4 w-4 animate-spin' />}
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </MainLayout>
  )
}
