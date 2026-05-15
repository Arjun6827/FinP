import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, ActivityIndicator, Modal, Alert, Image, Linking } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function LedgerScreen() {
  const router = useRouter();
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  
  // Modals state
  const [actionTx, setActionTx] = useState(null); 
  const [viewingReceiptUrl, setViewingReceiptUrl] = useState(null);
  const [editingTx, setEditingTx] = useState(null);

  // Edit form state
  const [editVendor, setEditVendor] = useState('');
  const [editAmount, setEditAmount] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editDate, setEditDate] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch('http://192.168.1.9:5000/api/inbox');
      const json = await res.json();
      if (json.success) {
        const approvedItems = json.items.filter(item => item.status === 'approved');
        
        const mapped = approvedItems.map(item => {
          const data = item.ocrResults?.[0]?.data || {};
          return {
            id: item.id,
            vendor: data.vendor || 'Unknown Vendor',
            category: data.category || 'Uncategorized',
            date: data.date || 'No Date',
            amount: data.amount ? `-$${data.amount}` : '-$0.00',
            icon: getIconForCategory(data.category),
            fileUrl: item.ocrResults?.[0]?.fileUrl,
            rawAmount: data.amount ? String(data.amount) : '0.00', // Ensure string for TextInput
          };
        });
        setTransactions(mapped);
        // Cache the latest data
        await AsyncStorage.setItem('cached_transactions', JSON.stringify(mapped));
      }
    } catch (err) {
      console.error('Failed to fetch ledger data:', err);
      // Load from cache if available
      const cached = await AsyncStorage.getItem('cached_transactions');
      if (cached) {
        setTransactions(JSON.parse(cached));
        Alert.alert('Offline Mode', 'Showing cached data. Reconnect to see latest updates.');
      }
    } finally {
      setLoading(false);
    }
  };

  const getFullUrl = (url) => {
    if (!url) return null;
    let resolvedUrl = url;
    // Replace localhost with computer's IP for physical device testing
    if (resolvedUrl.includes('localhost:5000')) {
      resolvedUrl = resolvedUrl.replace('localhost:5000', '192.168.1.9:5000');
    }
    if (resolvedUrl.startsWith('http')) return resolvedUrl;
    
    const baseUrl = 'http://192.168.1.9:5000';
    return resolvedUrl.startsWith('/') ? `${baseUrl}${resolvedUrl}` : `${baseUrl}/${resolvedUrl}`;
  };

  const handleDelete = async (id) => {
    try {
      const res = await fetch(`http://192.168.1.9:5000/api/inbox/${id}`, {
        method: 'DELETE',
      });
      const json = await res.json();
      if (json.success) {
        setTransactions(transactions.filter(tx => tx.id !== id));
        Alert.alert('Deleted', 'Transaction has been deleted.');
      }
    } catch (err) {
      console.error('Failed to delete:', err);
    }
  };

  const handleMoveToReview = async (id) => {
    try {
      const res = await fetch(`http://192.168.1.9:5000/api/inbox/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'needs_review' }),
      });
      const json = await res.json();
      if (json.success) {
        setTransactions(transactions.filter(tx => tx.id !== id));
        Alert.alert('Moved', 'Transaction moved back to review queue.');
      }
    } catch (err) {
      console.error('Failed to move:', err);
    }
  };

  const handleSaveEdit = async () => {
    if (!editingTx) return;
    
    try {
      const updateData = {
        'ocrResults.0.data.vendor': editVendor,
        'ocrResults.0.data.amount': parseFloat(editAmount) || 0, // Save as number
        'ocrResults.0.data.category': editCategory,
        'ocrResults.0.data.date': editDate,
      };

      const res = await fetch(`http://192.168.1.9:5000/api/inbox/${editingTx.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData),
      });
      
      const json = await res.json();
      if (json.success) {
        Alert.alert('Success', 'Transaction updated successfully!');
        setEditingTx(null);
        fetchData();
      }
    } catch (err) {
      console.error('Failed to update:', err);
      Alert.alert('Error', 'Failed to update transaction.');
    }
  };

  const getIconForCategory = (category) => {
    switch (category?.toLowerCase()) {
      case 'software':
      case 'software & saas': return 'terminal';
      case 'travel': return 'airplane';
      case 'food':
      case 'food & dining': return 'food';
      case 'supplies':
      case 'office supplies': return 'cart';
      case 'utilities': return 'flash';
      case 'marketing': return 'chart-bar';
      default: return 'file-document';
    }
  };

  const categories = ['All', 'Travel', 'Food', 'Software', 'Supplies', 'Utilities'];

  const filteredTransactions = transactions.filter(tx => {
    const matchesSearch = tx.vendor.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          tx.category.toLowerCase().includes(searchQuery.toLowerCase());
    
    const txCat = tx.category.toLowerCase();
    const selCat = selectedCategory.toLowerCase();
    
    const matchesCategory = selectedCategory === 'All' || 
                            txCat === selCat ||
                            (selCat === 'software' && txCat === 'software & saas') ||
                            (selCat === 'food' && txCat === 'food & dining') ||
                            (selCat === 'supplies' && txCat === 'office supplies');

    return matchesSearch && matchesCategory;
  });

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.avatarBg}>
            <MaterialCommunityIcons name="account" size={20} color="#0058be" />
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
        {/* Search & Filter */}
        <View style={styles.searchContainer}>
          <View style={styles.searchBar}>
            <MaterialCommunityIcons name="magnify" size={20} color="#5c647a" style={styles.searchIcon} />
            <TextInput 
              placeholder="Search transactions..." 
              placeholderTextColor="#5c647a"
              style={styles.searchInput}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
            {categories.map(cat => (
              <TouchableOpacity 
                key={cat} 
                style={[styles.filterChip, selectedCategory === cat && styles.filterChipActive]}
                onPress={() => setSelectedCategory(cat)}
              >
                <Text style={[styles.filterChipText, selectedCategory === cat && styles.filterChipTextActive]}>{cat}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Summary Card */}
        <View style={styles.metricCard}>
          <View>
            <Text style={styles.metricLabel}>MONTHLY APPROVED</Text>
            <Text style={styles.metricValue}>
              ${filteredTransactions.reduce((acc, curr) => acc + parseFloat(curr.amount.replace('-$', '') || 0), 0).toFixed(2)}
            </Text>
          </View>
          <View style={styles.metricIconBg}>
            <MaterialCommunityIcons name="trending-up" size={24} color="#0058be" />
          </View>
        </View>

        {/* Transactions List */}
        <View style={styles.listHeader}>
          <Text style={styles.listTitle}>Transactions</Text>
          <Text style={styles.listCount}>{filteredTransactions.length} Items</Text>
        </View>

        {loading ? (
          <ActivityIndicator size="large" color="#0058be" style={{ marginTop: 20 }} />
        ) : (
          <View style={styles.ledgerList}>
            {filteredTransactions.length === 0 ? (
              <View style={{ padding: 20, alignItems: 'center' }}>
                <Text style={{ color: '#5c647a' }}>No matching transactions found.</Text>
              </View>
            ) : (
              filteredTransactions.map((item) => (
                <View key={item.id} style={styles.itemRow}>
                  <View style={styles.itemIconBg}>
                    <MaterialCommunityIcons name={item.icon as any} size={20} color="#0058be" />
                  </View>
                  <View style={styles.itemInfo}>
                    <Text style={styles.vendorName} numberOfLines={1} ellipsizeMode="tail">
                      {item.vendor}
                    </Text>
                    <View style={styles.itemMeta}>
                      <Text style={styles.categoryText} numberOfLines={1}>{item.category}</Text>
                      <View style={styles.dot} />
                      <Text style={styles.dateText}>{item.date}</Text>
                    </View>
                  </View>
                  <View style={styles.itemRight}>
                    <Text style={styles.amountText}>{item.amount}</Text>
                    <View style={styles.statusContainer}>
                      <Text style={styles.statusText}>Synced</Text>
                      <MaterialCommunityIcons name="check-circle" size={12} color="#0058be" />
                    </View>
                  </View>
                  
                  {/* Action Kebab Button */}
                  <TouchableOpacity 
                    style={styles.kebabButton} 
                    onPress={() => setActionTx(item)}
                  >
                    <MaterialCommunityIcons name="dots-vertical" size={20} color="#5c647a" />
                  </TouchableOpacity>
                </View>
              ))
            )}
          </View>
        )}
      </ScrollView>

      {/* Action Sheet Modal */}
      <Modal
        visible={actionTx !== null}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setActionTx(null)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay} 
          activeOpacity={1} 
          onPress={() => setActionTx(null)}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalTitle} numberOfLines={1}>{actionTx?.vendor}</Text>
                <Text style={styles.modalSub}>{actionTx?.category} • {actionTx?.date}</Text>
              </View>
              <Text style={styles.modalAmount}>{actionTx?.amount}</Text>
            </View>

            <View style={styles.divider} />

            <TouchableOpacity 
              style={styles.optionRow} 
              onPress={() => { 
                const url = actionTx?.fileUrl;
                setActionTx(null); 
                if (url) {
                  setViewingReceiptUrl(url);
                } else {
                  Alert.alert('No File', 'No receipt image available for this transaction.');
                }
              }}
            >
              <MaterialCommunityIcons name="eye-outline" size={22} color="#191c1e" />
              <Text style={styles.optionText}>View Receipt</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.optionRow} 
              onPress={() => { 
                setEditVendor(actionTx?.vendor);
                setEditAmount(actionTx?.rawAmount); // This is now a string
                setEditCategory(actionTx?.category);
                setEditDate(actionTx?.date);
                setEditingTx(actionTx);
                setActionTx(null); 
              }}
            >
              <MaterialCommunityIcons name="pencil-outline" size={22} color="#191c1e" />
              <Text style={styles.optionText}>Edit Transaction</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.optionRow} 
              onPress={() => { 
                const url = actionTx?.fileUrl;
                setActionTx(null); 
                if (url) {
                  const fullUrl = getFullUrl(url);
                  Linking.openURL(fullUrl).catch(err => Alert.alert('Error', 'Cannot open URL'));
                } else {
                  Alert.alert('No File', 'No file available to download.');
                }
              }}
            >
              <MaterialCommunityIcons name="download-outline" size={22} color="#191c1e" />
              <Text style={styles.optionText}>Download File</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.optionRow} 
              onPress={() => { 
                const id = actionTx?.id;
                setActionTx(null); 
                Alert.alert('Move to Review', 'Are you sure you want to move this back to the review queue?', [
                  { text: 'Cancel' },
                  { text: 'Move', onPress: () => handleMoveToReview(id) }
                ]);
              }}
            >
              <MaterialCommunityIcons name="arrow-left-bottom" size={22} color="#191c1e" />
              <Text style={styles.optionText}>Move to Review</Text>
            </TouchableOpacity>

            <View style={styles.divider} />

            <TouchableOpacity 
              style={styles.optionRow} 
              onPress={() => { 
                const id = actionTx?.id;
                setActionTx(null); 
                Alert.alert('Delete', 'Are you sure you want to delete this? This action cannot be undone.', [
                  { text: 'Cancel' },
                  { text: 'Delete', style: 'destructive', onPress: () => handleDelete(id) }
                ]);
              }}
            >
              <MaterialCommunityIcons name="delete-outline" size={22} color="#d93025" />
              <Text style={[styles.optionText, { color: '#d93025' }]}>Delete</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.cancelButton} onPress={() => setActionTx(null)}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* View Receipt Modal */}
      <Modal
        visible={viewingReceiptUrl !== null}
        transparent={false}
        animationType="fade"
        onRequestClose={() => setViewingReceiptUrl(null)}
      >
        <View style={styles.fullScreenModal}>
          <View style={styles.modalHeaderTop}>
            <Text style={styles.modalHeaderTitle}>Receipt View</Text>
            <TouchableOpacity onPress={() => setViewingReceiptUrl(null)}>
              <MaterialCommunityIcons name="close" size={24} color="#191c1e" />
            </TouchableOpacity>
          </View>
          <View style={styles.imageContainer}>
            {viewingReceiptUrl && (
              <Image 
                source={{ uri: getFullUrl(viewingReceiptUrl) }} 
                style={styles.fullImage}
                resizeMode="contain"
              />
            )}
          </View>
        </View>
      </Modal>

      {/* Edit Transaction Modal */}
      <Modal
        visible={editingTx !== null}
        transparent={false}
        animationType="slide"
        onRequestClose={() => setEditingTx(null)}
      >
        <View style={styles.fullScreenModal}>
          <View style={styles.modalHeaderTop}>
            <Text style={styles.modalHeaderTitle}>Edit Transaction</Text>
            <TouchableOpacity onPress={() => setEditingTx(null)}>
              <MaterialCommunityIcons name="close" size={24} color="#191c1e" />
            </TouchableOpacity>
          </View>
          
          <ScrollView style={{ padding: 16 }}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Vendor</Text>
              <TextInput
                style={styles.input}
                value={editVendor}
                onChangeText={setEditVendor}
                placeholder="Vendor Name"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Amount</Text>
              <TextInput
                style={styles.input}
                value={editAmount}
                onChangeText={setEditAmount}
                placeholder="0.00"
                keyboardType="numeric"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Category</Text>
              <TextInput
                style={styles.input}
                value={editCategory}
                onChangeText={setEditCategory}
                placeholder="Category"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Date</Text>
              <TextInput
                style={styles.input}
                value={editDate}
                onChangeText={setEditDate}
                placeholder="YYYY-MM-DD"
              />
            </View>

            <TouchableOpacity style={styles.saveButton} onPress={handleSaveEdit}>
              <Text style={styles.saveButtonText}>Save Changes</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>
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
    paddingTop: 50,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatarBg: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#eceef0',
    alignItems: 'center',
    justifyContent: 'center',
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
    paddingBottom: 100,
  },
  searchContainer: {
    gap: 12,
    marginBottom: 24,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f2f4f6',
    borderWidth: 1,
    borderColor: '#c2c6d6',
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 48,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#191c1e',
  },
  filterScroll: {
    flexDirection: 'row',
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#e6e8ea',
    borderRadius: 16,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#c2c6d6',
  },
  filterChipActive: {
    backgroundColor: '#0058be',
    borderColor: '#0058be',
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#424754',
  },
  filterChipTextActive: {
    color: '#ffffff',
  },
  metricCard: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e0e3e5',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  metricLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#5c647a',
    letterSpacing: 1,
    marginBottom: 4,
  },
  metricValue: {
    fontSize: 24,
    fontWeight: '600',
    color: '#191c1e',
  },
  metricIconBg: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#dae2fd',
    alignItems: 'center',
    justifyContent: 'center',
  },
  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  listTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#191c1e',
  },
  listCount: {
    fontSize: 12,
    fontWeight: '600',
    color: '#5c647a',
  },
  ledgerList: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e0e3e5',
    borderRadius: 12,
    overflow: 'hidden',
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e3e5',
  },
  itemIconBg: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#eceef0',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  itemInfo: {
    flex: 1,
    minWidth: 0,
    marginRight: 8,
  },
  vendorName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#191c1e',
    marginBottom: 2,
  },
  itemMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  categoryText: {
    fontSize: 12,
    color: '#5c647a',
    flexShrink: 1,
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#c2c6d6',
  },
  dateText: {
    fontSize: 12,
    color: '#5c647a',
  },
  itemRight: {
    alignItems: 'flex-end',
    minWidth: 70,
  },
  amountText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#191c1e',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#0058be',
    textTransform: 'uppercase',
  },
  kebabButton: {
    padding: 8,
    marginLeft: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 20,
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#191c1e',
  },
  modalSub: {
    fontSize: 12,
    color: '#5c647a',
    marginTop: 2,
  },
  modalAmount: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0058be',
  },
  divider: {
    height: 1,
    backgroundColor: '#e0e3e5',
    marginVertical: 12,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingVertical: 14,
  },
  optionText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#191c1e',
  },
  cancelButton: {
    marginTop: 16,
    backgroundColor: '#f2f4f6',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#5c647a',
  },
  fullScreenModal: {
    flex: 1,
    backgroundColor: '#ffffff',
    paddingTop: 50,
  },
  modalHeaderTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e3e5',
  },
  modalHeaderTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#191c1e',
  },
  imageContainer: {
    flex: 1,
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullImage: {
    width: '100%',
    height: '100%',
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#5c647a',
    marginBottom: 8,
  },
  input: {
    width: '100%',
    height: 48,
    borderWidth: 1,
    borderColor: '#c2c6d6',
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 16,
    color: '#191c1e',
    backgroundColor: '#f2f4f6',
  },
  saveButton: {
    backgroundColor: '#0058be',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 24,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
});
