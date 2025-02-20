import { createContext, useContext, useEffect, useState } from 'react';
import { initDatabase } from '@/utils/database';
import { SQLiteProvider } from 'expo-sqlite';
import type { SQLiteDatabase } from 'expo-sqlite';

type DatabaseContextType = {
  database: SQLiteDatabase | null;
  isLoading: boolean;
  error: Error | null;
};

const DatabaseContext = createContext<DatabaseContextType>({
  database: null,
  isLoading: true,
  error: null,
});

export function DatabaseProvider({ children }: { children: React.ReactNode }) {
  return (
    <SQLiteProvider databaseName="asf_monitor.db" onInit={async (db) => {
      try {
        // Enable WAL mode and foreign keys
        await db.execAsync('PRAGMA journal_mode = WAL');
        await db.execAsync('PRAGMA foreign_keys = ON');

        // Create Breeds table if it doesn't exist
        await db.execAsync(`
          CREATE TABLE IF NOT EXISTS Breeds (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL UNIQUE,
            min_temp_adult REAL NOT NULL,
            max_temp_adult REAL NOT NULL,
            min_temp_young REAL NOT NULL,
            max_temp_young REAL NOT NULL
          )
        `);

        // Create Pigs table if it doesn't exist
        await db.execAsync(`
          CREATE TABLE IF NOT EXISTS Pigs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            age INTEGER NOT NULL,
            weight REAL NOT NULL,
            category TEXT CHECK(category IN ('Adult', 'Young')) NOT NULL,
            breed_id INTEGER NOT NULL,
            image TEXT,
            FOREIGN KEY (breed_id) REFERENCES Breeds(id) ON DELETE CASCADE
          )
        `);
      } catch (e) {
        console.error('Database initialization failed:', e);
        throw e;
      }
    }}>
      {children}
    </SQLiteProvider>
  );
}

export function useDatabase() {
  const context = useContext(DatabaseContext);
  if (context === undefined) {
    throw new Error('useDatabase must be used within a DatabaseProvider');
  }
  return context;
} 