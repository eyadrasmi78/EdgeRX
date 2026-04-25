/**
 * Drop-in replacement for the old localStorage-backed mockData.ts.
 *
 * Strategy:
 *   • Reads (getX) stay SYNCHRONOUS and return module-level caches that were
 *     hydrated by `bootstrap()` on app start (and refreshed after each mutation).
 *   • Mutations are ASYNC: they call the Laravel API, then re-fetch the affected
 *     cache slice. Existing call sites just need to add `await` (or be inside an
 *     async event handler).
 *
 * This preserves the prototype's call-site shape (DataService.getX() in render
 * paths is synchronous) while routing every change through the real backend.
 */

import { api, ApiError } from './api';
import {
  User, Product, Order, FeedItem, PartnershipRequest,
  ChatMessage, ChatRoom, OrderStatus, RegistrationStatus,
  Notification as InAppNotification,
} from '../types';

/* ────────────────────────────── caches ────────────────────────────── */
let _users: User[] = [];
let _products: Product[] = [];
let _orders: Order[] = [];
let _feed: FeedItem[] = [];
let _partnerships: PartnershipRequest[] = [];
let _chats: ChatRoom[] = [];
let _notifications: InAppNotification[] = [];
let _currentUser: User | null = null;

/* ── race-token guards (S3) ──────────────────────────────────────────
 * Each cache slice has a monotonic generation counter. When two mutations
 * race, the slower one's response is dropped on assignment if a newer
 * generation has already been assigned. Prevents stale-data flicker.
 */
const _gen: Record<string, number> = {
  users: 0, products: 0, orders: 0, feed: 0, partnerships: 0, notifications: 0,
};
function newGen(slice: string): number {
  return ++_gen[slice];
}
function isFresh(slice: string, gen: number): boolean {
  return gen === _gen[slice];
}

/* ────────────────────────────── helpers ────────────────────────────── */
/** Fail-soft cache loaders with visibility — every failed slice logs once so dev/QA can see it. */
function logSliceError(slice: string, e: unknown) {
  // eslint-disable-next-line no-console
  console.warn(`[apiClient] ${slice} cache failed to refresh:`, e);
}
async function refreshUsers(): Promise<void> {
  const g = newGen('users');
  try { const data = await api.get<User[]>('/users'); if (isFresh('users', g)) _users = data; }
  catch (e) { logSliceError('users', e); /* non-admin etc — stay with what we had */ }
}
async function refreshProducts(): Promise<void> {
  const g = newGen('products');
  try { const data = await api.get<Product[]>('/products'); if (isFresh('products', g)) _products = data; }
  catch (e) { logSliceError('products', e); }
}
async function refreshOrders(): Promise<void> {
  const g = newGen('orders');
  try { const data = await api.get<Order[]>('/orders'); if (isFresh('orders', g)) _orders = data; }
  catch (e) { logSliceError('orders', e); }
}
async function refreshFeed(): Promise<void> {
  const g = newGen('feed');
  try { const data = await api.get<FeedItem[]>('/feed'); if (isFresh('feed', g)) _feed = data; }
  catch (e) { logSliceError('feed', e); }
}
async function refreshPartnerships(): Promise<void> {
  const g = newGen('partnerships');
  try { const data = await api.get<PartnershipRequest[]>('/partnerships'); if (isFresh('partnerships', g)) _partnerships = data; }
  catch (e) { logSliceError('partnerships', e); _partnerships = []; }
}
async function refreshNotifications(): Promise<void> {
  const g = newGen('notifications');
  try { const data = await api.get<InAppNotification[]>('/notifications'); if (isFresh('notifications', g)) _notifications = data; }
  catch (e) { logSliceError('notifications', e); _notifications = []; }
}
async function refreshChats(orderIds: string[]): Promise<void> {
  if (!orderIds.length) return;
  // Fan out in parallel; ignore individual failures so one bad room doesn't blank the whole list
  const results = await Promise.allSettled(
    orderIds.map(async (id) => {
      const msgs = await api.get<ChatMessage[]>(`/chats/${id}/messages`);
      return { orderId: id, messages: msgs };
    }),
  );
  for (const r of results) {
    if (r.status === 'fulfilled') {
      const idx = _chats.findIndex(c => c.orderId === r.value.orderId);
      if (idx > -1) _chats[idx] = r.value;
      else _chats.push(r.value);
    }
  }
}

