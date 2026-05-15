import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image, ActivityIndicator } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';

export default function ReviewScreen() {
  const router = useRouter();
  const [queueItems, setQueueItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [])
  );

  const fetchData = async () => {
    setLoading(true);
    try {
      // Using the computer's local IP address to connect from physical iPhone
      const res = await fetch('http://192.168.1.9:5000/api/inbox');
      const json = await res.json();
      if (json.success) {
        // Filter for items that need review (to match web app)
        const pendingItems = json.items.filter(item => item.status === 'needs_review');
        
        // Map to our UI structure
        const mapped = pendingItems.map(item => {
          const data = item.ocrResults?.[0]?.data || {};
          return {
            id: item.id,
            vendor: data.vendor || 'Unknown Vendor',
            amount: data.amount ? `$${data.amount}` : '$0.00',
            date: data.date || 'No Date',
            status: item.status || 'Pending Review',
          };
        });
        setQueueItems(mapped);
      }
    } catch (err) {
      console.error('Failed to fetch review data:', err);
    } finally {
      setLoading(false);
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
          <TouchableOpacity style={styles.iconButton} onPress={fetchData}>
            <MaterialCommunityIcons name="refresh" size={24} color="#0058be" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconButton} onPress={() => router.replace('/login')}>
            <MaterialCommunityIcons name="logout" size={24} color="#5c647a" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Summary Card */}
        <View style={styles.summaryCard}>
          <View>
            <Text style={styles.summaryTitle}>{queueItems.length} Needs attention</Text>
            <Text style={styles.summarySub}>Pending receipt extractions</Text>
          </View>
          <View style={styles.summaryIconBg}>
            <MaterialCommunityIcons name="clipboard-check" size={24} color="white" />
          </View>
        </View>

        {/* List Header */}
        <View style={styles.listHeader}>
          <Text style={styles.listHeaderTitle}>QUEUE</Text>
          <TouchableOpacity>
            <Text style={styles.batchAction}>Batch Action</Text>
          </TouchableOpacity>
        </View>

        {/* Queue Items */}
        {loading ? (
          <ActivityIndicator size="large" color="#0058be" style={{ marginTop: 20 }} />
        ) : (
          <View style={styles.queueList}>
            {queueItems.length === 0 ? (
              <View style={{ padding: 20, alignItems: 'center' }}>
                <Text style={{ color: '#5c647a' }}>No items pending review.</Text>
              </View>
            ) : (
              queueItems.map((item) => (
                <View key={item.id} style={styles.itemCard}>
                  <View style={styles.itemHeader}>
                    <View>
                      <View style={styles.tag}>
                        <Text style={styles.tagText}>{item.status}</Text>
                      </View>
                      <Text style={styles.vendorName}>{item.vendor}</Text>
                    </View>
                    <Text style={styles.amount}>{item.amount}</Text>
                  </View>
                  
                  <View style={styles.itemFooter}>
                    <View style={styles.dateContainer}>
                      <MaterialCommunityIcons name="calendar" size={16} color="#5c647a" />
                      <Text style={styles.dateText}>{item.date}</Text>
                    </View>
                    <TouchableOpacity style={styles.reviewButton}>
                      <Text style={styles.reviewButtonText}>REVIEW</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )}
          </View>
        )}
      </ScrollView>
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
