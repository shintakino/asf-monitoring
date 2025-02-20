import { StyleSheet } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';

interface ConfirmDialogProps {
  title: string;
  message: string;
  icon?: string;
  iconColor?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({ 
  title, 
  message, 
  icon = "exclamationmark.triangle.fill",
  iconColor = "#FF9500",
  onConfirm, 
  onCancel 
}: ConfirmDialogProps) {
  return (
    <ThemedView style={styles.overlay}>
      <ThemedView style={styles.dialog}>
        <IconSymbol name={icon as any} size={32} color={iconColor} />
        <ThemedText style={styles.title}>{title}</ThemedText>
        <ThemedText style={styles.message}>{message}</ThemedText>
        <ThemedView style={styles.buttons}>
          <ThemedView style={styles.cancelButton} onTouchEnd={onCancel}>
            <ThemedText style={styles.cancelButtonText}>Cancel</ThemedText>
          </ThemedView>
          <ThemedView style={styles.confirmButton} onTouchEnd={onConfirm}>
            <ThemedText style={styles.confirmButtonText}>Confirm</ThemedText>
          </ThemedView>
        </ThemedView>
      </ThemedView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  dialog: {
    borderRadius: 16,
    padding: 24,
    width: '80%',
    maxWidth: 400,
    alignItems: 'center',
    gap: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    textAlign: 'center',
    opacity: 0.7,
  },
  buttons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
    width: '100%',
  },
  cancelButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(142, 142, 147, 0.12)',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    opacity: 0.7,
  },
  confirmButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#007AFF',
    alignItems: 'center',
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
}); 