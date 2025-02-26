import React from 'react';
import { useState, useEffect } from 'react';
import { StyleSheet, TextInput, ScrollView, ActivityIndicator } from 'react-native';
import { Stack, router } from 'expo-router';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { useBreeds } from '@/hooks/useBreeds';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { Breed } from '@/utils/database';

export default function NewBreedScreen() {
  const { addBreed, breeds } = useBreeds();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [pendingBreed, setPendingBreed] = useState<Omit<Breed, 'id'> | null>(null);
  
  const [form, setForm] = useState({
    name: '',
    min_temp_adult: '',
    max_temp_adult: '',
    min_temp_young: '',
    max_temp_young: '',
  });

  const [formErrors, setFormErrors] = useState({
    name: '',
    min_temp_adult: '',
    max_temp_adult: '',
    min_temp_young: '',
    max_temp_young: '',
  });

  // Real-time validation
  useEffect(() => {
    validateForm(false);
  }, [form]);

  const validateForm = (showAll = true) => {
    const errors = {
      name: '',
      min_temp_adult: '',
      max_temp_adult: '',
      min_temp_young: '',
      max_temp_young: '',
    };

      // Name validation
      if (!form.name.trim()) {
      errors.name = 'Breed name is required';
    } else if (form.name.length < 2) {
      errors.name = 'Name must be at least 2 characters';
    } else if (form.name.length > 50) {
      errors.name = 'Name must be less than 50 characters';
    } else if (breeds.some(b => b.name.toLowerCase() === form.name.trim().toLowerCase())) {
      errors.name = 'This breed name already exists';
    }

    // Temperature validations
      const minAdultTemp = parseFloat(form.min_temp_adult);
      const maxAdultTemp = parseFloat(form.max_temp_adult);
      const minYoungTemp = parseFloat(form.min_temp_young);
      const maxYoungTemp = parseFloat(form.max_temp_young);

    // Adult temperature validation
    if (isNaN(minAdultTemp)) {
      errors.min_temp_adult = 'Enter a valid number';
    } else if (minAdultTemp < 20 || minAdultTemp > 50) {
      errors.min_temp_adult = 'Must be between 20°C and 50°C';
    }

    if (isNaN(maxAdultTemp)) {
      errors.max_temp_adult = 'Enter a valid number';
    } else if (maxAdultTemp < 20 || maxAdultTemp > 50) {
      errors.max_temp_adult = 'Must be between 20°C and 50°C';
    } else if (!isNaN(minAdultTemp) && maxAdultTemp <= minAdultTemp) {
      errors.max_temp_adult = 'Must be higher than minimum';
    }

    // Young temperature validation
    if (isNaN(minYoungTemp)) {
      errors.min_temp_young = 'Enter a valid number';
    } else if (minYoungTemp < 20 || minYoungTemp > 50) {
      errors.min_temp_young = 'Must be between 20°C and 50°C';
    }

    if (isNaN(maxYoungTemp)) {
      errors.max_temp_young = 'Enter a valid number';
    } else if (maxYoungTemp < 20 || maxYoungTemp > 50) {
      errors.max_temp_young = 'Must be between 20°C and 50°C';
    } else if (!isNaN(minYoungTemp) && maxYoungTemp <= minYoungTemp) {
      errors.max_temp_young = 'Must be higher than minimum';
    }

    setFormErrors(errors);
    return !Object.values(errors).some(error => error !== '');
  };

  const handleSubmitRequest = async () => {
    if (!validateForm(true)) {
      return;
    }

    try {
      setError(null);

      // Create breed object
      const breed = {
        name: form.name.trim(),
        min_temp_adult: parseFloat(form.min_temp_adult),
        max_temp_adult: parseFloat(form.max_temp_adult),
        min_temp_young: parseFloat(form.min_temp_young),
        max_temp_young: parseFloat(form.max_temp_young),
      };

      setPendingBreed(breed);
      setShowConfirm(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to validate breed');
    }
  };

  const handleSubmitConfirm = async () => {
    if (!pendingBreed) return;
    
    try {
      setIsSubmitting(true);
      await addBreed(pendingBreed);
      router.back();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to add breed');
    } finally {
      setIsSubmitting(false);
      setShowConfirm(false);
    }
  };

  // Update getInputStyle to use formErrors
  const getInputStyle = (fieldName: keyof typeof formErrors) => {
    if (!form[fieldName]) return styles.input;
    return [
      styles.input,
      formErrors[fieldName] ? styles.inputError : styles.inputValid
    ];
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Add New Breed',
          headerStyle: {
            backgroundColor: '#D0D0D0',
          },
          headerTintColor: '#000',
          headerShadowVisible: false,
        }}
      />

      <ScrollView style={styles.container}>
        <ThemedView style={styles.form}>
          {/* Name Input */}
          <ThemedView style={styles.inputGroup}>
            <ThemedText style={styles.label}>Breed Name</ThemedText>
            <TextInput
              style={getInputStyle('name')}
              placeholder="Enter breed name"
              value={form.name}
              onChangeText={(text) => setForm(prev => ({ ...prev, name: text }))}
              autoCapitalize="words"
            />
            {formErrors.name && (
              <ThemedText style={styles.errorHelper}>{formErrors.name}</ThemedText>
            )}
          </ThemedView>

          {/* Adult Temperature Range */}
          <ThemedView style={styles.inputGroup}>
            <ThemedText style={styles.label}>Adult Temperature Range (°C)</ThemedText>
            <ThemedView style={styles.rangeRow}>
              <ThemedView style={styles.rangeField}>
                <ThemedText style={styles.rangeLabel}>Min</ThemedText>
                <ThemedView style={styles.temperatureInput}>
                  <TextInput
                    style={[getInputStyle('min_temp_adult'), styles.rangeInput]}
                    placeholder="38.0"
                    value={form.min_temp_adult}
                    onChangeText={(text) => setForm(prev => ({ ...prev, min_temp_adult: text }))}
                    keyboardType="decimal-pad"
                  />
                  <ThemedText style={styles.unit}>°C</ThemedText>
                </ThemedView>
                {formErrors.min_temp_adult && (
                  <ThemedText style={styles.errorHelper}>{formErrors.min_temp_adult}</ThemedText>
                )}
              </ThemedView>

              <ThemedText style={styles.rangeSeparator}>-</ThemedText>

              <ThemedView style={styles.rangeField}>
                <ThemedText style={styles.rangeLabel}>Max</ThemedText>
                <ThemedView style={styles.temperatureInput}>
                  <TextInput
                    style={[getInputStyle('max_temp_adult'), styles.rangeInput]}
                    placeholder="39.5"
                    value={form.max_temp_adult}
                    onChangeText={(text) => setForm(prev => ({ ...prev, max_temp_adult: text }))}
                    keyboardType="decimal-pad"
                  />
                  <ThemedText style={styles.unit}>°C</ThemedText>
                </ThemedView>
                {formErrors.max_temp_adult && (
                  <ThemedText style={styles.errorHelper}>{formErrors.max_temp_adult}</ThemedText>
                )}
              </ThemedView>
            </ThemedView>
          </ThemedView>

          {/* Young Temperature Range */}
          <ThemedView style={styles.inputGroup}>
            <ThemedText style={styles.label}>Young Temperature Range (°C)</ThemedText>
            <ThemedView style={styles.rangeRow}>
              <ThemedView style={styles.rangeField}>
                <ThemedText style={styles.rangeLabel}>Min</ThemedText>
                <ThemedView style={styles.temperatureInput}>
                  <TextInput
                    style={[getInputStyle('min_temp_young'), styles.rangeInput]}
                    placeholder="38.5"
                    value={form.min_temp_young}
                    onChangeText={(text) => setForm(prev => ({ ...prev, min_temp_young: text }))}
                    keyboardType="decimal-pad"
                  />
                  <ThemedText style={styles.unit}>°C</ThemedText>
                </ThemedView>
                {formErrors.min_temp_young && (
                  <ThemedText style={styles.errorHelper}>{formErrors.min_temp_young}</ThemedText>
                )}
              </ThemedView>

              <ThemedText style={styles.rangeSeparator}>-</ThemedText>

              <ThemedView style={styles.rangeField}>
                <ThemedText style={styles.rangeLabel}>Max</ThemedText>
                <ThemedView style={styles.temperatureInput}>
                  <TextInput
                    style={[getInputStyle('max_temp_young'), styles.rangeInput]}
                    placeholder="40.0"
                    value={form.max_temp_young}
                    onChangeText={(text) => setForm(prev => ({ ...prev, max_temp_young: text }))}
                    keyboardType="decimal-pad"
                  />
                  <ThemedText style={styles.unit}>°C</ThemedText>
                </ThemedView>
                {formErrors.max_temp_young && (
                  <ThemedText style={styles.errorHelper}>{formErrors.max_temp_young}</ThemedText>
                )}
              </ThemedView>
            </ThemedView>
          </ThemedView>

          {error && (
            <ThemedView style={styles.errorContainer}>
              <IconSymbol name="exclamationmark.triangle.fill" size={20} color="#FF453A" />
              <ThemedText style={styles.errorText}>{error}</ThemedText>
            </ThemedView>
          )}

          <ThemedView style={styles.buttonContainer}>
            <ThemedView 
              style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
              onTouchEnd={!isSubmitting ? handleSubmitRequest : undefined}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <ThemedText style={styles.submitButtonText}>Add Breed</ThemedText>
              )}
            </ThemedView>
          </ThemedView>
        </ThemedView>
      </ScrollView>

      {showConfirm && (
        <ConfirmDialog
          title="Add New Breed"
          message="Are you sure you want to add this breed?"
          icon="plus.circle.fill"
          iconColor="#007AFF"
          onConfirm={handleSubmitConfirm}
          onCancel={() => setShowConfirm(false)}
        />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  form: {
    padding: 16,
    gap: 20,
  },
  inputGroup: {
    gap: 8,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
  },
  input: {
    backgroundColor: 'rgba(142, 142, 147, 0.12)',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 10,
    fontSize: 16,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255, 69, 58, 0.1)',
    padding: 12,
    borderRadius: 8,
  },
  errorText: {
    color: '#FF453A',
    flex: 1,
  },
  buttonContainer: {
    marginTop: 12,
  },
  submitButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  rangeRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  rangeField: {
    flex: 1,
    gap: 4,
  },
  rangeLabel: {
    fontSize: 14,
    opacity: 0.7,
    marginBottom: 4,
  },
  rangeSeparator: {
    fontSize: 24,
    fontWeight: '300',
    opacity: 0.5,
    marginTop: 32,
  },
  temperatureInput: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(142, 142, 147, 0.12)',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  rangeInput: {
    flex: 1,
    fontSize: 16,
    padding: 0,
  },
  unit: {
    fontSize: 16,
    fontWeight: '600',
    opacity: 0.7,
  },
  errorHelper: {
    fontSize: 12,
    color: '#FF453A',
    marginTop: 4,
  },
  inputError: {
    color: '#FF453A',
  },
  inputValid: {
    color: '#30D158',
  },
}); 