import { useMemo } from "react"
import { createColumnHelper, type PaginationState } from "@tanstack/react-table"
import { Button } from "@/components/ui/button"
import DataTable from "@/components/shared/data-table/DataTable"
import { RefreshCw } from "lucide-react"
import { StatusBadge } from "@/components/shared/common/StatusBadge"

interface Report {
  _id: string
  reportId: string
  gemId: {
    _id: string
    gemId: string
    color: string
    weight: number
    status: string
  }
  reportType: string
  reportUrl: string
  issuedDate: string
}

interface ReportsTableProps {
  data: Report[]
  pagination: PaginationState
  onPaginationChange: (
    updater: PaginationState | ((state: PaginationState) => PaginationState),
  ) => void
  totalRecords: number
  isLoading?: boolean
  onGenerateReport: (gemId: string) => void
}

const columnHelper = createColumnHelper<Report>()

export function ReportsTable({
  data,
  pagination,
  onPaginationChange,
  totalRecords,
  isLoading,
  onGenerateReport,
}: ReportsTableProps) {
  const columns = useMemo(
    () => [
      columnHelper.accessor("reportId", {
        header: "Report ID",
        cell: (info) => <span className='font-bold text-slate-700'>{info.getValue()}</span>,
      }),
      columnHelper.accessor("gemId.gemId", {
        header: "Gem ID",
        cell: (info) => <span className='font-medium text-slate-900'>{info.getValue()}</span>,
      }),
      columnHelper.accessor("gemId.status", {
        header: "Gem Status",
        cell: (info) => <StatusBadge status={info.getValue()} />,
      }),
      columnHelper.accessor("reportType", {
        header: "Type",
        cell: (info) => <span className='capitalize'>{info.getValue()}</span>,
      }),
      columnHelper.accessor("issuedDate", {
        header: "Issued Date",
        cell: (info) => (
          <span className='text-sm text-slate-500'>
            {new Date(info.getValue()).toLocaleDateString()}
          </span>
        ),
      }),
      columnHelper.display({
        id: "actions",
        header: "Actions",
        cell: (info) => {
          const report = info.row.original
          return (
            <Button
              variant='outline'
              size='sm'
              onClick={() => onGenerateReport(report._id)}
              className='text-slate-600'
            >
              <RefreshCw className='w-4 h-4 mr-1' />
              Configure
            </Button>
          )
        },
      }),
    ],
    [onGenerateReport],
  )

  return (
    <DataTable
      data={data}
      columns={columns}
      pagination={pagination}
      onPaginationChange={onPaginationChange}
      totalRecords={totalRecords}
      isLoading={isLoading}
    />
  )
}
