import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  User,
  Bell,
  Bluetooth,
  Palette,
  Shield,
  CircleHelp,
  LogOut,
  ChevronRight,
  Wifi,
  Smartphone,
} from 'lucide-react-native';
import { getSettings, saveNotifications, saveAutoSync, getDefaultBrand, getAccount } from '../api/client';
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
  const [defaultBrand, setDefaultBrand] = useState('Wella');
  const [loadingSettings, setLoadingSettings] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const settings = await getSettings();
        setNotifications(settings.notifications);
        setAutoSync(settings.autoSync);
        const brand = await getDefaultBrand();
        if (brand) setDefaultBrand(brand);
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

        {/* Devices */}
        <SectionHeader title="Devices & BLE" />
        <View style={styles.section}>
          <SettingRow
            icon={<Bluetooth size={20} color="#3B82F6" />}
            title="Bluetooth Devices"
            subtitle="Acaia scales, sensors"
            onPress={() => Alert.alert('Coming Soon', 'Bluetooth devices — coming in next update!')}
          />
          <SettingRow
            icon={<Smartphone size={20} color="#EC4899" />}
            title="Connected Devices"
            subtitle="Manage paired devices"
            onPress={() => Alert.alert('Coming Soon', 'Connected devices — coming in next update!')}
          />
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

        {/* Formulation */}
        <SectionHeader title="Formulation" />
        <View style={styles.section}>
          <SettingRow
            icon={<Palette size={20} color="#EC4899" />}
            title="Default Brand"
            subtitle="Wella"
            onPress={() => Alert.alert('Coming Soon', 'Default brand picker — coming in next update!')}
          />
          <SettingRow
            icon={<Palette size={20} color="#F97316" />}
            title="Shade Database"
            subtitle="3,454 shades - 21 brands"
            onPress={() => Alert.alert('Coming Soon', 'Shade database browser — coming in next update!')}
          />
        </View>

        {/* Security */}
        <SectionHeader title="Security" />
        <View style={styles.section}>
          <SettingRow
            icon={<Shield size={20} color="#14B8A6" />}
            title="Privacy & Data"
            onPress={() => Alert.alert('Coming Soon', 'Privacy settings — coming in next update!')}
          />
          <SettingRow
            icon={<Shield size={20} color="#06B6D4" />}
            title="App Permissions"
            onPress={() => Alert.alert('Coming Soon', 'App permissions — coming in next update!')}
          />
        </View>

        {/* Support */}
        <SectionHeader title="Support" />
        <View style={styles.section}>
          <SettingRow
            icon={<CircleHelp size={20} color="#71717A" />}
            title="Help Center"
            subtitle="colorgenius.co/help"
            onPress={() => Alert.alert('Coming Soon', 'Help center — coming in next update!')}
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
