import React from 'react';
import { useState, useEffect } from 'react';
import { StyleSheet, TextInput, ScrollView, ActivityIndicator, Image } from 'react-native';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { usePigs } from '@/hooks/usePigs';
import { useBreeds } from '@/hooks/useBreeds';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import type { Pig } from '@/utils/database';
import * as ImagePicker from 'expo-image-picker';
import { ImagePickerButton } from '@/components/ImagePickerButton';
import { DropdownSelect } from '@/components/DropdownSelect';

export default function EditPigScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { pigs, updatePig, isLoading } = usePigs();
  const { breeds } = useBreeds();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [pendingUpdate, setPendingUpdate] = useState<Pig | null>(null);
  
  const pig = pigs.find(p => p.id === parseInt(id));
  
  const [form, setForm] = useState({
    name: pig?.name ?? '',
    age: pig?.age.toString() ?? '',
    weight: pig?.weight.toString() ?? '',
    category: pig?.category ?? 'Adult',
    breed_id: pig?.breed_id.toString() ?? '',
    image: pig?.image ?? '',
  });

  const [formErrors, setFormErrors] = useState({
    name: '',
    age: '',
    weight: '',
    breed_id: '',
  });

  // Initialize form with pig data
  useEffect(() => {
    if (pig) {
      setForm({
        name: pig.name,
        age: pig.age.toString(),
        weight: pig.weight.toString(),
        category: pig.category,
        breed_id: pig.breed_id.toString(),
        image: pig.image ?? '',
      });
    }
  }, [pig]);

  // Redirect if pig not found
  useEffect(() => {
    if (!pig && !isLoading) {
      router.back();
    }
  }, [pig, isLoading]);

  const validateName = async (name: string) => {
    if (!name.trim()) {
      return 'Name is required';
    }
    if (name.length < 2) {
      return 'Name must be at least 2 characters';
    }

    // Check for duplicate names (case-insensitive), excluding the current pig
    const normalizedName = name.trim().toLowerCase();
    const isDuplicate = pigs.some(p => 
      p.id !== parseInt(id) && 
      p.name.toLowerCase() === normalizedName
    );
    if (isDuplicate) {
      return 'A pig with this name already exists';
    }

    return '';
  };

  const validateAge = (age: string) => {
    if (!age) return 'Age is required';
    const ageNum = parseInt(age);
    if (isNaN(ageNum) || ageNum < 0) return 'Enter a valid age';
    if (ageNum > 240) return 'Age cannot exceed 240 months';
    return '';
  };

  const validateWeight = (weight: string) => {
    if (!weight) return 'Weight is required';
    const weightNum = parseFloat(weight);
    if (isNaN(weightNum) || weightNum <= 0) return 'Enter a valid weight';
    if (weightNum > 500) return 'Weight cannot exceed 500 kg';
    return '';
  };

  const validateBreed = (breedId: string) => {
    if (!breedId) return 'Breed is required';
    return '';
  };

  const validateForm = async (showAll = true) => {
    const nameError = await validateName(form.name);
    
    const errors = {
      name: showAll ? nameError : form.name ? nameError : '',
      age: showAll ? validateAge(form.age) : form.age ? validateAge(form.age) : '',
      weight: showAll ? validateWeight(form.weight) : form.weight ? validateWeight(form.weight) : '',
      breed_id: showAll ? validateBreed(form.breed_id) : form.breed_id ? validateBreed(form.breed_id) : '',
    };

    setFormErrors(errors);
    return !Object.values(errors).some(error => error !== '');
  };

  const handleImagePick = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
    });

    if (!result.canceled) {
      setForm(prev => ({ ...prev, image: result.assets[0].uri }));
    }
  };

  const handleSubmitRequest = async () => {
    const isValid = await validateForm(true);
    if (!isValid) {
      return;
    }

    try {
      setError(null);
      setIsSubmitting(true);

      const updatedPig = {
        id: parseInt(id),
        name: form.name.trim(),
        age: parseInt(form.age),
        weight: parseFloat(form.weight),
        category: form.category as 'Adult' | 'Young',
        breed_id: parseInt(form.breed_id),
        image: form.image,
      };

      setPendingUpdate(updatedPig);
      setShowConfirm(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to validate pig');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitConfirm = async () => {
    if (!pendingUpdate) return;
    
    try {
      setIsSubmitting(true);
      await updatePig(pendingUpdate);
      router.back();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to update pig');
    } finally {
      setIsSubmitting(false);
      setShowConfirm(false);
    }
  };

  // Update useEffect to handle async validation
  useEffect(() => {
    const validateAsync = async () => {
      await validateForm(false);
    };
    validateAsync();
  }, [form]);

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Edit Pig',
          headerStyle: {
            backgroundColor: '#D0D0D0',
          },
          headerTintColor: '#000',
          headerShadowVisible: false,
        }}
      />

      <ScrollView style={styles.container}>
        <ThemedView style={styles.form}>
          {/* Image Picker */}
          <ThemedView style={styles.imagePickerContainer}>
            <ImagePickerButton
              image={form.image}
              onImageSelected={(uri) => setForm(prev => ({ ...prev, image: uri }))}
              label="Tap to change photo"
            />
          </ThemedView>

          {/* Basic Info */}
          <ThemedView style={styles.section}>
            <ThemedText style={styles.sectionTitle}>Basic Information</ThemedText>
            
            {/* Name Input */}
            <ThemedView style={styles.inputGroup}>
              <ThemedText style={styles.label}>Name</ThemedText>
              <TextInput
                style={styles.input}
                placeholder="Enter pig name"
                value={form.name}
                onChangeText={(text) => setForm(prev => ({ ...prev, name: text }))}
              />
              {formErrors.name && (
                <ThemedText style={styles.errorHelper}>{formErrors.name}</ThemedText>
              )}
            </ThemedView>

            {/* Age Input */}
            <ThemedView style={styles.inputGroup}>
              <ThemedText style={styles.label}>Age (months)</ThemedText>
              <TextInput
                style={styles.input}
                placeholder="Enter age in months"
                value={form.age}
                onChangeText={(text) => setForm(prev => ({ ...prev, age: text }))}
                keyboardType="number-pad"
              />
              {formErrors.age && (
                <ThemedText style={styles.errorHelper}>{formErrors.age}</ThemedText>
              )}
            </ThemedView>

            {/* Weight Input */}
            <ThemedView style={styles.inputGroup}>
              <ThemedText style={styles.label}>Weight (kg)</ThemedText>
              <TextInput
                style={styles.input}
                placeholder="Enter weight in kg"
                value={form.weight}
                onChangeText={(text) => setForm(prev => ({ ...prev, weight: text }))}
                keyboardType="decimal-pad"
              />
              {formErrors.weight && (
                <ThemedText style={styles.errorHelper}>{formErrors.weight}</ThemedText>
              )}
            </ThemedView>
          </ThemedView>

          {/* Category Selection */}
          <ThemedView style={styles.section}>
            <ThemedText style={styles.sectionTitle}>Category</ThemedText>
            <ThemedView style={styles.categoryButtons}>
              <ThemedView 
                style={[
                  styles.categoryButton,
                  form.category === 'Adult' && styles.categoryButtonActive
                ]}
                onTouchEnd={() => setForm(prev => ({ ...prev, category: 'Adult' }))}
              >
                <ThemedText style={[
                  styles.categoryButtonText,
                  form.category === 'Adult' && styles.categoryButtonTextActive
                ]}>Adult</ThemedText>
              </ThemedView>
              <ThemedView 
                style={[
                  styles.categoryButton,
                  form.category === 'Young' && styles.categoryButtonActive
                ]}
                onTouchEnd={() => setForm(prev => ({ ...prev, category: 'Young' }))}
              >
                <ThemedText style={[
                  styles.categoryButtonText,
                  form.category === 'Young' && styles.categoryButtonTextActive
                ]}>Young</ThemedText>
              </ThemedView>
            </ThemedView>
          </ThemedView>

          {/* Breed Selection */}
          <ThemedView style={styles.section}>
            <ThemedText style={styles.sectionTitle}>Breed</ThemedText>
            <DropdownSelect
              value={form.breed_id}
              options={breeds.map(breed => ({
                value: breed.id.toString(),
                label: breed.name,
              }))}
              placeholder="Select breed"
              onChange={(value) => setForm(prev => ({ ...prev, breed_id: value }))}
              error={formErrors.breed_id}
            />
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
                <ThemedText style={styles.submitButtonText}>Update Pig</ThemedText>
              )}
            </ThemedView>
          </ThemedView>
        </ThemedView>

        {/* Footer */}
        <ThemedView style={styles.footer}>
          <ThemedText style={styles.footerText}>
            Pig categories and age ranges help determine normal temperature thresholds during health monitoring.
          </ThemedText>
          <ThemedView style={styles.footerDivider} />
          
          {/* Category Guide */}
          <ThemedView style={styles.guideSection}>
            <ThemedText style={styles.guideTitle}>Category Guide:</ThemedText>
            <ThemedView style={styles.guideItems}>
              <ThemedView style={styles.guideItem}>
                <IconSymbol name="circle.fill" size={12} color="#30D158" />
                <ThemedText style={styles.guideText}>Adult: Over 8 months</ThemedText>
              </ThemedView>
              <ThemedView style={styles.guideItem}>
                <IconSymbol name="circle.fill" size={12} color="#FFD60A" />
                <ThemedText style={styles.guideText}>Young: Under 8 months</ThemedText>
              </ThemedView>
            </ThemedView>
          </ThemedView>
        </ThemedView>
      </ScrollView>

      {showConfirm && (
        <ConfirmDialog
          title="Update Pig"
          message="Are you sure you want to update this pig?"
          icon="arrow.triangle.2.circlepath"
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
    gap: 24,
  },
  imagePickerContainer: {
    alignItems: 'center',
    gap: 8,
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
  input: {
    backgroundColor: 'rgba(142, 142, 147, 0.12)',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 10,
    fontSize: 16,
    color: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(142, 142, 147, 0.2)',
  },
  categoryButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  categoryButton: {
    flex: 1,
    padding: 12,
    borderRadius: 10,
    backgroundColor: 'rgba(142, 142, 147, 0.12)',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(142, 142, 147, 0.2)',
  },
  categoryButtonActive: {
    backgroundColor: '#007AFF',
  },
  categoryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  categoryButtonTextActive: {
    color: '#FFFFFF',
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
    fontWeight: '500',
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
}); 