import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './context/AuthProvider'
import { ToastProvider } from './context/ToastProvider'
import Navbar from './components/Navbar'
import FacilitiesPage from './pages/FacilitiesPage'
import FacilityDetailPage from './pages/FacilityDetailPage'
import FacilityFormPage from './pages/FacilityFormPage'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
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
                <Route path="/" element={<FacilitiesPage />} />
                <Route path="/facilities/new" element={<FacilityFormPage mode="create" />} />
                <Route path="/facilities/:id" element={<FacilityDetailPage />} />
                <Route path="/facilities/:id/edit" element={<FacilityFormPage mode="edit" />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />
                <Route path="*" element={<NotFoundPage />} />
              </Routes>
            </main>

            <footer className="border-t border-slate-200 bg-white py-4 text-center text-xs text-slate-400">
              Sport Center · Facility Listings — full-stack coursework project
            </footer>
          </div>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}
