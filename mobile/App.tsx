import React, { useState, useCallback, useEffect, createContext, useContext } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { NavigationContainer, createNavigationContainerRef } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { getAuthToken, clearAuthToken, setUnauthorizedHandler } from './src/api/client';
import { Menu } from 'lucide-react-native';

import DashboardScreen from './src/screens/DashboardScreen';
import FormulateScreen from './src/screens/FormulateScreen';
import NewServiceScreen from './src/screens/NewServiceScreen';
import ClientsScreen from './src/screens/ClientsScreen';
import QuestionnaireScreen from './src/screens/QuestionnaireScreen';
import LibraryScreen from './src/screens/LibraryScreen';
import AnalyzeScreen from './src/screens/AnalyzeScreen';
import HistoryScreen from './src/screens/HistoryScreen';
import GalleryScreen from './src/screens/GalleryScreen';
import GalleryUploadScreen from './src/screens/GalleryUploadScreen';
import ClientDetailScreen from './src/screens/ClientDetailScreen';
import ColorBarScreen from './src/screens/ColorBarScreen';
import ClientCollectionScreen from './src/screens/ClientCollectionScreen';
import CommunityScreen from './src/screens/CommunityScreen';
import InventoryScreen from './src/screens/InventoryScreen';
import PricingScreen from './src/screens/PricingScreen';
import CertificationScreen from './src/screens/CertificationScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import SubscriptionScreen from './src/screens/SubscriptionScreen';
import CameraScreen from './src/screens/CameraScreen';

import SidebarDrawer from './src/components/SidebarDrawer';
import LoginScreen from './src/screens/LoginScreen';

// ─── Theme Tokens ─────────────────────────────────────────────────────────────
const THEME = {
  bgPrimary: '#0F0F1A',
  textPrimary: '#F5F5F7',
  textSecondary: '#A1A1AA',
  surfaceElevated: '#161620',
  borderSubtle: 'rgba(255,255,255,0.06)',
  accent: '#9333EA',
} as const;

// ─── Type Definitions ─────────────────────────────────────────────────────────
export type RootStackParamList = {
  Dashboard: undefined;
  NewService: undefined;
  Formulate: { initialStep?: number; autoPopulateData?: Record<string, any>; clientId?: string; clientName?: string } | undefined;
  Consultation: undefined;
  Clients: undefined;
  Library: undefined;
  Analyze: undefined;
  History: undefined;
  Gallery: undefined;
  GalleryUpload: undefined;
  ClientDetail: { clientId: string };
  ClientCollection: undefined;
  Community: undefined;
  Inventory: undefined;
  Pricing: undefined;
  Certification: undefined;
  Settings: undefined;
  Subscription: undefined;
  Camera: undefined;
  ColorBar: undefined;
};

// ─── Navigators ───────────────────────────────────────────────────────────────
const Stack = createStackNavigator<RootStackParamList>();

// ─── Navigation ref (safe to call outside Navigator) ─────────────────────────
const navigationRef = createNavigationContainerRef<RootStackParamList>();

// ─── Drawer context (avoids prop-drilling through wrapScreen) ─────────────────
const DrawerContext = createContext<() => void>(() => {});

// ─── Auth context (lets any screen trigger logout → login screen) ─────────────
export const AuthContext = createContext<{ logout: () => Promise<void> }>({
  logout: async () => {},
});

// ─── Custom Header ────────────────────────────────────────────────────────────
function CustomHeader() {
  const onOpenDrawer = useContext(DrawerContext);
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
      <View style={styles.headerLeft}>
        <TouchableOpacity
          style={styles.hamburgerBtn}
          onPress={onOpenDrawer}
          activeOpacity={0.7}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Menu size={22} color={THEME.textSecondary} />
        </TouchableOpacity>
        <View style={styles.logoBadge}>
          <Text style={styles.logoText}>IQ</Text>
        </View>
        <Text style={styles.headerTitle}>COLORiq</Text>
      </View>
    </View>
  );
}

// ─── Screen Wrapper ───────────────────────────────────────────────────────────
function ScreenWithHeader({ children }: { children: React.ReactNode }) {
  return (
    <View style={styles.screenContainer}>
      <CustomHeader />
      <View style={styles.screenContent}>{children}</View>
    </View>
  );
}

// ─── Wrapped Screens (module-level — prevents remount on every drawer toggle) ──
function WrappedDashboard(props: any) { return <ScreenWithHeader><DashboardScreen {...props} /></ScreenWithHeader>; }
function WrappedNewService(props: any) { return <ScreenWithHeader><NewServiceScreen {...props} /></ScreenWithHeader>; }
function WrappedFormulate(props: any) { return <ScreenWithHeader><FormulateScreen {...props} /></ScreenWithHeader>; }
function WrappedConsultation(props: any) { return <ScreenWithHeader><QuestionnaireScreen {...props} /></ScreenWithHeader>; }
function WrappedClients(props: any) { return <ScreenWithHeader><ClientsScreen {...props} /></ScreenWithHeader>; }
function WrappedLibrary(props: any) { return <ScreenWithHeader><LibraryScreen {...props} /></ScreenWithHeader>; }
function WrappedAnalyze(props: any) { return <ScreenWithHeader><AnalyzeScreen {...props} /></ScreenWithHeader>; }
function WrappedHistory(props: any) { return <ScreenWithHeader><HistoryScreen {...props} /></ScreenWithHeader>; }
function WrappedGallery(props: any) { return <ScreenWithHeader><GalleryScreen {...props} /></ScreenWithHeader>; }
function WrappedGalleryUpload(props: any) { return <ScreenWithHeader><GalleryUploadScreen {...props} /></ScreenWithHeader>; }
function WrappedClientDetail(props: any) { return <ScreenWithHeader><ClientDetailScreen {...props} /></ScreenWithHeader>; }
function WrappedClientCollection(props: any) { return <ScreenWithHeader><ClientCollectionScreen {...props} /></ScreenWithHeader>; }
function WrappedCommunity(props: any) { return <ScreenWithHeader><CommunityScreen {...props} /></ScreenWithHeader>; }
function WrappedInventory(props: any) { return <ScreenWithHeader><InventoryScreen {...props} /></ScreenWithHeader>; }
function WrappedPricing(props: any) { return <ScreenWithHeader><PricingScreen {...props} /></ScreenWithHeader>; }
function WrappedCertification(props: any) { return <ScreenWithHeader><CertificationScreen {...props} /></ScreenWithHeader>; }
function WrappedSettings(props: any) { return <ScreenWithHeader><SettingsScreen {...props} /></ScreenWithHeader>; }
function WrappedSubscription(props: any) { return <ScreenWithHeader><SubscriptionScreen {...props} /></ScreenWithHeader>; }
function WrappedColorBar(props: any) { return <ColorBarScreen {...props} />; }
function WrappedCamera(props: any) { return <ScreenWithHeader><CameraScreen {...props} /></ScreenWithHeader>; }

