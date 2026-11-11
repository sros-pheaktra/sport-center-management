import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './context/AuthProvider'
import { ToastProvider } from './context/ToastProvider'
import Navbar from './components/Navbar'
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
import NotFoundPage from './pages/NotFoundPage'

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <div className="flex min-h-screen flex-col bg-slate-50">
            <Navbar />

            <main className="flex-1">
              <Routes>
                {/* Public */}
                <Route path="/" element={<FacilitiesPage />} />
                <Route path="/facilities/:id" element={<FacilityDetailPage />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />

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

                <Route path="*" element={<NotFoundPage />} />
              </Routes>
            </main>

            <footer className="border-t border-slate-200 bg-white py-4 text-center text-xs text-slate-400">
              Sport Center Management — full-stack coursework project
            </footer>
          </div>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}
