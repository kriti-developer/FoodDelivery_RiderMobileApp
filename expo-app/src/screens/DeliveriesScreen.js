import React, { useEffect } from 'react';
import {
  Alert,
  FlatList,
  Linking,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRider } from '../context/RiderContext';
import PrimaryButton from '../components/PrimaryButton';
import { colors } from '../theme/colors';
import { advanceButtonLabel, nextStatus, OrderStatus, statusLabel } from '../utils/orderStatus';

function formatTime(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatRupees(amount) {
  return `₹${Math.round(amount || 0)}`;
}

function itemSummary(items) {
  const names = (items || []).map((i) => i.menuItem?.name).filter(Boolean);
  return names.length ? names.join(', ') : 'No items';
}

export default function DeliveriesScreen() {
  const { availableOrders, activeOrder, loading, error, clearError, refresh, acceptOrder } =
    useRider();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (error) {
      Alert.alert('Something went wrong', error, [{ text: 'OK', onPress: clearError }]);
    }
  }, [error, clearError]);

  if (activeOrder) {
    return <ActiveDeliveryCard order={activeOrder} insets={insets} />;
  }

  return (
    <View style={[styles.flex, { paddingTop: insets.top }]}>
      <Text style={styles.heading}>Available deliveries</Text>
      <FlatList
        data={availableOrders}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={refresh} />}
        ListEmptyComponent={
          !loading && (
            <View style={styles.emptyWrap}>
              <Ionicons name="bicycle-outline" size={56} color={colors.border} />
              <Text style={styles.emptyText}>No deliveries waiting right now.</Text>
            </View>
          )
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.restaurantName}>
              {item.restaurant?.emoji} {item.restaurant?.name}
            </Text>
            <Text style={styles.itemsText}>{itemSummary(item.items)}</Text>
            <Text style={styles.metaText}>For {item.customer?.name}</Text>
            <View style={styles.cardFooter}>
              <Text style={styles.metaText}>
                {formatRupees(item.totalPrice)} · {formatTime(item.createdAt)}
              </Text>
              <TouchableOpacity
                style={styles.acceptButton}
                onPress={() => acceptOrder(item._id)}
              >
                <Text style={styles.acceptButtonText}>Accept delivery</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      />
    </View>
  );
}

function ActiveDeliveryCard({ order, insets }) {
  const { advanceStatus } = useRider();
  const next = nextStatus(order.status);
  const isOnTheWay = order.status === OrderStatus.ON_THE_WAY;
  const navigateAddress = isOnTheWay ? order.customer?.address : order.restaurant?.address;

  const openNavigation = () => {
    if (!navigateAddress) {
      Alert.alert('No address available');
      return;
    }
    Linking.openURL(
      `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(navigateAddress)}`
    );
  };

  return (
    <ScrollView
      style={styles.flex}
      contentContainerStyle={[styles.activeContainer, { paddingTop: insets.top + 16 }]}
    >
      <Text style={styles.heading}>Active delivery</Text>

      <View style={styles.activeCard}>
        <Text style={styles.statusText}>Status: {statusLabel(order.status)}</Text>

        <Text style={styles.sectionLabel}>Pickup from</Text>
        <Text style={styles.sectionValue}>
          {order.restaurant?.emoji} {order.restaurant?.name}
        </Text>
        {order.restaurant?.address ? <Text style={styles.metaText}>{order.restaurant.address}</Text> : null}
        {order.restaurant?.phone ? <Text style={styles.metaText}>{order.restaurant.phone}</Text> : null}

        <View style={styles.divider} />

        <Text style={styles.sectionLabel}>Deliver to</Text>
        <Text style={styles.sectionValue}>{order.customer?.name}</Text>
        {order.customer?.address ? <Text style={styles.metaText}>{order.customer.address}</Text> : null}
        {order.customer?.phone ? <Text style={styles.metaText}>{order.customer.phone}</Text> : null}

        <View style={styles.divider} />

        <Text style={styles.sectionLabel}>Order</Text>
        {(order.items || []).map((item, index) => (
          <View key={index} style={styles.orderRow}>
            <Text style={styles.metaText}>
              {item.quantity} × {item.menuItem?.name || 'Item'}
            </Text>
            <Text style={styles.metaText}>{formatRupees(item.price * item.quantity)}</Text>
          </View>
        ))}
        <View style={styles.orderRow}>
          <Text style={styles.totalText}>Total</Text>
          <Text style={styles.totalText}>{formatRupees(order.totalPrice)}</Text>
        </View>
      </View>

      <PrimaryButton
        title={isOnTheWay ? 'Navigate to customer' : 'Navigate to restaurant'}
        onPress={openNavigation}
        variant="outline"
      />

      {next ? (
        <View style={styles.advanceButtonWrap}>
          <PrimaryButton
            title={advanceButtonLabel(next)}
            onPress={() => advanceStatus(order._id, next)}
          />
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  heading: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 32,
    gap: 12,
  },
  emptyWrap: {
    alignItems: 'center',
    paddingTop: 80,
    gap: 12,
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: 14,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  restaurantName: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  itemsText: {
    fontSize: 14,
    color: colors.textMuted,
    marginTop: 2,
  },
  metaText: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 2,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
  },
  acceptButton: {
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  acceptButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 13,
  },
  activeContainer: {
    paddingHorizontal: 20,
    paddingBottom: 32,
    gap: 16,
  },
  activeCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 18,
  },
  statusText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 12,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textMuted,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  sectionValue: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 14,
  },
  orderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  totalText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
    marginTop: 10,
  },
  advanceButtonWrap: {
    marginTop: -4,
  },
});
