import * as Notifications from 'expo-notifications';
import * as TaskManager from 'expo-task-manager';
import * as BackgroundFetch from 'expo-background-fetch';
import { Platform } from 'react-native';
import { calculateRiskLevel } from './risk';
import type { Pig, MonitoringRecord, ChecklistRecord, Breed } from './database';
import { TimeIntervalTriggerInput } from 'expo-notifications';
import { openDatabase } from '@/utils/database';

// Define background task names
const BACKGROUND_HEALTH_CHECK = 'BACKGROUND_HEALTH_CHECK';
const BACKGROUND_FETCH_TASK = 'BACKGROUND_FETCH_TASK';

// Register background fetch task
TaskManager.defineTask(BACKGROUND_FETCH_TASK, async () => {
  try {
    const db = await openDatabase();
    
    // Fetch required data from database with type casting
    const pigs = (await db.getAllAsync('SELECT * FROM Pigs')) as Pig[];
    const records = (await db.getAllAsync('SELECT * FROM monitoring_records')) as MonitoringRecord[];
    const checklistRecords = (await db.getAllAsync('SELECT * FROM checklist_records')) as ChecklistRecord[];
    const breeds = (await db.getAllAsync('SELECT * FROM Breeds')) as Breed[];

    // Schedule notifications based on fresh data
    await scheduleRiskNotification(pigs, records, checklistRecords, breeds);
    
    return BackgroundFetch.BackgroundFetchResult.NewData;
  } catch (error) {
    console.error('Background fetch failed:', error);
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});

// Configure notifications behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export async function registerBackgroundTasks() {
  try {
    // Register background fetch
    await BackgroundFetch.registerTaskAsync(BACKGROUND_FETCH_TASK, {
      minimumInterval: 60 * 15, // 15 minutes
      stopOnTerminate: false,
      startOnBoot: true
    });

    // Set up notification channels for Android
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('risk-alerts', {
        name: 'Risk Alerts',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF453A',
      });

      await Notifications.setNotificationChannelAsync('monitoring-reminders', {
        name: 'Monitoring Reminders',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF453A',
      });

      await Notifications.setNotificationChannelAsync('health-checks', {
        name: 'Health Checks',
        importance: Notifications.AndroidImportance.DEFAULT,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#32ADE6',
      });
    }

    console.log('Background tasks registered successfully');
  } catch (error) {
    console.error('Failed to register background tasks:', error);
  }
}

// Update the notification scheduling function
export async function scheduleRiskNotification(
  pigs: Pig[],
  records: MonitoringRecord[],
  checklistRecords: ChecklistRecord[],
  breeds: Breed[]
) {
  try {
    // Cancel existing notifications to avoid duplicates
    await Notifications.cancelAllScheduledNotificationsAsync();

    // Calculate risk levels for all pigs
    const pigsWithRisk = pigs.map(pig => {
      const breed = breeds.find(b => b.id === pig.breed_id);
      if (!breed) return { ...pig, riskLevel: 'Low' as const };

      const pigRecords = records.filter(r => r.pig_id === pig.id);
      const pigChecklistRecords = checklistRecords.filter(r => 
        pigRecords.some(pr => pr.id === r.monitoring_id)
      );

      const riskAnalysis = calculateRiskLevel(pigRecords, pigChecklistRecords, breed, pig.category);
      return { ...pig, riskLevel: riskAnalysis.riskLevel };
    });

    // Group pigs by risk level
    const highRiskPigs = pigsWithRisk.filter(pig => pig.riskLevel === 'High');
    const moderateRiskPigs = pigsWithRisk.filter(pig => pig.riskLevel === 'Moderate');

    // Schedule immediate notifications for risks
    if (highRiskPigs.length > 0) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '🚨 High Risk Alert',
          body: `${highRiskPigs.length} pig${highRiskPigs.length > 1 ? 's' : ''} showing high risk symptoms: ${highRiskPigs.map(p => p.name).join(', ')}`,
          data: { type: 'high-risk' },
        },
        trigger: null,
      });
    }

    if (moderateRiskPigs.length > 0) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '⚠️ Moderate Risk Alert',
          body: `${moderateRiskPigs.length} pig${moderateRiskPigs.length > 1 ? 's' : ''} showing moderate risk symptoms: ${moderateRiskPigs.map(p => p.name).join(', ')}`,
          data: { type: 'moderate-risk' },
        },
        trigger: null,
      });
    }

    // Schedule next check
    const nextCheckTime = new Date();
    nextCheckTime.setHours(nextCheckTime.getHours() + 1); // Check every hour

    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Health Check',
        body: 'Performing routine health check...',
        data: { type: 'health-check' },
      },
      trigger: {
        type: 'timeInterval',
        seconds: 60 * 60, // Every hour
        repeats: true
      } as TimeIntervalTriggerInput,
    });

  } catch (error) {
    console.error('Error scheduling risk notifications:', error);
  }
}

