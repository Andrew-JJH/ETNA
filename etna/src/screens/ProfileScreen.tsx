import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, TextInput, ScrollView, ActivityIndicator } from 'react-native';
import { signOut, deleteUser } from 'firebase/auth';
import { doc, getDoc, updateDoc, deleteDoc, collection, addDoc } from 'firebase/firestore';
import { auth, db } from '../config/firebase';

export default function ProfileScreen({ navigation }: any) {
  const [precioPaquete, setPrecioPaquete] = useState('');
  const [consumoDiario, setConsumoDiario] = useState('');
  const [tipoConsumo, setTipoConsumo] = useState('tabaco'); 
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    const cargarDatos = async () => {
      try {
        const user = auth.currentUser;
        if (user && db) {
          const docRef = doc(db, 'usuarios', user.uid);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            const data = docSnap.data();
            if (data.precio_paquete) setPrecioPaquete(data.precio_paquete.toString().replace('.', ','));
            if (data.consumo_diario_medio) setConsumoDiario(data.consumo_diario_medio.toString());
            if (data.tipo_consumo) setTipoConsumo(data.tipo_consumo); 
          }
        }
      } catch (error) {
        console.error("Error al cargar perfil:", error);
      } finally {
        setCargando(false);
      }
    };
    cargarDatos();
  }, []);

  const guardarAjustes = async () => {
    if (!precioPaquete || !consumoDiario) {
      Alert.alert('Faltan datos', 'Por favor, rellena ambos campos.');
      return;
    }
    const precioNum = Number(precioPaquete.replace(',', '.'));
    const consumoNum = Number(consumoDiario.replace(',', '.'));

    if (isNaN(precioNum) || isNaN(consumoNum)) {
      Alert.alert('Error', 'Por favor, introduce números válidos.');
      return;
    }
    try {
      const user = auth.currentUser;
      if (user && db) {
        const docRef = doc(db, 'usuarios', user.uid);
        await updateDoc(docRef, { precio_paquete: precioNum, consumo_diario_medio: consumoNum, tipo_consumo: tipoConsumo });
        Alert.alert('¡Actualizado!', 'Tus ajustes de terapia se han guardado. La aplicación se ha adaptado a tu perfil.');
      }
    } catch (error: any) {
      Alert.alert('Error al guardar', error.message);
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    navigation.replace('Auth');
  };

  const ejecutarBorrado = async () => {
    try {
      const user = auth.currentUser;
      if (user && db) {
        await deleteDoc(doc(db, 'usuarios', user.uid));
        await deleteUser(user);
        Alert.alert("Cuenta eliminada", "Lamentamos verte partir.");
        navigation.replace('Auth');
      }
    } catch (error: any) {
      if (error.code === 'auth/requires-recent-login') Alert.alert("Seguridad", "Cierra sesión e inténtalo de nuevo.");
      else Alert.alert("Error", error.message);
    }
  };

  // --- FUNCIÓN SECRETA PARA INYECTAR DATOS DEL TFG ---
  const inyectarDatosPrueba = async () => {
    try {
      const user = auth.currentUser;
      if (!user || !db) return;

      setCargando(true);

      const userId = user.uid;

      // 1. Inyectar 5 Registros Diarios (Diario Clínico)
      const registros = [
        { fecha_registro: "2026-03-05T09:15:00.000Z", fumado: false, momento_dificil: "Al tomar el primer café de la mañana", razon: "Hábito muy arraigado", tecnica_usada: "Agua fría" },
        { fecha_registro: "2026-03-04T18:30:00.000Z", fumado: true, momento_dificil: "Al salir del trabajo tras una discusión", razon: "Estrés acumulado y frustración", tecnica_usada: "Ninguna" },
        { fecha_registro: "2026-03-02T14:00:00.000Z", fumado: false, momento_dificil: "Justo después de comer", razon: "Sensación de vacío y rutina", tecnica_usada: "Chicle/Snack" },
        { fecha_registro: "2026-02-26T21:45:00.000Z", fumado: true, momento_dificil: "Cenando con amigos en una terraza", razon: "Presión social al ver a otros fumar", tecnica_usada: "Paseo" },
        { fecha_registro: "2026-02-23T11:20:00.000Z", fumado: false, momento_dificil: "Descanso de media mañana", razon: "Aburrimiento y mono físico", tecnica_usada: "Respiración" }
      ];

      for (const reg of registros) {
        await addDoc(collection(db, 'registros_diarios'), { ...reg, userId: userId });
      }

      // 2. Inyectar 3 Pruebas de Cooximetría
      const pruebasCO = [
        { fecha_prueba: "2026-02-10T10:00:00.000Z", nivel_ppm: 28 },
        { fecha_prueba: "2026-02-25T10:30:00.000Z", nivel_ppm: 14 },
        { fecha_prueba: "2026-03-05T09:00:00.000Z", nivel_ppm: 7 }
      ];

      for (const prueba of pruebasCO) {
        await addDoc(collection(db, 'pruebas_co'), { ...prueba, userId: userId });
      }

      Alert.alert('¡Magia hecha! 🪄', 'Se han inyectado 5 registros diarios y 3 pruebas de CO en tu historial.');
    } catch (error: any) {
      Alert.alert('Error al inyectar', error.message);
    } finally {
      setCargando(false);
    }
  };

  if (cargando) return <View style={styles.centerContainer}><ActivityIndicator size="large" color="#f57c00" /></View>;

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
      <Text style={styles.header}>Mi Perfil 👤</Text>
      <View style={styles.card}>
        <Text style={styles.label}>CUENTA VINCULADA</Text>
        <Text style={styles.emailText}>{auth.currentUser?.email}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Ajustes de Terapia ⚙️</Text>
        <Text style={styles.cardSubtitle}>Adapta la aplicación a tu realidad de consumo.</Text>

        <Text style={styles.inputLabel}>¿Qué sueles consumir?</Text>
        <View style={styles.toggleContainer}>
          <TouchableOpacity style={[styles.toggleBtn, tipoConsumo === 'tabaco' && styles.toggleBtnActive]} onPress={() => setTipoConsumo('tabaco')}>
            <Text style={[styles.toggleText, tipoConsumo === 'tabaco' && styles.toggleTextActive]}>🚬 Tabaco</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.toggleBtn, tipoConsumo === 'vapeador' && styles.toggleBtnActive]} onPress={() => setTipoConsumo('vapeador')}>
            <Text style={[styles.toggleText, tipoConsumo === 'vapeador' && styles.toggleTextActive]}>💨 Vapeador</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.inputLabel}>{tipoConsumo === 'tabaco' ? 'Precio actual del paquete (€)' : 'Precio del líquido/recambio (€)'}</Text>
        <TextInput style={styles.input} keyboardType="decimal-pad" value={precioPaquete} onChangeText={setPrecioPaquete} />

        <Text style={styles.inputLabel}>{tipoConsumo === 'tabaco' ? 'Cigarrillos que fumabas al día' : 'Usos/Caladas medias al día'}</Text>
        <TextInput style={styles.input} keyboardType="numeric" value={consumoDiario} onChangeText={setConsumoDiario} />

        <TouchableOpacity style={styles.saveBtn} onPress={guardarAjustes}>
          <Text style={styles.saveBtnText}>Guardar Cambios</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.spacer} />

      <View style={styles.actionContainer}>
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}><Text style={styles.logoutBtnText}>Cerrar Sesión</Text></TouchableOpacity>
        
        {/* BOTÓN SECRETO PARA EL TFG */}
        <TouchableOpacity style={styles.demoBtn} onPress={inyectarDatosPrueba}>
          <Text style={styles.demoBtnText}>🌱 Inyectar Datos de Prueba (Demo)</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.deleteBtn} onPress={() => Alert.alert("Eliminar", "¿Seguro?", [{text:"Cancelar"},{text:"Sí", onPress: ejecutarBorrado}])}>
          <Text style={styles.deleteBtnText}>Eliminar mi cuenta</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fdfbf7', padding: 20 },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { fontSize: 28, fontWeight: 'bold', color: '#333', marginTop: 40, marginBottom: 20, textAlign: 'center' },
  card: { backgroundColor: '#fff', padding: 20, borderRadius: 16, marginBottom: 15, elevation: 2, borderWidth: 1, borderColor: '#f0f0f0' },
  label: { fontSize: 12, color: '#888', fontWeight: '600', marginBottom: 8 },
  emailText: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  cardTitle: { fontSize: 18, fontWeight: 'bold', color: '#333', marginBottom: 5 },
  cardSubtitle: { fontSize: 13, color: '#666', marginBottom: 15, fontStyle: 'italic' },
  inputLabel: { fontSize: 14, color: '#555', marginBottom: 5, fontWeight: '500' },
  input: { borderWidth: 1, borderColor: '#e0e0e0', padding: 12, borderRadius: 8, backgroundColor: '#fafafa', fontSize: 16, marginBottom: 15 },
  saveBtn: { backgroundColor: '#f57c00', padding: 15, borderRadius: 8, alignItems: 'center', marginTop: 5 },
  saveBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  spacer: { height: 30 },
  actionContainer: { marginBottom: 20 },
  logoutBtn: { backgroundColor: '#333', padding: 15, borderRadius: 12, alignItems: 'center', marginBottom: 15 },
  logoutBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  deleteBtn: { backgroundColor: 'transparent', padding: 15, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: '#d32f2f' },
  deleteBtnText: { color: '#d32f2f', fontWeight: 'bold', fontSize: 16 },
  toggleContainer: { flexDirection: 'row', marginBottom: 15, backgroundColor: '#f0f0f0', borderRadius: 8, padding: 4 },
  toggleBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 6 },
  toggleBtnActive: { backgroundColor: '#fff', elevation: 2, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 2 },
  toggleText: { color: '#888', fontWeight: '600' },
  toggleTextActive: { color: '#f57c00', fontWeight: 'bold' },
  
  // Estilo del botón secreto
  demoBtn: { backgroundColor: '#4caf50', padding: 15, borderRadius: 12, alignItems: 'center', marginBottom: 15 },
  demoBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 14 }
});