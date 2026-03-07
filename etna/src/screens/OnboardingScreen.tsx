import React, { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Alert, TouchableOpacity, ScrollView } from 'react-native';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '../config/firebase';

export default function OnboardingScreen({ navigation }: any) {
  // Inicializamos el nombre por si viene de Google, si no, se queda en blanco para que lo rellene
  const [nombre, setNombre] = useState(auth.currentUser?.displayName || '');
  const [dailyConsumption, setDailyConsumption] = useState('');
  const [packPrice, setPackPrice] = useState('');
  const [tipoConsumo, setTipoConsumo] = useState('Cigarrillo'); 

  const handleSaveData = async () => {
    // Añadimos la validación del nombre
    if (!nombre || !dailyConsumption || !packPrice) {
      Alert.alert('Error', 'Por favor rellena todos los campos');
      return;
    }

    const precioNumerico = Number(packPrice.replace(',', '.'));
    const consumoNumerico = Number(dailyConsumption.replace(',', '.'));

    if (isNaN(precioNumerico) || isNaN(consumoNumerico)) {
      Alert.alert('Error', 'Por favor, introduce números válidos');
      return;
    }

    try {
      const user = auth.currentUser;
      if (user && db) {
        // Inyectamos ABSOLUTAMENTE TODOS los datos para que el Admin lo vea perfecto
        await setDoc(doc(db, 'usuarios', user.uid), {
          nombre: nombre,
          correo: user.email,
          rol: 'usuario',
          fechaCreacion: new Date().toISOString(),
          consumo_diario_medio: consumoNumerico,
          precio_paquete: precioNumerico,
          fecha_abandono: new Date().toISOString(), 
          tipo_consumo: tipoConsumo, 
          onboardingCompletado: true
        }, { merge: true }); // Merge: true respeta si hay datos previos
        
        // Paso 3: Inicio del Viaje
        navigation.replace('Dashboard');
      }
    } catch (error: any) {
      Alert.alert('Error al guardar datos', error.message);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <Text style={styles.title}>Paso 2: Configuración del Perfil</Text>
      <Text style={styles.subtitle}>Personaliza tu algoritmo de recuperación.</Text>

      {/* --- NUEVO CAMPO: NOMBRE COMPLETO --- */}
      <Text style={styles.inputLabel}>Nombre completo</Text>
      <TextInput
        style={styles.input}
        placeholder="Ej: Andrew Jiménez"
        value={nombre}
        onChangeText={setNombre}
        autoCapitalize="words"
      />

      {/* Selector de tipo de dispositivo */}
      <Text style={styles.inputLabel}>¿Qué dispositivo quieres dejar?</Text>
      <View style={styles.selectorContainer}>
        {['Cigarrillo', 'Vapeador', 'Cachimba'].map((tipo) => (
          <TouchableOpacity 
            key={tipo}
            style={[styles.selectorBtn, tipoConsumo === tipo && styles.selectorBtnActive]}
            onPress={() => setTipoConsumo(tipo)}
          >
            <Text style={[styles.selectorText, tipoConsumo === tipo && styles.selectorTextActive]}>{tipo}</Text>
          </TouchableOpacity>
        ))}
      </View>
      
      <Text style={styles.inputLabel}>Consumo diario habitual</Text>
      <TextInput
        style={styles.input}
        placeholder="Ej: 20 cigarrillos"
        value={dailyConsumption}
        onChangeText={setDailyConsumption}
        keyboardType="numeric"
      />

      <Text style={styles.inputLabel}>Gasto medio (€)</Text>
      <TextInput
        style={styles.input}
        placeholder="Precio del paquete o recambio"
        value={packPrice}
        onChangeText={setPackPrice}
        keyboardType="numeric"
      />
      
      <View style={styles.buttonContainer}>
        <Button title="Empezar mi viaje" onPress={handleSaveData} color="#f57c00" />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, justifyContent: 'center', padding: 25, backgroundColor: '#fdfbf7' },
  title: { fontSize: 24, fontWeight: 'bold', color: '#333', marginBottom: 10 },
  subtitle: { fontSize: 16, color: '#666', marginBottom: 25 },
  inputLabel: { fontSize: 14, fontWeight: '600', color: '#555', marginBottom: 8 },
  input: { borderWidth: 1, borderColor: '#ccc', padding: 12, marginBottom: 20, borderRadius: 8, backgroundColor: '#fff' },
  selectorContainer: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 25 },
  selectorBtn: { flex: 1, paddingVertical: 10, borderWidth: 1, borderColor: '#ccc', borderRadius: 8, alignItems: 'center', marginHorizontal: 4, backgroundColor: '#fff' },
  selectorBtnActive: { backgroundColor: '#3b5973', borderColor: '#3b5973' },
  selectorText: { color: '#666', fontWeight: '500' },
  selectorTextActive: { color: '#fff' },
  buttonContainer: { marginTop: 10 }
});