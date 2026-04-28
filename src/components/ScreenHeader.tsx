import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { BlurView } from 'expo-blur';
import { useTheme } from '../hooks/useTheme';

interface ScreenHeaderProps {
  title: string;
  titleIcon?: React.ReactNode;
  rightElement?: React.ReactNode;
  onBack?: () => void;
  transparent?: boolean;
}

export function ScreenHeader({
  title,
  titleIcon,
  rightElement,
  onBack,
  transparent = false,
}: ScreenHeaderProps) {
  const { colors } = useTheme();

  const content = (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 14,
        borderBottomWidth: 1,
        borderBottomColor: transparent ? colors.borderGlass : colors.border,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
        {onBack && (
          <TouchableOpacity
            onPress={onBack}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 16 }}
            style={{ marginRight: 12 }}
          >
            <Text style={{ color: '#4F6EF7', fontSize: 20 }}>‹</Text>
          </TouchableOpacity>
        )}
        <Text style={{ color: colors.textPrimary, fontSize: 20, fontFamily: 'Inter-Bold' }}>{title}</Text>
        {titleIcon && <View style={{ marginLeft: 8 }}>{titleIcon}</View>}
      </View>
      {rightElement && <View>{rightElement}</View>}
    </View>
  );

  if (transparent) {
    return (
      <BlurView
        intensity={20}
        tint={colors.isDark ? 'dark' : 'light'}
        style={{ overflow: 'hidden' }}
      >
        {content}
      </BlurView>
    );
  }

  return (
    <View style={{ backgroundColor: colors.bgCard }}>
      {content}
    </View>
  );
}
