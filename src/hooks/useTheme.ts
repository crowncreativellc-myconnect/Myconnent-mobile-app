import { useColorScheme } from 'react-native';
import { useThemeStore, type ThemeMode } from '../store/themeStore';
import { darkColors, lightColors, type ThemeColors } from '../theme';

export function useTheme(): {
  colors: ThemeColors;
  mode: ThemeMode;
  isDark: boolean;
  setMode: (mode: ThemeMode) => void;
} {
  const systemScheme = useColorScheme();
  const { mode, setMode } = useThemeStore();

  const isDark = mode === 'system' ? systemScheme === 'dark' : mode === 'dark';
  const colors = isDark ? darkColors : lightColors;

  return { colors, mode, isDark, setMode };
}
