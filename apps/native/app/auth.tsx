/**
 * Auth Screen - Sign Up / Login
 */
import { View, Text, ScrollView, KeyboardAvoidingView, Platform, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState } from 'react';
import { router } from 'expo-router';
import { useTheme } from '@/lib/hooks';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';

export default function AuthScreen() {
  const theme = useTheme();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      router.replace('/(drawer)/(tabs)');
    }, 1500);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background.primary }} edges={['top']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={{ flexGrow: 1, padding: 16 }} showsVerticalScrollIndicator={false}>
          <View style={{ marginTop: 40 }}>
          <Text style={{ color: theme.colors.text.primary, fontSize: 36, fontWeight: 'bold', marginBottom: 8 }}>
            {isLogin ? 'Welcome Back' : 'Create Account'}
          </Text>
          <Text style={{ color: theme.colors.text.secondary, fontSize: 15, marginBottom: 40 }}>
            {isLogin ? 'Sign in to continue trading' : 'Start your trading journey today'}
          </Text>

          <Input label="Email" value={email} onChangeText={setEmail} placeholder="Enter your email" keyboardType="email-address" autoCapitalize="none" />
          <Input label="Password" value={password} onChangeText={setPassword} placeholder="Enter your password" secureTextEntry />

          <Button title={isLogin ? 'Sign In' : 'Sign Up'} onPress={handleSubmit} loading={loading} variant="primary" fullWidth style={{ marginTop: 20 }} />

          <TouchableOpacity onPress={() => setIsLogin(!isLogin)} style={{ marginTop: 24, alignSelf: 'center' }}>
            <Text style={{ color: theme.colors.text.secondary }}>
              {isLogin ? "Don't have an account? " : 'Already have an account? '}
              <Text style={{ color: theme.colors.accent.primary, fontWeight: '600' }}>
                {isLogin ? 'Sign Up' : 'Sign In'}
              </Text>
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
