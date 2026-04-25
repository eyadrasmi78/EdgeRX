
import React, { useState } from 'react';
import { DataService } from '../../services/mockData';
import { User } from '../../types';
import { LogIn, Info, ArrowRight, Globe, Infinity } from 'lucide-react';
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const result = DataService.loginUser(email, password);
    if (result.success && result.user) {
      onLoginSuccess(result.user);
    } else {
      setError(result.message || 'Login failed');
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
    { label: 'Foreign Supplier', email: 'global@biotech-germany.com', pass: 'password' }
  ];

  const inputClasses = "appearance-none rounded-none relative block w-full px-3 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 bg-slate-50 focus:bg-white focus:outline-none focus:ring-sky-500 focus:border-sky-500 focus:z-10 sm:text-sm transition-colors";

  return (
    <div className="min-h-screen flex bg-slate-50" dir={dir}>
      <div className="hidden lg:flex lg:w-1/2 relative bg-sky-900 items-center justify-center overflow-hidden">
        <div className="absolute inset-0 z-0">
             <img className="w-full h-full object-cover opacity-50" src="https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1600&q=80" alt="Modern Medical Office" />
             <div className="absolute inset-0 bg-gradient-to-br from-sky-900/80 to-slate-900/80 mix-blend-multiply"></div>
        </div>
        <div className="relative z-10 p-12 text-white pointer-events-none max-w-2xl w-full">
            <div className="bg-white/10 backdrop-blur-lg p-10 rounded-3xl border border-white/20 shadow-2xl">
                 <div className="flex items-center gap-5 mb-8 border-b border-white/20 pb-8">
                    <div className="bg-white p-4 rounded-2xl shadow-lg flex items-center justify-center"><Infinity size={48} className="text-sky-600" /></div>
                    <div className="flex flex-col"><h1 className="text-5xl font-extrabold tracking-tight text-white leading-none">EdgeRx</h1><h2 className="text-3xl font-bold text-sky-200 font-['Almarai'] mt-2">إيدج آر إكس</h2></div>
                 </div>
                 <h2 className="text-3xl font-bold mb-4">{t('hero_title')}</h2>
                 <p className="text-sky-50 text-xl leading-relaxed font-light opacity-90">{t('hero_desc')}</p>
                 <div className="mt-8 flex gap-3 text-sm font-medium text-sky-200"><span className="flex items-center gap-1">✓ Optimized Procurement</span><span className="flex items-center gap-1">✓ Verified Supplier Network</span></div>
            </div>
        </div>
      </div>
      <div className="w-full lg:w-1/2 flex items-center justify-center p-4 sm:p-8 lg:p-12 overflow-y-auto relative">
        <button onClick={toggleLanguage} className="absolute top-6 right-6 flex items-center gap-2 text-gray-500 hover:text-sky-600 transition-colors"><Globe size={20} /><span className="text-sm font-bold uppercase">{language === 'en' ? 'AR' : 'EN'}</span></button>
        <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-xl shadow-lg border border-gray-200">
            <div className="flex flex-col items-center">
                <div className="bg-sky-600 p-3 rounded-lg mb-4"><Infinity className="text-white h-10 w-10" /></div>
                <div className="text-4xl font-extrabold tracking-tight text-slate-900">Edge<span className="text-sky-600">Rx</span></div>
              <p className="mt-2 text-sm text-gray-600">{t('sign_in_subtitle')}</p>
            </div>
            <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
              <div className="rounded-md shadow-sm -space-y-px">
                <div><input type="text" required className={inputClasses + " rounded-t-md"} placeholder={t('email_placeholder')} value={email} onChange={(e) => setEmail(e.target.value)}/></div>
                <div><input type="password" required className={inputClasses + " rounded-b-md"} placeholder={t('password')} value={password} onChange={(e) => setPassword(e.target.value)}/></div>
              </div>
              {error && <div className="text-red-500 text-sm text-center">{error}</div>}
              <div><button type="submit" className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-sky-600 hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500"><span className="absolute left-0 inset-y-0 flex items-center pl-3"><LogIn className="h-5 w-5 text-sky-500 group-hover:text-sky-400 rtl:hidden" /></span>{t('sign_in')}</button></div>
            </form>
            <div className="bg-sky-50 border border-sky-100 rounded-xl p-4 text-xs text-sky-800 flex flex-col gap-3 shadow-inner">
              <div className="flex items-center justify-between font-semibold border-b border-sky-200 pb-2"><span className="flex items-center gap-1"><Info size={14} /> Demo Credentials</span><span className="text-[10px] font-normal text-sky-600">Click Use to autofill</span></div>
              <div className="grid grid-cols-1 gap-2">
                {demoAccounts.map((acc) => (
                    <div key={acc.label} className="flex items-center justify-between bg-white p-2 rounded border border-sky-100 hover:border-sky-300 transition-colors">
                        <div className="flex flex-col overflow-hidden mr-2"><span className="font-bold text-sky-700 text-[11px] uppercase tracking-wider">{acc.label}</span><span className="font-mono text-gray-500 truncate">{acc.email}</span></div>
                        <button type="button" onClick={() => handleAutoFill(acc.email, acc.pass)} className="shrink-0 flex items-center gap-1 bg-sky-100 hover:bg-sky-200 text-sky-800 px-3 py-1.5 rounded text-xs font-medium transition-colors">Use <ArrowRight size={12} className="rtl:rotate-180" /></button>
                    </div>
                ))}
              </div>
            </div>
            <div className="text-center"><p className="text-sm text-gray-600">{t('dont_have_account')}{' '}<button onClick={onNavigateToRegister} className="font-medium text-sky-600 hover:text-sky-500">{t('register_company')}</button></p></div>
        </div>
      </div>
    </div>
  );
};
