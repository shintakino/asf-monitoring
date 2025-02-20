import React, { useState, useEffect } from 'react';
import { StyleSheet, TextInput } from 'react-native';

const styles = StyleSheet.create({
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
  inputError: {
    borderColor: '#FF453A',
  },
  errorHelper: {
    fontSize: 12,
    color: '#FF453A',
    marginTop: 4,
    fontWeight: '500',
  },
});

const PigForm: React.FC = () => {
  const [form, setForm] = useState({
    name: '',
    age: '',
    weight: '',
    breed_id: '',
  });
  const [formErrors, setFormErrors] = useState({
    name: '',
    age: '',
    weight: '',
    breed_id: '',
  });

  const validateForm = (showAll = true) => {
    const errors = {
      name: showAll ? validateName(form.name) : form.name ? validateName(form.name) : '',
      age: showAll ? validateAge(form.age) : form.age ? validateAge(form.age) : '',
      weight: showAll ? validateWeight(form.weight) : form.weight ? validateWeight(form.weight) : '',
      breed_id: showAll ? validateBreed(form.breed_id) : form.breed_id ? validateBreed(form.breed_id) : '',
    };

    setFormErrors(errors);
    return !Object.values(errors).some(error => error !== '');
  };

  useEffect(() => {
    validateForm(false);
  }, [form]);

  return (
    <TextInput
      style={[styles.input, formErrors.name && styles.inputError]}
      placeholder="Enter pig name"
      placeholderTextColor="rgba(255, 255, 255, 0.4)"
      value={form.name}
      onChangeText={(text) => setForm(prev => ({ ...prev, name: text }))}
    />
  );
};

export default PigForm; 