import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import AuthGuard from './components/AuthGuard'
import AppLayout from './components/AppLayout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Overall from './pages/Overall'
import JournalPage from './pages/JournalPage'

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route element={<AuthGuard />}>
            <Route element={<AppLayout />}>
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/overall" element={<Overall />} />
              <Route path="/journal" element={<JournalPage />} />
            </Route>
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
