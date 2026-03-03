import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Easing, TouchableWithoutFeedback } from 'react-native';

const MESSAGES = [
  "Cada vez que eliges no fumar, das un paso más hacia una vida más libre, saludable y llena de posibilidades.",
  "La ansiedad es como una ola: sube, pero siempre termina bajando. Solo respira.",
  "Estás recuperando el control. No dejes que un impulso de 3 minutos borre tu esfuerzo.",
  "Respira profundamente. El oxígeno puro es tu nueva recompensa."
];

export default function SosScreen() {
  const [isBreathing, setIsBreathing] = useState(false);
  const [breathText, setBreathText] = useState('Toca aquí para\nempezar');
  const [message, setMessage] = useState(MESSAGES[0]);
  
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const opacityAnim = useRef(new Animated.Value(1)).current;
  const isRunning = useRef(false);
  const timeouts = useRef<NodeJS.Timeout[]>([]);

  const clearAllTimeouts = () => {
    timeouts.current.forEach(clearTimeout);
    timeouts.current = [];
  };

  useEffect(() => {
    return () => stopBreathing();
  }, []);

  const stopBreathing = () => {
    isRunning.current = false;
    setIsBreathing(false);
    clearAllTimeouts();
    scaleAnim.stopAnimation();
    opacityAnim.stopAnimation();
    
    Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true }).start();
    Animated.timing(opacityAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
    setBreathText('Toca aquí para\nempezar');
  };

  const startBreathing = () => {
    if (isBreathing) return;
    
    isRunning.current = true;
    setIsBreathing(true);
    setMessage(MESSAGES[Math.floor(Math.random() * MESSAGES.length)]);

    runCycle(); 
  };

  // Función comodín: Si está respirando, para. Si está parado, arranca.
  const toggleBreathing = () => {
    if (isBreathing) stopBreathing();
    else startBreathing();
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

        const t3 = setTimeout(() => {
          if (isRunning.current) runCycle(); 
        }, 8000);

        timeouts.current.push(t3);
      }, 7000);

      timeouts.current.push(t2);
    }, 4000);

    timeouts.current.push(t1);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Botón SOS 🛟</Text>
      
      <View style={styles.messageBox}>
        <Text style={styles.message}>"{message}"</Text>
      </View>

      {/* AHORA EL CÍRCULO TAMBIÉN ES UN BOTÓN INVISIBLE */}
      <TouchableWithoutFeedback onPress={toggleBreathing}>
        <View style={styles.breathingZone}>
          <Animated.View style={[
            styles.circle, 
            { transform: [{ scale: scaleAnim }], opacity: opacityAnim }
          ]} />
          <Text style={styles.breathInstruction}>{breathText}</Text>
        </View>
      </TouchableWithoutFeedback>

      <TouchableOpacity 
        style={[styles.actionBtn, isBreathing ? styles.btnStop : styles.btnStart]} 
        onPress={toggleBreathing} 
        activeOpacity={0.8}
      >
        <Text style={styles.actionBtnText}>
          {isBreathing ? 'Detener Ejercicio 🛑' : 'Comenzar Técnica 4-7-8 ▶️'}
        </Text>
      </TouchableOpacity>
      
      {!isBreathing && (
        <Text style={styles.helperText}>
          Técnica clínica recomendada para reducir de inmediato las pulsaciones y la ansiedad.
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fdfbf7', padding: 20 },
  title: { fontSize: 28, fontWeight: 'bold', color: '#d32f2f', marginBottom: 20, marginTop: 20 },
  messageBox: { backgroundColor: '#fff', padding: 20, borderRadius: 16, borderWidth: 1, borderColor: '#f0f0f0', marginBottom: 50, width: '100%', elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 5 },
  message: { fontSize: 16, textAlign: 'center', color: '#555', fontStyle: 'italic', lineHeight: 24 },
  
  // Hemos ampliado la zona de toque para que sea más fácil darle con el dedo
  breathingZone: { justifyContent: 'center', alignItems: 'center', width: 300, height: 300, marginBottom: 30 },
  
  circle: { position: 'absolute', width: 100, height: 100, borderRadius: 50, backgroundColor: '#0288d1' },
  breathInstruction: { fontSize: 20, fontWeight: 'bold', color: '#333', textAlign: 'center', zIndex: 10 },
  actionBtn: { width: '80%', paddingVertical: 18, borderRadius: 30, justifyContent: 'center', alignItems: 'center', elevation: 4, shadowColor: '#000', shadowOpacity: 0.2, shadowOffset: { width: 0, height: 2 }, shadowRadius: 4 },
  btnStart: { backgroundColor: '#f57c00' },
  btnStop: { backgroundColor: '#333' },
  actionBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 18 },
  helperText: { marginTop: 20, fontSize: 13, color: '#888', textAlign: 'center', paddingHorizontal: 20 }
});