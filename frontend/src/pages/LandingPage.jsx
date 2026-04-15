import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useLanguage, useAuth, API } from '../App';
import { 
  CheckCircle, Camera, Users, ClipboardText, ArrowRight, Wrench, Car, Factory, Gear,
  Envelope, Phone, Tag, CurrencyDollar, Check, X, Monitor, Rocket, Crown
} from '@phosphor-icons/react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import LanguageToggle from '../components/LanguageToggle';
import { toast } from 'sonner';

const LandingPage = () => {
  const { t, language } = useLanguage();
  const { user } = useAuth();
  
  const [quoteForm, setQuoteForm] = useState({ name: '', email: '', phone: '', item_name: '', item_type: 'vehicle', description: '' });
  const [signupForm, setSignupForm] = useState({ company_name: '', industry: 'general', admin_name: '', admin_email: '', admin_password: '', language: 'es' });
  const [submittingQuote, setSubmittingQuote] = useState(false);
  const [submittingSignup, setSubmittingSignup] = useState(false);
  
  const features = [
    { icon: <CheckCircle size={32} weight="fill" />, title: t('featureCheckpoints'), description: t('featureCheckpointsDesc') },
    { icon: <Camera size={32} weight="fill" />, title: t('featureEvidence'), description: t('featureEvidenceDesc') },
    { icon: <Users size={32} weight="fill" />, title: t('featureRoles'), description: t('featureRolesDesc') },
    { icon: <ClipboardText size={32} weight="fill" />, title: t('featureAudit'), description: t('featureAuditDesc') },
  ];
  
  const industries = [
    { icon: <Car size={24} />, name: language === 'es' ? 'Auto Detailing' : 'Auto Detailing' },
    { icon: <Wrench size={24} />, name: language === 'es' ? 'Reparación' : 'Equipment Repair' },
    { icon: <Factory size={24} />, name: language === 'es' ? 'Manufactura' : 'Manufacturing' },
    { icon: <Gear size={24} />, name: language === 'es' ? 'Mantenimiento' : 'Maintenance' },
  ];

  const pricingTiers = [
    {
      name: language === 'es' ? 'Inicio' : 'Starter',
      price: '$49',
      period: language === 'es' ? '/mes' : '/mo',
      icon: <Monitor size={28} />,
      color: 'border-zinc-500',
      features: language === 'es' 
        ? ['1 inquilino', 'Hasta 5 usuarios', '3 puntos de control', '100 artículos/mes', 'Soporte por email', 'Subida de evidencia básica']
        : ['1 tenant', 'Up to 5 users', '3 checkpoints', '100 items/month', 'Email support', 'Basic evidence uploads'],
      excluded: language === 'es'
        ? ['API acceso', 'Reportes avanzados', 'Roles personalizados']
        : ['API access', 'Advanced reports', 'Custom roles'],
    },
    {
      name: 'Pro',
      price: '$149',
      period: language === 'es' ? '/mes' : '/mo',
      icon: <Rocket size={28} />,
      color: 'border-[#FF5C00]',
      popular: true,
      features: language === 'es'
        ? ['3 inquilinos', 'Hasta 25 usuarios', 'Puntos de control ilimitados', '1,000 artículos/mes', 'Soporte prioritario', 'Roles personalizados', 'Acceso API completo', 'Reportes y analíticas']
        : ['3 tenants', 'Up to 25 users', 'Unlimited checkpoints', '1,000 items/month', 'Priority support', 'Custom roles', 'Full API access', 'Reports & analytics'],
      excluded: language === 'es' ? ['SSO/OAuth empresarial'] : ['Enterprise SSO/OAuth'],
    },
    {
      name: language === 'es' ? 'Empresa' : 'Enterprise',
      price: '$399',
      period: language === 'es' ? '/mes' : '/mo',
      icon: <Crown size={28} />,
      color: 'border-amber-500',
      features: language === 'es'
        ? ['Inquilinos ilimitados', 'Usuarios ilimitados', 'Todo ilimitado', 'Soporte 24/7 dedicado', 'SSO/OAuth empresarial', 'Webhooks e integraciones', 'SLA personalizado', 'Onboarding dedicado', 'Marca blanca completa']
        : ['Unlimited tenants', 'Unlimited users', 'Everything unlimited', 'Dedicated 24/7 support', 'Enterprise SSO/OAuth', 'Webhooks & integrations', 'Custom SLA', 'Dedicated onboarding', 'Full white-label'],
      excluded: [],
    },
  ];
  
  const getDashboardLink = () => {
    if (!user) return '/login';
    const r = { super_admin: '/admin', tenant_admin: '/tenant', technician: '/worker', supervisor: '/worker', inspector: '/worker', receptionist: '/worker', client: '/client', viewer: '/client' };
    return r[user.role] || '/client';
  };
  
  const handleQuoteSubmit = async (e) => {
    e.preventDefault();
    setSubmittingQuote(true);
    try {
      await API.post('/public/quote-request', quoteForm);
      toast.success(language === 'es' ? 'Solicitud de cotización enviada' : 'Quote request submitted');
      setQuoteForm({ name: '', email: '', phone: '', item_name: '', item_type: 'vehicle', description: '' });
    } catch (err) { toast.error('Error'); } finally { setSubmittingQuote(false); }
  };
  
  const handleSignupSubmit = async (e) => {
    e.preventDefault();
    setSubmittingSignup(true);
    try {
      await API.post('/public/tenant-signup', signupForm);
      toast.success(language === 'es' ? 'Cuenta creada. Inicia sesión.' : 'Account created. Please login.');
      setSignupForm({ company_name: '', industry: 'general', admin_name: '', admin_email: '', admin_password: '', language: 'es' });
    } catch (err) { toast.error(err.response?.data?.detail || 'Error'); } finally { setSubmittingSignup(false); }
  };
  
  return (
    <div className="min-h-screen bg-[#09090b]">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[#09090b]/90 backdrop-blur-sm border-b border-white/10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-[#FF5C00] flex items-center justify-center">
              <CheckCircle size={20} weight="fill" className="text-white" />
            </div>
            <span className="font-['Barlow_Condensed'] text-xl font-bold text-white uppercase tracking-wider">CheckpointHub</span>
          </div>
          <div className="hidden md:flex items-center gap-6">
            <a href="#features" className="text-zinc-400 hover:text-white text-sm uppercase tracking-wider transition-colors">{language === 'es' ? 'Características' : 'Features'}</a>
            <a href="#pricing" className="text-zinc-400 hover:text-white text-sm uppercase tracking-wider transition-colors">{language === 'es' ? 'Precios' : 'Pricing'}</a>
            <a href="#quote" className="text-zinc-400 hover:text-white text-sm uppercase tracking-wider transition-colors">{language === 'es' ? 'Cotización' : 'Quote'}</a>
            <Link to="/demo" className="text-[#FF5C00] hover:text-[#E05000] text-sm uppercase tracking-wider font-semibold transition-colors" data-testid="nav-demo-link">Demo</Link>
          </div>
          <div className="flex items-center gap-3">
            <LanguageToggle />
            {user ? (
              <Link to={getDashboardLink()}><Button data-testid="dashboard-btn" className="bg-[#FF5C00] hover:bg-[#E05000] text-white rounded-none px-6">{t('dashboard')}</Button></Link>
            ) : (
              <div className="flex items-center gap-2">
                <Link to="/login"><Button data-testid="login-btn" variant="ghost" className="text-white hover:text-[#FF5C00] rounded-none">{t('login')}</Button></Link>
                <Link to="/register"><Button data-testid="register-btn" className="bg-[#FF5C00] hover:bg-[#E05000] text-white rounded-none px-6">{t('getStarted')}</Button></Link>
              </div>
            )}
          </div>
        </div>
      </nav>
      
      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-20">
        <div className="absolute inset-0 bg-cover bg-center" style={{backgroundImage: `url('https://images.unsplash.com/photo-1774347155485-195be38eda87?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NDk1Nzh8MHwxfHNlYXJjaHwyfHxzcG9ydHMlMjBjYXIlMjBuaWdodCUyMGdhcmFnZXxlbnwwfHx8fDE3NzYxOTY5MzV8MA&ixlib=rb-4.1.0&q=85')`}}>
          <div className="absolute inset-0 bg-gradient-to-r from-[#09090b] via-[#09090b]/80 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#09090b] via-transparent to-transparent" />
        </div>
        <div className="absolute inset-0 grid-pattern opacity-50" />
        <div className="relative z-10 max-w-7xl mx-auto px-6 py-20">
          <div className="max-w-2xl">
            <div className="flex items-center gap-2 mb-6 flex-wrap">
              {industries.map((ind, idx) => (
                <div key={idx} className="flex items-center gap-1 px-3 py-1 bg-white/5 border border-white/10 text-zinc-400 text-xs uppercase tracking-wider">{ind.icon}<span className="hidden sm:inline">{ind.name}</span></div>
              ))}
            </div>
            <h1 className="font-['Barlow_Condensed'] text-4xl sm:text-5xl lg:text-6xl font-bold text-white uppercase tracking-tight leading-tight mb-6">{t('heroTitle')}</h1>
            <p className="text-lg text-zinc-400 mb-8 leading-relaxed">{t('heroSubtitle')}</p>
            <div className="flex flex-col sm:flex-row gap-4">
              <a href="#signup"><Button data-testid="hero-get-started-btn" className="bg-[#FF5C00] hover:bg-[#E05000] text-white rounded-none px-8 py-6 text-base uppercase tracking-wider font-semibold">{t('getStarted')}<ArrowRight size={20} className="ml-2" /></Button></a>
              <Link to="/demo"><Button data-testid="hero-demo-btn" variant="outline" className="border-white/20 text-white hover:bg-white/5 rounded-none px-8 py-6 text-base uppercase tracking-wider">Demo</Button></Link>
            </div>
          </div>
        </div>
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 animate-bounce">
          <div className="w-6 h-10 border-2 border-white/30 rounded-full flex items-start justify-center p-2"><div className="w-1 h-2 bg-[#FF5C00] rounded-full" /></div>
        </div>
      </section>
      
      {/* Features Section */}
      <section id="features" className="py-20 bg-[#121214]">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="font-['Barlow_Condensed'] text-2xl sm:text-3xl font-semibold text-white uppercase tracking-tight mb-4">{language === 'es' ? 'Todo Lo Que Necesitas' : 'Everything You Need'}</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-0">
            {features.map((feature, idx) => (
              <div key={idx} className="p-8 bg-[#09090b] grid-border-right grid-border-bottom card-hover">
                <div className="w-12 h-12 bg-[#FF5C00]/10 flex items-center justify-center mb-6 text-[#FF5C00]">{feature.icon}</div>
                <h3 className="font-['Barlow_Condensed'] text-xl font-semibold text-white uppercase tracking-wider mb-3">{feature.title}</h3>
                <p className="text-zinc-400 text-sm leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
      
      {/* How It Works */}
      <section className="py-20 bg-[#09090b]">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="font-['Barlow_Condensed'] text-2xl sm:text-3xl font-semibold text-white uppercase tracking-tight mb-4">{language === 'es' ? 'Cómo Funciona' : 'How It Works'}</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {(language === 'es' ? [
              { step: '01', title: 'Configura Puntos de Control', desc: 'Define las etapas de tu flujo de trabajo y subtareas específicas.' },
              { step: '02', title: 'Asigna y Rastrea', desc: 'Los trabajadores completan tareas y suben evidencia en cada punto.' },
              { step: '03', title: 'Entrega Excelencia', desc: 'Los clientes rastrean el progreso en tiempo real con transparencia.' },
            ] : [
              { step: '01', title: 'Configure Checkpoints', desc: 'Set up your workflow stages and subtasks specific to your service.' },
              { step: '02', title: 'Assign & Track', desc: 'Workers complete tasks and upload evidence at each checkpoint.' },
              { step: '03', title: 'Deliver Excellence', desc: 'Clients track progress in real-time with complete transparency.' },
            ]).map((item, idx) => (
              <div key={idx} className="relative">
                <div className="text-6xl font-['Barlow_Condensed'] font-black text-white/5 absolute -top-6 left-0">{item.step}</div>
                <div className="pt-10">
                  <h3 className="font-['Barlow_Condensed'] text-xl font-semibold text-white uppercase tracking-wider mb-3">{item.title}</h3>
                  <p className="text-zinc-400 text-sm">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 bg-[#121214]">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="font-['Barlow_Condensed'] text-2xl sm:text-3xl font-semibold text-white uppercase tracking-tight mb-4">{language === 'es' ? 'Planes y Precios' : 'Plans & Pricing'}</h2>
            <p className="text-zinc-400">{language === 'es' ? 'Elige el plan perfecto para tu negocio' : 'Choose the perfect plan for your business'}</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {pricingTiers.map((tier, idx) => (
              <div key={idx} className={`bg-[#09090b] border-2 ${tier.color} p-8 relative ${tier.popular ? 'ring-1 ring-[#FF5C00]' : ''}`}>
                {tier.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#FF5C00] text-white text-xs uppercase tracking-wider px-4 py-1 font-semibold">
                    {language === 'es' ? 'Más Popular' : 'Most Popular'}
                  </div>
                )}
                <div className="text-[#FF5C00] mb-4">{tier.icon}</div>
                <h3 className="font-['Barlow_Condensed'] text-2xl font-bold text-white uppercase tracking-wider mb-2">{tier.name}</h3>
                <div className="flex items-baseline gap-1 mb-6">
                  <span className="font-['Barlow_Condensed'] text-5xl font-black text-white">{tier.price}</span>
                  <span className="text-zinc-500 text-sm">{tier.period}</span>
                </div>
                <ul className="space-y-3 mb-8">
                  {tier.features.map((f, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm"><Check size={16} weight="bold" className="text-green-500 flex-shrink-0" /><span className="text-zinc-300">{f}</span></li>
                  ))}
                  {tier.excluded.map((f, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm"><X size={16} className="text-zinc-600 flex-shrink-0" /><span className="text-zinc-600">{f}</span></li>
                  ))}
                </ul>
                <a href="#signup">
                  <Button className={`w-full rounded-none ${tier.popular ? 'bg-[#FF5C00] hover:bg-[#E05000] text-white' : 'bg-white/5 hover:bg-white/10 text-white border border-white/10'}`} data-testid={`pricing-${idx}`}>
                    {t('getStarted')}
                  </Button>
                </a>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Quote Request Form */}
      <section id="quote" className="py-20 bg-[#09090b]">
        <div className="max-w-4xl mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            <div>
              <h2 className="font-['Barlow_Condensed'] text-2xl sm:text-3xl font-semibold text-white uppercase tracking-tight mb-4">{language === 'es' ? 'Solicitar Cotización' : 'Request a Quote'}</h2>
              <p className="text-zinc-400 mb-6">{language === 'es' ? 'Envía los datos de tu vehículo y te contactaremos con un presupuesto.' : 'Submit your vehicle details and we will contact you with a quote.'}</p>
              <div className="space-y-4">
                {[
                  { icon: <CheckCircle size={20} weight="fill" />, text: language === 'es' ? 'Respuesta en menos de 24 horas' : 'Response within 24 hours' },
                  { icon: <Camera size={20} weight="fill" />, text: language === 'es' ? 'Seguimiento fotográfico completo' : 'Complete photo tracking' },
                  { icon: <ClipboardText size={20} weight="fill" />, text: language === 'es' ? 'Presupuesto detallado sin compromiso' : 'Detailed no-obligation quote' },
                ].map((item, idx) => (
                  <div key={idx} className="flex items-center gap-3 text-zinc-300"><span className="text-[#FF5C00]">{item.icon}</span>{item.text}</div>
                ))}
              </div>
            </div>
            <form onSubmit={handleQuoteSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-zinc-400 uppercase text-xs tracking-wider">{t('name')}</Label>
                  <Input value={quoteForm.name} onChange={(e) => setQuoteForm({...quoteForm, name: e.target.value})} className="bg-[#121214] border-white/10 text-white rounded-none h-11" required data-testid="quote-name" />
                </div>
                <div className="space-y-2">
                  <Label className="text-zinc-400 uppercase text-xs tracking-wider">{t('email')}</Label>
                  <Input type="email" value={quoteForm.email} onChange={(e) => setQuoteForm({...quoteForm, email: e.target.value})} className="bg-[#121214] border-white/10 text-white rounded-none h-11" required data-testid="quote-email" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-zinc-400 uppercase text-xs tracking-wider">{language === 'es' ? 'Vehículo / Artículo' : 'Vehicle / Item'}</Label>
                  <Input value={quoteForm.item_name} onChange={(e) => setQuoteForm({...quoteForm, item_name: e.target.value})} className="bg-[#121214] border-white/10 text-white rounded-none h-11" placeholder="BMW M4 2024" required data-testid="quote-item" />
                </div>
                <div className="space-y-2">
                  <Label className="text-zinc-400 uppercase text-xs tracking-wider">{language === 'es' ? 'Teléfono' : 'Phone'}</Label>
                  <Input value={quoteForm.phone} onChange={(e) => setQuoteForm({...quoteForm, phone: e.target.value})} className="bg-[#121214] border-white/10 text-white rounded-none h-11" data-testid="quote-phone" />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-zinc-400 uppercase text-xs tracking-wider">{language === 'es' ? 'Descripción del Servicio' : 'Service Description'}</Label>
                <Textarea value={quoteForm.description} onChange={(e) => setQuoteForm({...quoteForm, description: e.target.value})} className="bg-[#121214] border-white/10 text-white rounded-none resize-none" rows={3} required data-testid="quote-desc" />
              </div>
              <Button type="submit" disabled={submittingQuote} className="w-full bg-[#FF5C00] hover:bg-[#E05000] text-white rounded-none h-12 uppercase tracking-wider font-semibold" data-testid="quote-submit">
                {submittingQuote ? t('loading') : (language === 'es' ? 'Enviar Solicitud' : 'Submit Request')}
              </Button>
            </form>
          </div>
        </div>
      </section>

      {/* Tenant Self-Signup */}
      <section id="signup" className="py-20 bg-[#121214]">
        <div className="max-w-3xl mx-auto px-6">
          <div className="text-center mb-10">
            <h2 className="font-['Barlow_Condensed'] text-2xl sm:text-3xl font-semibold text-white uppercase tracking-tight mb-4">{language === 'es' ? 'Crea Tu Sitio Ahora' : 'Create Your Site Now'}</h2>
            <p className="text-zinc-400">{language === 'es' ? 'Configura tu propia instancia con datos de demostración incluidos.' : 'Set up your own instance with demo data included.'}</p>
          </div>
          <form onSubmit={handleSignupSubmit} className="bg-[#09090b] border border-white/10 p-8 space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-zinc-400 uppercase text-xs tracking-wider">{language === 'es' ? 'Nombre de Empresa' : 'Company Name'}</Label>
                <Input value={signupForm.company_name} onChange={(e) => setSignupForm({...signupForm, company_name: e.target.value})} className="bg-[#121214] border-white/10 text-white rounded-none h-11" required data-testid="signup-company" />
              </div>
              <div className="space-y-2">
                <Label className="text-zinc-400 uppercase text-xs tracking-wider">{t('industry')}</Label>
                <Select value={signupForm.industry} onValueChange={(v) => setSignupForm({...signupForm, industry: v})}>
                  <SelectTrigger className="bg-[#121214] border-white/10 text-white rounded-none h-11" data-testid="signup-industry"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-[#121214] border-white/10">
                    <SelectItem value="general">General</SelectItem>
                    <SelectItem value="auto_detailing">Auto Detailing</SelectItem>
                    <SelectItem value="auto_repair">Auto Repair</SelectItem>
                    <SelectItem value="electronics">Electronics</SelectItem>
                    <SelectItem value="appliance">Appliance</SelectItem>
                    <SelectItem value="furniture">Furniture</SelectItem>
                    <SelectItem value="equipment">Equipment</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-zinc-400 uppercase text-xs tracking-wider">{language === 'es' ? 'Tu Nombre' : 'Your Name'}</Label>
                <Input value={signupForm.admin_name} onChange={(e) => setSignupForm({...signupForm, admin_name: e.target.value})} className="bg-[#121214] border-white/10 text-white rounded-none h-11" required data-testid="signup-name" />
              </div>
              <div className="space-y-2">
                <Label className="text-zinc-400 uppercase text-xs tracking-wider">{t('email')}</Label>
                <Input type="email" value={signupForm.admin_email} onChange={(e) => setSignupForm({...signupForm, admin_email: e.target.value})} className="bg-[#121214] border-white/10 text-white rounded-none h-11" required data-testid="signup-email" />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-zinc-400 uppercase text-xs tracking-wider">{t('password')}</Label>
              <Input type="password" value={signupForm.admin_password} onChange={(e) => setSignupForm({...signupForm, admin_password: e.target.value})} className="bg-[#121214] border-white/10 text-white rounded-none h-11" required minLength={6} data-testid="signup-password" />
            </div>
            <Button type="submit" disabled={submittingSignup} className="w-full bg-[#FF5C00] hover:bg-[#E05000] text-white rounded-none h-12 uppercase tracking-wider font-semibold" data-testid="signup-submit">
              {submittingSignup ? t('loading') : (language === 'es' ? 'Crear Mi Sitio Gratis' : 'Create My Site Free')}
            </Button>
            <p className="text-center text-zinc-500 text-xs">{language === 'es' ? 'Incluye datos de demostración. Sin tarjeta de crédito.' : 'Includes demo data. No credit card required.'}</p>
          </form>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 bg-[#09090b] border-t border-white/10">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-[#FF5C00] flex items-center justify-center"><CheckCircle size={14} weight="fill" className="text-white" /></div>
              <span className="font-['Barlow_Condensed'] text-sm font-semibold text-white uppercase tracking-wider">CheckpointHub</span>
            </div>
            <div className="flex items-center gap-6">
              <Link to="/demo" className="text-zinc-500 hover:text-[#FF5C00] text-sm transition-colors">Demo</Link>
              <a href="#pricing" className="text-zinc-500 hover:text-white text-sm transition-colors">{language === 'es' ? 'Precios' : 'Pricing'}</a>
              <a href="#quote" className="text-zinc-500 hover:text-white text-sm transition-colors">{language === 'es' ? 'Cotización' : 'Quote'}</a>
            </div>
            <p className="text-zinc-500 text-sm">© 2026 CheckpointHub.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
