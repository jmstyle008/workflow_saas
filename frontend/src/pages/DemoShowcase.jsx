import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle, ArrowLeft, ArrowRight, Copy, Check } from '@phosphor-icons/react';
import { Button } from '../components/ui/button';
import LanguageToggle from '../components/LanguageToggle';
import { toast } from 'sonner';

const screenshots = [
  {
    title: 'Landing Page',
    title_es: 'Página Principal',
    description: 'Professional landing page with multi-language support (EN/ES), hero section, and feature highlights.',
    description_es: 'Página principal profesional con soporte multilingüe (EN/ES), sección hero y características destacadas.',
    url: '/login',
    role: 'Public',
    image: 'https://images.unsplash.com/photo-1774347155485-195be38eda87?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NDk1Nzh8MHwxfHNlYXJjaHwyfHxzcG9ydHMlMjBjYXIlMjBuaWdodCUyMGdhcmFnZXxlbnwwfHx8fDE3NzYxOTY5MzV8MA&ixlib=rb-4.1.0&q=85&w=800',
    features: ['Multi-language EN/ES toggle', 'Industry badges', 'Responsive design', 'Google OAuth + Email auth'],
  },
  {
    title: 'Super Admin Dashboard',
    title_es: 'Panel del Super Administrador',
    description: 'Platform-wide overview with tenant management, user administration, and system statistics.',
    description_es: 'Vista general de la plataforma con gestión de inquilinos, administración de usuarios y estadísticas.',
    credentials: 'admin@checkpointhub.com / admin123',
    url: '/admin',
    role: 'Super Admin',
    features: ['Tenant CRUD', 'User role management', 'System stats', 'Seed sample data'],
  },
  {
    title: 'Tenant Admin — Checkpoints',
    title_es: 'Admin del Inquilino — Puntos de Control',
    description: 'Configure factory-style workflow stages with subtasks, evidence requirements, and ordering.',
    description_es: 'Configura etapas de flujo de trabajo estilo fábrica con subtareas, requisitos de evidencia y orden.',
    credentials: 'carlos@elitedetail.com / demo123',
    url: '/tenant',
    role: 'Tenant Admin',
    features: ['Checkpoint CRUD', 'Subtask management', 'Evidence type config', 'Expandable subtask view'],
  },
  {
    title: 'Tenant Admin — Items',
    title_es: 'Admin del Inquilino — Artículos',
    description: 'Manage service items (vehicles, equipment) with status tracking and client assignment by email.',
    description_es: 'Gestiona artículos de servicio (vehículos, equipos) con seguimiento de estado y asignación por email.',
    credentials: 'carlos@elitedetail.com / demo123',
    url: '/tenant',
    role: 'Tenant Admin',
    features: ['Item creation', 'Assign to client by email', 'Status tracking', 'Vehicle metadata'],
  },
  {
    title: 'Tenant Admin — Team & Roles',
    title_es: 'Admin del Inquilino — Equipo y Roles',
    description: 'Manage team members with role-based access control. System and custom roles with granular permissions.',
    description_es: 'Gestiona miembros del equipo con control de acceso basado en roles. Roles del sistema y personalizados.',
    credentials: 'carlos@elitedetail.com / demo123',
    url: '/tenant',
    role: 'Tenant Admin',
    features: ['User management', 'Role-based permissions', 'Supervisor, Technician, Inspector, Viewer roles', 'Custom roles'],
  },
  {
    title: 'Worker Portal',
    title_es: 'Portal del Trabajador',
    description: 'Technicians view assigned items, complete subtasks, upload evidence (photos/docs/notes), and track progress through checkpoints.',
    description_es: 'Los técnicos ven artículos asignados, completan subtareas, suben evidencia y rastrean progreso.',
    credentials: 'roberto@elitedetail.com / demo123',
    url: '/worker',
    role: 'Technician',
    features: ['Task list with status', 'Evidence upload (before/during/after)', 'Checkpoint progress bars', 'Blocking logic enforcement'],
  },
  {
    title: 'Client Portal — Progress Tracking',
    title_es: 'Portal del Cliente — Seguimiento de Progreso',
    description: 'Clients see real-time progress of their items through each checkpoint with percentage completion and evidence counts.',
    description_es: 'Los clientes ven el progreso en tiempo real de sus artículos con porcentaje de completado y conteo de evidencia.',
    credentials: 'maria@cliente.com / demo123',
    url: '/client',
    role: 'Client',
    features: ['Overall progress %', 'Checkpoint timeline', 'Subtask status cards', 'Evidence count per task'],
  },
];

