import React, { useEffect, useState } from 'react';
import { StyleSheet, ScrollView, ActivityIndicator, Dimensions, TouchableOpacity, Image } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useMonitoring } from '@/hooks/useMonitoring';
import { usePigs } from '@/hooks/usePigs';
import { useBreeds } from '@/hooks/useBreeds';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { calculateRiskLevel, getRiskColor } from '@/utils/risk';
import { LineChart, BarChart } from 'react-native-chart-kit';
import { format, parseISO, subDays, differenceInDays } from 'date-fns';
import { formatInTimeZone } from 'date-fns-tz';
import Svg, { Circle, Text as SvgText } from 'react-native-svg'; // Import SVG components

const TIMEZONE = 'Asia/Singapore';

interface RiskAnalysis {
  riskLevel: 'Low' | 'Moderate' | 'High';
  temperatureScore: number;
  symptomScore: number;
  progressionScore: number;
  totalScore: number;
}

export default function PigReportScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { pigs } = usePigs();
  const { breeds } = useBreeds();
  const { 
    records, 
    checklistRecords, 
    reports,
    isLoading, 
    error,
    saveReport,
    refreshReports 
  } = useMonitoring(parseInt(id));

  // Move useState hooks to the top
  const [tooltipVisible, setTooltipVisible] = useState(false);
  const [tooltipData, setTooltipData] = useState({ x: 0, y: 0, value: 0 });
  const [isSaving, setIsSaving] = useState(false);
  const [riskAnalysis, setRiskAnalysis] = useState<RiskAnalysis>({
    riskLevel: 'Low',
    temperatureScore: 0,
    symptomScore: 0,
    progressionScore: 0,
    totalScore: 0
  });

  const pig = pigs.find(p => p.id === parseInt(id));
  const breed = breeds.find(b => b.id === pig?.breed_id);

  useEffect(() => {
    const generateAndSaveReport = async () => {
      if (!pig || !breed || isLoading || isSaving) return;

      try {
        setIsSaving(true);

        // Prepare temperature data
        const today = new Date();
        const labels = []; // Array to hold labels for the last 7 days
        for (let i = 6; i >= 0; i--) {
          const day = subDays(today, i);
          labels.push(format(day, 'EEE')); // Add day labels (Mon, Tue, etc.)
        }

        const temperatureData = Array(7).fill([]);  // Initialize an array of arrays for multiple readings

        for (let i = 6; i >= 0; i--) {
          const day = subDays(today, i);
          temperatureData[6 - i] = []; // Initialize empty array for each day
        }

        records.forEach(record => {
          const recordDate = parseISO(record.date);
          const dayIndex = differenceInDays(today, recordDate);
          if (dayIndex >= 0 && dayIndex < 7) {
            temperatureData[6 - dayIndex].push(record.temperature); // Store all temperatures for the day
          }
        });

        // Calculate average temperature for each day (or use the single reading if only one exists)
        const averageTemperatureData = temperatureData.map(temps => 
          temps.length > 0 ? temps.reduce((a: number, b: number) => a + b) / temps.length : 0
        );

        // Prepare symptom data
        const symptomCounts = Array(7).fill(0);
        const symptomSet = Array.from({ length: 7 }, () => new Set());

        records.forEach(record => {
          const recordDate = parseISO(record.date);
          const dayIndex = differenceInDays(today, recordDate);
          if (dayIndex >= 0 && dayIndex < 7) {
            const checkedSymptoms = checklistRecords.filter(cr => 
              cr.monitoring_id === record.id && cr.checked
            );
            checkedSymptoms.forEach(symptom => 
              symptomSet[6 - dayIndex].add(symptom.symptom)
            );
          }
        });

        symptomSet.forEach((symptoms, index) => {
          symptomCounts[index] = symptoms.size;
        });

        // Get risk analysis
        const analysis = calculateRiskLevel(records, checklistRecords, breed, pig.category);
        setRiskAnalysis(analysis);

        // Get latest notes
        const latestNotes = records
          .filter(record => record.date === records[0]?.date && record.notes)
          .map(record => record.notes)
          .join('\n');

        // Save report
        await saveReport({
          pig_id: pig.id,
          date: formatInTimeZone(today, TIMEZONE, 'yyyy-MM-dd'),
          temperature_data: JSON.stringify({
            labels,
            data: temperatureData
          }),
          symptom_data: JSON.stringify({
            labels,
            data: symptomCounts
          }),
          risk_analysis: JSON.stringify(analysis),
          notes: latestNotes,
          created_at: formatInTimeZone(today, TIMEZONE, "yyyy-MM-dd'T'HH:mm:ssXXX")
        });

        await refreshReports();
      } catch (e) {
        console.error('Error generating report:', e);
      } finally {
        setIsSaving(false);
      }
    };

    generateAndSaveReport();
  }, [pig, breed, records, checklistRecords, saveReport, refreshReports, isLoading]);

  const handlePointPress = (value: number, index: number) => {
    setTooltipData({ x: index, y: value, value });
    setTooltipVisible(true);
  };

  if (!pig || !breed) return null;

  const latestRecord = records[0];
  
  // Get all records from the latest date
  const latestDate = latestRecord?.date;
  const latestDateRecords = records.filter(r => r.date === latestDate);
  
  // Get the most recent monitoring session for the latest date
  const mostRecentMonitoringId = latestDateRecords.length > 1 ? 
    latestDateRecords[0].id : // If there are two sessions, take the first one (most recent)
    latestDateRecords[0]?.id; // If there's only one session, take it
  
  // Get symptoms only from the most recent monitoring session
  const latestDateChecklistRecords = checklistRecords.filter(r => 
    r.monitoring_id === mostRecentMonitoringId && r.checked
  );
  
  // Count unique symptoms from the most recent session
  const uniqueSymptoms = new Set(latestDateChecklistRecords.map(r => r.symptom));
  const symptomsCount = uniqueSymptoms.size;

  // Get the symptoms and their treatments from the most recent monitoring session
  const symptomsDetails = latestDateChecklistRecords
    .map(r => ({
      symptom: r.symptom,
      treatment: r.treatment_recommendation,
      monitoringSession: latestDateRecords.findIndex(record => record.id === r.monitoring_id) + 1
    }))
    .sort((a, b) => a.symptom.localeCompare(b.symptom)); // Sort alphabetically

  // Get today's date and calculate the last 7 days
  const today = new Date();
  const labels = []; // Array to hold labels for the last 7 days
  for (let i = 6; i >= 0; i--) {
    const day = subDays(today, i);
    labels.push(format(day, 'EEE')); // Add day labels (Mon, Tue, etc.)
  }

  // Filter records for the last 7 days - only most recent session per day
  const recordsByDay = new Map<string, typeof records[0]>();
  records.forEach(record => {
    const recordDate = parseISO(record.date);
    const dayIndex = differenceInDays(today, recordDate);
    if (dayIndex >= 0 && dayIndex < 7) {
      const dateKey = format(recordDate, 'yyyy-MM-dd');
      // Only store the most recent record for each day
      if (!recordsByDay.has(dateKey) || 
          parseISO(recordsByDay.get(dateKey)!.date).getTime() < recordDate.getTime()) {
        recordsByDay.set(dateKey, record);
      }
    }
  });

  // Prepare temperature data using only the most recent session per day
  const temperatureData = Array(7).fill(0);
  for (let i = 6; i >= 0; i--) {
    const day = subDays(today, i);
    const dateKey = format(day, 'yyyy-MM-dd');
    const record = recordsByDay.get(dateKey);
    if (record) {
      temperatureData[6 - i] = record.temperature;
    }
  }

  // Check if there is any temperature data for the week
  const hasTemperatureData = temperatureData.some(temp => temp > 0);

  // Prepare colors based on temperature
  const temperatureColors = temperatureData.map(temp => {
    if (temp < breed.min_temp_adult || temp > breed.max_temp_adult) {
      return 'rgba(255, 0, 0, 1)'; // Red for abnormal temperatures
    }
    return 'rgba(0, 255, 0, 1)'; // Green for normal temperatures
  });

  // Prepare data for the bar chart (Last 7 Days Symptoms - most recent session only)
  const dailySymptomCounts = Array(7).fill(0);

  // Count symptoms for each day's most recent session
  recordsByDay.forEach((record, dateKey) => {
    const recordDate = parseISO(dateKey);
    const dayIndex = differenceInDays(today, recordDate);
    if (dayIndex >= 0 && dayIndex < 7) {
      const symptomsForDay = new Set(
        checklistRecords
          .filter(cr => cr.monitoring_id === record.id && cr.checked)
          .map(cr => cr.symptom)
      );
      dailySymptomCounts[6 - dayIndex] = symptomsForDay.size;
    }
  });

  // Prepare data for the bar chart
  const barChartData = {
    labels: labels,
    datasets: [
      {
        data: dailySymptomCounts,
        color: (opacity = 1) => `rgba(0, 122, 255, ${opacity})`,
        strokeWidth: 2,
      },
    ],
  };

  // Prepare notes for display - only get notes with content from the latest monitoring date
  const notes = records
    .filter(record => {
      const isLatestDate = record.date === latestRecord?.date;
      return isLatestDate && record.notes; // Only include records with notes from latest date
    })
    .map(record => ({
      date: record.date,
      notes: record.notes,
    }));

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      <ThemedView style={styles.header}>
        <ThemedText style={styles.headerTitle}>{pig.name}'s Report</ThemedText>
        <ThemedText style={styles.headerSubtitle}>Health Monitoring Report</ThemedText>
      </ThemedView>

      {isLoading ? (
        <ActivityIndicator size="large" color="#007AFF" />
      ) : error ? (
        <ThemedText style={styles.errorText}>{error.message}</ThemedText>
      ) : (
        <ThemedView style={styles.reportContainer}>
          {/* Pig Profile Section */}
          <ThemedView style={styles.profileSection}>
            <Image 
              source={pig.image ? { uri: pig.image } : require('@/assets/images/pig.png')} 
              style={styles.profileImage} 
              resizeMode="cover" 
            />
            <ThemedView style={styles.profileDetails}>
              <ThemedText style={styles.profileName}>{pig.name}</ThemedText>
              <ThemedText style={styles.profileDetail}>Breed: {breed.name}</ThemedText>
              <ThemedText style={styles.profileDetail}>Age: {pig.age} months</ThemedText>
              <ThemedText style={styles.profileDetail}>Weight: {pig.weight} kg</ThemedText>
              <ThemedText style={styles.profileDetail}>Category: {pig.category}</ThemedText>
            </ThemedView>
          </ThemedView>

          <ThemedView style={styles.detailRow}>
            <ThemedText style={styles.detailLabel}>Last Temperature:</ThemedText>
            <ThemedText style={[
              styles.detailValue,
              { color: latestRecord?.temperature > breed.max_temp_adult ? '#FF453A' : '#30D158' }
            ]}>
              {latestRecord ? `${latestRecord.temperature}°C` : 'N/A'}
            </ThemedText>
          </ThemedView>

          <ThemedView style={styles.detailRow}>
            <ThemedText style={styles.detailLabel}>Last Monitored:</ThemedText>
            <ThemedText style={styles.detailValue}>
              {latestRecord ? latestRecord.date : 'N/A'}
            </ThemedText>
          </ThemedView>

          <ThemedView style={styles.detailRow}>
            <ThemedText style={styles.detailLabel}>Risk Level:</ThemedText>
            <ThemedView style={styles.riskBadge}>
              <IconSymbol 
                name={riskAnalysis.riskLevel === 'Low' ? 'checkmark.circle.fill' : 'exclamationmark.triangle.fill'} 
                size={16} 
                color={getRiskColor(riskAnalysis.riskLevel)} 
              />
              <ThemedText style={[styles.riskText, { color: getRiskColor(riskAnalysis.riskLevel) }]}>
                {riskAnalysis.riskLevel} Risk
              </ThemedText>
            </ThemedView>
          </ThemedView>

          <ThemedView style={styles.detailRow}>
            <ThemedText style={styles.detailLabel}>Symptoms Found:</ThemedText>
            <ThemedView style={styles.symptomsCount}>
              <ThemedText style={styles.detailValue}>
                {symptomsCount} {symptomsCount === 1 ? 'Symptom' : 'Symptoms'}
              </ThemedText>
              <IconSymbol 
                name="exclamationmark.circle.fill" 
                size={16} 
                color={symptomsCount > 0 ? '#FF453A' : '#30D158'} 
              />
            </ThemedView>
          </ThemedView>

          {/* Display Notes - only if there are notes with content */}
          {notes.length > 0 && (
            <ThemedView style={styles.notesSection}>
              <ThemedText style={styles.sectionTitle}>Monitoring Notes</ThemedText>
              {notes.map((note, index) => (
                <ThemedView key={index} style={styles.noteCard}>
                  <ThemedText style={styles.noteDate}>{note.date}</ThemedText>
                  <ThemedText style={styles.noteText}>{note.notes}</ThemedText>
                </ThemedView>
              ))}
            </ThemedView>
          )}

          {/* Symptoms and Treatments Section */}
          {symptomsDetails.length > 0 && (
            <ThemedView style={styles.symptomsSection}>
              <ThemedText style={styles.sectionTitle}>
                Current Symptoms & Treatments (Latest Monitoring)
              </ThemedText>
              {symptomsDetails.map((detail, index) => (
                <ThemedView key={index} style={styles.symptomCard}>
                  <ThemedView style={styles.symptomHeader}>
                    <IconSymbol name="bandage.fill" size={16} color="#FF453A" />
                    <ThemedText style={styles.symptomName}>
                      {detail.symptom}
                    </ThemedText>
                  </ThemedView>
                  <ThemedText style={styles.treatmentText}>
                    Treatment: {detail.treatment}
                  </ThemedText>
                </ThemedView>
              ))}
            </ThemedView>
          )}

          {/* Temperature History Chart */}
          <ThemedView style={styles.chartContainer}>
            <ThemedText style={styles.chartTitle}>Last 7 Days Temperature History (Latest Session)</ThemedText>
            {hasTemperatureData ? (
              <LineChart
                data={{
                  labels: labels,
                  datasets: [
                    {
                      data: temperatureData,
                      color: (opacity = 1) => `rgba(255, 99, 132, ${opacity})`,
                      strokeWidth: 3,
                    },
                  ],
                }}
                width={Dimensions.get('window').width - 32} // from react-native
                height={220}
                yAxisLabel=""
                yAxisSuffix="°C"
                yAxisInterval={1} // optional, defaults to 1
                chartConfig={{
                  backgroundColor: '#ffffff',
                  backgroundGradientFrom: '#ffffff',
                  backgroundGradientTo: '#ffffff',
                  decimalPlaces: 2, // optional, defaults to 2
                  color: (opacity = 1) => `rgba(0, 0, 255, ${opacity})`,
                  labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                  style: {
                    borderRadius: 16,
                  },
                  propsForDots: {
                    r: "6",
                    strokeWidth: "2",
                    stroke: "#ffa726",
                  },
                }}
                style={{
                  marginVertical: 8,
                  borderRadius: 16,
                }}
                onDataPointClick={({ value, index }) => handlePointPress(value, index)} // Handle point press
              />
            ) : (
              <ThemedText style={styles.noDataText}>No temperature data available for the last 7 days.</ThemedText>
            )}
            {tooltipVisible && (
              <Svg height="100" width="100" style={{ position: 'absolute', left: tooltipData.x * 40 + 20, top: 100 }}>
                <Circle cx="20" cy="20" r="20" fill="rgba(255, 255, 255, 0.8)" />
                <SvgText x="20" y="25" textAnchor="middle" fill="black">{tooltipData.value}°C</SvgText>
              </Svg>
            )}
          </ThemedView>

          {/* Bar Chart for Weekly Symptoms */}
          <ThemedView style={styles.chartContainer}>
            <ThemedText style={styles.chartTitle}>Last 7 Days Unique Symptoms</ThemedText>
            <BarChart
              data={barChartData}
              width={Dimensions.get('window').width - 32} // from react-native
              height={220}
              yAxisLabel=""
              yAxisSuffix=""
              yAxisInterval={1} // Set this to control the interval of y-axis labels
              chartConfig={{
                backgroundColor: '#ffffff',
                backgroundGradientFrom: '#ffffff',
                backgroundGradientTo: '#ffffff',
                decimalPlaces: 0, // optional, defaults to 2
                color: (opacity = 1) => `rgba(0, 122, 255, ${opacity})`,
                labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                style: {
                  borderRadius: 16,
                },
              }}
              style={{
                marginVertical: 8,
                borderRadius: 16,
              }}
            />
          </ThemedView>
          <ThemedView style={styles.scoreBreakdown}>
            <ThemedText style={styles.breakdownTitle}>Risk Score Breakdown</ThemedText>
            
            {/* Risk Level Legend */}
            <ThemedView style={styles.riskLegend}>
              <ThemedText style={styles.legendTitle}>Risk Level Categories:</ThemedText>
              <ThemedView style={styles.legendItems}>
                <ThemedView style={styles.legendItem}>
                  <IconSymbol name="circle.fill" size={12} color="#30D158" />
                  <ThemedText style={styles.legendText}>Low Risk (0-30)</ThemedText>
                </ThemedView>
                <ThemedView style={styles.legendItem}>
                  <IconSymbol name="circle.fill" size={12} color="#FF9500" />
                  <ThemedText style={styles.legendText}>Moderate Risk (31-70)</ThemedText>
                </ThemedView>
                <ThemedView style={styles.legendItem}>
                  <IconSymbol name="circle.fill" size={12} color="#FF453A" />
                  <ThemedText style={styles.legendText}>High Risk (71-100)</ThemedText>
                </ThemedView>
              </ThemedView>
            </ThemedView>

            {/* Existing Score Breakdown */}
            <ThemedView style={styles.scoreRow}>
              <ThemedText style={styles.scoreLabel}>Temperature Score:</ThemedText>
              <ThemedText style={styles.scoreValue}>{riskAnalysis.temperatureScore}/25</ThemedText>
            </ThemedView>
            <ThemedView style={styles.scoreRow}>
              <ThemedText style={styles.scoreLabel}>Symptom Score:</ThemedText>
              <ThemedText style={styles.scoreValue}>{riskAnalysis.symptomScore}/50</ThemedText>
            </ThemedView>
            <ThemedView style={styles.scoreRow}>
              <ThemedText style={styles.scoreLabel}>Progression Score:</ThemedText>
              <ThemedText style={styles.scoreValue}>{riskAnalysis.progressionScore}/25</ThemedText>
            </ThemedView>
            <ThemedView style={styles.totalScoreRow}>
              <ThemedText style={styles.totalScoreLabel}>Total Risk Score:</ThemedText>
              <ThemedText style={styles.totalScoreValue}>{riskAnalysis.totalScore}/100</ThemedText>
            </ThemedView>
          </ThemedView>
        </ThemedView>
      )}

      {/* Add Footer Section */}
      <ThemedView style={styles.footer}>
        <ThemedText style={styles.footerText}>
          Normal temperature ranges are based on the pig's breed ({breed.name}) and category ({pig.category}).
        </ThemedText>
        <ThemedView style={styles.footerDivider} />
        
        {/* Temperature Guide */}
        <ThemedView style={styles.guideSection}>
          <ThemedText style={styles.guideTitle}>Temperature Ranges:</ThemedText>
          <ThemedView style={styles.guideItems}>
            <ThemedView style={styles.guideItem}>
              <IconSymbol name="thermometer" size={12} color="#30D158" />
              <ThemedText style={styles.guideText}>
                Normal: {breed.min_temp_adult}°C - {breed.max_temp_adult}°C
              </ThemedText>
            </ThemedView>
            <ThemedView style={styles.guideItem}>
              <IconSymbol name="exclamationmark.triangle.fill" size={12} color="#FF453A" />
              <ThemedText style={styles.guideText}>
                Abnormal: Below {breed.min_temp_adult}°C or above {breed.max_temp_adult}°C
              </ThemedText>
            </ThemedView>
          </ThemedView>
        </ThemedView>
      </ThemedView>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  header: {
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#8E8E93',
  },
  reportContainer: {
    backgroundColor: 'rgba(142, 142, 147, 0.06)',
    borderRadius: 12,
    padding: 16,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  detailLabel: {
    fontSize: 14,
    color: '#8E8E93',
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  errorText: {
    color: '#FF453A',
    textAlign: 'center',
  },
  riskBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: 'rgba(142, 142, 147, 0.1)',
  },
  riskText: {
    fontSize: 14,
    fontWeight: '600',
  },
  symptomsCount: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  scoreBreakdown: {
    marginTop: 24,
    padding: 16,
    backgroundColor: 'rgba(142, 142, 147, 0.08)',
    borderRadius: 12,
    gap: 12,
  },
  breakdownTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  scoreRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  scoreLabel: {
    fontSize: 14,
    color: '#8E8E93',
  },
  scoreValue: {
    fontSize: 14,
    fontWeight: '500',
  },
  totalScoreRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(142, 142, 147, 0.1)',
  },
  totalScoreLabel: {
    fontSize: 15,
    fontWeight: '600',
  },
  totalScoreValue: {
    fontSize: 15,
    fontWeight: '600',
    color: '#007AFF',
  },
  symptomsSection: {
    marginTop: 16,
    padding: 16,
    backgroundColor: 'rgba(142, 142, 147, 0.08)',
    borderRadius: 12,
    gap: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  symptomCard: {
    backgroundColor: 'rgba(142, 142, 147, 0.06)',
    padding: 12,
    borderRadius: 8,
    gap: 8,
  },
  symptomHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  symptomName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FF453A',
  },
  treatmentText: {
    fontSize: 14,
    color: '#8E8E93',
    lineHeight: 20,
  },
  chartContainer: {
    marginBottom: 24,
  },
  noDataText: {
    color: '#8E8E93',
    textAlign: 'center',
  },
  scrollContent: {
    flexGrow: 1,
  },
  footer: {
    marginTop: 32,
    gap: 16,
    opacity: 0.8,
  },
  footerText: {
    fontSize: 14,
    textAlign: 'center',
    color: '#FFFFFF',
    opacity: 0.7,
    lineHeight: 20,
  },
  footerDivider: {
    height: 1,
    backgroundColor: 'rgba(142, 142, 147, 0.2)',
    marginVertical: 8,
  },
  guideSection: {
    gap: 12,
  },
  guideTitle: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    color: '#FFFFFF',
    opacity: 0.9,
  },
  guideItems: {
    gap: 8,
  },
  guideItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    justifyContent: 'center',
  },
  guideText: {
    fontSize: 13,
    color: '#FFFFFF',
    opacity: 0.8,
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  notesSection: {
    marginTop: 24,
    padding: 16,
    backgroundColor: 'rgba(142, 142, 147, 0.08)',
    borderRadius: 12,
  },
  noteCard: {
    marginBottom: 12,
    padding: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderRadius: 8,
  },
  noteDate: {
    fontSize: 14,
    fontWeight: '600',
  },
  noteText: {
    fontSize: 14,
    color: '#8E8E93',
  },
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  profileImage: {
    width: 64,
    height: 64,
    borderRadius: 32,
    marginRight: 16,
  },
  profileDetails: {
    flex: 1,
  },
  profileName: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  profileDetail: {
    fontSize: 14,
    color: '#8E8E93',
  },
  riskLegend: {
    marginBottom: 16,
    padding: 12,
    backgroundColor: 'rgba(142, 142, 147, 0.08)',
    borderRadius: 8,
  },
  legendTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  legendItems: {
    gap: 8,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  legendText: {
    fontSize: 13,
    color: '#8E8E93',
  },
  monitoringSession: {
    fontSize: 12,
    color: '#8E8E93',
  },
}); 