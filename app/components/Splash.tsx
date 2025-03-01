import React from 'react';
import { StyleSheet, View, Image, Text } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';

SplashScreen.preventAutoHideAsync();

export default function Splash() {
  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Image
          source={require('@/assets/images/pig.png')}
          style={styles.logo}
          resizeMode="contain"
        />
        <Text style={styles.title}>Thermo Track</Text>
        <Text style={styles.subtitle}>
          African Swine Fever{'\n'}Monitoring System
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1D3D47',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    alignItems: 'center',
    gap: 20,
  },
  logo: {
    width: 120,
    height: 120,
    marginBottom: 20,
  },
  title: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 18,
    color: '#A1CEDC',
    textAlign: 'center',
    lineHeight: 24,
  },
}); 