import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { Toaster } from './components/ui/sonner';
import { toast } from 'sonner';

// Pages
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import AuthCallback from './pages/AuthCallback';
import SuperAdminDashboard from './pages/SuperAdminDashboard';
import TenantAdminDashboard from './pages/TenantAdminDashboard';
import WorkerPortal from './pages/WorkerPortal';
import ClientPortal from './pages/ClientPortal';

import DemoShowcase from './pages/DemoShowcase';

// Config
const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = axios.create({
  baseURL: `${BACKEND_URL}/api`,
  withCredentials: true,
});

// Language context
const translations = {
  en: {
    // Common
    loading: 'Loading...',
    save: 'Save',
    cancel: 'Cancel',
    delete: 'Delete',
    edit: 'Edit',
    create: 'Create',
    search: 'Search',
    filter: 'Filter',
    actions: 'Actions',
    status: 'Status',
    name: 'Name',
    email: 'Email',
    password: 'Password',
    role: 'Role',
    description: 'Description',
    
    // Auth
    login: 'Login',
    register: 'Register',
    logout: 'Logout',
    loginWithGoogle: 'Continue with Google',
    forgotPassword: 'Forgot Password?',
    noAccount: "Don't have an account?",
    hasAccount: 'Already have an account?',
    
    // Navigation
    dashboard: 'Dashboard',
    checkpoints: 'Checkpoints',
    subtasks: 'Subtasks',
    users: 'Users',
    roles: 'Roles',
    items: 'Items',
    tasks: 'Tasks',
    settings: 'Settings',
    tenants: 'Tenants',
    analytics: 'Analytics',
    
    // Status
    registered: 'Registered',
    in_progress: 'In Progress',
    completed: 'Completed',
    pending: 'Pending',
    
    // Landing
    heroTitle: 'WORKFLOW-DRIVEN SERVICE OPERATIONS',
    heroSubtitle: 'Factory-style checkpoints for any service operation. Track progress, manage evidence, and deliver excellence.',
    getStarted: 'Get Started',
    learnMore: 'Learn More',
    
    // Features
    featureCheckpoints: 'Configurable Checkpoints',
    featureCheckpointsDesc: 'Define your workflow stages with customizable checkpoints and subtasks.',
    featureEvidence: 'Evidence Tracking',
    featureEvidenceDesc: 'Capture before/after photos, documents, and notes at every step.',
    featureRoles: 'Role-Based Access',
    featureRolesDesc: 'Assign specific permissions and checkpoint access to team members.',
    featureAudit: 'Complete Audit Trail',
    featureAuditDesc: 'Track every change with immutable audit logging.',
  },
  es: {
    // Common
    loading: 'Cargando...',
    save: 'Guardar',
    cancel: 'Cancelar',
    delete: 'Eliminar',
    edit: 'Editar',
    create: 'Crear',
    search: 'Buscar',
    filter: 'Filtrar',
    actions: 'Acciones',
    status: 'Estado',
    name: 'Nombre',
    email: 'Correo',
    password: 'Contraseña',
    role: 'Rol',
    description: 'Descripción',
    
    // Auth
    login: 'Iniciar Sesión',
    register: 'Registrarse',
    logout: 'Cerrar Sesión',
    loginWithGoogle: 'Continuar con Google',
    forgotPassword: '¿Olvidaste tu contraseña?',
    noAccount: '¿No tienes cuenta?',
    hasAccount: '¿Ya tienes cuenta?',
    
    // Navigation
    dashboard: 'Panel',
    checkpoints: 'Puntos de Control',
    subtasks: 'Subtareas',
    users: 'Usuarios',
    roles: 'Roles',
    items: 'Artículos',
    tasks: 'Tareas',
    settings: 'Configuración',
    tenants: 'Inquilinos',
    analytics: 'Analíticas',
    
    // Status
    registered: 'Registrado',
    in_progress: 'En Progreso',
    completed: 'Completado',
    pending: 'Pendiente',
    
    // Landing
    heroTitle: 'OPERACIONES DE SERVICIO IMPULSADAS POR FLUJO DE TRABAJO',
    heroSubtitle: 'Puntos de control estilo fábrica para cualquier operación de servicio. Rastrea el progreso, gestiona evidencia y entrega excelencia.',
    getStarted: 'Comenzar',
    learnMore: 'Más Información',
    
    // Features
    featureCheckpoints: 'Puntos de Control Configurables',
    featureCheckpointsDesc: 'Define las etapas de tu flujo de trabajo con puntos de control y subtareas personalizables.',
    featureEvidence: 'Seguimiento de Evidencia',
    featureEvidenceDesc: 'Captura fotos antes/después, documentos y notas en cada paso.',
    featureRoles: 'Acceso Basado en Roles',
    featureRolesDesc: 'Asigna permisos específicos y acceso a puntos de control a los miembros del equipo.',
    featureAudit: 'Pista de Auditoría Completa',
    featureAuditDesc: 'Rastrea cada cambio con registro de auditoría inmutable.',
  }
};

