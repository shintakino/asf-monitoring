import { Stack } from 'expo-router';

export default function PigsLayout() {
    return (
        <Stack>
            <Stack.Screen name="new" options={{ title: 'Add Pig' }} />
            <Stack.Screen name="[id]/index" options={{ title: 'Pig Details' }} />
            <Stack.Screen name="[id]/edit" options={{ title: 'Edit Pig' }} />
            <Stack.Screen name="[id]/monitor" options={{ title: 'Monitor Pig' }} />
            <Stack.Screen name="[id]/report" options={{ title: 'Health Report' }} />
            <Stack.Screen name="notifications" options={{ headerShown: false }} />
        </Stack>
    );
}
