import React, { useState, useEffect, act } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, SafeAreaView, ActivityIndicator } from 'react-native';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'expo-router';

type Step = 'selection' | 'editor';
type EditorTab = 'class' | 'global';

export default function ManagementScreen() {
    const router = useRouter();

    const [loading, setLoading] = useState(true);
    const [currentStep, setCurrentStep] = useState<Step>('selection');
    const [activeTab, setActiveTab] = useState<EditorTab>('class');

    const [courses, setCourses] = useState<any[]>([]);
    const [recentWeeks, setRecentWeeks] = useState<string[]>([]);
    const [selectedWeek, setSelectedWeek] = useState<string>('');
    const [manualDate, setManualDate] = useState(new Date().toISOString().split('T')[0]);

    const [newCourseName, setNewCourseName] = useState('');
    const [newCourseId, setNewCourseId] = useState('');
    const [newProfessor, setNewProfessor] = useState('');
    const [newTotalStudentsEnrolled, setNewTotalStudentsEnrolled] = useState('');
    const [newStatus, setNewStatus] = useState(true);

    const [pilotGoals, setPilotGoals] = useState('8');

    const [formData, setFormData] = useState<any>({
        classMetrics: {},
        globalHealth: {
            prior_wau: '', current_wau: '', p1_bugs: '', p2_bugs: '', sync_errors: '', sync_attempts: '', avg_load_time: ''
        }
    })

    useEffect(() => {
        fetchIntitalData();
    }, []);

    const fetchIntitalData = async () => {
        setLoading(true);
        const { data: courseData } = await supabase.from('courses').select('*');
        setCourses(courseData || []);

        const { data: weekData } = await supabase
            .from('student_engagement')
            .select('week_start')
            .order('week_start', { ascending: false });
        
        const { data: configData } = await supabase.from('app_config').select('*').eq('key', 'pilot_goal_weeks').single();
        if (configData) {
            setPilotGoals(configData.value);
        }

        const uniqueWeeks = Array.from(new Set(weekData?.map(w => w.week_start)));
        setRecentWeeks(uniqueWeeks as string[]);
        setLoading(false);
    };


    // Handlers
    const handleAzureSync = async () => {
        setLoading(true);
        const url = `http://127.0.0.1:5000/api/azure/metrics?week=${manualDate}`
        try {
            const response = await fetch(url, {
                method: 'GET',
                mode: 'cors',
                headers: {
                    'Content-Type': 'application/json',
                },
            });
            const data = await response.json();

            if (data.error) throw new Error(data.error);    

            setFormData((prev: any) => ({
                ...prev,
                globalHealth: {
                    ...prev.globalHealth,
                    current_wau: data.global.current_wau?.toString() || '',
                    sync_errors: data.global.sync_errors?.toString() || '',
                    sync_attempts: data.global.sync_attempts?.toString() || '',
                    avg_load_time: data.global.avg_load_time?.toString() || '',
                },
                classMetrics: (() => {
                    const updatedClassMetrics = { ...prev.classMetrics };
                    Object.keys(data.courses).forEach(courseCode => {
                        const courseRef = courses.find(c => c.course_code === courseCode);
                        if (courseRef){
                            updatedClassMetrics[courseRef.id] = {
                                ...updatedClassMetrics[courseRef.id],
                                students_activated: data.courses[courseCode].students_activated?.toString() || '',
                                avg_sessions_per_student: data.courses[courseCode].avg_sessions_per_student?.toString() || '',
                                canvas_assignments: data.courses[courseCode].canvas_assignments?.toString() || '',
                                tasks_broken_ai: data.courses[courseCode].tasks_broken_ai?.toString() || '',
                                study_session_completion: data.courses[courseCode].study_session_completion?.toString() || '',
                            };
                        }
                    });
                    return updatedClassMetrics;
                })()
            }));
            alert("Success! Metrics synced from Azure.");
        }
        catch (error) {
            console.error('Error syncing with Azure:', error);
            alert("Failed to sync with Azure. Please try again later.");
        }
        finally {            
            setLoading(false);
        }
    };

    const handleUpdateGoals = async () => {
        const { error } = await supabase.from('app_config').upsert({
            key: 'pilot_goal_weeks',
            value: pilotGoals
        },
        { onConflict: 'key' });
        if (!error) {
            alert("Success! Pilot goal weeks updated.");
        }
    }

    const handleAddCourse = async () => {
        console.log('Adding course:', newCourseName);
        if (!newCourseName) return;
        const { error } = await supabase.from('courses').insert([{
            course_name: newCourseName,
            course_code: newCourseId,
            professor: newProfessor,
            total_students_enrolled: newTotalStudentsEnrolled,
            status: newStatus
        }]);
        if (!error) {
            console.log('Course added successfully');
            fetchIntitalData();
            setNewCourseName('');
            setNewCourseId('');
            setNewProfessor('');
            setNewTotalStudentsEnrolled('');
        }
        console.log('Error adding course:', error);
    }

    const handleDeleteCourse = async (courseId: string) => {
        const confirmed = window.confirm(`Are you sure you want to delete ${courseId}?`);
        if (!confirmed) {
            return;
        }

        try {
            await supabase.from('courses').delete().eq('course_code', courseId);
            alert("Success! Course Deleted.");
            fetchIntitalData();
        } catch (error) {
            console.error('Error deleting course:', error);
        }
    }

    const handleSelectWeek = async (week: string) => {
        setLoading(true);
        setSelectedWeek(week);
        setManualDate(week);

        try {
            const [engagement, tasks, nps, retention, technical, prevRetention] = await Promise.all([
                supabase.from('student_engagement').select('*').eq('week_start', week),
                supabase.from('task_metrics').select('*').eq('week_start', week),
                supabase.from('satisfaction_nps').select('*').eq('week_start', week),
                supabase.from('retention').select('*').eq('week_start', week).limit(1).single(),
                supabase.from('technical_health').select('*').eq('week_start', week).limit(1).single(),
                supabase.from('retention')
                    .select('current_weekly_active_users')
                    .lt('week_start', week)
                    .order('week_start', { ascending: false })
                    .limit(1)
            ]);

            const newClassMetrics: any = {};

            courses.forEach(course => {
                const e = engagement.data?.find((en: any) => en.course_id === course.id) || {};
                const t = tasks.data?.find((ta: any) => ta.course_id === course.id) || {};
                const n = nps.data?.find((np: any) => np.course_id === course.id) || {};

                newClassMetrics[course.id] = {
                    total_enrolled: e.total_enrolled?.toString() || '',
                    students_activated: e.students_activated?.toString() || '',
                    avg_sessions_per_student: e.avg_sessions_per_student?.toString() || '',
                    canvas_assignments: t.canvas_assignments?.toString() || '',
                    tasks_broken_ai: t.tasks_broken_ai?.toString() || '',
                    study_session_completion: t.study_session_completion?.toString() || '',
                    student_survey_responses: n.student_survey_responses?.toString() || '',
                    student_promoters: n.student_promoters?.toString() || '',
                    student_detractors: n.student_detractors?.toString() || '',
                    professor_responses: n.professor_responses?.toString() || '',
                    professor_promoters: n.professor_promoters?.toString() || '',
                    professor_detractors: n.professor_detractors?.toString() || '',
                };
            });

            const newGlobalHealth = {
                prior_wau: retention.data?.prior_weekly_active_users?.toString() || 
                            prevRetention.data?.[0]?.current_weekly_active_users?.toString() 
                            || '',
                current_wau: retention.data?.current_weekly_active_users?.toString() || '',
                p1_bugs: technical.data?.p1_bugs?.toString() || '',
                p2_bugs: technical.data?.p2_bugs?.toString() || '',
                sync_errors: technical.data?.canvas_sync_errors?.toString() || '',
                sync_attempts: technical.data?.total_sync_attempts?.toString() || '',
                avg_load_time: technical.data?.avg_load_time?.toString() || '',
            };

            console.log(prevRetention);

            setFormData({
                classMetrics: newClassMetrics,
                globalHealth: newGlobalHealth
            });

            setCurrentStep('editor');
        } catch (error) {
            console.error('Error fetching data:', error);
            alert("Failed to load existing data for the week. You can still enter new data and save, but previous values will not be pre-filled.");
        } finally {
            setLoading(false);
        }
    };

    const updateClassMetric = (courseId: string, field: string, value: string) => {
        setFormData((prev: any) => ({
            ...prev,
            classMetrics: {
                ...prev.classMetrics,
                [courseId]: { ...prev.classMetrics[courseId], [field]: value }
            }
        }));
    };

    const handleFloatClean = (val: any) => {
        if (val === '' || val === null || val === undefined) return 0;
        return parseFloat(val);
    }

    const handleSave = async () => {
        setLoading(true);

        const week = manualDate;

        try {
            for (const course of courses) {
                const metrics = formData.classMetrics[course.id] || {};
                console.log('Saving student engagement for course:', course.id, week, metrics);
                await supabase.from('student_engagement').upsert({
                    course_id: course.id,
                    week_start: week,
                    total_enrolled: metrics.total_enrolled,
                    students_activated: metrics.students_activated,
                    avg_sessions_per_student: metrics.avg_sessions_per_student,
                }, {
                    onConflict: 'course_id, week_start'
                })

                console.log("Saving task metrics for course:", course.id, week, metrics)
                await supabase.from('task_metrics').upsert({
                    course_id: course.id,
                    week_start: week,
                    canvas_assignments: metrics.canvas_assignments,
                    study_session_completion: metrics.study_session_completion,
                    tasks_broken_ai: metrics.tasks_broken_ai,
                }, {
                    onConflict: 'course_id, week_start'
                })

                console.log("Saving NPS for course:", course.id, week, metrics)
                await supabase.from('satisfaction_nps').upsert({
                    course_id: course.id,
                    week_start: week,
                    student_survey_responses: metrics.student_survey_responses,
                    student_promoters: metrics.student_promoters,
                    student_detractors: metrics.student_detractors,
                    professor_responses: metrics.professor_responses,
                    professor_promoters: metrics.professor_promoters,
                    professor_detractors: metrics.professor_detractors,
                }, {
                    onConflict: 'course_id, week_start'
                })
            }

            console.log("Updating Retention")
            await supabase.from('retention').upsert({
                week_start: week,
                current_weekly_active_users: formData.globalHealth.current_wau,
                prior_weekly_active_users: formData.globalHealth.prior_wau,
            }, {
                onConflict: 'week_start'
            })

            console.log("Updating Technical Health")
            await supabase.from('technical_health').upsert({
                week_start: week,
                p1_bugs: formData.globalHealth.p1_bugs,
                p2_bugs: formData.globalHealth.p2_bugs,
                canvas_sync_errors: formData.globalHealth.sync_errors,
                total_sync_attempts: formData.globalHealth.sync_attempts,
                avg_load_time: handleFloatClean(formData.globalHealth.avg_load_time)
            }, {
                onConflict: 'week_start'
            })

            alert("Success! Dashboard Updated.");
            setCurrentStep('selection');
            fetchIntitalData();
        } catch (error) {
            console.error('Error saving data:', error);
        } finally {
            setLoading(false);
        }
    }

    const handleDelete = async (week: string) => {
        setLoading(true);

        const confirmed = window.confirm(`Are you sure you want to delete all data for ${week}?`);

        if (!confirmed) {
            setLoading(false);
            return;
        }

        try {
            await supabase.from('student_engagement').delete().eq('week_start', week);
            await supabase.from('task_metrics').delete().eq('week_start', week);
            await supabase.from('satisfaction_nps').delete().eq('week_start', week);
            await supabase.from('retention').delete().eq('week_start', week);
            await supabase.from('technical_health').delete().eq('week_start', week);
            alert("Success! Dashboard Updated.");
            setCurrentStep('selection');
            fetchIntitalData();
        } catch (error) {
            console.error('Error deleting data:', error);
        } finally {
            setLoading(false);
        }
    }

    if (loading) return <View style={styles.loadingContainer}><ActivityIndicator size="large" color="#5580f7" /></View>;

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
                        <TouchableOpacity style={styles.sidebarLinkActive} onPress={() => router.push('/editor')}>
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

                <View style={styles.mainArea}>
                    <View style={styles.contentConstrainer}>
                        {/* Header */}
                        <View style={styles.header}>
                            <View>
                                <Text style={styles.headerTitle}>Admin Console</Text>
                                <Text style={styles.headerSubtitle}>{currentStep === 'selection' ? 'COMMAND CENTER' : 'MODIFICATION MODE'}</Text>
                            </View>
                            {currentStep === 'editor' && (
                                <TouchableOpacity style={styles.exitBtn} onPress={() => setCurrentStep('selection')}>
                                    <Text style={styles.exitBtnText}>← Back</Text>
                                </TouchableOpacity>
                            )}
                        </View>

                        {currentStep === 'selection' ? (
                            <ScrollView showsVerticalScrollIndicator={false}>
                                <View style={styles.adminSection}>
                                    <Text style={styles.sectionLabel}>Course Registry</Text>
                                    <View style={styles.addCourseRow}>
                                        <ScrollView>
                                            <TextInput
                                                style={styles.smallInput}
                                                placeholder="New Course Code (e.g. CS 537)"
                                                placeholderTextColor="#94A3B8"
                                                value={newCourseId}
                                                onChangeText={setNewCourseId}
                                            />
                                            <TextInput
                                                style={styles.smallInput}
                                                placeholder="New Course Name (e.g. Building User Interfaces)"
                                                placeholderTextColor="#94A3B8"
                                                value={newCourseName}
                                                onChangeText={setNewCourseName}
                                            />
                                            <TextInput
                                                style={styles.smallInput}
                                                placeholder="Professor Name (e.g. Mr. Adam Smith)"
                                                placeholderTextColor="#94A3B8"
                                                value={newProfessor}
                                                onChangeText={setNewProfessor}
                                            />
                                            <TextInput
                                                style={styles.smallInput}
                                                placeholder="Number of Students Enrolled (e.g. 100)"
                                                placeholderTextColor="#94A3B8"
                                                value={newTotalStudentsEnrolled}
                                                onChangeText={setNewTotalStudentsEnrolled}
                                            />
                                            <TouchableOpacity style={styles.addBtn}><Text style={styles.addBtnText}>ADD</Text></TouchableOpacity>
                                        </ScrollView>
                                    </View>
                                    {courses.map(c => (
                                        <View key={c.id} style={styles.courseBadge}>
                                            <Text>{c.course_name}</Text>
                                            <TouchableOpacity onPress={() => handleDeleteCourse(c.course_code)}>
                                                <Text style={styles.deleteBtn}>Delete</Text>
                                            </TouchableOpacity>
                                        </View>
                                    ))}
                                </View>
                                
                                <View style={styles.adminSection}>
                                <Text style={styles.sectionLabel}>Pilot Configuration</Text>
                                <View style={styles.addCourseRow}>
                                    <TextInput 
                                    style={styles.textInputSmall} 
                                    keyboardType="numeric"
                                    value={pilotGoals} 
                                    onChangeText={setPilotGoals} 
                                    placeholder="Goal Weeks (e.g. 8)"
                                    />
                                    <TouchableOpacity style={styles.addBtn} onPress={handleUpdateGoals}>
                                    <Text style={styles.addBtnText}>SET GOAL</Text>
                                    </TouchableOpacity>
                                </View>
                                </View>

                                <TouchableOpacity
                                    style={styles.actionCardPrimary}
                                    onPress={() => handleSelectWeek(new Date().toISOString().split('T')[0])}
                                >
                                    <Text style={styles.actionCardTitlePrimary}>+ Log New Week</Text>
                                </TouchableOpacity>

                                <Text style={styles.sectionLabel}>History Logs</Text>
                                {recentWeeks.map((week) => (
                                    <View style={styles.weekCard}>
                                        <View>
                                            <Text style={styles.weekBadge}>{week}</Text>
                                            <Text style={styles.weekStatus}>Active</Text>
                                        </View>

                                        <View style={styles.ActionRow}>
                                            <TouchableOpacity onPress={() => handleSelectWeek(week)}>
                                                <Text style={styles.actionCardTitle}>Edit</Text>
                                            </TouchableOpacity>

                                            <TouchableOpacity onPress={() => handleDelete(week)}>
                                                <Text style={styles.actionCardTitle}>Delete</Text>
                                            </TouchableOpacity>
                                        </View>
                                    </View>
                                ))}
                            </ScrollView>
                        ) : (
                            <View style={{ flex: 1 }}>
                                <TouchableOpacity 
                                    style={[styles.actionCardPrimary, { backgroundColor: '#051791', marginBottom: 15 }]} 
                                    onPress={handleAzureSync}
                                >
                                    <Text style={[styles.actionCardTitlePrimary, { color: '#FFF' }]}>
                                        🔄 SYNC AZURE ACTIVATIONS
                                    </Text>
                                </TouchableOpacity>
                                <View style={styles.tabContainer}>
                                    <TabBtn label="Class Metrics" active={activeTab === 'class'} onPress={() => setActiveTab('class')} />
                                    <TabBtn label="Global Health" active={activeTab === 'global'} onPress={() => setActiveTab('global')} />
                                </View>

                                <ScrollView showsVerticalScrollIndicator={false}>
                                    <View style={styles.formCard}>
                                        <Text style={styles.editingLabel}>Selected Week Start (YYYY-MM-DD)</Text>
                                        <TextInput style={styles.textInput} value={manualDate} onChangeText={setManualDate} />
                                    </View>

                                    {activeTab === 'class' ? (
                                        courses.map(course => (
                                            <View key={course.id} style={styles.formCard}>
                                                <Text style={styles.formCardTitle}>{course.course_name}</Text>
                                                <Text style={styles.formCardTitle}>Student Engagement</Text>
                                                <View style={styles.inputGrid}>
                                                    <InputField label="Number of Students Enrolled" value={formData.classMetrics[course.id]?.total_enrolled} onChange={(v: string) => updateClassMetric(course.id, 'total_enrolled', v)} />
                                                    <InputField label="Number of Students Activated" value={formData.classMetrics[course.id]?.students_activated} onChange={(v: string) => updateClassMetric(course.id, 'students_activated', v)} />
                                                    <InputField label="Average Sessions Per Student" value={formData.classMetrics[course.id]?.avg_sessions_per_student} onChange={(v: string) => updateClassMetric(course.id, 'avg_sessions_per_student', v)} />
                                                </View>
                                                <View style={{ height: 1, backgroundColor: '#262626', marginVertical: 20 }} />
                                                <Text style={styles.formCardTitle}>Task & Assignment Metrics</Text>
                                                <View style={styles.inputGrid}>
                                                    <InputField label="Assignments Synced From Canvas" value={formData.classMetrics[course.id]?.canvas_assignments} onChange={(v: string) => updateClassMetric(course.id, 'canvas_assignments', v)} />
                                                    <InputField label="Tasks Broken Down by AI" value={formData.classMetrics[course.id]?.tasks_broken_ai} onChange={(v: string) => updateClassMetric(course.id, 'tasks_broken_ai', v)} />
                                                    <InputField label="Study Session Completion" value={formData.classMetrics[course.id]?.study_session_completion} onChange={(v: string) => updateClassMetric(course.id, 'study_session_completion', v)} />
                                                </View>
                                                <View style={{ height: 1, backgroundColor: '#262626', marginVertical: 20 }} />
                                                <Text style={styles.formCardTitle}>Satisfaction & NPS</Text>
                                                <View style={styles.inputGrid}>
                                                    <InputField label="Student Survey Responses" value={formData.classMetrics[course.id]?.student_survey_responses} onChange={(v: string) => updateClassMetric(course.id, 'student_survey_responses', v)} />
                                                    <InputField label="Student Promoters" value={formData.classMetrics[course.id]?.student_promoters} onChange={(v: string) => updateClassMetric(course.id, 'student_promoters', v)} />
                                                    <InputField label="Student Detractors" value={formData.classMetrics[course.id]?.student_detractors} onChange={(v: string) => updateClassMetric(course.id, 'student_detractors', v)} />
                                                    <InputField label="Professor Responses" value={formData.classMetrics[course.id]?.professor_responses} onChange={(v: string) => updateClassMetric(course.id, 'professor_responses', v)} />
                                                    <InputField label="Professor Promoters" value={formData.classMetrics[course.id]?.professor_promoters} onChange={(v: string) => updateClassMetric(course.id, 'professor_promoters', v)} />
                                                    <InputField label="Professor Detractors" value={formData.classMetrics[course.id]?.professor_detractors} onChange={(v: string) => updateClassMetric(course.id, 'professor_detractors', v)} />
                                                </View>
                                            </View>
                                        ))
                                    ) : (
                                        <View style={styles.formCard}>
                                            <Text style={styles.formCardTitle}>Network Diagnostics</Text>
                                            <View style={styles.inputGrid}>
                                                <InputField label="Prior WAU" value={formData.globalHealth.prior_wau} onChange={(v: string) => setFormData({ ...formData, globalHealth: { ...formData.globalHealth, prior_wau: v } })} />
                                                <InputField label="Current WAU" value={formData.globalHealth.current_wau} onChange={(v: string) => setFormData({ ...formData, globalHealth: { ...formData.globalHealth, current_wau: v } })} />
                                                <InputField label="P1 Bugs" value={formData.globalHealth.p1_bugs} onChange={(v: string) => setFormData({ ...formData, globalHealth: { ...formData.globalHealth, p1_bugs: v } })} />
                                                <InputField label="P2 Bugs" value={formData.globalHealth.p2_bugs} onChange={(v: string) => setFormData({ ...formData, globalHealth: { ...formData.globalHealth, p2_bugs: v } })} />
                                                <InputField label="Sync Errors" value={formData.globalHealth.sync_errors} onChange={(v: string) => setFormData({ ...formData, globalHealth: { ...formData.globalHealth, sync_errors: v } })} />
                                                <InputField label="Sync Attempts" value={formData.globalHealth.sync_attempts} onChange={(v: string) => setFormData({ ...formData, globalHealth: { ...formData.globalHealth, sync_attempts: v } })} />
                                                <InputField label="Average Load Time" value={formData.globalHealth.avg_load_time} onChange={(v: string) => setFormData({ ...formData, globalHealth: { ...formData.globalHealth, avg_load_time: v } })} />
                                            </View>
                                        </View>
                                    )}
                                </ScrollView>

                                <TouchableOpacity style={styles.saveButton} onPress={() => handleSave()}>
                                    <Text style={styles.saveButtonText}>COMMIT TO SUPABASE</Text>
                                </TouchableOpacity>
                            </View>
                        )}
                    </View>
                </View>
            </View>
        </SafeAreaView>
    );
}

