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

  // 1. Temperature Analysis (0-25 points)
  let temperatureScore = 0;
  if (records.length > 0) {
    const latestTemp = records[0].temperature;
    const tempDeviation = Math.max(
      latestTemp - maxTemp,
      minTemp - latestTemp,
      0
    );

    console.log('Temperature analysis:', { latestTemp, tempDeviation });

    if (tempDeviation >= 1.5) temperatureScore = 25;
    else if (tempDeviation >= 1.0) temperatureScore = 20;
    else if (tempDeviation >= 0.5) temperatureScore = 15;
  }

  // 2. Symptom Analysis (0-50 points)
  let symptomScore = 0;
  if (checklistRecords.length > 0) {
    const checkedSymptoms = checklistRecords.filter(record => record.checked);
    console.log('Checked symptoms:', checkedSymptoms);
    
    symptomScore = Math.min(
      checkedSymptoms.reduce((total, symptom) => {
        console.log('Adding symptom score:', { symptom, score: symptom.risk_weight * 10 });
        return total + (symptom.risk_weight * 10);
      }, 0),
      50
    );
  }

  // 3. Disease Progression Analysis (0-25 points)
  let progressionScore = 0;

  // Compare symptom counts over time
  const currentSymptomCount = checklistRecords.filter(r => r.checked).length;
  const previousMaxSymptoms = Math.max(
    ...records.slice(1).map(r => 
      checklistRecords.filter(cr => cr.monitoring_id === r.id && cr.checked).length
    ),
    0
  );

  console.log('Progression analysis:', {
    currentSymptomCount,
    previousMaxSymptoms
  });

  if (currentSymptomCount > previousMaxSymptoms) {
    progressionScore += 15; // Worsening condition
  } else if (currentSymptomCount === previousMaxSymptoms && currentSymptomCount > 0) {
    progressionScore += 10; // Persistent symptoms
  }

  // Analyze temperature trend
  if (records.length > 1) {
    const tempTrend = records[0].temperature - records[1].temperature;
    console.log('Temperature trend:', tempTrend);
    if (tempTrend > 0) progressionScore += 10; // Worsening temperature
  }

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