import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, ActivityIndicator, TextInput, Modal, ScrollView } from 'react-native';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { auth, db } from '../config/firebase';
import { Ionicons } from '@expo/vector-icons';

import * as MailComposer from 'expo-mail-composer';
import * as Print from 'expo-print';
import * as FileSystem from 'expo-file-system/legacy';

export default function AdminScreen({ navigation }: any) {
  const [activeTab, setActiveTab] = useState('pacientes'); 
  const [pacientes, setPacientes] = useState<any[]>([]);
  const [cargando, setCargando] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  
  const [statsGlobales, setStatsGlobales] = useState({ totalPacientes: 0, totalAhorrado: 0, totalCigarrillosEvitados: 0, mediaAnsiedad: 0 });
  const [pacienteSeleccionado, setPacienteSeleccionado] = useState<any>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [exportando, setExportando] = useState(false);

  useEffect(() => { 
    cargarDatosGlobales(); 
  }, []);

  const cargarDatosGlobales = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'usuarios'));
      const lista = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const listaPacientes = lista.filter((u: any) => u.rol !== 'admin');
      setPacientes(listaPacientes);

      let ahorroTotal = 0; 
      let cigsEvitadosTotal = 0;
      
      listaPacientes.forEach((p: any) => {
        if (p.fecha_abandono) {
          const diasSin = Math.max(0, (new Date().getTime() - new Date(p.fecha_abandono).getTime()) / (1000 * 60 * 60 * 24));
          const ahorro = diasSin * (p.consumo_diario_medio || 0) * ((p.precio_paquete || 5) / 20);
          ahorroTotal += ahorro; 
          cigsEvitadosTotal += (diasSin * (p.consumo_diario_medio || 0));
        }
      });
      setStatsGlobales({ totalPacientes: listaPacientes.length, totalAhorrado: ahorroTotal, totalCigarrillosEvitados: cigsEvitadosTotal, mediaAnsiedad: 4.2 });
    } catch (error) { 
      console.error(error); 
    } finally { 
      setCargando(false); 
    }
  };

  const handleLogout = async () => { 
    await signOut(auth); 
    navigation.replace('Auth'); 
  };

  const exportarDatosClinicos = async () => {
    if (!pacienteSeleccionado) return;
    setExportando(true);
    try {
      const qDiarios = query(collection(db, 'registros_diarios'), where('userId', '==', pacienteSeleccionado.id));
      const snapshotDiarios = await getDocs(qDiarios);
      const registros = snapshotDiarios.docs.map(d => d.data());
      
      let agrupadosPorDia: any = {};
      registros.forEach(reg => {
        const fechaString = new Date(reg.fecha_registro).toISOString().split('T')[0]; 
        if (!agrupadosPorDia[fechaString]) agrupadosPorDia[fechaString] = { fumados: 0, resistidos: 0, eventos: [] };
        if (reg.fumado) agrupadosPorDia[fechaString].fumados += 1; else agrupadosPorDia[fechaString].resistidos += 1;
        agrupadosPorDia[fechaString].eventos.push({ contexto: reg.momento_dificil || 'No indicado', razon: reg.razon || 'No indicada', tecnica: reg.tecnica_usada || 'Ninguna', fumado: reg.fumado });
      });

      const qCO = query(collection(db, 'pruebas_co'), where('userId', '==', pacienteSeleccionado.id));
      const snapshotCO = await getDocs(qCO);
      let ultimoCO = "No registrada";
      if (!snapshotCO.empty) {
        const pruebas = snapshotCO.docs.map(d => d.data()).sort((a, b) => new Date(b.fecha_prueba).getTime() - new Date(a.fecha_prueba).getTime());
        ultimoCO = `${pruebas[0].nivel_ppm} ppm`;
      }

      let htmlContent = `
        <html>
          <head><style>body { font-family: Arial; padding: 30px; }</style></head>
          <body>
            <h1>Historial Clínico CMAPA</h1>
            <p>Paciente: ${pacienteSeleccionado.correo}</p>
            <p>Última CO: ${ultimoCO}</p>
          </body>
        </html>
      `;

      const { uri } = await Print.printToFileAsync({ html: htmlContent });
      const emailSeguro = (pacienteSeleccionado.correo || 'Paciente').replace(/[^a-zA-Z0-9]/g, '_');
      const basePath = uri.substring(0, uri.lastIndexOf('/') + 1);
      const pdfOficialUri = basePath + `Historial_CMAPA_${emailSeguro}.pdf`;
      
      await FileSystem.moveAsync({ from: uri, to: pdfOficialUri });

      Alert.alert('PDF Listo', '¿Deseas enviarlo ahora por correo?', [
          {
            text: '📧 Enviar',
            onPress: async () => {
              if (await MailComposer.isAvailableAsync()) {
                await MailComposer.composeAsync({
                  subject: `Informe Clínico - ${pacienteSeleccionado.correo}`,
                  body: `Adjunto historial.`,
                  attachments: [pdfOficialUri],
                });
              } else {
                Alert.alert("Error", "No tienes app de correo configurada.");
              }
            }
          },
          { text: 'Cancelar', style: 'cancel' }
        ]);
    } catch (error: any) { 
      Alert.alert('Error', error.message); 
    } finally { 
      setExportando(false); 
    }
  };

  const pacientesFiltrados = pacientes.filter(p => (p.correo || p.email || "").toLowerCase().includes(busqueda.toLowerCase()));

  if (cargando) return <View style={styles.center}><ActivityIndicator size="large" color="#0288d1" /></View>;

  return (
    <View style={styles.container}>
      <View style={styles.headerContainer}>
        <View>
          <Text style={styles.header}>Etna Admin 🩺</Text>
          <Text style={styles.subHeader}>Panel Médico Integral</Text>
        </View>
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      <View style={{ flex: 1 }}>
        {activeTab === 'pacientes' && (
          <View style={{ flex: 1 }}>
            <TextInput style={styles.searchInput} placeholder="🔍 Buscar paciente..." value={busqueda} onChangeText={setBusqueda} autoCapitalize="none" />
            <FlatList 
              data={pacientesFiltrados} 
              keyExtractor={(item) => item.id} 
              contentContainerStyle={styles.lista} 
              renderItem={({ item }) => (
                <TouchableOpacity style={styles.pacienteCard} onPress={() => { setPacienteSeleccionado(item); setModalVisible(true); }}>
                  <View>
                    <Text style={styles.pacienteEmail}>{item.correo || item.email}</Text>
                    <Text style={styles.pacienteInfo}>Consumo: {item.consumo_diario_medio} {item.tipo_consumo}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color="#bcccdc" />
                </TouchableOpacity>
              )} 
            />
          </View>
        )}
        
        {activeTab === 'stats' && (
           <ScrollView style={styles.statsScroll}>
             <Text style={styles.statsTitle}>Impacto Global 🌍</Text>
             <View style={styles.statsGrid}>
               <View style={[styles.statBox, { backgroundColor: '#e3f2fd' }]}>
                 <Ionicons name="people" size={30} color="#0288d1" />
                 <Text style={styles.statNum}>{statsGlobales.totalPacientes}</Text>
                 <Text style={styles.statLabel}>Pacientes</Text>
               </View>
               <View style={[styles.statBox, { backgroundColor: '#e8f5e9' }]}>
                 <Ionicons name="cash" size={30} color="#2e7d32" />
                 <Text style={styles.statNum}>{Math.floor(statsGlobales.totalAhorrado)}€</Text>
                 <Text style={styles.statLabel}>Ahorro</Text>
               </View>
               <View style={[styles.statBox, { backgroundColor: '#fff3e0' }]}>
                 <Ionicons name="leaf" size={30} color="#ef6c00" />
                 <Text style={styles.statNum}>{Math.floor(statsGlobales.totalCigarrillosEvitados)}</Text>
                 <Text style={styles.statLabel}>Humos Evitados</Text>
               </View>
               <View style={[styles.statBox, { backgroundColor: '#f3e5f5' }]}>
                 <Ionicons name="pulse" size={30} color="#7b1fa2" />
                 <Text style={styles.statNum}>{statsGlobales.mediaAnsiedad}/10</Text>
                 <Text style={styles.statLabel}>Ansiedad Media</Text>
               </View>
             </View>
           </ScrollView>
        )}
        
        {activeTab === 'comunidad' && (
          <View style={styles.centerContent}>
            <Ionicons name="shield-checkmark" size={60} color="#0288d1" />
            <Text style={styles.modTitle}>Moderación de Comunidad</Text>
            <TouchableOpacity style={styles.bigModBtn} onPress={() => navigation.navigate('AdminChat')}>
              <Text style={styles.bigModBtnText}>💬 Abrir Panel</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      <View style={styles.tabBar}>
        <TouchableOpacity style={[styles.tabItem, activeTab === 'pacientes' && styles.tabItemActive]} onPress={() => setActiveTab('pacientes')}>
          <Ionicons name="people" size={24} color={activeTab === 'pacientes' ? '#0288d1' : '#829ab1'} />
          <Text style={styles.tabText}>Pacientes</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tabItem, activeTab === 'stats' && styles.tabItemActive]} onPress={() => setActiveTab('stats')}>
          <Ionicons name="bar-chart" size={24} color={activeTab === 'stats' ? '#0288d1' : '#829ab1'} />
          <Text style={styles.tabText}>Métricas</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tabItem, activeTab === 'comunidad' && styles.tabItemActive]} onPress={() => setActiveTab('comunidad')}>
          <Ionicons name="chatbubbles" size={24} color={activeTab === 'comunidad' ? '#0288d1' : '#829ab1'} />
          <Text style={styles.tabText}>Comunidad</Text>
        </TouchableOpacity>
      </View>

      <Modal animationType="slide" transparent={true} visible={modalVisible} onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalView}>
            {pacienteSeleccionado && (
              <View>
                <Text style={styles.modalTitle}>Ficha del Paciente</Text>
                
                <View style={styles.datosContainer}>
                  <Text style={styles.modalDato}>📧 <Text style={styles.modalValor}>{pacienteSeleccionado.correo || pacienteSeleccionado.email}</Text></Text>
                  <Text style={styles.modalDato}>🚭 Dispositivo: <Text style={styles.modalValor}>{pacienteSeleccionado.tipo_consumo}</Text></Text>
                </View>

                <View style={styles.modalActions}>
                  <TouchableOpacity style={styles.docsBtn} onPress={() => {
                    setModalVisible(false);
                    navigation.navigate('PatientDocuments', { paciente: pacienteSeleccionado });
                  }}>
                    <Ionicons name="folder-open" size={20} color="#fff" />
                    <Text style={styles.docsBtnText}> Documentos y Tareas</Text>
                  </TouchableOpacity>

                  <TouchableOpacity style={[styles.exportBtn, exportando && { backgroundColor: '#829ab1' }]} onPress={exportarDatosClinicos} disabled={exportando}>
                    <Text style={styles.exportText}>{exportando ? 'Preparando...' : '📄 Generar Informe PDF'}</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity style={styles.closeBtn} onPress={() => setModalVisible(false)}>
                    <Text style={styles.closeText}>Volver a la Lista</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f4f8' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  headerContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 50, paddingHorizontal: 20, paddingBottom: 15, backgroundColor: '#fff', elevation: 2 },
  header: { fontSize: 24, fontWeight: 'bold', color: '#102a43' },
  subHeader: { fontSize: 13, color: '#829ab1' },
  logoutBtn: { backgroundColor: '#d32f2f', padding: 10, borderRadius: 10 },
  searchInput: { backgroundColor: '#fff', padding: 15, marginHorizontal: 20, marginTop: 15, borderRadius: 12, fontSize: 16, color: '#334e68', borderWidth: 1, borderColor: '#d9e2ec' },
  lista: { padding: 20 },
  pacienteCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff', padding: 15, borderRadius: 12, marginBottom: 10, elevation: 2 },
  pacienteEmail: { fontSize: 16, fontWeight: 'bold', color: '#334e68' },
  pacienteInfo: { fontSize: 12, color: '#829ab1', marginTop: 4 },
  tabBar: { flexDirection: 'row', height: 75, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#d9e2ec', paddingBottom: 15 },
  tabItem: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  tabItemActive: { borderTopWidth: 3, borderTopColor: '#0288d1' },
  tabText: { fontSize: 11, color: '#829ab1', marginTop: 4, fontWeight: 'bold' },
  
  statsScroll: { padding: 20 },
  statsTitle: { fontSize: 20, fontWeight: 'bold', color: '#102a43', marginBottom: 20 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  statBox: { width: '48%', padding: 20, borderRadius: 16, alignItems: 'center', marginBottom: 15, elevation: 1 },
  statNum: { fontSize: 24, fontWeight: 'bold', color: '#102a43', marginTop: 5 },
  statLabel: { fontSize: 11, color: '#486581', textAlign: 'center' },
  
  centerContent: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  modTitle: { fontSize: 20, fontWeight: 'bold', color: '#102a43', marginTop: 15 },
  bigModBtn: { backgroundColor: '#0288d1', paddingVertical: 15, paddingHorizontal: 25, borderRadius: 15, elevation: 3, marginTop: 20 },
  bigModBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(16, 42, 67, 0.6)', justifyContent: 'flex-end' },
  modalView: { backgroundColor: 'white', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 25 },
  modalTitle: { fontSize: 22, fontWeight: 'bold', color: '#102a43', textAlign: 'center', marginBottom: 20 },
  datosContainer: { backgroundColor: '#f0f4f8', padding: 15, borderRadius: 12, marginBottom: 20 },
  modalDato: { fontSize: 15, color: '#486581', marginBottom: 5 },
  modalValor: { fontWeight: 'bold', color: '#102a43' },
  modalActions: { gap: 12 },
  
  docsBtn: { flexDirection: 'row', backgroundColor: '#102a43', padding: 15, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  docsBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  exportBtn: { backgroundColor: '#0288d1', padding: 15, borderRadius: 12, alignItems: 'center' },
  exportText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  closeBtn: { backgroundColor: 'transparent', padding: 15, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: '#829ab1' },
  closeText: { color: '#486581', fontWeight: 'bold', fontSize: 16 },
});