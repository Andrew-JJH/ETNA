import React, { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Alert } from 'react-native';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../config/firebase'; 

export default function AuthScreen({ navigation }: any) {
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
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      const docRef = doc(db, 'usuarios', user.uid);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const userData = docSnap.data();
        if (userData.rol === 'admin') {
          navigation.replace('Admin'); 
        } else {
          navigation.replace('Dashboard'); 
        }
      } else {
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