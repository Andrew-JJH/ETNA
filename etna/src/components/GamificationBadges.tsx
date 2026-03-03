import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';

interface Props {
  diasSinFumar: number;
  dineroAhorrado: number;
}

export default function GamificationBadges({ diasSinFumar, dineroAhorrado }: Props) {
  const badges = [
    { id: 1, title: '1 Día', icon: '🌱', unlocked: diasSinFumar >= 1 },
    { id: 2, title: '3 Días', icon: '🔥', unlocked: diasSinFumar >= 3 },
    { id: 3, title: '1 Semana', icon: '⭐', unlocked: diasSinFumar >= 7 },
    { id: 4, title: 'Primeros 20€', icon: '💰', unlocked: dineroAhorrado >= 20 },
    { id: 5, title: '1 Mes', icon: '🏆', unlocked: diasSinFumar >= 30 },
  ];

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Tus Trofeos 🏅</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.scroll}>
        {badges.map(badge => (
          <View key={badge.id} style={[styles.badgeCard, !badge.unlocked && styles.lockedCard]}>
            <Text style={[styles.badgeIcon, !badge.unlocked && styles.lockedText]}>
              {badge.unlocked ? badge.icon : '🔒'}
            </Text>
            <Text style={[styles.badgeTitle, !badge.unlocked && styles.lockedText]}>
              {badge.title}
            </Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: 20 },
  title: { fontSize: 18, fontWeight: 'bold', color: '#333', marginBottom: 15 },
  scroll: { flexDirection: 'row' },
  badgeCard: { backgroundColor: '#fff', padding: 15, borderRadius: 12, marginRight: 10, alignItems: 'center', justifyContent: 'center', width: 90, elevation: 2, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 4, borderWidth: 1, borderColor: '#f57c00' },
  lockedCard: { backgroundColor: '#f0f0f0', borderColor: '#e0e0e0', elevation: 0, shadowOpacity: 0 },
  badgeIcon: { fontSize: 28, marginBottom: 5 },
  badgeTitle: { fontSize: 12, fontWeight: 'bold', color: '#f57c00', textAlign: 'center' },
  lockedText: { color: '#aaa' }
});