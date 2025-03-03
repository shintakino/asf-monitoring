import type { MonitoringTiming } from '@/utils/database';
import { formatInTimeZone } from 'date-fns-tz';

const TIMEZONE = 'Asia/Singapore';

export function calculateMonitoringTiming(
  lastMonitoredTime: string | null,
  startTimeString: string = '08:00'
): MonitoringTiming {
  const now = new Date();
  const currentTime = now.getTime();
  const today = formatInTimeZone(now, TIMEZONE, 'yyyy-MM-dd');
  
  // Set monitoring start time to configured time today in Singapore timezone
  const [hours, minutes] = startTimeString.split(':').map(Number);
  const startTime = new Date(today + 'T' + startTimeString);
  
  // Calculate end of monitoring day (12 hours after start time)
  const endTime = new Date(startTime.getTime() + (12 * 60 * 60 * 1000));
  
  // If current time is before configured start time
  if (currentTime < startTime.getTime()) {
    return {
      canMonitor: false,
      nextMonitoringTime: startTimeString,
      timeRemaining: formatTimeRemaining(startTime.getTime() - currentTime)
    };
  }
  
  // If we're past the end time for today
  if (currentTime >= endTime.getTime()) {
    const tomorrowStart = new Date(startTime);
    tomorrowStart.setDate(tomorrowStart.getDate() + 1);
    return {
      lastMonitoredTime,
      nextMonitoringTime: startTimeString,
      canMonitor: false,
      timeRemaining: formatTimeRemaining(tomorrowStart.getTime() - currentTime)
    };
  }
  
  if (!lastMonitoredTime) {
    // No monitoring today, but after configured start time
    return {
      canMonitor: true,
      nextMonitoringTime: startTimeString,
      timeRemaining: null
    };
  }

  // Parse the last monitored time in Singapore timezone
  const [lastHours, lastMinutes] = lastMonitoredTime.split(':').map(Number);
  const lastMonitored = new Date(today + 'T' + lastMonitoredTime);

  // Calculate second monitoring window (7 hours after start time)
  const secondMonitoringStart = new Date(startTime.getTime() + (7 * 60 * 60 * 1000));
  
  // Calculate minimum time between monitorings (4 hours)
  const minimumGap = 4 * 60 * 60 * 1000; // 4 hours in milliseconds
  const nextPossibleMonitoring = new Date(lastMonitored.getTime() + minimumGap);

  // If last monitoring was before second monitoring window
  if (lastMonitored.getTime() < secondMonitoringStart.getTime()) {
    // First monitoring done, need to wait for both minimum gap AND second window
    const nextMonitoringTime = new Date(Math.max(
      secondMonitoringStart.getTime(),
      nextPossibleMonitoring.getTime()
    ));

    // If next monitoring would be after end time, wait for tomorrow
    if (nextMonitoringTime.getTime() >= endTime.getTime()) {
      const tomorrowStart = new Date(startTime);
      tomorrowStart.setDate(tomorrowStart.getDate() + 1);
      return {
        lastMonitoredTime,
        nextMonitoringTime: startTimeString,
        canMonitor: false,
        timeRemaining: formatTimeRemaining(tomorrowStart.getTime() - currentTime)
      };
    }

    // If we need to wait
    if (currentTime < nextMonitoringTime.getTime()) {
      return {
        lastMonitoredTime,
        nextMonitoringTime: formatInTimeZone(nextMonitoringTime, TIMEZONE, 'HH:mm'),
        canMonitor: false,
        timeRemaining: formatTimeRemaining(nextMonitoringTime.getTime() - currentTime)
      };
    }

    // In second monitoring window and past minimum gap
    return {
      lastMonitoredTime,
      nextMonitoringTime: formatInTimeZone(nextMonitoringTime, TIMEZONE, 'HH:mm'),
      canMonitor: true,
      timeRemaining: null
    };
  } else {
    // Last monitoring was during or after second window - no more monitoring today
    const tomorrowStart = new Date(startTime);
    tomorrowStart.setDate(tomorrowStart.getDate() + 1);
    return {
      lastMonitoredTime,
      nextMonitoringTime: startTimeString,
      canMonitor: false,
      timeRemaining: formatTimeRemaining(tomorrowStart.getTime() - currentTime)
    };
  }
}

function formatTimeRemaining(ms: number): string {
  const hours = Math.floor(ms / (1000 * 60 * 60));
  const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
  return `${hours}h ${minutes}m`;
} 