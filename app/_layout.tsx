import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { DatabaseProvider } from '@/contexts/DatabaseContext';
import { useColorScheme } from '@/hooks/useColorScheme';
import * as SQLite from 'expo-sqlite';
import { View, ActivityIndicator } from 'react-native';
import { registerBackgroundTasks } from '@/utils/notifications';
import { Slot } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import Splash from './components/Splash';

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [isReady, setIsReady] = useState(false);
  const [dbInitialized, setDbInitialized] = useState(false);
  const [fontsLoaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  useEffect(() => {
    async function initDB() {
      try {
        const db = await SQLite.openDatabaseAsync('asf_monitor.db');
        await db.execAsync('PRAGMA journal_mode = WAL');
        await db.execAsync('PRAGMA foreign_keys = ON');
        setDbInitialized(true);
      } catch (error) {
        console.error('Failed to initialize database:', error);
      }
    }

    if (fontsLoaded && !dbInitialized) {
      initDB();
    } else if (fontsLoaded && dbInitialized) {
      setIsReady(true);
    }
  }, [fontsLoaded, dbInitialized]);

  useEffect(() => {
    // Register background tasks when app starts
    registerBackgroundTasks().catch(console.error);
  }, []);

  useEffect(() => {
    async function prepare() {
      try {
        // Artificially delay for a smoother splash screen experience
        await new Promise(resolve => setTimeout(resolve, 2000));
        await SplashScreen.hideAsync();
      } catch (e) {
        console.warn(e);
      } finally {
        setIsReady(true);
      }
    }

    prepare();
  }, []);

  if (!fontsLoaded || !isReady) {
    return <Splash />;
  }

  return (
    <DatabaseProvider>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="+not-found" />
        </Stack>
        <StatusBar style="auto" />
      </ThemeProvider>
    </DatabaseProvider>
  );
}
