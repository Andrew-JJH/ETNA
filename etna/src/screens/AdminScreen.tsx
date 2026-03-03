import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, ActivityIndicator, TextInput, Modal, Share } from 'react-native';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { auth, db } from '../config/firebase';

export default function AdminScreen({ navigation }: any) {
  const [pacientes, setPacientes] = useState<any[]>([]);
  const [cargando, setCargando] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [pacienteSeleccionado, setPacienteSeleccionado] = useState<any>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [exportando, setExportando] = useState(false);

  useEffect(() => {
    const cargarPacientes = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, 'usuarios'));
        const listaUsuarios = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setPacientes(listaUsuarios.filter((u: any) => u.rol !== 'admin'));
      } catch (error) {
        console.error("Error:", error);
      } finally {
        setCargando(false);
      }
    };
    cargarPacientes();
  }, []);

  const handleLogout = async () => {
    await signOut(auth);
    navigation.replace('Auth');
  };

  // --- MOTOR DE EXPORTACIÓN CMAPA (4 SEMANAS) ---
  const exportarDatosClinicos = async () => {
    if (!pacienteSeleccionado) return;
    setExportando(true);

    try {
      // 1. Historial Diario (Recaídas y Resistencias)
      const qDiarios = query(collection(db, 'registros_diarios'), where('userId', '==', pacienteSeleccionado.id));
      const snapshotDiarios = await getDocs(qDiarios);
      const registros = snapshotDiarios.docs.map(d => d.data());

      // Agrupar registros por fecha (Últimos 28 días / 4 Semanas)
      const diasSemanaNombres = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
      let textoDiario = "";
      
      // Ordenamos los registros cronológicamente
      registros.sort((a, b) => new Date(a.fecha_registro).getTime() - new Date(b.fecha_registro).getTime());
      
      // Agrupamos por Día exacto
      const agrupadosPorDia: any = {};
      registros.forEach(reg => {
        const fechaObj = new Date(reg.fecha_registro);
        const fechaString = fechaObj.toISOString().split('T')[0];
        const nombreDia = diasSemanaNombres[fechaObj.getDay()];
        
        if (!agrupadosPorDia[fechaString]) {
          agrupadosPorDia[fechaString] = { dia: nombreDia, fumados: 0, momentos: [], tecnicas: [] };
        }
        
        if (reg.fumado) agrupadosPorDia[fechaString].fumados += 1;
        if (reg.momento_dificil && !agrupadosPorDia[fechaString].momentos.includes(reg.momento_dificil)) {
            agrupadosPorDia[fechaString].momentos.push(`${reg.momento_dificil} (${reg.razon || 'Estrés'})`);
        }
        if (reg.tecnica_usada && !agrupadosPorDia[fechaString].tecnicas.includes(reg.tecnica_usada)) {
            agrupadosPorDia[fechaString].tecnicas.push(reg.tecnica_usada);
        }
      });

      // Construimos el texto del Diario de las últimas 4 semanas
      Object.keys(agrupadosPorDia).slice(-28).forEach(fecha => {
        const data = agrupadosPorDia[fecha];
        textoDiario += `${data.dia} (${fecha}):\n`;
        textoDiario += `Registro: Fumé ${data.fumados} cigarrillos.\n`;
        textoDiario += `Momentos difíciles: ${data.momentos.join(', ') || 'No registrados'}.\n`;
        textoDiario += `Técnica usada: ${data.tecnicas.join(', ') || 'Ninguna'}.\n\n`;
      });

      if (textoDiario === "") textoDiario = "No hay registros en el diario del paciente.\n\n";

      // 2. Buscar la última prueba de CO (Cooximetría)
      let ultimoCO = "No registrada";
      const qCO = query(collection(db, 'pruebas_co'), where('userId', '==', pacienteSeleccionado.id));
      const snapshotCO = await getDocs(qCO);
      if (!snapshotCO.empty) {
        const pruebas = snapshotCO.docs.map(d => d.data()).sort((a, b) => 
          new Date(b.fecha_prueba).getTime() - new Date(a.fecha_prueba).getTime()
        );
        ultimoCO = `${pruebas[0].nivel_ppm} ppm (Fecha: ${pruebas[0].fecha_prueba.split('T')[0]})`;
      }

      // 3. Formato exacto de Exportación
      const reporte = `🏥 DIARIO DE SEGUIMIENTO (CMAPA) - ETNA\n` +
                      `=====================================\n` +
                      `Paciente: ${pacienteSeleccionado.email}\n` +
                      `Prueba de Cooximetría (CO): ${ultimoCO}\n` +
                      `=====================================\n\n` +
                      `📝 REGISTRO DE SEGUIMIENTO (Últimas 4 semanas):\n\n` +
                      `${textoDiario}` +
                      `=====================================\n` +
                      `💡 Consejos clave CMAPA/Salud:\n` +
                      `- Registra todo: Anota cada cigarrillo para ser consciente del consumo.\n` +
                      `- Retrasa el deseo: Si tienes ganas de fumar, espera 5 minutos haciendo otra cosa.\n` +
                      `- Premio semanal: Si cumples tus metas, haz algo que te guste.`;

      await Share.share({ message: reporte, title: `DiarioClinico_${pacienteSeleccionado.email}` });

    } catch (error: any) {
      Alert.alert('Error al generar informe', error.message);
    } finally {
      setExportando(false);
    }
  };

  const pacientesFiltrados = pacientes.filter(p => p.email?.toLowerCase().includes(busqueda.toLowerCase()));

  const renderPaciente = ({ item }: { item: any }) => (
    <TouchableOpacity style={styles.pacienteCard} onPress={() => { setPacienteSeleccionado(item); setModalVisible(true); }}>
      <View>
        <Text style={styles.pacienteEmail}>{item.email}</Text>
        <Text style={styles.pacienteInfo}>Consumo previo: {item.consumo_diario_medio} cig/día</Text>
      </View>
      <Text style={styles.flecha}>→</Text>
    </TouchableOpacity>
  );

  if (cargando) return <View style={styles.center}><ActivityIndicator size="large" color="#0288d1" /></View>;

  return (
    <View style={styles.container}>
      <View style={styles.headerContainer}>
        <Text style={styles.header}>Panel Médico 🩺</Text>
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}><Text style={styles.logoutText}>Salir</Text></TouchableOpacity>
      </View>

      <TextInput style={styles.searchInput} placeholder="🔍 Buscar paciente por email..." placeholderTextColor="#829ab1" value={busqueda} onChangeText={setBusqueda} autoCapitalize="none" />
      <Text style={styles.subtitle}>Pacientes encontrados: {pacientesFiltrados.length}</Text>

      <FlatList data={pacientesFiltrados} keyExtractor={(item) => item.id} renderItem={renderPaciente} contentContainerStyle={styles.lista} ListEmptyComponent={<Text style={styles.empty}>No se encontraron pacientes.</Text>} />

      <Modal animationType="slide" transparent={true} visible={modalVisible} onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalView}>
            {pacienteSeleccionado && (
              <>
                <Text style={styles.modalTitle}>Ficha Clínica del Paciente</Text>
                <View style={styles.datosContainer}>
                  <Text style={styles.modalDato}>📧 <Text style={styles.modalValor}>{pacienteSeleccionado.email}</Text></Text>
                </View>
                
                <View style={styles.modalActions}>
                  <TouchableOpacity style={[styles.exportBtn, exportando && { backgroundColor: '#829ab1' }]} onPress={exportarDatosClinicos} disabled={exportando}>
                    <Text style={styles.exportText}>{exportando ? 'Extrayendo Diario...' : '📤 Exportar Diario de Seguimiento'}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.closeBtn} onPress={() => setModalVisible(false)}>
                    <Text style={styles.closeText}>Cerrar Ficha</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f4f8', padding: 20 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  headerContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 40, marginBottom: 15 },
  header: { fontSize: 26, fontWeight: 'bold', color: '#102a43' },
  logoutBtn: { backgroundColor: '#d32f2f', paddingVertical: 8, paddingHorizontal: 15, borderRadius: 8 },
  logoutText: { color: '#fff', fontWeight: 'bold' },
  searchInput: { backgroundColor: '#fff', padding: 15, borderRadius: 12, fontSize: 16, color: '#334e68', marginBottom: 10, borderWidth: 1, borderColor: '#d9e2ec' },
  subtitle: { fontSize: 14, color: '#486581', marginBottom: 15, fontStyle: 'italic' },
  lista: { paddingBottom: 20 },
  pacienteCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff', padding: 15, borderRadius: 12, marginBottom: 10, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 5, elevation: 2 },
  pacienteEmail: { fontSize: 16, fontWeight: 'bold', color: '#334e68' },
  pacienteInfo: { fontSize: 14, color: '#829ab1', marginTop: 4 },
  flecha: { fontSize: 24, color: '#bcccdc' },
  empty: { textAlign: 'center', color: '#829ab1', marginTop: 40, fontSize: 16 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(16, 42, 67, 0.6)', justifyContent: 'flex-end' },
  modalView: { backgroundColor: 'white', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 25, shadowColor: '#000', elevation: 5 },
  modalTitle: { fontSize: 22, fontWeight: 'bold', color: '#102a43', textAlign: 'center', marginBottom: 20 },
  datosContainer: { backgroundColor: '#f0f4f8', padding: 15, borderRadius: 12, marginBottom: 20 },
  modalDato: { fontSize: 15, color: '#486581', marginBottom: 5 },
  modalValor: { fontWeight: 'bold', color: '#102a43' },
  modalActions: { gap: 10 },
  exportBtn: { backgroundColor: '#0288d1', padding: 15, borderRadius: 12, alignItems: 'center' },
  exportText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  closeBtn: { backgroundColor: 'transparent', padding: 15, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: '#829ab1' },
  closeText: { color: '#486581', fontWeight: 'bold', fontSize: 16 }
});