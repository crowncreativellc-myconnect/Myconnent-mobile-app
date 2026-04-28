export interface ThemeColors {
  bg: string;
  bgCard: string;
  bgElevated: string;
  border: string;
  borderGlass: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  tabBar: string;
  tabBarBorder: string;
  glassSurface: string;
  glassBorder: string;
  glassHighlight: string;
  gradientBg: readonly [string, string, string];
  gradientCard: readonly [string, string];
  gradientElevated: readonly [string, string];
  gradientIdentity: readonly [string, string];
  gradientGold: readonly [string, string, string];
  goldText: string;
  goldSubText: string;
  goldTrack: string;
  isDark: boolean;
  statusBar: 'light' | 'dark';
}

export const darkColors: ThemeColors = {
  bg: '#0F1628',
  bgCard: '#1A2040',
  bgElevated: '#1D2545',
  border: '#2A3060',
  borderGlass: 'rgba(255,255,255,0.08)',
  textPrimary: '#F1F5FF',
  textSecondary: '#8892B0',
  textMuted: '#4A5578',
  tabBar: '#141832',
  tabBarBorder: '#2A3060',
  glassSurface: 'rgba(255,255,255,0.04)',
  glassBorder: 'rgba(255,255,255,0.08)',
  glassHighlight: 'rgba(255,255,255,0.12)',
  gradientBg: ['#07091A', '#0F1628', '#0F1535'],
  gradientCard: ['#1D2545', '#141832'],
  gradientElevated: ['#1E2447', '#141832'],
  gradientIdentity: ['#1A2347', '#0F1535'],
  gradientGold: ['#1A1508', '#2A2010', '#1A1508'],
  goldText: '#F6C90E',
  goldSubText: 'rgba(246,201,14,0.7)',
  goldTrack: 'rgba(255,255,255,0.10)',
  isDark: true,
  statusBar: 'light',
};

export const lightColors: ThemeColors = {
  bg: '#F4F6FF',
  bgCard: '#FFFFFF',
  bgElevated: '#EEF1FF',
  border: '#D4DAFF',
  borderGlass: 'rgba(10,14,39,0.08)',
  textPrimary: '#0A0E27',
  textSecondary: '#3A4370',
  textMuted: '#6B7CA4',
  tabBar: '#FFFFFF',
  tabBarBorder: '#E4E8FF',
  glassSurface: 'rgba(10,14,39,0.02)',
  glassBorder: 'rgba(10,14,39,0.07)',
  glassHighlight: 'rgba(10,14,39,0.04)',
  gradientBg: ['#EEF1FF', '#F4F6FF', '#F8F9FF'],
  gradientCard: ['#FFFFFF', '#F0F3FF'],
  gradientElevated: ['#FFFFFF', '#EEF1FF'],
  gradientIdentity: ['#EEF1FF', '#E4EAFF'],
  gradientGold: ['#FFFBEB', '#FEF3C7', '#FFFBEB'],
  goldText: '#92400E',
  goldSubText: 'rgba(146,64,14,0.75)',
  goldTrack: 'rgba(146,64,14,0.15)',
  isDark: false,
  statusBar: 'dark',
};