const LanguageContext = createContext();

export const useLanguage = () => useContext(LanguageContext);

export const LanguageProvider = ({ children }) => {
  const [language, setLanguage] = useState(() => localStorage.getItem('language') || 'es');
  
  const t = useCallback((key) => {
    return translations[language]?.[key] || translations.en[key] || key;
  }, [language]);
  
  const switchLanguage = useCallback((lang) => {
    setLanguage(lang);
    localStorage.setItem('language', lang);
  }, []);
  
  return (
    <LanguageContext.Provider value={{ language, t, switchLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
};

// Auth context
const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  
  const checkAuth = useCallback(async () => {
    // CRITICAL: If returning from OAuth callback, skip the /me check.
    // AuthCallback will exchange the session_id and establish the session first.
    if (window.location.hash?.includes('session_id=')) {
      setLoading(false);
      return;
    }
    
    try {
      const response = await API.get('/auth/me');
      setUser(response.data);
    } catch (error) {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);
  
  useEffect(() => {
    checkAuth();
  }, [checkAuth]);
  
  const login = async (email, password) => {
    const response = await API.post('/auth/login', { email, password });
    setUser(response.data);
    return response.data;
  };
  
  const register = async (email, name, password) => {
    const response = await API.post('/auth/register', { email, name, password });
    setUser(response.data);
    return response.data;
  };
  
  const logout = async () => {
    try {
      await API.post('/auth/logout');
    } catch (e) {
      // Ignore
    }
    setUser(null);
  };
  
  const processOAuthSession = async (sessionId) => {
    const response = await API.post('/auth/session', { session_id: sessionId });
    setUser(response.data);
    return response.data;
  };
  
  return (
    <AuthContext.Provider value={{ user, setUser, loading, login, register, logout, processOAuthSession, checkAuth }}>
      {children}
    </AuthContext.Provider>
  );
};

// Protected Route
const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, loading } = useAuth();
  const location = useLocation();
  
  if (loading) {
    return (
      <div className="min-h-screen bg-[#09090b] flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }
  
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // Redirect to appropriate dashboard based on role
    const roleRoutes = {
      super_admin: '/admin',
      tenant_admin: '/tenant',
      technician: '/worker',
      supervisor: '/worker',
      inspector: '/worker',
      client: '/client',
      viewer: '/client'
    };
    return <Navigate to={roleRoutes[user.role] || '/client'} replace />;
  }
  
  return children;
};

// App Router
function AppRouter() {
  const location = useLocation();
  
  // Check URL fragment for session_id synchronously during render
  if (location.hash?.includes('session_id=')) {
    return <AuthCallback />;
  }
  
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/demo" element={<DemoShowcase />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/auth/callback" element={<AuthCallback />} />
      
      {/* Super Admin Routes */}
      <Route path="/admin" element={
        <ProtectedRoute allowedRoles={['super_admin']}>
          <SuperAdminDashboard />
        </ProtectedRoute>
      } />
      <Route path="/admin/*" element={
        <ProtectedRoute allowedRoles={['super_admin']}>
          <SuperAdminDashboard />
        </ProtectedRoute>
      } />
      
      {/* Tenant Admin Routes */}
      <Route path="/tenant" element={
        <ProtectedRoute allowedRoles={['super_admin', 'tenant_admin']}>
          <TenantAdminDashboard />
        </ProtectedRoute>
      } />
      <Route path="/tenant/*" element={
        <ProtectedRoute allowedRoles={['super_admin', 'tenant_admin']}>
          <TenantAdminDashboard />
        </ProtectedRoute>
      } />
      
      {/* Worker Routes */}
      <Route path="/worker" element={
        <ProtectedRoute allowedRoles={['super_admin', 'tenant_admin', 'supervisor', 'technician', 'inspector']}>
          <WorkerPortal />
        </ProtectedRoute>
      } />
      <Route path="/worker/*" element={
        <ProtectedRoute allowedRoles={['super_admin', 'tenant_admin', 'supervisor', 'technician', 'inspector']}>
          <WorkerPortal />
        </ProtectedRoute>
      } />
      
      {/* Client Routes */}
      <Route path="/client" element={
        <ProtectedRoute allowedRoles={['super_admin', 'tenant_admin', 'client', 'viewer']}>
          <ClientPortal />
        </ProtectedRoute>
      } />
      <Route path="/client/*" element={
        <ProtectedRoute allowedRoles={['super_admin', 'tenant_admin', 'client', 'viewer']}>
          <ClientPortal />
        </ProtectedRoute>
      } />
      
      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <LanguageProvider>
      <AuthProvider>
        <BrowserRouter>
          <AppRouter />
          <Toaster position="top-right" theme="dark" />
        </BrowserRouter>
      </AuthProvider>
    </LanguageProvider>
  );
}

export default App;
export { API, BACKEND_URL };
