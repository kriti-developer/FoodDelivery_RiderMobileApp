import { useEffect, useMemo, useRef, useState, type ReactElement } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { io, type Socket } from "socket.io-client";
import { StatusBar as ExpoStatusBar } from "expo-status-bar";

import { fetchAllOrders, fetchAvailableOrders, getApiBase, updateOrderStatus } from "./src/api";
import {
  addHistoryOrderId,
  clearSession,
  loadSession,
  saveRiderProfile,
  setActiveOrderId,
} from "./src/storage";
import type { Order, RiderProfile } from "./src/types";
import {
  formatOrderTime,
  formatRupees,
  nextOrderStatus,
  orderStatusLabel,
  summarizeItems,
} from "./src/types";

type TabKey = "deliveries" | "history" | "profile";

const tabs: Array<{ key: TabKey; label: string }> = [
  { key: "deliveries", label: "Deliveries" },
  { key: "history", label: "History" },
  { key: "profile", label: "Profile" },
];

function sortByUpdatedAtDesc(a: Order, b: Order): number {
  return new Date(b.updatedAt ?? b.createdAt ?? 0).getTime() - new Date(a.updatedAt ?? a.createdAt ?? 0).getTime();
}

function mergeOrder(list: Order[], updated: Order): Order[] {
  const next = list.filter((order) => order.id !== updated.id);
  next.unshift(updated);
  return next;
}

function extractErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }
  return fallback;
}

