import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, TextInput } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { collection, addDoc, query, where, getDocs } from 'firebase/firestore';
import { auth, db } from '../config/firebase';

export default function WellnessScreen() {
  const [vasosAgua, setVasosAgua] = useState(0);
  const metaAgua = 8; 
  
  const [nivelCO, setNivelCO] = useState('');
  const [historialCO, setHistorialCO] = useState<any[]>([]); 

  const [tareas, setTareas] = useState([
    { id: 1, texto: 'Leer la guía "Manejo de la Ansiedad"', completada: false },
    { id: 2, texto: 'Hacer 10 mins de respiración diafragmática', completada: false },
    { id: 3, texto: 'Dar un paseo de 20 minutos al sol', completada: false }
  ]);

  const hoy = new Date().toISOString().split('T')[0];
  const storageKey = `@agua_${auth.currentUser?.uid}_${hoy}`;

  // Descargar el historial de CO
  const cargarHistorialCO = async () => {
    try {
      const user = auth.currentUser;
      if (user && db) {
        const q = query(collection(db, 'pruebas_co'), where('userId', '==', user.uid));
        const querySnapshot = await getDocs(q);
        
        const pruebas = querySnapshot.docs.map(d => d.data());
        // Ordenamos para que la más reciente salga arriba
        pruebas.sort((a, b) => new Date(b.fecha_prueba).getTime() - new Date(a.fecha_prueba).getTime());
        
        setHistorialCO(pruebas);
      }
    } catch (error) {
      console.error("Error al cargar historial CO:", error);
    }
  };

  useEffect(() => {
    const cargarAgua = async () => {
      const aguaGuardada = await AsyncStorage.getItem(storageKey);
      if (aguaGuardada !== null) setVasosAgua(Number(aguaGuardada));
    };
    cargarAgua();
    cargarHistorialCO(); // Cargamos el historial al abrir la pantalla
  }, []);

  const sumarAgua = async () => {
    const nuevoValor = vasosAgua + 1;
    setVasosAgua(nuevoValor);
    await AsyncStorage.setItem(storageKey, nuevoValor.toString());
    if (nuevoValor === metaAgua) Alert.alert('¡Reto conseguido! 💧', 'Has llegado a tu meta de hidratación de hoy.');
  };

  const activarRecordatorios = () => {
    Alert.alert('¡Recordatorios Activados!', 'Para esta demo, recibirás una prueba en 5 segundos.');
    setTimeout(() => {
      Alert.alert('🔔 Etna: ¡Momento de cuidarte! 🌱', 'Beber un buen vaso de agua ayuda a reducir el antojo.');
    }, 5000); 
  };

  const toggleTarea = (id: number) => {
    setTareas(tareas.map(tarea => tarea.id === id ? { ...tarea, completada: !tarea.completada } : tarea));
  };

  const guardarNivelCO = async () => {
    if (!nivelCO) {
      Alert.alert('Faltan datos', 'Introduce el valor (ppm) de tu última prueba.');
      return;
    }

    try {
      const user = auth.currentUser;
      if (user && db) {
        await addDoc(collection(db, 'pruebas_co'), {
          userId: user.uid,
          fecha_prueba: new Date().toISOString(),
          nivel_ppm: Number(nivelCO)
        });
        
        Alert.alert('Registro médico guardado', 'Tu nivel de monóxido de carbono se ha actualizado en tu historial clínico.');
        setNivelCO(''); 
        cargarHistorialCO(); // Recargamos la lista visual al instante
      }
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
      <Text style={styles.header}>Bienestar y Energía 🌱</Text>
      <Text style={styles.subtitle}>Cuidar tu mente y tu cuerpo reduce la ansiedad.</Text>

      {/* --- SECCIÓN COOXIMETRÍA CON HISTORIAL --- */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Prueba de Cooximetría 🫁</Text>
        <Text style={styles.cardText}>Si has visitado el CMAPA o tienes un dispositivo, registra aquí tu nivel de Monóxido de Carbono (ppm).</Text>
        
        <View style={styles.coContainer}>
          <TextInput
            style={styles.inputCO}
            keyboardType="numeric"
            placeholder="Ej: 15"
            value={nivelCO}
            onChangeText={setNivelCO}
            maxLength={3}
          />
          <Text style={styles.ppmText}>ppm</Text>
        </View>

        <TouchableOpacity style={styles.saveBtn} onPress={guardarNivelCO}>
          <Text style={styles.saveBtnText}>Guardar Resultado</Text>
        </TouchableOpacity>

        {/* LISTA DEL HISTORIAL VISUAL */}
        {historialCO.length > 0 && (
          <View style={styles.historialContainer}>
            <Text style={styles.historialTitle}>Tu historial de pruebas:</Text>
            {historialCO.map((prueba, index) => (
              <View key={index} style={styles.historialRow}>
                <Text style={styles.historialFecha}>{prueba.fecha_prueba.split('T')[0]}</Text>
                <Text style={[styles.historialPpm, prueba.nivel_ppm <= 10 ? {color: '#4caf50'} : {color: '#f57c00'}]}>
                  {prueba.nivel_ppm} ppm
                </Text>
              </View>
            ))}
          </View>
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Tareas del CMAPA 📋</Text>
        <Text style={styles.cardText}>Actividades asignadas por tu profesional de salud:</Text>
        {tareas.map((tarea) => (
          <TouchableOpacity key={tarea.id} style={[styles.taskItem, tarea.completada && styles.taskItemCompleted]} onPress={() => toggleTarea(tarea.id)}>
            <View style={[styles.checkbox, tarea.completada && styles.checkboxCompleted]}>
              {tarea.completada && <Text style={styles.checkmark}>✓</Text>}
            </View>
            <Text style={[styles.taskText, tarea.completada && styles.taskTextCompleted]}>{tarea.texto}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Reto de Hidratación 💧</Text>
        <View style={styles.waterContainer}>
          <Text style={styles.waterCount}>{vasosAgua} / {metaAgua}</Text>
          <Text style={styles.waterSub}>vasos hoy</Text>
        </View>
        <TouchableOpacity style={styles.waterBtn} onPress={sumarAgua}>
          <Text style={styles.waterBtnText}>+ Beber un vaso</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.notifyBtn} onPress={activarRecordatorios}>
        <Text style={styles.notifyBtnText}>🔔 Activar Recordatorios Diarios</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fdfbf7', padding: 20 },
  header: { fontSize: 28, fontWeight: 'bold', color: '#333', marginTop: 40, textAlign: 'center' },
  subtitle: { fontSize: 16, color: '#666', textAlign: 'center', marginBottom: 20, fontStyle: 'italic' },
  card: { backgroundColor: '#fff', padding: 20, borderRadius: 16, marginBottom: 20, elevation: 2, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 8, borderWidth: 1, borderColor: '#f0f0f0' },
  cardTitle: { fontSize: 20, fontWeight: 'bold', color: '#333', marginBottom: 5 },
  cardText: { fontSize: 14, color: '#555', marginBottom: 15 },
  
  coContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 15 },
  inputCO: { borderWidth: 1, borderColor: '#ccc', padding: 10, borderRadius: 8, width: 80, textAlign: 'center', fontSize: 20, backgroundColor: '#fafafa' },
  ppmText: { fontSize: 20, fontWeight: 'bold', color: '#666', marginLeft: 10 },
  saveBtn: { backgroundColor: '#333', padding: 12, borderRadius: 8, alignItems: 'center' },
  saveBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },

  // Estilos del Historial CO
  historialContainer: { marginTop: 20, borderTopWidth: 1, borderTopColor: '#eee', paddingTop: 15 },
  historialTitle: { fontSize: 14, fontWeight: 'bold', color: '#555', marginBottom: 10 },
  historialRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5, borderBottomWidth: 1, borderBottomColor: '#f9f9f9' },
  historialFecha: { fontSize: 14, color: '#666' },
  historialPpm: { fontSize: 14, fontWeight: 'bold' },

  taskItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f9f9f9', padding: 15, borderRadius: 10, marginBottom: 10, borderWidth: 1, borderColor: '#eee' },
  taskItemCompleted: { backgroundColor: '#e8f5e9', borderColor: '#c8e6c9' },
  checkbox: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: '#ccc', marginRight: 15, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' },
  checkboxCompleted: { backgroundColor: '#4caf50', borderColor: '#4caf50' },
  checkmark: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
  taskText: { flex: 1, fontSize: 15, color: '#333' },
  taskTextCompleted: { color: '#888', textDecorationLine: 'line-through' },
  waterContainer: { alignItems: 'center', marginBottom: 20 },
  waterCount: { fontSize: 48, fontWeight: 'bold', color: '#0288d1' },
  waterSub: { fontSize: 16, color: '#888' },
  waterBtn: { backgroundColor: '#03a9f4', padding: 15, borderRadius: 30, alignItems: 'center' },
  waterBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  notifyBtn: { backgroundColor: '#4caf50', padding: 15, borderRadius: 12, alignItems: 'center', marginBottom: 20, elevation: 2 },
  notifyBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 }
});