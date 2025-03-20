import React, { useState } from 'react';
import { 
  StyleSheet, 
  View, 
  TextInput, 
  TouchableOpacity, 
  ActivityIndicator,
  Image,
  ScrollView,
  Alert
} from 'react-native';
import { useRouter } from 'expo-router';
import { useUser } from '../contexts/UserContext';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';

export default function AuthScreen() {
  const router = useRouter();
  const { signIn, signUp, setGuest } = useUser();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Handle sign in
  const handleSignIn = async () => {
    if (!email || !password) {
      setError('Please enter both email and password');
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      const { success, error } = await signIn(email, password);
      
      if (!success) throw error;
      
      // Navigation is handled by UserContext
    } catch (err) {
      console.error('Error signing in:', err);
      setError(err.message || 'Failed to sign in');
      setLoading(false);
    }
  };

  // Handle sign up
  const handleSignUp = async () => {
    if (!email || !password || !name) {
      setError('Please fill in all fields');
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      const { success, error, data } = await signUp(email, password, name);
      
      if (!success) throw error;
      
      // If sign up successful but needs email verification
      if (data?.user?.identities?.length === 0) {
        Alert.alert(
          'Email Verification Needed',
          'Please check your email and click the verification link to complete registration.'
        );
        setLoading(false);
      }
      
      // Navigation is handled by UserContext
    } catch (err) {
      console.error('Error signing up:', err);
      setError(err.message || 'Failed to sign up');
      setLoading(false);
    }
  };

  // Continue as guest (demo mode)
  const handleGuestMode = () => {
    setGuest(true);
    // Navigation is handled by UserContext
  };

  // Toggle between login and signup
  const toggleAuthMode = () => {
    setIsLogin(!isLogin);
    setError(null);
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.logoContainer}>
        <ThemedText style={styles.appName}>SafeTack</ThemedText>
        <ThemedText style={styles.tagline}>Your personal safety companion</ThemedText>
      </View>
      
      <ThemedView style={styles.formContainer}>
        <ThemedText style={styles.title}>{isLogin ? 'Welcome Back' : 'Create Account'}</ThemedText>
        
        {error && (
          <View style={styles.errorContainer}>
            <ThemedText style={styles.errorText}>{error}</ThemedText>
          </View>
        )}
        
        {!isLogin && (
          <View style={styles.inputGroup}>
            <ThemedText style={styles.label}>Name</ThemedText>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="Enter your name"
              autoCapitalize="words"
            />
          </View>
        )}
        
        <View style={styles.inputGroup}>
          <ThemedText style={styles.label}>Email</ThemedText>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder="Enter your email"
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </View>
        
        <View style={styles.inputGroup}>
          <ThemedText style={styles.label}>Password</ThemedText>
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            placeholder="Enter your password"
            secureTextEntry
          />
        </View>
        
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={isLogin ? handleSignIn : handleSignUp}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <ThemedText style={styles.primaryButtonText}>
              {isLogin ? 'Sign In' : 'Create Account'}
            </ThemedText>
          )}
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={toggleAuthMode}
        >
          <ThemedText style={styles.secondaryButtonText}>
            {isLogin ? 'Need an account? Sign Up' : 'Already have an account? Sign In'}
          </ThemedText>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.guestButton}
          onPress={handleGuestMode}
        >
          <ThemedText style={styles.guestButtonText}>
            Continue as Guest
          </ThemedText>
        </TouchableOpacity>
      </ThemedView>
      
      <View style={styles.footer}>
        <ThemedText style={styles.footerText}>
          By continuing, you agree to our Terms of Service and Privacy Policy
        </ThemedText>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingTop: 100,
    paddingBottom: 40,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 60,
  },
  appName: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#2196F3',
    marginBottom: 8,
  },
  tagline: {
    fontSize: 16,
    color: '#666',
  },
  formContainer: {
    marginBottom: 40,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 24,
  },
  errorContainer: {
    backgroundColor: '#FFEBEE',
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
  },
  errorText: {
    color: '#D32F2F',
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  primaryButton: {
    backgroundColor: '#2196F3',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 16,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    alignItems: 'center',
    marginBottom: 24,
  },
  secondaryButtonText: {
    color: '#2196F3',
    fontSize: 14,
  },
  guestButton: {
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  guestButtonText: {
    color: '#666',
    fontSize: 16,
  },
  footer: {
    marginTop: 'auto',
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
  },
});