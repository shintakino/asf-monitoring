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

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [isReady, setIsReady] = useState(false);
  const [dbInitialized, setDbInitialized] = useState(false);
  const [loaded] = useFonts({
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

    if (loaded && !dbInitialized) {
      initDB();
    } else if (loaded && dbInitialized) {
      setIsReady(true);
    }
  }, [loaded, dbInitialized]);

  useEffect(() => {
    // Register background tasks when app starts
    registerBackgroundTasks().catch(console.error);
  }, []);

  if (!isReady) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
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
