import { Component, ReactNode } from 'react'
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { AppShell } from './components/layout/AppShell'
import { LoginPage } from './pages/LoginPage'
import { RegisterPage } from './pages/RegisterPage'
import { DashboardPage } from './pages/DashboardPage'
import { ProjectsPage } from './pages/ProjectsPage'
import { ProjectView } from './pages/ProjectView'
import { MyTasksPage } from './pages/MyTasksPage'
import { ForgotPasswordPage } from './pages/ForgotPasswordPage'
import { ProfilePage } from './pages/ProfilePage'
import { InboxPage } from './pages/InboxPage'
import { HowToPage } from './pages/HowToPage'
import { PredefinedTasksPage } from './pages/PredefinedTasksPage'

class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null }
  static getDerivedStateFromError(error: Error) { return { error } }
  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 p-8">
          <div className="bg-white border border-red-200 rounded-xl p-6 max-w-lg w-full shadow-sm">
            <h2 className="text-base font-semibold text-red-700 mb-2">Something went wrong</h2>
            <pre className="text-xs text-slate-600 bg-slate-50 rounded p-3 overflow-auto whitespace-pre-wrap">
              {(this.state.error as Error).message}
            </pre>
            <button onClick={() => this.setState({ error: null })} className="mt-4 text-sm text-primary-600 hover:underline">Try again</button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  if (loading) return <div className="flex items-center justify-center min-h-screen text-slate-400">Loading...</div>
  if (!user) return <Navigate to="/login" replace />
  return <AppShell>{children}</AppShell>
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  if (loading) return <div className="flex items-center justify-center min-h-screen text-slate-400">Loading...</div>
  if (user) return <Navigate to="/dashboard" replace />
  return <>{children}</>
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
      <Route path="/register" element={<PublicRoute><RegisterPage /></PublicRoute>} />
      <Route path="/forgot-password" element={<PublicRoute><ForgotPasswordPage /></PublicRoute>} />
      <Route path="/dashboard" element={<PrivateRoute><DashboardPage /></PrivateRoute>} />
      <Route path="/projects" element={<PrivateRoute><ProjectsPage /></PrivateRoute>} />
      <Route path="/projects/:id" element={<PrivateRoute><ProjectView /></PrivateRoute>} />
      <Route path="/my-tasks" element={<PrivateRoute><MyTasksPage /></PrivateRoute>} />
      <Route path="/inbox" element={<PrivateRoute><InboxPage /></PrivateRoute>} />
      <Route path="/how-to" element={<PrivateRoute><HowToPage /></PrivateRoute>} />
      <Route path="/predefined-tasks" element={<PrivateRoute><PredefinedTasksPage /></PrivateRoute>} />
      <Route path="/profile" element={<PrivateRoute><ProfilePage /></PrivateRoute>} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <HashRouter>
          <AppRoutes />
        </HashRouter>
      </AuthProvider>
    </ErrorBoundary>
  )
}
