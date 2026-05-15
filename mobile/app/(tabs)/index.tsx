import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ActivityIndicator, Alert } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function QuickCaptureScreen() {
  const router = useRouter();
  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState<'back' | 'front'>('back');
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const cameraRef = useRef<CameraView>(null);

  useEffect(() => {
    processQueue();
  }, []);

  const processQueue = async () => {
    try {
      const existingQueue = await AsyncStorage.getItem('upload_queue');
      if (!existingQueue) return;
      
      const queue = JSON.parse(existingQueue);
      if (queue.length === 0) return;

      setSyncing(true);
      console.log(`Processing ${queue.length} queued items...`);
      
      const remainingQueue = [];
      let successCount = 0;

      for (const item of queue) {
        const success = await tryUpload(item.uri);
        if (success) {
          successCount++;
        } else {
          remainingQueue.push(item);
        }
      }

      await AsyncStorage.setItem('upload_queue', JSON.stringify(remainingQueue));
      
      if (successCount > 0) {
        Alert.alert('Sync Complete', `Successfully synced ${successCount} offline receipts!`);
      }
    } catch (err) {
      console.error('Failed to process queue:', err);
    } finally {
      setSyncing(false);
    }
  };

  const tryUpload = async (uri: string) => {
    const formData = new FormData();
    formData.append('from', 'Mobile App (Offline Sync)');
    formData.append('subject', 'Receipt from Mobile');
    
    const filename = uri.split('/').pop() || 'photo.jpg';
    const match = /\.(\w+)$/.exec(filename);
    const type = match ? `image/${match[1]}` : `image/jpeg`;
    
    formData.append('file', {
      uri,
      name: filename,
      type,
    } as any);

    try {
      const res = await fetch('http://192.168.1.9:5000/api/webhooks/email', {
        method: 'POST',
        body: formData,
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return res.ok;
    } catch (err) {
      return false;
    }
  };

  if (!permission) {
    return <View />;
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <Text style={styles.message}>We need your permission to show the camera</Text>
        <TouchableOpacity onPress={requestPermission} style={styles.button}>
          <Text style={styles.text}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const takePhoto = async () => {
    if (!cameraRef.current) return;
    
    setLoading(true);
    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.5,
        base64: false,
      });
      
      if (photo && photo.uri) {
        await uploadImage(photo.uri);
      }
    } catch (err) {
      console.error('Failed to take photo:', err);
      Alert.alert('Error', 'Failed to take photo.');
    } finally {
      setLoading(false);
    }
  };

  const uploadImage = async (uri: string) => {
    const formData = new FormData();
    formData.append('from', 'Mobile App');
    formData.append('subject', 'Receipt from Mobile');
    
    const filename = uri.split('/').pop() || 'photo.jpg';
    const match = /\.(\w+)$/.exec(filename);
    const type = match ? `image/${match[1]}` : `image/jpeg`;
    
    formData.append('file', {
      uri,
      name: filename,
      type,
    } as any);

    try {
      const res = await fetch('http://192.168.1.9:5000/api/webhooks/email', {
        method: 'POST',
        body: formData,
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      if (res.ok) {
        Alert.alert('Success', 'Receipt uploaded and sent for review!');
        router.push('/review');
      } else {
        throw new Error('Upload failed');
      }
    } catch (err) {
      console.log('Upload failed or offline, queueing item:', err);
      await queueItem(uri);
      Alert.alert('Offline Mode', 'You seem to be offline. Your receipt has been saved locally and will sync automatically when connection restores!');
      router.push('/review');
    }
  };

  const queueItem = async (uri: string) => {
    try {
      const existingQueue = await AsyncStorage.getItem('upload_queue');
      const queue = existingQueue ? JSON.parse(existingQueue) : [];
      queue.push({ uri, timestamp: new Date().toISOString() });
      await AsyncStorage.setItem('upload_queue', JSON.stringify(queue));
    } catch (err) {
      console.error('Failed to queue item:', err);
    }
  };

  return (
    <View style={styles.container}>
      <CameraView style={styles.camera} facing={facing} ref={cameraRef}>
        {/* Overlay */}
        <View style={styles.overlay}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity style={styles.iconButton} onPress={() => router.replace('/ledger')}>
              <MaterialCommunityIcons name="close" size={24} color="white" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Quick Capture</Text>
            <TouchableOpacity style={styles.iconButton} onPress={() => setFacing(current => (current === 'back' ? 'front' : 'back'))}>
              <MaterialCommunityIcons name="camera-flip" size={24} color="white" />
            </TouchableOpacity>
          </View>

          {/* AI Chip */}
          <View style={styles.chipContainer}>
            <View style={styles.aiChip}>
              <MaterialCommunityIcons name={syncing ? "sync" : "auto-fix"} size={14} color="#0058be" />
              <Text style={styles.aiChipText}>{syncing ? "SYNCING QUEUE..." : "AUTO-DETECTING"}</Text>
            </View>
          </View>

          {/* Viewfinder */}
          <View style={styles.viewfinderContainer}>
            <View style={styles.viewfinder}>
              {/* Corners */}
              <View style={[styles.corner, styles.topLeft]} />
              <View style={[styles.corner, styles.topRight]} />
              <View style={[styles.corner, styles.bottomLeft]} />
              <View style={[styles.corner, styles.bottomRight]} />
              
              <View style={styles.chip}>
                <Text style={styles.chipText}>Position Receipt Within Frame</Text>
              </View>

              {(loading || syncing) && (
                <View style={styles.loadingOverlay}>
                  <ActivityIndicator size="large" color="#0058be" />
                  <Text style={{ color: 'white', marginTop: 10 }}>{syncing ? "Syncing..." : "Uploading..."}</Text>
                </View>
              )}
            </View>
          </View>

          {/* Bottom Controls */}
          <View style={styles.footer}>
            <View style={styles.controlsRow}>
              {/* Gallery */}
              <TouchableOpacity style={styles.bottomButton} onPress={() => Alert.alert('Gallery', 'Gallery picker requires additional permissions. Use the camera for now!')}>
                <View style={styles.iconBg}>
                  <MaterialCommunityIcons name="image-multiple" size={24} color="white" />
                </View>
                <Text style={styles.buttonLabel}>Gallery</Text>
              </TouchableOpacity>

              {/* Shutter */}
              <TouchableOpacity style={styles.shutterButton} onPress={takePhoto} disabled={loading || syncing}>
                <View style={[styles.shutterInner, (loading || syncing) && { backgroundColor: '#ccc' }]} />
              </TouchableOpacity>

              {/* Mode */}
              <TouchableOpacity style={styles.bottomButton} onPress={processQueue}>
                <View style={styles.iconBg}>
                  <MaterialCommunityIcons name="sync" size={24} color="white" />
                </View>
                <Text style={styles.buttonLabel}>Force Sync</Text>
              </TouchableOpacity>
            </View>

            {/* Preview */}
            <TouchableOpacity style={styles.previewContainer} onPress={() => router.push('/review')}>
              <View style={styles.previewStack}>
                <View style={[styles.previewThumb, { transform: [{ rotate: '-5deg' }] }]} />
                <View style={[styles.previewThumb, { transform: [{ rotate: '3deg' }], zIndex: 10 }]} />
              </View>
              <Text style={styles.previewText}>View Review Queue</Text>
              <MaterialCommunityIcons name="chevron-right" size={20} color="white" />
            </TouchableOpacity>
          </View>
        </View>
      </CameraView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
    justifyContent: 'center',
    alignItems: 'center',
  },
  camera: {
    flex: 1,
    width: '100%',
  },
  overlay: {
    flex: 1,
    backgroundColor: 'transparent',
    justifyContent: 'space-between',
    paddingVertical: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    backgroundColor: 'rgba(0,0,0,0.4)',
    paddingVertical: 10,
  },
  headerTitle: {
    color: 'white',
    fontSize: 20,
    fontWeight: '600',
  },
  iconButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  chipContainer: {
    alignItems: 'center',
    marginTop: 10,
  },
  aiChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 4,
    backgroundColor: 'rgba(0,88,190,0.2)',
    borderColor: 'rgba(0,88,190,0.4)',
    borderWidth: 1,
    borderRadius: 16,
  },
  aiChipText: {
    fontSize: 10,
    color: 'white',
    fontWeight: '600',
    letterSpacing: 1,
  },
  viewfinderContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewfinder: {
    width: '85%',
    aspectRatio: 3/4,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.4)',
    borderStyle: 'dashed',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 32,
    height: 32,
    borderColor: '#0058be',
  },
  topLeft: {
    top: -2,
    left: -2,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderTopLeftRadius: 8,
  },
  topRight: {
    top: -2,
    right: -2,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderTopRightRadius: 8,
  },
  bottomLeft: {
    bottom: -2,
    left: -2,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderBottomLeftRadius: 8,
  },
  bottomRight: {
    bottom: -2,
    right: -2,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderBottomRightRadius: 8,
  },
  chip: {
    position: 'absolute',
    bottom: 20,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  chipText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '500',
  },
  footer: {
    paddingHorizontal: 16,
    gap: 20,
  },
  controlsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  bottomButton: {
    alignItems: 'center',
    gap: 8,
  },
  iconBg: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonLabel: {
    color: 'white',
    fontSize: 12,
    fontWeight: '500',
  },
  shutterButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 4,
    borderColor: 'white',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shutterInner: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'white',
  },
  previewContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.4)',
    padding: 12,
    borderRadius: 12,
    gap: 12,
  },
  previewStack: {
    width: 32,
    height: 32,
    position: 'relative',
  },
  previewThumb: {
    width: 28,
    height: 28,
    backgroundColor: '#e0e3e5',
    borderWidth: 1,
    borderColor: 'white',
    borderRadius: 4,
    position: 'absolute',
  },
  previewText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  message: {
    textAlign: 'center',
    paddingBottom: 10,
    color: 'white',
  },
  button: {
    backgroundColor: '#0058be',
    padding: 12,
    borderRadius: 8,
  },
  text: {
    color: 'white',
    fontWeight: '600',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
  },
});
