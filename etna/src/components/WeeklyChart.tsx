import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { LineChart } from 'react-native-chart-kit';

const screenWidth = Dimensions.get("window").width;

interface ChartProps {
  datosSemana: number[];
}

export default function WeeklyChart({ datosSemana }: ChartProps) {
  const nombresDias = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
  const hoyIndex = new Date().getDay();
  
  const ultimosDias = [];
  for (let i = 6; i > 0; i--) {
    const diaAnteriorIndex = (hoyIndex - i + 7) % 7; 
    ultimosDias.push(nombresDias[diaAnteriorIndex]);
  }
  ultimosDias.push("Hoy");

  const chartData = {
    labels: ultimosDias,
    datasets: [{
      data: datosSemana,
      color: (opacity = 1) => `rgba(211, 47, 47, ${opacity})`,
      strokeWidth: 3
    }]
  };

  return (
    <View style={styles.chartCard}>
      <Text style={styles.logTitle}>📊 Consumo Semanal</Text>
      <LineChart
        data={chartData}
        width={screenWidth - 80}
        height={180}
        chartConfig={{
          backgroundColor: "#fff",
          backgroundGradientFrom: "#fff",
          backgroundGradientTo: "#fff",
          decimalPlaces: 0,
          color: (opacity = 1) => `rgba(245, 124, 0, ${opacity})`,
          labelColor: (opacity = 1) => `rgba(100, 100, 100, ${opacity})`,
          style: { borderRadius: 16 },
          propsForDots: { r: "5", strokeWidth: "2", stroke: "#d32f2f" }
        }}
        bezier
        style={{ marginVertical: 8, borderRadius: 16, alignSelf: 'center' }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  chartCard: { backgroundColor: '#fff', padding: 20, borderRadius: 16, marginBottom: 15, elevation: 2, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 8 },
  logTitle: { fontSize: 18, fontWeight: 'bold', color: '#333', marginBottom: 15 }
});