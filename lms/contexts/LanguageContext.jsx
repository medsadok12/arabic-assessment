'use client';
import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import translations from '../translations/index';

const LanguageContext = createContext(null);

export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState('ar');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('lang');
    if (saved === 'en' || saved === 'ar') {
      setLangState(saved);
      applyHtml(saved);
    }
    setMounted(true);
  }, []);

  function applyHtml(l) {
    document.documentElement.lang = l;
    document.documentElement.dir  = l === 'ar' ? 'rtl' : 'ltr';
  }

  const setLang = useCallback((l) => {
    setLangState(l);
    localStorage.setItem('lang', l);
    applyHtml(l);
  }, []);

  const t = useCallback((key) => {
    const parts = key.split('.');
    let node = translations[lang];
    for (const p of parts) {
      if (node == null) return key;
      node = node[p];
    }
    return node ?? key;
  }, [lang]);

  const dir = lang === 'ar' ? 'rtl' : 'ltr';

  // Render with default 'ar' on server — client picks up localStorage after mount
  return (
    <LanguageContext.Provider value={{ lang, setLang, t, dir, mounted }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used inside LanguageProvider');
  return ctx;
}
