import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

// Componente principal de la pantalla
export default function CommunityScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Comunidad Etna 💬</Text>
      <Text style={styles.subtitle}>Aquí estará el chat dividido por hitos.</Text>
    </View>
  );
}

// Estilos de la vista
const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fdfbf7' },
  title: { fontSize: 24, fontWeight: 'bold', color: '#333', marginBottom: 10 },
  subtitle: { fontSize: 16, color: '#666' }
});