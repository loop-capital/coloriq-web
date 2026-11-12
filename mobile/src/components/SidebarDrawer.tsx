import React, { useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  ScrollView,
  Animated,
  Pressable,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  LayoutDashboard,
  CirclePlus,
  FlaskConical,
  Monitor,
  ClipboardList,
  Users,
  BookOpen,
  Camera,
  History,
  ImageIcon,
  MessageCircle,
  Package,
  DollarSign,
  Award,
  Settings,
  CreditCard,
  LogOut,
} from 'lucide-react-native';

const COLORS = {
  bg: '#0F0F1A',
  card: '#161620',
  cardBorder: 'rgba(255,255,255,0.06)',
  textPrimary: '#F5F5F7',
  textSecondary: '#A1A1AA',
  textMuted: '#71717A',
  purple: '#9333EA',
  pink: '#EC4899',
  green: '#10B981',
  red: '#EF4444',
};

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const DRAWER_WIDTH = SCREEN_WIDTH * 0.82;

interface NavItem {
  label: string;
  icon: React.ReactNode;
  route: string;
  group: string;
}

interface SidebarDrawerProps {
  visible: boolean;
  onClose: () => void;
  onNavigate: (route: string) => void;
  salonName?: string;
  isConnected?: boolean;
  onLogout?: () => void;
}

// Exact order from web app nav-sidebar.tsx
const navItems: NavItem[] = [
  { label: 'Dashboard', icon: <LayoutDashboard size={18} color={COLORS.textSecondary} />, route: 'Dashboard', group: 'WORKFLOW' },
  { label: 'New Service', icon: <CirclePlus size={18} color={COLORS.textSecondary} />, route: 'NewService', group: 'WORKFLOW' },
  { label: 'Formulate', icon: <FlaskConical size={18} color={COLORS.textSecondary} />, route: 'Formulate', group: 'WORKFLOW' },
  { label: 'Color Bar', icon: <Monitor size={18} color={COLORS.textSecondary} />, route: 'ColorBar', group: 'WORKFLOW' },
  { label: 'Consultation', icon: <ClipboardList size={18} color={COLORS.textSecondary} />, route: 'Consultation', group: 'WORKFLOW' },
  { label: 'Clients', icon: <Users size={18} color={COLORS.textSecondary} />, route: 'Clients', group: 'CLIENTS' },
  { label: 'Library', icon: <BookOpen size={18} color={COLORS.textSecondary} />, route: 'Library', group: 'KNOWLEDGE' },
  { label: 'Analyze', icon: <Camera size={18} color={COLORS.textSecondary} />, route: 'Analyze', group: 'INTELLIGENCE' },
  { label: 'History', icon: <History size={18} color={COLORS.textSecondary} />, route: 'History', group: 'INTELLIGENCE' },
  { label: 'Gallery', icon: <ImageIcon size={18} color={COLORS.textSecondary} />, route: 'Gallery', group: 'KNOWLEDGE' },
  { label: 'Community', icon: <MessageCircle size={18} color={COLORS.textSecondary} />, route: 'Community', group: 'COMMUNITY' },
  { label: 'Inventory', icon: <Package size={18} color={COLORS.textSecondary} />, route: 'Inventory', group: 'BUSINESS' },
  { label: 'Pricing Rules', icon: <DollarSign size={18} color={COLORS.textSecondary} />, route: 'Pricing', group: 'BUSINESS' },
  { label: 'Certification', icon: <Award size={18} color={COLORS.textSecondary} />, route: 'Certification', group: 'BUSINESS' },
  { label: 'Settings', icon: <Settings size={18} color={COLORS.textSecondary} />, route: 'Settings', group: 'ACCOUNT' },
];

const groupLabels: Record<string, string> = {
  WORKFLOW: 'Workflow',
  CLIENTS: 'Clients',
  KNOWLEDGE: 'Knowledge',
  INTELLIGENCE: 'Intelligence',
  COMMUNITY: 'Community',
  BUSINESS: 'Business',
  ACCOUNT: 'Account',
};

const groupOrder = ['WORKFLOW', 'CLIENTS', 'KNOWLEDGE', 'INTELLIGENCE', 'COMMUNITY', 'BUSINESS', 'ACCOUNT'];

