import React, { useCallback, useContext, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { User, CreditCard, ChevronRight, Trash2 } from 'lucide-react-native';
import { getAccount, deleteAccount, AccountInfo } from '../api/client';
import { AuthContext } from '../../App';

const COLORS = {
  bg: '#0F0F1A',
  card: '#161620',
  cardBorder: 'rgba(255,255,255,0.06)',
  textPrimary: '#F5F5F7',
  textSecondary: '#A1A1AA',
  textMuted: '#71717A',
  purple: '#9333EA',
  red: '#EF4444',
  redBg: 'rgba(239,68,68,0.08)',
  redBorder: 'rgba(239,68,68,0.3)',
  input: 'rgba(255,255,255,0.06)',
};

const CONFIRM_WORD = 'DELETE';

export default function AccountScreen({ navigation }: any) {
  const { logout } = useContext(AuthContext);
  const [info, setInfo] = useState<AccountInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      setInfo(await getAccount());
    } catch (e: any) {
      setLoadError(e?.message || 'Could not load your account.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const canDelete = confirmText.trim() === CONFIRM_WORD && !deleting;

  const handleDelete = async () => {
    if (!canDelete) return;
    setDeleting(true);
    try {
      await deleteAccount();
      Alert.alert('Account deleted', 'Your COLORiq account has been permanently deleted.', [
        { text: 'OK', onPress: () => logout() },
      ], { cancelable: false });
    } catch (e: any) {
      setDeleting(false);
      Alert.alert(
        'Deletion failed',
        'Your account was not deleted. Please check your connection and try again.' +
          (e?.message ? `\n\n(${e.message})` : '')
      );
    }
  };

  const plan = info?.plan;
  const planLine = plan?.label
    ? `${plan.label}${plan.hasAccess ? '' : plan.status ? ` · ${plan.status}` : ''}`
    : 'No active plan';

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <Text style={styles.title}>Account</Text>

          {/* Profile */}
          <View style={styles.card}>
            <View style={styles.row}>
              <View style={styles.icon}><User size={20} color={COLORS.purple} /></View>
              <View style={{ flex: 1 }}>
                {loading ? (
                  <ActivityIndicator color={COLORS.purple} style={{ alignSelf: 'flex-start' }} />
                ) : loadError ? (
                  <>
                    <Text style={styles.rowTitle}>Couldn’t load account</Text>
                    <TouchableOpacity onPress={load}>
                      <Text style={styles.link}>Try again</Text>
                    </TouchableOpacity>
                  </>
                ) : (
                  <>
                    <Text style={styles.rowTitle}>{info?.account.name || 'Stylist'}</Text>
                    <Text style={styles.rowSub}>{info?.account.email}</Text>
                  </>
                )}
              </View>
            </View>
          </View>

          {/* Plan */}
          <TouchableOpacity style={styles.card} onPress={() => navigation.navigate('Subscription')} activeOpacity={0.7}>
            <View style={styles.row}>
              <View style={styles.icon}><CreditCard size={20} color={COLORS.purple} /></View>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowTitle}>Plan</Text>
                <Text style={styles.rowSub}>{loading ? '…' : loadError ? 'Unavailable' : planLine}</Text>
              </View>
              <ChevronRight size={18} color={COLORS.textMuted} />
            </View>
          </TouchableOpacity>

          {/* Delete account */}
          <Text style={styles.sectionHeader}>Danger zone</Text>
          <View style={[styles.card, styles.dangerCard]}>
            {!confirmOpen ? (
              <TouchableOpacity style={styles.row} onPress={() => setConfirmOpen(true)} activeOpacity={0.7}>
                <View style={[styles.icon, { backgroundColor: COLORS.redBg }]}><Trash2 size={20} color={COLORS.red} /></View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.rowTitle, { color: COLORS.red }]}>Delete Account</Text>
                  <Text style={styles.rowSub}>Permanently delete your account and personal data</Text>
                </View>
                <ChevronRight size={18} color={COLORS.textMuted} />
              </TouchableOpacity>
            ) : (
              <View>
                <Text style={[styles.rowTitle, { color: COLORS.red }]}>Delete your account?</Text>
                <Text style={styles.body}>
                  This is permanent and cannot be undone. It will:
                </Text>
                <Text style={styles.bullet}>• Delete your login, email and password</Text>
                <Text style={styles.bullet}>• Delete your profile, posts, comments and likes</Text>
                <Text style={styles.bullet}>• Revoke your API keys and cancel your personal COLORiq plan — your Square subscription is canceled too, so billing stops</Text>
                <Text style={styles.body}>
                  Records that belong to your salon (its clients, inventory, billing, and formulas used in
                  client visits) are kept for the salon and are no longer linked to you.
                </Text>
                <Text style={styles.bullet}>• Your formulas, photos and photo analyses stay with COLORiq and are no longer linked to you. You give up any future revenue they earn, which belongs to COLORiq.</Text>
                <Text style={styles.label}>Type {CONFIRM_WORD} to confirm</Text>
                <TextInput
                  value={confirmText}
                  onChangeText={setConfirmText}
                  placeholder={CONFIRM_WORD}
                  placeholderTextColor={COLORS.textMuted}
                  autoCapitalize="characters"
                  autoCorrect={false}
                  editable={!deleting}
                  style={styles.input}
                  accessibilityLabel={`Type ${CONFIRM_WORD} to confirm account deletion`}
                />
                <TouchableOpacity
                  style={[styles.deleteBtn, !canDelete && { opacity: 0.4 }]}
                  disabled={!canDelete}
                  onPress={handleDelete}
                >
                  {deleting ? (
                    <ActivityIndicator color="#FFF" />
                  ) : (
                    <Text style={styles.deleteBtnText}>Permanently Delete Account</Text>
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.cancelBtn}
                  disabled={deleting}
                  onPress={() => { setConfirmOpen(false); setConfirmText(''); }}
                >
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  scroll: { padding: 16 },
  title: { fontSize: 24, fontWeight: '800', color: COLORS.textPrimary, marginBottom: 16 },
  sectionHeader: {
    fontSize: 12, fontWeight: '700', color: COLORS.textMuted, textTransform: 'uppercase',
    letterSpacing: 1, paddingHorizontal: 4, paddingTop: 16, paddingBottom: 6,
  },
  card: {
    backgroundColor: COLORS.card, borderRadius: 14, padding: 16, marginBottom: 12,
    borderWidth: 1, borderColor: COLORS.cardBorder,
  },
  dangerCard: { borderColor: COLORS.redBorder },
  row: { flexDirection: 'row', alignItems: 'center' },
  icon: {
    width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.06)',
    justifyContent: 'center', alignItems: 'center', marginRight: 12,
  },
  rowTitle: { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary },
  rowSub: { fontSize: 13, color: COLORS.textSecondary, marginTop: 2 },
  link: { fontSize: 13, color: COLORS.purple, marginTop: 4, fontWeight: '600' },
  body: { fontSize: 13, color: COLORS.textSecondary, marginTop: 10, lineHeight: 19 },
  bullet: { fontSize: 13, color: COLORS.textSecondary, marginTop: 4, lineHeight: 19 },
  label: { fontSize: 12, fontWeight: '700', color: COLORS.textMuted, marginTop: 16, marginBottom: 6 },
  input: {
    backgroundColor: COLORS.input, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10,
    color: COLORS.textPrimary, fontSize: 15, borderWidth: 1, borderColor: COLORS.cardBorder,
  },
  deleteBtn: {
    backgroundColor: COLORS.red, borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 14,
  },
  deleteBtnText: { color: '#FFF', fontSize: 15, fontWeight: '700' },
  cancelBtn: { paddingVertical: 12, alignItems: 'center', marginTop: 4 },
  cancelBtnText: { color: COLORS.textSecondary, fontSize: 14, fontWeight: '600' },
});
