import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

interface TabItem {
  id: string | number;
  label: string;
}

interface TabProps {
  activeTab: string | number;
  onTabChange: (tabId: string | number) => void;
  tabs: TabItem[];
}

const Tab = ({ activeTab, onTabChange, tabs }: TabProps) => {
  return (
    <View style={styles.container}>
      {tabs.map((tab) => (
        <TouchableOpacity
          key={tab.id}
          style={[styles.tab, activeTab === tab.id && styles.activeTab]}
          onPress={() => onTabChange(tab.id)}
        >
          <Text style={[styles.tabText, activeTab === tab.id && styles.activeTabText]}>
            {tab.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
};

export default Tab;

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9', // Light Slate
    borderRadius: 8,
    padding: 4,
    marginVertical: 16,
    alignSelf: 'flex-start', // Keeps it from stretching full width on web
  },
  tab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  activeTab: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#64748B',
  },
  activeTabText: {
    color: '#0F172A', // Darker slate for active
  },
});