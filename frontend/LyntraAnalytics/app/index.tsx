import { Text, View, StyleSheet, TouchableOpacity, Touchable, ActivityIndicator } from "react-native";
import React, { useMemo } from 'react';
import { Header } from "@react-navigation/elements";
import Tab from "@/components/Tab";
import { ScrollView } from "react-native-gesture-handler";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Modal } from "react-native";
import { useRouter } from "expo-router";
import { VictoryChart, VictoryLine, VictoryTheme, VictoryAxis, VictoryScatter, VictoryContainer } from 'victory-native';
import Animated, { useSharedValue, withTiming, useAnimatedStyle, withSpring } from 'react-native-reanimated';

type CourseID = 'global' | string;
const SIDEBAR_WIDTH = 200;

const MetricCard = ({ title, value, unit = '', onPress, trend }: any) => {
  const isPositive = Number(trend) > 0;
  // If value is null, undefined, or 'NaN', it's "No Data"
  const hasData = value !== null && value !== undefined && value !== 'NaN' && value !== '--';
  
  return (
    <TouchableOpacity 
      style={[styles.card, !hasData && { opacity: 0.7 }]} 
      onPress={onPress} 
      activeOpacity={0.8}
    >
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle} numberOfLines={1}>{title}</Text>
        <View style={styles.trendContainer}>
          {hasData && trend !== null && (
            <View style={styles.trendBadge}>
              <Text style={styles.trendText}>
                {Number(trend) === 0 ? '--' : `${isPositive ? '▲' : '▼'} ${Math.abs(trend)}%`}
              </Text>
            </View>
          )}
        </View>
      </View>
      
      <View style={styles.valueContainer}>
        <Text style={[styles.cardValue, !hasData && { color: '#475569' }]} numberOfLines={1}>
          {hasData ? `${value}${unit}` : '--'}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

const TabItem = ({ label, active, onPress }: any) => (
  <TouchableOpacity 
    style={[styles.tab, active && styles.activeTab]} 
    onPress={onPress}
  >
    <Text style={[styles.tabText, active && styles.activeTabText]}>{label}</Text>
  </TouchableOpacity>
);

const TrendGraph = ({ history, metricKey, label }: any) => {
  const chartData = useMemo(() => {
    return [...history].reverse().map((week) => {
      const val = parseFloat(week[metricKey]);
      return {
        x: week.week_start.split('-').slice(1).join('/'),
        // Use null instead of 0 for missing data so Victory breaks the line
        y: isNaN(val) ? null : val,
      };
    });
  }, [history, metricKey]);

  return (
    <View style={styles.graphContainer}>
      <Text style={styles.graphLabel}>{label.toUpperCase()}</Text>
      <VictoryChart height={500} width={550} theme={VictoryTheme.material}>
        <VictoryAxis style={{ axis: { stroke: '#334155' }, tickLabels: { fill: '#64748B' } }} />
        <VictoryLine 
          data={chartData}
          style={{ data: { stroke: '#5580f7' } }}
        />
        <VictoryScatter 
          data={chartData.filter(d => d.y !== null)} // Only show dots for real data
          style={{ data: { fill: '#FFF' } }}
        />
      </VictoryChart>
    </View>
  );
}

export default function Index() {

  const router = useRouter();

  const [activeTab, setActiveTab] = useState<CourseID>('global');
  const [activeWeek, setActiveWeek] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  const [globalData, setGlobalData] = useState<any[]>([]);
  const [classData, setClassData] = useState<any[]>([]);  
  const [courses, setCourses] = useState<any[]>([]);

  const [selectedMetric, setSelectedMetric] = useState<string | null>(null);
  const [isModalVisible, setIsModalVisible] = useState(false);  
  
  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    setLoading(true);

    const { data: gData } =
      await supabase.from('dashboard_view_global').select('*').order('week_start', {ascending: false});
    setGlobalData(gData || []);

    const { data: cData } =
      await supabase.from('dashboard_view_specific_class').select('*').order('week_start', {ascending: false});
    setClassData(cData || []);

    const courses = Array.from(new Set(cData?.map(c => c.course_code)));
    setCourses(courses as string[]);

    setLoading(false);
  }

  //Helper Function due to non-uniform names in the different views
  const getNormalizedData = (weekIdx: number, tab: CourseID) => {
    const isGlobal = tab === 'global';

    const history = isGlobal ? globalData : classData.filter(d => d.course_code === tab);

    const current = history[weekIdx];
    const previous = history[weekIdx + 1];

    if (! current) return null;

    const calcTrend = (curr: number, prev: number) => {
      if (!prev || prev === 0) return 0;
      return (((curr - prev) / prev) * 100).toFixed(2);
    }

    return {
      date: current.week_start,
      //Global + Class Specific
      activation: {
        value: (isGlobal ? current.global_activation_rate : current.activation_rate) * 100,
        trend: calcTrend(isGlobal ? current.global_activation_rate : current.activation_rate, isGlobal ? previous?.global_activation_rate : previous?.activation_rate) 
      },
      task_completion_rate: {
        value: (isGlobal ? current.global_task_completion_rate : current.task_completion_rate),
        trend: calcTrend(isGlobal ? current.global_task_completion_rate : current.task_completion_rate, isGlobal ? previous?.global_task_completion_rate : previous?.task_completion_rate)
      },
      student_Nps: {
        value: isGlobal ? current.global_student_nps : current.student_nps,
        trend: 0
      }, 
      professor_Nps: {
        value: isGlobal ? current.global_professor_nps : current.professor_nps,
        trend: 0
      },
      //Global Only Metrics
      average_sessions: isGlobal ? {value: current.global_avg_sessions_per_student, trend: calcTrend(current.global_avg_sessions_per_student, previous?.global_avg_sessions_per_student)} : null,
      assignment_breakdown_usage: isGlobal ? {value: current.global_assignment_breakdown_usage, trend: calcTrend(current.global_assignment_breakdown_usage, previous?.global_assignment_breakdown_usage)} : null,
      retention: isGlobal ? {value: current.global_week_over_week_retention * 100, trend: 0} : null,
      p1_bugs: isGlobal ? {value: current.global_p1_bugs, trend: calcTrend(current.global_p1_bugs, previous?.global_p1_bugs)} : null,
      canvas_sync_errors: isGlobal ? {value: current.global_canvas_sync_errors, trend: calcTrend(current.global_canvas_sync_errors, previous?.global_canvas_sync_errors)} : null,
      };
    };

  const currentMetrics = useMemo(() => getNormalizedData(activeWeek, activeTab), [activeTab, activeWeek, globalData, classData]);

  if (loading || !currentMetrics) return (
    <View style={styles.loadingContainer}><ActivityIndicator size="large" color="#5568f7" /></View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.layoutBody}>
        {/* Sidebar */}
        <View style={styles.persistentSidebar}>
          <View style={styles.sidebarCircle}><Text style={styles.logoText}>LYNTRA</Text></View>
          <View style={styles.sidebarNavGroup}>
            <TouchableOpacity style={styles.sidebarLinkActive} onPress={() => router.push('/')}>
              <Text style={styles.sidebarLinkText}>Dash</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.sidebarLink} onPress={() => router.push('/editor')}>
              <Text style={styles.sidebarLinkText}>Editor</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.sidebarLink} onPress={() => router.push('/investor')}>
              <Text style={styles.sidebarLinkText}>Investor</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.sidebarFooter}>
            <Text style={styles.footerText}>v1.0.4 Web</Text>
          </View>
        </View>

        <View style={styles.innerContainer}>
          {/* Header */}
          <View style={styles.mainHeader}>
            <Text style={styles.headerTitle}>App Insights</Text>
            <Text style={styles.headerSubtitle}>{activeTab.toUpperCase()}</Text>
          </View>

          {/*Course Selector*/}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabsScroll} contentContainerStyle={styles.tabsScrollContent}>
            <TabItem label="Global" active={activeTab === 'global'} onPress={() => setActiveTab('global')}/>
            {courses.map(course => (
              <TabItem key={course} label={course} active={activeTab === course} onPress={() => setActiveTab(course)}/>
            ))}
          </ScrollView>

          {/* Week Selector */}
          <Text style={styles.sectionLabel}>Timeline (Latest → Earlierst) </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.timelineScroll} contentContainerStyle={styles.timelineScrollContent}>
            {globalData.map((data, index) => (
              <TouchableOpacity
                key={data.week_start}
                style={[styles.weekBtn, activeWeek === index && styles.activeWeekBtn]}
                onPress={() => setActiveWeek(index)}
              >
                <Text style={[styles.weekBtnText, activeWeek === index && styles.activeWeekBtnText]}>
                  Week {globalData.length - index}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.scrollContent}>
            {/* Core KPIS */}
            <Text style={styles.sectionLabel}>Core KPIS</Text>
            <View style={styles.metricsGrid}>
              <MetricCard
                title="Activation Rate"
                value={currentMetrics.activation.value.toFixed(2)}
                unit="%"
                trend={currentMetrics.activation.trend}
                onPress={() => {
                  setSelectedMetric('activation_rate');
                  setIsModalVisible(true);
                }}
              />
              <MetricCard 
                title="Task Completion Rate"
                value={currentMetrics.task_completion_rate.value.toFixed(2)}
                unit="%"
                trend={currentMetrics.task_completion_rate.trend}
                onPress={() => {
                  setSelectedMetric('task_completion_rate');
                  setIsModalVisible(true);
                }}
              />
              <MetricCard 
                title="Student NPS"
                value={currentMetrics.student_Nps.value.toFixed(2)}
                unit=""
                trend={currentMetrics.student_Nps.trend}
                onPress={() => {
                  setSelectedMetric('student_nps');
                  setIsModalVisible(true);
                }}
              />
              <MetricCard 
                title="Professor NPS"
                value={currentMetrics.professor_Nps.value.toFixed(2)}
                unit=""
                trend={currentMetrics.professor_Nps.trend}
                onPress={() => {
                  setSelectedMetric('professor_nps');
                  setIsModalVisible(true);
                }}
              />
            </View>
              {/* Global Only Metrics */}
              {activeTab === 'global' && (
                <>
                  <Text style={styles.sectionLabel}>Global Only Metrics</Text>
                  <View style={styles.metricsGrid}>
                    <MetricCard 
                      title="Average Sessions per Student"
                      value={currentMetrics.average_sessions?.value ?? 0}
                      trend={currentMetrics.average_sessions?.trend ?? 0}
                      onPress={() => {
                        setSelectedMetric('avg_sessions_per_student');
                        setIsModalVisible(true);
                      }}
                    />
                    <MetricCard 
                      title="Assignment Breakdown Usage"
                      value={(currentMetrics.assignment_breakdown_usage?.value ?? 0).toFixed(2)}
                      trend={currentMetrics.assignment_breakdown_usage?.trend ?? 0}
                      onPress={() => {
                        setSelectedMetric('assignment_breakdown_usage');
                        setIsModalVisible(true);
                      }}
                    />
                    <MetricCard 
                      title="Retention"
                      value={(currentMetrics.retention?.value ?? 0).toFixed(2)}
                      unit="%"
                      trend={0}
                      onPress={() => {
                        setSelectedMetric('week_over_week_retention');
                        setIsModalVisible(true);
                      }}
                    />
                    <MetricCard 
                      title="P1 Bugs"
                      value={currentMetrics.p1_bugs?.value ?? 0}
                      trend={currentMetrics.p1_bugs?.trend ?? 0}
                      onPress={() => {
                        setSelectedMetric('p1_bugs');
                        setIsModalVisible(true);
                      }}
                    />
                    <MetricCard 
                      title="Canvas Sync Errors"
                      value={currentMetrics.canvas_sync_errors?.value ?? 0}
                      trend={currentMetrics.canvas_sync_errors?.trend ?? 0}
                      onPress={() => {
                        console.log(selectedMetric);
                        setSelectedMetric('canvas_sync_errors');
                        setIsModalVisible(true);
                      }}
                    />
                  </View>
                </>
              )}

          <Modal
            animationType="slide"
            transparent={true}
            visible={isModalVisible}
            onRequestClose={() => setIsModalVisible(false)}
          >
            <View style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                <TouchableOpacity
                  style={styles.closeBtn}
                  onPress={() => setIsModalVisible(false)}
                >
                  <Text style={styles.closeBtnText}>CLOSE</Text>
                </TouchableOpacity>

                {selectedMetric && (
                  <TrendGraph 
                    history={activeTab === 'global' ? globalData : classData.filter(d => d.course_code === activeTab)}
                    metricKey={activeTab === 'global' ? `global_${selectedMetric}` : selectedMetric}
                    label={selectedMetric.replace(/_/g, ' ').toUpperCase()}
                  />
                )}
              </View>
            </View>
          </Modal>
          </ScrollView>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  valueContainer: {
    marginTop: 'auto',
  },
  cardUnit: {
    fontSize: 14,
    color : '#475569',
    marginLeft: 4,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  mainHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 40,
    marginBottom: 20,
  },
  persistentSidebar: {
    width: 90, // Fixed width for the nav
    backgroundColor: '#000',
    alignItems: 'center',
    paddingVertical: 30,
    borderRightWidth: 1,
    borderRightColor: '#1E293B',
  },
  layoutBody: {
    flex: 1,
    flexDirection: 'row', 
  },
  sidebarNavGroup: {
    flex: 1,
    gap: 30,
  },
  logoText: {
    color: '#fff',
    fontWeight: 'bold',
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
  trendContainer: {
    minHeight: 22,
    minWidth: 50,
    alignItems: 'flex-end',
  },
  card: {
    backgroundColor: '#1A1A1A',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#262626',
    padding: 20,
    marginBottom: 15,
    height: 120,
    width: 400,
    shadowColor: '#343434',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 30,
  },
  cardTitle: {
    fontSize: 11,
    fontWeight: '600',
    color: '#94A3B8',
    flex: 1,
    marginRight: 4,
  },
  cardValueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardValue: {
    fontSize: 24,
    fontWeight: '800',
    color: '#fff',
  },
  trendIconContainer  : {
    marginLeft: 8,
    padding: 4,
    borderRadius: 4,
  },
  trendIcon: {
    fontSize: 12,
    color: '#fff',
  },
  positive: {
    backgroundColor: '#4CAF50',
  },
  negative: {
    backgroundColor: '#F44336',
  },
  neutral: {
    backgroundColor: '#9E9E9E',
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  trendBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: '#1382f2',
  },
  textSuccess: {
    color: '#fff',
    fontSize: 12,
  },
  textDanger: {
    color: '#fff',
    fontSize: 12,
  },
  cardFooter: {
    marginTop: 8,
    fontSize: 12,
    color: '#777',
  },
  value: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  container: { 
    flex: 1, 
    backgroundColor: '#0D0D0D' 
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#0D0D0D',
    justifyContent: 'center',
  },
  innerContainer: {
    flex: 1,
    paddingHorizontal: 25,
  },
  tabBar: {
    marginVertical: 16,
  },
  tabContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    marginBottom: 16,
  },
  activeTab: {
    borderBottomColor: '#ffffff',
    backgroundColor: '#3B82F6',
  },
  tabText: {
    fontWeight: '600',
    color: '#94A3B8',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  weekBar: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#E2E8F0',
    marginRight: 8,
  },
  weekBarActive: {
    backgroundColor: '#3B82F6',
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 15,
  },
  weekPickerScroll: {
    paddingVertical: 20,
  },
  weekPickerContent: {
    paddingRight: 20, // Extra space at the end of scroll
    alignItems: 'center',
    justifyContent: 'center',
  },
  weekBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#FFF',
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    minWidth: 80,
  },
  activeWeekBtn: {
    backgroundColor: '#0F172A',
    borderColor: '#0F172A',
  },
  weekBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
    lineHeight: 16,
    textAlign: 'center',
    includeFontPadding: false,
    textAlignVertical: 'center',
    display: 'flex',
    alignItems: 'center',
  },
  activeWeekBtnText: {
    color: '#FFF',
  },
  weekBtnTextContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  weekBtnIcon: {
    marginRight: 4,
  },
  weekBtnIconActive: {
    color: '#FFF',
  },
  weekBtnTextActive: {
    color: '#FFF',
  },
  weekBtnIconInactive: {
    color: '#94A3B8',
  },
  weekBtnTextInactive: {
    color: '#94A3B8',
  },
  weekBtnTextContainerInactive: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  weekBtnTextContainerActive: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerSubtitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#557ef7',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  scrollContainer: {
    flexGrow: 1,
  },
  timelineScroll: {
    marginBottom: 8,
    height: 50,
    flexGrow: 0,
  },
  tabsScroll: {
    maxHeight: 50,
    marginBottom: 20,
    flexGrow: 0,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  trendText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#ffffff',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  activeTabText: {
    color: '#ffffff',
  },
  tab:{
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 10,
    backgroundColor: '#1A1A1A'
  },
  tabsScrollContent: {
    height: 72,
    alignItems: 'center',
    paddingBottom: 40,
  },
  timelineScrollContent: {
    paddingVertical: 8,
    paddingRight: 16,
    alignItems: 'center',
  },
  scrollContent: {
    paddingBottom: 40,
    alignItems: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)', // Slate-900
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#1A1A1A',
    width: '100%',
    height: '100%',
    maxHeight: 700,
    maxWidth: 700,
    borderRadius: 30,
    padding: 25,
    borderWidth: 1,
    borderColor: '#334155',
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 10,
  },
  closeBtn: { 
    alignSelf: 'flex-end', 
    marginBottom: 10 
  },
  closeBtnText: { 
    color: '#A855F7', 
    fontWeight: 'bold' 
  },
  graphContainer: { 
    marginTop: 20, 
    height: '100%', 
    width: '100%', 
    alignItems: 'center',
  },
  graphLabel: { 
    fontSize: 14, 
    fontWeight: 'bold', 
    color: '#fff', 
    marginBottom: 10 
  },
  barWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: 180,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    paddingBottom: 5,
  },
  barColumn: { alignItems: 'center', flex: 1 },
  bar: {
    width: 25,
    backgroundColor: '#2563EB', // Lyntra Blue
    borderRadius: 4,
    minHeight: 4,
  },
  barDate: { fontSize: 10, color: '#94A3B8', marginTop: 8 },
  modalSub: { color: '#64748B', marginTop: 24, fontSize: 13, textAlign: 'center', fontStyle: 'italic' },

  navToolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  navLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    minWidth: 80,
  },
  navLinkText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94A3B8',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  horizontalScrollWrapper: {
    marginVertical: 8,
  },
});