// --- Internal Components ---
const InputField = ({ label, value, onChange }: any) => (
    <View style={styles.inputWrapper}>
        <Text style={styles.inputLabel}>{label}</Text>
        <TextInput style={styles.textInput} keyboardType="numeric" onChangeText={onChange} value={value} placeholder="0" placeholderTextColor="#334155" />
    </View>
);

const TabBtn = ({ label, active, onPress }: any) => (
    <TouchableOpacity style={[styles.tab, active && styles.activeTab]} onPress={onPress}>
        <Text style={[styles.tabText, active && styles.activeTabText]}>{label}</Text>
    </TouchableOpacity>
);

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
    contentConstrainer: { flex: 1, maxWidth: 900, width: '100%', alignSelf: 'center', padding: 30 },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 35 },
    headerTitle: { color: '#FFF', fontSize: 26, fontWeight: 'bold' },
    headerSubtitle: { color: '#5580f7', fontSize: 11, fontWeight: '900', letterSpacing: 1.5, marginTop: 4 },

    // Forms
    adminSection: { backgroundColor: '#1A1A1A', padding: 24, borderRadius: 24, marginBottom: 25, borderWidth: 1, borderColor: '#262626' },
    sectionLabel: { fontSize: 11, fontWeight: '900', color: '#475569', textTransform: 'uppercase', marginBottom: 15, letterSpacing: 1.5 },
    addCourseRow: { flexDirection: 'row', gap: 10 },
    textInputSmall: { flex: 1, backgroundColor: '#0D0D0D', color: '#FFF', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#262626' },
    textInput: { backgroundColor: '#0D0D0D', color: '#FFF', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: '#262626', fontSize: 15 },
    addBtn: { backgroundColor: '#FFF', marginBottom: 12, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
    addBtnText: { color: '#000', fontWeight: '900', fontSize: 12 },

    // History
    weekCard: { backgroundColor: '#1A1A1A', padding: 24, borderRadius: 24, flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12, borderWidth: 1, borderColor: '#262626' },
    weekDate: { color: '#FFF', fontWeight: '700' },
    editLink: { color: '#5580f7', fontWeight: '900', fontSize: 11 },

    // Buttons
    actionCardPrimary: { backgroundColor: '#5580f7', padding: 20, borderRadius: 20, marginBottom: 30 },
    actionCardTitlePrimary: { color: '#020202', fontWeight: '900', textAlign: 'center' },
    saveButton: { backgroundColor: '#FFF', padding: 20, borderRadius: 20, alignItems: 'center', marginTop: 'auto' },
    saveButtonText: { color: '#000', fontWeight: '900', letterSpacing: 1 },

    // Editor Tabs
    tabContainer: { flexDirection: 'row', backgroundColor: '#1A1A1A', padding: 6, borderRadius: 18, marginBottom: 25 },
    tab: { flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: 14 },
    activeTab: { backgroundColor: '#A855F7' },
    tabText: { color: '#64748B', fontWeight: '800', fontSize: 13 },
    activeTabText: { color: '#FFF' },

    //Course Badges
    courseBadge: { backgroundColor: '#565555', padding: 12, borderRadius: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, borderWidth: 1, borderColor: '#262626' },
    deleteBtn: { color: '#EF4444', fontWeight: '800', fontSize: 11 },

    //Week Badges
    weekBadge: { color: '#FFF', fontWeight: '700' },
    weekStatus: { color: '#22C55E', fontWeight: '700', fontSize: 11 },
    ActionRow: { flexDirection: 'row', gap: 20, marginBottom: 20 },
    actionCardTitle: { color: '#5580f7', fontWeight: '900', fontSize: 11 },

    // Form Cards
    formCard: { backgroundColor: '#1A1A1A', padding: 24, borderRadius: 24, marginBottom: 16, borderWidth: 1, borderColor: '#262626' },
    formCardTitle: { fontWeight: '900', fontSize: 16, color: '#FFF', marginBottom: 20 },
    editingLabel: { color: '#475569', fontSize: 11, fontWeight: '900', textTransform: 'uppercase', marginBottom: 10 },
    inputGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
    inputWrapper: { flex: 1, minWidth: '28%' },
    inputLabel: { fontSize: 10, color: '#64748B', fontWeight: '800', marginBottom: 8 },
    exitBtn: { backgroundColor: '#1E293B', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12 },
    exitBtnText: { color: '#FFF', fontWeight: '800', fontSize: 12 },
    smallInput: { backgroundColor: '#0D0D0D', color: '#FFF', padding: 10, borderRadius: 1, borderWidth: 1, borderColor: '#262626', fontSize: 13, marginTop: 4, marginBottom: 12 },
});