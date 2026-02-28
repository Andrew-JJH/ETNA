import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Button, ActivityIndicator } from 'react-native';
import { signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../config/firebase';

export default function DashboardScreen({ navigation }: any) {
  const [userData, setUserData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // 1. Recuperamos los datos de Firebase nada más cargar la pantalla
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const user = auth.currentUser;
        if (user) {
          const docRef = doc(db, 'usuarios', user.uid);
          const docSnap = await getDoc(docRef);
          
          if (docSnap.exists()) {
            setUserData(docSnap.data());
          }
        }
      } catch (error) {
        console.error("Error al obtener datos:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, []);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigation.replace('Auth');
    } catch (error) {
      console.error("Error al cerrar sesión", error);
    }
  };

  // 2. Variables para nuestros cálculos matemáticos
  let diasSinFumar = 0;
  let dineroAhorrado = 0;
  let cigarrillosEvitados = 0;

  if (userData && userData.fecha_abandono) {
    const fechaInicio = new Date(userData.fecha_abandono).getTime();
    const ahora = new Date().getTime();
    
    // Calculamos la diferencia en días exactos (con decimales para mayor precisión)
    diasSinFumar = (ahora - fechaInicio) / (1000 * 60 * 60 * 24);
    
    // Cálculo de impacto
    const precioPorCigarrillo = userData.precio_paquete / 20;
    cigarrillosEvitados = userData.consumo_diario_medio * diasSinFumar;
    dineroAhorrado = cigarrillosEvitados * precioPorCigarrillo;
  }

  // 3. Funciones para formatear al estilo de España (separador de miles con punto, decimales con coma)
  const formatoDinero = (cantidad: number) => {
    return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(cantidad);
  };

  const formatoNumero = (numero: number) => {
    return new Intl.NumberFormat('es-ES', { maximumFractionDigits: 0 }).format(numero);
  };

  // Pantalla de carga mientras trae los datos de Firebase
  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#f57c00" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Tu Progreso 🌋</Text>
      
      <View style={styles.card}>
        <Text style={styles.label}>TIEMPO LIBRE DE HUMO</Text>
        <Text style={styles.bigValue}>{formatoNumero(Math.floor(diasSinFumar))} días</Text>
      </View>

      <View style={styles.row}>
        <View style={[styles.card, styles.halfCard]}>
          <Text style={styles.label}>DINERO AHORRADO</Text>
          <Text style={styles.value}>{formatoDinero(dineroAhorrado)}</Text>
        </View>

        <View style={[styles.card, styles.halfCard]}>
          <Text style={styles.label}>NO FUMADOS</Text>
          <Text style={styles.value}>{formatoNumero(cigarrillosEvitados)}</Text>
        </View>
      </View>

      <View style={styles.spacer} />
      <Button title="Cerrar Sesión" onPress={handleLogout} color="#d32f2f" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#fdfbf7', paddingTop: 60 },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { fontSize: 28, fontWeight: 'bold', color: '#333', marginBottom: 30, textAlign: 'center' },
  card: { backgroundColor: '#fff', padding: 20, borderRadius: 16, marginBottom: 15, elevation: 2, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 8 },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  halfCard: { width: '48%' },
  label: { fontSize: 12, color: '#888', fontWeight: '600', marginBottom: 8 },
  bigValue: { fontSize: 36, fontWeight: 'bold', color: '#333', textAlign: 'center' },
  value: { fontSize: 22, fontWeight: 'bold', color: '#f57c00' },
  spacer: { flex: 1 }
});