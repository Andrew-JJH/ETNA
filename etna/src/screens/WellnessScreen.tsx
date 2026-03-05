import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, TextInput, Image } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { collection, addDoc, query, where, getDocs, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator'; 

import { auth, db } from '../config/firebase'; 

const TAREAS_BASE = [
  { id: 'base_1', texto: 'Leer la guía "Manejo de la Ansiedad"', completada: false, isBase: true },
  { id: 'base_2', texto: 'Hacer 10 mins de respiración diafragmática', completada: false, isBase: true },
  { id: 'base_3', texto: 'Dar un paseo de 20 minutos al sol', completada: false, isBase: true }
];

export default function WellnessScreen() {
  const [vasosAgua, setVasosAgua] = useState(0);
  const metaAgua = 8; 
  const [nivelCO, setNivelCO] = useState('');
  const [historialCO, setHistorialCO] = useState<any[]>([]); 
  const [tareasBase, setTareasBase] = useState<any[]>(TAREAS_BASE);
  const [tareasMedico, setTareasMedico] = useState<any[]>([]);

  const hoy = new Date().toISOString().split('T')[0];
  const storageKeyAgua = `@agua_${auth.currentUser?.uid}_${hoy}`;

  const cargarHistorialCO = async () => {
    try {
      const user = auth.currentUser;
      if (user && db) {
        const q = query(collection(db, 'pruebas_co'), where('userId', '==', user.uid));
        const querySnapshot = await getDocs(q);
        const pruebas = querySnapshot.docs.map(d => d.data());
        pruebas.sort((a, b) => new Date(b.fecha_prueba).getTime() - new Date(a.fecha_prueba).getTime());
        setHistorialCO(pruebas);
      }
    } catch (error) {
      console.error("Error al cargar CO:", error);
    }
  };

  useEffect(() => {
    const cargarDatosLocales = async () => {
      const user = auth.currentUser;
      if (!user) return;
      const aguaGuardada = await AsyncStorage.getItem(storageKeyAgua);
      if (aguaGuardada !== null) setVasosAgua(Number(aguaGuardada));
      const tareasBaseGuardadas = await AsyncStorage.getItem(`@tareas_base_${user.uid}`);
      if (tareasBaseGuardadas !== null) setTareasBase(JSON.parse(tareasBaseGuardadas));
    };
    cargarDatosLocales();
    cargarHistorialCO(); 

    const user = auth.currentUser;
    if (user && db) {
      const qTareas = query(collection(db, 'tareas'), where('userId', '==', user.uid));
      const unsubscribe = onSnapshot(qTareas, (snapshot) => {
        const tareasCargadas = snapshot.docs.map(d => ({ id: d.id, ...d.data(), isBase: false }));
        tareasCargadas.sort((a: any, b: any) => (a.completada === b.completada ? 0 : a.completada ? 1 : -1));
        setTareasMedico(tareasCargadas);
      });
      return () => unsubscribe(); 
    }
  }, []);

  const sumarAgua = async () => {
    const nuevoValor = vasosAgua + 1;
    setVasosAgua(nuevoValor);
    await AsyncStorage.setItem(storageKeyAgua, nuevoValor.toString());
    if (nuevoValor === metaAgua) Alert.alert('¡Reto conseguido! 💧', 'Has llegado a tu meta de hidratación de hoy.');
  };

  const toggleTarea = async (tarea: any) => {
    try {
      if (tarea.isBase) {
        const nuevasTareasBase = tareasBase.map(t => t.id === tarea.id ? { ...t, completada: !t.completada } : t);
        setTareasBase(nuevasTareasBase);
        await AsyncStorage.setItem(`@tareas_base_${auth.currentUser?.uid}`, JSON.stringify(nuevasTareasBase));
      } else {
        const tareaRef = doc(db, 'tareas', tarea.id);
        await updateDoc(tareaRef, { completada: !tarea.completada });
      }
    } catch (error) {
      console.error("Error al actualizar tarea:", error);
    }
  };

  // --- SUBIR FOTO A CLOUDINARY ---
  const adjuntarFoto = async (tareaId: string) => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.7,
      base64: true,
    });

    if (!result.canceled && result.assets[0].uri) {
      try {
        Alert.alert('Procesando...', 'Subiendo documento al servidor...');

        // 1. Redimensionar para optimizar (Clave para iOS)
        const manipResult = await ImageManipulator.manipulateAsync(
          result.assets[0].uri,
          [{ resize: { width: 1024 } }],
          { compress: 0.6, format: ImageManipulator.SaveFormat.JPEG, base64: true }
        );

        if (!manipResult.base64) throw new Error("Fallo al procesar imagen");

        // 2. Configuración de Cloudinary (Tus datos)
        const CLOUD_NAME = 'ded1z49aj';
        const PRESET = 'etna_preset';
        const CLOUDINARY_URL = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`;
        
        const base64Img = `data:image/jpg;base64,${manipResult.base64}`;

        const formData = new FormData();
        // @ts-ignore
        formData.append('file', base64Img);
        formData.append('upload_preset', PRESET);

        // 3. Subir
        const response = await fetch(CLOUDINARY_URL, {
          method: 'POST',
          body: formData,
        });

        const dataResponse = await response.json();
        
        if (dataResponse.secure_url) {
          const downloadUrl = dataResponse.secure_url;

          // 4. Guardar en Firestore solo si tenemos la URL
          const tareaRef = doc(db, 'tareas', tareaId);
          await updateDoc(tareaRef, { 
            foto_evidencia: downloadUrl, 
            completada: true 
          });
          
          Alert.alert('¡Éxito! 📄', 'Documento guardado correctamente.');
        } else {
          console.error("Respuesta Cloudinary:", dataResponse);
          throw new Error("Cloudinary no devolvió URL");
        }
      } catch (error: any) {
        Alert.alert('Error de Subida', 'Revisa que el Preset sea "Unsigned" en Cloudinary.');
        console.error(error);
      }
    }
  };

  const guardarNivelCO = async () => {
    if (!nivelCO) { Alert.alert('Faltan datos', 'Introduce el valor (ppm).'); return; }
    try {
      const user = auth.currentUser;
      if (user && db) {
        await addDoc(collection(db, 'pruebas_co'), { userId: user.uid, fecha_prueba: new Date().toISOString(), nivel_ppm: Number(nivelCO) });
        Alert.alert('Registro guardado', 'Actualizado en tu historial.');
        setNivelCO(''); cargarHistorialCO(); 
      }
    } catch (error: any) { Alert.alert('Error', error.message); }
  };

  const todasLasTareas = [...tareasBase, ...tareasMedico];

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
      <Text style={styles.header}>Bienestar y Tareas 🌱</Text>
      <Text style={styles.subtitle}>Cuidar tu cuerpo reduce la ansiedad.</Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Tareas y Fichas Clínicas 📋</Text>
        <Text style={styles.cardText}>Rutina base y documentos pedidos por el CMAPA:</Text>
        
        {todasLasTareas.map((tarea) => (
          <View key={tarea.id} style={[styles.taskItem, tarea.completada && styles.taskItemCompleted]}>
            <TouchableOpacity style={styles.taskClickArea} onPress={() => toggleTarea(tarea)}>
              <View style={[styles.checkbox, tarea.completada && styles.checkboxCompleted]}>
                {tarea.completada && <Text style={styles.checkmark}>✓</Text>}
              </View>
              <View style={{ flex: 1 }}>
                 {!tarea.isBase && <Text style={styles.medicoLabel}>🩺 Petición Profesional</Text>}
                 <Text style={[styles.taskText, tarea.completada && styles.taskTextCompleted]}>{tarea.texto}</Text>
              </View>
            </TouchableOpacity>

            {!tarea.isBase && (
              <View style={styles.fotoContainer}>
                {tarea.foto_evidencia ? (
                  <View style={styles.fotoPreviewContainer}>
                    <Text style={styles.fotoEnviadaTexto}>✅ Copia digital enviada:</Text>
                    <Image source={{ uri: tarea.foto_evidencia }} style={styles.fotoPreview} />
                  </View>
                ) : (
                  <TouchableOpacity style={styles.btnFoto} onPress={() => adjuntarFoto(tarea.id)}>
                    <Text style={styles.btnFotoTexto}>📄 Subir foto del documento</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>
        ))}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Prueba de Cooximetría 🫁</Text>
        <View style={styles.coContainer}>
          <TextInput style={styles.inputCO} keyboardType="numeric" placeholder="Ej: 15" value={nivelCO} onChangeText={setNivelCO} maxLength={3} />
          <Text style={styles.ppmText}>ppm</Text>
        </View>
        <TouchableOpacity style={styles.saveBtn} onPress={guardarNivelCO}><Text style={styles.saveBtnText}>Guardar Resultado</Text></TouchableOpacity>
        {historialCO.length > 0 && (
          <View style={styles.historialContainer}>
            {historialCO.map((prueba, index) => (
              <View key={index} style={styles.historialRow}>
                <Text style={styles.historialFecha}>{prueba.fecha_prueba.split('T')[0]}</Text>
                <Text style={[styles.historialPpm, prueba.nivel_ppm <= 10 ? {color: '#4caf50'} : {color: '#f57c00'}]}>{prueba.nivel_ppm} ppm</Text>
              </View>
            ))}
          </View>
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Reto de Hidratación 💧</Text>
        <View style={styles.waterContainer}><Text style={styles.waterCount}>{vasosAgua} / {metaAgua}</Text></View>
        <TouchableOpacity style={styles.waterBtn} onPress={sumarAgua}><Text style={styles.waterBtnText}>+ Beber un vaso</Text></TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fdfbf7', padding: 20 },
  header: { fontSize: 28, fontWeight: 'bold', color: '#333', marginTop: 40, textAlign: 'center' },
  subtitle: { fontSize: 16, color: '#666', textAlign: 'center', marginBottom: 20, fontStyle: 'italic' },
  card: { backgroundColor: '#fff', padding: 20, borderRadius: 16, marginBottom: 20, elevation: 2, borderWidth: 1, borderColor: '#f0f0f0' },
  cardTitle: { fontSize: 20, fontWeight: 'bold', color: '#333', marginBottom: 5 },
  cardText: { fontSize: 14, color: '#555', marginBottom: 15 },
  coContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 15 },
  inputCO: { borderWidth: 1, borderColor: '#ccc', padding: 10, borderRadius: 8, width: 80, textAlign: 'center', fontSize: 20, backgroundColor: '#fafafa' },
  ppmText: { fontSize: 20, fontWeight: 'bold', color: '#666', marginLeft: 10 },
  saveBtn: { backgroundColor: '#333', padding: 12, borderRadius: 8, alignItems: 'center' },
  saveBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  historialContainer: { marginTop: 20, borderTopWidth: 1, borderTopColor: '#eee', paddingTop: 15 },
  historialRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5, borderBottomWidth: 1, borderBottomColor: '#f9f9f9' },
  historialFecha: { fontSize: 14, color: '#666' },
  historialPpm: { fontSize: 14, fontWeight: 'bold' },
  taskItem: { backgroundColor: '#fff8e1', borderRadius: 10, marginBottom: 10, borderWidth: 1, borderColor: '#ffecb3', overflow: 'hidden' },
  taskItemCompleted: { backgroundColor: '#e8f5e9', borderColor: '#c8e6c9' },
  taskClickArea: { flexDirection: 'row', alignItems: 'center', padding: 15 },
  checkbox: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: '#ffb300', marginRight: 15, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' },
  checkboxCompleted: { backgroundColor: '#4caf50', borderColor: '#4caf50' },
  checkmark: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
  taskText: { fontSize: 15, color: '#333', fontWeight: '500' },
  taskTextCompleted: { color: '#888', textDecorationLine: 'line-through', fontWeight: 'normal' },
  medicoLabel: { fontSize: 11, color: '#0288d1', fontWeight: 'bold', marginBottom: 4 },
  fotoContainer: { backgroundColor: 'rgba(0,0,0,0.03)', padding: 15, borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.05)' },
  btnFoto: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#0288d1', padding: 10, borderRadius: 8, alignItems: 'center', borderStyle: 'dashed' },
  btnFotoTexto: { color: '#0288d1', fontWeight: 'bold', fontSize: 13 },
  fotoPreviewContainer: { alignItems: 'center' },
  fotoEnviadaTexto: { fontSize: 12, color: '#4caf50', fontWeight: 'bold', marginBottom: 8 },
  fotoPreview: { width: 120, height: 160, borderRadius: 8, borderWidth: 1, borderColor: '#ccc', resizeMode: 'cover' },
  waterContainer: { alignItems: 'center', marginBottom: 20 },
  waterCount: { fontSize: 48, fontWeight: 'bold', color: '#0288d1' },
  waterBtn: { backgroundColor: '#03a9f4', padding: 15, borderRadius: 30, alignItems: 'center' },
  waterBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 }
});