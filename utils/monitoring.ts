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

  // Calculate next monitoring time (7 hours after last monitoring)
  const lastMonitored = new Date(`${today}T${lastMonitoredTime}`);
  const nextMonitoring = new Date(lastMonitored.getTime() + (7 * 60 * 60 * 1000));
  
  // Check if next monitoring is still today
  if (nextMonitoring.toISOString().split('T')[0] !== today) {
    // Next monitoring would be tomorrow, so no more monitoring today
    return {
      lastMonitoredTime,
      nextMonitoringTime: startTimeString,
      canMonitor: false,
      timeRemaining: null
    };
  }

  return {
    lastMonitoredTime,
    nextMonitoringTime: nextMonitoring.toTimeString().slice(0, 5),
    canMonitor: currentTime >= nextMonitoring.getTime(),
    timeRemaining: currentTime < nextMonitoring.getTime() ? 
      formatTimeRemaining(nextMonitoring.getTime() - currentTime) : null
  };
}

function formatTimeRemaining(ms: number): string {
  const hours = Math.floor(ms / (1000 * 60 * 60));
  const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
  return `${hours}h ${minutes}m`;
} 