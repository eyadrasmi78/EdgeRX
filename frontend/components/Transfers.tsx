import React, { useEffect, useMemo, useState } from 'react';
import { TransferRequest, TransferDiscoveryMode, User } from '../types';
import { DataService } from '../services/mockData';
import { useLanguage } from '../contexts/LanguageContext';
import {
  ArrowLeftRight, ShieldCheck, AlertTriangle, FileText, Send, X,
  CheckCircle, XCircle, Truck, Banknote, Package, Loader2, Plus,
  Snowflake, Lock, Globe2, UserCheck, Hash
} from 'lucide-react';

interface TransfersProps {
  currentUser: User;
}

const STATUS_COLORS: Record<string, string> = {
  INITIATED:           'bg-blue-100 text-blue-800',
  SUPPLIER_REVIEW:     'bg-blue-100 text-blue-800',
  ACCEPTED_BY_SUPPLIER:'bg-purple-100 text-purple-800',
  B_CONFIRMED:         'bg-purple-100 text-purple-800',
  QC_INTAKE:           'bg-amber-100 text-amber-800',
  QC_INSPECTION:       'bg-amber-100 text-amber-800',
  QC_PASSED:           'bg-emerald-100 text-emerald-800',
  QC_FAILED:           'bg-rose-100 text-rose-800',
  AWAITING_B_PAYMENT:  'bg-yellow-100 text-yellow-800',
  RELEASED:            'bg-teal-100 text-teal-800',
  COMPLETED:           'bg-emerald-100 text-emerald-800',
  CANCELLED:           'bg-gray-100 text-gray-700',
};

