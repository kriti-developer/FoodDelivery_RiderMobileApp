import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { io } from 'socket.io-client';
import { API_BASE } from '../config';
import { OrderStatus } from '../utils/orderStatus';

const REGISTERED_RIDER_KEY = '@rider_app/registeredRider';
const SESSION_KEY = '@rider_app/session';
const ACTIVE_ORDER_ID_KEY = '@rider_app/activeOrderId';
const HISTORY_IDS_KEY = '@rider_app/historyOrderIds';

const RiderContext = createContext(null);

export function RiderProvider({ children }) {
  // There is no rider-auth endpoint on the backend, so sign up/log in are
  // both local-only (stored in AsyncStorage) - same approach the customer
  // app takes for its own auth.
  const [riderProfile, setRiderProfile] = useState(null);
  const [isRestoringSession, setIsRestoringSession] = useState(true);
  const [availableOrders, setAvailableOrders] = useState([]);
  const [activeOrder, setActiveOrder] = useState(null);
  const [historyOrders, setHistoryOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const socketRef = useRef(null);

  // Restore login session on app start (still local - no auth backend yet).
  useEffect(() => {
    AsyncStorage.getItem(SESSION_KEY)
      .then((raw) => {
        if (raw) setRiderProfile(JSON.parse(raw));
      })
      .finally(() => setIsRestoringSession(false));
  }, []);

  const refreshAvailable = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/orders/available`);
      if (!res.ok) throw new Error();
      setAvailableOrders(await res.json());
    } catch (e) {
      setError('Could not reach the backend. Is it running?');
    }
  }, []);

  // The backend has no "my orders" endpoint and never actually records
  // which rider accepted an order, so this device tracks its own active
  // order id and delivered-order history locally, then hydrates the full
  // order objects from GET /api/orders by id.
  const refreshActiveAndHistory = useCallback(async () => {
    const [activeId, historyRaw] = await Promise.all([
      AsyncStorage.getItem(ACTIVE_ORDER_ID_KEY),
      AsyncStorage.getItem(HISTORY_IDS_KEY),
    ]);
    const historyIds = historyRaw ? JSON.parse(historyRaw) : [];
    if (!activeId && historyIds.length === 0) {
      setActiveOrder(null);
      setHistoryOrders([]);
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/api/orders`);
      if (!res.ok) throw new Error();
      const all = await res.json();
      setActiveOrder((activeId && all.find((o) => o._id === activeId)) || null);
      setHistoryOrders(
        all
          .filter((o) => historyIds.includes(o._id))
          .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
      );
    } catch (e) {
      setError('Could not reach the backend. Is it running?');
    }
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    await Promise.all([refreshAvailable(), refreshActiveAndHistory()]);
    setLoading(false);
  }, [refreshAvailable, refreshActiveAndHistory]);

  // Connect to the backend for as long as a rider profile is active.
  useEffect(() => {
    if (!riderProfile) return;

    const socket = io(API_BASE);
    socketRef.current = socket;

    // A brand new order just came in - it's available for anyone to accept.
    socket.on('order:new', (order) => {
      if (order.status === OrderStatus.PENDING) {
        setAvailableOrders((prev) => [...prev, order]);
      }
    });

    // Someone accepted (or any order changed status) - it's no longer
    // available, and if it's our active order, keep it in sync.
    socket.on('order:updated', (updatedOrder) => {
      setAvailableOrders((prev) => prev.filter((o) => o._id !== updatedOrder._id));
      setActiveOrder((prev) => (prev && prev._id === updatedOrder._id ? updatedOrder : prev));
    });

    refresh();

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [riderProfile, refresh]);

  const signUp = useCallback(async ({ name, phone, password }) => {
    const profile = { name: name.trim(), phone: phone.trim(), password };
    await AsyncStorage.setItem(REGISTERED_RIDER_KEY, JSON.stringify(profile));
    const session = { name: profile.name, phone: profile.phone };
    await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(session));
    setRiderProfile(session);
    return { success: true };
  }, []);

  const login = useCallback(async ({ phone, password }) => {
    const raw = await AsyncStorage.getItem(REGISTERED_RIDER_KEY);
    if (!raw) {
      return { success: false, message: 'No account found. Please sign up first.' };
    }
    const registered = JSON.parse(raw);
    if (registered.phone !== phone.trim()) {
      return { success: false, message: 'No account found with that phone number.' };
    }
    if (registered.password !== password) {
      return { success: false, message: 'Incorrect password.' };
    }
    const session = { name: registered.name, phone: registered.phone };
    await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(session));
    setRiderProfile(session);
    return { success: true };
  }, []);

  const logout = useCallback(async () => {
    await AsyncStorage.removeItem(SESSION_KEY);
    setRiderProfile(null);
    setAvailableOrders([]);
    setActiveOrder(null);
    setHistoryOrders([]);
  }, []);

  // Backend's POST /api/orders/:id/accept always 500s - it sets
  // order.status = "accepted", which isn't a valid value in the Order
  // schema's status enum (confirmed by validating the schema directly).
  // Accepting via the status PATCH instead, which is a real, working
  // transition.
  const acceptOrder = useCallback(async (orderId) => {
    try {
      const res = await fetch(`${API_BASE}/api/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: OrderStatus.CONFIRMED }),
      });
      if (!res.ok) throw new Error('Could not accept this delivery');
      const updated = await res.json();
      await AsyncStorage.setItem(ACTIVE_ORDER_ID_KEY, updated._id);
      setActiveOrder(updated);
      setAvailableOrders((prev) => prev.filter((o) => o._id !== orderId));
    } catch (e) {
      setError(e.message);
    }
  }, []);

  const advanceStatus = useCallback(async (orderId, newStatus) => {
    try {
      const res = await fetch(`${API_BASE}/api/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error('Could not update the delivery status');
      const updated = await res.json();
      if (newStatus === OrderStatus.DELIVERED) {
        await AsyncStorage.removeItem(ACTIVE_ORDER_ID_KEY);
        const historyRaw = await AsyncStorage.getItem(HISTORY_IDS_KEY);
        const historyIds = historyRaw ? JSON.parse(historyRaw) : [];
        await AsyncStorage.setItem(HISTORY_IDS_KEY, JSON.stringify([...historyIds, orderId]));
        setActiveOrder(null);
        setHistoryOrders((prev) => [updated, ...prev]);
      } else {
        setActiveOrder(updated);
      }
    } catch (e) {
      setError(e.message);
    }
  }, []);

  const clearError = useCallback(() => setError(null), []);

  const value = useMemo(
    () => ({
      riderProfile,
      isRestoringSession,
      availableOrders,
      activeOrder,
      historyOrders,
      loading,
      error,
      signUp,
      login,
      logout,
      acceptOrder,
      advanceStatus,
      refresh,
      clearError,
    }),
    [
      riderProfile,
      isRestoringSession,
      availableOrders,
      activeOrder,
      historyOrders,
      loading,
      error,
      signUp,
      login,
      logout,
      acceptOrder,
      advanceStatus,
      refresh,
      clearError,
    ]
  );

  return <RiderContext.Provider value={value}>{children}</RiderContext.Provider>;
}

export function useRider() {
  const ctx = useContext(RiderContext);
  if (!ctx) throw new Error('useRider must be used within a RiderProvider');
  return ctx;
}