function clearAll() {
  _users = []; _products = []; _orders = [];
  _feed = []; _partnerships = []; _chats = [];
  _notifications = []; _currentUser = null;
}

/* ────────────────────────────── DataService surface ────────────────────────────── */
export const DataService = {
  /* ── BOOTSTRAP / SESSION ───────────────────────────── */
  bootstrap: async (): Promise<{ user: User | null; isTeamMember?: boolean }> => {
    let session: { user: User | null; isTeamMember?: boolean } = { user: null };
    try { session = await api.get('/auth/me'); } catch { session = { user: null }; }
    _currentUser = session.user;
    if (session.user) {
      // Hydrate caches in parallel — fail-soft per slice
      await Promise.allSettled([
        refreshProducts(),
        refreshOrders(),
        refreshFeed(),
        refreshPartnerships(),
        refreshUsers(),
        refreshNotifications(),
      ]);
      // Always include the current user in the users cache for non-admin views
      if (!_users.find(u => u.id === session.user!.id)) _users = [session.user, ..._users];
      // Pre-hydrate chat caches for any orders the user can see, so opening
      // ChatModal doesn't show an empty state on first paint.
      const orderIds = _orders.map(o => o.id).slice(0, 20); // cap to keep boot fast
      await refreshChats(orderIds);
    }
    return session;
  },

  getCurrentUser: (): User | null => _currentUser,

  /* ── SYNC READS ─────────────────────────────────────── */
  getUsers: (): User[] => _users,
  getProducts: (): Product[] => _products,
  getOrders: (): Order[] => _orders,
  getFeedItems: (): FeedItem[] => _feed,
  getPartnershipRequests: (): PartnershipRequest[] => _partnerships,
  getChatRooms: (): ChatRoom[] => _chats,
  getMessages: (orderId: string): ChatMessage[] => {
    const room = _chats.find(r => r.orderId === orderId);
    return room ? room.messages : [];
  },
  getNotifications: (): InAppNotification[] => _notifications,

  /* ── AUTH ───────────────────────────────────────────── */
  loginUser: async (email: string, password: string): Promise<{
    success: boolean; user?: User; isTeamMember?: boolean; memberDetails?: any; message?: string;
  }> => {
    try {
      const r = await api.post<any>('/auth/login', { email, password });
      if (r && r.success && r.user) {
        _currentUser = r.user;
        await DataService.bootstrap();
        return r;
      }
      return { success: false, message: r?.message || 'Login failed' };
    } catch (e: any) {
      const msg = e instanceof ApiError ? (e.data?.message || e.message) : (e?.message || 'Login failed');
      return { success: false, message: msg };
    }
  },

  registerUser: async (newUser: any): Promise<{ success: boolean; message?: string; user?: User }> => {
    try {
      const body: any = {
        name: newUser.name,
        email: newUser.email,
        password: newUser.password,
        phone: newUser.phone,
        role: newUser.role,
        companyDetails: newUser.companyDetails,
      };
      const r = await api.post<any>('/auth/register', body);
      // The backend returns { success, message, user } — surface user so admins can immediately approve.
      return {
        success: true,
        message: r?.message || 'Registration successful. Pending approval.',
        user: r?.user,
      };
    } catch (e: any) {
      return { success: false, message: e?.data?.message || 'Registration failed' };
    }
  },

  logout: async (): Promise<void> => {
    try { await api.post('/auth/logout'); } catch { /* ignore */ }
    clearAll();
  },

  /* ── USERS ──────────────────────────────────────────── */
  updateUserStatus: async (userId: string, status: RegistrationStatus): Promise<void> => {
    await api.patch(`/users/${userId}/status`, { status });
    await refreshUsers();
  },

  updateUser: async (updatedUser: User): Promise<{ success: boolean; message?: string }> => {
    try {
      await api.patch(`/users/${updatedUser.id}`, {
        name: updatedUser.name,
        phone: updatedUser.phone,
        companyDetails: updatedUser.companyDetails,
      });
      await refreshUsers();
      // Keep current user fresh
      if (_currentUser && _currentUser.id === updatedUser.id) {
        _currentUser = { ..._currentUser, ...updatedUser } as User;
      }
      return { success: true };
    } catch (e: any) {
      return { success: false, message: e?.data?.message || 'Update failed' };
    }
  },

  addTeamMember: async (parentId: string, member: any): Promise<{ success: boolean; message?: string }> => {
    try {
      await api.post(`/users/${parentId}/team-members`, {
        name: member.name,
        email: member.email,
        phone: member.phone,
        jobTitle: member.jobTitle,
        password: member.password,
        permissions: member.permissions ?? [],
      });
      await refreshUsers();
      return { success: true };
    } catch (e: any) {
      return { success: false, message: e?.data?.message || 'Could not add team member' };
    }
  },

  updateTeamMember: async (parentId: string, updatedMember: any): Promise<{ success: boolean; message?: string }> => {
    try {
      await api.patch(`/users/${parentId}/team-members/${updatedMember.id}`, {
        name: updatedMember.name,
        email: updatedMember.email,
        phone: updatedMember.phone,
        jobTitle: updatedMember.jobTitle,
        password: updatedMember.password || undefined,
        permissions: updatedMember.permissions ?? [],
      });
      await refreshUsers();
      return { success: true };
    } catch (e: any) {
      return { success: false, message: e?.data?.message || 'Update failed' };
    }
  },

  /* ── PRODUCTS ───────────────────────────────────────── */
  addProduct: async (product: Product): Promise<void> => {
    await api.post('/products', product);
    await refreshProducts();
  },
  updateProduct: async (product: Product): Promise<void> => {
    await api.patch(`/products/${product.id}`, product);
    await refreshProducts();
  },

  /* ── CART ───────────────────────────────────────────── */
  // Server-persisted cart so refreshing the page doesn't drop it (N5).
  loadCart: async (): Promise<{ product: Product; quantity: number }[]> => {
    try { return await api.get('/cart'); } catch { return []; }
  },
  saveCart: async (items: { productId: string; quantity: number; onBehalfOfCustomerId?: string }[]): Promise<void> => {
    if (items.length === 0) {
      try { await api.del('/cart'); } catch {/* ignore */}
      return;
    }
    try { await api.put('/cart', { items }); } catch (e) { logSliceError('cart', e); }
  },
  checkoutCart: async (): Promise<{ orders: Order[] }> => {
    const r = await api.post<{ orders: Order[] }>('/cart/checkout');
    await refreshOrders();
    return r;
  },

  /* ── ORDERS ─────────────────────────────────────────── */
  createOrder: async (order: Order): Promise<void> => {
    // Pharmacy Masters pass `placedByUserId` on the constructed Order; we forward
    // it as `onBehalfOfCustomerId` so the backend records who is the buyer (customer)
    // vs. who is the operator (master).
    const body: any = { productId: order.productId, quantity: order.quantity };
    if (order.customerId && order.customerId !== _currentUser?.id) {
      body.onBehalfOfCustomerId = order.customerId;
    }
    await api.post('/orders', body);
    await refreshOrders();
  },
  updateOrder: async (orderId: string, updates: Partial<Order>, note?: string): Promise<void> => {
    await api.patch(`/orders/${orderId}`, { ...updates, note });
    await refreshOrders();
  },
  updateOrderStatus: async (orderId: string, status: OrderStatus, note?: string): Promise<void> => {
    await api.patch(`/orders/${orderId}`, { status, note });
    await refreshOrders();
  },

  /* ── CHATS ──────────────────────────────────────────── */
  refreshChat: async (orderId: string): Promise<ChatMessage[]> => {
    let msgs: ChatMessage[] = [];
    try { msgs = await api.get<ChatMessage[]>(`/chats/${orderId}/messages`); }
    catch { msgs = []; }
    const idx = _chats.findIndex(r => r.orderId === orderId);
    if (idx > -1) _chats[idx].messages = msgs;
    else _chats.push({ orderId, messages: msgs });
    return msgs;
  },
  sendMessage: async (orderId: string, message: ChatMessage): Promise<void> => {
    await api.post(`/chats/${orderId}/messages`, { text: message.text });
    await DataService.refreshChat(orderId);
  },

  /* ── FEED ───────────────────────────────────────────── */
  addFeedItem: async (item: FeedItem): Promise<void> => {
    await api.post('/feed', item);
    await refreshFeed();
  },
  createCustomerRequest: async (_user: User, text: string): Promise<void> => {
    await api.post('/feed/customer-request', { text });
    await refreshFeed();
  },
  createAdvertisement: async (_user: User, product: Product, days: number): Promise<void> => {
    await api.post('/feed/advertisement', { productId: product.id, days });
    await refreshFeed();
  },
  createAdminNews: async (
    _user: User, title: string, content: string,
    mediaType?: 'image' | 'video' | 'pdf', mediaUrl?: string,
    link?: string, attachmentName?: string
  ): Promise<void> => {
    await api.post('/feed/admin-news', { title, content, mediaType, mediaUrl, link, attachmentName });
    await refreshFeed();
  },

  /* ── PARTNERSHIPS ───────────────────────────────────── */
  sendPartnershipRequest: async (
    _fromAgent: User,
    foreignSupplierId: string,
    productDetails?: { id: string; name: string }
  ): Promise<{ success: boolean; message?: string }> => {
    try {
      await api.post('/partnerships', {
        foreignSupplierId,
        productId: productDetails?.id,
        productName: productDetails?.name,
      });
      await refreshPartnerships();
      return { success: true, message: 'Request sent successfully.' };
    } catch (e: any) {
      const msg = e?.status === 409 ? 'Request already sent.' : (e?.data?.message || 'Failed to send request');
      return { success: false, message: msg };
    }
  },
  updatePartnershipRequest: async (
    requestId: string,
    status: 'ACCEPTED' | 'REJECTED'
  ): Promise<{ success: boolean; message?: string }> => {
    try {
      await api.patch(`/partnerships/${requestId}`, { status });
      await refreshPartnerships();
      return { success: true };
    } catch (e: any) {
      return { success: false, message: e?.data?.message || 'Update failed' };
    }
  },

  /* ── NOTIFICATIONS ──────────────────────────────────── */
  refreshNotifications,

  /* ── PHARMACY MASTER (Phase A) ──────────────────────── */
  /** Admin: list all PHARMACY_MASTER accounts with their child pharmacies. */
  listPharmacyGroups: async (): Promise<User[]> => {
    try { return await api.get<User[]>('/admin/pharmacy-groups'); }
    catch (e) { logSliceError('pharmacy-groups', e); return []; }
  },
  /** Admin: create a Pharmacy Master account and link initial pharmacies. */
  createPharmacyGroup: async (payload: {
    name: string; email: string; password: string; phone?: string; pharmacyIds?: string[];
  }): Promise<{ success: boolean; user?: User; message?: string }> => {
    try {
      const u = await api.post<User>('/admin/pharmacy-groups', payload);
      return { success: true, user: u };
    } catch (e: any) {
      return { success: false, message: e?.data?.message || 'Could not create pharmacy group' };
    }
  },
  /** Admin: link an existing pharmacy to a master. */
  linkPharmacyToGroup: async (masterId: string, pharmacyId: string) => {
    try {
      await api.post(`/admin/pharmacy-groups/${masterId}/pharmacies`, { pharmacyId });
      return { success: true };
    } catch (e: any) {
      return { success: false, message: e?.data?.message || 'Could not link pharmacy' };
    }
  },
  /** Admin: unlink a pharmacy from a master. */
  unlinkPharmacyFromGroup: async (masterId: string, pharmacyId: string) => {
    try { await api.del(`/admin/pharmacy-groups/${masterId}/pharmacies/${pharmacyId}`); return { success: true }; }
    catch (e: any) { return { success: false, message: e?.data?.message }; }
  },
  /** Admin: delete a master (children stay, just unlinked). */
  deletePharmacyGroup: async (masterId: string) => {
    try { await api.del(`/admin/pharmacy-groups/${masterId}`); return { success: true }; }
    catch (e: any) { return { success: false, message: e?.data?.message }; }
  },
};
