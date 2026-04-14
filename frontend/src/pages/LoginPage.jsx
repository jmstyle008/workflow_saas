import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useLanguage, useAuth, BACKEND_URL } from '../App';
import { CheckCircle, GoogleLogo, Envelope, Lock, Eye, EyeSlash } from '@phosphor-icons/react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import LanguageToggle from '../components/LanguageToggle';
import { toast } from 'sonner';

// Helper to format API error details
function formatApiErrorDetail(detail) {
  if (detail == null) return 'Something went wrong. Please try again.';
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail))
    return detail.map((e) => (e && typeof e.msg === 'string' ? e.msg : JSON.stringify(e))).filter(Boolean).join(' ');
  if (detail && typeof detail.msg === 'string') return detail.msg;
  return String(detail);
}

const LoginPage = () => {
  const { t } = useLanguage();
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const from = location.state?.from?.pathname || '/';
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    try {
      const user = await login(email, password);
      toast.success('Login successful!');
      
      // Redirect based on role
      const roleRoutes = {
        super_admin: '/admin',
        tenant_admin: '/tenant',
        technician: '/worker',
        supervisor: '/worker',
        inspector: '/worker',
        client: '/client',
        viewer: '/client'
      };
      
      navigate(roleRoutes[user.role] || from, { replace: true });
    } catch (err) {
      setError(formatApiErrorDetail(err.response?.data?.detail) || err.message);
      toast.error('Login failed');
    } finally {
      setLoading(false);
    }
  };
  
  const handleGoogleLogin = () => {
    // REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
    const redirectUrl = window.location.origin + '/admin';
    window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
  };
  
  return (
    <div className="min-h-screen bg-[#09090b] flex">
      {/* Left side - Image */}
      <div 
        className="hidden lg:flex lg:w-1/2 bg-cover bg-center relative"
        style={{
          backgroundImage: `url('https://images.unsplash.com/photo-1760827797819-4361cd5cd353?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NTYxOTF8MHwxfHNlYXJjaHwxfHxhdXRvJTIwZGV0YWlsaW5nJTIwd29ya2VyfGVufDB8fHx8MTc3NjE5NjkyMHww&ixlib=rb-4.1.0&q=85')`
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-[#09090b] via-[#09090b]/50 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#09090b] via-transparent to-transparent" />
        
        <div className="relative z-10 p-12 flex flex-col justify-end">
          <h2 className="font-['Barlow_Condensed'] text-3xl font-bold text-white uppercase tracking-tight mb-4">
            Streamline Your Operations
          </h2>
          <p className="text-zinc-400 max-w-md">
            Join thousands of businesses using CheckpointHub to manage their service workflows with precision.
          </p>
        </div>
      </div>
      
      {/* Right side - Form */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="p-6 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-[#FF5C00] flex items-center justify-center">
              <CheckCircle size={20} weight="fill" className="text-white" />
            </div>
            <span className="font-['Barlow_Condensed'] text-xl font-bold text-white uppercase tracking-wider">
              CheckpointHub
            </span>
          </Link>
          <LanguageToggle />
        </div>
        
        {/* Form */}
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="w-full max-w-md">
            <div className="mb-8">
              <h1 className="font-['Barlow_Condensed'] text-3xl font-bold text-white uppercase tracking-tight mb-2">
                {t('login')}
              </h1>
              <p className="text-zinc-400">
                Enter your credentials to access your account
              </p>
            </div>
            
            {error && (
              <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                {error}
              </div>
            )}
            
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-zinc-400 uppercase text-xs tracking-wider">
                  {t('email')}
                </Label>
                <div className="relative">
                  <Envelope className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={20} />
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10 bg-[#121214] border-white/10 text-white rounded-none h-12 focus:ring-[#FF5C00] focus:border-[#FF5C00]"
                    placeholder="name@company.com"
                    required
                    data-testid="login-email-input"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password" className="text-zinc-400 uppercase text-xs tracking-wider">
                  {t('password')}
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={20} />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 pr-10 bg-[#121214] border-white/10 text-white rounded-none h-12 focus:ring-[#FF5C00] focus:border-[#FF5C00]"
                    placeholder="••••••••"
                    required
                    data-testid="login-password-input"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white"
                  >
                    {showPassword ? <EyeSlash size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>
              
              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-[#FF5C00] hover:bg-[#E05000] text-white rounded-none h-12 uppercase tracking-wider font-semibold"
                data-testid="login-submit-btn"
              >
                {loading ? t('loading') : t('login')}
              </Button>
            </form>
            
            <div className="my-6 flex items-center gap-4">
              <div className="flex-1 h-px bg-white/10" />
              <span className="text-zinc-500 text-xs uppercase tracking-wider">or</span>
              <div className="flex-1 h-px bg-white/10" />
            </div>
            
            <Button
              type="button"
              onClick={handleGoogleLogin}
              variant="outline"
              className="w-full border-white/10 text-white hover:bg-white/5 rounded-none h-12"
              data-testid="google-login-btn"
            >
              <GoogleLogo size={20} weight="bold" className="mr-2" />
              {t('loginWithGoogle')}
            </Button>
            
            <p className="mt-8 text-center text-zinc-400 text-sm">
              {t('noAccount')}{' '}
              <Link to="/register" className="text-[#FF5C00] hover:underline">
                {t('register')}
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
