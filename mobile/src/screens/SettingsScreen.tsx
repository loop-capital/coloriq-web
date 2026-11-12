import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  User,
  Bell,
  Shield,
  LogOut,
  ChevronRight,
  Wifi,
} from 'lucide-react-native';
import { getSettings, saveNotifications, saveAutoSync, getAccount } from '../api/client';

const PRIVACY_POLICY_URL = 'https://getcoloriq.co/privacy';
import { AuthContext } from '../../App';

interface SettingRowProps {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  onPress?: () => void;
  right?: React.ReactNode;
  danger?: boolean;
}

function SettingRow({ icon, title, subtitle, onPress, right, danger }: SettingRowProps) {
  // If the row has interactive controls on the right (e.g. a Switch), don't wrap
  // the entire row in a TouchableOpacity — it blocks child pointer events.
  const hasInteractiveRight = !!right;

  const content = (
    <>
      <View style={styles.settingIcon}>{icon}</View>
      <View style={styles.settingContent}>
        <Text style={[styles.settingTitle, danger && styles.dangerText]}>{title}</Text>
        {subtitle && <Text style={styles.settingSubtitle}>{subtitle}</Text>}
      </View>
      {right || (onPress && <ChevronRight size={18} color="#71717A" />)}
    </>
  );

  if (hasInteractiveRight) {
    return (
      <View style={styles.settingRow}>
        <View style={styles.settingIcon}>{icon}</View>
        <View style={styles.settingContent}>
          <Text style={[styles.settingTitle, danger && styles.dangerText]}>{title}</Text>
          {subtitle && <Text style={styles.settingSubtitle}>{subtitle}</Text>}
        </View>
        {right}
      </View>
    );
  }

  return (
    <TouchableOpacity
      style={styles.settingRow}
      onPress={onPress}
      disabled={!onPress}
      activeOpacity={onPress ? 0.7 : 1}
    >
      {content}
    </TouchableOpacity>
  );
}

function SectionHeader({ title }: { title: string }) {
  return <Text style={styles.sectionHeader}>{title}</Text>;
}

