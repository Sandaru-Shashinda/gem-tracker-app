import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { MainLayout } from "@/components/layout/MainLayout"
import { ReportsTable } from "@/components/features/reports/ReportsTable"
import { reportsApi } from "@/lib/api/reports"
import { Button } from "@/components/ui/button"
import { RefreshCcw } from "lucide-react"
import type { PaginationState } from "@tanstack/react-table"

export function ReportsPage() {
  const [reports, setReports] = useState<any[]>([])
  const [totalRecords, setTotalRecords] = useState(0)
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  })
  const [isLoading, setIsLoading] = useState(false)
  const navigate = useNavigate()

  const loadReports = async () => {
    setIsLoading(true)
    try {
      const data = await reportsApi.getReports(pagination.pageIndex + 1, pagination.pageSize)
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
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadReports()
  }, [pagination.pageIndex, pagination.pageSize])

  const handleGenerateReport = async (gemId: string) => {
    navigate(`/reports/${gemId}/configure`)
  }

  return (
    <MainLayout>
      <div className='space-y-6'>
        <div className='flex justify-between items-center'>
          <div>
            <h2 className='text-2xl font-bold text-slate-800'>System Reports</h2>
            <p className='text-slate-500 text-sm'>Manage and view generated reports</p>
          </div>
          <Button variant='outline' size='sm' onClick={loadReports} disabled={isLoading}>
            <RefreshCcw className={`w-4 h-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>

        <ReportsTable
          data={reports}
          pagination={pagination}
          onPaginationChange={setPagination}
          totalRecords={totalRecords}
          isLoading={isLoading}
          onGenerateReport={handleGenerateReport}
        />
      </div>
    </MainLayout>
  )
}
