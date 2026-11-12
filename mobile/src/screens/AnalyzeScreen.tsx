import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Camera, ChevronRight, Image as ImageIcon } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { uploadPhoto, analyzePhoto, waitForAnalysis, ensureAuth } from '../api/client';

const COLORS = {
  bg: '#0F0F1A',
  card: '#161620',
  cardBorder: 'rgba(255,255,255,0.06)',
  textPrimary: '#F5F5F7',
  textSecondary: '#A1A1AA',
  textMuted: '#71717A',
  purple: '#9333EA',
};

export default function AnalyzeScreen({ navigation }: any) {
  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const isMounted = useRef(true);

  useEffect(() => {
    ensureAuth();
    return () => { isMounted.current = false; };
  }, []);

  const handleUpload = async (uri: string) => {
    setUploading(true);
    try {
      const token = await ensureAuth();
      if (!token) {
        Alert.alert('Authentication Required', 'Please log in first.');
        return;
      }

      const sessionId = `mobile-${Date.now()}`;
      const uploadResult = await uploadPhoto(uri, sessionId, 'roots');

      if (!uploadResult.data?.id) {
        Alert.alert('Upload Failed', 'Server returned an unexpected response. Please try again.');
        return;
      }

      if (isMounted.current) setAnalyzing(true);
      try {
        await analyzePhoto(uploadResult.data.id);
        const analysis = await waitForAnalysis(uploadResult.data.id, 60000, 3000);
        if (isMounted.current) {
          navigation.navigate('Formulate', { photoId: uploadResult.data.id, analysis });
        }
      } catch (analysisErr: any) {
        console.error('[Analyze] Analysis failed:', analysisErr.message);
        const msg = analysisErr.message?.includes('timed out')
          ? 'Analysis is taking longer than expected.'
          : 'Analysis failed.';
        Alert.alert('Analysis Issue', msg, [
          { text: 'Go Back', style: 'cancel' },
          {
            text: 'Proceed Anyway',
            onPress: () => navigation.navigate('Formulate', {
              photoId: uploadResult.data.id,
              analysis: uploadResult.data,
            }),
          },
        ]);
      } finally {
        if (isMounted.current) setAnalyzing(false);
      }
    } catch (err: any) {
      Alert.alert('Upload Failed', err.message || 'Please try again');
    } finally {
      if (isMounted.current) setUploading(false);
    }
  };

  const pickFromGallery = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Needed', 'COLORiq needs access to your photos to upload hair analysis images.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.85,
      allowsEditing: true,
      aspect: [4, 3],
    });

    if (!result.canceled && result.assets[0]) {
      await handleUpload(result.assets[0].uri);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.header}>
          <Camera size={32} color={COLORS.purple} />
          <Text style={styles.title}>Analyze</Text>
          <Text style={styles.subtitle}>Take or upload a photo for AI assessment</Text>
        </View>

        {(uploading || analyzing) && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color={COLORS.purple} />
            <Text style={styles.loadingText}>
              {analyzing ? 'Analyzing hair color...' : 'Uploading photo...'}
            </Text>
          </View>
        )}

        <TouchableOpacity
          style={styles.card}
          onPress={() => navigation.navigate('Camera')}
          disabled={uploading || analyzing}
        >
          <View style={styles.cardIcon}>
            <Camera size={24} color={COLORS.purple} />
          </View>
          <View style={styles.cardContent}>
            <Text style={styles.cardTitle}>Take Photo</Text>
            <Text style={styles.cardDesc}>Capture hair for color analysis</Text>
          </View>
          <ChevronRight size={20} color={COLORS.textMuted} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.card}
          onPress={pickFromGallery}
          disabled={uploading || analyzing}
        >
          <View style={styles.cardIcon}>
            <ImageIcon size={24} color={COLORS.purple} />
          </View>
          <View style={styles.cardContent}>
            <Text style={styles.cardTitle}>Upload from Gallery</Text>
            <Text style={styles.cardDesc}>Select existing hair photo</Text>
          </View>
          <ChevronRight size={20} color={COLORS.textMuted} />
        </TouchableOpacity>

        <View style={styles.tips}>
          <Text style={styles.tipsTitle}>Photo Tips</Text>
          <Text style={styles.tip}>• Use natural lighting when possible</Text>
          <Text style={styles.tip}>• Show the roots, mid-lengths, and ends separately</Text>
          <Text style={styles.tip}>• Avoid flash — it changes the perceived color</Text>
          <Text style={styles.tip}>• Hold the camera 6-8 inches from the hair</Text>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  scroll: { padding: 20 },
  header: { alignItems: 'center', marginBottom: 28, marginTop: 8 },
  title: { fontSize: 24, fontWeight: '800', color: COLORS.textPrimary, marginTop: 12 },
  subtitle: { fontSize: 14, color: COLORS.textSecondary, marginTop: 6, textAlign: 'center' },
  loadingOverlay: {
    alignItems: 'center', paddingVertical: 24, marginBottom: 16,
    backgroundColor: 'rgba(147,51,234,0.06)', borderRadius: 16,
    borderWidth: 1, borderColor: 'rgba(147,51,234,0.15)',
  },
  loadingText: { color: COLORS.textSecondary, fontSize: 14, marginTop: 12 },
  card: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: COLORS.card, borderRadius: 16, padding: 16,
    marginBottom: 12, borderWidth: 1, borderColor: COLORS.cardBorder,
  },
  cardIcon: {
    width: 48, height: 48, borderRadius: 14,
    backgroundColor: 'rgba(147,51,234,0.1)', justifyContent: 'center', alignItems: 'center',
  },
  cardContent: { flex: 1 },
  cardTitle: { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary },
  cardDesc: { fontSize: 13, color: COLORS.textSecondary, marginTop: 2 },
  tips: {
    backgroundColor: 'rgba(147,51,234,0.06)', borderRadius: 16, padding: 16,
    marginTop: 8, borderWidth: 1, borderColor: 'rgba(147,51,234,0.15)',
  },
  tipsTitle: { fontSize: 14, fontWeight: '700', color: '#A855F7', marginBottom: 8 },
  tip: { fontSize: 13, color: COLORS.textSecondary, lineHeight: 20 },
});
