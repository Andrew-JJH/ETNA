import React, { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Alert } from 'react-native';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '../config/firebase';

export default function OnboardingScreen({ navigation }: any) {
  const [dailyConsumption, setDailyConsumption] = useState('');
  const [packPrice, setPackPrice] = useState('');

  const handleSaveData = async () => {
    if (!dailyConsumption || !packPrice) {
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
        await setDoc(doc(db, 'usuarios', user.uid), {
          consumo_diario_medio: consumoNumerico,
          precio_paquete: precioNumerico,
          fecha_abandono: new Date().toISOString(),
          email: user.email,
          tipo_consumo: 'tabaco'
        });
        
        navigation.replace('Dashboard');
      }
    } catch (error: any) {
      Alert.alert('Error al guardar datos', error.message);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Configura tu perfil</Text>
      <Text style={styles.subtitle}>Necesitamos estos datos para calcular tu progreso y el dinero que vas a ahorrar.</Text>
      
      <TextInput
        style={styles.input}
        placeholder="¿Cuántos cigarrillos fumas al día?"
        value={dailyConsumption}
        onChangeText={setDailyConsumption}
        keyboardType="numeric"
      />
      <TextInput
        style={styles.input}
        placeholder="¿Cuánto cuesta un paquete de 20? (€)"
        value={packPrice}
        onChangeText={setPackPrice}
        keyboardType="numeric"
      />
      
      <View style={styles.buttonContainer}>
        <Button title="Empezar mi viaje" onPress={handleSaveData} color="#f57c00" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 20, backgroundColor: '#fdfbf7' },
  title: { fontSize: 24, fontWeight: 'bold', color: '#333', marginBottom: 10 },
  subtitle: { fontSize: 16, color: '#666', marginBottom: 30 },
  input: { borderWidth: 1, borderColor: '#ccc', padding: 12, marginBottom: 15, borderRadius: 8, backgroundColor: '#fff' },
  buttonContainer: { marginTop: 10 }
});