export async function registerForPushNotificationsAsync() {
  try {
    // Request permission for notifications
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('Failed to get notification permissions!');
      return;
    }

    // Set up notification channels for Android
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF453A',
      });

      await Notifications.setNotificationChannelAsync('risk-alerts', {
        name: 'Risk Alerts',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF453A',
        sound: 'notif1.wav'
      });

      await Notifications.setNotificationChannelAsync('monitoring-reminders', {
        name: 'Monitoring Reminders',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF453A',
        sound: 'notif2.wav'
      });
    }

    return true;
  } catch (error) {
    console.error('Error setting up notifications:', error);
    return false;
  }
}

export async function scheduleMonitoringNotification(pig: Pig, monitoringTime: string) {
  const [hours, minutes] = monitoringTime.split(':');
  const scheduledTime = new Date();
  scheduledTime.setHours(parseInt(hours, 10));
  scheduledTime.setMinutes(parseInt(minutes, 10));
  scheduledTime.setSeconds(0);

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
      type: 'timeInterval',
      seconds: 24 * 60 * 60, // Daily
      repeats: true
    } as TimeIntervalTriggerInput,
  });
}

export async function cancelAllNotifications() {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

export async function scheduleBackgroundHealthCheck(
  pigs: Pig[],
  records: MonitoringRecord[],
  checklistRecords: ChecklistRecord[],
  breeds: Breed[]
) {
  try {
    const isRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_HEALTH_CHECK);
    if (!isRegistered) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: "Pig Health Check",
          body: "Checking pig health status...",
          data: { 
            type: 'health-check',
            pigIds: pigs.map(p => p.id)
          },
        },
        trigger: {
          type: 'timeInterval',
          seconds: 24 * 60 * 60,
          repeats: true
        } as TimeIntervalTriggerInput,
      });
    }

    console.log('Background health check scheduled');
  } catch (error) {
    console.error('Error scheduling background check:', error);
  }
}

export async function scheduleTemperatureTrendNotification(
  pig: Pig,
  records: MonitoringRecord[],
  breed: Breed
) {
  const recentRecords = records
    .filter(r => r.pig_id === pig.id)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 3);

  if (recentRecords.length >= 3) {
    const temps = recentRecords.map(r => r.temperature);
    const isIncreasing = temps.every((t, i) => i === 0 || t > temps[i - 1]);
    const normalRange = pig.category === 'Adult' 
      ? { min: breed.min_temp_adult, max: breed.max_temp_adult }
      : { min: breed.min_temp_young, max: breed.max_temp_young };

    if (isIncreasing && temps[0] > normalRange.max) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: "🌡️ Critical Temperature Alert",
          body: `${pig.name}'s temperature is rising and above normal range. Last reading: ${temps[0]}°C`,
          data: { type: 'temperature-trend', pigId: pig.id, severity: 'high' },
        },
        trigger: null // Immediate notification
      });
    }
  }
}

export async function scheduleMissedMonitoringNotification(
  pig: Pig,
  lastMonitoredDate: string | null
) {
  const today = new Date().toISOString().split('T')[0];
  if (!lastMonitoredDate || lastMonitoredDate !== today) {
    const afternoonReminder = new Date();
    afternoonReminder.setHours(17, 0, 0, 0);

    const eveningReminder = new Date();
    eveningReminder.setHours(19, 0, 0, 0);

    await Notifications.scheduleNotificationAsync({
      content: {
        title: "📅 Monitoring Due",
        body: `Don't forget to monitor ${pig.name} today!`,
        data: { type: 'missed-monitoring', pigId: pig.id },
      },
      trigger: {
        type: 'timeInterval',
        seconds: calculateSecondsUntil(17, 0),
        repeats: false
      } as TimeIntervalTriggerInput,
    });

    await Notifications.scheduleNotificationAsync({
      content: {
        title: "⚠️ Urgent Monitoring Required",
        body: `${pig.name} has not been monitored yet. Please check their health status.`,
        data: { type: 'missed-monitoring-urgent', pigId: pig.id },
      },
      trigger: {
        type: 'timeInterval',
        seconds: calculateSecondsUntil(19, 0),
        repeats: false
      } as TimeIntervalTriggerInput,
    });
  }
}

