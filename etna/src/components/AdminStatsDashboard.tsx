import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';

export default function AdminStatsDashboard({ pacientes }: { pacientes: any[] }) {
  
  // Procesamos los datos matemáticos automáticamente
  const stats = useMemo(() => {
    let ahorroTotal = 0;
    let cigsEvitadosTotal = 0;
    let vapers = 0;
    let fumadores = 0;

    pacientes.forEach((p: any) => {
      // Cálculo de ahorro y cigarrillos evitados
      if (p.fecha_abandono) {
        const diasSin = Math.max(0, (new Date().getTime() - new Date(p.fecha_abandono).getTime()) / (1000 * 60 * 60 * 24));
        ahorroTotal += diasSin * (p.consumo_diario_medio || 0) * ((p.precio_paquete || 5) / 20);
        cigsEvitadosTotal += (diasSin * (p.consumo_diario_medio || 0));
      }

      // Cálculo de demografía
      if (p.tipo_consumo === 'vapeador') vapers++;
      else fumadores++;
    });

    const total = pacientes.length || 1; // Evitar división por cero
    const pctVapers = Math.round((vapers / total) * 100);
    const pctFumadores = Math.round((fumadores / total) * 100);

    return {
      totalPacientes: pacientes.length,
      ahorroTotal: Math.floor(ahorroTotal),
      cigsEvitados: Math.floor(cigsEvitadosTotal),
      pctVapers,
      pctFumadores,
      vapers,
      fumadores
    };
  }, [pacientes]);

  // --- FUNCIÓN ESTRELLA: EXPORTAR A EXCEL (CSV) ---
  const exportarExcel = async () => {
    try {
      // Creamos la cabecera del Excel
      let csvString = "ID_Anonimo,Tipo_Dispositivo,Consumo_Diario,Fecha_Abandono\n";
      
      // Rellenamos con los datos (No incluimos email por privacidad de datos médicos)
      pacientes.forEach((p, index) => {
        csvString += `Paciente_${index + 1},${p.tipo_consumo || 'No_definido'},${p.consumo_diario_medio || 0},${p.fecha_abandono || 'Activo'}\n`;
      });

      // Guardamos el archivo en caché
      const fileUri = FileSystem.cacheDirectory + 'Datos_Investigacion_CMAPA.csv';
      await FileSystem.writeAsStringAsync(fileUri, csvString, { encoding: FileSystem.EncodingType.UTF8 });

      // Lo compartimos
      await Sharing.shareAsync(fileUri, {
        mimeType: 'text/csv',
        dialogTitle: 'Exportar Datos CMAPA'
      });

    } catch (error) {
      Alert.alert("Error", "No se pudo generar el archivo de investigación.");
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
      
      {/* 1. KPIs PRINCIPALES */}
      <Text style={styles.sectionTitle}>Impacto Global CMAPA 🌍</Text>
      <View style={styles.grid}>
        <View style={[styles.card, { borderTopColor: '#0288d1' }]}>
          <Ionicons name="people" size={28} color="#0288d1" />
          <Text style={styles.val}>{stats.totalPacientes}</Text>
          <Text style={styles.lbl}>Pacientes</Text>
        </View>
        <View style={[styles.card, { borderTopColor: '#2e7d32' }]}>
          <Ionicons name="cash" size={28} color="#2e7d32" />
          <Text style={styles.val}>{stats.ahorroTotal}€</Text>
          <Text style={styles.lbl}>Ahorro Total</Text>
        </View>
        <View style={[styles.card, { borderTopColor: '#ef6c00' }]}>
          <Ionicons name="leaf" size={28} color="#ef6c00" />
          <Text style={styles.val}>{stats.cigsEvitados}</Text>
          <Text style={styles.lbl}>Humos Evitados</Text>
        </View>
        <View style={[styles.card, { borderTopColor: '#7b1fa2' }]}>
          <Ionicons name="analytics" size={28} color="#7b1fa2" />
          <Text style={styles.val}>4.2</Text>
          <Text style={styles.lbl}>Ansiedad Media</Text>
        </View>
      </View>

      {/* 2. GRÁFICA DE BARRAS DEMOGRÁFICA NATIVA */}
      <Text style={styles.sectionTitle}>Distribución de Consumo 📊</Text>
      <View style={styles.demographicsCard}>
        <View style={styles.demoRow}>
          <Text style={styles.demoLabel}>🚬 Tabaco Tradicional ({stats.fumadores})</Text>
          <Text style={styles.demoPct}>{stats.pctFumadores}%</Text>
        </View>
        <View style={styles.barBackground}>
          <View style={[styles.barFill, { width: `${stats.pctFumadores}%`, backgroundColor: '#f57c00' }]} />
        </View>

        <View style={styles.demoRow}>
          <Text style={styles.demoLabel}>💨 Vapeador / Electrónico ({stats.vapers})</Text>
          <Text style={styles.demoPct}>{stats.pctVapers}%</Text>
        </View>
        <View style={styles.barBackground}>
          <View style={[styles.barFill, { width: `${stats.pctVapers}%`, backgroundColor: '#0288d1' }]} />
        </View>
      </View>

      {/* 3. BOTÓN DE EXPORTACIÓN PARA INVESTIGACIÓN */}
      <Text style={styles.sectionTitle}>Investigación Clínica 🔬</Text>
      <View style={styles.exportCard}>
        <Text style={styles.exportInfo}>
          Descarga un dataset anonimizado (sin correos electrónicos) listo para importar a Excel o SPSS para análisis estadísticos del centro.
        </Text>
        <TouchableOpacity style={styles.exportBtn} onPress={exportarExcel}>
          <Ionicons name="download-outline" size={20} color="#fff" />
          <Text style={styles.exportBtnText}> Descargar Dataset (CSV)</Text>
        </TouchableOpacity>
      </View>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#102a43', marginBottom: 15, marginTop: 10 },
  
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  card: { width: '48%', backgroundColor: '#fff', padding: 15, borderRadius: 12, marginBottom: 15, alignItems: 'center', elevation: 2, borderTopWidth: 4 },
  val: { fontSize: 22, fontWeight: 'bold', color: '#334e68', marginTop: 8 },
  lbl: { fontSize: 12, color: '#829ab1', marginTop: 4 },

  demographicsCard: { backgroundColor: '#fff', padding: 20, borderRadius: 12, elevation: 2, marginBottom: 20 },
  demoRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8, marginTop: 10 },
  demoLabel: { fontSize: 14, color: '#334e68', fontWeight: 'bold' },
  demoPct: { fontSize: 14, color: '#829ab1', fontWeight: 'bold' },
  barBackground: { height: 12, backgroundColor: '#f0f4f8', borderRadius: 6, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 6 },

  exportCard: { backgroundColor: '#e1f5fe', padding: 20, borderRadius: 12, borderWidth: 1, borderColor: '#b3e5fc' },
  exportInfo: { fontSize: 13, color: '#0288d1', marginBottom: 15, lineHeight: 20 },
  exportBtn: { backgroundColor: '#0288d1', flexDirection: 'row', padding: 15, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  exportBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 }
});