import { useState, useEffect } from "react"
import { useGem } from "@/hooks/useGemStore"
import { gemsApi } from "@/lib/api/gems"
import { usersApi } from "@/lib/api/users"
import { MainLayout } from "@/components/layout/MainLayout"
import { GemTable } from "@/components/features/gems/GemTable"
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
import type { Gem, User } from "@/lib/types"
import { GEM_STATUSES, UserRole } from "@/lib/types"
import type { PaginationState } from "@tanstack/react-table"

export function QueuePage() {
  const { user } = useGem()
  const [gems, setGems] = useState<Gem[]>([])
  const [totalRecords, setTotalRecords] = useState(0)
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  })
  const [isLoading, setIsLoading] = useState(false)
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [assigneeFilter, setAssigneeFilter] = useState<string>("all")
  const [gemIdFilter, setGemIdFilter] = useState<string>("")
  const [dateRange, setDateRange] = useState({ start: "", end: "" })
  const [users, setUsers] = useState<User[]>([])

  const hasActiveFilters =
    statusFilter !== "all" ||
    assigneeFilter !== "all" ||
    gemIdFilter !== "" ||
    dateRange.start !== "" ||
    dateRange.end !== ""

  const clearFilters = () => {
    setStatusFilter("all")
    setAssigneeFilter("all")
    setGemIdFilter("")
    setDateRange({ start: "", end: "" })
    setPagination((prev) => ({ ...prev, pageIndex: 0 }))
  }

  const loadGems = async () => {
    setIsLoading(true)
    try {
      const filters: any = {}
      if (statusFilter && statusFilter !== "all") filters.status = statusFilter
      if (assigneeFilter && assigneeFilter !== "all") filters.currentAssignee = assigneeFilter
      if (gemIdFilter) filters.gemId = gemIdFilter
      if (dateRange.start) filters.startDate = dateRange.start
      if (dateRange.end) filters.endDate = dateRange.end

      const data: any = await gemsApi.getGems(
        pagination.pageIndex + 1,
        pagination.pageSize,
        filters,
      )

      // Handle response structure { gems: [], total: ... }
      if (data.gems) {
        setGems(data.gems)
        setTotalRecords(data.total)
      } else if (Array.isArray(data)) {
        // Fallback for legacy response if API hasn't fully switched (though we updated api.ts)
        setGems(data)
        setTotalRecords(data.length)
      }
    } catch (error) {
      console.error("Failed to load gems:", error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadGems()
  }, [
    pagination.pageIndex,
    pagination.pageSize,
    statusFilter,
    assigneeFilter,
    gemIdFilter,
    dateRange,
  ])

  useEffect(() => {
    usersApi.getUsers().then(setUsers).catch(console.error)
  }, [user?.role])

  return (
    <MainLayout>
      <div className='space-y-6'>
        <div className='flex flex-col md:flex-row justify-between items-start md:items-center gap-4'>
          <div>
            <h2 className='text-2xl font-bold text-slate-800'>
              {user?.role === UserRole.TESTER ? "Gem Queue" : "System Gems"}
            </h2>
            <p className='text-slate-500 text-sm'>
              {totalRecords} gems found based on current filters
            </p>
          </div>
          <div className='flex items-center gap-2'>
            {hasActiveFilters && (
              <Button variant='ghost' size='sm' onClick={clearFilters} className='text-slate-500'>
                <X className='w-4 h-4 mr-2' />
                Clear Filters
              </Button>
            )}
            <Button variant='outline' size='sm' onClick={loadGems} disabled={isLoading}>
              <RefreshCcw className={`w-4 h-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
        </div>

        <div className='grid grid-cols-1 md:grid-cols-5 gap-4'>
          <div>
            <label className='text-xs font-medium text-slate-500 mb-1.5 block'>Gem ID</label>
            <Input
              className='h-9'
              value={gemIdFilter}
              onChange={(e) => setGemIdFilter(e.target.value)}
              placeholder='Search ID'
            />
          </div>

          <div>
            <label className='text-xs font-medium text-slate-500 mb-1.5 block'>Status</label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className='h-9'>
                <SelectValue placeholder='All Statuses' />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='all'>All Statuses</SelectItem>
                <SelectItem value={GEM_STATUSES.DRAFT_INTAKE}>Draft Intake</SelectItem>
                <SelectItem value={GEM_STATUSES.TOOK_IN}>Took In</SelectItem>
                <SelectItem value={GEM_STATUSES.READY_FOR_T1}>Ready for T1</SelectItem>
                <SelectItem value={GEM_STATUSES.READY_FOR_T2}>Ready for T2</SelectItem>
                <SelectItem value={GEM_STATUSES.READY_FOR_APPROVAL}>Ready for Approval</SelectItem>
                <SelectItem value={GEM_STATUSES.SUBMITTED_FOR_REPORT}>
                  Submitted for Report
                </SelectItem>
                <SelectItem value={GEM_STATUSES.REQUEST_CHANGES}>Changes Requested</SelectItem>
                <SelectItem value={GEM_STATUSES.DONE}>Completed</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
              <label className='text-xs font-medium text-slate-500 mb-1.5 block'>Assignee</label>
              <Select value={assigneeFilter} onValueChange={setAssigneeFilter}>
                <SelectTrigger className='h-9'>
                  <SelectValue placeholder='All Users' />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='all'>All Users</SelectItem>
                  {users.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

          <div>
            <label className='text-xs font-medium text-slate-500 mb-1.5 block'>Start Date</label>
            <Input
              type='date'
              className='h-9'
              value={dateRange.start}
              onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
            />
          </div>
          <div>
            <label className='text-xs font-medium text-slate-500 mb-1.5 block'>End Date</label>
            <Input
              type='date'
              className='h-9'
              value={dateRange.end}
              onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
            />
          </div>
        </div>

        <GemTable
          data={gems}
          pagination={pagination}
          onPaginationChange={setPagination}
          totalRecords={totalRecords}
          isLoading={isLoading}
        />
      </div>
    </MainLayout>
  )
}
