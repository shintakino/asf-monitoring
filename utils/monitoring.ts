import type { MonitoringTiming } from '@/utils/database';

export function calculateMonitoringTiming(
  lastMonitoredTime: string | null,
  startTimeString: string = '08:00'
): MonitoringTiming {
  const now = new Date();
  const currentTime = now.getTime();
  const today = now.toISOString().split('T')[0];
  
  // Set monitoring start time to configured time today
  const [hours, minutes] = startTimeString.split(':').map(Number);
  const startTime = new Date(now);
  startTime.setHours(hours, minutes, 0, 0);
  
  // If current time is before configured start time
  if (currentTime < startTime.getTime()) {
    return {
      canMonitor: false,
      nextMonitoringTime: startTimeString,
      timeRemaining: formatTimeRemaining(startTime.getTime() - currentTime)
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

  // Parse the last monitored time
  const [lastHours, lastMinutes] = lastMonitoredTime.split(':').map(Number);
  const lastMonitored = new Date(now);
  lastMonitored.setHours(lastHours, lastMinutes, 0, 0);

  // Calculate next allowed monitoring time (7 hours after last monitoring)
  const nextMonitoring = new Date(lastMonitored.getTime() + (7 * 60 * 60 * 1000));
  
  // If next monitoring would be tomorrow, no more monitoring today
  if (nextMonitoring.getDate() !== now.getDate()) {
    return {
      lastMonitoredTime,
      nextMonitoringTime: startTimeString,
      canMonitor: false,
      timeRemaining: null
    };
  }

  // If it's before next monitoring time, show countdown
  if (currentTime < nextMonitoring.getTime()) {
    return {
      lastMonitoredTime,
      nextMonitoringTime: nextMonitoring.toTimeString().slice(0, 5),
      canMonitor: false,
      timeRemaining: formatTimeRemaining(nextMonitoring.getTime() - currentTime)
    };
  }

  // It's time for second monitoring
  return {
    lastMonitoredTime,
    nextMonitoringTime: nextMonitoring.toTimeString().slice(0, 5),
    canMonitor: true,
    timeRemaining: null
  };
}

function formatTimeRemaining(ms: number): string {
  const hours = Math.floor(ms / (1000 * 60 * 60));
  const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
  return `${hours}h ${minutes}m`;
} 