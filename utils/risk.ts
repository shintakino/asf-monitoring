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

  // Get all records sorted by date (newest first)
  const sortedRecords = records
    .sort((a, b) => b.date.localeCompare(a.date));

  if (sortedRecords.length > 0) {
    // Get symptoms from all records
    const allSymptoms = sortedRecords.map(record => ({
      date: record.date,
      symptoms: checklistRecords.filter(r => r.monitoring_id === record.id && r.checked)
    }));

    // Get sets of symptoms for each day
    const symptomSets = allSymptoms.map(day => new Set(day.symptoms.map(s => s.symptom)));

    // Calculate symptom progression
    let newSymptomsCount = 0;
    let persistentSymptomsCount = 0;
    let improvedSymptomsCount = 0;

    // Compare symptoms between consecutive days
    for (let i = 0; i < symptomSets.length - 1; i++) {
      const currentSet = symptomSets[i];
      const previousSet = symptomSets[i + 1];

      // Count new symptoms
      const newSymptoms = [...currentSet].filter(s => !previousSet.has(s));
      newSymptomsCount += newSymptoms.length;

      // Count persistent symptoms
      const persistentSymptoms = [...currentSet].filter(s => previousSet.has(s));
      persistentSymptomsCount += persistentSymptoms.length;

      // Count improved symptoms (symptoms that were present before but not now)
      const improvedSymptoms = [...previousSet].filter(s => !currentSet.has(s));
      improvedSymptomsCount += improvedSymptoms.length;
    }

    console.log('Symptom progression analysis:', {
      newSymptomsCount,
      persistentSymptomsCount,
      improvedSymptomsCount,
      daysAnalyzed: sortedRecords.length
    });

    // Add points for new symptoms (max 15 points)
    if (newSymptomsCount > 0) {
      progressionScore += Math.min(15, newSymptomsCount * 5); // 5 points per new symptom, max 15
    }

    // Add points for persistent symptoms (max 10 points)
    if (persistentSymptomsCount > 0) {
      progressionScore += Math.min(10, persistentSymptomsCount * 3); // 3 points per persistent symptom, max 10
    }

    // Subtract points for improved symptoms (up to -10 points)
    if (improvedSymptomsCount > 0) {
      progressionScore -= Math.min(10, improvedSymptomsCount * 2); // -2 points per improved symptom, max -10
    }

    // Calculate temperature progression
    const temperatureDeviations = sortedRecords.map(record => ({
      date: record.date,
      temperature: record.temperature,
      deviation: Math.abs(Math.max(
        record.temperature - maxTemp,
        minTemp - record.temperature,
        0
      ))
    }));

    console.log('Temperature progression analysis:', {
      temperatures: temperatureDeviations.map(t => ({
        date: t.date,
        temp: t.temperature,
        deviation: t.deviation
      }))
    });

    // Check for consistent high temperature
    const highTemperatureDays = temperatureDeviations.filter(t => t.deviation >= 1.0);
    if (highTemperatureDays.length >= 2) {
      // Add points for consistent high temperature
      progressionScore += 10;
    }

    // Calculate temperature progression between consecutive days
    for (let i = 0; i < temperatureDeviations.length - 1; i++) {
      const current = temperatureDeviations[i];
      const previous = temperatureDeviations[i + 1];

      if (current.deviation > previous.deviation) {
        // Temperature is getting worse
        const deviationIncrease = current.deviation - previous.deviation;
        const progressionPoints = Math.min(10, Math.floor(deviationIncrease / 0.5) * 5);
        progressionScore += progressionPoints;
      } else if (current.deviation < previous.deviation) {
        // Temperature is improving
        const deviationDecrease = previous.deviation - current.deviation;
        const improvementPoints = Math.min(10, Math.floor(deviationDecrease / 0.5) * 5);
        progressionScore -= improvementPoints;
      }
    }

    // Add points for long-term high temperature
    if (highTemperatureDays.length >= 3) {
      progressionScore += 5; // Additional points for extended high temperature
    }
  }

  // Ensure progression score stays within 0-25 range
  progressionScore = Math.max(0, Math.min(25, progressionScore));

  console.log('Progression analysis result:', {
    progressionScore,
    daysAnalyzed: sortedRecords.length
  });

  // Calculate total score and ensure it doesn't exceed 100
  const totalScore = Math.min(100, temperatureScore + symptomScore + progressionScore);

  console.log('Final scores:', {
    temperatureScore,
    symptomScore,
    progressionScore,
    totalScore
  });

  // Determine risk level based on total score
  let riskLevel: 'Low' | 'Moderate' | 'High';
  if (totalScore >= 71) {
    riskLevel = 'High';
  } else if (totalScore >= 31) {
    riskLevel = 'Moderate';
  } else {
    riskLevel = 'Low';
  }

  console.log('Risk level determination:', {
    tempDeviation,
    totalScore,
    riskLevel,
    temperatureScore,
    symptomScore,
    progressionScore
  });

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