import React, { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRider } from '../context/RiderContext';
import PrimaryButton from '../components/PrimaryButton';
import { colors } from '../theme/colors';

function formatRupees(amount) {
  return `₹${Math.round(amount || 0)}`;
}

export default function ProfileScreen() {
  const { riderProfile, logout, updateProfile, toggleOnline, stats } = useRider();
  const insets = useSafeAreaInsets();

  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(riderProfile?.name || '');
  const [phone, setPhone] = useState(riderProfile?.phone || '');
  const [saving, setSaving] = useState(false);
  const [togglingOnline, setTogglingOnline] = useState(false);

  const startEditing = () => {
    setName(riderProfile?.name || '');
    setPhone(riderProfile?.phone || '');
    setIsEditing(true);
  };

  const handleSave = async () => {
    if (!name.trim() || !phone.trim()) {
      Alert.alert('Missing details', 'Please enter both name and phone number.');
      return;
    }
    setSaving(true);
    const result = await updateProfile({ name, phone });
    setSaving(false);
    if (!result.success) {
      Alert.alert('Could not save', result.message);
      return;
    }
    setIsEditing(false);
  };

  const handleToggleOnline = async (next) => {
    setTogglingOnline(true);
    await toggleOnline(next);
    setTogglingOnline(false);
  };

  return (
    <ScrollView
      style={styles.flex}
      contentContainerStyle={[styles.container, { paddingTop: insets.top + 24 }]}
    >
      {isEditing ? (
        <View style={styles.editForm}>
          <Text style={styles.label}>Name</Text>
          <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="Your name" />
          <Text style={styles.label}>Phone</Text>
          <TextInput
            style={styles.input}
            value={phone}
            onChangeText={setPhone}
            placeholder="+91 98765 43210"
            keyboardType="phone-pad"
          />
          <View style={styles.editButtonRow}>
            <View style={styles.editButtonHalf}>
              <PrimaryButton title="Cancel" onPress={() => setIsEditing(false)} variant="outline" />
            </View>
            <View style={styles.editButtonHalf}>
              <PrimaryButton title="Save" onPress={handleSave} loading={saving} />
            </View>
          </View>
        </View>
      ) : (
        <>
          <Text style={styles.name}>{riderProfile?.name}</Text>
          {riderProfile?.phone ? <Text style={styles.phone}>{riderProfile.phone}</Text> : null}
          <View style={styles.editLinkWrap}>
            <Text style={styles.editLink} onPress={startEditing}>
              Edit profile
            </Text>
          </View>
        </>
      )}

      <View style={styles.onlineCard}>
        <View style={styles.onlineTextWrap}>
          <Text style={styles.onlineTitle}>
            {riderProfile?.isOnline ? "You're online" : "You're offline"}
          </Text>
          <Text style={styles.onlineSubtitle}>
            {riderProfile?.isOnline
              ? 'You can see and accept new deliveries.'
              : 'Go online to start seeing available deliveries.'}
          </Text>
        </View>
        <Switch
          value={!!riderProfile?.isOnline}
          onValueChange={handleToggleOnline}
          disabled={togglingOnline}
          trackColor={{ false: colors.border, true: colors.primary }}
          thumbColor="#fff"
        />
      </View>

      <View style={styles.statsCard}>
        <View style={styles.statBlock}>
          <Text style={styles.statValue}>{stats.totalDeliveries}</Text>
          <Text style={styles.statLabel}>Deliveries</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statBlock}>
          <Text style={styles.statValue}>{formatRupees(stats.totalEarnings)}</Text>
          <Text style={styles.statLabel}>Earnings</Text>
          {stats.earningsPerDelivery ? (
            <Text style={styles.statCaption}>{formatRupees(stats.earningsPerDelivery)}/delivery</Text>
          ) : null}
        </View>
      </View>

      <View style={styles.buttonWrap}>
        <PrimaryButton title="Log out" onPress={logout} variant="outline" />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  container: {
    paddingHorizontal: 24,
    paddingBottom: 32,
  },
  name: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
  },
  phone: {
    fontSize: 14,
    color: colors.textMuted,
    marginTop: 4,
  },
  editLinkWrap: {
    marginTop: 10,
  },
  editLink: {
    color: colors.primary,
    fontWeight: '700',
    fontSize: 14,
  },
  editForm: {
    gap: 6,
  },
  label: {
    fontSize: 13,
    color: colors.text,
    fontWeight: '600',
    marginTop: 10,
    marginBottom: 6,
  },
  input: {
    height: 48,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    paddingHorizontal: 14,
    fontSize: 15,
    color: colors.text,
  },
  editButtonRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  editButtonHalf: {
    flex: 1,
  },
  onlineCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 16,
    marginTop: 28,
  },
  onlineTextWrap: {
    flex: 1,
    marginRight: 12,
  },
  onlineTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  onlineSubtitle: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 2,
  },
  statsCard: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 20,
    marginTop: 16,
  },
  statBlock: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    backgroundColor: colors.border,
  },
  statValue: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
  },
  statLabel: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 4,
  },
  statCaption: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },
  buttonWrap: {
    marginTop: 32,
  },
});
