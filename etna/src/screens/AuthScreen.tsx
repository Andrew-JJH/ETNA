import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Alert, Image, TouchableOpacity } from 'react-native';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, GoogleAuthProvider, signInWithCredential } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../config/firebase'; 
import { Ionicons } from '@expo/vector-icons';
import { GoogleSignin } from '@react-native-google-signin/google-signin';

export default function AuthScreen({ navigation }: any) {
  const [email, setEmail] = useState('prueba3@etna.com');
  const [password, setPassword] = useState('123456');

  // Configuración inicial de Google con tu Web Client ID
  useEffect(() => {
    GoogleSignin.configure({
  // ¡ESTE ES TU NUEVO ID WEB!
  webClientId: '630151871306-47n6fl8bfiegfjl048r4ibampaqo4fir.apps.googleusercontent.com',
});
  }, []);

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

  // Función completa para login con Google
  // Función completa para login con Google
  const handleGoogleLogin = async () => {
    try {
      await GoogleSignin.hasPlayServices();
      const response = await GoogleSignin.signIn();
      
      if (response.type !== 'success') {
        console.log('Inicio de sesión cancelado o interrumpido');
        return; 
      }

      const idToken = response.data.idToken;

      if (!idToken) {
        throw new Error('No se pudo obtener el token de Google');
      }

      const googleCredential = GoogleAuthProvider.credential(idToken);
      const userCredential = await signInWithCredential(auth, googleCredential);
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
        // --- CAMBIOS AQUÍ PARA EL ADMIN Y ONBOARDING ---
        await setDoc(docRef, {
          correo: user.email,
          nombre: user.displayName || 'Usuario de Google',
          rol: 'usuario',
          fechaCreacion: new Date(),
          // Añadimos campos iniciales para que el Admin no de error al listar
          precio_paquete: 0,
          consumo_diario_medio: 0,
          tipo_consumo: 'tabaco' 
        });
        
        // Enviamos al Onboarding para cumplir con el Paso 2 del manual
        navigation.replace('Onboarding'); 
      }
    } catch (error: any) {
      console.log('Error detallado de Google:', error);
      Alert.alert('Aviso', 'No se pudo completar el login con Google en este entorno.');
    }
  };

  return (
    <View style={styles.container}>
      <Image 
        source={require('../../assets/images/logo-full.png')} 
        style={styles.logo} 
      />
      
      <Text style={styles.title}>Bienvenido a Etna</Text>
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

      <View style={styles.dividerContainer}>
        <View style={styles.line} />
        <Text style={styles.dividerText}>o</Text>
        <View style={styles.line} />
      </View>

      <TouchableOpacity style={styles.googleButton} onPress={handleGoogleLogin}>
        <Ionicons name="logo-google" size={20} color="#DB4437" style={styles.googleIcon} />
        <Text style={styles.googleButtonText}>Continuar con Google</Text>
      </TouchableOpacity>
      
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 20, backgroundColor: '#fdfbf7' },
  logo: { width: 120, height: 120, alignSelf: 'center', marginBottom: 20, resizeMode: 'contain' },
  title: { fontSize: 28, fontWeight: 'bold', textAlign: 'center', color: '#333' },
  subtitle: { fontSize: 16, textAlign: 'center', color: '#666', marginBottom: 30 },
  input: { borderWidth: 1, borderColor: '#ccc', padding: 12, marginBottom: 15, borderRadius: 8, backgroundColor: '#fff' },
  buttonContainer: { marginBottom: 12 },
  
  dividerContainer: { flexDirection: 'row', alignItems: 'center', marginVertical: 20 },
  line: { flex: 1, height: 1, backgroundColor: '#ccc' },
  dividerText: { marginHorizontal: 10, color: '#666' },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 12,
    borderRadius: 8,
    elevation: 2, 
    shadowColor: '#000', 
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.5,
  },
  googleIcon: { marginRight: 10 },
  googleButtonText: { fontSize: 16, color: '#333', fontWeight: '500' }
});