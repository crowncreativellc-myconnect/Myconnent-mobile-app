import React, { useState, forwardRef } from 'react';
import {
  TextInput,
  TextInputProps,
  View,
  Text,
  TouchableOpacity,
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

  return (
    <View className={cn('w-full', containerClassName)}>
      {label && (
        <Text className="text-text-secondary text-sm font-medium mb-1.5">
          {label}
        </Text>
      )}

      <View
        className={cn(
          'flex-row items-center bg-surface-card rounded-2xl border px-4',
          isFocused ? 'border-brand-primary' : 'border-surface-border',
          error ? 'border-brand-danger' : '',
        )}
      >
        {leftIcon && <View className="mr-3">{leftIcon}</View>}

        <TextInput
          ref={ref}
          placeholderTextColor="#4A5578"
          className={cn(
            'flex-1 text-text-primary text-base py-3.5',
            inputClassName,
          )}
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
    </View>
  );
});
