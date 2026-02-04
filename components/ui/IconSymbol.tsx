// This file is a fallback for using MaterialIcons on Android and web.

import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { SymbolWeight } from 'expo-symbols';
import React from 'react';
import { OpaqueColorValue, StyleProp, TextStyle, ViewStyle } from 'react-native';

// Add your SFSymbol to MaterialIcons mappings here.
const MAPPING = {
  // See MaterialIcons here: https://icons.expo.fyi
  // See SF Symbols in the SF Symbols app on Mac.
  'house.fill': 'home',
  'paperplane.fill': 'send',
  'chevron.left.forwardslash.chevron.right': 'code',
  'chevron.right': 'chevron-right',
  'chevron.left': 'chevron-left',
  'bell.fill': 'notifications',
  'bell.badge.fill': 'notifications-active',
  'exclamationmark.triangle.fill': 'warning',
  'exclamationmark.circle.fill': 'error',
  'clock.fill': 'schedule',
  'clock': 'schedule',
  'checkmark.shield.fill': 'verified-user',
  'info.circle.fill': 'info',
  'arrow.right': 'arrow-forward',
  'thermometer': 'thermostat',
  'bandage': 'healing',
  'list.bullet': 'list',
  'person.2.fill': 'people',
  'person.fill': 'person',
  'pencil': 'edit',
  'trash': 'delete',
  'pawprint.fill': 'pets',
  'checkmark.circle.fill': 'check-circle',
  'plus.circle.fill': 'add-circle',
  'magnifyingglass': 'search',
  'wifi.slash': 'wifi-off',
  'calendar': 'calendar-today',
  'ellipsis': 'more-horiz',
} as Partial<
  Record<
    import('expo-symbols').SymbolViewProps['name'],
    React.ComponentProps<typeof MaterialIcons>['name']
  >
>;

export type IconSymbolName = keyof typeof MAPPING;

/**
 * An icon component that uses native SFSymbols on iOS, and MaterialIcons on Android and web. This ensures a consistent look across platforms, and optimal resource usage.
 *
 * Icon `name`s are based on SFSymbols and require manual mapping to MaterialIcons.
 */
export function IconSymbol({
  name,
  size = 24,
  color,
  style,
}: {
  name: IconSymbolName;
  size?: number;
  color: string | OpaqueColorValue;
  style?: StyleProp<TextStyle>;
  weight?: SymbolWeight;
}) {
  return <MaterialIcons color={color} size={size} name={MAPPING[name]} style={style} />;
}
