import { useState, useRef, useEffect } from 'react';
import { StyleSheet, ScrollView, Animated, Easing } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';

interface Option {
  value: string;
  label: string;
}

interface DropdownSelectProps {
  value?: string;
  options: Option[];
  placeholder?: string;
  onChange: (value: string) => void;
  error?: string;
}

export function DropdownSelect({
  value,
  options,
  placeholder = 'Select an option',
  onChange,
  error,
}: DropdownSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownAnimation = useRef(new Animated.Value(0)).current;
  const scrollViewRef = useRef<ScrollView>(null);
  
  const selectedOption = options.find(opt => opt.value === value);

  // Animate dropdown opening/closing
  useEffect(() => {
    Animated.timing(dropdownAnimation, {
      toValue: isOpen ? 1 : 0,
      duration: 200,
      easing: Easing.bezier(0.4, 0, 0.2, 1),
      useNativeDriver: true,
    }).start();
  }, [isOpen]);

  // Scroll to selected option when dropdown opens
  useEffect(() => {
    if (isOpen && value && scrollViewRef.current) {
      const selectedIndex = options.findIndex(opt => opt.value === value);
      if (selectedIndex !== -1) {
        setTimeout(() => {
          scrollViewRef.current?.scrollTo({
            y: selectedIndex * 48, // 48 is the height of each option
            animated: true,
          });
        }, 100);
      }
    }
  }, [isOpen, value, options]);

  const dropdownStyle = {
    opacity: dropdownAnimation,
    transform: [{
      translateY: dropdownAnimation.interpolate({
        inputRange: [0, 1],
        outputRange: [-20, 0],
      }),
    }],
  };

  return (
    <ThemedView style={styles.container}>
      <ThemedView 
        style={[styles.trigger, error && styles.triggerError]} 
        onTouchEnd={() => setIsOpen(!isOpen)}
      >
        <ThemedText style={[
          styles.triggerText,
          !selectedOption && styles.placeholder
        ]}>
          {selectedOption?.label || placeholder}
        </ThemedText>
        <Animated.View style={{
          transform: [{
            rotate: dropdownAnimation.interpolate({
              inputRange: [0, 1],
              outputRange: ['0deg', '180deg'],
            }),
          }],
        }}>
          <IconSymbol 
            name="chevron.down"
            size={20} 
            color="#8E8E93" 
          />
        </Animated.View>
      </ThemedView>

      {isOpen && (
        <Animated.View style={[styles.dropdown, dropdownStyle]}>
          <ScrollView 
            ref={scrollViewRef}
            style={styles.optionsList} 
            bounces={false}
            showsVerticalScrollIndicator={true}
            contentContainerStyle={styles.optionsListContent}
          >
            {options.map((option) => (
              <ThemedView
                key={option.value}
                style={[
                  styles.option,
                  option.value === value && styles.optionSelected
                ]}
                onTouchEnd={() => {
                  onChange(option.value);
                  setIsOpen(false);
                }}
              >
                <ThemedText style={[
                  styles.optionText,
                  option.value === value && styles.optionTextSelected
                ]}>
                  {option.label}
                </ThemedText>
                {option.value === value && (
                  <IconSymbol name="checkmark" size={20} color="#007AFF" />
                )}
              </ThemedView>
            ))}
          </ScrollView>
        </Animated.View>
      )}

      {error && (
        <ThemedText style={styles.errorText}>{error}</ThemedText>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    zIndex: 1,
  },
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(142, 142, 147, 0.12)',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(142, 142, 147, 0.2)',
  },
  triggerError: {
    borderWidth: 1,
    borderColor: '#FF453A',
  },
  triggerText: {
    fontSize: 16,
    color: '#000000',
  },
  placeholder: {
    color: 'rgba(0, 0, 0, 0.4)',
  },
  dropdown: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    marginTop: 4,
    maxHeight: 200,
    zIndex: 1000,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  optionsList: {
    padding: 8,
  },
  optionsListContent: {
    paddingBottom: 8,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    height: 48,
  },
  optionSelected: {
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
  },
  optionText: {
    fontSize: 16,
    color: '#000000',
  },
  optionTextSelected: {
    color: '#007AFF',
    fontWeight: '600',
  },
  errorText: {
    fontSize: 12,
    color: '#FF453A',
    marginTop: 4,
    fontWeight: '500',
  },
}); 