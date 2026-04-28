import React, { useState, useRef, useEffect, forwardRef } from 'react';
import {
  TextInput,
  TextInputProps,
  View,
  Text,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { cn } from '../utils';

interface InputProps extends Omit<TextInputProps, 'style'> {
  label?: string;
  error?: string;
  hint?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  onRightIconPress?: () => void;
  containerClassName?: string;
  inputClassName?: string;
}

export const Input = forwardRef<TextInput, InputProps>(function Input(
  {
    label,
    error,
    hint,
    leftIcon,
    rightIcon,
    onRightIconPress,
    containerClassName,
    inputClassName,
    ...props
  },
  ref,
) {
  const [isFocused, setIsFocused] = useState(false);
  const focusAnim = useRef(new Animated.Value(0)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const prevErrorRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    Animated.timing(focusAnim, {
      toValue: isFocused ? 1 : 0,
      duration: 150,
      useNativeDriver: true,
    }).start();
  }, [isFocused, focusAnim]);

  useEffect(() => {
    if (error && error !== prevErrorRef.current) {
      Animated.sequence([
        Animated.timing(shakeAnim, { toValue: 4, duration: 50, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: -4, duration: 50, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 4, duration: 50, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: -4, duration: 50, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
      ]).start();
    }
    prevErrorRef.current = error;
  }, [error, shakeAnim]);

  return (
    <Animated.View
      className={cn('w-full', containerClassName)}
      style={{ transform: [{ translateX: shakeAnim }] }}
    >
      {label && (
        <Text className="text-text-secondary text-sm font-medium mb-1.5">{label}</Text>
      )}

      <View
        style={{ position: 'relative' }}
        className={cn(
          'flex-row items-center bg-surface-card rounded-2xl border px-4',
          error
            ? 'border-brand-danger'
            : isFocused
            ? 'border-brand-primary'
            : 'border-surface-border',
        )}
      >
        {/* Animated focus glow overlay */}
        <Animated.View
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: -1,
            left: -1,
            right: -1,
            bottom: -1,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: '#4F6EF7',
            opacity: error ? 0 : focusAnim,
          }}
        />

        {leftIcon && <View className="mr-3">{leftIcon}</View>}

        <TextInput
          ref={ref}
          placeholderTextColor="#4A5578"
          className={cn('flex-1 text-text-primary text-base py-3.5', inputClassName)}
          onFocus={(e) => {
            setIsFocused(true);
            props.onFocus?.(e);
          }}
          onBlur={(e) => {
            setIsFocused(false);
            props.onBlur?.(e);
          }}
          {...props}
        />

        {rightIcon && (
          <TouchableOpacity
            onPress={onRightIconPress}
            disabled={!onRightIconPress}
            className="ml-3"
          >
            {rightIcon}
          </TouchableOpacity>
        )}
      </View>

      {error ? (
        <Text className="text-brand-danger text-xs mt-1.5">{error}</Text>
      ) : hint ? (
        <Text className="text-text-muted text-xs mt-1.5">{hint}</Text>
      ) : null}
    </Animated.View>
  );
});
