import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './context/AuthProvider'
import { ToastProvider } from './context/ToastProvider'
import AppLayout from './components/layout/AppLayout'
import { RequireAuth, RoleGuard } from './components/Guards'
import FacilitiesPage from './pages/FacilitiesPage'
import FacilityDetailPage from './pages/FacilityDetailPage'
import FacilityFormPage from './pages/FacilityFormPage'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import DashboardPage from './pages/DashboardPage'
import UsersPage from './pages/UsersPage'
import CategoriesPage from './pages/CategoriesPage'
import ProfilePage from './pages/ProfilePage'
import BookingPage from './pages/BookingPage'
import BookingDetailPage from './pages/BookingDetailPage'
import BookingsPage from './pages/BookingsPage'
import CalendarPage from './pages/CalendarPage'
import PaymentsPage from './pages/PaymentsPage'
import InvoicePage from './pages/InvoicePage'
import MembershipsPage from './pages/MembershipsPage'
import SchedulesPage from './pages/SchedulesPage'
import AttendancePage from './pages/AttendancePage'
import MaintenancePage from './pages/MaintenancePage'
import NotificationsPage from './pages/NotificationsPage'
import EquipmentPage from './pages/EquipmentPage'
import PromotionsPage from './pages/PromotionsPage'
import CheckInPage from './pages/CheckInPage'
import SettingsPage from './pages/SettingsPage'
import NotFoundPage from './pages/NotFoundPage'

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <AppLayout>
            <Routes>
              {/* Public */}
                <Route path="/" element={<FacilitiesPage />} />
                <Route path="/facilities/:id" element={<FacilityDetailPage />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />

                {/* Booking flow (Phase 2) */}
                <Route
                  path="/facilities/:id/book"
                  element={
                    <RequireAuth>
                      <BookingPage />
                    </RequireAuth>
                  }
                />
                <Route
                  path="/bookings"
                  element={
                    <RequireAuth>
                      <BookingsPage />
                    </RequireAuth>
                  }
                />
                <Route
                  path="/bookings/:reference"
                  element={
                    <RequireAuth>
                      <BookingDetailPage />
                    </RequireAuth>
                  }
                />
                <Route
                  path="/calendar"
                  element={
                    <RoleGuard roles={['admin', 'manager', 'staff']}>
                      <CalendarPage />
                    </RoleGuard>
                  }
                />

                {/* Business operations (Phase 3) */}
                <Route
                  path="/invoices/:id"
                  element={
                    <RequireAuth>
                      <InvoicePage />
                    </RequireAuth>
                  }
                />
                <Route
                  path="/payments"
                  element={
                    <RoleGuard roles={['admin', 'manager', 'staff']}>
                      <PaymentsPage />
                    </RoleGuard>
                  }
                />
                <Route
                  path="/memberships"
                  element={
                    <RoleGuard roles={['admin', 'manager', 'customer']}>
                      <MembershipsPage />
                    </RoleGuard>
                  }
                />
                <Route
                  path="/schedules"
                  element={
                    <RoleGuard roles={['admin', 'manager', 'staff']}>
                      <SchedulesPage />
                    </RoleGuard>
                  }
                />
                <Route
                  path="/attendance"
                  element={
                    <RoleGuard roles={['admin', 'manager', 'staff']}>
                      <AttendancePage />
                    </RoleGuard>
                  }
                />
                <Route
                  path="/maintenance"
                  element={
                    <RoleGuard roles={['admin', 'manager', 'staff']}>
                      <MaintenancePage />
                    </RoleGuard>
                  }
                />

                {/* Advanced features (Phase 4) */}
                <Route path="/equipment" element={<EquipmentPage />} />
                <Route
                  path="/notifications"
                  element={
                    <RequireAuth>
                      <NotificationsPage />
                    </RequireAuth>
                  }
                />
                <Route
                  path="/check-in"
                  element={
                    <RoleGuard roles={['admin', 'manager', 'staff']}>
                      <CheckInPage />
                    </RoleGuard>
                  }
                />
                <Route
                  path="/promotions"
                  element={
                    <RoleGuard roles={['admin', 'manager']}>
                      <PromotionsPage />
                    </RoleGuard>
                  }
                />

                {/* Facility management — admins and managers */}
                <Route
                  path="/facilities/new"
                  element={
                    <RoleGuard roles={['admin', 'manager']}>
                      <FacilityFormPage mode="create" />
                    </RoleGuard>
                  }
                />
                <Route
                  path="/facilities/:id/edit"
                  element={
                    <RoleGuard roles={['admin', 'manager']}>
                      <FacilityFormPage mode="edit" />
                    </RoleGuard>
                  }
                />

                {/* Staff-side pages */}
                <Route
                  path="/dashboard"
                  element={
                    <RoleGuard roles={['admin', 'manager', 'staff']}>
                      <DashboardPage />
                    </RoleGuard>
                  }
                />
                <Route
                  path="/users"
                  element={
                    <RoleGuard roles={['admin', 'manager']}>
                      <UsersPage />
                    </RoleGuard>
                  }
                />
                <Route
                  path="/categories"
                  element={
                    <RoleGuard roles={['admin', 'manager']}>
                      <CategoriesPage />
                    </RoleGuard>
                  }
                />

                {/* Any logged-in user */}
                <Route
                  path="/profile"
                  element={
                    <RequireAuth>
                      <ProfilePage />
                    </RequireAuth>
                  }
                />
                <Route
                  path="/settings"
                  element={
                    <RequireAuth>
                      <SettingsPage />
                    </RequireAuth>
                  }
                />

                <Route path="*" element={<NotFoundPage />} />
              </Routes>
          </AppLayout>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}
