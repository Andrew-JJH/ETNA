// Ejemplo para SosScreen.tsx (haz lo mismo para CommunityScreen.tsx cambiando el nombre)
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function SosScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Botón SOS 🛟</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fdfbf7' },
  title: { fontSize: 24, fontWeight: 'bold', color: '#333' }
});