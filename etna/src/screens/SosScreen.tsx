import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Animated, Easing, TouchableWithoutFeedback, TouchableOpacity, Switch, Alert, Platform, ScrollView, TextInput } from 'react-native';
import * as Notifications from 'expo-notifications';
import { SchedulableTriggerInputTypes } from 'expo-notifications';
import DateTimePicker from '@react-native-community/datetimepicker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';

const MESSAGES = [
  "Cada vez que eliges no fumar, das un paso más hacia una vida más libre.",
  "La ansiedad es como una ola: sube, pero siempre termina bajando.",
  "Estás recuperando el control. No dejes que un impulso borre tu esfuerzo.",
  "Respira profundamente. El oxígeno puro es tu nueva recompensa."
];

// 1. Configuración del comportamiento de las notificaciones
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});
interface Alarma {
  id: string;
  nombre: string;
  hora: string; // Guardamos como string ISO para el Storage
  activa: boolean;
}

export default function SosScreen() {
  const [isBreathing, setIsBreathing] = useState(false);
  const [breathText, setBreathText] = useState('Toca para\nempezar');
  const [message, setMessage] = useState(MESSAGES[0]);
  
  // --- ESTADOS PARA MULTI-ALARMAS ---
  const [alarmas, setAlarmas] = useState<Alarma[]>([]);
  const [showPicker, setShowPicker] = useState(false);
  const [currentEditId, setCurrentEditId] = useState<string | null>(null);

  const scaleAnim = useRef(new Animated.Value(1)).current;
  const opacityAnim = useRef(new Animated.Value(1)).current;
  const isRunning = useRef(false);
  const timeouts = useRef<NodeJS.Timeout[]>([]);

  useEffect(() => {
    cargarAlarmas();
  }, []);

  const cargarAlarmas = async () => {
    const guardadas = await AsyncStorage.getItem('@alarmas_etna');
    if (guardadas) setAlarmas(JSON.parse(guardadas));
  };

  const guardarAlarmas = async (nuevas: Alarma[]) => {
    setAlarmas(nuevas);
    await AsyncStorage.setItem('@alarmas_etna', JSON.stringify(nuevas));
  };

  const agregarAlarma = () => {
    const nueva: Alarma = {
      id: Date.now().toString(),
      nombre: "Nueva Pastilla",
      hora: new Date().toISOString(),
      activa: false
    };
    guardarAlarmas([...alarmas, nueva]);
  };

  const eliminarAlarma = async (id: string) => {
    const filtradas = alarmas.filter(a => a.id !== id);
    guardarAlarmas(filtradas);
    // Cancelamos todas y reprogramamos las que queden activas
    await Notifications.cancelAllScheduledNotificationsAsync();
    filtradas.forEach(a => { if(a.activa) programarNotificacion(a); });
  };

  const programarNotificacion = async (alarma: Alarma) => {
    const fecha = new Date(alarma.hora);
    await Notifications.scheduleNotificationAsync({
      content: { title: "💊 Tratamiento Etna", body: `Es hora de: ${alarma.nombre}` },
      trigger: {
        type: SchedulableTriggerInputTypes.DAILY,
        hour: fecha.getHours(),
        minute: fecha.getMinutes(),
      } as Notifications.NotificationTriggerInput,
    });
  };

  const toggleAlarma = async (id: string) => {
    const nuevas = alarmas.map(a => {
      if (a.id === id) return { ...a, activa: !a.activa };
      return a;
    });
    guardarAlarmas(nuevas);
    
    // Reprogramar todo el sistema de notificaciones
    await Notifications.cancelAllScheduledNotificationsAsync();
    nuevas.forEach(a => { if(a.activa) programarNotificacion(a); });
  };

  const cambiarNombre = (id: string, texto: string) => {
    const nuevas = alarmas.map(a => a.id === id ? { ...a, nombre: texto } : a);
    guardarAlarmas(nuevas);
  };

  const abrirReloj = (id: string) => {
    setCurrentEditId(id);
    setShowPicker(true);
  };

  const onTimeChange = (event: any, selectedDate?: Date) => {
    setShowPicker(false);
    if (selectedDate && currentEditId) {
      const nuevas = alarmas.map(a => a.id === currentEditId ? { ...a, hora: selectedDate.toISOString() } : a);
      guardarAlarmas(nuevas);
      // Si estaba activa, reprogramamos
      const alarma = nuevas.find(a => a.id === currentEditId);
      if (alarma?.activa) {
        Notifications.cancelAllScheduledNotificationsAsync().then(() => {
          nuevas.forEach(n => { if(n.activa) programarNotificacion(n); });
        });
      }
    }
  };

  // --- LÓGICA DE RESPIRACIÓN (IGUAL) ---
  const stopBreathing = () => {
    isRunning.current = false;
    setIsBreathing(false);
    timeouts.current.forEach(clearTimeout);
    timeouts.current = [];
    scaleAnim.stopAnimation();
    opacityAnim.stopAnimation();
    Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true }).start();
    Animated.timing(opacityAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
    setBreathText('Toca para\nempezar');
  };

  const startBreathing = () => {
    if (isBreathing) return;
    isRunning.current = true;
    setIsBreathing(true);
    setMessage(MESSAGES[Math.floor(Math.random() * MESSAGES.length)]);
    runCycle(); 
  };

  const runCycle = () => {
    if (!isRunning.current) return;
    setBreathText('Inhala...\n(4s)');
    Animated.parallel([
      Animated.timing(scaleAnim, { toValue: 2.2, duration: 4000, easing: Easing.linear, useNativeDriver: true }),
      Animated.timing(opacityAnim, { toValue: 0.8, duration: 4000, useNativeDriver: true })
    ]).start();

    const t1 = setTimeout(() => {
      if (!isRunning.current) return;
      setBreathText('Mantén...\n(7s)');
      const t2 = setTimeout(() => {
        if (!isRunning.current) return;
        setBreathText('Exhala...\n(8s)');
        Animated.parallel([
          Animated.timing(scaleAnim, { toValue: 1, duration: 8000, easing: Easing.out(Easing.ease), useNativeDriver: true }),
          Animated.timing(opacityAnim, { toValue: 0.3, duration: 8000, useNativeDriver: true })
        ]).start();
        const t3 = setTimeout(() => { if (isRunning.current) runCycle(); }, 8000);
        timeouts.current.push(t3);
      }, 7000);
      timeouts.current.push(t2);
    }, 4000);
    timeouts.current.push(t1);
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* SECCIÓN MULTI-TRATAMIENTO */}
        {!isBreathing && (
          <View style={styles.medicationCard}>
            <View style={styles.headerMed}>
              <Text style={styles.medTitle}>Mi Tratamiento 💊</Text>
              <TouchableOpacity onPress={agregarAlarma} style={styles.addBtn}>
                <Ionicons name="add-circle" size={28} color="#0288d1" />
              </TouchableOpacity>
            </View>

            {alarmas.length === 0 && <Text style={styles.noAlarmasText}>No hay alarmas configuradas.</Text>}

            {alarmas.map(item => (
              <View key={item.id} style={styles.alarmaItem}>
                <View style={{flex: 1}}>
                  <TextInput 
                    style={styles.alarmaInput} 
                    value={item.nombre} 
                    onChangeText={(t) => cambiarNombre(item.id, t)}
                    placeholder="Nombre de la pastilla"
                  />
                  <TouchableOpacity onPress={() => abrirReloj(item.id)}>
                    <Text style={styles.horaText}>
                      ⌚ {new Date(item.hora).getHours()}:{new Date(item.hora).getMinutes().toString().padStart(2, '0')}
                    </Text>
                  </TouchableOpacity>
                </View>
                <Switch 
                  value={item.activa} 
                  onValueChange={() => toggleAlarma(item.id)}
                  trackColor={{ false: "#ccc", true: "#0288d1" }}
                />
                <TouchableOpacity onPress={() => eliminarAlarma(item.id)} style={{marginLeft: 10}}>
                  <Ionicons name="trash-outline" size={20} color="#d32f2f" />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        {showPicker && (
          <DateTimePicker
            value={new Date()}
            mode="time"
            is24Hour={true}
            onChange={onTimeChange}
          />
        )}

        <View style={styles.messageBox}>
          <Text style={styles.message}>"{message}"</Text>
        </View>

        <TouchableWithoutFeedback onPress={() => isBreathing ? stopBreathing() : startBreathing()}>
          <View style={styles.breathingZone}>
            <Animated.View style={[
              styles.circle, 
              { transform: [{ scale: scaleAnim }], opacity: opacityAnim }
            ]} />
            <Text style={styles.breathInstruction}>{breathText}</Text>
          </View>
        </TouchableWithoutFeedback>
        
        <Text style={styles.helperText}>
          {isBreathing 
            ? "Toca el círculo en cualquier momento para detener." 
            : "Técnica clínica recomendada para reducir la ansiedad."}
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fdfbf7' },
  scrollContent: { alignItems: 'center', padding: 20, paddingTop: 10 }, // PaddingTop reducido
  medicationCard: { backgroundColor: '#e1f5fe', width: '100%', padding: 15, borderRadius: 16, marginBottom: 20, borderWidth: 1, borderColor: '#b3e5fc' },
  headerMed: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  medTitle: { fontSize: 18, fontWeight: 'bold', color: '#01579b' },
  noAlarmasText: { color: '#0288d1', fontStyle: 'italic', textAlign: 'center' },
  alarmaItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 10, borderRadius: 10, marginBottom: 8, elevation: 1 },
  alarmaInput: { fontWeight: 'bold', color: '#333', fontSize: 14, padding: 0 },
  horaText: { color: '#0288d1', fontSize: 13, marginTop: 2, fontWeight: '600' },
  messageBox: { backgroundColor: '#fff', padding: 15, borderRadius: 16, borderWidth: 1, borderColor: '#f0f0f0', marginBottom: 30, width: '100%', elevation: 2 },
  message: { fontSize: 14, textAlign: 'center', color: '#555', fontStyle: 'italic' },
  breathingZone: { justifyContent: 'center', alignItems: 'center', width: 220, height: 220 },
  circle: { position: 'absolute', width: 100, height: 100, borderRadius: 50, backgroundColor: '#0288d1' },
  breathInstruction: { fontSize: 16, fontWeight: 'bold', color: '#333', textAlign: 'center', zIndex: 10 },
  helperText: { marginTop: 20, fontSize: 12, color: '#888', textAlign: 'center', fontStyle: 'italic' },
  addBtn: { padding: 2 }
});