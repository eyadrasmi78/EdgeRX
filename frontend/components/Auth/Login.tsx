
import React, { useState } from 'react';
import { DataService } from '../../services/mockData';
import { User } from '../../types';
import { LogIn, Info, ArrowRight, Globe } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';

interface LoginProps {
  onLoginSuccess: (user: User) => void;
  onNavigateToRegister: () => void;
}

export const Login: React.FC<LoginProps> = ({ onLoginSuccess, onNavigateToRegister }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { t, toggleLanguage, language, dir } = useLanguage();

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setError('');
    setIsSubmitting(true);
    try {
      const result = await DataService.loginUser(email, password);
      if (result.success && result.user) {
        onLoginSuccess(result.user);
      } else {
        setError(result.message || 'Login failed');
      }
    } catch (err: any) {
      setError(err?.message || 'Login failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAutoFill = (e: string, p: string) => {
    setEmail(e);
    setPassword(p);
    setError('');
  };

  const demoAccounts = [
    { label: 'Admin', email: 'admin', pass: 'admin' },
    { label: 'Local Supplier', email: 'supplier@mediglobal.com', pass: 'password' },
    { label: 'Customer', email: 'hospital@citygeneral.com', pass: 'password' },
    { label: 'Foreign Supplier', email: 'global@biotech-germany.com', pass: 'password' },
    { label: 'Pharmacy Master', email: 'master@gulfgroup.kw', pass: 'password' },
  ];

  const inputClasses = "appearance-none rounded-none relative block w-full px-3 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 bg-slate-50 focus:bg-white focus:outline-none focus:ring-teal-500 focus:border-teal-500 focus:z-10 sm:text-sm transition-colors";

  return (
    <div className="min-h-screen flex bg-slate-50" dir={dir}>
      <div className="hidden lg:flex lg:w-1/2 relative bg-slate-900 items-center justify-center overflow-hidden">
        <div className="absolute inset-0 z-0">
             <img className="w-full h-full object-cover opacity-50" src="https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1600&q=80" alt="Modern Medical Office" />
             <div className="absolute inset-0 bg-gradient-to-br from-teal-900/80 to-slate-900/85 mix-blend-multiply"></div>
        </div>
        <div className="relative z-10 p-12 text-white pointer-events-none max-w-2xl w-full">
            <div className="bg-white/10 backdrop-blur-lg p-10 rounded-3xl border border-white/20 shadow-2xl">
                 <div className="flex items-center mb-8 border-b border-white/20 pb-8">
                    <div className="bg-white px-6 py-4 rounded-2xl shadow-lg w-full flex items-center justify-center">
                      <img src="/logo-wide.png" alt="EdgeRx" className="h-14 w-auto" />
                    </div>
                 </div>
                 <h2 className="text-3xl font-bold mb-4">{t('hero_title')}</h2>
                 <p className="text-teal-50 text-xl leading-relaxed font-light opacity-90">{t('hero_desc')}</p>
                 <div className="mt-8 flex gap-3 text-sm font-medium text-teal-200"><span className="flex items-center gap-1">✓ {t('optimized_procurement')}</span><span className="flex items-center gap-1">✓ {t('verified_supplier_network')}</span></div>
            </div>
        </div>
      </div>
      <div className="w-full lg:w-1/2 flex items-center justify-center p-4 sm:p-8 lg:p-12 overflow-y-auto relative">
        <button onClick={toggleLanguage} className="absolute top-6 right-6 flex items-center gap-2 text-gray-500 hover:text-teal-600 transition-colors"><Globe size={20} /><span className="text-sm font-bold uppercase">{language === 'en' ? 'AR' : 'EN'}</span></button>
        <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-xl shadow-lg border border-gray-200">
            <div className="flex flex-col items-center">
                <img src="/logo.png" alt="EdgeRx" className="h-24 w-auto mb-4" />
                <p className="mt-2 text-sm text-gray-600">{t('sign_in_subtitle')}</p>
            </div>
            <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
              <div className="rounded-md shadow-sm -space-y-px">
                <div><input type="text" required className={inputClasses + " rounded-t-md"} placeholder={t('email_placeholder')} value={email} onChange={(e) => setEmail(e.target.value)}/></div>
                <div><input type="password" required className={inputClasses + " rounded-b-md"} placeholder={t('password')} value={password} onChange={(e) => setPassword(e.target.value)}/></div>
              </div>
              {error && <div className="text-red-500 text-sm text-center">{error}</div>}
              <div><button type="submit" disabled={isSubmitting} className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-teal-600 hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 disabled:opacity-60"><span className="absolute left-0 inset-y-0 flex items-center pl-3"><LogIn className="h-5 w-5 text-teal-300 group-hover:text-teal-200 rtl:hidden" /></span>{isSubmitting ? '…' : t('sign_in')}</button></div>
            </form>
            <div className="bg-teal-50 border border-teal-100 rounded-xl p-4 text-xs text-teal-800 flex flex-col gap-3 shadow-inner">
              <div className="flex items-center justify-between font-semibold border-b border-teal-200 pb-2"><span className="flex items-center gap-1"><Info size={14} /> {t('demo_credentials')}</span><span className="text-[10px] font-normal text-teal-600">{t('click_use_to_autofill')}</span></div>
              <div className="grid grid-cols-1 gap-2">
                {demoAccounts.map((acc) => (
                    <div key={acc.label} className="flex items-center justify-between bg-white p-2 rounded border border-teal-100 hover:border-teal-300 transition-colors">
                        <div className="flex flex-col overflow-hidden mr-2"><span className="font-bold text-teal-700 text-[11px] uppercase tracking-wider">{acc.label}</span><span className="font-mono text-gray-500 truncate">{acc.email}</span></div>
                        <button type="button" onClick={() => handleAutoFill(acc.email, acc.pass)} className="shrink-0 flex items-center gap-1 bg-teal-100 hover:bg-teal-200 text-teal-800 px-3 py-1.5 rounded text-xs font-medium transition-colors">{t('use')} <ArrowRight size={12} className="rtl:rotate-180" /></button>
                    </div>
                ))}
              </div>
            </div>
            <div className="text-center"><p className="text-sm text-gray-600">{t('dont_have_account')}{' '}<button onClick={onNavigateToRegister} className="font-medium text-teal-600 hover:text-teal-500">{t('register_company')}</button></p></div>
        </div>
      </div>
    </div>
  );
};
