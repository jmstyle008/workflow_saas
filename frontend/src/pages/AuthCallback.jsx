import React, { useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../App';
import { CheckCircle } from '@phosphor-icons/react';

const AuthCallback = () => {
  const { processOAuthSession, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const hasProcessed = useRef(false);
  
  useEffect(() => {
    // Use useRef to prevent double processing in StrictMode
    if (hasProcessed.current) return;
    hasProcessed.current = true;
    
    const processSession = async () => {
      // Extract session_id from URL hash
      const hash = window.location.hash;
      const sessionIdMatch = hash.match(/session_id=([^&]+)/);
      
      if (!sessionIdMatch) {
        navigate('/login', { replace: true });
        return;
      }
      
      const sessionId = sessionIdMatch[1];
      
      try {
        const userData = await processOAuthSession(sessionId);
        
        // Clear the hash from URL
        window.history.replaceState(null, '', window.location.pathname);
        
        // Redirect based on user role
        const roleRoutes = {
          super_admin: '/admin',
          tenant_admin: '/tenant',
          technician: '/worker',
          supervisor: '/worker',
          inspector: '/worker',
          client: '/client',
          viewer: '/client'
        };
        
        const redirectTo = roleRoutes[userData.role] || '/client';
        navigate(redirectTo, { replace: true, state: { user: userData } });
      } catch (error) {
        console.error('OAuth processing failed:', error);
        navigate('/login', { replace: true, state: { error: 'Authentication failed' } });
      }
    };
    
    processSession();
  }, [processOAuthSession, navigate]);
  
  return (
    <div className="min-h-screen bg-[#09090b] flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 bg-[#FF5C00] flex items-center justify-center mx-auto mb-6 animate-pulse-glow">
          <CheckCircle size={32} weight="fill" className="text-white" />
        </div>
        <h2 className="font-['Barlow_Condensed'] text-xl text-white uppercase tracking-wider mb-2">
          Authenticating
        </h2>
        <p className="text-zinc-400 text-sm">
          Please wait while we verify your credentials...
        </p>
      </div>
    </div>
  );
};

export default AuthCallback;