export default function SettingsScreen({ navigation }: any) {
  const [accountEmail, setAccountEmail] = useState<string | null>(null);
  const [accountName, setAccountName] = useState<string | null>(null);
  const [notifications, setNotifications] = useState(true);
  const [autoSync, setAutoSync] = useState(true);
  const [loadingSettings, setLoadingSettings] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const settings = await getSettings();
        setNotifications(settings.notifications);
        setAutoSync(settings.autoSync);
      } catch (e) {
        console.error('Failed to load settings:', e);
        Alert.alert('Error', 'Failed to load settings');
      } finally {
        setLoadingSettings(false);
      }
    })();
  }, []);

  useEffect(() => {
    // Non-fatal: the profile card falls back to generic text if this fails.
    getAccount()
      .then((a) => { setAccountEmail(a.account.email); setAccountName(a.account.name); })
      .catch(() => {});
  }, []);

  const handleNotificationsToggle = async (value: boolean) => {
    setNotifications(value);
    setSaving(true);
    try {
      await saveNotifications(value);
    } catch (e) {
      console.error('Failed to save notifications', e);
      Alert.alert('Error', 'Failed to save notification setting');
      // Revert on failure
      setNotifications(!value);
    } finally {
      setSaving(false);
    }
  };

  const handleAutoSyncToggle = async (value: boolean) => {
    setAutoSync(value);
    setSaving(true);
    try {
      await saveAutoSync(value);
    } catch (e) {
      console.error('Failed to save auto sync', e);
      Alert.alert('Error', 'Failed to save auto sync setting');
      // Revert on failure
      setAutoSync(!value);
    } finally {
      setSaving(false);
    }
  };

  const { logout } = React.useContext(AuthContext);

  const openPrivacyPolicy = async () => {
    try {
      await Linking.openURL(PRIVACY_POLICY_URL);
    } catch {
      Alert.alert('Unable to open browser', 'Visit getcoloriq.co/privacy to read our privacy policy.');
    }
  };

  const openAppPermissions = async () => {
    try {
      await Linking.openSettings();
    } catch {
      Alert.alert('Unable to open Settings', 'Open the Settings app and select COLORiq to manage permissions.');
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            await logout();
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Settings</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Profile */}
        <TouchableOpacity style={styles.profileCard} onPress={() => navigation.navigate('Account')}>
          <View style={styles.profileAvatar}>
            <Text style={styles.profileAvatarText}>IQ</Text>
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{accountName || 'Stylist'}</Text>
            <Text style={styles.profileEmail}>{accountEmail || 'Account & plan'}</Text>
          </View>
          <ChevronRight size={20} color="#71717A" />
        </TouchableOpacity>

        {/* General */}
        <SectionHeader title="General" />
        <View style={styles.section}>
          <SettingRow
            icon={<User size={20} color="#9333EA" />}
            title="Account"
            subtitle="Plan, delete account"
            onPress={() => navigation.navigate('Account')}
          />
          <SettingRow
            icon={<Bell size={20} color="#F59E0B" />}
            title="Notifications"
            subtitle="Push notifications"
            right={
              <Switch
                value={notifications}
                onValueChange={handleNotificationsToggle}
                trackColor={{ false: 'rgba(255,255,255,0.1)', true: 'rgba(147,51,234,0.3)' }}
                thumbColor={notifications ? '#9333EA' : '#71717A'}
              />
            }
          />
        </View>

        {/* Sync */}
        <SectionHeader title="Sync" />
        <View style={styles.section}>
          <SettingRow
            icon={<Wifi size={20} color="#10B981" />}
            title="Auto Sync"
            subtitle="Sync formulations automatically"
            right={
              <Switch
                value={autoSync}
                onValueChange={handleAutoSyncToggle}
                trackColor={{ false: 'rgba(255,255,255,0.1)', true: 'rgba(147,51,234,0.3)' }}
                thumbColor={autoSync ? '#9333EA' : '#71717A'}
              />
            }
          />
        </View>

        {/* Privacy */}
        <SectionHeader title="Privacy & Permissions" />
        <View style={styles.section}>
          <SettingRow
            icon={<Shield size={20} color="#14B8A6" />}
            title="Privacy Policy"
            subtitle="getcoloriq.co/privacy"
            onPress={openPrivacyPolicy}
          />
          <SettingRow
            icon={<Shield size={20} color="#06B6D4" />}
            title="App Permissions"
            subtitle="Camera, photos, Bluetooth"
            onPress={openAppPermissions}
          />
        </View>

        {/* Sign Out */}
        <View style={styles.section}>
          <SettingRow
            icon={<LogOut size={20} color="#EF4444" />}
            title="Sign Out"
            onPress={handleLogout}
            danger
          />
        </View>

        <Text style={styles.version}>COLORiq Mobile v1.0.1</Text>
        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F0F1A' },
  header: { paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#161620' },
  headerTitle: { fontSize: 24, fontWeight: '800', color: '#F5F5F7' },
  scroll: { paddingTop: 12 },

  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#161620',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  profileAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#9333EA',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  profileAvatarText: { fontSize: 18, fontWeight: '800', color: '#FFF' },
  profileInfo: { flex: 1 },
  profileName: { fontSize: 17, fontWeight: '700', color: '#F5F5F7' },
  profileEmail: { fontSize: 13, color: '#A1A1AA', marginTop: 2 },

  sectionHeader: {
    fontSize: 12,
    fontWeight: '700',
    color: '#71717A',
    textTransform: 'uppercase',
    letterSpacing: 1,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 6,
  },

  section: {
    backgroundColor: '#161620',
    marginHorizontal: 16,
    borderRadius: 14,
    overflow: 'hidden',
    marginBottom: 4,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },

  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  settingIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.06)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  settingContent: { flex: 1 },
  settingTitle: { fontSize: 15, fontWeight: '600', color: '#F5F5F7' },
  settingSubtitle: { fontSize: 12, color: '#A1A1AA', marginTop: 1 },
  dangerText: { color: '#EF4444' },

  version: {
    textAlign: 'center',
    fontSize: 12,
    color: '#71717A',
    marginTop: 24,
  },
});
