import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Animated, Easing, TouchableWithoutFeedback } from 'react-native';

const MESSAGES = [
  "Cada vez que eliges no fumar, das un paso más hacia una vida más libre, saludable y llena de posibilidades.",
  "La ansiedad es como una ola: sube, pero siempre termina bajando. Solo respira.",
  "Estás recuperando el control. No dejes que un impulso de 3 minutos borre tu esfuerzo.",
  "Respira profundamente. El oxígeno puro es tu nueva recompensa."
];

export default function SosScreen() {
  const [isBreathing, setIsBreathing] = useState(false);
  const [breathText, setBreathText] = useState('Toca para\nempezar');
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
    setBreathText('Toca para\nempezar');
  };

  const startBreathing = () => {
    if (isBreathing) return;
    
    isRunning.current = true;
    setIsBreathing(true);
    setMessage(MESSAGES[Math.floor(Math.random() * MESSAGES.length)]);

    runCycle(); 
  };

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

      {/* EL CÍRCULO ES EL ÚNICO BOTÓN */}
      <TouchableWithoutFeedback onPress={toggleBreathing}>
        <View style={styles.breathingZone}>
          <Animated.View style={[
            styles.circle, 
            { transform: [{ scale: scaleAnim }], opacity: opacityAnim }
          ]} />
          <Text style={styles.breathInstruction}>{breathText}</Text>
        </View>
      </TouchableWithoutFeedback>
      
      {/* TEXTO DE AYUDA DINÁMICO */}
      <Text style={styles.helperText}>
        {isBreathing 
          ? "Toca el círculo en cualquier momento para detener." 
          : "Técnica clínica recomendada para reducir de inmediato las pulsaciones y la ansiedad."}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fdfbf7', padding: 20 },
  title: { fontSize: 28, fontWeight: 'bold', color: '#d32f2f', marginBottom: 20, marginTop: 20 },
  messageBox: { backgroundColor: '#fff', padding: 20, borderRadius: 16, borderWidth: 1, borderColor: '#f0f0f0', marginBottom: 50, width: '100%', elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 5 },
  message: { fontSize: 16, textAlign: 'center', color: '#555', fontStyle: 'italic', lineHeight: 24 },
  
  breathingZone: { justifyContent: 'center', alignItems: 'center', width: 300, height: 300, marginBottom: 10 },
  circle: { position: 'absolute', width: 100, height: 100, borderRadius: 50, backgroundColor: '#0288d1' },
  breathInstruction: { fontSize: 20, fontWeight: 'bold', color: '#333', textAlign: 'center', zIndex: 10 },
  
  helperText: { marginTop: 30, fontSize: 14, color: '#888', textAlign: 'center', paddingHorizontal: 20, fontStyle: 'italic' }
});