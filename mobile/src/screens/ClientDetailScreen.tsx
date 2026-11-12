import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  Mail,
  Phone,
  Calendar,
  FlaskConical,
  User,
  Heart,
  ClipboardList,
  Star,
  TrendingUp,
  DollarSign,
  Plus,
  X,
} from 'lucide-react-native';
import { getClientById, getClientFormulas, type Client, type FormulaEntry } from '../api/client';

interface ClientDetailScreenProps {
  navigation: any;
  route: {
    params: {
      clientId: string;
    };
  };
}

export default function ClientDetailScreen({ navigation, route }: ClientDetailScreenProps) {
  const { clientId } = route.params;
  const [client, setClient] = useState<Client | null>(null);
  const [formulas, setFormulas] = useState<FormulaEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadClientData();
  }, [clientId]);

  const loadClientData = async () => {
    try {
      setLoading(true);
      const [clientRes, formulaRes] = await Promise.all([
        getClientById(clientId),
        getClientFormulas(clientId),
      ]);
      setClient(clientRes.client || null);
      setFormulas(formulaRes.formulas || []);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to load client');
    } finally {
      setLoading(false);
    }
  };

  const toggleFavorite = (formulaId: string) => {
    setFavorites(prev => {
      const next = new Set(prev);
      if (next.has(formulaId)) next.delete(formulaId);
      else next.add(formulaId);
      return next;
    });
  };

  const initials = (client?.name || '')
    .split(' ')
    .map((n: string) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#9333EA" />
        </View>
      </SafeAreaView>
    );
  }

  if (!client) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.center}>
          <User size={48} color="#9333EA" />
          <Text style={styles.emptyTitle}>Client not found</Text>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Text style={styles.backBtnText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <ArrowLeft size={22} color="#F5F5F7" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Client Profile</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => navigation.navigate('Consultation', { clientId })}
          >
            <ClipboardList size={16} color="#FFF" />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: '#9333EA' }]}
            onPress={() => navigation.navigate('Formulate', { clientId, clientName: client.name })}
          >
            <FlaskConical size={16} color="#FFF" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {/* Profile Card */}
        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <Text style={styles.name}>{client.name}</Text>

          {/* @ts-ignore — favoriteBrand may be present from API but not in type */}
          {(client as any).favoriteBrand && (
            <View style={styles.favoriteBrand}>
              <Heart size={14} color="#EC4899" />
              <Text style={styles.favoriteBrandText}>Prefers {(client as any).favoriteBrand}</Text>
            </View>
          )}

          <View style={styles.contactSection}>
            {client.email && (
              <View style={styles.contactRow}>
                <Mail size={16} color="#A1A1AA" />
                <Text style={styles.contactText}>{client.email}</Text>
              </View>
            )}
            {client.phone && (
              <View style={styles.contactRow}>
                <Phone size={16} color="#A1A1AA" />
                <Text style={styles.contactText}>{client.phone}</Text>
              </View>
            )}
            <View style={styles.contactRow}>
              <Calendar size={16} color="#A1A1AA" />
              <Text style={styles.contactText}>
                Client since {new Date(client.createdAt).toLocaleDateString()}
              </Text>
            </View>
            {client.lastVisit && (
              <View style={styles.contactRow}>
                <Calendar size={16} color="#A1A1AA" />
                <Text style={styles.contactText}>
                  Last visit {new Date(client.lastVisit).toLocaleDateString()}
                </Text>
              </View>
            )}
          </View>

          {client.notes && (
            <View style={styles.notesSection}>
              <Text style={styles.sectionLabel}>Notes</Text>
              <Text style={styles.notesText}>{client.notes}</Text>
            </View>
          )}
        </View>

        {/* Formulation History */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <FlaskConical size={18} color="#9333EA" />
            <Text style={styles.sectionTitle}>Formulation History</Text>
            <TouchableOpacity
              onPress={() => navigation.navigate('Formulate', { clientId, clientName: client.name })}
            >
              <Text style={styles.newFormulaText}>New Formula</Text>
            </TouchableOpacity>
          </View>

          {formulas.length === 0 ? (
            <View style={styles.emptySection}>
              <FlaskConical size={32} color="#71717A" />
              <Text style={styles.emptyText}>No formulations yet</Text>
              <TouchableOpacity
                style={styles.emptyBtn}
                onPress={() => navigation.navigate('Consultation', { clientId })}
              >
                <Text style={styles.emptyBtnText}>Start Consultation</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.formulaList}>
              {formulas.map((formula) => (
                <TouchableOpacity
                  key={formula.id}
                  style={styles.formulaCard}
                  onPress={() => navigation.navigate('Formulate', { formulaId: formula.id })}
                >
                  <View style={styles.formulaHeader}>
                    <View>
                      <Text style={styles.formulaName}>{formula.name}</Text>
                      <Text style={styles.formulaMeta}>
                        {new Date(formula.createdAt).toLocaleDateString()}
                      </Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => toggleFavorite(formula.id)}
                    >
                      <Star
                        size={18}
                        color={favorites.has(formula.id) ? '#F59E0B' : '#71717A'}
                        fill={favorites.has(formula.id) ? '#F59E0B' : 'none'}
                      />
                    </TouchableOpacity>
                  </View>

                  <Text style={styles.formulaDetails}>
                    {formula.formulation?.brand} {formula.formulation?.line} ·{' '}
                    {formula.formulation?.developerVolume}Vol ·{' '}
                    {formula.formulation?.processingTime}min
                  </Text>

                  <View style={styles.formulaSteps}>
                    {formula.formulation?.steps?.map((step: any, idx: number) => (
                      <View key={idx} style={styles.stepBadge}>
                        <Text style={styles.stepBadgeText}>
                          {step.shadeCode || step.productName} ({step.grams}g)
                        </Text>
                      </View>
                    ))}
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Quick Stats */}
        <View style={styles.statsRow}>
          <View style={[styles.statCard, { backgroundColor: 'rgba(147,51,234,0.08)' }]}>
            <Text style={[styles.statValue, { color: '#9333EA' }]}>{formulas.length}</Text>
            <Text style={styles.statLabel}>Formulas</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: 'rgba(236,72,153,0.08)' }]}>
            <Text style={[styles.statValue, { color: '#EC4899' }]}>{client.conditions?.length || 0}</Text>
            <Text style={styles.statLabel}>Consultations</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: 'rgba(16,185,129,0.08)' }]}>
            <Text style={[styles.statValue, { color: '#10B981' }]}>
              {client.lastVisit
                ? Math.ceil((Date.now() - new Date(client.lastVisit).getTime()) / (1000 * 60 * 60 * 24))
                : '-'}
            </Text>
            <Text style={styles.statLabel}>Days Since Visit</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F0F1A' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  backButton: { padding: 4 },
  headerTitle: { fontSize: 17, fontWeight: '700', color: '#F5F5F7' },
  headerActions: { flexDirection: 'row', gap: 8 },
  actionBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#161620',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, gap: 16 },
  profileCard: {
    backgroundColor: '#161620',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#9333EA',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatarText: { fontSize: 28, fontWeight: '700', color: '#FFF' },
  name: { fontSize: 20, fontWeight: '700', color: '#F5F5F7' },
  favoriteBrand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  favoriteBrandText: { fontSize: 13, color: '#A1A1AA' },
  contactSection: { width: '100%', marginTop: 16, gap: 10 },
  contactRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  contactText: { fontSize: 14, color: '#A1A1AA' },
  notesSection: {
    width: '100%',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#71717A',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  notesText: { fontSize: 14, color: '#A1A1AA', lineHeight: 20 },
  sectionCard: {
    backgroundColor: '#161620',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  sectionTitle: { fontSize: 15, fontWeight: '600', color: '#F5F5F7', flex: 1 },
  formulaList: { gap: 10 },
  formulaCard: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  formulaHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  formulaName: { fontSize: 15, fontWeight: '600', color: '#F5F5F7' },
  formulaMeta: { fontSize: 12, color: '#71717A', marginTop: 2 },
  formulaDetails: { fontSize: 13, color: '#A1A1AA', marginTop: 8 },
  formulaSteps: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 10,
  },
  stepBadge: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  stepBadgeText: { fontSize: 11, color: '#A1A1AA' },
  emptySection: { alignItems: 'center', paddingVertical: 24 },
  emptyText: { fontSize: 14, color: '#71717A', marginTop: 8 },
  emptyBtn: {
    marginTop: 12,
    backgroundColor: '#9333EA',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  emptyBtnText: { fontSize: 14, fontWeight: '600', color: '#FFF' },
  newFormulaText: { fontSize: 13, fontWeight: '600', color: '#9333EA' },
  statsRow: { flexDirection: 'row', gap: 10 },
  statCard: {
    flex: 1,
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
  },
  statValue: { fontSize: 24, fontWeight: '700' },
  statLabel: { fontSize: 11, color: '#71717A', marginTop: 4 },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: '#F5F5F7', marginTop: 12 },
  backBtn: {
    marginTop: 16,
    backgroundColor: '#9333EA',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
  },
  backBtnText: { fontSize: 14, fontWeight: '600', color: '#FFF' },
});
