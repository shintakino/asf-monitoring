import { StyleSheet, Image } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';
import * as ImagePicker from 'expo-image-picker';

interface ImagePickerButtonProps {
  image?: string;
  onImageSelected: (uri: string) => void;
  label?: string;
}

export function ImagePickerButton({ 
  image, 
  onImageSelected, 
  label = 'Tap to add photo'
}: ImagePickerButtonProps) {
  const handleImagePick = async (useCamera: boolean) => {
    try {
      if (useCamera) {
        const permission = await ImagePicker.requestCameraPermissionsAsync();
        if (!permission.granted) {
          throw new Error('Camera permission required');
        }
      }

      const result = useCamera 
        ? await ImagePicker.launchCameraAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.5,
          })
        : await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.5,
          });

      if (!result.canceled) {
        onImageSelected(result.assets[0].uri);
      }
    } catch (e) {
      console.error('Image picker error:', e);
    }
  };

  return (
    <ThemedView style={styles.container}>
      <ThemedView style={styles.preview}>
        {image ? (
          <Image source={{ uri: image }} style={styles.image} />
        ) : (
          <IconSymbol name="camera.fill" size={32} color="#8E8E93" />
        )}
      </ThemedView>
      <ThemedText style={styles.label}>{label}</ThemedText>
      <ThemedView style={styles.buttons}>
        <ThemedView 
          style={styles.button}
          onTouchEnd={() => handleImagePick(false)}
        >
          <IconSymbol name="photo.fill" size={20} color="#007AFF" />
          <ThemedText style={styles.buttonText}>Gallery</ThemedText>
        </ThemedView>
        <ThemedView 
          style={styles.button}
          onTouchEnd={() => handleImagePick(true)}
        >
          <IconSymbol name="camera.fill" size={20} color="#007AFF" />
          <ThemedText style={styles.buttonText}>Camera</ThemedText>
        </ThemedView>
      </ThemedView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: 12,
  },
  preview: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(142, 142, 147, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  label: {
    fontSize: 14,
    opacity: 0.7,
  },
  buttons: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
  },
  buttonText: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '600',
  },
}); 