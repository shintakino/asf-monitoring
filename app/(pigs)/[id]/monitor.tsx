import { useState } from 'react';
import { StyleSheet, TextInput, ScrollView, ActivityIndicator } from 'react-native';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { usePigs } from '@/hooks/usePigs';
import { useChecklist } from '@/hooks/useChecklist';
import { useMonitoring } from '@/hooks/useMonitoring';
import { ConfirmDialog } from '@/components/ConfirmDialog';

export default function MonitorPigScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { pigs } = usePigs();
  const { items: checklistItems } = useChecklist();
  const { addRecord } = useMonitoring(parseInt(id));
  const pig = pigs.find(p => p.id === parseInt(id));
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);

  const [form, setForm] = useState({
    temperature: '',
    date: new Date().toISOString().split('T')[0],
    notes: '',
    checklist: {} as Record<number, boolean>,
  });

  const [formErrors, setFormErrors] = useState({
    temperature: '',
  });

  const validateTemperature = (temp: string) => {
    if (!temp) return 'Temperature is required';
    const tempNum = parseFloat(temp);
    if (isNaN(tempNum)) return 'Enter a valid temperature';
    if (tempNum < 35 || tempNum > 43) return 'Temperature must be between 35°C and 43°C';
    return '';
  };

  const handleSubmit = async () => {
    const tempError = validateTemperature(form.temperature);
    if (tempError) {
      setFormErrors(prev => ({ ...prev, temperature: tempError }));
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      await addRecord(
        parseFloat(form.temperature),
        form.checklist,
        form.notes
      );
      router.back();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save monitoring data');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!pig) return null;

  return (
    <>
      <Stack.Screen 
        options={{
          title: `Monitor ${pig.name}`,
          headerRight: () => (
            <ThemedView style={styles.headerRight}>
              <IconSymbol name="chart.line.uptrend.xyaxis" size={24} color="#007AFF" />
            </ThemedView>
          ),
        }} 
      />

      <ScrollView style={styles.container}>
        <ThemedView style={styles.form}>
          {/* Temperature Section */}
          <ThemedView style={styles.section}>
            <ThemedText style={styles.sectionTitle}>Temperature Reading</ThemedText>
            <ThemedView style={styles.inputGroup}>
              <ThemedText style={styles.label}>Temperature (°C)</ThemedText>
              <ThemedView style={styles.temperatureInput}>
                <TextInput
                  style={[styles.input, formErrors.temperature && styles.inputError]}
                  placeholder="Enter temperature"
                  placeholderTextColor="rgba(255, 255, 255, 0.4)"
                  value={form.temperature}
                  onChangeText={(text) => setForm(prev => ({ ...prev, temperature: text }))}
                  keyboardType="decimal-pad"
                />
                <ThemedText style={styles.unit}>°C</ThemedText>
              </ThemedView>
              {formErrors.temperature && (
                <ThemedText style={styles.errorHelper}>{formErrors.temperature}</ThemedText>
              )}
            </ThemedView>
          </ThemedView>

          {/* Checklist Section */}
          <ThemedView style={styles.section}>
            <ThemedText style={styles.sectionTitle}>Health Checklist</ThemedText>
            <ThemedView style={styles.checklist}>
              {checklistItems.map(item => (
                <ThemedView key={item.id} style={styles.checklistItem}>
                  <ThemedView 
                    style={[
                      styles.checkbox,
                      form.checklist[item.id] && styles.checkboxChecked
                    ]}
                    onTouchEnd={() => setForm(prev => ({
                      ...prev,
                      checklist: {
                        ...prev.checklist,
                        [item.id]: !prev.checklist[item.id]
                      }
                    }))}
                  >
                    {form.checklist[item.id] && (
                      <IconSymbol name="checkmark" size={16} color="#FFFFFF" />
                    )}
                  </ThemedView>
                  <ThemedText style={styles.checklistText}>{item.symptom}</ThemedText>
                </ThemedView>
              ))}
            </ThemedView>
          </ThemedView>

          {/* Notes Section */}
          <ThemedView style={styles.section}>
            <ThemedText style={styles.sectionTitle}>Observations</ThemedText>
            <ThemedView style={styles.inputGroup}>
              <ThemedText style={styles.label}>Additional Notes</ThemedText>
              <TextInput
                style={[styles.input, styles.notesInput]}
                placeholder="Add any observations or notes"
                placeholderTextColor="rgba(255, 255, 255, 0.4)"
                value={form.notes}
                onChangeText={(text) => setForm(prev => ({ ...prev, notes: text }))}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </ThemedView>
          </ThemedView>

          {/* Error Display */}
          {error && (
            <ThemedView style={styles.errorContainer}>
              <IconSymbol name="exclamationmark.triangle.fill" size={20} color="#FF453A" />
              <ThemedText style={styles.errorText}>{error}</ThemedText>
            </ThemedView>
          )}

          {/* Submit Button */}
          <ThemedView style={styles.buttonContainer}>
            <ThemedView 
              style={[
                styles.submitButton,
                (!form.temperature || isSubmitting) && styles.submitButtonDisabled
              ]}
              onTouchEnd={handleSubmit}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <ThemedText style={styles.submitButtonText}>Save Monitoring Data</ThemedText>
              )}
            </ThemedView>
          </ThemedView>

          {/* Footer */}
          <ThemedView style={styles.footer}>
            <ThemedText style={styles.footerText}>
              Regular temperature monitoring and health checks help detect potential health issues early.
            </ThemedText>
            <ThemedView style={styles.footerDivider} />
            <ThemedView style={styles.guideSection}>
              <ThemedText style={styles.guideTitle}>Temperature Guide:</ThemedText>
              <ThemedView style={styles.guideItems}>
                <ThemedView style={styles.guideItem}>
                  <IconSymbol name="thermometer" size={12} color="#30D158" />
                  <ThemedText style={styles.guideText}>Normal: 38.0°C - 40.0°C</ThemedText>
                </ThemedView>
                <ThemedView style={styles.guideItem}>
                  <IconSymbol name="exclamationmark.triangle.fill" size={12} color="#FF9500" />
                  <ThemedText style={styles.guideText}>Warning: Below 38.0°C or Above 40.0°C</ThemedText>
                </ThemedView>
              </ThemedView>
            </ThemedView>
          </ThemedView>
        </ThemedView>
      </ScrollView>

      {showConfirm && (
        <ConfirmDialog
          title="Confirm Submission"
          message="Are you sure you want to save this monitoring data?"
          onConfirm={handleSubmit}
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
    gap: 24,
  },
  section: {
    gap: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  inputGroup: {
    gap: 8,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    opacity: 0.8,
  },
  temperatureInput: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  input: {
    flex: 1,
    backgroundColor: 'rgba(142, 142, 147, 0.12)',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 10,
    fontSize: 16,
    color: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(142, 142, 147, 0.2)',
  },
  inputError: {
    borderColor: '#FF453A',
  },
  unit: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  errorHelper: {
    fontSize: 12,
    color: '#FF453A',
    marginTop: 4,
    fontWeight: '500',
  },
  checklist: {
    gap: 12,
  },
  checklistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(142, 142, 147, 0.12)',
    padding: 12,
    borderRadius: 10,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#007AFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#007AFF',
  },
  checklistText: {
    fontSize: 16,
    color: '#FFFFFF',
    flex: 1,
  },
  notesInput: {
    height: 100,
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
  footer: {
    marginTop: 32,
    gap: 16,
    opacity: 0.8,
  },
  footerText: {
    fontSize: 14,
    textAlign: 'center',
    color: '#FFFFFF',
    opacity: 0.7,
    lineHeight: 20,
  },
  footerDivider: {
    height: 1,
    backgroundColor: 'rgba(142, 142, 147, 0.2)',
    marginVertical: 8,
  },
  guideSection: {
    gap: 12,
  },
  guideTitle: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    color: '#FFFFFF',
    opacity: 0.9,
  },
  guideItems: {
    gap: 8,
  },
  guideItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    justifyContent: 'center',
  },
  guideText: {
    fontSize: 13,
    color: '#FFFFFF',
    opacity: 0.8,
  },
  headerRight: {
    marginRight: 16,
  },
}); 