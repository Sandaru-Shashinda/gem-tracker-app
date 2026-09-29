import { useMemo } from "react"
import { createColumnHelper, type PaginationState } from "@tanstack/react-table"
import { Button } from "@/components/ui/button"
import DataTable from "@/components/shared/data-table/DataTable"
import { RefreshCw, SlidersHorizontal } from "lucide-react"
import { REPORT_MODES, customSizeLabel } from "@/lib/types"
import { StatusBadge } from "@/components/shared/common/StatusBadge"
import { Badge } from "@/components/ui/badge"

interface Report {
  _id: string
  reportId: string
  gemId: {
    _id: string
    gemId: string
    color: string
    weight: number
    status: string
    reportTypes?: string[]
    reportMode?: string
  }
  reportType: string
  reportUrl: string
  issuedDate: string
  /** Present once somebody has saved a custom certificate against this report. */
  customCard?: unknown
  customMediumCard?: unknown
  customLargeCard?: unknown
}

interface ReportsTableProps {
  data: Report[]
  pagination: PaginationState
  onPaginationChange: (
    updater: PaginationState | ((state: PaginationState) => PaginationState),
  ) => void
  totalRecords: number
  isLoading?: boolean
  /** Opens the one page this report is edited on, whichever that turns out to be. */
  onOpenReport: (reportId: string, isCustom: boolean) => void
}

const columnHelper = createColumnHelper<Report>()

export function ReportsTable({
  data,
  pagination,
  onPaginationChange,
  totalRecords,
  isLoading,
  onOpenReport,
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
      columnHelper.accessor("gemId.reportTypes", {
        header: "Requested Types",
        cell: (info) => {
          const reportTypes = info.getValue() || []
          if (info.row.original.gemId?.reportMode === REPORT_MODES.CUSTOM) {
            return (
              <Badge className='bg-amber-100 text-amber-800 text-[10px] px-1.5 py-0 hover:bg-amber-100'>
                Custom {customSizeLabel(info.row.original.reportType)}
              </Badge>
            )
          }
          return (
            <div className='flex flex-wrap gap-1'>
              {reportTypes.map((type) => (
                <Badge
                  key={type}
                  variant='outline'
                  className='capitalize text-[10px] px-1.5 py-0'
                >
                  {type}
                </Badge>
              ))}
            </div>
          )
        },
      }),
      columnHelper.accessor("reportType", {
        header: "Type",
        // A customised report still prints at its own paper size — the badge says the
        // card's wording is this report's own, not the gem's.
        cell: (info) => (
          <div className='flex items-center gap-1.5'>
            <span className='capitalize'>{info.getValue()}</span>
            {info.row.original.customCard ||
            info.row.original.customMediumCard ||
            info.row.original.customLargeCard ? (
              <Badge className='bg-amber-100 text-amber-800 text-[10px] px-1.5 py-0 hover:bg-amber-100'>
                Custom
              </Badge>
            ) : null}
          </div>
        ),
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
          // One button, not two. Which page a report is edited on was settled at
          // intake, so offering both left whoever opened this list to work out which
          // of them applied to the row in front of them.
          const isCustom = report.gemId?.reportMode === REPORT_MODES.CUSTOM
          return (
            <Button
              variant='outline'
              size='sm'
              onClick={() => onOpenReport(report._id, isCustom)}
              className='text-slate-600'
            >
              {isCustom ? (
                <SlidersHorizontal className='w-4 h-4 mr-1' />
              ) : (
                <RefreshCw className='w-4 h-4 mr-1' />
              )}
              {isCustom ? "Edit report" : "Configure"}
            </Button>
          )
        },
      }),
    ],
    [onOpenReport],
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