function App(): ReactElement {
  const apiBase = getApiBase();
  const socketRef = useRef<Socket | null>(null);

  const [booting, setBooting] = useState(true);
  const [session, setSession] = useState<RiderProfile | null>(null);
  const [draftName, setDraftName] = useState("");
  const [draftPhone, setDraftPhone] = useState("");
  const [selectedTab, setSelectedTab] = useState<TabKey>("deliveries");
  const [availableOrders, setAvailableOrders] = useState<Order[]>([]);
  const [activeOrder, setActiveOrder] = useState<Order | null>(null);
  const [historyOrders, setHistoryOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [socketConnected, setSocketConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        const stored = await loadSession();
        if (!alive) {
          return;
        }

        setSession(stored);
        setDraftName(stored?.name ?? "");
        setDraftPhone(stored?.phone ?? "");
      } finally {
        if (alive) {
          setBooting(false);
        }
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    const socket = socketRef.current;
    if (socket) {
      socket.disconnect();
      socketRef.current = null;
    }
    setSocketConnected(false);

    if (!session?.name) {
      return;
    }

    let cancelled = false;

    const connect = async () => {
      try {
        setLoading(true);
        setError(null);

        const [available, all] = await Promise.all([fetchAvailableOrders(), fetchAllOrders()]);
        if (cancelled) {
          return;
        }

        const activeId = session.activeOrderId;
        const historyIds = new Set(session.historyOrderIds);
        const active = activeId ? all.find((order) => order.id === activeId) ?? null : null;

        setAvailableOrders(activeId ? available.filter((order) => order.id !== activeId) : available);
        setActiveOrder(active);
        setHistoryOrders(all.filter((order) => historyIds.has(order.id)).sort(sortByUpdatedAtDesc));

        const nextSocket = io(apiBase, {
          transports: ["websocket"],
          reconnection: true,
        });

        nextSocket.on("connect", () => setSocketConnected(true));
        nextSocket.on("disconnect", () => setSocketConnected(false));
        nextSocket.on("connect_error", () => setSocketConnected(false));
        nextSocket.on("order:new", (order: Order) => {
          if (order.status !== "pending") {
            return;
          }

          setAvailableOrders((current) =>
            current.some((item) => item.id === order.id) ? current : [order, ...current],
          );
        });
        nextSocket.on("order:updated", (order: Order) => {
          setAvailableOrders((current) => current.filter((item) => item.id !== order.id));
          setActiveOrder((current) => (current?.id === order.id ? order : current));
          setHistoryOrders((current) =>
            current.some((item) => item.id === order.id)
              ? mergeOrder(current, order).sort(sortByUpdatedAtDesc)
              : current,
          );
        });

        socketRef.current = nextSocket;
      } catch (networkError) {
        if (!cancelled) {
          setError(extractErrorMessage(networkError, "Could not reach the backend. Is it running?"));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void connect();

    return () => {
      cancelled = true;
      socketRef.current?.disconnect();
      socketRef.current = null;
    };
  }, [apiBase, session?.name, session?.activeOrderId, session?.historyOrderIds]);

  const activeOrderLabel = useMemo(() => {
    if (!activeOrder) {
      return "No active delivery";
    }
    return `${orderStatusLabel(activeOrder.status)} · ${activeOrder.restaurant.name}`;
  }, [activeOrder]);

  async function handleSaveProfile() {
    const trimmedName = draftName.trim();
    if (!trimmedName) {
      return;
    }

    try {
      setSavingProfile(true);
      const saved = await saveRiderProfile(trimmedName, draftPhone.trim() || null);
      setSession(saved);
      setSelectedTab("deliveries");
    } catch (profileError) {
      setError(extractErrorMessage(profileError, "Could not save your rider profile."));
    } finally {
      setSavingProfile(false);
    }
  }

  async function handleLogout() {
    try {
      await clearSession();
      setSession(null);
      setAvailableOrders([]);
      setActiveOrder(null);
      setHistoryOrders([]);
      setSelectedTab("deliveries");
      setDraftName("");
      setDraftPhone("");
    } catch (logoutError) {
      setError(extractErrorMessage(logoutError, "Could not log you out."));
    }
  }

  async function refreshOrders() {
    if (!session?.name) {
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const [available, all] = await Promise.all([fetchAvailableOrders(), fetchAllOrders()]);
      const activeId = session.activeOrderId;
      const historyIds = new Set(session.historyOrderIds);
      const active = activeId ? all.find((order) => order.id === activeId) ?? null : null;

      setAvailableOrders(activeId ? available.filter((order) => order.id !== activeId) : available);
      setActiveOrder(active);
      setHistoryOrders(all.filter((order) => historyIds.has(order.id)).sort(sortByUpdatedAtDesc));
    } catch (refreshError) {
      setError(extractErrorMessage(refreshError, "Could not refresh deliveries."));
    } finally {
      setLoading(false);
    }
  }

  async function handleAccept(orderId: string) {
    try {
      setLoading(true);
      setError(null);
      const updated = await updateOrderStatus(orderId, "confirmed");
      await setActiveOrderId(updated.id);
      setSession((current) =>
        current
          ? {
              ...current,
              activeOrderId: updated.id,
            }
          : current,
      );
      setActiveOrder(updated);
      setAvailableOrders((current) => current.filter((order) => order.id !== orderId));
    } catch (acceptError) {
      setError(extractErrorMessage(acceptError, "Could not accept this delivery."));
    } finally {
      setLoading(false);
    }
  }

  async function handleAdvance(orderId: string, status: NonNullable<ReturnType<typeof nextOrderStatus>>) {
    try {
      setLoading(true);
      setError(null);
      const updated = await updateOrderStatus(orderId, status);

      if (status === "delivered") {
        await setActiveOrderId(null);
        await addHistoryOrderId(orderId);
        setSession((current) =>
          current
            ? {
                ...current,
                activeOrderId: null,
                historyOrderIds: Array.from(new Set([...current.historyOrderIds, orderId])),
              }
            : current,
        );
        setActiveOrder(null);
        setHistoryOrders((current) => mergeOrder(current, updated).sort(sortByUpdatedAtDesc));
      } else {
        setActiveOrder(updated);
      }
    } catch (advanceError) {
      setError(extractErrorMessage(advanceError, "Could not update the delivery status."));
    } finally {
      setLoading(false);
    }
  }

  function openNavigation(address?: string | null) {
    if (!address?.trim()) {
      Alert.alert("Navigation", "No address is available for this stop.");
      return;
    }

    const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
    void Linking.openURL(url).catch(() => {
      Alert.alert("Navigation", "No maps app could be opened.");
    });
  }

  if (booting) {
    return (
      <SafeAreaView style={styles.bootContainer}>
        <ExpoStatusBar style="dark" />
        <ActivityIndicator size="large" color="#C4501F" />
        <Text style={styles.bootText}>Loading rider session...</Text>
      </SafeAreaView>
    );
  }

  if (!session?.name) {
    return (
      <SafeAreaView style={styles.shell}>
        <StatusBar barStyle="dark-content" />
        <ExpoStatusBar style="dark" />
        <ScrollView contentContainerStyle={styles.loginContainer} keyboardShouldPersistTaps="handled">
          <View style={styles.heroCard}>
            <Text style={styles.brand}>FoodExpress Rider</Text>
            <Text style={styles.heroTitle}>Open deliveries in Expo Go</Text>
            <Text style={styles.heroText}>
              This is the Expo rewrite of the rider app. Save your name locally, connect to the backend, and start
              accepting deliveries.
            </Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Join as rider</Text>
            <Text style={styles.sectionBody}>Your profile stays on this device only.</Text>

            <TextInput
              placeholder="Your name"
              placeholderTextColor="#9D9184"
              value={draftName}
              onChangeText={setDraftName}
              style={styles.input}
              autoCapitalize="words"
              returnKeyType="next"
            />
            <TextInput
              placeholder="Phone (optional)"
              placeholderTextColor="#9D9184"
              value={draftPhone}
              onChangeText={setDraftPhone}
              style={styles.input}
              keyboardType="phone-pad"
            />

            <TouchableOpacity
              style={[styles.primaryButton, (!draftName.trim() || savingProfile) && styles.disabledButton]}
              onPress={() => void handleSaveProfile()}
              disabled={!draftName.trim() || savingProfile}
            >
              <Text style={styles.primaryButtonText}>{savingProfile ? "Saving..." : "Start riding"}</Text>
            </TouchableOpacity>

            <Text style={styles.helperText}>Backend: {apiBase}</Text>
          </View>

          {error ? (
            <View style={[styles.card, styles.errorCard]}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.shell}>
      <StatusBar barStyle="dark-content" />
      <ExpoStatusBar style="dark" />

      <View style={styles.topBar}>
        <View>
          <Text style={styles.brand}>FoodExpress Rider</Text>
          <Text style={styles.topTitle}>{session.name}</Text>
        </View>
        <View style={[styles.livePill, socketConnected ? styles.livePillOn : styles.livePillOff]}>
          <Text style={styles.livePillText}>{socketConnected ? "Live" : "Offline"}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.heroCard}>
          <Text style={styles.heroTitle}>Ready to move?</Text>
          <Text style={styles.heroText}>{activeOrderLabel}</Text>
          <Text style={styles.helperText}>Backend: {apiBase}</Text>
        </View>

        {error ? (
          <View style={[styles.card, styles.errorCard]}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {selectedTab === "deliveries" ? (
          <DeliveriesView
            loading={loading}
            activeOrder={activeOrder}
            availableOrders={availableOrders}
            onRefresh={() => void refreshOrders()}
            onAccept={(orderId) => void handleAccept(orderId)}
            onAdvance={(orderId, status) => void handleAdvance(orderId, status)}
            onNavigate={openNavigation}
          />
        ) : null}

        {selectedTab === "history" ? <HistoryView orders={historyOrders} /> : null}

        {selectedTab === "profile" ? (
          <ProfileView
            session={session}
            onLogout={() => void handleLogout()}
            onRefresh={() => void refreshOrders()}
            loading={loading}
          />
        ) : null}
      </ScrollView>

      <View style={styles.tabBar}>
        {tabs.map((tab) => {
          const selected = selectedTab === tab.key;
          return (
            <TouchableOpacity
              key={tab.key}
              style={[styles.tabButton, selected && styles.tabButtonSelected]}
              onPress={() => setSelectedTab(tab.key)}
            >
              <Text style={[styles.tabButtonText, selected && styles.tabButtonTextSelected]}>{tab.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </SafeAreaView>
  );
}

function DeliveriesView(props: {
  loading: boolean;
  activeOrder: Order | null;
  availableOrders: Order[];
  onRefresh: () => void;
  onAccept: (orderId: string) => void;
  onAdvance: (orderId: string, status: NonNullable<ReturnType<typeof nextOrderStatus>>) => void;
  onNavigate: (address?: string | null) => void;
}): ReactElement {
  const { activeOrder, availableOrders, loading, onAccept, onAdvance, onNavigate, onRefresh } = props;

  return (
    <View>
      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionTitle}>Deliveries</Text>
        <TouchableOpacity onPress={onRefresh} style={styles.ghostButton}>
          <Text style={styles.ghostButtonText}>Refresh</Text>
        </TouchableOpacity>
      </View>

      {loading ? <ActivityIndicator color="#C4501F" style={styles.loader} /> : null}

      {activeOrder ? (
        <OrderCard
          order={activeOrder}
          active
          onNavigate={onNavigate}
          onAdvance={onAdvance}
        />
      ) : availableOrders.length === 0 ? (
        <View style={styles.card}>
          <Text style={styles.emptyTitle}>No deliveries waiting right now.</Text>
          <Text style={styles.sectionBody}>New orders will appear here as they come in.</Text>
        </View>
      ) : (
        availableOrders.map((order) => (
          <OrderCard key={order.id} order={order} onAccept={onAccept} />
        ))
      )}
    </View>
  );
}

function OrderCard(props: {
  order: Order;
  active?: boolean;
  onAccept?: (orderId: string) => void;
  onAdvance?: (orderId: string, status: NonNullable<ReturnType<typeof nextOrderStatus>>) => void;
  onNavigate?: (address?: string | null) => void;
}): ReactElement {
  const { active = false, order, onAccept, onAdvance, onNavigate } = props;
  const nextStatus = nextOrderStatus(order.status);
  const targetAddress = order.status === "on-the-way" ? order.customer.address : order.restaurant.address;

  return (
    <View style={styles.card}>
      <View style={styles.cardHeaderRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.cardTitle}>
            {order.restaurant.emoji ? `${order.restaurant.emoji} ` : ""}
            {order.restaurant.name}
          </Text>
          <Text style={styles.cardSubtitle}>{summarizeItems(order.items ?? [])}</Text>
        </View>
        <View style={styles.statusPill}>
          <Text style={styles.statusPillText}>{orderStatusLabel(order.status)}</Text>
        </View>
      </View>

      <Text style={styles.cardMeta}>For {order.customer.name}</Text>
      <Text style={styles.cardMeta}>
        {formatRupees(order.totalPrice)}{order.createdAt ? ` · ${formatOrderTime(order.createdAt)}` : ""}
      </Text>

      {active ? (
        <View style={styles.detailBlock}>
          <Text style={styles.detailLabel}>Pickup</Text>
          <Text style={styles.detailText}>{order.restaurant.address || "No restaurant address"}</Text>
          <Text style={styles.detailText}>{order.restaurant.phone || ""}</Text>

          <Text style={[styles.detailLabel, styles.detailLabelSpacing]}>Drop-off</Text>
          <Text style={styles.detailText}>{order.customer.address || "No customer address"}</Text>
          <Text style={styles.detailText}>{order.customer.phone || ""}</Text>

          <Text style={[styles.detailLabel, styles.detailLabelSpacing]}>Items</Text>
          {order.items?.length ? (
            order.items.map((item, index) => (
              <View key={`${order.id}-${index}`} style={styles.itemRow}>
                <Text style={styles.detailText}>
                  {item.quantity ?? 1} × {item.menuItem?.name ?? "Item"}
                </Text>
                <Text style={styles.detailText}>{formatRupees((item.price ?? 0) * (item.quantity ?? 1))}</Text>
              </View>
            ))
          ) : (
            <Text style={styles.detailText}>No items listed.</Text>
          )}

          {onNavigate ? (
            <TouchableOpacity style={styles.secondaryButton} onPress={() => onNavigate(targetAddress)}>
              <Text style={styles.secondaryButtonText}>
                Navigate to {order.status === "on-the-way" ? "customer" : "restaurant"}
              </Text>
            </TouchableOpacity>
          ) : null}

          {nextStatus && onAdvance ? (
            <TouchableOpacity style={styles.primaryButton} onPress={() => onAdvance(order.id, nextStatus)}>
              <Text style={styles.primaryButtonText}>
                {nextStatus === "preparing"
                  ? "Mark as preparing"
                  : nextStatus === "on-the-way"
                    ? "Picked up - on the way"
                    : "Mark delivered"}
              </Text>
            </TouchableOpacity>
          ) : null}
        </View>
      ) : onAccept ? (
        <TouchableOpacity style={styles.primaryButton} onPress={() => onAccept(order.id)}>
          <Text style={styles.primaryButtonText}>Accept delivery</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

function HistoryView(props: { orders: Order[] }): ReactElement {
  const { orders } = props;

  return (
    <View>
      <Text style={styles.sectionTitle}>History</Text>
      {orders.length === 0 ? (
        <View style={styles.card}>
          <Text style={styles.emptyTitle}>Deliveries you complete will show up here.</Text>
        </View>
      ) : (
        orders.map((order) => <HistoryCard key={order.id} order={order} />)
      )}
    </View>
  );
}

function HistoryCard({ order }: { order: Order }): ReactElement {
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>
        {order.restaurant.emoji ? `${order.restaurant.emoji} ` : ""}
        {order.restaurant.name}
      </Text>
      <Text style={styles.cardSubtitle}>Delivered to {order.customer.name}</Text>
      <Text style={styles.cardMeta}>
        {formatRupees(order.totalPrice)}{order.updatedAt ? ` · ${formatOrderTime(order.updatedAt)}` : ""}
      </Text>
    </View>
  );
}

function ProfileView(props: {
  session: RiderProfile;
  onLogout: () => void;
  onRefresh: () => void;
  loading: boolean;
}): ReactElement {
  const { loading, onLogout, onRefresh, session } = props;

  return (
    <View>
      <Text style={styles.sectionTitle}>Profile</Text>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>{session.name}</Text>
        <Text style={styles.cardSubtitle}>{session.phone?.trim() ? session.phone : "No phone saved"}</Text>
        <Text style={styles.cardMeta}>Active order: {session.activeOrderId ?? "none"}</Text>
        <Text style={styles.cardMeta}>History count: {session.historyOrderIds.length}</Text>

        <TouchableOpacity style={styles.secondaryButton} onPress={onRefresh} disabled={loading}>
          <Text style={styles.secondaryButtonText}>{loading ? "Refreshing..." : "Refresh deliveries"}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.logoutButton} onPress={onLogout}>
          <Text style={styles.logoutButtonText}>Log out</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    flex: 1,
    backgroundColor: "#FAF7F2",
  },
  bootContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FAF7F2",
    padding: 24,
    gap: 16,
  },
  bootText: {
    color: "#8A7F73",
    fontSize: 16,
  },
  loginContainer: {
    padding: 20,
    gap: 16,
    paddingBottom: 28,
  },
  content: {
    padding: 20,
    gap: 16,
    paddingBottom: 96,
  },
  topBar: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  brand: {
    color: "#C4501F",
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  topTitle: {
    color: "#2B2420",
    fontSize: 22,
    fontWeight: "800",
    marginTop: 4,
  },
  heroCard: {
    borderRadius: 28,
    backgroundColor: "#F3E2D5",
    padding: 20,
    gap: 10,
  },
  heroTitle: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: "800",
    color: "#2B2420",
  },
  heroText: {
    fontSize: 15,
    color: "#665A51",
    lineHeight: 22,
  },
  helperText: {
    fontSize: 12,
    color: "#8A7F73",
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 18,
    gap: 12,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 2,
  },
  errorCard: {
    backgroundColor: "#FCEDE7",
  },
  errorText: {
    color: "#8F3D1D",
    fontSize: 14,
    lineHeight: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#2B2420",
    marginBottom: 10,
  },
  sectionBody: {
    fontSize: 14,
    color: "#665A51",
    lineHeight: 20,
  },
  input: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E6D8CD",
    backgroundColor: "#FFFDFC",
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: "#2B2420",
    fontSize: 15,
  },
  primaryButton: {
    minHeight: 48,
    borderRadius: 16,
    backgroundColor: "#C4501F",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
  secondaryButton: {
    minHeight: 48,
    borderRadius: 16,
    backgroundColor: "#F3E2D5",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  secondaryButtonText: {
    color: "#7A4022",
    fontSize: 15,
    fontWeight: "700",
  },
  ghostButton: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 999,
    backgroundColor: "#F3E2D5",
  },
  ghostButtonText: {
    color: "#7A4022",
    fontWeight: "700",
    fontSize: 13,
  },
  disabledButton: {
    opacity: 0.6,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  loader: {
    marginVertical: 8,
  },
  emptyTitle: {
    color: "#2B2420",
    fontSize: 16,
    fontWeight: "700",
  },
  cardHeaderRow: {
    flexDirection: "row",
    gap: 12,
    alignItems: "flex-start",
  },
  cardTitle: {
    color: "#2B2420",
    fontSize: 18,
    fontWeight: "800",
  },
  cardSubtitle: {
    color: "#665A51",
    fontSize: 14,
    lineHeight: 20,
  },
  cardMeta: {
    color: "#8A7F73",
    fontSize: 13,
  },
  statusPill: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "#E3F0E8",
  },
  statusPillText: {
    color: "#2F7A4F",
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  detailBlock: {
    gap: 6,
  },
  detailLabel: {
    color: "#8A7F73",
    textTransform: "uppercase",
    letterSpacing: 0.4,
    fontSize: 11,
    fontWeight: "800",
  },
  detailLabelSpacing: {
    marginTop: 6,
  },
  detailText: {
    color: "#2B2420",
    fontSize: 14,
    lineHeight: 20,
  },
  itemRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
  },
  logoutButton: {
    minHeight: 48,
    borderRadius: 16,
    backgroundColor: "#FCEDE7",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  logoutButtonText: {
    color: "#8F3D1D",
    fontSize: 15,
    fontWeight: "700",
  },
  tabBar: {
    position: "absolute",
    left: 16,
    right: 16,
    bottom: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 8,
    borderRadius: 24,
    backgroundColor: "rgba(255,255,255,0.96)",
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 6,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    borderRadius: 18,
  },
  tabButtonSelected: {
    backgroundColor: "#C4501F",
  },
  tabButtonText: {
    color: "#665A51",
    fontWeight: "700",
    fontSize: 13,
  },
  tabButtonTextSelected: {
    color: "#FFFFFF",
  },
  livePill: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  livePillOn: {
    backgroundColor: "#E3F0E8",
  },
  livePillOff: {
    backgroundColor: "#F3E2D5",
  },
  livePillText: {
    color: "#2B2420",
    fontWeight: "700",
    fontSize: 12,
  },
});

export default App;
