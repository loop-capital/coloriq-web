import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Camera, Palette, Users, Package, Sparkles, ChevronRight } from 'lucide-react-native';
import { healthCheck, getTrendingGallery, getProducts } from '../api/client';

interface QuickActionProps {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  onPress: () => void;
}

function QuickAction({ icon, title, subtitle, onPress }: QuickActionProps) {
  return (
    <TouchableOpacity style={styles.quickAction} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.quickActionIcon}>{icon}</View>
      <View style={styles.quickActionContent}>
        <Text style={styles.quickActionTitle}>{title}</Text>
        <Text style={styles.quickActionSubtitle}>{subtitle}</Text>
      </View>
      <ChevronRight size={20} color="#71717A" />
    </TouchableOpacity>
  );
}

export default function HomeScreen({ navigation }: any) {
  const [apiStatus, setApiStatus] = useState<'checking' | 'connected' | 'offline'>('checking');
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({ formulations: 0, clients: 0, products: 0 });

  useEffect(() => {
    checkConnection();
  }, []);

  const checkConnection = async () => {
    try {
      await healthCheck();
      setApiStatus('connected');
      // Load quick stats
      try {
        const [prods] = await Promise.all([getProducts()]);
        setStats(s => ({ ...s, products: prods.products?.length || 0 }));
      } catch {}
    } catch {
      setApiStatus('offline');
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await checkConnection();
    setRefreshing(false);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Welcome to</Text>
            <Text style={styles.title}>COLORiq</Text>
          </View>
          <View style={[styles.statusBadge, apiStatus === 'connected' ? styles.statusOnline : styles.statusOffline]}>
            <View style={[styles.statusDot, apiStatus === 'connected' ? styles.dotOnline : styles.dotOffline]} />
            <Text style={styles.statusText}>
              {apiStatus === 'checking' ? 'Connecting...' : apiStatus === 'connected' ? 'Online' : 'Offline'}
            </Text>
          </View>
        </View>

        {/* Hero Card */}
        <TouchableOpacity style={styles.heroCard} onPress={() => navigation.navigate('NewService')}>
          <View style={styles.heroGradient}>
            <Sparkles size={32} color="#F5F5F7" />
            <Text style={styles.heroTitle}>New Formulation</Text>
            <Text style={styles.heroSubtitle}>
              Capture photos, analyze hair, and generate professional color formulations
            </Text>
            <View style={styles.heroButton}>
              <Text style={styles.heroButtonText}>Start Formulating</Text>
              <ChevronRight size={18} color="#7C3AED" />
            </View>
          </View>
        </TouchableOpacity>

        {/* Quick Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{stats.products}</Text>
            <Text style={styles.statLabel}>Shades</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>21</Text>
            <Text style={styles.statLabel}>Brands</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>3,454+</Text>
            <Text style={styles.statLabel}>Database</Text>
          </View>
        </View>

        {/* Quick Actions */}
        <Text style={styles.sectionTitle}>Quick Actions</Text>

        <QuickAction
          icon={<Camera size={24} color="#7C3AED" />}
          title="Take Photo"
          subtitle="Capture hair for analysis"
          onPress={() => navigation.navigate('Camera')}
        />
        <QuickAction
          icon={<Palette size={24} color="#EC4899" />}
          title="Browse Shades"
          subtitle="3,454+ shades across 21 brands"
          onPress={() => navigation.navigate('Formulate')}
        />
        <QuickAction
          icon={<Users size={24} color="#F59E0B" />}
          title="Manage Clients"
          subtitle="View history and formulations"
          onPress={() => navigation.navigate('Clients')}
        />
        <QuickAction
          icon={<Package size={24} color="#10B981" />}
          title="Community"
          subtitle="Trending formulas and gallery"
          onPress={() => navigation.navigate('Community')}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F0F1A' },
  scroll: { padding: 16, paddingBottom: 32 },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  greeting: { fontSize: 14, color: '#A1A1AA' },
  title: { fontSize: 28, fontWeight: '800', color: '#F5F5F7', marginTop: 2 },

  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  statusOnline: { backgroundColor: 'rgba(16,185,129,0.15)' },
  statusOffline: { backgroundColor: 'rgba(239,68,68,0.15)' },
  statusDot: { width: 8, height: 8, borderRadius: 4, marginRight: 6 },
  dotOnline: { backgroundColor: '#10B981' },
  dotOffline: { backgroundColor: '#EF4444' },
  statusText: { fontSize: 12, fontWeight: '600', color: '#F5F5F7' },

  heroCard: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 20,
    shadowColor: '#9333EA',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 6,
  },
  heroGradient: {
    backgroundColor: '#9333EA',
    padding: 24,
    alignItems: 'flex-start',
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#F5F5F7',
    marginTop: 12,
  },
  heroSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 8,
    lineHeight: 20,
  },
  heroButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#161620',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 24,
    marginTop: 16,
  },
  heroButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#9333EA',
    marginRight: 4,
  },

  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#161620',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  statNumber: { fontSize: 20, fontWeight: '800', color: '#9333EA' },
  statLabel: { fontSize: 12, color: '#A1A1AA', marginTop: 4 },

  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#F5F5F7',
    marginBottom: 12,
  },

  quickAction: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#161620',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  quickActionIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.06)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  quickActionContent: { flex: 1 },
  quickActionTitle: { fontSize: 15, fontWeight: '600', color: '#F5F5F7' },
  quickActionSubtitle: { fontSize: 12, color: '#A1A1AA', marginTop: 2 },
});
