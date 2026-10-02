import { Card } from "@/components/ui/card"
import type { DashboardStats } from "@/lib/types"
import { HorizontalBarList } from "./HorizontalBarList"

interface TopCustomersWidgetProps {
  customers: DashboardStats["topCustomers"]
}

export function TopCustomersWidget({ customers }: TopCustomersWidgetProps) {
  return (
    <Card className='p-6 gap-4 h-full'>
      <div>
        <h3 className='font-semibold text-lg text-slate-900'>Top Customers</h3>
        <p className='text-sm text-slate-500'>By number of gems submitted</p>
      </div>
      <HorizontalBarList
        rows={customers.map((c) => ({ label: c.name, value: c.count }))}
        emptyText='No gems linked to customers yet.'
      />
    </Card>
  )
}
