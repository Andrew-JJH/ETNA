import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { collection, addDoc, query, orderBy, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../config/firebase';

export default function CommunityScreen() {
  const [mensajes, setMensajes] = useState<any[]>([]);
  const [nuevoMensaje, setNuevoMensaje] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'mensajes_comunidad'), orderBy('fecha', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const mensajesCargados = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setMensajes(mensajesCargados);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const enviarMensaje = async () => {
    if (nuevoMensaje.trim() === '') return;
    const user = auth.currentUser;
    if (user && db) {
      try {
        await addDoc(collection(db, 'mensajes_comunidad'), {
          texto: nuevoMensaje,
          fecha: new Date().toISOString(),
          autor: user.email?.split('@')[0] || 'Usuario Anónimo', 
          userId: user.uid
        });
        setNuevoMensaje(''); 
      } catch (error) {
        console.error("Error al enviar mensaje:", error);
      }
    }
  };

  const renderMensaje = ({ item }: { item: any }) => {
    const soyYo = item.userId === auth.currentUser?.uid;
    return (
      <View style={[styles.mensajeContenedor, soyYo ? styles.mensajeMio : styles.mensajeOtro]}>
        {!soyYo && <Text style={styles.autorText}>{item.autor}</Text>}
        <Text style={[styles.mensajeTexto, soyYo ? styles.textoMio : styles.textoOtro]}>{item.texto}</Text>
      </View>
    );
  };

  if (loading) return <View style={styles.centerContainer}><ActivityIndicator size="large" color="#f57c00" /></View>;

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <View style={styles.header}>
        <Text style={styles.title}>Comunidad Etna 💬</Text>
        <Text style={styles.subtitle}>Comparte tu progreso y apoya a otros</Text>
      </View>
      <FlatList
        data={mensajes}
        keyExtractor={item => item.id}
        renderItem={renderMensaje}
        contentContainerStyle={styles.listaMensajes}
        ref={ref => ref?.scrollToEnd({ animated: false })}
        onContentSizeChange={() => {}}
      />
      <View style={styles.inputContainer}>
        <TextInput style={styles.input} placeholder="Escribe un mensaje de ánimo..." value={nuevoMensaje} onChangeText={setNuevoMensaje} multiline />
        <TouchableOpacity style={styles.enviarBtn} onPress={enviarMensaje}>
          <Text style={styles.enviarBtnText}>Enviar</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fdfbf7' },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { padding: 20, paddingTop: 50, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#eee' },
  title: { fontSize: 24, fontWeight: 'bold', color: '#333' },
  subtitle: { fontSize: 14, color: '#666', marginTop: 5 },
  listaMensajes: { padding: 15, paddingBottom: 20 },
  mensajeContenedor: { maxWidth: '80%', padding: 12, borderRadius: 16, marginBottom: 10 },
  mensajeMio: { alignSelf: 'flex-end', backgroundColor: '#f57c00', borderBottomRightRadius: 4 },
  mensajeOtro: { alignSelf: 'flex-start', backgroundColor: '#e0e0e0', borderBottomLeftRadius: 4 },
  autorText: { fontSize: 11, color: '#666', marginBottom: 4, fontWeight: 'bold' },
  mensajeTexto: { fontSize: 16 },
  textoMio: { color: '#fff' },
  textoOtro: { color: '#333' },
  inputContainer: { flexDirection: 'row', padding: 10, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#eee', alignItems: 'center' },
  input: { flex: 1, backgroundColor: '#f5f5f5', borderRadius: 20, paddingHorizontal: 15, paddingTop: 12, paddingBottom: 12, maxHeight: 100, fontSize: 16 },
  enviarBtn: { marginLeft: 10, backgroundColor: '#333', borderRadius: 20, paddingVertical: 10, paddingHorizontal: 20 },
  enviarBtnText: { color: '#fff', fontWeight: 'bold' }
});