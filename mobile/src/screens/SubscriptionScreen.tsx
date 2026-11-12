import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CreditCard, ExternalLink } from 'lucide-react-native';
import { getAccount, AccountPlan, WEB_MANAGE_PLAN_URL } from '../api/client';

// Product model of record: COLORiq accounts are created and paid for on the
// web. This screen only reports the account's current plan state and sends
// plan changes to the web. There is intentionally no purchase flow here.

const COLORS = {
  bg: '#0F0F1A',
  card: '#161620',
  cardBorder: 'rgba(255,255,255,0.06)',
  textPrimary: '#F5F5F7',
  textSecondary: '#A1A1AA',
  textMuted: '#71717A',
  purple: '#9333EA',
  green: '#10B981',
  amber: '#F59E0B',
};

function formatDate(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
}

function statusText(plan: AccountPlan): { text: string; color: string } {
  if (plan.hasAccess) return { text: 'Active', color: COLORS.green };
  switch (plan.status) {
    case 'trialing': return { text: 'Trial', color: COLORS.amber };
    case 'canceled': return { text: 'Canceled', color: COLORS.textMuted };
    case 'revoked': return { text: 'Ended', color: COLORS.textMuted };
    case 'expired': return { text: 'Expired', color: COLORS.textMuted };
    case 'past_due': return { text: 'Payment due', color: COLORS.amber };
    default: return { text: 'Inactive', color: COLORS.textMuted };
  }
}

export default function SubscriptionScreen() {
  const [plan, setPlan] = useState<AccountPlan | null>(null);
  const [manageUrl, setManageUrl] = useState(WEB_MANAGE_PLAN_URL);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const info = await getAccount();
      setPlan(info.plan);
      if (info.manageUrl) setManageUrl(info.manageUrl);
    } catch (e: any) {
      setError(e?.message || 'Could not load your plan.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const openWeb = async () => {
    try {
      await Linking.openURL(manageUrl);
    } catch {
      Alert.alert('Unable to open browser', `Visit ${manageUrl.replace(/^https?:\/\//, '')} to manage your plan.`);
    }
  };

  const status = plan ? statusText(plan) : null;
  const periodEnd = plan ? formatDate(plan.currentPeriodEnd) : null;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.header}>
          <CreditCard size={32} color={COLORS.purple} />
          <Text style={styles.title}>Subscription</Text>
          <Text style={styles.subtitle}>Your COLORiq plan</Text>
        </View>

        <View style={styles.currentPlan}>
          <Text style={styles.planLabel}>Current Plan</Text>
          {loading ? (
            <ActivityIndicator color={COLORS.purple} style={{ marginTop: 12 }} />
          ) : error ? (
            <>
              <Text style={styles.planName}>Unavailable</Text>
              <Text style={styles.planMeta}>We couldn’t load your plan right now.</Text>
              <TouchableOpacity onPress={load} style={{ marginTop: 10 }}>
                <Text style={styles.link}>Try again</Text>
              </TouchableOpacity>
            </>
          ) : plan && plan.label ? (
            <>
              <Text style={styles.planName}>{plan.label}</Text>
              {status && <Text style={[styles.planStatus, { color: status.color }]}>{status.text}</Text>}
              {plan.scope === 'salon' && <Text style={styles.planMeta}>Provided by your salon</Text>}
              {periodEnd && (
                <Text style={styles.planMeta}>
                  {plan.hasAccess ? 'Current period ends' : 'Ended'} {periodEnd}
                </Text>
              )}
            </>
          ) : (
            <>
              <Text style={styles.planName}>No active plan</Text>
              <Text style={styles.planMeta}>This account doesn’t have an active COLORiq plan.</Text>
            </>
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Manage your plan on the web</Text>
          <Text style={styles.cardDesc}>
            COLORiq plans, billing and payment details are managed in your account on the web. Changes
            you make there apply to this app the next time it refreshes.
          </Text>
          <TouchableOpacity style={styles.webBtn} onPress={openWeb} activeOpacity={0.8}>
            <Text style={styles.webBtnText}>Open getcoloriq.co</Text>
            <ExternalLink size={16} color="#FFF" />
          </TouchableOpacity>
        </View>

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
  planStatus: { fontSize: 14, fontWeight: '700', marginTop: 4 },
  planMeta: { fontSize: 13, color: COLORS.textSecondary, marginTop: 6, textAlign: 'center' },
  link: { fontSize: 14, color: COLORS.purple, fontWeight: '600' },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  cardTitle: { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary },
  cardDesc: { fontSize: 13, color: COLORS.textSecondary, marginTop: 6, lineHeight: 19 },
  webBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.purple,
    borderRadius: 12,
    paddingVertical: 12,
    marginTop: 14,
  },
  webBtnText: { color: '#FFF', fontSize: 15, fontWeight: '700' },
});
