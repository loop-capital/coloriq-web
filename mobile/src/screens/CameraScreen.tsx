import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { X, RotateCcw, Image as ImageIcon, Zap, Camera } from 'lucide-react-native';
import { uploadPhoto, analyzePhoto, waitForAnalysis, ensureAuth } from '../api/client';

export default function CameraScreen({ navigation }: any) {
  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState<CameraType>('back');
  const [capturedUri, setCapturedUri] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [angle, setAngle] = useState<'roots' | 'mid' | 'ends'>('roots');
  const [authReady, setAuthReady] = useState(false);
  const cameraRef = useRef<CameraView>(null);
  const isMounted = useRef(true);

  useEffect(() => {
    (async () => {
      const token = await ensureAuth();
      if (isMounted.current) setAuthReady(!!token);
    })();
    return () => { isMounted.current = false; };
  }, []);

  if (!permission) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#7C3AED" />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <Camera size={64} color="#7C3AED" />
          <Text style={styles.permissionTitle}>Camera Access Needed</Text>
          <Text style={styles.permissionText}>
            COLORiq needs camera access to capture hair photos for color analysis.
          </Text>
          <TouchableOpacity style={styles.permissionBtn} onPress={requestPermission}>
            <Text style={styles.permissionBtnText}>Grant Permission</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Text style={styles.backBtnText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const takePhoto = async () => {
    if (!cameraRef.current) return;
    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.85,
        base64: false,
      });
      if (photo?.uri) {
        setCapturedUri(photo.uri);
      }
    } catch (err) {
      Alert.alert('Error', 'Failed to capture photo');
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
      setCapturedUri(result.assets[0].uri);
    }
  };

  const handleUpload = async () => {
    if (!capturedUri) return;

    // Gate on auth — fail fast if not ready
    if (!authReady) {
      const token = await ensureAuth();
      if (!token) {
        Alert.alert('Authentication Required', 'Unable to log in. Check your internet connection and try again.');
        return;
      }
      setAuthReady(true);
    }

    setUploading(true);
    try {
      const sessionId = `mobile-${Date.now()}`;
      const uploadResult = await uploadPhoto(capturedUri, sessionId, angle);

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
        console.error('[Camera] Analysis failed:', analysisErr.message);
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

  // Preview mode
  if (capturedUri) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.previewContainer}>
          <Image source={{ uri: capturedUri }} style={styles.previewImage} />

          {/* Angle selector */}
          <View style={styles.angleRow}>
            {(['roots', 'mid', 'ends'] as const).map((a) => (
              <TouchableOpacity
                key={a}
                style={[styles.angleBtn, angle === a && styles.angleBtnActive]}
                onPress={() => setAngle(a)}
              >
                <Text style={[styles.angleText, angle === a && styles.angleTextActive]}>
                  {a.charAt(0).toUpperCase() + a.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Action buttons */}
          <View style={styles.previewActions}>
            <TouchableOpacity
              style={styles.retakeBtn}
              onPress={() => setCapturedUri(null)}
              disabled={uploading || analyzing}
            >
              <RotateCcw size={20} color="#FFF" />
              <Text style={styles.retakeText}>Retake</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.uploadBtn, (uploading || analyzing) && styles.uploadBtnDisabled]}
              onPress={handleUpload}
              disabled={uploading || analyzing}
            >
              {(uploading || analyzing) ? (
                <View style={{ alignItems: 'center' }}>
                  <ActivityIndicator color="#FFF" size="small" />
                  <Text style={styles.uploadText}>
                    {analyzing ? 'Analyzing...' : uploading ? 'Uploading...' : ''}
                  </Text>
                </View>
              ) : (
                <>
                  <Zap size={20} color="#FFF" />
                  <Text style={styles.uploadText}>Upload & Analyze</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // Camera mode
  return (
    <View style={styles.container}>
      <CameraView
        ref={cameraRef}
        style={StyleSheet.absoluteFill}
        facing={facing}
      />

      {/* Top bar */}
      <SafeAreaView edges={['top']} style={styles.topBar}>
        <TouchableOpacity style={styles.closeBtn} onPress={() => navigation.goBack()}>
          <X size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.topTitle}>Capture Hair</Text>
        <TouchableOpacity
          style={styles.flipBtn}
          onPress={() => setFacing(facing === 'back' ? 'front' : 'back')}
        >
          <RotateCcw size={22} color="#FFF" />
        </TouchableOpacity>
      </SafeAreaView>

      {/* Angle guide */}
      <View style={styles.angleGuide}>
        <Text style={styles.angleGuideText}>
          Capture {angle === 'roots' ? 'the roots' : angle === 'mid' ? 'the mid-lengths' : 'the ends'} of the hair
        </Text>
        <View style={styles.angleRow}>
          {(['roots', 'mid', 'ends'] as const).map((a) => (
            <TouchableOpacity
              key={a}
              style={[styles.angleBtnCamera, angle === a && styles.angleBtnCameraActive]}
              onPress={() => setAngle(a)}
            >
              <Text style={[styles.angleTextCamera, angle === a && styles.angleTextCameraActive]}>
                {a.charAt(0).toUpperCase() + a.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Bottom controls */}
      <View style={styles.bottomBar}>
        <TouchableOpacity style={styles.galleryBtn} onPress={pickFromGallery}>
          <ImageIcon size={28} color="#FFF" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.shutterBtn} onPress={takePhoto}>
          <View style={styles.shutterInner} />
        </TouchableOpacity>

        <View style={{ width: 60 }} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  permissionTitle: { fontSize: 22, fontWeight: '700', color: '#F5F5F7', marginTop: 16, textAlign: 'center' },
  permissionText: { fontSize: 14, color: '#A1A1AA', textAlign: 'center', marginTop: 8, lineHeight: 20 },
  permissionBtn: { backgroundColor: '#9333EA', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 24, marginTop: 20 },
  permissionBtnText: { color: '#FFF', fontWeight: '700', fontSize: 15 },
  backBtn: { marginTop: 12 },
  backBtnText: { color: '#9333EA', fontWeight: '600', fontSize: 14 },
  topBar: { position: 'absolute', top: 0, left: 0, right: 0, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingTop: 8 },
  closeBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' },
  topTitle: { fontSize: 16, fontWeight: '700', color: '#FFF' },
  flipBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' },
  angleGuide: { position: 'absolute', top: '35%', left: 0, right: 0, alignItems: 'center' },
  angleGuideText: { color: '#FFF', fontSize: 15, fontWeight: '600', backgroundColor: 'rgba(0,0,0,0.5)', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, overflow: 'hidden', marginBottom: 12 },
  angleRow: { flexDirection: 'row', gap: 8 },
  angleBtnCamera: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 16, backgroundColor: 'rgba(0,0,0,0.4)', borderWidth: 1.5, borderColor: 'transparent' },
  angleBtnCameraActive: { borderColor: '#7C3AED', backgroundColor: 'rgba(124, 58, 237, 0.6)' },
  angleTextCamera: { color: 'rgba(255,255,255,0.7)', fontSize: 12, fontWeight: '600' },
  angleTextCameraActive: { color: '#FFF' },
  bottomBar: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingBottom: 40, paddingTop: 20, flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.3)' },
  galleryBtn: { width: 50, height: 50, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  shutterBtn: { width: 76, height: 76, borderRadius: 38, backgroundColor: 'rgba(255,255,255,0.3)', justifyContent: 'center', alignItems: 'center', borderWidth: 4, borderColor: '#FFF' },
  shutterInner: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#F5F5F7' },
  angleBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.15)', borderWidth: 1.5, borderColor: 'transparent' },
  angleBtnActive: { borderColor: '#7C3AED', backgroundColor: 'rgba(124, 58, 237, 0.4)' },
  angleText: { color: 'rgba(255,255,255,0.6)', fontSize: 13, fontWeight: '600' },
  angleTextActive: { color: '#FFF' },
  previewContainer: { flex: 1, backgroundColor: '#000' },
  previewImage: { flex: 1, resizeMode: 'contain' },
  previewActions: { flexDirection: 'row', gap: 12, padding: 16, paddingBottom: 40 },
  retakeBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 20, paddingVertical: 14, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.2)' },
  retakeText: { color: '#FFF', fontWeight: '600', fontSize: 14 },
  uploadBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#7C3AED', borderRadius: 12, paddingVertical: 14 },
  uploadBtnDisabled: { opacity: 0.6 },
  uploadText: { color: '#FFF', fontWeight: '700', fontSize: 15 },
});
