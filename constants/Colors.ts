/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

const tintColorLight = '#6366F1'; // Indigo 500
const tintColorDark = '#818CF8'; // Indigo 400

export const Colors = {
  light: {
    text: '#0F172A', // Slate 900
    textSecondary: '#64748B', // Slate 500
    background: '#F8FAFC', // Slate 50
    surface: '#FFFFFF',
    surfaceHighlight: '#F1F5F9', // Slate 100
    tint: tintColorLight,
    icon: '#64748B', // Slate 500
    tabIconDefault: '#94A3B8', // Slate 400
    tabIconSelected: tintColorLight,
    border: '#E2E8F0', // Slate 200

    // Semantic
    success: '#10B981', // Emerald 500
    successBackground: '#ECFDF5', // Emerald 50
    warning: '#F59E0B', // Amber 500
    warningBackground: '#FFFBEB', // Amber 50
    error: '#EF4444', // Red 500
    errorBackground: '#FEF2F2', // Red 50
    info: '#3B82F6', // Blue 500
    infoBackground: '#EFF6FF', // Blue 50
  },
  dark: {
    text: '#F8FAFC', // Slate 50
    textSecondary: '#94A3B8', // Slate 400
    background: '#020617', // Slate 950
    surface: '#0F172A', // Slate 900
    surfaceHighlight: '#1E293B', // Slate 800
    tint: tintColorDark,
    icon: '#94A3B8', // Slate 400
    tabIconDefault: '#64748B', // Slate 500
    tabIconSelected: tintColorDark,
    border: '#1E293B', // Slate 800

    // Semantic
    success: '#34D399', // Emerald 400
    successBackground: 'rgba(16, 185, 129, 0.1)',
    warning: '#FBBF24', // Amber 400
    warningBackground: 'rgba(245, 158, 11, 0.1)',
    error: '#F87171', // Red 400
    errorBackground: 'rgba(239, 68, 68, 0.1)',
    info: '#60A5FA', // Blue 400
    infoBackground: 'rgba(59, 130, 246, 0.1)',
  },
};
