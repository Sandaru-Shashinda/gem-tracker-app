import { useMemo } from "react"
import { createColumnHelper, type PaginationState } from "@tanstack/react-table"
import { Edit2, Trash2, Building2, MapPin, Mail, Phone } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { Customer } from "@/lib/types"
import DataTable from "@/components/shared/data-table/DataTable"
import { BASE_URL } from "@/lib/api/config"

interface CustomerTableProps {
  data: Customer[]
  onEdit: (customer: Customer) => void
  onDelete: (id: string) => void
  pagination: PaginationState
  onPaginationChange: (
    updater: PaginationState | ((state: PaginationState) => PaginationState),
  ) => void
  totalRecords: number
  isLoading?: boolean
  userRole?: string
}

const columnHelper = createColumnHelper<Customer>()

export function CustomerTable({
  data,
  onEdit,
  onDelete,
  pagination,
  onPaginationChange,
  totalRecords,
  isLoading,
  userRole,
}: CustomerTableProps) {
  const columns = useMemo(
    () => [
      columnHelper.accessor("customerName", {
        header: "Customer",
        cell: (info) => {
          const customer = info.row.original
          return (
            <div className='flex items-center gap-4'>
              <div className='w-10 h-10 rounded-xl bg-slate-100 overflow-hidden flex items-center justify-center border border-slate-200'>
                {customer.logo ? (
                  <img
                    src={`${BASE_URL}/${customer.logo}`} // Assuming logo path is relative to base url or needs API_BASE_URL
                    alt={customer.customerName}
                    className='w-full h-full object-cover'
                  />
                ) : (
                  <Building2 className='text-slate-400' size={20} />
                )}
              </div>
              <div>
                <p className='font-bold text-slate-800 leading-tight'>{customer.customerName}</p>
                <p className='text-[10px] text-slate-400 font-mono uppercase tracking-wider'>
                  {customer.companyName}
                </p>
              </div>
            </div>
          )
        },
      }),
      columnHelper.accessor("email", {
        header: "Contact Info",
        cell: (info) => {
          const customer = info.row.original
          return (
            <div className='space-y-1.5'>
              <div className='flex items-center gap-2 text-sm text-slate-500'>
                <Mail size={12} className='text-slate-300' />
                <span className='font-medium'>{customer.email}</span>
              </div>
              {customer.phoneNumber && (
                <div className='flex items-center gap-2 text-sm text-slate-500'>
                  <Phone size={12} className='text-slate-300' />
                  <span className='font-medium'>{customer.phoneNumber}</span>
                </div>
              )}
            </div>
          )
        },
      }),
      columnHelper.accessor("address", {
        header: "Address",
        cell: (info) => {
          const address = info.getValue()
          return (
            <div className='flex items-start gap-2 text-sm text-slate-500 max-w-[200px]'>
              <MapPin size={12} className='text-slate-300 shrink-0 mt-0.5' />
              <span className='font-medium line-clamp-2'>{address || "N/A"}</span>
            </div>
          )
        },
      }),
      columnHelper.display({
        id: "actions",
        header: "Actions",
        cell: (info) => {
          const customer = info.row.original

          if (userRole !== "ADMIN") return null

          return (
            <div className='flex items-center justify-end gap-1'>
              <Button
                variant='ghost'
                size='icon'
                onClick={(e) => {
                  e.stopPropagation()
                  onEdit(customer)
                }}
                className='h-8 w-8 text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-all rounded-lg'
              >
                <Edit2 size={14} />
              </Button>
              <Button
                variant='ghost'
                size='icon'
                onClick={(e) => {
                  e.stopPropagation()
                  onDelete(customer._id)
                }}
                className='h-8 w-8 text-slate-400 hover:text-red-600 hover:bg-red-50 transition-all rounded-lg'
              >
                <Trash2 size={14} />
              </Button>
            </div>
          )
        },
      }),
    ],
    [onEdit, onDelete, userRole],
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
