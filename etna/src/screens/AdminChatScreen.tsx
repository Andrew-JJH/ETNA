import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator, Alert } from 'react-native';
import { collection, addDoc, query, orderBy, onSnapshot, doc, deleteDoc, getDoc } from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import { Ionicons } from '@expo/vector-icons';

// Lista básica de palabras prohibidas para el filtro de moderación 
const PALABRAS_PROHIBIDAS = ['insulto1', 'insulto2', 'mierda', 'puto']; 

export default function AdminChatScreen() {
  const [mensajes, setMensajes] = useState<any[]>([]);
  const [nuevoMensaje, setNuevoMensaje] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'mensajes_comunidad'), orderBy('fecha', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const mensajesCargados = snapshot.docs.map(d => ({
        id: d.id,
        ...d.data()
      }));
      setMensajes(mensajesCargados);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const enviarMensajeMedico = async () => {
    if (nuevoMensaje.trim() === '') return;

    // Filtro de insultos sencillo
    const contieneInsulto = PALABRAS_PROHIBIDAS.some(palabra => 
      nuevoMensaje.toLowerCase().includes(palabra)
    );

    if (contieneInsulto) {
      Alert.alert('Moderación', 'El mensaje contiene palabras no permitidas.');
      return;
    }

    const user = auth.currentUser;
    if (user && db) {
      try {
        await addDoc(collection(db, 'mensajes_comunidad'), {
          texto: nuevoMensaje,
          fecha: new Date().toISOString(),
          autor: "Personal Médico 🩺", 
          userId: user.uid,
          esMedico: true // Marca especial para el estilo
        });
        setNuevoMensaje(''); 
      } catch (error) {
        console.error("Error al enviar:", error);
      }
    }
  };

  const eliminarMensaje = (id: string) => {
    Alert.alert(
      "Eliminar Mensaje",
      "¿Estás seguro de que quieres borrar este mensaje de la comunidad?",
      [
        { text: "Cancelar", style: "cancel" },
        { 
          text: "Eliminar", 
          style: "destructive", 
          onPress: async () => {
            await deleteDoc(doc(db, 'mensajes_comunidad', id));
          } 
        }
      ]
    );
  };

  const renderMensaje = ({ item }: { item: any }) => {
    const esMio = item.userId === auth.currentUser?.uid;
    
    return (
      <View style={[
        styles.mensajeContenedor, 
        item.esMedico ? styles.mensajeMedico : (esMio ? styles.mensajeMio : styles.mensajeOtro)
      ]}>
        <View style={styles.headerMensaje}>
          <Text style={styles.autorText}>{item.autor}</Text>
          {/* Botón de eliminar solo visible para el Admin */}
          <TouchableOpacity onPress={() => eliminarMensaje(item.id)}>
            <Ionicons name="trash-outline" size={16} color="#d32f2f" />
          </TouchableOpacity>
        </View>
        <Text style={[styles.mensajeTexto, (esMio || item.esMedico) ? styles.textoBlanco : styles.textoNegro]}>
          {item.texto}
        </Text>
      </View>
    );
  };

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#0288d1" /></View>;

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <View style={styles.adminBanner}>
        <Text style={styles.adminBannerText}>Modo Moderador Activo 🛡️</Text>
      </View>
      
      <FlatList
        data={mensajes}
        keyExtractor={item => item.id}
        renderItem={renderMensaje}
        contentContainerStyle={styles.listaMensajes}
      />
      
      <View style={styles.inputContainer}>
        <TextInput 
          style={styles.input} 
          placeholder="Responder como médico..." 
          value={nuevoMensaje} 
          onChangeText={setNuevoMensaje} 
          multiline 
        />
        <TouchableOpacity style={styles.enviarBtn} onPress={enviarMensajeMedico}>
          <Ionicons name="send" size={20} color="#fff" />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f4f8' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  adminBanner: { backgroundColor: '#102a43', padding: 8, alignItems: 'center' },
  adminBannerText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
  listaMensajes: { padding: 15 },
  mensajeContenedor: { maxWidth: '85%', padding: 12, borderRadius: 12, marginBottom: 10, elevation: 1 },
  headerMensaje: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  mensajeMio: { alignSelf: 'flex-end', backgroundColor: '#486581' },
  mensajeOtro: { alignSelf: 'flex-start', backgroundColor: '#fff' },
  mensajeMedico: { alignSelf: 'flex-end', backgroundColor: '#102a43', borderWidth: 1, borderColor: '#0288d1' },
  autorText: { fontSize: 11, color: '#829ab1', fontWeight: 'bold' },
  mensajeTexto: { fontSize: 15 },
  textoBlanco: { color: '#fff' },
  textoNegro: { color: '#333' },
  inputContainer: { flexDirection: 'row', padding: 10, backgroundColor: '#fff', alignItems: 'center' },
  input: { flex: 1, backgroundColor: '#f0f4f8', borderRadius: 20, paddingHorizontal: 15, paddingVertical: 10, fontSize: 16 },
  enviarBtn: { marginLeft: 10, backgroundColor: '#0288d1', width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' }
});