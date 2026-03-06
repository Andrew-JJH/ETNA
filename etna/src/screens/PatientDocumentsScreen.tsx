import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, TextInput, Image, Modal, Dimensions } from 'react-native';
import { collection, getDocs, query, where, addDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { Ionicons } from '@expo/vector-icons';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';

const { width, height } = Dimensions.get('window');

export default function PatientDocumentsScreen({ route, navigation }: any) {
  const { paciente } = route.params;
  const [tareas, setTareas] = useState<any[]>([]);
  const [nuevaTarea, setNuevaTarea] = useState('');
  const [busqueda, setBusqueda] = useState(''); // <-- Estado para el buscador
  const [fotoAmpliada, setFotoAmpliada] = useState<string | null>(null);

  useEffect(() => {
    cargarTareas();
  }, []);

  const cargarTareas = async () => {
    try {
      const qTareas = query(collection(db, 'tareas'), where('userId', '==', paciente.id));
      const snapshot = await getDocs(qTareas);
      setTareas(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (error) {
      console.error("Error cargando documentos", error);
    }
  };

  const asignarTarea = async () => {
    if (!nuevaTarea.trim()) return;
    try {
      const nueva = {
        userId: paciente.id,
        texto: nuevaTarea.trim(),
        completada: false,
        fecha_creacion: new Date().toISOString()
      };
      await addDoc(collection(db, 'tareas'), nueva);
      setTareas([...tareas, nueva]);
      Alert.alert('¡Petición enviada! ✅', 'El paciente verá la petición en su app.');
      setNuevaTarea('');
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  };

  const guardarFotoPaciente = async () => {
    if (!fotoAmpliada) return;
    try {
      const dir = FileSystem.documentDirectory;
      const filepath = dir + `evidencia_paciente_${Date.now()}.jpg`;
      const { uri } = await FileSystem.downloadAsync(fotoAmpliada, filepath);
      await Sharing.shareAsync(uri, { mimeType: 'image/jpeg', dialogTitle: 'Guardar Documento' });
    } catch (error: any) {
      Alert.alert('Error', 'No se pudo descargar la imagen.');
    }
  };

  // Filtramos las tareas según lo que escriba el médico
  const tareasFiltradas = tareas.filter(t => 
    t.texto.toLowerCase().includes(busqueda.toLowerCase())
  );

  const renderItem = ({ item }: { item: any }) => (
    <View style={styles.evidenciaCard}>
      <View style={{flex: 1, paddingRight: 10}}>
        <Text style={styles.evidenciaTexto}>{item.texto}</Text>
        <Text style={[styles.evidenciaEstado, item.completada ? {color: '#4caf50'} : {color: '#f57c00'}]}>
          {item.completada ? '✅ Recibido' : '⏳ Pendiente'}
        </Text>
      </View>
      {item.foto_evidencia ? (
        <TouchableOpacity onPress={() => setFotoAmpliada(item.foto_evidencia)}>
          <Image source={{ uri: item.foto_evidencia }} style={styles.evidenciaFoto} />
          <Text style={styles.zoomText}>🔍 Ampliar</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#102a43" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Documentos</Text>
        <View style={{ width: 24 }}></View>
      </View>
      
      <Text style={styles.subHeader}>Paciente: {paciente.correo || paciente.email}</Text>

      <View style={styles.taskContainer}>
        <Text style={styles.taskTitle}>📝 Pedir Nueva Evidencia</Text>
        <View style={styles.inputRow}>
          <TextInput 
            style={styles.taskInput} 
            placeholder="Ej: Foto cooximetría..." 
            value={nuevaTarea} 
            onChangeText={setNuevaTarea} 
          />
          <TouchableOpacity style={styles.taskBtn} onPress={asignarTarea}>
            <Ionicons name="send" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      {/* NUEVO BUSCADOR DE TAREAS */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#829ab1" />
        <TextInput
          style={styles.searchInputBar}
          placeholder="Buscar en el historial..."
          placeholderTextColor="#829ab1"
          value={busqueda}
          onChangeText={setBusqueda}
        />
      </View>

      <FlatList
        data={tareasFiltradas}
        keyExtractor={(item, index) => item.id || index.toString()}
        renderItem={renderItem}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={<Text style={styles.emptyText}>No hay documentos que coincidan.</Text>}
      />

      <Modal visible={!!fotoAmpliada} transparent={true} animationType="fade" onRequestClose={() => setFotoAmpliada(null)}>
        <View style={styles.fotoFullOverlay}>
          <TouchableOpacity style={styles.cerrarFotoBtn} onPress={() => setFotoAmpliada(null)}>
            <Text style={styles.cerrarFotoTexto}>✕ Cerrar</Text>
          </TouchableOpacity>
          {fotoAmpliada && <Image source={{ uri: fotoAmpliada }} style={styles.fotoFullScreen} resizeMode="contain" />}
          <TouchableOpacity style={styles.guardarFotoBtn} onPress={guardarFotoPaciente}>
            <Text style={styles.guardarFotoTexto}>💾 Guardar / Compartir</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f4f8' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 50, paddingHorizontal: 20, paddingBottom: 15, backgroundColor: '#fff', elevation: 2 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#102a43' },
  backBtn: { padding: 5 },
  subHeader: { padding: 20, fontSize: 14, color: '#486581', fontWeight: 'bold' },
  taskContainer: { backgroundColor: '#e1f5fe', marginHorizontal: 20, padding: 15, borderRadius: 12, marginBottom: 15, borderWidth: 1, borderColor: '#b3e5fc' },
  taskTitle: { fontSize: 16, fontWeight: 'bold', color: '#0288d1', marginBottom: 10 },
  inputRow: { flexDirection: 'row', gap: 10 },
  taskInput: { flex: 1, backgroundColor: '#fff', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#81d4fa' },
  taskBtn: { backgroundColor: '#0288d1', paddingHorizontal: 20, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  
  // Estilos del buscador
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', marginHorizontal: 20, marginBottom: 15, paddingHorizontal: 15, borderRadius: 12, borderWidth: 1, borderColor: '#d9e2ec' },
  searchInputBar: { flex: 1, paddingVertical: 12, marginLeft: 10, fontSize: 15, color: '#334e68' },
  
  listContainer: { paddingHorizontal: 20, paddingBottom: 40 },
  emptyText: { textAlign: 'center', color: '#888', fontStyle: 'italic', marginTop: 20 },
  evidenciaCard: { flexDirection: 'row', backgroundColor: '#fff', padding: 15, borderRadius: 12, marginBottom: 10, elevation: 1, alignItems: 'center' },
  evidenciaTexto: { fontSize: 15, color: '#334e68', fontWeight: 'bold', marginBottom: 6 },
  evidenciaEstado: { fontSize: 13, fontWeight: 'bold' },
  evidenciaFoto: { width: 80, height: 80, borderRadius: 8, borderWidth: 1, borderColor: '#ddd', resizeMode: 'cover' },
  zoomText: { fontSize: 11, color: '#0288d1', textAlign: 'center', marginTop: 5, fontWeight: 'bold' },
  fotoFullOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.95)', justifyContent: 'center', alignItems: 'center' },
  fotoFullScreen: { width: width, height: height * 0.7 },
  cerrarFotoBtn: { position: 'absolute', top: 50, right: 20, zIndex: 10, padding: 10, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 20 },
  cerrarFotoTexto: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  guardarFotoBtn: { position: 'absolute', bottom: 50, backgroundColor: '#0288d1', padding: 15, borderRadius: 30, width: '80%', alignItems: 'center' },
  guardarFotoTexto: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
});