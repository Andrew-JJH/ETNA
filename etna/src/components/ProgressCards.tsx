import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface Props {
  diasSinFumar: number;
  dineroAhorrado: number;
  cigarrillosEvitados: number;
}

export default function ProgressCards({ diasSinFumar, dineroAhorrado, cigarrillosEvitados }: Props) {
  return (
    <View>
      <View style={styles.streakCard}>
        <Text style={styles.labelCenter}>TIEMPO LIBRE DE HUMO</Text>
        <Text style={styles.bigValue}>{Math.floor(diasSinFumar)} días</Text>
      </View>
      <View style={styles.row}>
        <View style={[styles.card, styles.halfCard]}>
          <Text style={styles.label}>DINERO AHORRADO</Text>
          <Text style={styles.value}>
            {new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(dineroAhorrado)}
          </Text>
        </View>
        <View style={[styles.card, styles.halfCard]}>
          <Text style={styles.label}>EVITADOS</Text>
          <Text style={styles.value}>
            {new Intl.NumberFormat('es-ES', { maximumFractionDigits: 0 }).format(cigarrillosEvitados)}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  streakCard: { backgroundColor: '#fff', padding: 20, borderRadius: 16, marginBottom: 15, elevation: 2, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 8, alignItems: 'center', borderWidth: 1, borderColor: '#f0f0f0' },
  labelCenter: { fontSize: 12, color: '#888', fontWeight: '600', marginBottom: 8, textAlign: 'center' },
  bigValue: { fontSize: 36, fontWeight: 'bold', color: '#333', textAlign: 'center' },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  card: { backgroundColor: '#fff', padding: 20, borderRadius: 16, marginBottom: 15, elevation: 2, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 8, borderWidth: 1, borderColor: '#f0f0f0' },
  halfCard: { width: '48%' },
  label: { fontSize: 12, color: '#888', fontWeight: '600', marginBottom: 8 },
  value: { fontSize: 22, fontWeight: 'bold', color: '#f57c00' }
});