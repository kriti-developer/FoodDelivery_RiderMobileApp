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

const SESSION_KEY = '@rider_app/session';
const ACTIVE_ORDER_ID_KEY = '@rider_app/activeOrderId';
const HISTORY_IDS_KEY = '@rider_app/historyOrderIds';

const RiderContext = createContext(null);

export function RiderProvider({ children }) {
  const [riderProfile, setRiderProfile] = useState(null);
  const [authToken, setAuthToken] = useState(null);
  const [isRestoringSession, setIsRestoringSession] = useState(true);
  const [availableOrders, setAvailableOrders] = useState([]);
  const [activeOrder, setActiveOrder] = useState(null);
  const [historyOrders, setHistoryOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const socketRef = useRef(null);

  // Restore login session on app start.
  useEffect(() => {
    AsyncStorage.getItem(SESSION_KEY)
      .then((raw) => {
        if (raw) {
          const session = JSON.parse(raw);
          setRiderProfile(session.rider);
          setAuthToken(session.token);
        }
      })
      .finally(() => setIsRestoringSession(false));
  }, []);

  const refreshAvailable = useCallback(async () => {
    if (!authToken) return;
    try {
      const res = await fetch(`${API_BASE}/api/orders/available`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      if (!res.ok) throw new Error();
      setAvailableOrders(await res.json());
    } catch (e) {
      setError('Could not reach the backend. Is it running?');
    }
  }, [authToken]);

  // The backend has no "my orders" endpoint, so this device tracks its own
  // active order id and delivered-order history locally, then hydrates the
  // full order objects from GET /api/orders by id.
  const refreshActiveAndHistory = useCallback(async () => {
    if (!authToken) return;
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
      const res = await fetch(`${API_BASE}/api/orders`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
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
  }, [authToken]);

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

    // An order is ready for pickup — only show it to riders once the
    // restaurant has marked it ready (status === 'ready'), not when it
    // first comes in as 'pending' (that stage belongs to the restaurant).
    socket.on('order:new', (order) => {
      if (order.status === OrderStatus.READY) {
        setAvailableOrders((prev) => [...prev, order]);
      }
    });

    // Someone accepted (or any order changed status) - it's no longer
    // available, and if it's our active order, keep it in sync.
    // Also: if the restaurant just marked it 'ready', add it to the list.
    socket.on('order:updated', (updatedOrder) => {
      if (updatedOrder.status === OrderStatus.READY) {
        // Restaurant marked it ready — make it available for riders to pick up
        setAvailableOrders((prev) =>
          prev.some((o) => o._id === updatedOrder._id)
            ? prev
            : [...prev, updatedOrder]
        );
      } else {
        // Order moved past 'ready' — remove from available list
        setAvailableOrders((prev) => prev.filter((o) => o._id !== updatedOrder._id));
      }
      setActiveOrder((prev) => (prev && prev._id === updatedOrder._id ? updatedOrder : prev));
    });

    refresh();

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [riderProfile, refresh]);

  const signUp = useCallback(async ({ name, phone, password }) => {
    try {
      const res = await fetch(`${API_BASE}/api/auth/rider-signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), phone: phone.trim(), password }),
      });
      const data = await res.json();
      if (!res.ok) {
        return { success: false, message: data.error || 'Sign up failed.' };
      }
      await AsyncStorage.setItem(SESSION_KEY, JSON.stringify({ token: data.token, rider: data.rider }));
      setAuthToken(data.token);
      setRiderProfile(data.rider);
      return { success: true };
    } catch (e) {
      return { success: false, message: 'Could not reach the backend. Is it running?' };
    }
  }, []);

  const login = useCallback(async ({ phone, password }) => {
    try {
      const res = await fetch(`${API_BASE}/api/auth/rider-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: phone.trim(), password }),
      });
      const data = await res.json();
      if (!res.ok) {
        return { success: false, message: data.error || 'Login failed.' };
      }
      await AsyncStorage.setItem(SESSION_KEY, JSON.stringify({ token: data.token, rider: data.rider }));
      setAuthToken(data.token);
      setRiderProfile(data.rider);
      return { success: true };
    } catch (e) {
      return { success: false, message: 'Could not reach the backend. Is it running?' };
    }
  }, []);

  const logout = useCallback(async () => {
    await AsyncStorage.removeItem(SESSION_KEY);
    setRiderProfile(null);
    setAuthToken(null);
    setAvailableOrders([]);
    setActiveOrder(null);
    setHistoryOrders([]);
  }, []);

  const acceptOrder = useCallback(async (orderId) => {
    try {
      const res = await fetch(`${API_BASE}/api/orders/${orderId}/accept`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Could not accept this delivery');
      }
      const updated = await res.json();
      await AsyncStorage.setItem(ACTIVE_ORDER_ID_KEY, updated._id);
      setActiveOrder(updated);
      setAvailableOrders((prev) => prev.filter((o) => o._id !== orderId));
    } catch (e) {
      setError(e.message);
    }
  }, [authToken]);

  const advanceStatus = useCallback(async (orderId, newStatus) => {
    try {
      const res = await fetch(`${API_BASE}/api/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Could not update the delivery status');
      }
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
  }, [authToken]);

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
