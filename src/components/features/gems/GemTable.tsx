import { useMemo } from "react"
import { createColumnHelper, type PaginationState } from "@tanstack/react-table"
import { Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { BASE_URL } from "@/lib/api/config"
import { type Gem, GEM_STATUSES } from "@/lib/types"
import DataTable from "@/components/shared/data-table/DataTable"
import { useNavigate } from "react-router-dom"
import { StatusBadge } from "@/components/shared/common/StatusBadge"

import { GemImage } from "./GemImage"

interface GemTableProps {
  data: Gem[]
  pagination: PaginationState
  onPaginationChange: (
    updater: PaginationState | ((state: PaginationState) => PaginationState),
  ) => void
  totalRecords: number
  isLoading?: boolean
}

const columnHelper = createColumnHelper<Gem>()

export function GemTable({
  data,
  pagination,
  onPaginationChange,
  totalRecords,
  isLoading,
}: GemTableProps) {
  const navigate = useNavigate()

  const columns = useMemo(
    () => [
      // columnHelper.display({
      //   id: "image",
      //   header: "Image",
      //   cell: (info) => {
      //     const gem = info.row.original
      //     const firstImageId = gem.images && gem.images.length > 0 ? gem.images[0] : null

      //     return (
      //       <div className='h-12 w-12 rounded-lg overflow-hidden border border-slate-200'>
      //         {firstImageId ? (
      //           <GemImage imageId={firstImageId} className='h-full w-full' alt={gem.gemId} />
      //         ) : (
      //           <div className='h-full w-full bg-slate-100 flex items-center justify-center text-slate-400'>
      //             <Search className='w-4 h-4' />
      //           </div>
      //         )}
      //       </div>
      //     )
      //   },
      // }),
      columnHelper.accessor("gemId", {
        header: "Gem ID",
        cell: (info) => <span className='font-medium text-slate-900'>{info.getValue()}</span>,
      }),
      columnHelper.accessor("status", {
        header: "Status",
        cell: (info) => <StatusBadge status={info.getValue()} />,
      }),
      columnHelper.display({
        id: "intakeInfo",
        header: "Intake Info",
        cell: (info) => {
          const gem = info.row.original
          return (
            <div className='text-sm text-slate-500'>
              {gem.color} / {gem.weight}ct
            </div>
          )
        },
      }),
      columnHelper.accessor("updatedAt", {
        header: "Date",
        cell: (info) => (
          <span className='text-sm text-slate-500'>
            {new Date(info.getValue()).toLocaleDateString()}
          </span>
        ),
      }),
      columnHelper.display({
        id: "actions",
        header: "Action",
        cell: (info) => {
          const gem = info.row.original
          const isDraft = gem.status === GEM_STATUSES.DRAFT_INTAKE

          return (
            <div className='flex justify-end'>
              <Button
                variant='ghost'
                onClick={() => navigate(isDraft ? `/intake/${gem._id}` : `/gems/${gem._id}`)}
                className={
                  isDraft
                    ? "text-amber-600 hover:text-amber-900"
                    : "text-blue-600 hover:text-blue-900"
                }
              >
                {isDraft ? "Edit" : "View"}
              </Button>
            </div>
          )
        },
      }),
    ],
    [navigate],
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