export const Transfers: React.FC<TransfersProps> = ({ currentUser }) => {
  const { t, dir } = useLanguage();
  const isCustomer = currentUser.role === 'CUSTOMER' || currentUser.role === 'PHARMACY_MASTER';
  const isSupplier = currentUser.role === 'SUPPLIER' || currentUser.role === 'FOREIGN_SUPPLIER';
  const isAdmin = currentUser.role === 'ADMIN';

  const [transfers, setTransfers] = useState<TransferRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<TransferRequest | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const list = await DataService.listTransfers();
      setTransfers(list);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    if (!isAdmin) return transfers;
    return transfers;
  }, [transfers, isAdmin]);

  const act = async (label: string, fn: () => Promise<{ success: boolean; transfer?: TransferRequest; message?: string }>) => {
    setBusy(label); setError(null);
    try {
      const r = await fn();
      if (!r.success) setError(r.message || t('transfer_action_failed'));
      else { await load(); if (r.transfer) setSelected(r.transfer); }
    } finally { setBusy(null); }
  };

  return (
    <div dir={dir} className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
      <header className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-gradient-to-br from-teal-50 to-white">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <ArrowLeftRight size={18} className="text-teal-600" />
            {t('transfers_title')}
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">{t('transfers_subtitle')}</p>
        </div>
        {isCustomer && (
          <button
            onClick={() => setShowCreate(true)}
            className="bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold px-4 py-2 rounded-lg flex items-center gap-2"
          >
            <Plus size={16} /> {t('transfer_new')}
          </button>
        )}
      </header>

      {error && (
        <div className="mx-6 mt-4 bg-rose-50 border border-rose-200 text-rose-800 px-3 py-2 rounded-lg text-sm flex items-center gap-2">
          <AlertTriangle size={14} /> {error}
        </div>
      )}

      <div className="p-4 sm:p-6">
        {loading ? (
          <div className="flex items-center justify-center py-12 text-slate-400 text-sm">
            <Loader2 size={16} className="animate-spin mr-2" /> {t('loading')}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12">
            <ArrowLeftRight size={36} className="mx-auto text-slate-300 mb-2" />
            <p className="text-sm text-slate-500">{t('transfers_empty')}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(tr => (
              <div key={tr.id} className="bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 hover:border-teal-300 transition cursor-pointer" onClick={() => setSelected(tr)}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${STATUS_COLORS[tr.status] || 'bg-gray-100 text-gray-700'}`}>{tr.status.replace(/_/g, ' ')}</span>
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-200 text-slate-700 flex items-center gap-1">
                        {tr.discoveryMode === 'MARKETPLACE' ? <Globe2 size={10}/> : <UserCheck size={10}/>}
                        {tr.discoveryMode}
                      </span>
                      {tr.items.some(i => i.isColdChain) && (
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-cyan-100 text-cyan-800 flex items-center gap-1">
                          <Snowflake size={10}/> COLD
                        </span>
                      )}
                    </div>
                    <h3 className="font-semibold text-sm text-slate-900 mt-1">
                      {tr.sourceUserName} → {tr.targetUserName || <span className="italic text-slate-500">{t('marketplace_unclaimed')}</span>}
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {tr.items.length} {t('items')} · {tr.supplierName} · {tr.createdAt && new Date(tr.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <ChevronRow tr={tr} t={t} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {selected && (
        <TransferDetail
          tr={selected}
          currentUser={currentUser}
          onClose={() => setSelected(null)}
          busy={busy}
          act={act}
        />
      )}

      {showCreate && isCustomer && (
        <CreateTransferModal
          currentUser={currentUser}
          onClose={() => setShowCreate(false)}
          onCreated={async () => { setShowCreate(false); await load(); }}
        />
      )}
    </div>
  );
};

const ChevronRow: React.FC<{tr:TransferRequest; t:(k:string)=>string}> = ({ tr, t }) => (
  <div className="text-right shrink-0">
    {tr.totals.targetPurchaseAmount !== undefined && (
      <p className="text-sm font-bold text-slate-900">{tr.totals.targetPurchaseAmount.toFixed(2)} KWD</p>
    )}
    {tr.totals.sourceRefundAmount !== undefined && tr.totals.targetPurchaseAmount === undefined && (
      <p className="text-sm font-bold text-emerald-700">+{tr.totals.sourceRefundAmount.toFixed(2)} KWD</p>
    )}
    <p className="text-[10px] text-slate-400 mt-0.5">{t('view_details')}</p>
  </div>
);

/* ───────────── Detail drawer ───────────── */
const TransferDetail: React.FC<{
  tr: TransferRequest;
  currentUser: User;
  onClose: () => void;
  busy: string | null;
  act: (label: string, fn: () => Promise<any>) => Promise<void>;
}> = ({ tr, currentUser, onClose, busy, act }) => {
  const { t } = useLanguage();
  const isSupplier = currentUser.id === tr.supplierId || currentUser.role === 'ADMIN';
  const isSource = currentUser.id === tr.sourceUserId;
  const isTarget = currentUser.id === tr.targetUserId;
  const isMarketplaceClaimable = tr.discoveryMode === 'MARKETPLACE' && tr.status === 'ACCEPTED_BY_SUPPLIER' && !tr.targetUserId;

  const [reason, setReason] = useState('');

  return (
    <div className="fixed inset-0 z-[60] bg-black/50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white w-full sm:max-w-2xl rounded-t-2xl sm:rounded-2xl max-h-[90vh] overflow-y-auto">
        <header className="sticky top-0 bg-white border-b px-5 py-3 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-slate-900 text-sm">{t('transfer_details')}</h3>
            <p className="text-[11px] text-slate-500">#{tr.id.slice(0, 8)}…</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700"><X size={20} /></button>
        </header>

        <div className="p-5 space-y-4 text-sm">
          <div className="flex items-center gap-2">
            <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${STATUS_COLORS[tr.status] || 'bg-gray-100 text-gray-700'}`}>{tr.status.replace(/_/g, ' ')}</span>
            <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-slate-200 text-slate-700">{tr.discoveryMode}</span>
            {tr.escrowStatus !== 'NONE' && <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-yellow-100 text-yellow-800 flex items-center gap-1"><Lock size={10}/> {t('escrow')}: {tr.escrowStatus}</span>}
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <KV k={t('source')} v={tr.sourceUserName} />
            <KV k={t('target')} v={tr.targetUserName || <span className="italic">{t('marketplace_unclaimed')}</span>} />
            <KV k={t('supplier')} v={tr.supplierName} />
            <KV k={t('items')} v={`${tr.items.length}`} />
            {tr.totals.sourceRefundAmount !== undefined && <KV k={t('refund_total')} v={`${tr.totals.sourceRefundAmount.toFixed(2)} KWD`} />}
            {tr.totals.supplierFeeApplied !== undefined && <KV k={t('handling_fee')} v={`${tr.totals.supplierFeeApplied.toFixed(2)} KWD`} />}
            {tr.totals.targetPurchaseAmount !== undefined && <KV k={t('charge_to_b')} v={`${tr.totals.targetPurchaseAmount.toFixed(2)} KWD`} />}
            {tr.sourceCreditNoteNo && <KV k={t('credit_note')} v={tr.sourceCreditNoteNo} />}
            {tr.targetInvoiceNo && <KV k={t('invoice_no')} v={tr.targetInvoiceNo} />}
          </div>

          <div className="border-t pt-3">
            <h4 className="font-bold text-xs uppercase tracking-wider text-slate-500 mb-2">{t('items')}</h4>
            <div className="space-y-2">
              {tr.items.map(i => (
                <div key={i.id} className="bg-slate-50 px-3 py-2 rounded text-xs">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-slate-900">{i.productName}</span>
                    {i.isColdChain && <span className="bg-cyan-100 text-cyan-800 px-1.5 py-0.5 rounded text-[10px] font-bold flex items-center gap-1"><Snowflake size={9}/>COLD</span>}
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                      i.qcStatus === 'PASSED' ? 'bg-emerald-100 text-emerald-800' :
                      i.qcStatus === 'FAILED' ? 'bg-rose-100 text-rose-800' :
                      'bg-amber-100 text-amber-800'
                    }`}>{i.qcStatus}</span>
                  </div>
                  <p className="text-slate-600 mt-0.5">
                    {i.quantity} units · batch {i.batchNumber}{i.lotNumber ? ` · lot ${i.lotNumber}` : ''} · exp {i.expiryDate}
                    {i.gs1Barcode && <> · <Hash size={9} className="inline"/>{i.gs1Barcode}</>}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* ── ACTIONS ── */}
          <div className="border-t pt-3 space-y-2">
            {/* Supplier review */}
            {isSupplier && tr.status === 'SUPPLIER_REVIEW' && (
              <div className="flex gap-2">
                <button disabled={!!busy} onClick={() => act('accept', () => DataService.supplierAcceptTransfer(tr.id))} className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold py-2 rounded-lg flex items-center justify-center gap-2 disabled:opacity-50"><CheckCircle size={14}/> {t('accept_transfer')}</button>
                <button disabled={!!busy || !reason.trim()} onClick={() => act('reject', () => DataService.supplierRejectTransfer(tr.id, reason))} className="flex-1 bg-rose-600 hover:bg-rose-700 text-white text-sm font-semibold py-2 rounded-lg flex items-center justify-center gap-2 disabled:opacity-50"><XCircle size={14}/> {t('reject')}</button>
              </div>
            )}

            {/* Target confirms */}
            {(isTarget || isMarketplaceClaimable) && tr.status === 'ACCEPTED_BY_SUPPLIER' && (
              <button disabled={!!busy} onClick={() => act('confirm', () => DataService.confirmTransferTarget(tr.id))} className="w-full bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold py-2 rounded-lg flex items-center justify-center gap-2 disabled:opacity-50">
                <Send size={14}/> {isMarketplaceClaimable ? t('claim_listing') : t('confirm_acceptance')}
              </button>
            )}

            {/* Supplier intake */}
            {isSupplier && tr.status === 'B_CONFIRMED' && (
              <button disabled={!!busy} onClick={() => act('intake', () => DataService.recordTransferIntake(tr.id))} className="w-full bg-amber-600 hover:bg-amber-700 text-white text-sm font-semibold py-2 rounded-lg flex items-center justify-center gap-2 disabled:opacity-50">
                <Truck size={14}/> {t('record_intake')}
              </button>
            )}

            {/* Supplier QC start */}
            {isSupplier && tr.status === 'QC_INTAKE' && (
              <button disabled={!!busy} onClick={() => act('qc-start', () => DataService.startTransferQc(tr.id))} className="w-full bg-amber-600 hover:bg-amber-700 text-white text-sm font-semibold py-2 rounded-lg flex items-center justify-center gap-2 disabled:opacity-50">
                <ShieldCheck size={14}/> {t('start_inspection')}
              </button>
            )}

            {/* Supplier pass/fail QC */}
            {isSupplier && tr.status === 'QC_INSPECTION' && (
              <div className="flex gap-2">
                <button disabled={!!busy} onClick={() => act('qc-pass', () => DataService.passTransferQc(tr.id, reason))} className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold py-2 rounded-lg flex items-center justify-center gap-2 disabled:opacity-50"><CheckCircle size={14}/> {t('qc_pass')}</button>
                <button disabled={!!busy || !reason.trim()} onClick={() => act('qc-fail', () => DataService.failTransferQc(tr.id, reason))} className="flex-1 bg-rose-600 hover:bg-rose-700 text-white text-sm font-semibold py-2 rounded-lg flex items-center justify-center gap-2 disabled:opacity-50"><XCircle size={14}/> {t('qc_fail')}</button>
              </div>
            )}

            {/* B confirms payment */}
            {isTarget && tr.status === 'AWAITING_B_PAYMENT' && (
              <button disabled={!!busy} onClick={() => act('pay', () => DataService.confirmTransferPayment(tr.id))} className="w-full bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold py-2 rounded-lg flex items-center justify-center gap-2 disabled:opacity-50">
                <Banknote size={14}/> {t('confirm_payment')} ({tr.totals.targetPurchaseAmount?.toFixed(2)} KWD)
              </button>
            )}

            {/* Supplier completes */}
            {isSupplier && tr.status === 'RELEASED' && (
              <button disabled={!!busy} onClick={() => act('complete', () => DataService.completeTransfer(tr.id, ''))} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold py-2 rounded-lg flex items-center justify-center gap-2 disabled:opacity-50">
                <Package size={14}/> {t('mark_completed')}
              </button>
            )}

            {/* Cancel */}
            {(isSource || isSupplier) && ['INITIATED','SUPPLIER_REVIEW','ACCEPTED_BY_SUPPLIER','B_CONFIRMED'].includes(tr.status) && (
              <div className="border-t pt-2 mt-2">
                <input value={reason} onChange={e=>setReason(e.target.value)} placeholder={t('reason_placeholder')} className="w-full text-xs px-2 py-1 border border-slate-200 rounded mb-1" />
                <button disabled={!!busy || !reason.trim()} onClick={() => act('cancel', () => DataService.cancelTransfer(tr.id, reason))} className="w-full bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-semibold py-1.5 rounded disabled:opacity-50">
                  {t('cancel_transfer')}
                </button>
              </div>
            )}

            {/* Audit PDF link */}
            {(tr.status === 'COMPLETED' || tr.status === 'RELEASED') && (
              <a href={DataService.transferAuditUrl(tr.id)} target="_blank" rel="noreferrer" className="block w-full bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold py-2 rounded-lg text-center flex items-center justify-center gap-2">
                <FileText size={14}/> {t('view_audit_pdf')}
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const KV: React.FC<{k:string;v:any}> = ({ k, v }) => (
  <div>
    <p className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">{k}</p>
    <p className="text-slate-900 font-medium">{v}</p>
  </div>
);

/* ───────────── Create transfer modal (simple v1) ───────────── */
const CreateTransferModal: React.FC<{
  currentUser: User;
  onClose: () => void;
  onCreated: () => Promise<void>;
}> = ({ currentUser, onClose, onCreated }) => {
  const { t } = useLanguage();
  const [discoveryMode, setMode] = useState<TransferDiscoveryMode>('DIRECT');
  const [supplierId, setSupplierId] = useState('');
  const [targetUserId, setTargetUserId] = useState('');
  const [productId, setProductId] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [unitPriceRefund, setRefund] = useState(0);
  const [unitPriceResale, setResale] = useState(0);
  const [batch, setBatch] = useState('');
  const [expiryDate, setExpiry] = useState('');
  const [tempLog, setTempLog] = useState('');
  const [feeFlat, setFeeFlat] = useState(0);
  const [feePct, setFeePct] = useState(0);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const products = DataService.getProducts();
  const users = DataService.getUsers();
  const suppliers = users.filter(u => u.role === 'SUPPLIER' || u.role === 'FOREIGN_SUPPLIER');
  const customers = users.filter(u => u.role === 'CUSTOMER' && u.id !== currentUser.id);

  const submit = async () => {
    setBusy(true); setErr(null);
    const r = await DataService.createTransfer({
      discoveryMode,
      supplierId,
      targetUserId: discoveryMode === 'DIRECT' ? targetUserId : undefined,
      supplierFeeFlat: feeFlat,
      supplierFeePercent: feePct,
      items: [{
        productId, quantity, unitPriceRefund, unitPriceResale,
        batchNumber: batch, expiryDate, temperatureLogPath: tempLog || undefined,
      }],
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
      <div className="bg-white w-full max-w-lg rounded-2xl max-h-[90vh] overflow-y-auto">
        <header className="sticky top-0 bg-white border-b px-5 py-3 flex items-center justify-between">
          <h3 className="font-bold text-slate-900">{t('transfer_new')}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700"><X size={20}/></button>
        </header>
        <div className="p-5 space-y-3 text-sm">
          {err && <div className="bg-rose-50 border border-rose-200 text-rose-800 px-3 py-2 rounded text-xs">{err}</div>}

          <Field label={t('discovery_mode')}>
            <select value={discoveryMode} onChange={e=>setMode(e.target.value as TransferDiscoveryMode)} className="input">
              <option value="DIRECT">DIRECT — {t('discovery_direct_desc')}</option>
              <option value="MARKETPLACE">MARKETPLACE — {t('discovery_marketplace_desc')}</option>
            </select>
          </Field>

          <Field label={t('local_supplier')}>
            <select value={supplierId} onChange={e=>setSupplierId(e.target.value)} className="input">
              <option value="">— {t('select')} —</option>
              {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </Field>

          {discoveryMode === 'DIRECT' && (
            <Field label={t('target_pharmacy')}>
              <select value={targetUserId} onChange={e=>setTargetUserId(e.target.value)} className="input">
                <option value="">— {t('select')} —</option>
                {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </Field>
          )}

          <Field label={t('product')}>
            <select value={productId} onChange={e=>setProductId(e.target.value)} className="input">
              <option value="">— {t('select')} —</option>
              {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </Field>

          <div className="grid grid-cols-3 gap-2">
            <Field label={t('quantity')}>
              <input type="number" min={1} value={quantity} onChange={e=>setQuantity(+e.target.value)} className="input"/>
            </Field>
            <Field label={t('refund_per_unit')}>
              <input type="number" min={0} step="0.01" value={unitPriceRefund} onChange={e=>setRefund(+e.target.value)} className="input"/>
            </Field>
            <Field label={t('resale_per_unit')}>
              <input type="number" min={0} step="0.01" value={unitPriceResale} onChange={e=>setResale(+e.target.value)} className="input"/>
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Field label={t('batch_number')}>
              <input value={batch} onChange={e=>setBatch(e.target.value)} className="input"/>
            </Field>
            <Field label={t('expiry_date')}>
              <input type="date" value={expiryDate} onChange={e=>setExpiry(e.target.value)} className="input"/>
            </Field>
          </div>

          <Field label={t('temp_log_path_optional')}>
            <input value={tempLog} onChange={e=>setTempLog(e.target.value)} placeholder="/uploads/temp-log-xxx.pdf" className="input"/>
          </Field>

          <div className="grid grid-cols-2 gap-2">
            <Field label={t('supplier_fee_flat')}>
              <input type="number" min={0} step="0.01" value={feeFlat} onChange={e=>setFeeFlat(+e.target.value)} className="input"/>
            </Field>
            <Field label={t('supplier_fee_pct')}>
              <input type="number" min={0} max={100} step="0.1" value={feePct} onChange={e=>setFeePct(+e.target.value)} className="input"/>
            </Field>
          </div>

          <button disabled={busy} onClick={submit} className="w-full bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold py-2 rounded-lg disabled:opacity-50">
            {busy ? <Loader2 size={14} className="animate-spin inline mr-2"/> : null}
            {t('submit_transfer')}
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