const demoCredentials = [
  { role: 'Super Admin', email: 'admin@checkpointhub.com', password: 'admin123', url: '/admin', color: 'text-[#FF5C00]' },
  { role: 'Tenant Admin', email: 'carlos@elitedetail.com', password: 'demo123', url: '/tenant', color: 'text-blue-500' },
  { role: 'Supervisor', email: 'miguel@elitedetail.com', password: 'demo123', url: '/worker', color: 'text-amber-500' },
  { role: 'Technician', email: 'roberto@elitedetail.com', password: 'demo123', url: '/worker', color: 'text-green-500' },
  { role: 'Inspector', email: 'pedro@elitedetail.com', password: 'demo123', url: '/worker', color: 'text-purple-500' },
  { role: 'Client (Maria)', email: 'maria@cliente.com', password: 'demo123', url: '/client', color: 'text-zinc-300' },
  { role: 'Client (Juan)', email: 'juan@cliente.com', password: 'demo123', url: '/client', color: 'text-zinc-300' },
];

const DemoShowcase = () => {
  const [activeSlide, setActiveSlide] = useState(0);
  const [copiedIdx, setCopiedIdx] = useState(null);

  const copyToClipboard = (text, idx) => {
    navigator.clipboard.writeText(text);
    setCopiedIdx(idx);
    toast.success('Copied!');
    setTimeout(() => setCopiedIdx(null), 2000);
  };

  const nextSlide = () => setActiveSlide((prev) => (prev + 1) % screenshots.length);
  const prevSlide = () => setActiveSlide((prev) => (prev - 1 + screenshots.length) % screenshots.length);

  const current = screenshots[activeSlide];

  return (
    <div className="min-h-screen bg-[#09090b]">
      {/* Header */}
      <header className="bg-[#121214] border-b border-white/10 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-[#FF5C00] flex items-center justify-center">
                <CheckCircle size={20} weight="fill" className="text-white" />
              </div>
              <span className="font-['Barlow_Condensed'] text-lg font-bold text-white uppercase tracking-wider">
                CheckpointHub
              </span>
            </Link>
            <span className="px-3 py-1 bg-[#FF5C00]/10 text-[#FF5C00] text-xs uppercase tracking-wider font-semibold">
              Demo Showcase
            </span>
          </div>
          <div className="flex items-center gap-3">
            <LanguageToggle />
            <Link to="/login">
              <Button className="bg-[#FF5C00] hover:bg-[#E05000] text-white rounded-none px-6" data-testid="try-live-btn">
                Try Live
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Feature Carousel */}
        <section className="mb-12">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="font-['Barlow_Condensed'] text-3xl font-bold text-white uppercase tracking-tight">
                Platform Screenshots
              </h1>
              <p className="text-zinc-400 mt-1">
                {activeSlide + 1} / {screenshots.length}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button onClick={prevSlide} variant="outline" className="border-white/10 text-white rounded-none w-10 h-10 p-0" data-testid="prev-slide">
                <ArrowLeft size={20} />
              </Button>
              <Button onClick={nextSlide} variant="outline" className="border-white/10 text-white rounded-none w-10 h-10 p-0" data-testid="next-slide">
                <ArrowRight size={20} />
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Screenshot preview area */}
            <div className="lg:col-span-2 bg-[#121214] border border-white/10 overflow-hidden">
              <div className="px-4 py-3 border-b border-white/10 flex items-center gap-2">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-500/60" />
                  <div className="w-3 h-3 rounded-full bg-amber-500/60" />
                  <div className="w-3 h-3 rounded-full bg-green-500/60" />
                </div>
                <span className="text-zinc-500 text-xs ml-2 font-mono">
                  checkpoint-hub-4.preview.emergentagent.com{current.url}
                </span>
              </div>
              <div className="aspect-video bg-[#09090b] flex items-center justify-center relative overflow-hidden">
                {current.image ? (
                  <img src={current.image} alt={current.title} className="w-full h-full object-cover opacity-60" />
                ) : (
                  <div className="w-full h-full grid-pattern" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-[#09090b] via-transparent to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-8">
                  <span className={`px-2 py-1 text-xs uppercase tracking-wider mb-3 inline-block ${
                    current.role === 'Super Admin' ? 'bg-[#FF5C00]/10 text-[#FF5C00]' :
                    current.role === 'Tenant Admin' ? 'bg-blue-500/10 text-blue-500' :
                    current.role === 'Technician' ? 'bg-green-500/10 text-green-500' :
                    current.role === 'Client' ? 'bg-zinc-500/10 text-zinc-300' :
                    'bg-zinc-500/10 text-zinc-400'
                  }`}>
                    {current.role}
                  </span>
                  <h2 className="font-['Barlow_Condensed'] text-2xl font-bold text-white uppercase tracking-tight">
                    {current.title}
                  </h2>
                  <p className="text-zinc-400 mt-2 max-w-xl">
                    {current.description}
                  </p>
                </div>
              </div>
            </div>

            {/* Details panel */}
            <div className="space-y-4">
              <div className="bg-[#121214] border border-white/10 p-6">
                <h3 className="font-['Barlow_Condensed'] text-lg text-white uppercase tracking-wider mb-4">
                  Key Features
                </h3>
                <ul className="space-y-3">
                  {current.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-3">
                      <CheckCircle size={16} weight="fill" className="text-[#FF5C00] mt-0.5 flex-shrink-0" />
                      <span className="text-zinc-300 text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {current.credentials && (
                <div className="bg-[#121214] border border-white/10 p-6">
                  <h3 className="font-['Barlow_Condensed'] text-lg text-white uppercase tracking-wider mb-3">
                    Demo Access
                  </h3>
                  <div className="bg-[#09090b] border border-white/10 p-3 flex items-center justify-between">
                    <code className="text-[#FF5C00] text-sm font-mono">{current.credentials}</code>
                    <button
                      onClick={() => copyToClipboard(current.credentials, -1)}
                      className="text-zinc-500 hover:text-white ml-2"
                    >
                      {copiedIdx === -1 ? <Check size={16} /> : <Copy size={16} />}
                    </button>
                  </div>
                </div>
              )}

              {/* Slide navigation dots */}
              <div className="flex justify-center gap-2 pt-2">
                {screenshots.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setActiveSlide(idx)}
                    className={`w-2 h-2 transition-all ${
                      idx === activeSlide ? 'bg-[#FF5C00] w-6' : 'bg-zinc-700 hover:bg-zinc-500'
                    }`}
                    data-testid={`slide-dot-${idx}`}
                  />
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Credentials Table */}
        <section>
          <h2 className="font-['Barlow_Condensed'] text-2xl font-bold text-white uppercase tracking-tight mb-6">
            Demo Credentials
          </h2>
          <div className="bg-[#121214] border border-white/10">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="px-6 py-4 text-left text-xs text-zinc-500 uppercase tracking-wider">Role</th>
                  <th className="px-6 py-4 text-left text-xs text-zinc-500 uppercase tracking-wider">Email</th>
                  <th className="px-6 py-4 text-left text-xs text-zinc-500 uppercase tracking-wider">Password</th>
                  <th className="px-6 py-4 text-left text-xs text-zinc-500 uppercase tracking-wider">Portal URL</th>
                  <th className="px-6 py-4 text-right text-xs text-zinc-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {demoCredentials.map((cred, idx) => (
                  <tr key={idx} className="hover:bg-white/5">
                    <td className="px-6 py-4">
                      <span className={`font-medium ${cred.color}`}>{cred.role}</span>
                    </td>
                    <td className="px-6 py-4">
                      <code className="text-zinc-300 text-sm font-mono">{cred.email}</code>
                    </td>
                    <td className="px-6 py-4">
                      <code className="text-zinc-300 text-sm font-mono">{cred.password}</code>
                    </td>
                    <td className="px-6 py-4">
                      <code className="text-zinc-500 text-sm font-mono">{cred.url}</code>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(`${cred.email} / ${cred.password}`, idx)}
                          className="text-zinc-400 hover:text-white text-xs"
                          data-testid={`copy-cred-${idx}`}
                        >
                          {copiedIdx === idx ? <Check size={14} className="mr-1" /> : <Copy size={14} className="mr-1" />}
                          Copy
                        </Button>
                        <Link to="/login">
                          <Button size="sm" className="bg-[#FF5C00] hover:bg-[#E05000] text-white rounded-none text-xs" data-testid={`login-as-${idx}`}>
                            Login
                          </Button>
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
};

export default DemoShowcase;
