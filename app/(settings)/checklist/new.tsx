import React from 'react';
import { useState, useEffect } from 'react';
import { StyleSheet, TextInput, ScrollView, ActivityIndicator } from 'react-native';
import { Stack, router } from 'expo-router';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { useChecklist } from '@/hooks/useChecklist';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import type { Checklist } from '@/utils/database';

export default function NewChecklistScreen() {
  const { addItem, items } = useChecklist();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [pendingItem, setPendingItem] = useState<Omit<Checklist, 'id'> | null>(null);
  
  const [form, setForm] = useState({
    symptom: '',
    risk_weight: '',
    treatment_recommendation: '',
  });

  const [formErrors, setFormErrors] = useState({
    symptom: '',
    risk_weight: '',
    treatment_recommendation: '',
  });

  const validateSymptom = async (symptom: string) => {
    if (!symptom.trim()) {
      return 'Symptom name is required';
    }
    if (symptom.length < 3) {
      return 'Symptom must be at least 3 characters';
    }
    if (symptom.length > 100) {
      return 'Symptom must be less than 100 characters';
    }

    // Check for duplicate symptoms (case-insensitive)
    const normalizedSymptom = symptom.trim().toLowerCase();
    const isDuplicate = items.some(item => item.symptom.toLowerCase() === normalizedSymptom);
    if (isDuplicate) {
      return 'This symptom already exists in the checklist';
    }

    return '';
  };

  const validateRiskWeight = (weight: string) => {
    const riskWeight = parseInt(weight);
    if (!weight) {
      return 'Risk weight is required';
    }
    if (isNaN(riskWeight)) {
      return 'Risk weight must be a number';
    }
    if (riskWeight < 1 || riskWeight > 5) {
      return 'Risk weight must be between 1 and 5';
    }
    return '';
  };

  const validateTreatment = (treatment: string) => {
    if (!treatment.trim()) {
      return 'Treatment recommendation is required';
    }
    if (treatment.length < 10) {
      return 'Treatment recommendation must be at least 10 characters';
    }
    return '';
  };

  const validateForm = async (showAll = true) => {
    const symptomError = await validateSymptom(form.symptom);
    
    const errors = {
      symptom: showAll ? symptomError : form.symptom ? symptomError : '',
      risk_weight: showAll ? validateRiskWeight(form.risk_weight) :
        form.risk_weight ? validateRiskWeight(form.risk_weight) : '',
      treatment_recommendation: showAll ? validateTreatment(form.treatment_recommendation) :
        form.treatment_recommendation ? validateTreatment(form.treatment_recommendation) : '',
    };

    setFormErrors(errors);
    return !Object.values(errors).some(error => error !== '');
  };

  // Update useEffect to handle async validation
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

      const item = {
        symptom: form.symptom.trim(),
        risk_weight: parseInt(form.risk_weight),
        treatment_recommendation: form.treatment_recommendation.trim(),
      };

      setPendingItem(item);
      setShowConfirm(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to validate checklist item');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitConfirm = async () => {
    if (!pendingItem) return;
    
    try {
      setIsSubmitting(true);
      await addItem(pendingItem);
      router.back();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to add checklist item');
    } finally {
      setIsSubmitting(false);
      setShowConfirm(false);
    }
  };

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
          title: 'Add Checklist Item',
          headerStyle: {
            backgroundColor: '#D0D0D0',
          },
          headerTintColor: '#000',
          headerShadowVisible: false,
        }}
      />

      <ScrollView style={styles.container}>
        <ThemedView style={styles.form}>
          {/* Symptom Input */}
          <ThemedView style={styles.inputGroup}>
            <ThemedText style={styles.label}>Symptom</ThemedText>
            <TextInput
              style={getInputStyle('symptom')}
              placeholder="Enter symptom name"
              value={form.symptom}
              onChangeText={(text) => setForm(prev => ({ ...prev, symptom: text }))}
            />
            {formErrors.symptom && (
              <ThemedText style={styles.errorHelper}>{formErrors.symptom}</ThemedText>
            )}
          </ThemedView>

          {/* Risk Weight Input */}
          <ThemedView style={styles.inputGroup}>
            <ThemedText style={styles.label}>Risk Weight (1-5)</ThemedText>
            <TextInput
              style={getInputStyle('risk_weight')}
              placeholder="Enter risk weight"
              value={form.risk_weight}
              onChangeText={(text) => setForm(prev => ({ ...prev, risk_weight: text }))}
              keyboardType="number-pad"
              maxLength={1}
            />
            {formErrors.risk_weight && (
              <ThemedText style={styles.errorHelper}>{formErrors.risk_weight}</ThemedText>
            )}
          </ThemedView>

          {/* Treatment Recommendation Input */}
          <ThemedView style={styles.inputGroup}>
            <ThemedText style={styles.label}>Treatment Recommendation</ThemedText>
            <TextInput
              style={[getInputStyle('treatment_recommendation'), styles.textArea]}
              placeholder="Enter treatment recommendation"
              value={form.treatment_recommendation}
              onChangeText={(text) => setForm(prev => ({ ...prev, treatment_recommendation: text }))}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
            {formErrors.treatment_recommendation && (
              <ThemedText style={styles.errorHelper}>
                {formErrors.treatment_recommendation}
              </ThemedText>
            )}
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
                <ThemedText style={styles.submitButtonText}>Add Checklist Item</ThemedText>
              )}
            </ThemedView>
          </ThemedView>
        </ThemedView>
      </ScrollView>

      {/* Confirmation Dialog */}
      {showConfirm && (
        <ConfirmDialog
          title="Add Checklist Item"
          message="Are you sure you want to add this checklist item?"
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
  textArea: {
    minHeight: 100,
    paddingTop: 12,
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
  errorHelper: {
    fontSize: 12,
    color: '#FF453A',
    marginTop: 4,
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
  inputError: {
    color: '#FF453A',
  },
  inputValid: {
    color: '#30D158',
  },
}); 