import React, { useEffect } from 'react';
import { LogBox } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PaperProvider } from 'react-native-paper';
import { AppNavigator } from './src/presentation/navigation/AppNavigator';
import { ToastProvider } from './src/presentation/context/ToastContext';

LogBox.ignoreLogs([
  'Non-serializable values were found in the navigation state',
  'Require cycle:',
  'Warning:',
]);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 1000 * 60 * 5,
    },
  },
});

SplashScreen.preventAutoHideAsync();

export default function App() {
  useEffect(() => {
    const timer = setTimeout(async () => {
      await SplashScreen.hideAsync();
    }, 2000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <PaperProvider>
      <QueryClientProvider client={queryClient}>
        <SafeAreaProvider>
          <ToastProvider>
            <StatusBar style="dark" />
            <AppNavigator />
          </ToastProvider>
        </SafeAreaProvider>
      </QueryClientProvider>
    </PaperProvider>
  );
}
