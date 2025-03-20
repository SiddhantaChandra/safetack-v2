import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  FlatList, 
  TouchableOpacity, 
  Modal, 
  TextInput,
  Switch,
  Alert,
  ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ContactsModel } from './database/models';

export default function ContactsScreen() {
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingContact, setEditingContact] = useState(null);
  
  // Form state
  const [name, setName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [email, setEmail] = useState('');
  const [relationship, setRelationship] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [priority, setPriority] = useState('1');
  
  // Load contacts on initial render
  useEffect(() => {
    loadContacts();
  }, []);
  
  // Load contacts from database
  const loadContacts = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const contactData = await ContactsModel.getContacts();
      setContacts(contactData);
      
      setLoading(false);
    } catch (err) {
      console.error('Error loading contacts:', err);
      setError('Failed to load your emergency contacts');
      setLoading(false);
    }
  };
  
  // Open modal to add a new contact
  const handleAddContact = () => {
    setEditingContact(null);
    setName('');
    setPhoneNumber('');
    setEmail('');
    setRelationship('');
    setIsActive(true);
    setPriority('1');
    setModalVisible(true);
  };
  
  // Open modal to edit an existing contact
  const handleEditContact = (contact) => {
    setEditingContact(contact);
    setName(contact.name);
    setPhoneNumber(contact.phone_number || '');
    setEmail(contact.email || '');
    setRelationship(contact.relationship || '');
    setIsActive(contact.is_active === 1);
    setPriority(contact.priority.toString());
    setModalVisible(true);
  };
  
  // Save contact (create or update)
  const handleSaveContact = async () => {
    try {
      // Validate form
      if (!name.trim()) {
        Alert.alert('Error', 'Please enter a name');
        return;
      }
      
      if (!phoneNumber.trim() && !email.trim()) {
        Alert.alert('Error', 'Please enter at least a phone number or email');
        return;
      }
      
      const contactData = {
        name: name.trim(),
        phone_number: phoneNumber.trim() || null,
        email: email.trim() || null,
        relationship: relationship.trim() || null,
        priority: parseInt(priority) || 1,
        is_active: isActive
      };
      
      setLoading(true);
      
      if (editingContact) {
        // Update existing contact
        await ContactsModel.updateContact(editingContact.id, contactData);
      } else {
        // Create new contact
        await ContactsModel.createContact(contactData);
      }
      
      // Refresh contact list
      await loadContacts();
      
      setModalVisible(false);
      setLoading(false);
    } catch (err) {
      console.error('Error saving contact:', err);
      Alert.alert('Error', 'Failed to save contact');
      setLoading(false);
    }
  };
  
  // Delete a contact
  const handleDeleteContact = async (contactId) => {
    Alert.alert(
      'Delete Contact',
      'Are you sure you want to delete this emergency contact?',
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              await ContactsModel.deleteContact(contactId);
              await loadContacts();
              setLoading(false);
            } catch (err) {
              console.error('Error deleting contact:', err);
              Alert.alert('Error', 'Failed to delete contact');
              setLoading(false);
            }
          }
        }
      ]
    );
  };
  
  // Render contact item
  const renderContactItem = ({ item }) => {
    return (
      <View style={styles.contactItem}>
        <View style={styles.contactHeader}>
          <Text style={styles.contactName}>{item.name}</Text>
          <View style={[
            styles.statusBadge, 
            { backgroundColor: item.is_active ? '#E8F5E9' : '#FFEBEE' }
          ]}>
            <Text style={[
              styles.statusText, 
              { color: item.is_active ? '#2E7D32' : '#C62828' }
            ]}>
              {item.is_active ? 'Active' : 'Inactive'}
            </Text>
          </View>
        </View>
        
        <View style={styles.contactDetails}>
          {item.phone_number && (
            <View style={styles.detailRow}>
              <Ionicons name="call-outline" size={16} color="#666" />
              <Text style={styles.detailText}>{item.phone_number}</Text>
            </View>
          )}
          
          {item.email && (
            <View style={styles.detailRow}>
              <Ionicons name="mail-outline" size={16} color="#666" />
              <Text style={styles.detailText}>{item.email}</Text>
            </View>
          )}
          
          {item.relationship && (
            <View style={styles.detailRow}>
              <Ionicons name="people-outline" size={16} color="#666" />
              <Text style={styles.detailText}>{item.relationship}</Text>
            </View>
          )}
          
          <View style={styles.detailRow}>
            <Ionicons name="flag-outline" size={16} color="#666" />
            <Text style={styles.detailText}>Priority: {item.priority}</Text>
          </View>
        </View>
        
        <View style={styles.contactActions}>
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => handleEditContact(item)}
          >
            <Ionicons name="create-outline" size={22} color="#2196F3" />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => handleDeleteContact(item.id)}
          >
            <Ionicons name="trash-outline" size={22} color="#F44336" />
          </TouchableOpacity>
        </View>
      </View>
    );
  };
  
  // Empty state
  const renderEmptyState = () => {
    return (
      <View style={styles.emptyState}>
        <Ionicons name="people-outline" size={64} color="#ccc" />
        <Text style={styles.emptyTitle}>No Emergency Contacts</Text>
        <Text style={styles.emptyText}>
          Add trusted contacts who will be notified in case of emergency
        </Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Emergency Contacts</Text>
        <TouchableOpacity 
          style={styles.addButton}
          onPress={handleAddContact}
        >
          <Ionicons name="add" size={24} color="#fff" />
        </TouchableOpacity>
      </View>
      
      {loading && !modalVisible ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2196F3" />
          <Text style={styles.loadingText}>Loading contacts...</Text>
        </View>
      ) : error ? (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={32} color="#F44336" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity 
            style={styles.retryButton} 
            onPress={loadContacts}
          >
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={contacts}
          renderItem={renderContactItem}
          keyExtractor={item => item.id.toString()}
          contentContainerStyle={contacts.length === 0 ? { flex: 1 } : { padding: 12 }}
          ListEmptyComponent={renderEmptyState}
        />
      )}
      
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingContact ? 'Edit Contact' : 'Add Contact'}
              </Text>
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
              >
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.form}>
              <View style={styles.formGroup}>
                <Text style={styles.label}>Name*</Text>
                <TextInput
                  style={styles.input}
                  value={name}
                  onChangeText={setName}
                  placeholder="Enter name"
                />
              </View>
              
              <View style={styles.formGroup}>
                <Text style={styles.label}>Phone Number</Text>
                <TextInput
                  style={styles.input}
                  value={phoneNumber}
                  onChangeText={setPhoneNumber}
                  placeholder="Enter phone number"
                  keyboardType="phone-pad"
                />
              </View>
              
              <View style={styles.formGroup}>
                <Text style={styles.label}>Email</Text>
                <TextInput
                  style={styles.input}
                  value={email}
                  onChangeText={setEmail}
                  placeholder="Enter email"
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>
              
              <View style={styles.formGroup}>
                <Text style={styles.label}>Relationship</Text>
                <TextInput
                  style={styles.input}
                  value={relationship}
                  onChangeText={setRelationship}
                  placeholder="E.g. Spouse, Parent, Friend"
                />
              </View>
              
              <View style={styles.formGroup}>
                <Text style={styles.label}>Priority (1 = highest)</Text>
                <TextInput
                  style={styles.input}
                  value={priority}
                  onChangeText={setPriority}
                  placeholder="Enter priority (1-5)"
                  keyboardType="number-pad"
                />
              </View>
              
              <View style={styles.switchGroup}>
                <Text style={styles.label}>Active</Text>
                <Switch
                  value={isActive}
                  onValueChange={setIsActive}
                  trackColor={{ false: '#ccc', true: '#81D4FA' }}
                  thumbColor={isActive ? '#2196F3' : '#f4f3f4'}
                />
              </View>
              
              <TouchableOpacity
                style={styles.saveButton}
                onPress={handleSaveContact}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.saveButtonText}>Save Contact</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    paddingTop: 60,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  addButton: {
    backgroundColor: '#2196F3',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  contactItem: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  contactHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  contactName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  statusBadge: {
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
  },
  contactDetails: {
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  detailText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 6,
  },
  contactActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingTop: 12,
  },
  actionButton: {
    padding: 6,
    marginLeft: 12,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorText: {
    marginTop: 12,
    marginBottom: 16,
    color: '#666',
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: '#2196F3',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 4,
  },
  retryText: {
    color: '#fff',
    fontWeight: '600',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 16,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  form: {
    paddingBottom: 32,
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  input: {
    backgroundColor: '#f9f9f9',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 4,
    padding: 10,
    fontSize: 16,
  },
  switchGroup: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  saveButton: {
    backgroundColor: '#2196F3',
    padding: 14,
    borderRadius: 4,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
});