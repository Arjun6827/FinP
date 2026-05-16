import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, TextInput } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as LocalAuthentication from 'expo-local-authentication';
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../firebase";

export default function LoginScreen() {
  const router = useRouter();
  const [showPasswordInput, setShowPasswordInput] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleBiometricLogin = async () => {
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();

      if (!hasHardware) {
        Alert.alert('Not Supported', 'This device does not support biometric authentication.');
        router.replace('/(tabs)');
        return;
      }

      if (!isEnrolled) {
        Alert.alert('Not Enrolled', 'No biometric records found. Please set up FaceID/TouchID in your device settings.');
        router.replace('/(tabs)');
        return;
      }

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Sign in to FinPilot',
        fallbackLabel: 'Use Passcode',
      });

      if (result.success) {
        router.replace('/(tabs)');
      } else {
        Alert.alert('Failed', 'Authentication failed or was cancelled.');
      }
    } catch (error) {
      console.error('Biometric login error:', error);
      Alert.alert('Error', 'An error occurred during authentication.');
    }
  };

  const handlePasswordLogin = async () => {
    if (showPasswordInput) {
      if (!email || !password) {
        Alert.alert('Error', 'Please enter both email and password.');
        return;
      }
      
      try {
        await signInWithEmailAndPassword(auth, email, password);
        router.replace('/(tabs)');
      } catch (err: any) {
        console.error(err);
        Alert.alert('Login Failed', err.message || 'Failed to login');
      }
    } else {
      setShowPasswordInput(true);
    }
  };

  const handleTroubleLoggingIn = () => {
    Alert.alert(
      'Trouble Logging In?',
      'Please contact support at support@finpilot.ai or reset your password via the web app.',
      [{ text: 'OK' }]
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        {/* Logo Section */}
        <View style={styles.logoSection}>
          <View style={styles.logoBg}>
            <MaterialCommunityIcons name="wallet" size={40} color="white" />
          </View>
          <Text style={styles.title}>FinPilot</Text>
          <Text style={styles.subtitle}>Institutional grade security</Text>
        </View>

        {/* Card */}
        <View style={styles.card}>
          <Text style={styles.welcomeText}>Welcome back</Text>
          <Text style={styles.cardSubtitle}>Sign in to your secure account</Text>

          {!showPasswordInput ? (
            <>
              <TouchableOpacity style={styles.primaryButton} onPress={handleBiometricLogin}>
                <MaterialCommunityIcons name="face-recognition" size={24} color="white" />
                <Text style={styles.primaryButtonText}>Sign in with FaceID</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.secondaryButton} onPress={handlePasswordLogin}>
                <MaterialCommunityIcons name="lock" size={20} color="#5c647a" />
                <Text style={styles.secondaryButtonText}>Use Password</Text>
              </TouchableOpacity>
            </>
          ) : (
            <View style={{ width: '100%', gap: 12 }}>
              <TextInput
                placeholder="Enter Email"
                placeholderTextColor="#5c647a"
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
              <TextInput
                placeholder="Enter Password"
                placeholderTextColor="#5c647a"
                secureTextEntry
                style={styles.input}
                value={password}
                onChangeText={setPassword}
              />
              <TouchableOpacity style={styles.primaryButton} onPress={handlePasswordLogin}>
                <Text style={styles.primaryButtonText}>Login</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.secondaryButton} 
                onPress={() => {
                  setShowPasswordInput(false);
                  setPassword('');
                }}
              >
                <Text style={styles.secondaryButtonText}>Back</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        <TouchableOpacity style={styles.troubleLink} onPress={handleTroubleLoggingIn}>
          <Text style={styles.troubleText}>Trouble logging in?</Text>
        </TouchableOpacity>

        {/* Security Badge */}
        <View style={styles.securityBadge}>
          <MaterialCommunityIcons name="shield-check" size={16} color="#0058be" />
          <Text style={styles.securityBadgeText}>Bank-grade Encryption</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f7f9fb',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  logoSection: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoBg: {
    width: 64,
    height: 64,
    backgroundColor: '#0058be',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    shadowColor: '#0058be',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  title: {
    fontSize: 30,
    fontWeight: '700',
    color: '#0058be',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    color: '#5c647a',
    marginTop: 4,
  },
  card: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e0e3e5',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
  },
  welcomeText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#191c1e',
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 13,
    color: '#5c647a',
    marginBottom: 24,
  },
  primaryButton: {
    width: '100%',
    backgroundColor: '#0058be',
    paddingVertical: 14,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 12,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    width: '100%',
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#e0e3e5',
    paddingVertical: 14,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  secondaryButtonText: {
    color: '#5c647a',
    fontSize: 14,
    fontWeight: '600',
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
  troubleLink: {
    marginTop: 24,
  },
  troubleText: {
    color: '#0058be',
    fontSize: 13,
    fontWeight: '600',
  },
  securityBadge: {
    position: 'absolute',
    bottom: 40,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#e6e8ea',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#c2c6d6',
  },
  securityBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#5c647a',
    textTransform: 'uppercase',
  },
});
