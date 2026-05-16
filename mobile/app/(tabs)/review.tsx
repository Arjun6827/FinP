import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image, ActivityIndicator, Alert, Modal, TextInput } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { WebView } from 'react-native-webview';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function ReviewScreen() {
  const router = useRouter();
  const [queueItems, setQueueItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [viewMode, setViewMode] = useState('needs_review'); // 'needs_review' or 'flagged'

  const [formVendor, setFormVendor] = useState('');
  const [formAmount, setFormAmount] = useState('');
  const [formCategory, setFormCategory] = useState('');
  const [formDate, setFormDate] = useState('');

  useEffect(() => {
    if (selectedItem) {
      const data = selectedItem.ocrResults?.[0]?.data || {};
      setFormVendor(data.vendor || '');
      setFormAmount(data.amount ? String(data.amount) : '');
      setFormCategory(data.category || 'Food & Dining');
      setFormDate(data.date || '');
    }
  }, [selectedItem]);

  const handleApprove = async () => {
    if (!selectedItem) return;
    try {
      const updatedOcrResults = [...(selectedItem.ocrResults || [])];
      if (updatedOcrResults[0]) {
        updatedOcrResults[0].data = {
          vendor: formVendor,
          amount: parseFloat(formAmount),
          date: formDate,
          category: formCategory,
          confidence: updatedOcrResults[0].confidence_score
        };
        delete updatedOcrResults[0].encryptedData;
      }

      const res = await fetch(`http://192.168.1.9:5000/api/inbox/${selectedItem.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'approved',
          encrypted: false,
          updatedAt: new Date().toISOString(),
          ocrResults: updatedOcrResults
        })
      });

      if (res.ok) {
        Alert.alert('Success', 'Receipt approved and added to Ledger!');
        setSelectedItem(null);
        fetchData(true);
      } else {
        throw new Error('Failed to approve');
      }
    } catch (err) {
      console.error('Failed to approve:', err);
      Alert.alert('Error', 'Failed to approve receipt.');
    }
  };

  const handleFlag = async () => {
    if (!selectedItem) return;
    try {
      const newStatus = viewMode === 'flagged' ? 'needs_review' : 'flagged';
      const res = await fetch(`http://192.168.1.9:5000/api/inbox/${selectedItem.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: newStatus,
          updatedAt: new Date().toISOString(),
          ...(newStatus === 'flagged' ? { flaggedAt: new Date().toISOString() } : {})
        })
      });

      if (res.ok) {
        Alert.alert('Success', newStatus === 'flagged' ? 'Item flagged!' : 'Item moved to pending!');
        setSelectedItem(null);
        fetchData(true);
      } else {
        throw new Error('Failed to flag');
      }
    } catch (err) {
      console.error('Failed to flag:', err);
      Alert.alert('Error', 'Failed to update flag status.');
    }
  };

  const handleDelete = async () => {
    if (!selectedItem) return;
    try {
      const res = await fetch(`http://192.168.1.9:5000/api/inbox/${selectedItem.id}`, {
        method: 'DELETE'
      });

      if (res.ok) {
        Alert.alert('Deleted', 'Receipt deleted successfully.');
        setSelectedItem(null);
        fetchData(true);
      } else {
        throw new Error('Failed to delete');
      }
    } catch (err) {
      console.error('Failed to delete:', err);
      Alert.alert('Error', 'Failed to delete receipt.');
    }
  };

  const getPreviewUrl = (url: string) => {
    if (!url) return '';
    return url.replace('localhost', '192.168.1.9');
  };

  useFocusEffect(
    useCallback(() => {
      fetchData();
      processQueue();
      const interval = setInterval(() => {
        fetchData(true);
        processQueue();
      }, 5000);
      return () => clearInterval(interval);
    }, [viewMode])
  );

  const fetchData = async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    try {
      // Using the computer's local IP address to connect from physical iPhone
      const res = await fetch('http://192.168.1.9:5000/api/inbox');
      const json = await res.json();
      if (json.success && Array.isArray(json.items)) {
        console.log('Fetched items count:', json.items.length);
        // Filter based on viewMode
        const filteredItems = json.items.filter(item => item && item.status === viewMode);
        
        setQueueItems(filteredItems);
        // Cache the latest data
        await AsyncStorage.setItem(`cached_review_items_${viewMode}`, JSON.stringify(filteredItems));
      }
    } catch (err) {
      console.log('Failed to fetch review data (offline mode active)');
      
      const cached = await AsyncStorage.getItem(`cached_review_items_${viewMode}`);
      if (cached) {
        setQueueItems(JSON.parse(cached));
      }
      if (!isSilent) {
        Alert.alert('Offline Mode', 'You are currently offline or server is unreachable. Showing last known data.');
      }
    } finally {
      if (!isSilent) setLoading(false);
    }
  };

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
        fetchData(true); // Refresh data after sync!
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

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View style={styles.profilePic}>
            <Image 
              source={{ uri: 'https://lh3.googleusercontent.com/aida-public/AB6AXuC99BtCWrQ5ukLD6J4vNmplWnjYIVHQIJ-H8660YnvpjFNee_BCgj3sgPWz9NO1dYSEkRftVWw6kPq3yB-dXd26q7d6WuCRf5lOgdouKwA5SbLULL58P--yBOFafclCVetSO0j7o96-U5_IQ9AdXaRBevVAb-vEMCqA40BuJLw42jYiX3w9xzGq57JBZZIHxEWf-hozYSL-Gg02zvyT6i2_fGL5EMzd7tgMWHyQ1b65At-Y41W-Dvi7IZpMg62kwJqFzZEvjSxkHSg' }} 
              style={styles.avatar}
            />
          </View>
          <Text style={styles.headerTitle}>FinPilot</Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <TouchableOpacity style={styles.iconButton} onPress={processQueue} disabled={syncing}>
            <MaterialCommunityIcons name={syncing ? "sync" : "cloud-upload"} size={24} color={syncing ? "#5c647a" : "#0058be"} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconButton} onPress={fetchData}>
            <MaterialCommunityIcons name="refresh" size={24} color="#0058be" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconButton} onPress={() => router.replace('/login')}>
            <MaterialCommunityIcons name="logout" size={24} color="#5c647a" />
          </TouchableOpacity>
        </View>
      </View>

      {syncing && (
        <View style={{ padding: 8, alignItems: 'center', backgroundColor: '#e6f0fa', flexDirection: 'row', justifyContent: 'center', gap: 8 }}>
          <ActivityIndicator size="small" color="#0058be" />
          <Text style={{ color: '#0058be', fontSize: 12, fontWeight: '600' }}>Syncing offline receipts...</Text>
        </View>
      )}

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.summaryCard}>
          <View>
            <Text style={styles.summaryTitle}>{queueItems.length} {viewMode === 'flagged' ? 'Flagged' : 'Needs attention'}</Text>
            <Text style={styles.summarySub}>{viewMode === 'flagged' ? 'Items you flagged for review' : 'Pending receipt extractions'}</Text>
          </View>
          <View style={[styles.summaryIconBg, viewMode === 'flagged' && { backgroundColor: '#d93025' }]}>
            <MaterialCommunityIcons name={viewMode === 'flagged' ? 'flag' : 'clipboard-check'} size={24} color="white" />
          </View>
        </View>

        <View style={{ flexDirection: 'row', paddingHorizontal: 16, marginBottom: 12, gap: 8 }}>
          <TouchableOpacity 
            onPress={() => setViewMode('needs_review')}
            style={{ 
              flex: 1, 
              paddingVertical: 10, 
              backgroundColor: viewMode === 'needs_review' ? '#0058be' : '#ffffff', 
              borderRadius: 8, 
              alignItems: 'center',
              borderWidth: 1,
              borderColor: viewMode === 'needs_review' ? '#0058be' : '#e0e3e5'
            }}
          >
            <Text style={{ color: viewMode === 'needs_review' ? '#ffffff' : '#5c647a', fontWeight: 'bold' }}>PENDING</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            onPress={() => setViewMode('flagged')}
            style={{ 
              flex: 1, 
              paddingVertical: 10, 
              backgroundColor: viewMode === 'flagged' ? '#d93025' : '#ffffff', 
              borderRadius: 8, 
              alignItems: 'center',
              borderWidth: 1,
              borderColor: viewMode === 'flagged' ? '#d93025' : '#e0e3e5'
            }}
          >
            <Text style={{ color: viewMode === 'flagged' ? '#ffffff' : '#5c647a', fontWeight: 'bold' }}>FLAGGED</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.listHeader}>
          <Text style={styles.listHeaderTitle}>QUEUE</Text>
          <TouchableOpacity>
            <Text style={styles.batchAction}>Batch Action</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <ActivityIndicator size="large" color="#0058be" style={{ marginTop: 20 }} />
        ) : (
          <View style={styles.queueList}>
            {queueItems.length === 0 ? (
              <View style={{ padding: 20, alignItems: 'center' }}>
                <Text style={{ color: '#5c647a' }}>No items in this queue.</Text>
              </View>
            ) : (
              queueItems.map((item) => {
                const data = item.ocrResults?.[0]?.data || {};
                return (
                  <View key={item.id} style={styles.itemCard}>
                    <View style={styles.itemHeader}>
                      <View>
                        <View style={[styles.tag, item.status === 'flagged' && { backgroundColor: '#fce8e6' }]}>
                          <Text style={[styles.tagText, item.status === 'flagged' && { color: '#d93025' }]}>{item.status}</Text>
                        </View>
                        <Text style={styles.vendorName}>{data.vendor || 'Unknown Vendor'}</Text>
                      </View>
                      <Text style={styles.amount}>{data.amount ? `$${data.amount}` : '$0.00'}</Text>
                    </View>
                    
                    <View style={styles.itemFooter}>
                      <View style={styles.dateContainer}>
                        <MaterialCommunityIcons name="calendar" size={16} color="#5c647a" />
                        <Text style={styles.dateText}>{data.date || 'No Date'}</Text>
                      </View>
                      <TouchableOpacity style={styles.reviewButton} onPress={() => setSelectedItem(item)}>
                        <Text style={styles.reviewButtonText}>REVIEW</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })
            )}
          </View>
        )}
      </ScrollView>

      {!!selectedItem && (
        <Modal visible={!!selectedItem} animationType="slide">
          <View style={{ flex: 1, backgroundColor: '#f7f9fb' }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, backgroundColor: '#ffffff', borderBottomWidth: 1, borderBottomColor: '#e0e3e5', paddingTop: 50 }}>
              <TouchableOpacity onPress={() => setSelectedItem(null)}>
                <MaterialCommunityIcons name="close" size={24} color="#5c647a" />
              </TouchableOpacity>
              <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#191c1e' }}>Review Receipt</Text>
              <View style={{ width: 24 }} />
            </View>

            <ScrollView contentContainerStyle={{ padding: 16 }}>
              <View style={{ height: 200, backgroundColor: '#F1F3F5', borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginBottom: 16, overflow: 'hidden' }}>
                {(() => {
                  const rawUrl = selectedItem?.ocrResults?.[0]?.fileUrl || selectedItem?.attachments?.[0]?.url;
                  const url = getPreviewUrl(rawUrl);
                  if (!url) {
                    return (
                      <View style={{ alignItems: 'center' }}>
                        <MaterialCommunityIcons name="image-off" size={48} color="#5c647a" />
                        <Text style={{ color: '#5c647a', marginTop: 8 }}>No Preview Available</Text>
                      </View>
                    );
                  }
                  if (url.toLowerCase().includes('.pdf')) {
                    return (
                      <TouchableOpacity onPress={() => WebBrowser.openBrowserAsync(url)} style={{ alignItems: 'center' }}>
                        <MaterialCommunityIcons name="file-pdf-box" size={64} color="#d93025" />
                        <Text style={{ color: '#d93025', marginTop: 8, fontWeight: 'bold' }}>Open PDF Receipt</Text>
                      </TouchableOpacity>
                    );
                  }
                  return (
                    <Image 
                      source={{ uri: url }} 
                      style={{ width: '100%', height: '100%' }} 
                      resizeMode="contain"
                    />
                  );
                })()}
              </View>

              {/* Form Fields */}
              <View style={{ backgroundColor: '#ffffff', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#e0e3e5' }}>
                <Text style={{ fontSize: 12, fontWeight: 'bold', color: '#5c647a', marginBottom: 4 }}>VENDOR NAME</Text>
                <TextInput 
                  style={{ borderWidth: 1, borderColor: '#e0e3e5', borderRadius: 8, padding: 12, marginBottom: 16, color: '#191c1e' }}
                  value={formVendor}
                  onChangeText={setFormVendor}
                />

                <Text style={{ fontSize: 12, fontWeight: 'bold', color: '#5c647a', marginBottom: 4 }}>AMOUNT ($)</Text>
                <TextInput 
                  style={{ borderWidth: 1, borderColor: '#e0e3e5', borderRadius: 8, padding: 12, marginBottom: 16, color: '#191c1e' }}
                  value={formAmount}
                  onChangeText={setFormAmount}
                  keyboardType="numeric"
                />

                <Text style={{ fontSize: 12, fontWeight: 'bold', color: '#5c647a', marginBottom: 4 }}>CATEGORY</Text>
                <TextInput 
                  style={{ borderWidth: 1, borderColor: '#e0e3e5', borderRadius: 8, padding: 12, marginBottom: 16, color: '#191c1e' }}
                  value={formCategory}
                  onChangeText={setFormCategory}
                />

                <Text style={{ fontSize: 12, fontWeight: 'bold', color: '#5c647a', marginBottom: 4 }}>DATE</Text>
                <TextInput 
                  style={{ borderWidth: 1, borderColor: '#e0e3e5', borderRadius: 8, padding: 12, marginBottom: 16, color: '#191c1e' }}
                  value={formDate}
                  onChangeText={setFormDate}
                />
              </View>

              {/* Action Buttons */}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 24, gap: 8 }}>
                <TouchableOpacity 
                  onPress={handleDelete}
                  style={{ flex: 1, paddingVertical: 12, backgroundColor: '#ffffff', borderRadius: 8, alignItems: 'center', borderWidth: 1, borderColor: '#d93025' }}
                >
                  <Text style={{ color: '#d93025', fontWeight: 'bold' }}>Delete</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  onPress={handleFlag}
                  style={{ flex: 1, paddingVertical: 12, backgroundColor: '#ffffff', borderRadius: 8, alignItems: 'center', borderWidth: 1, borderColor: '#0058be' }}
                >
                  <Text style={{ color: '#0058be', fontWeight: 'bold' }}>{viewMode === 'flagged' ? 'Unflag' : 'Flag'}</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  onPress={handleApprove}
                  style={{ flex: 2, paddingVertical: 12, backgroundColor: '#0058be', borderRadius: 8, alignItems: 'center' }}
                >
                  <Text style={{ color: '#ffffff', fontWeight: 'bold' }}>Approve</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f7f9fb',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e3e5',
    paddingTop: 50, // For status bar
  },
  profilePic: {
    width: 32,
    height: 32,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#dae2fd',
  },
  avatar: {
    width: '100%',
    height: '100%',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#0058be',
  },
  iconButton: {
    padding: 4,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100, // For bottom tabs
  },
  summaryCard: {
    backgroundColor: '#2170e4',
    padding: 24,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  summaryTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#ffffff',
  },
  summarySub: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.9)',
    marginTop: 2,
  },
  summaryIconBg: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    padding: 8,
    borderRadius: 8,
  },
  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  listHeaderTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#5c647a',
    letterSpacing: 1,
  },
  batchAction: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0058be',
  },
  queueList: {
    gap: 16,
  },
  itemCard: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e0e3e5',
    borderRadius: 12,
    padding: 16,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  tag: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(86,94,116,0.1)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(86,94,116,0.2)',
  },
  tagText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#565e74',
    textTransform: 'uppercase',
  },
  vendorName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#191c1e',
    marginTop: 8,
  },
  amount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0058be',
  },
  itemFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dateText: {
    fontSize: 13,
    color: '#5c647a',
  },
  reviewButton: {
    backgroundColor: '#0058be',
    paddingHorizontal: 24,
    paddingVertical: 6,
    borderRadius: 8,
  },
  reviewButtonText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
});
