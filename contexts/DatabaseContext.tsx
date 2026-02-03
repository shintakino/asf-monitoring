import { createContext, useContext, useEffect, useState } from 'react';
import * as SQLite from 'expo-sqlite';
import { SQLiteProvider, useSQLiteContext } from 'expo-sqlite';
import { View, ActivityIndicator } from 'react-native';
import { initDatabase } from '@/utils/database';
import { ThemedText } from '@/components/ThemedText';

type DatabaseContextType = {
  isLoading: boolean;
  error: Error | null;
};

export type NotificationPreferences = {
  highRiskInterval: number; // minutes
  moderateRiskInterval: number;
  quietHoursStart: string;
  quietHoursEnd: string;
  trendAlerts: boolean;
  soundEnabled: boolean;
};

const DatabaseContext = createContext<{
  isLoading: boolean;
  error: Error | null;
  notificationPreferences: NotificationPreferences;
  updateNotificationPreferences: (prefs: Partial<NotificationPreferences>) => Promise<void>;
}>({
  isLoading: true,
  error: null,
  notificationPreferences: {
    highRiskInterval: 0,
    moderateRiskInterval: 0,
    quietHoursStart: '',
    quietHoursEnd: '',
    trendAlerts: false,
    soundEnabled: false,
  },
  updateNotificationPreferences: async () => { },
});

export function DatabaseProvider({ children }: { children: React.ReactNode }) {
  const [error, setError] = useState<Error | null>(null);

  const handleError = (e: Error) => {
    console.error('Database initialization failed:', e);
    setError(e);
  };

  if (error) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ThemedText style={{ color: 'red' }}>Database Error: {error.message}</ThemedText>
      </View>
    );
  }

  return (
    <SQLiteProvider
      databaseName="asf_monitor.db"
      onInit={initDatabase}
      useSuspense
    >
      <DatabaseContext.Provider value={{
        isLoading: false, error: null, notificationPreferences: {
          highRiskInterval: 0,
          moderateRiskInterval: 0,
          quietHoursStart: '',
          quietHoursEnd: '',
          trendAlerts: false,
          soundEnabled: false,
        }, updateNotificationPreferences: async () => { }
      }}>
        {children}
      </DatabaseContext.Provider>
    </SQLiteProvider>
  );
}

export function useDatabase() {
  const context = useContext(DatabaseContext);
  const db = useSQLiteContext();
  if (context === undefined) {
    throw new Error('useDatabase must be used within a DatabaseProvider');
  }
  return { ...context, database: db };
} 