// ─── Root App ─────────────────────────────────────────────────────────────────
function AppContent() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [drawerVisible, setDrawerVisible] = useState(false);

  // Check auth on mount
  useEffect(() => {
    checkAuth();
  }, []);

  // Any API call that gets a 401 (dead/invalid token — e.g. a server-side
  // JWT_SECRET rotation) clears the token and flips back to the login
  // screen here, instead of leaving the user stuck on whatever screen they
  // were on with a generic error and no way back in.
  useEffect(() => {
    setUnauthorizedHandler(() => setIsAuthenticated(false));
    return () => setUnauthorizedHandler(null);
  }, []);

  async function checkAuth() {
    try {
      const token = await getAuthToken();
      setIsAuthenticated(!!token);
    } catch {
      setIsAuthenticated(false);
    }
  }

  const openDrawer = useCallback(() => setDrawerVisible(true), []);

  const handleLogout = useCallback(async () => {
    await clearAuthToken();
    setIsAuthenticated(false);
  }, []);

  const handleNavigate = useCallback((route: string) => {
    setDrawerVisible(false);
    setTimeout(() => {
      if (navigationRef.isReady()) {
        // Type-safe navigation via dispatch to avoid strict type mismatch
        (navigationRef as any).navigate(route);
      }
    }, 100);
  }, []);

  // Re-check auth whenever any screen gains focus (catches logout)
  useEffect(() => {
    if (!navigationRef.isReady()) return;
    const unsub = (navigationRef as any).addListener('state', () => {
      checkAuth();
    });
    return unsub;
  }, []);

  // Loading while checking auth
  if (isAuthenticated === null) {
    return (
      <View style={[styles.screenContainer, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={THEME.accent} />
      </View>
    );
  }

  // Not authenticated — show login screen
  if (!isAuthenticated) {
    return <LoginScreen onLoginSuccess={() => setIsAuthenticated(true)} />;
  }

  // Authenticated — show app
  return (
    <AuthContext.Provider value={{ logout: handleLogout }}>
    <DrawerContext.Provider value={openDrawer}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Dashboard" component={WrappedDashboard} />
        <Stack.Screen name="NewService" component={WrappedNewService} />
        <Stack.Screen name="Formulate" component={WrappedFormulate} />
        <Stack.Screen name="Consultation" component={WrappedConsultation} />
        <Stack.Screen name="Clients" component={WrappedClients} />
        <Stack.Screen name="Library" component={WrappedLibrary} />
        <Stack.Screen name="Analyze" component={WrappedAnalyze} />
        <Stack.Screen name="History" component={WrappedHistory} />
        <Stack.Screen name="Gallery" component={WrappedGallery} />
        <Stack.Screen name="GalleryUpload" component={WrappedGalleryUpload} />
        <Stack.Screen name="ClientCollection" component={WrappedClientCollection} />
        <Stack.Screen name="ClientDetail" component={WrappedClientDetail} />
        <Stack.Screen name="Community" component={WrappedCommunity} />
        <Stack.Screen name="Inventory" component={WrappedInventory} />
        <Stack.Screen name="Pricing" component={WrappedPricing} />
        <Stack.Screen name="Certification" component={WrappedCertification} />
        <Stack.Screen name="Settings" component={WrappedSettings} />
        <Stack.Screen name="Subscription" component={WrappedSubscription} />
        <Stack.Screen name="ColorBar" component={WrappedColorBar} />
        <Stack.Screen name="Camera" component={WrappedCamera} />
      </Stack.Navigator>

      <SidebarDrawer
        visible={drawerVisible}
        onClose={() => setDrawerVisible(false)}
        onNavigate={handleNavigate}
        onLogout={handleLogout}
      />
    </DrawerContext.Provider>
    </AuthContext.Provider>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <NavigationContainer ref={navigationRef}>
        <StatusBar style="light" />
        <AppContent />
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  screenContainer: {
    flex: 1,
    backgroundColor: THEME.bgPrimary,
  },
  screenContent: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'rgba(15,15,26,0.95)',
    borderBottomWidth: 1,
    borderBottomColor: THEME.borderSubtle,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  hamburgerBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: THEME.surfaceElevated,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoBadge: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: THEME.accent,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: THEME.textPrimary,
    letterSpacing: -0.3,
  },
});
