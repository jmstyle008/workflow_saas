import React from 'react';
import { Link } from 'react-router-dom';
import { useLanguage, useAuth } from '../App';
import { 
  CheckCircle, 
  Camera, 
  Users, 
  ClipboardText,
  ArrowRight,
  Wrench,
  Car,
  Factory,
  Gear
} from '@phosphor-icons/react';
import { Button } from '../components/ui/button';
import LanguageToggle from '../components/LanguageToggle';

const LandingPage = () => {
  const { t } = useLanguage();
  const { user } = useAuth();
  
  const features = [
    {
      icon: <CheckCircle size={32} weight="fill" />,
      title: t('featureCheckpoints'),
      description: t('featureCheckpointsDesc'),
    },
    {
      icon: <Camera size={32} weight="fill" />,
      title: t('featureEvidence'),
      description: t('featureEvidenceDesc'),
    },
    {
      icon: <Users size={32} weight="fill" />,
      title: t('featureRoles'),
      description: t('featureRolesDesc'),
    },
    {
      icon: <ClipboardText size={32} weight="fill" />,
      title: t('featureAudit'),
      description: t('featureAuditDesc'),
    },
  ];
  
  const industries = [
    { icon: <Car size={24} />, name: 'Auto Detailing' },
    { icon: <Wrench size={24} />, name: 'Equipment Repair' },
    { icon: <Factory size={24} />, name: 'Manufacturing' },
    { icon: <Gear size={24} />, name: 'Maintenance' },
  ];
  
  // Determine dashboard link based on user role
  const getDashboardLink = () => {
    if (!user) return '/login';
    const roleRoutes = {
      super_admin: '/admin',
      tenant_admin: '/tenant',
      technician: '/worker',
      supervisor: '/worker',
      inspector: '/worker',
      client: '/client',
      viewer: '/client'
    };
    return roleRoutes[user.role] || '/client';
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
            <span className="font-['Barlow_Condensed'] text-xl font-bold text-white uppercase tracking-wider">
              CheckpointHub
            </span>
          </div>
          
          <div className="flex items-center gap-4">
            <LanguageToggle />
            {user ? (
              <Link to={getDashboardLink()}>
                <Button 
                  data-testid="dashboard-btn"
                  className="bg-[#FF5C00] hover:bg-[#E05000] text-white rounded-none px-6"
                >
                  {t('dashboard')}
                </Button>
              </Link>
            ) : (
              <div className="flex items-center gap-2">
                <Link to="/login">
                  <Button 
                    data-testid="login-btn"
                    variant="ghost" 
                    className="text-white hover:text-[#FF5C00] rounded-none"
                  >
                    {t('login')}
                  </Button>
                </Link>
                <Link to="/register">
                  <Button 
                    data-testid="register-btn"
                    className="bg-[#FF5C00] hover:bg-[#E05000] text-white rounded-none px-6"
                  >
                    {t('getStarted')}
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      </nav>
      
      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-20">
        {/* Background Image */}
        <div 
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: `url('https://images.unsplash.com/photo-1774347155485-195be38eda87?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NDk1Nzh8MHwxfHNlYXJjaHwyfHxzcG9ydHMlMjBjYXIlMjBuaWdodCUyMGdhcmFnZXxlbnwwfHx8fDE3NzYxOTY5MzV8MA&ixlib=rb-4.1.0&q=85')`
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-[#09090b] via-[#09090b]/80 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#09090b] via-transparent to-transparent" />
        </div>
        
        {/* Grid Pattern Overlay */}
        <div className="absolute inset-0 grid-pattern opacity-50" />
        
        {/* Content */}
        <div className="relative z-10 max-w-7xl mx-auto px-6 py-20">
          <div className="max-w-2xl">
            <div className="flex items-center gap-2 mb-6">
              {industries.map((industry, idx) => (
                <div 
                  key={idx}
                  className="flex items-center gap-1 px-3 py-1 bg-white/5 border border-white/10 text-zinc-400 text-xs uppercase tracking-wider"
                >
                  {industry.icon}
                  <span className="hidden sm:inline">{industry.name}</span>
                </div>
              ))}
            </div>
            
            <h1 className="font-['Barlow_Condensed'] text-4xl sm:text-5xl lg:text-6xl font-bold text-white uppercase tracking-tight leading-tight mb-6">
              {t('heroTitle')}
            </h1>
            
            <p className="text-lg text-zinc-400 mb-8 leading-relaxed">
              {t('heroSubtitle')}
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4">
              <Link to={user ? getDashboardLink() : '/register'}>
                <Button 
                  data-testid="hero-get-started-btn"
                  className="bg-[#FF5C00] hover:bg-[#E05000] text-white rounded-none px-8 py-6 text-base uppercase tracking-wider font-semibold"
                >
                  {t('getStarted')}
                  <ArrowRight size={20} className="ml-2" />
                </Button>
              </Link>
              <Button 
                data-testid="hero-learn-more-btn"
                variant="outline" 
                className="border-white/20 text-white hover:bg-white/5 rounded-none px-8 py-6 text-base uppercase tracking-wider"
              >
                {t('learnMore')}
              </Button>
            </div>
          </div>
        </div>
        
        {/* Scroll indicator */}
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 animate-bounce">
          <div className="w-6 h-10 border-2 border-white/30 rounded-full flex items-start justify-center p-2">
            <div className="w-1 h-2 bg-[#FF5C00] rounded-full" />
          </div>
        </div>
      </section>
      
      {/* Features Section */}
      <section className="py-20 bg-[#121214]">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="font-['Barlow_Condensed'] text-2xl sm:text-3xl font-semibold text-white uppercase tracking-tight mb-4">
              Everything You Need
            </h2>
            <p className="text-zinc-400 max-w-2xl mx-auto">
              A complete platform for managing service workflows with precision and accountability.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-0">
            {features.map((feature, idx) => (
              <div 
                key={idx}
                className="p-8 bg-[#09090b] grid-border-right grid-border-bottom card-hover"
              >
                <div className="w-12 h-12 bg-[#FF5C00]/10 flex items-center justify-center mb-6 text-[#FF5C00]">
                  {feature.icon}
                </div>
                <h3 className="font-['Barlow_Condensed'] text-xl font-semibold text-white uppercase tracking-wider mb-3">
                  {feature.title}
                </h3>
                <p className="text-zinc-400 text-sm leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>
      
      {/* How It Works */}
      <section className="py-20 bg-[#09090b]">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="font-['Barlow_Condensed'] text-2xl sm:text-3xl font-semibold text-white uppercase tracking-tight mb-4">
              How It Works
            </h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { step: '01', title: 'Configure Checkpoints', desc: 'Set up your workflow stages and subtasks specific to your service.' },
              { step: '02', title: 'Assign & Track', desc: 'Workers complete tasks and upload evidence at each checkpoint.' },
              { step: '03', title: 'Deliver Excellence', desc: 'Clients track progress in real-time with complete transparency.' },
            ].map((item, idx) => (
              <div key={idx} className="relative">
                <div className="text-6xl font-['Barlow_Condensed'] font-black text-white/5 absolute -top-6 left-0">
                  {item.step}
                </div>
                <div className="pt-10">
                  <h3 className="font-['Barlow_Condensed'] text-xl font-semibold text-white uppercase tracking-wider mb-3">
                    {item.title}
                  </h3>
                  <p className="text-zinc-400 text-sm">
                    {item.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
      
      {/* CTA Section */}
      <section className="py-20 bg-[#FF5C00]">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="font-['Barlow_Condensed'] text-3xl sm:text-4xl font-bold text-white uppercase tracking-tight mb-6">
            Ready to Transform Your Operations?
          </h2>
          <p className="text-white/80 text-lg mb-8">
            Join businesses that have streamlined their service workflows with CheckpointHub.
          </p>
          <Link to={user ? getDashboardLink() : '/register'}>
            <Button 
              data-testid="cta-get-started-btn"
              className="bg-white text-[#09090b] hover:bg-zinc-100 rounded-none px-12 py-6 text-base uppercase tracking-wider font-semibold"
            >
              {t('getStarted')}
              <ArrowRight size={20} className="ml-2" />
            </Button>
          </Link>
        </div>
      </section>
      
      {/* Footer */}
      <footer className="py-12 bg-[#09090b] border-t border-white/10">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-[#FF5C00] flex items-center justify-center">
                <CheckCircle size={14} weight="fill" className="text-white" />
              </div>
              <span className="font-['Barlow_Condensed'] text-sm font-semibold text-white uppercase tracking-wider">
                CheckpointHub
              </span>
            </div>
            <p className="text-zinc-500 text-sm">
              © 2026 CheckpointHub. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
