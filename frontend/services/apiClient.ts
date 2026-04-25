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

/* ────────────────────────────── helpers ────────────────────────────── */
async function refreshUsers(): Promise<void> {
  try { _users = await api.get<User[]>('/users'); } catch { /* non-admin: stay empty */ }
}
async function refreshProducts(): Promise<void> { _products = await api.get<Product[]>('/products'); }
async function refreshOrders(): Promise<void>   { _orders   = await api.get<Order[]>('/orders'); }
async function refreshFeed(): Promise<void>     { _feed     = await api.get<FeedItem[]>('/feed'); }
async function refreshPartnerships(): Promise<void> {
  try { _partnerships = await api.get<PartnershipRequest[]>('/partnerships'); }
  catch { _partnerships = []; }
}
async function refreshNotifications(): Promise<void> {
  try { _notifications = await api.get<InAppNotification[]>('/notifications'); }
  catch { _notifications = []; }
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

  registerUser: async (newUser: any): Promise<{ success: boolean; message?: string }> => {
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
      return { success: true, message: r?.message || 'Registration successful. Pending approval.' };
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

  /* ── ORDERS ─────────────────────────────────────────── */
  createOrder: async (order: Order): Promise<void> => {
    await api.post('/orders', { productId: order.productId, quantity: order.quantity });
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
};