export default function SidebarDrawer({
  visible,
  onClose,
  onNavigate,
  salonName = 'Guest',
  isConnected = true,
  onLogout,
}: SidebarDrawerProps) {
  const insets = useSafeAreaInsets();
  const slideAnim = React.useRef(new Animated.Value(-DRAWER_WIDTH)).current;
  const fadeAnim = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 280,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: -DRAWER_WIDTH,
          duration: 220,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 180,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  const handleItemPress = useCallback(
    (route: string) => {
      onNavigate(route);
    },
    [onNavigate]
  );

  if (!visible) return null;

  // Group items in order
  const grouped = groupOrder.reduce((acc, group) => {
    const items = navItems.filter((item) => item.group === group);
    if (items.length > 0) acc[group] = items;
    return acc;
  }, {} as Record<string, NavItem[]>);

  return (
    <View style={StyleSheet.absoluteFillObject}>
      {/* Backdrop */}
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Animated.View style={[styles.backdropFill, { opacity: fadeAnim }]} />
      </Pressable>

      {/* Sidebar Drawer */}
      <Animated.View
        style={[
          styles.drawer,
          {
            width: DRAWER_WIDTH,
            paddingTop: insets.top + 12,
            paddingBottom: insets.bottom + 12,
            transform: [{ translateX: slideAnim }],
          },
        ]}
      >
        {/* Logo Header */}
        <View style={styles.logoSection}>
          <View style={styles.logoBadge}>
            <Text style={styles.logoText}>IQ</Text>
          </View>
          <Text style={styles.logoTitle}>COLORiq</Text>
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Nav Groups */}
          {Object.entries(grouped).map(([group, items]) => (
            <View key={group} style={styles.group}>
              <Text style={styles.groupLabel}>
                {groupLabels[group] || group}
              </Text>
              {items.map((item) => (
                <TouchableOpacity
                  key={item.route}
                  style={styles.item}
                  onPress={() => handleItemPress(item.route)}
                  activeOpacity={0.7}
                >
                  {item.icon}
                  <Text style={styles.itemLabel}>{item.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          ))}

          {/* Divider before footer */}
          <View style={styles.divider} />

          {/* Subscription Link */}
          <TouchableOpacity
            style={styles.item}
            onPress={() => handleItemPress('Subscription')}
            activeOpacity={0.7}
          >
            <CreditCard size={18} color={COLORS.textSecondary} />
            <Text style={styles.itemLabel}>Subscription</Text>
          </TouchableOpacity>

          {/* Identity Block */}
          <View style={styles.identityBlock}>
            <Text style={styles.identityLabel}>{salonName.toUpperCase()}</Text>
            <View style={styles.connectionRow}>
              <View
                style={[
                  styles.connectionDot,
                  { backgroundColor: isConnected ? COLORS.green : COLORS.red },
                ]}
              />
              <Text style={styles.connectionText}>
                {isConnected ? 'Connected' : 'Signed Out'}
              </Text>
            </View>
          </View>

          {/* Logout */}
          <TouchableOpacity
            style={[styles.item, styles.logoutItem]}
            onPress={() => {
              if (onLogout) onLogout();
              onClose();
            }}
            activeOpacity={0.7}
          >
            <LogOut size={18} color={COLORS.red} />
            <Text style={[styles.itemLabel, styles.logoutText]}>Logout</Text>
          </TouchableOpacity>
        </ScrollView>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 998,
  },
  backdropFill: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  drawer: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    backgroundColor: COLORS.bg,
    zIndex: 999,
    borderRightWidth: 1,
    borderRightColor: COLORS.cardBorder,
    shadowColor: '#000',
    shadowOffset: { width: 4, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 20,
  },
  logoSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.cardBorder,
    marginBottom: 8,
  },
  logoBadge: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: COLORS.purple,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  logoTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textPrimary,
    letterSpacing: -0.3,
  },
  scrollContent: {
    paddingHorizontal: 12,
    paddingBottom: 20,
  },
  group: {
    marginBottom: 4,
  },
  groupLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    paddingHorizontal: 4,
    paddingVertical: 8,
    marginTop: 4,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 10,
    marginBottom: 2,
  },
  itemLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.textSecondary,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.cardBorder,
    marginVertical: 12,
    marginHorizontal: 4,
  },
  identityBlock: {
    marginTop: 8,
    marginHorizontal: 4,
    padding: 12,
    backgroundColor: COLORS.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  identityLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 6,
  },
  connectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  connectionDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  connectionText: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  logoutItem: {
    marginTop: 8,
  },
  logoutText: {
    color: COLORS.red,
    fontWeight: '600',
  },
});
