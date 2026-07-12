import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRider } from '../context/RiderContext';
import PrimaryButton from '../components/PrimaryButton';
import { colors } from '../theme/colors';

export default function ProfileScreen() {
  const { riderProfile, logout } = useRider();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: insets.top + 24 }]}>
      <Text style={styles.name}>{riderProfile?.name}</Text>
      {riderProfile?.phone ? <Text style={styles.phone}>{riderProfile.phone}</Text> : null}

      <View style={styles.buttonWrap}>
        <PrimaryButton title="Log out" onPress={logout} variant="outline" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: 24,
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
  buttonWrap: {
    marginTop: 32,
  },
});
