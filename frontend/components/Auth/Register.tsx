
import React, { useState } from 'react';
import { DataService } from '../../services/mockData';
import { UserRole, RegistrationStatus, User, ForeignBusinessType } from '../../types';
import { Activity, ArrowLeft, Upload, Calendar, Globe, Building, Infinity } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';

interface RegisterProps {
  onNavigateToLogin: () => void;
}

// Common countries for medical supply chain
const COUNTRIES = [
    "United States", "United Kingdom", "Germany", "France", "Switzerland", 
    "Ireland", "China", "India", "Japan", "South Korea", "Italy", 
    "Canada", "Australia", "United Arab Emirates", "Saudi Arabia", "Jordan", "Egypt"
].sort();

export const Register: React.FC<RegisterProps> = ({ onNavigateToLogin }) => {
  const { t, dir } = useLanguage();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    companyName: '',
    role: UserRole.CUSTOMER,
    address: '',
    country: 'Germany', // Default for foreign
    website: '',
    tradeLicense: '',
    tradeLicenseExpiry: '',
    tradeLicenseFile: null as File | null,
    signatory: '',
    signatoryExpiry: '',
    signatoryFile: null as File | null,
    businessType: ForeignBusinessType.MANUFACTURER,
  });

  const [fileDataUrls, setFileDataUrls] = useState<{ [key: string]: string }>({});
  const [message, setMessage] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);

  const inputClasses = "mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2.5 px-3 bg-slate-50 focus:bg-white focus:ring-sky-500 focus:border-sky-500 sm:text-sm transition-colors";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!formData.tradeLicenseFile) {
        setMessage("Please attach Trade License document.");
        return;
    }

    if (formData.role !== UserRole.FOREIGN_SUPPLIER && !formData.signatoryFile) {
        setMessage("Please attach Authorized Signatory documents.");
        return;
    }

    const newUser: User = {
      id: Math.random().toString(36).substr(2, 9),
      email: formData.email,
      password: formData.password,
      name: formData.companyName,
      role: formData.role,
      status: RegistrationStatus.PENDING,
      companyDetails: {
        address: formData.address,
        website: formData.website,
        country: formData.role === UserRole.FOREIGN_SUPPLIER ? formData.country : 'UAE',
        tradeLicenseNumber: formData.tradeLicense,
        tradeLicenseExpiry: formData.tradeLicenseExpiry,
        tradeLicenseFileName: formData.tradeLicenseFile?.name,
        tradeLicenseDataUrl: fileDataUrls['tradeLicenseFile'],
        ...(formData.role === UserRole.FOREIGN_SUPPLIER ? {
            businessType: formData.businessType,
        } : {
            authorizedSignatory: formData.signatory,
            authorizedSignatoryExpiry: formData.signatoryExpiry,
            authorizedSignatoryFileName: formData.signatoryFile?.name,
            authorizedSignatoryDataUrl: fileDataUrls['signatoryFile']
        })
      }
    };

    try {
      const result = await DataService.registerUser(newUser);
      setMessage(result.message || (result.success ? 'Registration successful.' : 'Registration failed.'));
      setIsSuccess(result.success);
      if (result.success) setTimeout(() => onNavigateToLogin(), 4000);
    } catch (err: any) {
      setMessage(err?.message || 'Registration failed.');
      setIsSuccess(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
        const file = e.target.files[0];
        const name = e.target.name;
        setFormData({ ...formData, [name]: file });
        const reader = new FileReader();
        reader.onloadend = () => setFileDataUrls(prev => ({ ...prev, [name]: reader.result as string }));
        reader.readAsDataURL(file);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 py-12 px-4 sm:px-6 lg:px-8" dir={dir}>
      <div className="max-w-3xl w-full space-y-8 bg-white p-8 rounded-xl shadow-lg border border-gray-200">
        <div className="flex items-center justify-between">
           <button onClick={onNavigateToLogin} className="text-gray-400 hover:text-gray-600 flex items-center gap-1"><ArrowLeft size={16} className="rtl:rotate-180" /> {t('back')}</button>
           <div className="flex items-center gap-2"><Infinity className="text-sky-600 h-6 w-6" /><h2 className="text-2xl font-bold text-gray-900">{t('register_company')}</h2></div>
        </div>

        {isSuccess ? (
          <div className="text-center py-12"><div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4"><Activity className="h-6 w-6 text-green-600" /></div><h3 className="text-lg leading-6 font-medium text-gray-900">{t('registration_successful')}</h3><p className="mt-2 text-sm text-gray-500">{message}</p><p className="mt-4 text-sm text-sky-500">{t('redirecting')}</p></div>
        ) : (
          <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className={`border rounded-lg p-3 cursor-pointer text-center transition-all ${formData.role === UserRole.CUSTOMER ? 'border-sky-500 bg-sky-50 ring-1 ring-sky-500' : 'border-gray-200 hover:border-gray-300'}`} onClick={() => setFormData({...formData, role: UserRole.CUSTOMER})}><div className="mx-auto w-8 h-8 rounded-full bg-sky-100 flex items-center justify-center mb-2"><Building className="h-4 w-4 text-sky-700" /></div><h3 className="font-semibold text-gray-900 text-sm">{t('role_customer')}</h3></div>
              <div className={`border rounded-lg p-3 cursor-pointer text-center transition-all ${formData.role === UserRole.SUPPLIER ? 'border-purple-500 bg-purple-50 ring-1 ring-purple-500' : 'border-gray-200 hover:border-gray-300'}`} onClick={() => setFormData({...formData, role: UserRole.SUPPLIER})}><div className="mx-auto w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center mb-2"><Activity className="h-4 w-4 text-purple-700" /></div><h3 className="font-semibold text-gray-900 text-sm">{t('role_supplier')}</h3></div>
              <div className={`border rounded-lg p-3 cursor-pointer text-center transition-all ${formData.role === UserRole.FOREIGN_SUPPLIER ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500' : 'border-gray-200 hover:border-gray-300'}`} onClick={() => setFormData({...formData, role: UserRole.FOREIGN_SUPPLIER})}><div className="mx-auto w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center mb-2"><Globe className="h-4 w-4 text-blue-700" /></div><h3 className="font-semibold text-gray-900 text-sm">{t('role_foreign_supplier')}</h3></div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2 border-b border-gray-100 pb-2 mb-2"><h4 className="text-sm font-bold text-gray-500 uppercase tracking-wider">{t('company_info')}</h4></div>
              <div className="md:col-span-2"><label className="block text-sm font-medium text-gray-700">{t('company_name')}</label><input required name="companyName" type="text" className={inputClasses} value={formData.companyName} onChange={handleChange} /></div>
              <div><label className="block text-sm font-medium text-gray-700">{t('email_address')}</label><input required name="email" type="email" className={inputClasses} value={formData.email} onChange={handleChange} /></div>
              <div><label className="block text-sm font-medium text-gray-700">{t('password')}</label><input required name="password" type="password" className={inputClasses} value={formData.password} onChange={handleChange} /></div>
              
              {formData.role === UserRole.FOREIGN_SUPPLIER && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Country</label>
                    <select name="country" value={formData.country} onChange={handleChange} className={inputClasses}>
                        {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
              )}
              
              <div className={formData.role === UserRole.FOREIGN_SUPPLIER ? '' : 'md:col-span-2'}>
                  <label className="block text-sm font-medium text-gray-700">{t('address')} {formData.role === UserRole.FOREIGN_SUPPLIER ? t('address_hint') : ''}</label>
                  <input required name="address" type="text" className={inputClasses} value={formData.address} onChange={handleChange} />
              </div>

              <div className="md:col-span-2"><label className="block text-sm font-medium text-gray-700">{t('website')}</label><input required name="website" type="text" className={inputClasses} value={formData.website} onChange={handleChange} /></div>
              
              <div className="md:col-span-2 border-b border-gray-100 pb-2 mb-2 mt-4"><h4 className="text-sm font-bold text-gray-500 uppercase tracking-wider">{formData.role === UserRole.FOREIGN_SUPPLIER ? t('intl_docs') : t('local_docs')}</h4></div>
              
              {/* Common Trade License Section */}
              <div className={`p-4 rounded-lg md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4 border ${formData.role === UserRole.FOREIGN_SUPPLIER ? 'bg-blue-50 border-blue-100' : 'bg-gray-50 border-gray-200'}`}>
                {formData.role === UserRole.FOREIGN_SUPPLIER && (
                    <div className="md:col-span-2"><label className="block text-sm font-medium text-gray-700">{t('business_type')}</label><select name="businessType" value={formData.businessType} onChange={handleChange} className={inputClasses}>{Object.values(ForeignBusinessType).map(type => (<option key={type} value={type}>{type}</option>))}</select></div>
                )}
                
                <div className="md:col-span-2"><label className="block text-sm font-medium text-gray-700">{t('trade_license')}</label><input required name="tradeLicense" type="text" className={inputClasses} placeholder="e.g., TL-123456" value={formData.tradeLicense} onChange={handleChange} /></div>
                <div><label className="block text-sm font-medium text-gray-700">{t('expiry_date')}</label><div className="relative rounded-md shadow-sm"><div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none rtl:right-0 rtl:left-auto rtl:pr-3"><Calendar className="h-4 w-4 text-gray-400" /></div><input required name="tradeLicenseExpiry" type="date" className={inputClasses + " pl-10 rtl:pr-10 rtl:pl-3"} value={formData.tradeLicenseExpiry} onChange={handleChange} /></div></div>
                <div><label className="block text-sm font-medium text-gray-700">{t('attach_license')}</label><div className="mt-1 flex items-center"><label className="w-full flex justify-center px-4 py-2 border border-gray-300 border-dashed rounded-md shadow-sm text-sm font-medium text-gray-600 bg-white hover:bg-gray-50 cursor-pointer"><Upload className="mr-2 h-4 w-4" /><span>{formData.tradeLicenseFile ? formData.tradeLicenseFile.name : t('upload_file')}</span><input name="tradeLicenseFile" type="file" className="sr-only" onChange={handleFileChange} accept=".pdf,.jpg,.png" required /></label></div></div>
              </div>

              {/* Authorized Signatory only for Local */}
              {formData.role !== UserRole.FOREIGN_SUPPLIER && (
                  <div className="bg-gray-50 p-4 rounded-lg md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4 border border-gray-200">
                      <div className="md:col-span-2"><label className="block text-sm font-medium text-gray-700">{t('auth_signatory')}</label><input required name="signatory" type="text" className={inputClasses} value={formData.signatory} onChange={handleChange} /></div>
                      <div><label className="block text-sm font-medium text-gray-700">{t('signatory_expiry')}</label><div className="relative rounded-md shadow-sm"><div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none rtl:right-0 rtl:left-auto rtl:pr-3"><Calendar className="h-4 w-4 text-gray-400" /></div><input required name="signatoryExpiry" type="date" className={inputClasses + " pl-10 rtl:pr-10 rtl:pl-3"} value={formData.signatoryExpiry} onChange={handleChange} /></div></div>
                      <div><label className="block text-sm font-medium text-gray-700">{t('attach_signatory')}</label><div className="mt-1 flex items-center"><label className="w-full flex justify-center px-4 py-2 border border-gray-300 border-dashed rounded-md shadow-sm text-sm font-medium text-gray-600 bg-white hover:bg-gray-50 cursor-pointer"><Upload className="mr-2 h-4 w-4" /><span>{formData.signatoryFile ? formData.signatoryFile.name : t('upload_file')}</span><input name="signatoryFile" type="file" className="sr-only" onChange={handleFileChange} accept=".pdf,.jpg,.png" required /></label></div></div>
                  </div>
              )}
            </div>
            {message && !isSuccess && <div className="text-red-500 text-sm text-center font-medium bg-red-50 p-2 rounded">{message}</div>}
            <div><button type="submit" className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-bold text-white bg-sky-600 hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500 transition-colors">{t('submit_app')}</button></div>
          </form>
        )}
      </div>
    </div>
  );
};
