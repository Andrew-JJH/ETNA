import React, { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Alert } from 'react-native';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
// AÑADIMOS LAS IMPORTACIONES DE FIRESTORE:
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../config/firebase'; 

export default function AuthScreen({ navigation }: any) {
  // Datos por defecto para pruebas rápidas
  const [email, setEmail] = useState('prueba3@etna.com');
  const [password, setPassword] = useState('123456');

  const handleRegister = async () => {
    try {
      await createUserWithEmailAndPassword(auth, email, password);
      Alert.alert('¡Éxito!', 'Usuario registrado correctamente en Etna');
      navigation.replace('Onboarding');
    } catch (error: any) {
      Alert.alert('Error al registrar', error.message);
    }
  };

  const handleLogin = async () => {
    try {
      // 1. Iniciamos sesión en Firebase Auth
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // 2. MAGIA: Buscamos si este usuario tiene la etiqueta de "admin" en la base de datos
      const docRef = doc(db, 'usuarios', user.uid);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const userData = docSnap.data();
        
        // 3. Lo mandamos a su pantalla correspondiente
        if (userData.rol === 'admin') {
          Alert.alert('¡Hola Doctor/a!', 'Entrando al panel médico...');
          navigation.replace('Admin'); // 🩺 Va al panel de psicólogos
        } else {
          Alert.alert('¡Bienvenido!', 'Has iniciado sesión correctamente');
          navigation.replace('Dashboard'); // 👤 Va al panel de paciente
        }
      } else {
        // Si no tiene documento por algún error raro, lo mandamos al dashboard
        navigation.replace('Dashboard'); 
      }

    } catch (error: any) {
      Alert.alert('Error al iniciar sesión', error.message);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🌋 Bienvenido a Etna</Text>
      <Text style={styles.subtitle}>Breathe freely</Text>
      
      <TextInput
        style={styles.input}
        placeholder="Correo electrónico"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />
      <TextInput
        style={styles.input}
        placeholder="Contraseña"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />
      
      <View style={styles.buttonContainer}>
        <Button title="Iniciar Sesión" onPress={handleLogin} color="#333" />
      </View>
      <View style={styles.buttonContainer}>
        <Button title="Registrarse" onPress={handleRegister} color="#f57c00" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 20, backgroundColor: '#fdfbf7' },
  title: { fontSize: 28, fontWeight: 'bold', textAlign: 'center', color: '#333' },
  subtitle: { fontSize: 16, textAlign: 'center', color: '#666', marginBottom: 30 },
  input: { borderWidth: 1, borderColor: '#ccc', padding: 12, marginBottom: 15, borderRadius: 8, backgroundColor: '#fff' },
  buttonContainer: { marginBottom: 12 }
});