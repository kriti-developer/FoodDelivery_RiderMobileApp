import React from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRider } from '../context/RiderContext';
import { colors } from '../theme/colors';

function formatTime(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatRupees(amount) {
  return `₹${Math.round(amount || 0)}`;
}

export default function HistoryScreen() {
  const { historyOrders } = useRider();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.flex, { paddingTop: insets.top }]}>
      <Text style={styles.heading}>Delivery history</Text>
      <FlatList
        data={historyOrders}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <Ionicons name="time-outline" size={56} color={colors.border} />
            <Text style={styles.emptyText}>Deliveries you complete will show up here.</Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.restaurantName}>
              {item.restaurant?.emoji} {item.restaurant?.name}
            </Text>
            <Text style={styles.metaText}>Delivered to {item.customer?.name}</Text>
            <Text style={styles.metaText}>
              {formatRupees(item.totalPrice)} · {formatTime(item.updatedAt)}
            </Text>
          </View>
        )}
      />
    </View>
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
  },
  emptyWrap: {
    alignItems: 'center',
    paddingTop: 80,
    gap: 12,
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: 14,
    textAlign: 'center',
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
  metaText: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 2,
  },
});
