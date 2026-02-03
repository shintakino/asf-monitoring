import React from 'react';
import type { PropsWithChildren, ReactElement } from 'react';
import { StyleSheet, View, ScrollView } from 'react-native';
import { ThemedView } from '@/components/ThemedView';
import { useBottomTabOverflow } from '@/components/ui/TabBarBackground';
import { useColorScheme } from '@/hooks/useColorScheme';

type Props = PropsWithChildren<{
  headerImage: ReactElement;
  headerBackgroundColor: { dark: string; light: string };
}>;

export default function ParallaxScrollView({
  children,
  headerImage,
  headerBackgroundColor,
}: Props) {
  const colorScheme = useColorScheme() ?? 'light';
  const bottom = useBottomTabOverflow();

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: bottom }}>
        <View
          style={[
            styles.header,
            { backgroundColor: headerBackgroundColor[colorScheme] },
          ]}>
          {headerImage}
        </View>
        <ThemedView style={styles.content}>{children}</ThemedView>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    overflow: 'hidden',
    // Removed fixed height to allow flexible content
  },
  content: {
    flex: 1,
    padding: 20, // Reduced padding from 32 to 20 for better spacing
    gap: 16,
    overflow: 'hidden',
  },
});
