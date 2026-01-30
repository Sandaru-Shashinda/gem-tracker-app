import { useState, useEffect } from "react"
import { Building2, Plus, Search } from "lucide-react"
import { MainLayout } from "@/components/layout/MainLayout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { CustomerTable } from "@/components/features/customers/CustomerTable"
import { CreateCustomerModal } from "@/components/features/customers/CreateCustomerModal"
import { EditCustomerModal } from "@/components/features/customers/EditCustomerModal"
import { DeleteCustomerDialog } from "@/components/features/customers/DeleteCustomerDialog"
import { api } from "@/lib/api"
import { useGem } from "@/hooks/useGemStore"
import type { Customer } from "@/lib/types"

export function CustomersPage() {
  const { user } = useGem()
  const [customers, setCustomers] = useState<Customer[]>([])
  const [totalRecords, setTotalRecords] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 10,
  })
  const [search, setSearch] = useState("")

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null)
  const [deletingCustomerId, setDeletingCustomerId] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const loadCustomers = async () => {
    setIsLoading(true)
    try {
      const { customers: data, total } = await api.getCustomers(
        pagination.pageIndex + 1,
        pagination.pageSize,
        search,
      )
      setCustomers(data)
      setTotalRecords(total)
    } catch (error) {
      console.error("Failed to load customers:", error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadCustomers()
  }, [pagination.pageIndex, pagination.pageSize, search])

  const handleDelete = async () => {
    if (!deletingCustomerId) return
    setIsDeleting(true)
    try {
      await api.deleteCustomer(deletingCustomerId)
      setDeletingCustomerId(null)
      loadCustomers()
    } catch (error) {
      console.error("Failed to delete customer:", error)
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <MainLayout>
      <div className='space-y-6'>
        <div className='flex flex-col md:flex-row justify-between items-start md:items-center gap-4'>
          <div className='flex items-center gap-3'>
            <div className='p-2 bg-purple-600 rounded-lg shadow-lg shadow-purple-200'>
              <Building2 className='text-white' size={24} />
            </div>
            <div>
              <h2 className='text-2xl font-bold text-slate-800'>Customer Directory</h2>
              <p className='text-xs text-slate-500 font-medium'>
                Manage client profiles and business details
              </p>
            </div>
          </div>

          <div className='flex items-center gap-3 w-full md:w-auto'>
            <div className='relative flex-1 md:w-64'>
              <Search
                className='absolute left-3 top-1/2 -translate-y-1/2 text-slate-400'
                size={16}
              />
              <Input
                placeholder='Search customers...'
                className='pl-9 bg-white border-slate-200 focus:border-purple-500 focus:ring-purple-500'
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            {user?.role === "ADMIN" && (
              <Button
                onClick={() => setIsCreateModalOpen(true)}
                className='bg-purple-600 hover:bg-purple-700 shadow-md shadow-purple-100 flex items-center gap-2 h-10 px-4 rounded-xl transition-all active:scale-95 whitespace-nowrap'
              >
                <Plus size={18} />
                <span className='font-bold hidden sm:inline'>Add Customer</span>
              </Button>
            )}
          </div>
        </div>

        <CustomerTable
          data={customers}
          onEdit={setEditingCustomer}
          onDelete={setDeletingCustomerId}
          pagination={pagination}
          onPaginationChange={setPagination}
          totalRecords={totalRecords}
          isLoading={isLoading}
          userRole={user?.role}
        />

        <CreateCustomerModal
          isOpen={isCreateModalOpen}
          onOpenChange={setIsCreateModalOpen}
          onSuccess={loadCustomers}
        />

        <EditCustomerModal
          customer={editingCustomer}
          isOpen={!!editingCustomer}
          onOpenChange={(open) => !open && setEditingCustomer(null)}
          onSuccess={loadCustomers}
        />

        <DeleteCustomerDialog
          isOpen={!!deletingCustomerId}
          onOpenChange={(open) => !open && setDeletingCustomerId(null)}
          onConfirm={handleDelete}
          isDeleting={isDeleting}
        />
      </div>
    </MainLayout>
  )
}