export async function scheduleMultipleSymptomsNotification(
  pig: Pig,
  checklistRecords: ChecklistRecord[]
) {
  const symptoms = checklistRecords.filter(r => r.checked);
  const criticalSymptoms = symptoms.filter(s => s.risk_weight >= 4);
  
  if (symptoms.length >= 3 || criticalSymptoms.length > 0) {
    const isHighRisk = criticalSymptoms.length > 0;
    
    // Immediate alert
    await Notifications.scheduleNotificationAsync({
      content: {
        title: isHighRisk ? "🚨 Critical Symptoms Alert" : "⚠️ Multiple Symptoms Alert",
        body: isHighRisk 
          ? `${pig.name} has ${criticalSymptoms.length} critical symptom(s). Immediate attention required!`
          : `${pig.name} is showing ${symptoms.length} different symptoms. Close monitoring needed.`,
        data: { 
          type: 'symptoms-alert', 
          pigId: pig.id,
          severity: isHighRisk ? 'critical' : 'warning',
          symptoms: symptoms.map(s => s.symptom)
        },
      },
      trigger: null // For immediate notifications
    });

    // Follow-up reminder in 2 hours
    const followUpDate = new Date();
    followUpDate.setHours(followUpDate.getHours() + 2);
    
    await Notifications.scheduleNotificationAsync({
      content: {
        title: "🔄 Symptom Check Reminder",
        body: `Time to re-check ${pig.name}'s symptoms`,
        data: { type: 'symptom-followup', pigId: pig.id },
      },
      trigger: {
        type: 'timeInterval',
        seconds: calculateSecondsUntil(followUpDate.getHours(), followUpDate.getMinutes()),
        repeats: false
      } as TimeIntervalTriggerInput,
    });
  }
}

// Helper function to calculate seconds until a specific time
function calculateSecondsUntil(hours: number, minutes: number): number {
  const now = new Date();
  const target = new Date();
  target.setHours(hours, minutes, 0, 0);
  
  if (target.getTime() < now.getTime()) {
    target.setDate(target.getDate() + 1);
  }
  
  return Math.floor((target.getTime() - now.getTime()) / 1000);
}

// Combine all notifications
export async function scheduleHealthNotifications(
  pig: Pig,
  records: MonitoringRecord[],
  checklistRecords: ChecklistRecord[],
  breed: Breed
) {
  if (!pig.lastMonitoredDate) {
    console.log('No last monitored date for pig:', pig.name);
  }

  await Promise.all([
    scheduleTemperatureTrendNotification(pig, records, breed),
    scheduleMissedMonitoringNotification(pig, pig.lastMonitoredDate || null),
    scheduleMultipleSymptomsNotification(pig, checklistRecords)
  ]);
}

// Update the notification handler
export function setupBackgroundNotificationHandler() {
  Notifications.addNotificationResponseReceivedListener(async (response) => {
    const data = response.notification.request.content.data;
    
    if (data.type === 'health-check') {
      try {
        const db = await openDatabase();
        const pigs = (await db.getAllAsync('SELECT * FROM Pigs WHERE id IN (?)', [data.pigIds.join(',')])) as Pig[];
        const records = (await db.getAllAsync('SELECT * FROM monitoring_records')) as MonitoringRecord[];
        const checklistRecords = (await db.getAllAsync('SELECT * FROM checklist_records')) as ChecklistRecord[];
        const breeds = (await db.getAllAsync('SELECT * FROM Breeds')) as Breed[];

        await scheduleRiskNotification(pigs, records, checklistRecords, breeds);
      } catch (error) {
        console.error('Error in background notification handler:', error);
      }
    }
  });
}

// Add this at the beginning of the file after the imports
if (Platform.OS === 'android') {
  Notifications.setNotificationChannelAsync('monitoring-reminders', {
    name: 'Monitoring Reminders',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#FF453A',
  });

  Notifications.setNotificationChannelAsync('symptom-checks', {
    name: 'Symptom Checks',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#FF9500',
  });

  Notifications.setNotificationChannelAsync('health-checks', {
    name: 'Health Checks',
    importance: Notifications.AndroidImportance.DEFAULT,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#32ADE6',
  });
} 