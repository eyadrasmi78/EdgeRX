import React, { useEffect, useMemo, useState } from 'react';
import { PricingAgreement, User } from '../types';
import { DataService } from '../services/mockData';
import { useLanguage } from '../contexts/LanguageContext';
import {
  FileSignature, FileCheck, X, Plus, Loader2, AlertTriangle,
  Send, Hash, Trash2, CheckCircle, XCircle, ChevronRight
} from 'lucide-react';

interface AgreementsProps {
  currentUser: User;
}

const STATUS_COLORS: Record<string, string> = {
  DRAFT:             'bg-slate-200 text-slate-700',
  PENDING_CUSTOMER:  'bg-amber-100 text-amber-800',
  PENDING_ADMIN:     'bg-blue-100 text-blue-800',
  ACTIVE:            'bg-emerald-100 text-emerald-800',
  EXPIRED:           'bg-gray-200 text-gray-700',
  TERMINATED:        'bg-rose-100 text-rose-800',
};

export const PricingAgreements: React.FC<AgreementsProps> = ({ currentUser }) => {
  const { t, dir } = useLanguage();
  const isCustomer = currentUser.role === 'CUSTOMER' || currentUser.role === 'PHARMACY_MASTER';
  const isSupplier = currentUser.role === 'SUPPLIER' || currentUser.role === 'FOREIGN_SUPPLIER';
  const isAdmin = currentUser.role === 'ADMIN';

  const [list, setList] = useState<PricingAgreement[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [selected, setSelected] = useState<PricingAgreement | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try { setList(await DataService.listAgreements()); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const act = async (label: string, fn: () => Promise<{ success: boolean; agreement?: PricingAgreement; message?: string }>) => {
    setBusy(label); setError(null);
    try {
      const r = await fn();
      if (!r.success) setError(r.message || t('action_failed'));
      else { await load(); if (r.agreement) setSelected(r.agreement); }
    } finally { setBusy(null); }
  };

  return (
    <div dir={dir} className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
      <header className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-gradient-to-br from-teal-50 to-white">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <FileSignature size={18} className="text-teal-600" />
            {t('agreements_title')}
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">{t('agreements_subtitle')}</p>
        </div>
        {(isSupplier || isAdmin) && (
          <button onClick={() => setShowCreate(true)} className="bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold px-4 py-2 rounded-lg flex items-center gap-2">
            <Plus size={16}/> {t('agreement_new')}
          </button>
        )}
      </header>

      {error && <div className="mx-6 mt-4 bg-rose-50 border border-rose-200 text-rose-800 px-3 py-2 rounded-lg text-sm flex items-center gap-2"><AlertTriangle size={14}/> {error}</div>}

      <div className="p-4 sm:p-6">
        {loading ? (
          <div className="flex items-center justify-center py-12 text-slate-400 text-sm">
            <Loader2 size={16} className="animate-spin mr-2" /> {t('loading')}
          </div>
        ) : list.length === 0 ? (
          <div className="text-center py-12">
            <FileSignature size={36} className="mx-auto text-slate-300 mb-2"/>
            <p className="text-sm text-slate-500">{t('agreements_empty')}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {list.map(a => (
              <div key={a.id} onClick={() => setSelected(a)} className="bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 hover:border-teal-300 transition cursor-pointer">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${STATUS_COLORS[a.status]}`}>{a.status.replace(/_/g,' ')}</span>
                      <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-slate-200 text-slate-700">v{a.version}</span>
                      {a.autoRenew && <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-purple-100 text-purple-700">AUTO-RENEW</span>}
                    </div>
                    <h3 className="font-semibold text-sm text-slate-900 mt-1 flex items-center gap-1.5">
                      <Hash size={12} className="text-slate-400"/>{a.agreementNumber}
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {a.customerName} ↔ {a.supplierName} · {a.items.length} {t('skus')} · {a.validFrom} → {a.validTo}
                    </p>
                  </div>
                  <ChevronRight size={16} className="text-slate-400 mt-1"/>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {selected && (
        <AgreementDetail
          a={selected}
          currentUser={currentUser}
          onClose={() => setSelected(null)}
          busy={busy}
          act={act}
        />
      )}

      {showCreate && (
        <CreateAgreementModal
          currentUser={currentUser}
          onClose={() => setShowCreate(false)}
          onCreated={async () => { setShowCreate(false); await load(); }}
        />
      )}
    </div>
  );
};

const AgreementDetail: React.FC<{
  a: PricingAgreement;
  currentUser: User;
  onClose: () => void;
  busy: string | null;
  act: (label: string, fn: () => Promise<any>) => Promise<void>;
}> = ({ a, currentUser, onClose, busy, act }) => {
  const { t } = useLanguage();
  const isCustomer = currentUser.id === a.customerId;
  const isSupplier = currentUser.id === a.supplierId;
  const isAdmin = currentUser.role === 'ADMIN';
  const [signedPath, setSignedPath] = useState('');
  const [reason, setReason] = useState('');

  return (
    <div className="fixed inset-0 z-[60] bg-black/50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white w-full sm:max-w-2xl rounded-t-2xl sm:rounded-2xl max-h-[90vh] overflow-y-auto">
        <header className="sticky top-0 bg-white border-b px-5 py-3 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-1.5"><Hash size={14} className="text-slate-400"/>{a.agreementNumber}</h3>
            <p className="text-[11px] text-slate-500">{t('version')} {a.version}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700"><X size={20}/></button>
        </header>

        <div className="p-5 space-y-4 text-sm">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${STATUS_COLORS[a.status]}`}>{a.status.replace(/_/g,' ')}</span>
            {a.autoRenew && <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-purple-100 text-purple-700">AUTO-RENEW {a.renewNoticeDays}d</span>}
            <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-slate-100 text-slate-700">{a.scope.replace(/_/g,' ')}</span>
            {a.bonusesApply && <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-emerald-100 text-emerald-700">+ BONUSES</span>}
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <KV k={t('customer')} v={a.customerName}/>
            <KV k={t('supplier')} v={a.supplierName}/>
            <KV k={t('valid_from')} v={a.validFrom}/>
            <KV k={t('valid_to')} v={a.validTo}/>
            <KV k={t('moq_fallback')} v={a.moqFallbackMode.replace(/_/g,' ')}/>
            <KV k={t('currency')} v={a.currency}/>
          </div>

          <div className="border-t pt-3">
            <h4 className="font-bold text-xs uppercase tracking-wider text-slate-500 mb-2">{t('priced_items')}</h4>
            <table className="w-full text-xs">
              <thead className="bg-slate-50">
                <tr>
                  <th className="text-left p-2">{t('product')}</th>
                  <th className="text-right p-2">{t('catalog')}</th>
                  <th className="text-right p-2">{t('contract')}</th>
                  <th className="text-right p-2">MOQ</th>
                </tr>
              </thead>
              <tbody>
                {a.items.map(i => {
                  const savings = ((i.catalogPrice - i.unitPrice) / Math.max(0.01, i.catalogPrice)) * 100;
                  return (
                    <tr key={i.id} className="border-t">
                      <td className="p-2">
                        <div className="font-semibold text-slate-900">{i.productName}</div>
                        {i.tierBreaks?.length > 0 && (
                          <div className="text-[10px] text-purple-600">{i.tierBreaks.length} {t('tier_breaks')}</div>
                        )}
                      </td>
                      <td className="text-right p-2 text-slate-500 line-through">{i.catalogPrice.toFixed(2)}</td>
                      <td className="text-right p-2 font-bold text-emerald-700">
                        {i.unitPrice.toFixed(2)}
                        {savings > 0 && <span className="block text-[10px] font-normal">−{savings.toFixed(0)}%</span>}
                      </td>
                      <td className="text-right p-2">{i.minOrderQuantity}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* ── ACTIONS ── */}
          <div className="border-t pt-3 space-y-2">
            {isSupplier && a.status === 'DRAFT' && (
              <button disabled={!!busy} onClick={() => act('send', () => DataService.sendAgreementToCustomer(a.id))} className="w-full bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold py-2 rounded-lg flex items-center justify-center gap-2 disabled:opacity-50"><Send size={14}/> {t('send_to_customer')}</button>
            )}
            {isCustomer && a.status === 'PENDING_CUSTOMER' && (
              <div className="space-y-2">
                <input value={signedPath} onChange={e=>setSignedPath(e.target.value)} placeholder="/uploads/signed-agreement.pdf" className="w-full text-xs px-2 py-1 border border-slate-200 rounded"/>
                <button disabled={!!busy || !signedPath.trim()} onClick={() => act('sign', () => DataService.customerSignAgreement(a.id, signedPath))} className="w-full bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold py-2 rounded-lg flex items-center justify-center gap-2 disabled:opacity-50"><FileCheck size={14}/> {t('counter_sign')}</button>
              </div>
            )}
            {isAdmin && a.status === 'PENDING_ADMIN' && (
              <div className="flex gap-2">
                <button disabled={!!busy} onClick={() => act('approve', () => DataService.adminApproveAgreement(a.id))} className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold py-2 rounded-lg flex items-center justify-center gap-2 disabled:opacity-50"><CheckCircle size={14}/> {t('admin_approve')}</button>
                <button disabled={!!busy || !reason.trim()} onClick={() => act('reject', () => DataService.adminRejectAgreement(a.id, reason))} className="flex-1 bg-rose-600 hover:bg-rose-700 text-white text-sm font-semibold py-2 rounded-lg flex items-center justify-center gap-2 disabled:opacity-50"><XCircle size={14}/> {t('reject')}</button>
              </div>
            )}
            {(isSupplier || isCustomer || isAdmin) && a.status === 'ACTIVE' && (
              <div className="border-t pt-2 mt-2">
                <input value={reason} onChange={e=>setReason(e.target.value)} placeholder={t('reason_placeholder')} className="w-full text-xs px-2 py-1 border border-slate-200 rounded mb-1"/>
                <button disabled={!!busy || !reason.trim()} onClick={() => act('terminate', () => DataService.terminateAgreement(a.id, reason))} className="w-full bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-semibold py-1.5 rounded disabled:opacity-50">{t('terminate')}</button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const KV: React.FC<{k:string;v:any}> = ({k,v}) => (
  <div>
    <p className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">{k}</p>
    <p className="text-slate-900 font-medium">{v}</p>
  </div>
);

const CreateAgreementModal: React.FC<{
  currentUser: User;
  onClose: () => void;
  onCreated: () => Promise<void>;
}> = ({ currentUser, onClose, onCreated }) => {
  const { t } = useLanguage();
  const products = useMemo(() => DataService.getProducts(), []);
  const customers = useMemo(() => DataService.getUsers().filter(u => u.role === 'CUSTOMER' || u.role === 'PHARMACY_MASTER'), []);

  const [customerId, setCustomerId] = useState('');
  const [validFrom, setVF] = useState(new Date().toISOString().slice(0,10));
  const [validTo, setVT] = useState(new Date(Date.now()+365*864e5).toISOString().slice(0,10));
  const [autoRenew, setAR] = useState(false);
  const [moqFallback, setMoqFallback] = useState<'FALLBACK_CATALOG'|'BLOCK'|'SPLIT'>('FALLBACK_CATALOG');
  const [scope, setScope] = useState<'CUSTOMER_ONLY'|'MASTER_AND_CHILDREN'|'SPECIFIC_CHILDREN'>('CUSTOMER_ONLY');
  const [bonusesApply, setBA] = useState(true);
  const [items, setItems] = useState<{productId:string;unitPrice:number;minOrderQuantity:number}[]>([{productId:'',unitPrice:0,minOrderQuantity:1}]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string|null>(null);

  const myProducts = products.filter(p => p.supplierId === currentUser.id);
  const productPool = currentUser.role === 'ADMIN' ? products : myProducts;

  const submit = async () => {
    setBusy(true); setErr(null);
    const r = await DataService.createAgreement({
      customerId, validFrom, validTo, autoRenew,
      moqFallbackMode: moqFallback, scope, bonusesApply,
      items: items.filter(i => i.productId).map(i => ({
        productId: i.productId,
        unitPrice: Number(i.unitPrice) || 0,
        minOrderQuantity: Number(i.minOrderQuantity) || 1,
      })),
    });
    setBusy(false);
    if (!r.success) {
      const msgs = r.errors ? Object.values(r.errors).flat().join('; ') : null;
      setErr(msgs || r.message || t('create_failed'));
    } else {
      await onCreated();
    }
  };

  return (
    <div className="fixed inset-0 z-[70] bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-2xl rounded-2xl max-h-[90vh] overflow-y-auto">
        <header className="sticky top-0 bg-white border-b px-5 py-3 flex items-center justify-between">
          <h3 className="font-bold text-slate-900">{t('agreement_new')}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700"><X size={20}/></button>
        </header>
        <div className="p-5 space-y-3 text-sm">
          {err && <div className="bg-rose-50 border border-rose-200 text-rose-800 px-3 py-2 rounded text-xs">{err}</div>}

          <Field label={t('customer')}>
            <select value={customerId} onChange={e=>setCustomerId(e.target.value)} className="input">
              <option value="">— {t('select')} —</option>
              {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </Field>

          <div className="grid grid-cols-2 gap-2">
            <Field label={t('valid_from')}><input type="date" value={validFrom} onChange={e=>setVF(e.target.value)} className="input"/></Field>
            <Field label={t('valid_to')}><input type="date" value={validTo} onChange={e=>setVT(e.target.value)} className="input"/></Field>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <Field label={t('moq_fallback')}>
              <select value={moqFallback} onChange={e=>setMoqFallback(e.target.value as any)} className="input">
                <option value="FALLBACK_CATALOG">FALLBACK_CATALOG</option>
                <option value="BLOCK">BLOCK</option>
                <option value="SPLIT">SPLIT</option>
              </select>
            </Field>
            <Field label={t('scope')}>
              <select value={scope} onChange={e=>setScope(e.target.value as any)} className="input">
                <option value="CUSTOMER_ONLY">CUSTOMER_ONLY</option>
                <option value="MASTER_AND_CHILDREN">MASTER_AND_CHILDREN</option>
                <option value="SPECIFIC_CHILDREN">SPECIFIC_CHILDREN</option>
              </select>
            </Field>
            <Field label={t('toggles')}>
              <div className="flex flex-col gap-1 pt-1">
                <label className="flex items-center gap-1 text-xs"><input type="checkbox" checked={autoRenew} onChange={e=>setAR(e.target.checked)}/> {t('auto_renew')}</label>
                <label className="flex items-center gap-1 text-xs"><input type="checkbox" checked={bonusesApply} onChange={e=>setBA(e.target.checked)}/> {t('apply_bonuses')}</label>
              </div>
            </Field>
          </div>

          <div className="border-t pt-3">
            <h4 className="text-xs uppercase tracking-wider text-slate-500 font-semibold mb-2">{t('priced_items')}</h4>
            {items.map((it, idx) => (
              <div key={idx} className="grid grid-cols-12 gap-2 mb-2">
                <select value={it.productId} onChange={e=>{const c=[...items];c[idx].productId=e.target.value;setItems(c);}} className="input col-span-6">
                  <option value="">— {t('product')} —</option>
                  {productPool.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
                <input type="number" min={0} step="0.01" value={it.unitPrice} onChange={e=>{const c=[...items];c[idx].unitPrice=+e.target.value;setItems(c);}} placeholder={t('unit_price')} className="input col-span-3"/>
                <input type="number" min={1} value={it.minOrderQuantity} onChange={e=>{const c=[...items];c[idx].minOrderQuantity=+e.target.value;setItems(c);}} placeholder="MOQ" className="input col-span-2"/>
                <button onClick={()=>setItems(items.filter((_,i)=>i!==idx))} className="col-span-1 text-rose-500 hover:bg-rose-50 rounded"><Trash2 size={14}/></button>
              </div>
            ))}
            <button onClick={()=>setItems([...items, {productId:'',unitPrice:0,minOrderQuantity:1}])} className="text-teal-700 text-xs font-semibold hover:bg-teal-50 px-2 py-1 rounded">+ {t('add_item')}</button>
          </div>

          <button disabled={busy} onClick={submit} className="w-full bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold py-2 rounded-lg disabled:opacity-50">
            {busy ? <Loader2 size={14} className="animate-spin inline mr-2"/> : null}
            {t('create_draft')}
          </button>
        </div>
      </div>
      <style>{`.input{width:100%;padding:6px 10px;border:1px solid #e2e8f0;border-radius:6px;font-size:12px;background:white}`}</style>
    </div>
  );
};

const Field: React.FC<{label:string;children:React.ReactNode}> = ({label,children}) => (
  <div>
    <label className="block text-[10px] uppercase tracking-wider text-slate-500 font-semibold mb-1">{label}</label>
    {children}
  </div>
);
