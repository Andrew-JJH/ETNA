import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TextInput, TouchableOpacity, Alert, ScrollView, Modal, FlatList } from 'react-native';
import { doc, getDoc, collection, addDoc, updateDoc, query, where, getDocs } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { auth, db } from '../config/firebase';

import ProgressCards from '../components/ProgressCards';
import WeeklyChart from '../components/WeeklyChart';
import GamificationBadges from '../components/GamificationBadges';

export default function DashboardScreen() {
  const [userData, setUserData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [nivelAnsiedad, setNivelAnsiedad] = useState('');
  const [recaida, setRecaida] = useState(0);
  const [datosGrafica, setDatosGrafica] = useState([0, 0, 0, 0, 0, 0, 0]);

  // Estados del Modal de Registro
  const [modalVisible, setModalVisible] = useState(false);
  const [razonSeleccionada, setRazonSeleccionada] = useState('');
  const [momentoSeleccionado, setMomentoSeleccionado] = useState('');
  const [tecnicaSeleccionada, setTecnicaSeleccionada] = useState('');

  // NUEVO: Estados para el Diario del Paciente
  const [modalDiarioVisible, setModalDiarioVisible] = useState(false);
  const [historialDiario, setHistorialDiario] = useState<any[]>([]);

  const opcionesTecnica = ['Agua fría', 'Chicle/Snack', 'Respiración', 'Paseo', 'Ninguna'];

  const hoy = new Date().toISOString().split('T')[0];
  const storageKey = `@recaida_${auth.currentUser?.uid}_${hoy}`;

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

          // 1. Datos para la gráfica
          const last7Days: string[] = [];
          for(let i=6; i>=0; i--) {
             const d = new Date();
             d.setDate(d.getDate() - i);
             last7Days.push(d.toISOString().split('T')[0]);
          }
          const sums = [0, 0, 0, 0, 0, 0, 0];
          logs.forEach(log => {
             const logDateStr = log.fecha_registro.split('T')[0];
             const index = last7Days.indexOf(logDateStr);
             if(index !== -1 && log.fumado) sums[index] += 1; 
          });
          setDatosGrafica(sums);

          // 2. NUEVO: Guardamos el historial completo ordenado por fecha (más reciente primero)
          const historialOrdenado = logs.sort((a, b) => new Date(b.fecha_registro).getTime() - new Date(a.fecha_registro).getTime());
          setHistorialDiario(historialOrdenado);

          const recaidaGuardada = await AsyncStorage.getItem(storageKey);
          if (recaidaGuardada !== null) setRecaida(Number(recaidaGuardada));
        }
      } catch (error) {
        console.error("Error al obtener datos:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchUserDataAndLocalData();
  }, [modalVisible]); // Recargamos si se cierra el modal de registrar (para que se actualice el diario)

  const modificarRecaida = async (nuevoValor: number) => {
    setRecaida(nuevoValor);
    await AsyncStorage.setItem(storageKey, nuevoValor.toString());
  };

  const registrarEventoClinico = async (fumado: boolean) => {
    try {
      const user = auth.currentUser;
      if (user && db) {
        await addDoc(collection(db, 'registros_diarios'), {
          userId: user.uid,
          fecha_registro: new Date().toISOString(),
          razon: razonSeleccionada.trim(),
          momento_dificil: momentoSeleccionado.trim(),
          tecnica_usada: tecnicaSeleccionada,
          fumado: fumado 
        });

        if (fumado) {
          modificarRecaida(recaida + 1);
          const nuevaFecha = new Date().toISOString();
          
          const inicioAnterior = new Date(userData.fecha_abandono).getTime();
          const diasLimpioActual = Math.floor(Math.max(0, (new Date().getTime() - inicioAnterior) / (1000 * 60 * 60 * 24)));
          const mejorRachaHistorica = Math.max(diasLimpioActual, userData.mejor_racha || 0);

          const userRef = doc(db, 'usuarios', user.uid);
          await updateDoc(userRef, { fecha_abandono: nuevaFecha, mejor_racha: mejorRachaHistorica });
          setUserData({ ...userData, fecha_abandono: nuevaFecha, mejor_racha: mejorRachaHistorica });
          
          Alert.alert('Un tropiezo no es una caída', `Has recaído, pero tu récord de ${mejorRachaHistorica} días demuestra que PUEDES hacerlo. ¡A por la siguiente racha!`);
        } else {
          let mensaje = 'Tu victoria ha sido registrada para tu psicólogo. ¡Sigue así!';
          if (tecnicaSeleccionada === 'Agua fría') mensaje = '¡Genial! Ese vaso de agua ha engañado a tu cerebro y cortado el pico de ansiedad.';
          else if (tecnicaSeleccionada === 'Respiración') mensaje = 'El oxígeno es tu mejor aliado. Has oxigenado tu sangre en lugar de ensuciarla. ¡Bravo!';
          else if (tecnicaSeleccionada === 'Paseo') mensaje = 'Cambiar de ambiente es una técnica experta. Alejarte del estímulo te ha salvado hoy.';
          else if (tecnicaSeleccionada === 'Chicle/Snack') mensaje = 'Has mantenido la boca ocupada de forma sana. ¡Has superado el craving!';
          Alert.alert('¡Impulso Superado! 🌟', mensaje);
        }

        setModalVisible(false);
        setRazonSeleccionada('');
        setMomentoSeleccionado('');
        setTecnicaSeleccionada('');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  };

  const handleGuardarFinDeDia = async () => {
    if (!nivelAnsiedad) {
      Alert.alert('Faltan datos', 'Indica tu nivel de ansiedad general del día (1-10).');
      return;
    }
    Alert.alert('¡Día completado!', 'Tus registros detallados y tu nivel de ansiedad han sido guardados.');
    
    const nuevosDatos = [...datosGrafica];
    nuevosDatos[6] += recaida;
    setDatosGrafica(nuevosDatos);

    setNivelAnsiedad('');
    setRecaida(0);
    await AsyncStorage.removeItem(storageKey);
  };

  let diasSinFumar = 0; let dineroAhorrado = 0; let cigarrillosEvitados = 0;
  if (userData && userData.fecha_abandono) {
    const fechaInicio = new Date(userData.fecha_abandono).getTime();
    const ahora = new Date().getTime();
    diasSinFumar = Math.max(0, (ahora - fechaInicio) / (1000 * 60 * 60 * 24));
    const precioPorCigarrillo = userData.precio_paquete / 20;
    cigarrillosEvitados = userData.consumo_diario_medio * diasSinFumar;
    dineroAhorrado = cigarrillosEvitados * precioPorCigarrillo;
  }

  const graficaEnTiempoReal = [...datosGrafica];
  graficaEnTiempoReal[6] += recaida;

  if (loading) return <View style={styles.centerContainer}><ActivityIndicator size="large" color="#f57c00" /></View>;

  const formularioCompleto = razonSeleccionada.trim() !== '' && momentoSeleccionado.trim() !== '' && tecnicaSeleccionada !== '';
  const isVaper = userData?.tipo_consumo === 'vapeador';

  // Render para cada elemento de la lista del Diario
  const renderItemDiario = ({ item }: { item: any }) => {
    const fecha = new Date(item.fecha_registro).toLocaleDateString();
    return (
      <View style={[styles.diarioItem, item.fumado ? styles.diarioItemRecaida : styles.diarioItemExito]}>
        <View style={styles.diarioHeaderRow}>
          <Text style={styles.diarioFecha}>{fecha}</Text>
          <Text style={styles.diarioStatus}>{item.fumado ? '❌ Recaída' : '✅ Resistido'}</Text>
        </View>
        <Text style={styles.diarioContexto}>📍 {item.momento_dificil}</Text>
        <Text style={styles.diarioRazon}>💭 "{item.razon}"</Text>
        <Text style={styles.diarioTecnica}>🛠️ Técnica: {item.tecnica_usada}</Text>
      </View>
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
      <Text style={styles.header}>Tu Progreso 🌋</Text>
      
      <View style={styles.streakCard}>
        <Text style={styles.labelCenter}>TIEMPO LIBRE DE HUMO</Text>
        <Text style={styles.bigValue}>{Math.floor(diasSinFumar)} días</Text>
        {userData?.mejor_racha > 0 && (
           <Text style={styles.recordText}>🏆 Récord a batir: {userData.mejor_racha} días</Text>
        )}
      </View>

      <View style={styles.row}>
        <View style={[styles.card, styles.halfCard]}>
          <Text style={styles.label}>DINERO AHORRADO</Text>
          <Text style={styles.value}>{new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(dineroAhorrado)}</Text>
        </View>
        <View style={[styles.card, styles.halfCard]}>
          <Text style={styles.label}>{isVaper ? 'USOS EVITADOS' : 'NO FUMADOS'}</Text>
          <Text style={styles.value}>{new Intl.NumberFormat('es-ES', { maximumFractionDigits: 0 }).format(cigarrillosEvitados)}</Text>
        </View>
      </View>

      <View style={styles.logCard}>
        <Text style={styles.logTitle}>📝 Control de Hoy</Text>
        <Text style={styles.inputLabel}>{isVaper ? 'Usos de vapeador hoy' : 'Cigarrillos consumidos hoy'}</Text>
        <View style={styles.counterContainer}>
          <Text style={styles.counterValue}>{recaida}</Text>
          <TouchableOpacity style={[styles.counterBtn, { backgroundColor: '#d32f2f', borderColor: '#d32f2f' }]} onPress={() => setModalVisible(true)}>
            <Text style={[styles.counterBtnText, { color: '#fff' }]}>+ Registrar Tentación</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.helperText}>Pulsa para registrar un impulso o si has resistido las ganas.</Text>

        <Text style={styles.inputLabel}>Nivel de ansiedad general del día (1-10)</Text>
        <TextInput style={styles.input} keyboardType="numeric" placeholder="Ej: 4" value={nivelAnsiedad} onChangeText={setNivelAnsiedad} maxLength={2} />

        <TouchableOpacity style={styles.saveBtn} onPress={handleGuardarFinDeDia}>
          <Text style={styles.saveBtnText}>Cerrar Día y Guardar</Text>
        </TouchableOpacity>

        {/* NUEVO BOTÓN: ABRIR EL DIARIO DEL PACIENTE */}
        <TouchableOpacity style={styles.diarioBtn} onPress={() => setModalDiarioVisible(true)}>
          <Text style={styles.diarioBtnText}>📖 Ver mi Diario de Reflexión</Text>
        </TouchableOpacity>
      </View>

      <WeeklyChart datosSemana={graficaEnTiempoReal} />
      <GamificationBadges diasSinFumar={diasSinFumar} dineroAhorrado={dineroAhorrado} />

      {/* --- MODAL CLÍNICO (PARA REGISTRAR) --- */}
      <Modal animationType="slide" transparent={true} visible={modalVisible} onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <ScrollView style={styles.modalView} keyboardShouldPersistTaps="handled">
            <Text style={styles.modalTitle}>Análisis de la Tentación</Text>
            
            <Text style={styles.sectionTitle}>1. ¿Cuál es la razón principal?</Text>
            <TextInput style={[styles.modalInput, { height: 60 }]} placeholder="Ej: Discusión con mi jefe..." value={razonSeleccionada} onChangeText={setRazonSeleccionada} multiline />

            <Text style={styles.sectionTitle}>2. Momento difícil (Contexto)</Text>
            <TextInput style={styles.modalInput} placeholder="Ej: Al salir del trabajo, 18:00h" value={momentoSeleccionado} onChangeText={setMomentoSeleccionado} />

            <Text style={styles.sectionTitle}>3. Técnica utilizada</Text>
            <View style={styles.tagsGrid}>
              {opcionesTecnica.map(t => (
                <TouchableOpacity key={t} style={[styles.tagBtn, tecnicaSeleccionada === t && styles.tagBtnActive]} onPress={() => setTecnicaSeleccionada(t)}>
                  <Text style={[styles.tagText, tecnicaSeleccionada === t && styles.tagTextActive]}>{t}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity style={[styles.cancelarFumarBtn, !formularioCompleto && { opacity: 0.5 }]} disabled={!formularioCompleto} onPress={() => registrarEventoClinico(false)}>
                <Text style={styles.cancelarFumarTexto}>Resistí 🛑</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.confirmarFumarBtn, !formularioCompleto && { opacity: 0.5 }]} disabled={!formularioCompleto} onPress={() => registrarEventoClinico(true)}>
                <Text style={styles.confirmarFumarTexto}>Recaí  {isVaper ? '💨' : '🚬'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={{alignItems: 'center', marginTop: 10}} onPress={() => setModalVisible(false)}>
                <Text style={{color: '#888', fontWeight: 'bold'}}>Cancelar</Text>
              </TouchableOpacity>
            </View>
            <View style={{height: 40}}/>
          </ScrollView>
        </View>
      </Modal>

      {/* --- NUEVO MODAL: EL DIARIO DEL PACIENTE --- */}
      <Modal animationType="slide" transparent={true} visible={modalDiarioVisible} onRequestClose={() => setModalDiarioVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalView, { maxHeight: '85%' }]}>
            <Text style={styles.modalTitle}>Mi Diario de Reflexión 📖</Text>
            <Text style={styles.helperText}>Leer tus experiencias pasadas te ayuda a identificar tus patrones de recaída.</Text>
            
            {historialDiario.length === 0 ? (
              <Text style={{textAlign: 'center', marginTop: 30, color: '#888'}}>Aún no tienes registros en tu diario.</Text>
            ) : (
              <FlatList
                data={historialDiario}
                keyExtractor={(item, index) => index.toString()}
                renderItem={renderItemDiario}
                contentContainerStyle={{ paddingBottom: 20, paddingTop: 10 }}
                showsVerticalScrollIndicator={false}
              />
            )}

            <TouchableOpacity style={[styles.saveBtn, { marginTop: 15 }]} onPress={() => setModalDiarioVisible(false)}>
              <Text style={styles.saveBtnText}>Cerrar Diario</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fdfbf7', padding: 20 },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { fontSize: 28, fontWeight: 'bold', color: '#333', marginBottom: 20, marginTop: 40, textAlign: 'center' },
  streakCard: { backgroundColor: '#fff', padding: 20, borderRadius: 16, marginBottom: 15, elevation: 2, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 8, alignItems: 'center' },
  labelCenter: { fontSize: 12, color: '#888', fontWeight: '600', marginBottom: 8, textAlign: 'center' },
  bigValue: { fontSize: 36, fontWeight: 'bold', color: '#333', textAlign: 'center' },
  recordText: { fontSize: 14, color: '#f57c00', fontWeight: 'bold', marginTop: 8, backgroundColor: '#fff3e0', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  card: { backgroundColor: '#fff', padding: 20, borderRadius: 16, marginBottom: 15, elevation: 2, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 8 },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  halfCard: { width: '48%' },
  label: { fontSize: 12, color: '#888', fontWeight: '600', marginBottom: 8 },
  value: { fontSize: 22, fontWeight: 'bold', color: '#f57c00' },
  logCard: { backgroundColor: '#fff', padding: 20, borderRadius: 16, marginBottom: 25, elevation: 2, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 8, borderWidth: 1, borderColor: '#f0f0f0' },
  logTitle: { fontSize: 18, fontWeight: 'bold', color: '#333', marginBottom: 15 },
  inputLabel: { fontSize: 14, color: '#555', marginBottom: 5, marginTop: 15, fontWeight: '500' },
  input: { borderWidth: 1, borderColor: '#e0e0e0', padding: 10, borderRadius: 8, backgroundColor: '#fafafa', fontSize: 16 },
  helperText: { fontSize: 12, color: '#888', textAlign: 'center', marginBottom: 10, fontStyle: 'italic' },
  counterContainer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginVertical: 10 },
  counterBtn: { paddingHorizontal: 20, height: 40, borderRadius: 20, borderWidth: 1, justifyContent: 'center', alignItems: 'center' },
  counterBtnText: { fontSize: 16, fontWeight: 'bold' },
  counterValue: { fontSize: 32, fontWeight: 'bold', marginHorizontal: 30, color: '#333' },
  saveBtn: { backgroundColor: '#333', padding: 15, borderRadius: 8, alignItems: 'center', marginTop: 20 },
  saveBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  
  // Estilo del botón del Diario
  diarioBtn: { backgroundColor: '#e3f2fd', padding: 15, borderRadius: 8, alignItems: 'center', marginTop: 10, borderWidth: 1, borderColor: '#90caf9' },
  diarioBtnText: { color: '#1976d2', fontWeight: 'bold', fontSize: 15 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalView: { width: '100%', maxHeight: '90%', backgroundColor: 'white', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 25, shadowColor: '#000', elevation: 5 },
  modalTitle: { fontSize: 22, fontWeight: 'bold', color: '#d32f2f', textAlign: 'center', marginBottom: 10 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#555', marginTop: 15, marginBottom: 10 },
  modalInput: { borderWidth: 1, borderColor: '#e0e0e0', padding: 12, borderRadius: 8, backgroundColor: '#fafafa', fontSize: 15, color: '#333', textAlignVertical: 'top' },
  tagsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tagBtn: { paddingVertical: 8, paddingHorizontal: 12, borderWidth: 1, borderColor: '#ddd', borderRadius: 20, backgroundColor: '#f9f9f9' },
  tagBtnActive: { backgroundColor: '#f57c00', borderColor: '#f57c00' },
  tagText: { color: '#666', fontSize: 13 },
  tagTextActive: { color: '#fff', fontWeight: 'bold' },
  modalActions: { flexDirection: 'column', gap: 12, marginTop: 30 },
  cancelarFumarBtn: { backgroundColor: '#4caf50', padding: 15, borderRadius: 10, alignItems: 'center' },
  cancelarFumarTexto: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  confirmarFumarBtn: { backgroundColor: '#f5f5f5', padding: 15, borderRadius: 10, alignItems: 'center', borderWidth: 1, borderColor: '#ddd' },
  confirmarFumarTexto: { color: '#666', fontWeight: 'bold', fontSize: 16 },

  // Estilos de las tarjetas dentro del Diario
  diarioItem: { padding: 15, borderRadius: 12, marginBottom: 12, borderWidth: 1 },
  diarioItemExito: { backgroundColor: '#f1f8e9', borderColor: '#c5e1a5' },
  diarioItemRecaida: { backgroundColor: '#ffebee', borderColor: '#ef9a9a' },
  diarioHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8, borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.05)', paddingBottom: 5 },
  diarioFecha: { fontSize: 14, fontWeight: 'bold', color: '#555' },
  diarioStatus: { fontSize: 14, fontWeight: 'bold' },
  diarioContexto: { fontSize: 14, color: '#333', marginBottom: 4, fontWeight: '600' },
  diarioRazon: { fontSize: 14, color: '#666', fontStyle: 'italic', marginBottom: 6 },
  diarioTecnica: { fontSize: 13, color: '#555', fontWeight: '500' }
});