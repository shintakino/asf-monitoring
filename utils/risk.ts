import type { MonitoringRecord, Breed, ChecklistRecord } from '@/utils/database';

interface RiskAnalysis {
  temperatureScore: number;
  symptomScore: number;
  progressionScore: number;
  totalScore: number;
  riskLevel: 'Low' | 'Moderate' | 'High';
}

export function calculateRiskLevel(
  records: MonitoringRecord[],
  checklistRecords: ChecklistRecord[],
  breed: Breed,
  category: 'Adult' | 'Young'
): RiskAnalysis {
  console.log('Calculating risk level with:', {
    records: records.length,
    checklistRecords: checklistRecords.length,
    breed,
    category
  });

  // Get temperature limits based on pig category
  const minTemp = category === 'Adult' ? breed.min_temp_adult : breed.min_temp_young;
  const maxTemp = category === 'Adult' ? breed.max_temp_adult : breed.max_temp_young;

  console.log('Temperature limits:', { minTemp, maxTemp });

  // Get the most recent record and its date
  const latestRecord = records[0];
  if (!latestRecord) {
    return {
      riskLevel: 'Low',
      temperatureScore: 0,
      symptomScore: 0,
      progressionScore: 0,
      totalScore: 0
    };
  }

  // Get all records from the latest date
  const latestDate = latestRecord.date;
  const latestDateRecords = records.filter(r => r.date === latestDate);
  
  // Get the most recent monitoring session for the latest date
  const mostRecentMonitoringId = latestDateRecords.length > 1 ? 
    latestDateRecords[0].id : // If there are two sessions, take the first one (most recent)
    latestDateRecords[0]?.id; // If there's only one session, take it

  // 1. Temperature Analysis (0-25 points)
  let temperatureScore = 0;
  const latestTemp = latestRecord.temperature;
  const tempDeviation = Math.max(
    latestTemp - maxTemp,
    minTemp - latestTemp,
    0
  );

  console.log('Temperature analysis:', { latestTemp, tempDeviation });

  if (tempDeviation >= 1.5) temperatureScore = 25;
  else if (tempDeviation >= 1.0) temperatureScore = 20;
  else if (tempDeviation >= 0.5) temperatureScore = 15;

  // 2. Symptom Analysis (0-50 points) - only from most recent monitoring
  let symptomScore = 0;
  const currentSymptoms = checklistRecords.filter(r => 
    r.monitoring_id === mostRecentMonitoringId && r.checked
  );
  
  symptomScore = Math.min(
    currentSymptoms.reduce((total, symptom) => {
      console.log('Adding symptom score:', { symptom, score: symptom.risk_weight * 10 });
      return total + (symptom.risk_weight * 10);
    }, 0),
    50
  );

  // 3. Disease Progression Analysis (0-25 points)
  let progressionScore = 0;

  // First check same-day progression
  const previousRecord = records.find(r => r.date === latestDate && r.id !== mostRecentMonitoringId);
  if (previousRecord) {
    // Compare with previous session of the same day
    const previousSymptoms = checklistRecords.filter(r => 
      r.monitoring_id === previousRecord.id && r.checked
    );
    
    // Compare symptom counts
    const currentSymptomCount = currentSymptoms.length;
    const previousSymptomCount = previousSymptoms.length;
    
    console.log('Same day symptom comparison:', {
      currentSymptomCount,
      previousSymptomCount
    });

    if (currentSymptomCount > previousSymptomCount) {
      progressionScore += 15; // Worsening condition in the same day
    }

    // Analyze temperature trend in the same day
    const tempTrend = latestTemp - previousRecord.temperature;
    const currentDeviation = Math.abs(tempDeviation);
    const previousDeviation = Math.abs(Math.max(
      previousRecord.temperature - maxTemp,
      minTemp - previousRecord.temperature,
      0
    ));

    console.log('Same day temperature comparison:', {
      currentTemp: latestTemp,
      previousTemp: previousRecord.temperature,
      currentDeviation,
      previousDeviation
    });

    if (currentDeviation > previousDeviation) {
      progressionScore += 10; // Temperature deviation is worse
    }
  } else {
    // If no previous session today, compare with the last session from previous day
    const previousDayRecords = records
      .filter(r => r.date < latestDate)
      .sort((a, b) => b.date.localeCompare(a.date)); // Sort by date descending

    if (previousDayRecords.length > 0) {
      const previousDayLatestRecord = previousDayRecords[0];
      const previousDayDate = previousDayLatestRecord.date;
      
      // Get all records from the previous day
      const allPreviousDayRecords = previousDayRecords.filter(r => r.date === previousDayDate);
      
      // Get the last monitoring session of the previous day
      const previousDayLastSession = allPreviousDayRecords[0];
      
      // Get symptoms from the last session of previous day
      const previousDaySymptoms = checklistRecords.filter(r => 
        r.monitoring_id === previousDayLastSession.id && r.checked
      );

      // Compare symptom counts
      const currentSymptomCount = currentSymptoms.length;
      const previousDaySymptomCount = previousDaySymptoms.length;

      console.log('Day-to-day symptom comparison:', {
        currentDate: latestDate,
        previousDate: previousDayDate,
        currentSymptomCount,
        previousDaySymptomCount
      });

      if (currentSymptomCount > previousDaySymptomCount) {
        progressionScore += 15; // More symptoms than previous day
      }

      // Compare temperature deviations
      const currentDeviation = Math.abs(tempDeviation);
      const previousDayDeviation = Math.abs(Math.max(
        previousDayLastSession.temperature - maxTemp,
        minTemp - previousDayLastSession.temperature,
        0
      ));

      console.log('Day-to-day temperature comparison:', {
        currentTemp: latestTemp,
        previousDayTemp: previousDayLastSession.temperature,
        currentDeviation,
        previousDayDeviation
      });

      if (currentDeviation > previousDayDeviation) {
        progressionScore += 10; // Temperature deviation is worse than previous day
      }
    }
  }

  console.log('Progression analysis result:', {
    progressionScore,
    comparedToSameDay: !!previousRecord
  });

  // Calculate total score
  const totalScore = temperatureScore + symptomScore + progressionScore;

  console.log('Final scores:', {
    temperatureScore,
    symptomScore,
    progressionScore,
    totalScore
  });

  // Determine risk level
  let riskLevel: 'Low' | 'Moderate' | 'High';
  if (totalScore >= 70) riskLevel = 'High';
  else if (totalScore >= 40) riskLevel = 'Moderate';
  else riskLevel = 'Low';

  return {
    temperatureScore,
    symptomScore,
    progressionScore,
    totalScore,
    riskLevel
  };
}

export function getRiskColor(riskLevel: 'Low' | 'Moderate' | 'High'): string {
  switch (riskLevel) {
    case 'High':
      return '#FF453A';
    case 'Moderate':
      return '#FF9500';
    case 'Low':
      return '#30D158';
  }
} 