import React from 'react';
import { useState, useEffect } from 'react';
import { StyleSheet, TextInput, ScrollView, ActivityIndicator } from 'react-native';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { useBreeds } from '@/hooks/useBreeds';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { Breed } from '@/utils/database';

export default function EditBreedScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { breeds, updateBreed, isLoading } = useBreeds();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [pendingUpdate, setPendingUpdate] = useState<Breed | null>(null);
  
  const [formErrors, setFormErrors] = useState({
    name: '',
    min_temp_adult: '',
    max_temp_adult: '',
    min_temp_young: '',
    max_temp_young: '',
  });
  
  const breed = breeds.find(b => b.id === parseInt(id));
  
  const [form, setForm] = useState({
    name: breed?.name ?? '',
    min_temp_adult: breed?.min_temp_adult.toString() ?? '',
    max_temp_adult: breed?.max_temp_adult.toString() ?? '',
    min_temp_young: breed?.min_temp_young.toString() ?? '',
    max_temp_young: breed?.max_temp_young.toString() ?? '',
  });

  useEffect(() => {
    if (breed) {
      setForm({
        name: breed.name,
        min_temp_adult: breed.min_temp_adult.toString(),
        max_temp_adult: breed.max_temp_adult.toString(),
        min_temp_young: breed.min_temp_young.toString(),
        max_temp_young: breed.max_temp_young.toString(),
      });
    }
  }, [breed]);
  
  useEffect(() => {
    if (!breed && !isLoading) {
      router.back();
    }
  }, [breed, isLoading]);

  const validateName = async (name: string) => {
    if (!name.trim()) {
      return 'Breed name is required';
    }
    if (name.length < 2) {
      return 'Name must be at least 2 characters';
    }
    if (name.length > 50) {
      return 'Name must be less than 50 characters';
    }

    // Check for duplicate breeds (case-insensitive), excluding the current breed
    const normalizedName = name.trim().toLowerCase();
    const isDuplicate = breeds.some(b => 
      b.id !== parseInt(id) && 
      b.name.toLowerCase() === normalizedName
    );
    if (isDuplicate) {
      return 'This breed name already exists';
    }

    return '';
  };

  const validateTemperature = (value: string, type: 'min' | 'max', reference?: number) => {
    const temp = parseFloat(value);
    if (isNaN(temp)) {
      return 'Enter a valid number';
    }
    if (temp < 20 || temp > 50) {
      return 'Must be between 20°C and 50°C';
    }
    if (type === 'max' && reference !== undefined && temp <= reference) {
      return 'Must be higher than minimum';
    }
    return '';
  };

  const validateForm = async (showAll = true) => {
    const nameError = await validateName(form.name);
    const minAdultTemp = parseFloat(form.min_temp_adult);
    const maxAdultTemp = parseFloat(form.max_temp_adult);
    const minYoungTemp = parseFloat(form.min_temp_young);
    const maxYoungTemp = parseFloat(form.max_temp_young);

    const errors = {
      name: showAll ? nameError : form.name ? nameError : '',
      min_temp_adult: showAll ? validateTemperature(form.min_temp_adult, 'min') :
        form.min_temp_adult ? validateTemperature(form.min_temp_adult, 'min') : '',
      max_temp_adult: showAll ? validateTemperature(form.max_temp_adult, 'max', minAdultTemp) :
        form.max_temp_adult ? validateTemperature(form.max_temp_adult, 'max', minAdultTemp) : '',
      min_temp_young: showAll ? validateTemperature(form.min_temp_young, 'min') :
        form.min_temp_young ? validateTemperature(form.min_temp_young, 'min') : '',
      max_temp_young: showAll ? validateTemperature(form.max_temp_young, 'max', minYoungTemp) :
        form.max_temp_young ? validateTemperature(form.max_temp_young, 'max', minYoungTemp) : '',
    };

    setFormErrors(errors);
    return !Object.values(errors).some(error => error !== '');
  };

  const getInputStyle = (fieldName: keyof typeof formErrors) => {
    if (!form[fieldName]) return styles.input;
    return [
      styles.input,
      formErrors[fieldName] ? styles.inputError : styles.inputValid
    ];
  };

  useEffect(() => {
    const validateAsync = async () => {
      await validateForm(false);
    };
    validateAsync();
  }, [form]);

  const handleSubmitRequest = async () => {
    const isValid = await validateForm(true);
    if (!isValid) {
      return;
    }

    try {
      setError(null);
      setIsSubmitting(true);

      const updatedBreed = {
        id: parseInt(id),
        name: form.name.trim(),
        min_temp_adult: parseFloat(form.min_temp_adult),
        max_temp_adult: parseFloat(form.max_temp_adult),
        min_temp_young: parseFloat(form.min_temp_young),
        max_temp_young: parseFloat(form.max_temp_young),
      };

      setPendingUpdate(updatedBreed);
      setShowConfirm(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to validate breed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitConfirm = async () => {
    if (!pendingUpdate) return;
    
    try {
      setIsSubmitting(true);
      await updateBreed(pendingUpdate);
      router.back();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to update breed');
    } finally {
      setIsSubmitting(false);
      setShowConfirm(false);
    }
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Edit Breed',
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
                <ThemedText style={styles.submitButtonText}>Update Breed</ThemedText>
              )}
            </ThemedView>
          </ThemedView>
        </ThemedView>
      </ScrollView>

      {showConfirm && (
        <ConfirmDialog
          title="Update Breed"
          message="Are you sure you want to update this breed?"
          icon="pencil.circle.fill"
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
  rangeContainer: {
    flexDirection: 'column',
    gap: 12,
  },
  rangeInputGroup: {
    flex: 1,
    gap: 4,
  },
  rangeLabel: {
    fontSize: 14,
    opacity: 0.7,
  },
  temperatureInput: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  rangeInput: {
    flex: 1,
  },
  unit: {
    fontSize: 16,
    fontWeight: '600',
    width: 30,
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
  rangeSeparator: {
    fontSize: 24,
    fontWeight: '300',
    opacity: 0.5,
    marginTop: 32,
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