import { useState, useEffect, useRef } from "react"
import { useNavigate } from "react-router-dom"
import { MainLayout } from "@/components/layout/MainLayout"
import { ReportsTable } from "@/components/features/reports/ReportsTable"
import { reportsApi } from "@/lib/api/reports"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { RefreshCcw, X } from "lucide-react"
import { GEM_STATUSES, REPORT_MODES } from "@/lib/types"
import type { PaginationState } from "@tanstack/react-table"

/** Local midnight of a yyyy-mm-dd day, `offsetDays` later, as the ISO instant the API takes. */
const dayStart = (day: string, offsetDays = 0) => {
  const date = new Date(`${day}T00:00`)
  date.setDate(date.getDate() + offsetDays)
  return date.toISOString()
}

export function ReportsPage() {
  const [reports, setReports] = useState<any[]>([])
  const [totalRecords, setTotalRecords] = useState(0)
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  })
  const [isLoading, setIsLoading] = useState(false)
  const [searchInput, setSearchInput] = useState("")
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [typeFilter, setTypeFilter] = useState<string>("all")
  const [modeFilter, setModeFilter] = useState<string>("all")
  const [dateRange, setDateRange] = useState({ start: "", end: "" })
  const latestRequest = useRef(0)
  const navigate = useNavigate()

  const hasActiveFilters =
    searchInput !== "" ||
    statusFilter !== "all" ||
    typeFilter !== "all" ||
    modeFilter !== "all" ||
    dateRange.start !== "" ||
    dateRange.end !== ""

  // A narrower result can have fewer pages than the one being looked at, so every
  // filter change starts again from the first.
  const firstPage = () => setPagination((prev) => ({ ...prev, pageIndex: 0 }))
  const withFirstPage =
    <T,>(setter: (value: T) => void) =>
    (value: T) => {
      setter(value)
      firstPage()
    }

  const clearFilters = () => {
    setSearchInput("")
    setSearch("")
    setStatusFilter("all")
    setTypeFilter("all")
    setModeFilter("all")
    setDateRange({ start: "", end: "" })
    firstPage()
  }

  // Typing searches once the user pauses, not on every keystroke.
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput.trim())
      firstPage()
    }, 300)
    return () => clearTimeout(timer)
  }, [searchInput])

  const loadReports = async () => {
    const request = ++latestRequest.current
    setIsLoading(true)
    try {
      const data = await reportsApi.getReports(pagination.pageIndex + 1, pagination.pageSize, {
        search,
        status: statusFilter !== "all" ? statusFilter : undefined,
        type: typeFilter !== "all" ? typeFilter : undefined,
        mode: modeFilter !== "all" ? modeFilter : undefined,
        from: dateRange.start ? dayStart(dateRange.start) : undefined,
        to: dateRange.end ? dayStart(dateRange.end, 1) : undefined,
      })
      // A slower, older request must not overwrite the answer to a newer one.
      if (request !== latestRequest.current) return
      // Expected response: { reports: [], total: ... }
      if (data.reports) {
        setReports(data.reports)
        setTotalRecords(data.total)
      } else if (Array.isArray(data)) {
        setReports(data)
        setTotalRecords(data.length)
      }
    } catch (error) {
      console.error("Failed to fetch reports:", error)
    } finally {
      if (request === latestRequest.current) setIsLoading(false)
    }
  }

  useEffect(() => {
    loadReports()
  }, [
    pagination.pageIndex,
    pagination.pageSize,
    search,
    statusFilter,
    typeFilter,
    modeFilter,
    dateRange,
  ])

  // A custom report is written on its own page and has no paper-size settings to
  // configure; a standard one is the other way round. Neither has anything to offer
  // on the other's page, so the row sends you to the one that applies.
  const handleOpenReport = (reportId: string, isCustom: boolean) => {
    navigate(`/reports/${reportId}/${isCustom ? "custom" : "configure"}`)
  }

  return (
    <MainLayout>
      <div className='space-y-6'>
        <div className='flex flex-col md:flex-row justify-between items-start md:items-center gap-4'>
          <div>
            <h2 className='text-2xl font-bold text-slate-800'>System Reports</h2>
            <p className='text-slate-500 text-sm'>
              {totalRecords} reports found based on current filters
            </p>
          </div>
          <div className='flex items-center gap-2'>
            {hasActiveFilters && (
              <Button variant='ghost' size='sm' onClick={clearFilters} className='text-slate-500'>
                <X className='w-4 h-4 mr-2' />
                Clear Filters
              </Button>
            )}
            <Button variant='outline' size='sm' onClick={loadReports} disabled={isLoading}>
              <RefreshCcw className={`w-4 h-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
        </div>

        <div className='grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4'>
          <div>
            <label className='text-xs font-medium text-slate-500 mb-1.5 block'>
              Report / Gem ID
            </label>
            <Input
              className='h-9'
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder='Search ID'
            />
          </div>

          <div>
            <label className='text-xs font-medium text-slate-500 mb-1.5 block'>Gem Status</label>
            <Select value={statusFilter} onValueChange={withFirstPage(setStatusFilter)}>
              <SelectTrigger className='h-9 w-full'>
                <SelectValue placeholder='All Statuses' />
              </SelectTrigger>
              <SelectContent>
                {/* Every stage: a custom certificate's report is raised at intake, so
                    its gem can be anywhere in the workflow. */}
                <SelectItem value='all'>All Statuses</SelectItem>
                <SelectItem value={GEM_STATUSES.TOOK_IN}>Took In</SelectItem>
                <SelectItem value={GEM_STATUSES.READY_FOR_T1}>Ready for T1</SelectItem>
                <SelectItem value={GEM_STATUSES.READY_FOR_T2}>Ready for T2</SelectItem>
                <SelectItem value={GEM_STATUSES.READY_FOR_APPROVAL}>Ready for Approval</SelectItem>
                <SelectItem value={GEM_STATUSES.SUBMITTED_FOR_REPORT}>
                  Submitted for Report
                </SelectItem>
                <SelectItem value={GEM_STATUSES.REQUEST_CHANGES}>Changes Requested</SelectItem>
                <SelectItem value={GEM_STATUSES.DONE}>Done</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className='text-xs font-medium text-slate-500 mb-1.5 block'>Type</label>
            <Select value={typeFilter} onValueChange={withFirstPage(setTypeFilter)}>
              <SelectTrigger className='h-9 w-full'>
                <SelectValue placeholder='All Types' />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='all'>All Types</SelectItem>
                <SelectItem value='small'>Small</SelectItem>
                <SelectItem value='medium'>Medium</SelectItem>
                <SelectItem value='large'>Large</SelectItem>
                <SelectItem value='verbal'>Verbal</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className='text-xs font-medium text-slate-500 mb-1.5 block'>Certificate</label>
            <Select value={modeFilter} onValueChange={withFirstPage(setModeFilter)}>
              <SelectTrigger className='h-9 w-full'>
                <SelectValue placeholder='All Certificates' />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='all'>All Certificates</SelectItem>
                <SelectItem value={REPORT_MODES.DEFAULT}>Standard</SelectItem>
                <SelectItem value={REPORT_MODES.CUSTOM}>Custom</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className='text-xs font-medium text-slate-500 mb-1.5 block'>
              Issued From
            </label>
            <Input
              type='date'
              className='h-9'
              value={dateRange.start}
              max={dateRange.end || undefined}
              onChange={(e) => {
                setDateRange({ ...dateRange, start: e.target.value })
                firstPage()
              }}
            />
          </div>
          <div>
            <label className='text-xs font-medium text-slate-500 mb-1.5 block'>Issued To</label>
            <Input
              type='date'
              className='h-9'
              value={dateRange.end}
              min={dateRange.start || undefined}
              onChange={(e) => {
                setDateRange({ ...dateRange, end: e.target.value })
                firstPage()
              }}
            />
          </div>
        </div>

        <ReportsTable
          data={reports}
          pagination={pagination}
          onPaginationChange={setPagination}
          totalRecords={totalRecords}
          isLoading={isLoading}
          onOpenReport={handleOpenReport}
        />
      </div>
    </MainLayout>
  )
}
