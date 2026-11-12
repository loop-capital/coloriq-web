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
import { Award, ChevronRight } from 'lucide-react-native';

const COLORS = {
  bg: '#0F0F1A',
  card: '#161620',
  cardBorder: 'rgba(255,255,255,0.06)',
  textPrimary: '#F5F5F7',
  textSecondary: '#A1A1AA',
  textMuted: '#71717A',
  purple: '#9333EA',
};

export default function CertificationScreen({ navigation }: any) {
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.header}>
          <Award size={32} color={COLORS.purple} />
          <Text style={styles.title}>Certification</Text>
          <Text style={styles.subtitle}>COLORiq certification program</Text>
        </View>

        <TouchableOpacity style={styles.card} onPress={() => Alert.alert('Coming Soon', 'Level 1 Foundations — coming in next update!')}>
          <Text style={styles.cardTitle}>Level 1: Foundations</Text>
          <Text style={styles.cardDesc}>Color theory basics</Text>
          <ChevronRight size={20} color={COLORS.textMuted} style={styles.cardArrow} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.card} onPress={() => Alert.alert('Coming Soon', 'Level 2 Formulation — coming in next update!')}>
          <Text style={styles.cardTitle}>Level 2: Formulation</Text>
          <Text style={styles.cardDesc}>Advanced color formulation</Text>
          <ChevronRight size={20} color={COLORS.textMuted} style={styles.cardArrow} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.card} onPress={() => Alert.alert('Coming Soon', 'Level 3 Mastery — coming in next update!')}>
          <Text style={styles.cardTitle}>Level 3: Mastery</Text>
          <Text style={styles.cardDesc}>Expert-level certification</Text>
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
