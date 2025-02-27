import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { calculateRiskLevel } from './risk';
import type { Pig, MonitoringRecord, ChecklistRecord, Breed } from './database';

// Configure notifications behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export async function registerForPushNotificationsAsync() {
  let token;

  // Request permission for notifications
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.log('Failed to get push token for push notification!');
    return;
  }

  // Get Expo push token
  token = (await Notifications.getExpoPushTokenAsync()).data;

  // Set up notification channels for Android
  if (Platform.OS === 'android') {
    Notifications.setNotificationChannelAsync('risk-alerts', {
      name: 'Risk Alerts',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF453A',
    });
  }

  return token;
}

export async function scheduleRiskNotification(
  pigs: Pig[],
  records: MonitoringRecord[],
  checklistRecords: ChecklistRecord[],
  breeds: Breed[]
) {
  // Cancel any existing notifications
  await Notifications.cancelAllScheduledNotificationsAsync();

  // Filter pigs with high or moderate risk
  const riskPigs = pigs.filter(pig => {
    const breed = breeds.find(b => b.id === pig.breed_id);
    if (!breed) return false;

    const pigRecords = records.filter(r => r.pig_id === pig.id);
    const pigChecklistRecords = checklistRecords.filter(r => 
      pigRecords.some(pr => pr.id === r.monitoring_id)
    );

    const riskAnalysis = calculateRiskLevel(pigRecords, pigChecklistRecords, breed, pig.category);
    return ['High', 'Moderate'].includes(riskAnalysis.riskLevel);
  });

  if (riskPigs.length === 0) return;

  // Group pigs by risk level
  const highRiskPigs = riskPigs.filter(pig => {
    const breed = breeds.find(b => b.id === pig.breed_id);
    if (!breed) return false;

    const pigRecords = records.filter(r => r.pig_id === pig.id);
    const pigChecklistRecords = checklistRecords.filter(r => 
      pigRecords.some(pr => pr.id === r.monitoring_id)
    );

    const riskAnalysis = calculateRiskLevel(pigRecords, pigChecklistRecords, breed, pig.category);
    return riskAnalysis.riskLevel === 'High';
  });

  const moderateRiskPigs = riskPigs.filter(pig => {
    const breed = breeds.find(b => b.id === pig.breed_id);
    if (!breed) return false;

    const pigRecords = records.filter(r => r.pig_id === pig.id);
    const pigChecklistRecords = checklistRecords.filter(r => 
      pigRecords.some(pr => pr.id === r.monitoring_id)
    );

    const riskAnalysis = calculateRiskLevel(pigRecords, pigChecklistRecords, breed, pig.category);
    return riskAnalysis.riskLevel === 'Moderate';
  });

  // Schedule notifications
  if (highRiskPigs.length > 0) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: '⚠️ High Risk Alert',
        body: `${highRiskPigs.length} pig${highRiskPigs.length > 1 ? 's' : ''} showing high risk symptoms: ${highRiskPigs.map(p => p.name).join(', ')}`,
        data: { type: 'high-risk' },
      },
      trigger: { seconds: 1 }, // Send immediately
    });
  }

  if (moderateRiskPigs.length > 0) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: '⚠️ Moderate Risk Alert',
        body: `${moderateRiskPigs.length} pig${moderateRiskPigs.length > 1 ? 's' : ''} showing moderate risk symptoms: ${moderateRiskPigs.map(p => p.name).join(', ')}`,
        data: { type: 'moderate-risk' },
      },
      trigger: { seconds: 2 }, // Send after high risk notification
    });
  }
}

export async function scheduleMonitoringNotification(pig: Pig, monitoringTime: string) {
  const [hours, minutes] = monitoringTime.split(':');
  const scheduledTime = new Date();
  scheduledTime.setHours(parseInt(hours, 10));
  scheduledTime.setMinutes(parseInt(minutes, 10));
  scheduledTime.setSeconds(0);

  // If the time has passed for today, schedule for tomorrow
  if (scheduledTime.getTime() < Date.now()) {
    scheduledTime.setDate(scheduledTime.getDate() + 1);
  }

  await Notifications.scheduleNotificationAsync({
    content: {
      title: "Time to Monitor Pig",
      body: `It's time to monitor ${pig.name}'s temperature and health status.`,
      data: { pigId: pig.id },
    },
    trigger: {
      hour: parseInt(hours, 10),
      minute: parseInt(minutes, 10),
      repeats: true,
    },
  });
}

export async function cancelAllNotifications() {
  await Notifications.cancelAllScheduledNotificationsAsync();
} 