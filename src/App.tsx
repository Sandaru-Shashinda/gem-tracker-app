import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom"
import { LoginPage } from "./pages/LoginPage"
import { DashboardPage } from "./pages/DashboardPage"
import { QueuePage } from "./pages/QueuePage"
import { GemDetailPage } from "./pages/GemDetailPage"
import { IntakePage } from "./pages/IntakePage"
import { StatsPage } from "./pages/StatsPage"
import { UsersPage } from "./pages/UsersPage"
import { CustomersPage } from "./pages/CustomersPage"
import { useGem } from "./hooks/useGemStore"
import { UserRole } from "./lib/types"
import { ReportPreviewPage } from "./pages/ReportPreviewPage"
import { ReportsPage } from "./pages/ReportsPage"
import { ReportConfigurationPage } from "./pages/ReportConfigurationPage"
import { SpectrometerPage } from "./pages/SpectrometerPage"

export default function App() {
  const { user } = useGem()

  return (
    <Router>
      <Routes>
        <Route path='/' element={<LoginPage />} />

        {/* Public Routes */}
        <Route path='/spectro' element={<SpectrometerPage />} />

        {/* Protected Routes */}
        <Route path='/dashboard' element={user ? <DashboardPage /> : <Navigate to='/' replace />} />
        <Route path='/queue' element={user ? <QueuePage /> : <Navigate to='/' replace />} />
        <Route path='/gems/:id' element={user ? <GemDetailPage /> : <Navigate to='/' replace />} />
        <Route
          path='/intake'
          element={
            user?.role === UserRole.HELPER || user?.role === UserRole.ADMIN ? (
              <IntakePage />
            ) : (
              <Navigate to='/dashboard' replace />
            )
          }
        />
        <Route
          path='/intake/:id'
          element={
            user?.role === UserRole.HELPER || user?.role === UserRole.ADMIN ? (
              <IntakePage />
            ) : (
              <Navigate to='/dashboard' replace />
            )
          }
        />
        <Route
          path='/stats'
          element={user?.role === UserRole.ADMIN ? <StatsPage /> : <Navigate to='/dashboard' replace />}
        />
        <Route
          path='/users'
          element={user?.role === UserRole.ADMIN ? <UsersPage /> : <Navigate to='/dashboard' replace />}
        />
        <Route
          path='/customers'
          element={
            user?.role === UserRole.ADMIN || user?.role === "HELPER" ? (
              <CustomersPage />
            ) : (
              <Navigate to='/dashboard' replace />
            )
          }
        />
        <Route
          path='/reports'
          element={
            user?.role === UserRole.ADMIN || user?.role === "HELPER" ? (
              <ReportsPage />
            ) : (
              <Navigate to='/dashboard' replace />
            )
          }
        />
        <Route path='/reports/:id' element={<ReportPreviewPage />} />
        <Route
          path='/reports/:id/configure'
          element={
            user?.role === UserRole.ADMIN || user?.role === "HELPER" ? (
              <ReportConfigurationPage />
            ) : (
              <Navigate to='/dashboard' replace />
            )
          }
        />

        {/* Catch-all redirect */}
        <Route path='*' element={<Navigate to='/' replace />} />
      </Routes>
    </Router>
  )
}
