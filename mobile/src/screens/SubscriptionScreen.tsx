import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CreditCard, ChevronRight } from 'lucide-react-native';

const COLORS = {
  bg: '#0F0F1A',
  card: '#161620',
  cardBorder: 'rgba(255,255,255,0.06)',
  textPrimary: '#F5F5F7',
  textSecondary: '#A1A1AA',
  textMuted: '#71717A',
  purple: '#9333EA',
  green: '#10B981',
};

export default function SubscriptionScreen({ navigation }: any) {
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.header}>
          <CreditCard size={32} color={COLORS.purple} />
          <Text style={styles.title}>Subscription</Text>
          <Text style={styles.subtitle}>Manage your COLORiq plan</Text>
        </View>

        <View style={styles.currentPlan}>
          <Text style={styles.planLabel}>Current Plan</Text>
          <Text style={styles.planName}>Pro Monthly</Text>
          <Text style={styles.planPrice}>$49/month</Text>
        </View>

        <TouchableOpacity style={styles.card} onPress={() => Alert.alert('Coming Soon', 'Upgrade Plan - coming in next update!')}>
          <Text style={styles.cardTitle}>Upgrade Plan</Text>
          <Text style={styles.cardDesc}>View all available plans</Text>
          <ChevronRight size={20} color={COLORS.textMuted} style={styles.cardArrow} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.card} onPress={() => Alert.alert('Coming Soon', 'Billing History - coming in next update!')}>
          <Text style={styles.cardTitle}>Billing History</Text>
          <Text style={styles.cardDesc}>View past invoices</Text>
          <ChevronRight size={20} color={COLORS.textMuted} style={styles.cardArrow} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.card} onPress={() => Alert.alert('Coming Soon', 'Payment Methods - coming in next update!')}>
          <Text style={styles.cardTitle}>Payment Methods</Text>
          <Text style={styles.cardDesc}>Manage cards and payment</Text>
          <ChevronRight size={20} color={COLORS.textMuted} style={styles.cardArrow} />
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  scroll: { padding: 20 },
  header: {
    alignItems: 'center',
    marginBottom: 28,
    marginTop: 8,
  },
  title: { fontSize: 24, fontWeight: '800', color: COLORS.textPrimary, marginTop: 12 },
  subtitle: { fontSize: 14, color: COLORS.textSecondary, marginTop: 6, textAlign: 'center' },
  currentPlan: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    alignItems: 'center',
  },
  planLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  planName: { fontSize: 20, fontWeight: '800', color: COLORS.textPrimary, marginTop: 8 },
  planPrice: { fontSize: 16, color: COLORS.green, fontWeight: '600', marginTop: 4 },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  cardTitle: { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary },
  cardDesc: { fontSize: 13, color: COLORS.textSecondary, marginTop: 2 },
  cardArrow: { marginTop: 8, alignSelf: 'flex-end' },
});
