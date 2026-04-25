import React, { useEffect, useMemo, useState } from 'react';
import { BuyingGroup, BuyingGroupMember, User, UserRole } from '../types';
import { DataService } from '../services/mockData';
import { useLanguage } from '../contexts/LanguageContext';
import {
  Users, Package, Clock, CheckCircle, XCircle, Send, Gift, Building, Tag, Hourglass,
  AlertCircle, Loader2, Activity, ChevronRight, X
} from 'lucide-react';

interface BuyingGroupsProps {
  currentUser: User;
}

/**
 * Customer / Master / Supplier view of the buying groups they can see.
 *
 * Members see ONLY their own row + aggregate stats (locked decision #17).
 * Suppliers see groups for their own products with full member list (so they
 * know what's about to land).
 */
export const BuyingGroups: React.FC<BuyingGroupsProps> = ({ currentUser }) => {
  const { t, dir } = useLanguage();
  const [groups, setGroups] = useState<BuyingGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [busyAction, setBusyAction] = useState(false);
  const [commitQty, setCommitQty] = useState<Record<string, number>>({});
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const list = await DataService.listBuyingGroups();
      setGroups(list);
      // Default the commit-input to existing committed qty per group
      const seed: Record<string, number> = {};
      for (const g of list) {
        const me = g.members.find(m => m.isOwn);
        if (me?.committedQuantity) seed[g.id] = me.committedQuantity;
      }
      setCommitQty(seed);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const selected = useMemo(() => groups.find(g => g.id === selectedId) || null, [groups, selectedId]);

  const myMembership = (g: BuyingGroup): BuyingGroupMember | null =>
    g.members.find(m => m.isOwn) ?? null;

  const handleCommit = async (g: BuyingGroup) => {
    setBusyAction(true);
    setErrorMsg(null);
    const qty = commitQty[g.id];
    if (!qty || qty < 1) {
      setErrorMsg(t('quantity_required'));
      setBusyAction(false);
      return;
    }
    const r = await DataService.commitToBuyingGroup(g.id, qty);
    if (!r.success) setErrorMsg(r.message || 'Could not commit');
    await load();
    setBusyAction(false);
  };

  const handleAccept = async (g: BuyingGroup) => {
    setBusyAction(true);
    setErrorMsg(null);
    const r = await DataService.acceptBuyingGroup(g.id);
    if (!r.success) setErrorMsg(r.message || 'Could not accept');
    await load();
    setBusyAction(false);
  };

  const handleDecline = async (g: BuyingGroup) => {
    if (!confirm(t('confirm_decline_buying_group'))) return;
    setBusyAction(true);
    setErrorMsg(null);
    const r = await DataService.declineBuyingGroup(g.id);
    if (!r.success) setErrorMsg(r.message || 'Could not decline');
    await load();
    setBusyAction(false);
  };

  const isCustomerOrMember = currentUser.role === UserRole.CUSTOMER;

  const statusBadge = (s: BuyingGroup['status']) => {
    const map: Record<BuyingGroup['status'], { bg: string; text: string; label: string }> = {
      OPEN:       { bg: 'bg-blue-100',    text: 'text-blue-800',    label: t('bg_status_open') },
      COLLECTING: { bg: 'bg-yellow-100',  text: 'text-yellow-800',  label: t('bg_status_collecting') },
      LOCKED:     { bg: 'bg-purple-100',  text: 'text-purple-800',  label: t('bg_status_locked') },
      RELEASED:   { bg: 'bg-green-100',   text: 'text-green-800',   label: t('bg_status_released') },
      DISSOLVED:  { bg: 'bg-gray-200',    text: 'text-gray-700',    label: t('bg_status_dissolved') },
    };
    const m = map[s];
    return (
      <span className={`inline-flex items-center text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-full ${m.bg} ${m.text}`}>{m.label}</span>
    );
  };

  const memberStatusPill = (s: BuyingGroupMember['status']) => {
    const map: Record<BuyingGroupMember['status'], { bg: string; text: string; label: string }> = {
      INVITED:   { bg: 'bg-gray-100',   text: 'text-gray-700',   label: t('bgm_invited') },
      COMMITTED: { bg: 'bg-blue-100',   text: 'text-blue-700',   label: t('bgm_committed') },
      ACCEPTED:  { bg: 'bg-green-100',  text: 'text-green-700',  label: t('bgm_accepted') },
      DECLINED:  { bg: 'bg-red-100',    text: 'text-red-700',    label: t('bgm_declined') },
    };
    const m = map[s];
    return (
      <span className={`inline-flex items-center text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${m.bg} ${m.text}`}>{m.label}</span>
    );
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-in fade-in" dir={dir}>
      <div className="mb-8">
        <h1 className="text-3xl font-black text-gray-900 tracking-tight">{t('buying_groups_title')}</h1>
        <p className="text-gray-500 font-medium">{t('buying_groups_desc')}</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24 text-gray-400">
          <Loader2 className="animate-spin mr-2" /> Loading…
        </div>
      ) : groups.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-3xl border border-dashed border-gray-200">
          <Users className="mx-auto text-gray-300 mb-4" size={48} />
          <p className="text-sm text-gray-500">{t('no_buying_groups_yet')}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* List */}
          <div className="lg:col-span-1 space-y-3">
            {groups.map(g => {
              const me = myMembership(g);
              return (
                <button
                  key={g.id}
                  onClick={() => { setSelectedId(g.id); setErrorMsg(null); }}
                  className={`w-full text-left bg-white border rounded-2xl p-4 shadow-sm transition-all ${selectedId === g.id ? 'border-teal-500 ring-2 ring-teal-200' : 'border-gray-200 hover:border-teal-300'}`}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h3 className="text-sm font-bold text-gray-900 leading-tight flex-1">{g.name}</h3>
                    {statusBadge(g.status)}
                  </div>
                  <p className="text-xs text-gray-500 mb-3 truncate">{g.productName} • {g.supplierName}</p>
                  <div className="flex items-center gap-2 text-[11px] text-gray-600">
                    <Activity size={12} className="text-teal-600" />
                    <span className="font-bold">{g.aggregate.acceptedQuantity}</span>
                    <span>/</span>
                    <span>{g.targetQuantity} {g.unitOfMeasurement}</span>
                    <span className="ml-auto font-bold text-teal-600">{g.aggregate.percentToTarget}%</span>
                  </div>
                  <div className="mt-2 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className={`h-full transition-all ${g.aggregate.thresholdMet ? 'bg-green-500' : 'bg-teal-500'}`}
                         style={{ width: `${g.aggregate.percentToTarget}%` }} />
                  </div>
                  {me && (
                    <div className="mt-3 flex items-center gap-2 text-[10px]">
                      <span className="text-gray-400 uppercase tracking-widest font-bold">{t('your_status')}</span>
                      {memberStatusPill(me.status)}
                      {me.committedQuantity != null && (
                        <span className="text-gray-600 font-mono">{me.committedQuantity} {g.unitOfMeasurement}</span>
                      )}
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Detail */}
          <div className="lg:col-span-2">
            {!selected ? (
              <div className="bg-white rounded-3xl border border-dashed border-gray-200 p-16 text-center text-gray-400">
                <ChevronRight className="mx-auto mb-2 rtl:rotate-180" />
                {t('select_a_group')}
              </div>
            ) : (
              <div className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-gray-100">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h2 className="text-xl font-black text-gray-900">{selected.name}</h2>
                      <p className="text-xs text-gray-500 mt-1">{t('supplier')}: {selected.supplierName}</p>
                    </div>
                    {statusBadge(selected.status)}
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
                    <Stat icon={<Package size={14}/>} label={t('product')} value={selected.productName ?? '-'} />
                    <Stat icon={<Tag size={14}/>}     label={t('target_qty')} value={`${selected.targetQuantity} ${selected.unitOfMeasurement ?? ''}`} />
                    <Stat icon={<CheckCircle size={14}/>} label={t('accepted_qty')} value={`${selected.aggregate.acceptedQuantity}`} />
                    <Stat
                      icon={<Hourglass size={14}/>}
                      label={t('deadline')}
                      value={selected.windowEndsAt
                        ? new Date(selected.windowEndsAt).toLocaleDateString()
                        : '—'}
                    />
                  </div>
                </div>

                {/* Bonus preview */}
                {selected.productBonusType && selected.productBonusValue ? (
                  <div className="bg-pink-50 border-y border-pink-100 px-6 py-3 flex items-center gap-2 text-pink-800 text-xs font-bold">
                    <Gift size={14} />
                    {t('bonus_unlock_at_threshold').replace('{threshold}', `${selected.productBonusThreshold}`)}{' '}
                    {selected.productBonusType === 'percentage'
                      ? `${selected.productBonusValue}% ${t('extra_pro_rata')}`
                      : `+${selected.productBonusValue} ${t('extra_units_pro_rata')}`}
                  </div>
                ) : null}

                {/* Member action panel (customer only) */}
                {isCustomerOrMember && myMembership(selected) && !selected.releasedAt && !selected.dissolvedAt && (
                  <MemberActions
                    group={selected}
                    me={myMembership(selected)!}
                    busy={busyAction}
                    qty={commitQty[selected.id] ?? 0}
                    onQtyChange={(v) => setCommitQty(prev => ({ ...prev, [selected.id]: v }))}
                    onCommit={() => handleCommit(selected)}
                    onAccept={() => handleAccept(selected)}
                    onDecline={() => handleDecline(selected)}
                    t={t}
                    statusPill={memberStatusPill}
                  />
                )}

                {errorMsg && (
                  <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-100 rounded-lg text-red-700 text-xs flex items-center gap-2">
                    <AlertCircle size={14} /> {errorMsg}
                  </div>
                )}

                {/* Members list (admin sees all; member sees only own row, populated by backend) */}
                <div className="p-6">
                  <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">{t('members')}</h3>
                  {selected.members.length === 0 ? (
                    <p className="text-xs text-gray-400 italic">{t('no_visible_members')}</p>
                  ) : (
                    <ul className="divide-y divide-gray-100">
                      {selected.members.map((m) => (
                        <li key={m.id} className="py-2 flex items-center gap-3 text-sm">
                          <div className="h-8 w-8 rounded-full bg-teal-50 flex items-center justify-center text-teal-700 shrink-0">
                            <Building size={14} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-gray-900 truncate">
                              {m.customerName ?? t('hidden_member')}
                              {m.isOwn && <span className="ml-2 text-[10px] font-bold text-teal-600 uppercase">{t('you')}</span>}
                            </p>
                            <p className="text-[11px] text-gray-500">
                              {m.committedQuantity != null
                                ? `${m.committedQuantity} ${selected.unitOfMeasurement ?? ''}`
                                : '—'}
                              {m.apportionedBonus ? ` (+ ${m.apportionedBonus} ${t('bonus')})` : ''}
                            </p>
                          </div>
                          {memberStatusPill(m.status)}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const Stat: React.FC<{ icon: React.ReactNode; label: string; value: string }> = ({ icon, label, value }) => (
  <div className="bg-gray-50 rounded-xl p-3">
    <div className="flex items-center gap-1.5 text-[9px] text-gray-400 font-bold uppercase tracking-widest mb-1">
      {icon}{label}
    </div>
    <p className="text-sm font-bold text-gray-900 truncate">{value}</p>
  </div>
);

interface MemberActionsProps {
  group: BuyingGroup;
  me: BuyingGroupMember;
  busy: boolean;
  qty: number;
  onQtyChange: (v: number) => void;
  onCommit: () => void;
  onAccept: () => void;
  onDecline: () => void;
  t: (k: string) => string;
  statusPill: (s: BuyingGroupMember['status']) => React.ReactNode;
}

const MemberActions: React.FC<MemberActionsProps> = ({ group, me, busy, qty, onQtyChange, onCommit, onAccept, onDecline, t, statusPill }) => {
  // Hide actions if user already declined or terminal status
  if (me.status === 'DECLINED') {
    return (
      <div className="bg-red-50 border-y border-red-100 px-6 py-3 text-red-700 text-sm flex items-center gap-2">
        <XCircle size={16} /> {t('you_have_declined')}
      </div>
    );
  }

  return (
    <div className="bg-slate-900 px-6 py-4 text-white">
      <div className="flex flex-col md:flex-row gap-3 md:items-center">
        <div className="flex-1">
          <p className="text-[10px] uppercase tracking-widest text-slate-400 font-bold mb-1">{t('your_commitment')}</p>
          <div className="flex items-center gap-3">
            <div className="flex items-center bg-white rounded-lg h-10 shadow-sm">
              <button
                className="px-3 h-full text-gray-600 hover:bg-gray-100 disabled:opacity-50"
                onClick={() => onQtyChange(Math.max(1, qty - 1))}
                disabled={busy || me.status === 'ACCEPTED'}
              >−</button>
              <input
                type="number"
                min={1}
                className="w-16 h-full text-center border-none focus:ring-0 text-gray-900"
                value={qty || ''}
                placeholder="0"
                onChange={(e) => onQtyChange(Math.max(1, parseInt(e.target.value) || 0))}
                disabled={busy || me.status === 'ACCEPTED'}
              />
              <button
                className="px-3 h-full text-gray-600 hover:bg-gray-100 disabled:opacity-50"
                onClick={() => onQtyChange(qty + 1)}
                disabled={busy || me.status === 'ACCEPTED'}
              >+</button>
            </div>
            <span className="text-xs text-slate-400">{group.unitOfMeasurement}</span>
            <span className="ml-auto">{statusPill(me.status)}</span>
          </div>
        </div>
        <div className="flex gap-2 md:ml-4">
          {me.status !== 'ACCEPTED' && (
            <button
              onClick={onCommit}
              disabled={busy || !qty || qty < 1}
              className="px-4 h-10 rounded-lg text-sm font-bold text-slate-900 bg-white hover:bg-gray-100 disabled:opacity-50 transition-colors flex items-center gap-2"
            >
              <Send size={14} /> {me.status === 'COMMITTED' ? t('revise_commitment') : t('commit')}
            </button>
          )}
          {me.status === 'COMMITTED' && (
            <button
              onClick={onAccept}
              disabled={busy}
              className="px-4 h-10 rounded-lg text-sm font-bold text-white bg-teal-600 hover:bg-teal-700 disabled:opacity-50 transition-colors flex items-center gap-2"
            >
              <CheckCircle size={14} /> {t('accept')}
            </button>
          )}
          {me.status !== 'ACCEPTED' && (
            <button
              onClick={onDecline}
              disabled={busy}
              className="px-4 h-10 rounded-lg text-sm font-bold text-white bg-red-600/80 hover:bg-red-600 disabled:opacity-50 transition-colors flex items-center gap-2"
            >
              <X size={14} /> {t('decline')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
