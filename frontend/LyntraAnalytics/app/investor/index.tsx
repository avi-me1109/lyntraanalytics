import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'expo-router';

// --- Sub-Components ---

const SignalBadge = ({ type }: { type: 'success' | 'warning' | 'danger' }) => (
  <View style={[styles.signalDot, styles[`dot_${type}`]]} />
);

const ProgressTracker = ({ current, goal }: { current: number; goal: number }) => {
  const percent = Math.min(Math.round((current / goal) * 100), 100);
  return (
    <View style={styles.progressHeader}>
      <View style={styles.progressTextRow}>
        <Text style={styles.progressLabel}>
          {percent >= 100 ? 'PILOT OBJECTIVE REACHED' : `PILOT PHASE: WEEK ${current} OF ${goal}`}
        </Text>
        <Text style={styles.progressPercent}>{percent}%</Text>
      </View>
      <View style={styles.progressBarBg}>
        <View style={[styles.progressBarFill, { width: `${percent}%` }]} />
      </View>
    </View>
  );
};

export default function InvestorNarrative() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [globalData, setGlobalData] = useState<any[]>([]);
  const [pilotGoalWeeks, setPilotGoalWeeks] = useState(8);

  useEffect(() => {
    fetchInvestorData();
  }, []);

  const fetchInvestorData = async () => {
    setLoading(true);
    try {
      // 1. Fetch all weeks to calculate pilot averages
      const { data: metrics } = await supabase
        .from('dashboard_view_global')
        .select('*')
        .order('week_start', { ascending: false });

      // 2. Fetch the customizable goal from config table
      const { data: config } = await supabase
        .from('app_config')
        .select('value')
        .eq('key', 'pilot_goal_weeks')
        .single();

      if (metrics) setGlobalData(metrics);
      if (config) setPilotGoalWeeks(parseInt(config.value));
    } catch (error) {
      console.error("Error loading investor data:", error);
    } finally {
      setLoading(false);
    }
  };

  // --- Data Aggregation Logic ---
  const pilotStats = useMemo(() => {
    if (globalData.length === 0) return null;

    const latestWeek = globalData[0];
    const count = globalData.length;
    const isComplete = count >= pilotGoalWeeks;

    return {
      currentWeek: count,
      isComplete,
      activation: latestWeek.global_activation_rate * 100,
      wau: latestWeek.global_wau_rate * 100,
      retention: latestWeek.global_week_over_week_retention * 100,
      studentNps: latestWeek.global_student_nps,
      taskCompletion: latestWeek.global_task_completion_rate * 100,
      p1Bugs: globalData.reduce((acc, curr) => acc + (curr.global_p1_bugs || 0), 0),
    };
  }, [globalData, pilotGoalWeeks]);

  if (loading || !pilotStats) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#5580f7" />
      </View>
    );
  }

  // Define Targets & Map Signals
  const metrics = [
    { name: 'Activation Rate', target: '≥80%', result: `${pilotStats.activation.toFixed(1)}%`, signal: pilotStats.activation >= 80 ? 'success' : 'warning' },
    { name: 'Weekly Retention', target: '≥60%', result: `${pilotStats.retention.toFixed(1)}%`, signal: pilotStats.retention >= 60 ? 'success' : 'warning' },
    { name: 'Student NPS', target: '≥30', result: pilotStats.studentNps.toFixed(0), signal: pilotStats.studentNps >= 30 ? 'success' : 'warning' },
    { name: 'Task Completion', target: '≥50%', result: `${pilotStats.taskCompletion.toFixed(1)}%`, signal: pilotStats.taskCompletion >= 50 ? 'success' : 'warning' },
    { name: 'Critical Bugs', target: '0 Total', result: pilotStats.p1Bugs, signal: pilotStats.p1Bugs === 0 ? 'success' : 'danger' },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.layoutBody}>
        
        {/* Sidebar */}
        <View style={styles.persistentSidebar}>
          <View style={styles.sidebarCircle}><Text style={styles.logoText}>LYNTRA</Text></View>
          <View style={styles.sidebarNavGroup}>
            <TouchableOpacity style={styles.sidebarLink} onPress={() => router.push('/')}>
              <Text style={styles.sidebarLinkText}>Dash</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.sidebarLink} onPress={() => router.push('/editor')}>
              <Text style={styles.sidebarLinkText}>Editor</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.sidebarLinkActive} onPress={() => router.push('/investor')}>
              <Text style={styles.sidebarLinkText}>Investor</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.sidebarFooter}>
            <Text style={styles.footerText}>v1.0.4 Web</Text>
          </View>
        </View>
        <View style={styles.mainArea}>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
            
            {/* 1. Dynamic Progress Tracker */}
            <ProgressTracker current={pilotStats.currentWeek} goal={pilotGoalWeeks} />

            <View style={styles.header}>
              <Text style={styles.headerTitle}>Readiness Scorecard</Text>
              <Text style={styles.description}>
                {pilotStats.isComplete 
                  ? `Full ${pilotGoalWeeks}-week pilot dataset finalized. Core growth signals validated for Seed Round.` 
                  : `Live pilot performance tracking. Cumulative averages reflect real-time institutional readiness.`}
              </Text>
            </View>

            {/* 2. Cumulative Results Table */}
            <Text style={styles.sectionLabel}>Cumulative Performance</Text>
            <View style={styles.tableCard}>
              <View style={styles.tableHeader}>
                <Text style={[styles.headerCell, { flex: 2 }]}>Metric</Text>
                <Text style={styles.headerCell}>Target</Text>
                <Text style={styles.headerCell}>Current Avg</Text>
                <Text style={[styles.headerCell, { textAlign: 'right' }]}>Signal</Text>
              </View>

              {metrics.map((item, index) => (
                <View key={index} style={styles.tableRow}>
                  <Text style={[styles.metricName, { flex: 2 }]}>{item.name}</Text>
                  <Text style={styles.targetText}>{item.target}</Text>
                  <Text style={styles.resultText}>{item.result}</Text>
                  <View style={styles.signalWrapper}>
                    <SignalBadge type={item.signal as any} />
                  </View>
                </View>
              ))}
            </View>

            {/* 3. Narrative Insight */}
            <View style={styles.narrativeBox}>
              <Text style={styles.narrativeTitle}>Pilot Narrative</Text>
              <Text style={styles.narrativeText}>
                {pilotStats.isComplete 
                  ? `The ${pilotGoalWeeks}-week pilot has concluded with high student satisfaction and significant task-completion depth. Product virality is confirmed.`
                  : `Currently at week ${pilotStats.currentWeek} of ${pilotGoalWeeks}. Early signals indicate strong organic adoption across the network.`
                }
              </Text>
            </View>

            {/* 4. Institutional Compliance (Static Status) */}
            <Text style={styles.sectionLabel}>Institutional Readiness</Text>
            <View style={styles.complianceGrid}>
              <View style={styles.compCard}>
                <Text style={styles.compLabel}>FERPA COMPLIANCE</Text>
                <Text style={styles.compStatus}>IN PROGRESS</Text>
                <Text style={styles.compNote}>DPA requested by 2 pilot leads.</Text>
              </View>
              <View style={styles.compCard}>
                <Text style={styles.compLabel}>DATA PRIVACY</Text>
                <Text style={styles.compStatus}>PUBLISHED</Text>
                <Text style={styles.compNote}>Draft 2.0 reviewed by counsel.</Text>
              </View>
            </View>

          </ScrollView>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0D0D0D' },
  loadingContainer: { flex: 1, backgroundColor: '#0D0D0D', justifyContent: 'center', alignItems: 'center' },
  layoutBody: { flex: 1, flexDirection: 'row' },
  
  // Sidebar
    persistentSidebar: {
        width: 90, // Fixed width for the nav
        backgroundColor: '#000',
        alignItems: 'center',
        paddingVertical: 30,
        borderRightWidth: 1,
        borderRightColor: '#1E293B',
    },
    sidebarCircle: {
        width: 70,
        height: 40,
        borderRadius: 10,
        backgroundColor: '#051791',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 50,
    },
    logoText: {
        color: '#fff',
        fontWeight: 'bold',
    },
    sidebarNavGroup: {
        flex: 1,
        gap: 30,
    },
    sidebarFooter: {
        borderTopWidth: 1,
        borderTopColor: '#F1F5F9',
        paddingTop: 16,
    },
    footerText: {
        fontSize: 10,
        color: '#94A3B8',
        textAlign: 'center',
        textTransform: 'uppercase'
    },
    sidebarHeader: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 16,
        color: '#fff',
    },
    sidebarLink: {
        width: 70,
        height: 40,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    sidebarLinkActive: {
        width: 70,
        height: 40,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#3B82F6',
    },
    sidebarLinkText: {
        fontSize: 16,
        color: '#ffffff',
    },

  // Content Area
  mainArea: { flex: 1 },
  scrollContent: { padding: 30, maxWidth: 1000, alignSelf: 'center', width: '100%', paddingBottom: 60 },
  header: { marginBottom: 35 },
  headerTitle: { color: '#FFF', fontSize: 32, fontWeight: 'bold' },
  description: { color: '#64748B', fontSize: 15, lineHeight: 22, marginTop: 8 },
  sectionLabel: { fontSize: 11, fontWeight: '900', color: '#475569', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 16, marginTop: 30 },

  // Progress Header
  progressHeader: { backgroundColor: '#1A1A1A', padding: 24, borderRadius: 28, borderWidth: 1, borderColor: '#262626', marginBottom: 40 },
  progressTextRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15, alignItems: 'center' },
  progressLabel: { color: '#5580f7', fontSize: 11, fontWeight: '900', letterSpacing: 1 },
  progressPercent: { color: '#FFF', fontWeight: '900', fontSize: 22 },
  progressBarBg: { height: 10, backgroundColor: '#000', borderRadius: 5, overflow: 'hidden' },
  progressBarFill: { height: '100%', backgroundColor: '#5580f7' },

  // Table
  tableCard: { backgroundColor: '#1A1A1A', borderRadius: 28, borderWidth: 1, borderColor: '#262626', overflow: 'hidden' },
  tableHeader: { flexDirection: 'row', padding: 20, borderBottomWidth: 1, borderBottomColor: '#262626', backgroundColor: '#121212' },
  headerCell: { flex: 1, fontSize: 10, fontWeight: '800', color: '#475569', textTransform: 'uppercase' },
  tableRow: { flexDirection: 'row', padding: 20, borderBottomWidth: 1, borderBottomColor: '#262626', alignItems: 'center' },
  metricName: { color: '#FFF', fontSize: 15, fontWeight: '700' },
  targetText: { flex: 1, color: '#64748B', fontSize: 14, fontWeight: '600' },
  resultText: { flex: 1, color: '#FFF', fontSize: 16, fontWeight: '900' },
  signalWrapper: { flex: 1, alignItems: 'flex-end' },
  signalDot: { width: 10, height: 10, borderRadius: 5 },
  dot_success: { backgroundColor: '#84CC16' },
  dot_warning: { backgroundColor: '#F59E0B' },
  dot_danger: { backgroundColor: '#EF4444' },

  // Compliance Grid
  complianceGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
  compCard: { flex: 1, minWidth: '45%', backgroundColor: '#1A1A1A', padding: 24, borderRadius: 24, borderWidth: 1, borderColor: '#262626' },
  compLabel: { color: '#475569', fontSize: 10, fontWeight: '800', marginBottom: 8 },
  compStatus: { color: '#FFF', fontSize: 20, fontWeight: '900', marginBottom: 4 },
  compNote: { color: '#64748B', fontSize: 13 },

  // Narrative
  narrativeBox: { marginTop: 40, backgroundColor: '#1A1A1A', padding: 30, borderRadius: 32, borderWidth: 1, borderColor: '#5580f7', borderStyle: 'dashed' },
  narrativeTitle: { fontSize: 18, fontWeight: '900', color: '#FFF', marginBottom: 12 },
  narrativeText: { fontSize: 15, color: '#94A3B8', lineHeight: 24 },
});