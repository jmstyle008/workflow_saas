import React from 'react';
import { useLanguage } from '../App';

const LanguageToggle = () => {
  const { language, switchLanguage } = useLanguage();
  
  return (
    <div className="lang-toggle bg-[#121214] border border-white/10">
      <button
        onClick={() => switchLanguage('en')}
        className={`lang-toggle-btn ${language === 'en' ? 'active' : ''}`}
        data-testid="lang-toggle-en"
      >
        EN
      </button>
      <button
        onClick={() => switchLanguage('es')}
        className={`lang-toggle-btn ${language === 'es' ? 'active' : ''}`}
        data-testid="lang-toggle-es"
      >
        ES
      </button>
    </div>
  );
};

export default LanguageToggle;
