import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TextInput, TouchableOpacity, Alert, ScrollView, Modal, FlatList, Platform } from 'react-native';
import { doc, getDoc, collection, addDoc, updateDoc, query, where, getDocs } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { SchedulableTriggerInputTypes } from 'expo-notifications';
import { auth, db } from '../config/firebase';

import WeeklyChart from '../components/WeeklyChart';
import GamificationBadges from '../components/GamificationBadges';

// Configuración de notificaciones
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export default function DashboardScreen() {
  const [userData, setUserData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [nivelAnsiedad, setNivelAnsiedad] = useState('');
  const [recaida, setRecaida] = useState(0);
  const [datosGrafica, setDatosGrafica] = useState([0, 0, 0, 0, 0, 0, 0]);

  // Estados Modales
  const [modalVisible, setModalVisible] = useState(false);
  const [modalDiarioVisible, setModalDiarioVisible] = useState(false);
  const [historialDiario, setHistorialDiario] = useState<any[]>([]);

  // Estados Registro Impulso
  const [razonSeleccionada, setRazonSeleccionada] = useState('');
  const [momentoSeleccionado, setMomentoSeleccionado] = useState('');
  const [tecnicaSeleccionada, setTecnicaSeleccionada] = useState('');

  const opcionesTecnica = ['Agua fría', 'Chicle/Snack', 'Respiración', 'Paseo', 'Ninguna'];
  const hoy = new Date().toISOString().split('T')[0];
  const storageKey = `@recaida_${auth.currentUser?.uid}_${hoy}`;

  // --- EFECTO TIEMPO REAL (Cuentakilómetros) ---
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  // --- SISTEMA DE PÍLDORAS INFORMATIVAS ---
  // --- SISTEMA DE PÍLDORAS INFORMATIVAS (CORREGIDO SIN ERRORES) ---
  const programarPildorasSalud = async () => {
    try {
      const { status } = await Notifications.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert("Permisos necesarios", "Habilita las notificaciones para recibir tus hitos de salud.");
        return;
      }

      // Limpiamos las anteriores para que la prueba sea limpia
      await Notifications.cancelAllScheduledNotificationsAsync();

      const hitos = [
        // PRUEBA RÁPIDA (1 y 2 minutos)
        { mins: 1, titulo: "🚀 ¡Sistema Etna Activo!", body: "A partir de ahora, te avisaremos cada vez que tu cuerpo gane una batalla médica." },
        { mins: 2, titulo: "❤️ Corazón agradecido", body: "Tu tensión arterial y pulso han vuelto a la normalidad. ¡Tu cardio empieza a mejorar ya!" },
        
        // HITOS MÉDICOS REALES
        { mins: 480, titulo: "🌬️ Oxigenación Limpia", body: "8 horas: El monóxido de carbono en sangre baja al 50%. Tus músculos reciben más oxígeno." },
        { mins: 1440, titulo: "🫀 ¡Riesgo reducido!", body: "24 horas: El riesgo de ataque cardíaco súbito ha empezado a disminuir drásticamente." },
        { mins: 2880, titulo: "👅 ¡Vuelve el sabor!", body: "48 horas: Tus terminaciones nerviosas se regeneran. Disfrutarás más de la comida hoy." },
        { mins: 4320, titulo: "🏃 Capacidad Pulmonar", body: "72 horas: Tus bronquios se relajan. Notarás que te cansas mucho menos al moverte." }
      ];

      for (const h of hitos) {
        await Notifications.scheduleNotificationAsync({
          content: { 
            title: h.titulo, 
            body: h.body, 
            sound: true,
            // Eliminamos la línea de AndroidPriority que daba error
          },
          trigger: { 
            type: SchedulableTriggerInputTypes.TIME_INTERVAL,
            seconds: h.mins * 60,
            repeats: false 
          } as Notifications.NotificationTriggerInput,
        });
      }
      Alert.alert("🚀 Plan de Salud Activado", "Verifica tu móvil en 1 y 2 minutos para ver los primeros hitos.");
    } catch (error) { 
      console.error(error); 
    }
  };

  useEffect(() => {
    const fetchUserDataAndLocalData = async () => {
      try {
        const user = auth.currentUser;
        if (user && db) {
          const docRef = doc(db, 'usuarios', user.uid);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) setUserData(docSnap.data());

          const q = query(collection(db, 'registros_diarios'), where('userId', '==', user.uid));
          const querySnapshot = await getDocs(q);
          const logs = querySnapshot.docs.map(d => d.data());

          const last7Days: string[] = [];
          for(let i=6; i>=0; i--) {
             const d = new Date(); d.setDate(d.getDate() - i);
             last7Days.push(d.toISOString().split('T')[0]);
          }
          const sums = [0, 0, 0, 0, 0, 0, 0];
          logs.forEach(log => {
             const logDateStr = log.fecha_registro.split('T')[0];
             const index = last7Days.indexOf(logDateStr);
             if(index !== -1 && log.fumado) sums[index] += 1; 
          });
          setDatosGrafica(sums);

          const historialOrdenado = logs.sort((a, b) => new Date(b.fecha_registro).getTime() - new Date(a.fecha_registro).getTime());
          setHistorialDiario(historialOrdenado);

          const recaidaGuardada = await AsyncStorage.getItem(storageKey);
          if (recaidaGuardada !== null) setRecaida(Number(recaidaGuardada));
        }
      } catch (error) { console.error(error); } finally { setLoading(false); }
    };
    fetchUserDataAndLocalData();
  }, [modalVisible]);

  const registrarEventoClinico = async (fumado: boolean) => {
    if (!razonSeleccionada || !tecnicaSeleccionada) {
      Alert.alert("Faltan datos", "Indica la razón y la técnica para tu informe.");
      return;
    }
    try {
      const user = auth.currentUser;
      const horaEvento = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      if (user && db) {
        await addDoc(collection(db, 'registros_diarios'), {
          userId: user.uid,
          fecha_registro: new Date().toISOString(),
          hora_evento: horaEvento,
          razon: razonSeleccionada,
          tecnica_usada: tecnicaSeleccionada,
          fumado: fumado,
          contexto: momentoSeleccionado
        });

        if (fumado) {
          const nuevaFecha = new Date().toISOString();
          await updateDoc(doc(db, 'usuarios', user.uid), { fecha_abandono: nuevaFecha });
          setUserData({ ...userData, fecha_abandono: nuevaFecha });
          setRecaida(recaida + 1);
          Alert.alert('Tropiezo registrado', 'Reiniciamos el contador. ¡Mucho ánimo!');
        } else {
          Alert.alert('¡Victoria! ✅', `Has usado ${tecnicaSeleccionada} con éxito.`);
        }
        setModalVisible(false);
        setRazonSeleccionada(''); setMomentoSeleccionado(''); setTecnicaSeleccionada('');
      }
    } catch (e) { console.error(e); }
  };

  const handleGuardarFinDeDia = async () => {
    if (!nivelAnsiedad) { Alert.alert('Faltan datos', 'Indica tu nivel de ansiedad.'); return; }
    Alert.alert('Día completado', 'Tus datos han sido guardados correctamente.');
    setNivelAnsiedad(''); setRecaida(0);
    await AsyncStorage.removeItem(storageKey);
  };

  // --- CÁLCULOS ---
  let diasSinFumar = 0; let dineroAhorrado = 0; let cigarrillosEvitados = 0;
  if (userData && userData.fecha_abandono) {
    const fechaInicio = new Date(userData.fecha_abandono).getTime();
    const ahora = new Date().getTime();
    diasSinFumar = Math.max(0, (ahora - fechaInicio) / (1000 * 60 * 60 * 24));
    const precioPorUnidad = (userData.precio_paquete || 5) / 20;
    cigarrillosEvitados = (userData.consumo_diario_medio || 20) * diasSinFumar;
    dineroAhorrado = cigarrillosEvitados * precioPorUnidad;
  }
  const isVaper = userData?.tipo_consumo === 'Vapeador' || userData?.tipo_consumo === 'Cachimba';

  const renderItemDiario = ({ item }: { item: any }) => (
    <View style={[styles.diarioItem, item.fumado ? styles.diarioItemRecaida : styles.diarioItemExito]}>
      <View style={styles.diarioHeaderRow}>
        <Text style={styles.diarioFecha}>{new Date(item.fecha_registro).toLocaleDateString()} - {item.hora_evento}</Text>
        <Text style={styles.diarioStatus}>{item.fumado ? '❌ Recaída' : '✅ Resistido'}</Text>
      </View>
      <Text style={styles.diarioContexto}>📍 {item.contexto || 'Sin contexto'}</Text>
      <Text style={styles.diarioTecnica}>🛠️ Técnica: {item.tecnica_usada}</Text>
      <Text style={styles.diarioRazon}>💭 "{item.razon}"</Text>
    </View>
  );

  if (loading) return <View style={styles.centerContainer}><ActivityIndicator size="large" color="#f57c00" /></View>;

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
      
      <View style={styles.streakCard}>
        <Text style={styles.labelCenter}>TIEMPO LIBRE DE HUMO</Text>
        <Text style={styles.bigValue}>{Math.floor(diasSinFumar)} días</Text>
        <Text style={styles.recordText}>
          ⏱️ {Math.floor((diasSinFumar % 1) * 24)}h {Math.floor(((diasSinFumar % 1) * 24 % 1) * 60)}min {Math.floor(((((diasSinFumar % 1) * 24 % 1) * 60) % 1) * 60)}s
        </Text>
        <TouchableOpacity style={styles.btnPildoras} onPress={programarPildorasSalud}>
          <Text style={styles.btnPildorasTexto}>🔔 Activar Píldoras de Salud</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.row}>
        <View style={[styles.card, styles.halfCard]}>
          <Text style={styles.label}>DINERO AHORRADO</Text>
          <Text style={styles.value}>
            {new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2 }).format(dineroAhorrado)}
          </Text>
        </View>
        <View style={[styles.card, styles.halfCard]}>
          <Text style={styles.label}>{isVaper ? 'USOS EVITADOS' : 'NO FUMADOS'}</Text>
          <Text style={styles.value}>{Math.floor(cigarrillosEvitados)}</Text>
        </View>
      </View>

      <View style={styles.logCard}>
        <Text style={styles.logTitle}>📝 Control de Hoy</Text>
        <View style={styles.counterContainer}>
          <Text style={styles.counterValue}>{recaida}</Text>
          <TouchableOpacity style={styles.counterBtnRed} onPress={() => setModalVisible(true)}>
            <Text style={styles.counterBtnTextWhite}>+ Registrar Impulso</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.inputLabel}>Ansiedad del día (1-10)</Text>
        <TextInput style={styles.input} keyboardType="numeric" placeholder="Ej: 4" value={nivelAnsiedad} onChangeText={setNivelAnsiedad} />
        <TouchableOpacity style={styles.saveBtn} onPress={handleGuardarFinDeDia}><Text style={styles.saveBtnText}>Cerrar Día y Guardar</Text></TouchableOpacity>
        <TouchableOpacity style={styles.diarioBtn} onPress={() => setModalDiarioVisible(true)}><Text style={styles.diarioBtnText}>📖 Ver mi Diario de Reflexión</Text></TouchableOpacity>
      </View>

      <WeeklyChart datosSemana={[...datosGrafica.slice(0,6), datosGrafica[6] + recaida]} />
      <GamificationBadges diasSinFumar={diasSinFumar} dineroAhorrado={dineroAhorrado} />

      {/* MODAL REGISTRO */}
      <Modal animationType="slide" transparent={true} visible={modalVisible}>
        <View style={styles.modalOverlay}>
          <ScrollView style={styles.modalView}>
            <Text style={styles.modalTitle}>Análisis de la Tentación</Text>
            <Text style={styles.sectionTitle}>1. ¿Por qué has sentido ganas?</Text>
            <TextInput style={styles.modalInput} placeholder="Ej: Estrés laboral..." value={razonSeleccionada} onChangeText={setRazonSeleccionada} multiline />
            <Text style={styles.sectionTitle}>2. Momento y Contexto</Text>
            <TextInput style={styles.modalInput} placeholder="Ej: Después de comer" value={momentoSeleccionado} onChangeText={setMomentoSeleccionado} />
            <Text style={styles.sectionTitle}>3. ¿Qué técnica has usado?</Text>
            <View style={styles.tagsGrid}>
              {opcionesTecnica.map(t => (
                <TouchableOpacity key={t} style={[styles.tagBtn, tecnicaSeleccionada === t && styles.tagBtnActive]} onPress={() => setTecnicaSeleccionada(t)}>
                  <Text style={[styles.tagText, tecnicaSeleccionada === t && styles.tagTextActive]}>{t}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.btnResisti} onPress={() => registrarEventoClinico(false)}><Text style={styles.btnTextWhite}>Resistí 🛑</Text></TouchableOpacity>
              <TouchableOpacity style={styles.btnRecai} onPress={() => registrarEventoClinico(true)}><Text style={styles.btnTextGrey}>Recaí {isVaper ? '💨' : '🚬'}</Text></TouchableOpacity>
              <TouchableOpacity onPress={() => setModalVisible(false)}><Text style={styles.cancelText}>Cerrar</Text></TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* MODAL DIARIO */}
      <Modal visible={modalDiarioVisible} animationType="fade" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalView, {maxHeight: '80%'}]}>
            <Text style={styles.modalTitle}>Mi Diario 📖</Text>
            <FlatList data={historialDiario} keyExtractor={(_, i) => i.toString()} renderItem={renderItemDiario} />
            <TouchableOpacity style={styles.saveBtn} onPress={() => setModalDiarioVisible(false)}><Text style={styles.saveBtnText}>Cerrar Diario</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fdfbf7', padding: 20 },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  streakCard: { backgroundColor: '#fff', padding: 25, borderRadius: 20, marginBottom: 15, elevation: 3, alignItems: 'center' },
  labelCenter: { fontSize: 12, color: '#888', fontWeight: 'bold' },
  bigValue: { fontSize: 42, fontWeight: 'bold', color: '#333' },
  recordText: { fontSize: 13, color: '#0288d1', marginTop: 5, fontWeight: 'bold' },
  btnPildoras: { marginTop: 15, backgroundColor: '#f1f8e9', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 20, borderWidth: 1, borderColor: '#4caf50' },
  btnPildorasTexto: { color: '#4caf50', fontWeight: 'bold', fontSize: 11 },
  card: { backgroundColor: '#fff', padding: 15, borderRadius: 16, marginBottom: 15, elevation: 2 },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  halfCard: { width: '48%' },
  label: { fontSize: 11, color: '#999', fontWeight: 'bold', marginBottom: 5 },
  value: { fontSize: 20, fontWeight: 'bold', color: '#f57c00' },
  logCard: { backgroundColor: '#fff', padding: 20, borderRadius: 16, marginBottom: 20, borderWidth: 1, borderColor: '#eee' },
  logTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 15 },
  counterContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  counterValue: { fontSize: 36, fontWeight: 'bold', color: '#333' },
  counterBtnRed: { backgroundColor: '#d32f2f', padding: 12, borderRadius: 12 },
  counterBtnTextWhite: { color: '#fff', fontWeight: 'bold' },
  inputLabel: { fontSize: 14, color: '#555', marginTop: 15, marginBottom: 5 },
  input: { borderWidth: 1, borderColor: '#ddd', padding: 10, borderRadius: 8, backgroundColor: '#fafafa' },
  saveBtn: { backgroundColor: '#333', padding: 15, borderRadius: 10, alignItems: 'center', marginTop: 20 },
  saveBtnText: { color: '#fff', fontWeight: 'bold' },
  diarioBtn: { backgroundColor: '#e3f2fd', padding: 15, borderRadius: 10, alignItems: 'center', marginTop: 10, borderWidth: 1, borderColor: '#bbdefb' },
  diarioBtnText: { color: '#1976d2', fontWeight: 'bold' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalView: { backgroundColor: '#fff', borderTopLeftRadius: 25, borderTopRightRadius: 25, padding: 25 },
  modalTitle: { fontSize: 22, fontWeight: 'bold', color: '#d32f2f', textAlign: 'center' },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', marginTop: 20, marginBottom: 10 },
  modalInput: { borderWidth: 1, borderColor: '#ddd', padding: 12, borderRadius: 10, backgroundColor: '#f9f9f9', minHeight: 60 },
  tagsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tagBtn: { padding: 10, borderRadius: 20, borderWidth: 1, borderColor: '#ddd' },
  tagBtnActive: { backgroundColor: '#f57c00', borderColor: '#f57c00' },
  tagText: { fontSize: 12, color: '#666' },
  tagTextActive: { color: '#fff', fontWeight: 'bold' },
  modalActions: { marginTop: 30, gap: 10 },
  btnResisti: { backgroundColor: '#4caf50', padding: 15, borderRadius: 12, alignItems: 'center' },
  btnRecai: { backgroundColor: '#f5f5f5', padding: 15, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: '#ddd' },
  btnTextWhite: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  btnTextGrey: { color: '#666', fontWeight: 'bold', fontSize: 16 },
  cancelText: { textAlign: 'center', color: '#999', marginTop: 10 },
  diarioItem: { padding: 15, borderRadius: 12, marginBottom: 10, borderWidth: 1 },
  diarioItemExito: { backgroundColor: '#f1f8e9', borderColor: '#c5e1a5' },
  diarioItemRecaida: { backgroundColor: '#ffebee', borderColor: '#ef9a9a' },
  diarioHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 },
  diarioFecha: { fontWeight: 'bold', color: '#555', fontSize: 12 },
  diarioStatus: { fontWeight: 'bold', fontSize: 12 },
  diarioContexto: { fontSize: 14, fontWeight: '600', color: '#333' },
  diarioTecnica: { fontSize: 13, color: '#0288d1', fontWeight: 'bold', marginVertical: 2 },
  diarioRazon: { fontSize: 13, fontStyle: 'italic', color: '#666' }
});