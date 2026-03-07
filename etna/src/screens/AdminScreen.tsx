import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, ActivityIndicator, TextInput, Modal, ScrollView, Platform } from 'react-native';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { auth, db } from '../config/firebase';
import { Ionicons } from '@expo/vector-icons';
import * as Sharing from 'expo-sharing';
import * as MailComposer from 'expo-mail-composer';
import * as Print from 'expo-print';
import * as FileSystem from 'expo-file-system/legacy';

// Componentes externos
import AdminStatsDashboard from '../components/AdminStatsDashboard';

export default function AdminScreen({ navigation }: any) {
  const [activeTab, setActiveTab] = useState('pacientes'); 
  const [pacientes, setPacientes] = useState<any[]>([]);
  const [cargando, setCargando] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  
  const [pacienteSeleccionado, setPacienteSeleccionado] = useState<any>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [exportando, setExportando] = useState(false);

  useEffect(() => { 
    cargarDatosGlobales(); 
  }, []);

  const cargarDatosGlobales = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'usuarios'));
      const lista: any[] = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const listaPacientes = lista.filter((u) => u.rol !== 'admin');

      const pacientesConRiesgo: any[] = [];

      for (const p of listaPacientes) {
        let diasSinFumar = 0;
        if (p.fecha_abandono) {
          diasSinFumar = Math.max(0, (new Date().getTime() - new Date(p.fecha_abandono).getTime()) / (1000 * 60 * 60 * 24));
        }

        const qDiarios = query(collection(db, 'registros_diarios'), where('userId', '==', p.id));
        const snapshotDiarios = await getDocs(qDiarios);
        const registros = snapshotDiarios.docs.map(d => d.data());
        
        let recaidaReciente = false;
        const hace3Dias = new Date();
        hace3Dias.setDate(hace3Dias.getDate() - 3);

        registros.forEach(reg => {
          const fechaReg = new Date(reg.fecha_registro);
          if (reg.fumado && fechaReg >= hace3Dias) recaidaReciente = true;
        });

        let nivelRiesgo = 'verde';
        if (recaidaReciente) nivelRiesgo = 'rojo';
        else if (diasSinFumar < 7) nivelRiesgo = 'amarillo';

        pacientesConRiesgo.push({ ...p, nivelRiesgo, diasSinFumar: Math.floor(diasSinFumar) });
      }

      pacientesConRiesgo.sort((a, b) => {
        const peso = { 'rojo': 1, 'amarillo': 2, 'verde': 3 };
        return peso[a.nivelRiesgo as keyof typeof peso] - peso[b.nivelRiesgo as keyof typeof peso];
      });

      setPacientes(pacientesConRiesgo);
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
    
    console.log('\n--- INICIANDO EXPORTACIÓN ---');
    console.log('Paciente:', pacienteSeleccionado.correo || pacienteSeleccionado.email);

    try {
      const qDiarios = query(collection(db, 'registros_diarios'), where('userId', '==', pacienteSeleccionado.id));
      const snapshotDiarios = await getDocs(qDiarios);
      const registros = snapshotDiarios.docs.map(d => d.data());
      console.log('Paso 1: Datos extraídos de Firebase correctamente (Registros:', registros.length, ')');
      
      const agrupadosPorDia: any = {};
      registros.forEach(reg => {
        const fechaObj = new Date(reg.fecha_registro);
        const fechaString = fechaObj.toISOString().split('T')[0]; 
        if (!agrupadosPorDia[fechaString]) agrupadosPorDia[fechaString] = { fumados: 0, resistidos: 0, eventos: [] };
        if (reg.fumado) agrupadosPorDia[fechaString].fumados += 1;
        else agrupadosPorDia[fechaString].resistidos += 1;
        agrupadosPorDia[fechaString].eventos.push({
            contexto: reg.momento_dificil || 'No indicado',
            razon: reg.razon || 'No indicada',
            tecnica: reg.tecnica_usada || 'Ninguna',
            fumado: reg.fumado
        });
      });

      const qCO = query(collection(db, 'pruebas_co'), where('userId', '==', pacienteSeleccionado.id));
      const snapshotCO = await getDocs(qCO);
      let agrupadosCO: any = {};
      let ultimoCO = "No registrada";
      
      if (!snapshotCO.empty) {
        const pruebas = snapshotCO.docs.map(d => d.data()).sort((a, b) => new Date(b.fecha_prueba).getTime() - new Date(a.fecha_prueba).getTime());
        ultimoCO = `${pruebas[0].nivel_ppm} ppm`;
        pruebas.forEach(p => { 
          const f = p.fecha_prueba.split('T')[0];
          agrupadosCO[f] = p.nivel_ppm; 
        });
      }
      console.log('Paso 2: Datos agrupados para el calendario.');

      const hoy = new Date();
      let diaSemana = hoy.getDay(); 
      let diasParaDomingo = diaSemana === 0 ? 0 : 7 - diaSemana;
      let ultimoDomingo = new Date(hoy);
      ultimoDomingo.setDate(hoy.getDate() + diasParaDomingo);
      let iterDate = new Date(ultimoDomingo);
      iterDate.setDate(ultimoDomingo.getDate() - 27);

      const nombresMesesCortos = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

      let calendarioHTML = `
        <div class="calendar-title">Seguimiento de las Últimas 4 Semanas</div>
        <table class="calendar">
          <tr>
            <th style="width: 12.5%;">Lunes</th>
            <th style="width: 12.5%;">Martes</th>
            <th style="width: 12.5%;">Miércoles</th>
            <th style="width: 12.5%; background-color: #0288d1; border: 2px solid #0288d1; font-size: 13px;">CO (ppm)</th>
            <th style="width: 12.5%;">Jueves</th>
            <th style="width: 12.5%;">Viernes</th>
            <th style="width: 12.5%;">Sábado</th>
            <th style="width: 12.5%;">Domingo</th>
          </tr>
      `;

      for (let semana = 0; semana < 4; semana++) {
        let rowHTML = "<tr>";
        let coTestsThisWeek = [];
        let tempDate = new Date(iterDate);
        for (let d = 0; d < 7; d++) {
           let fCO = `${tempDate.getFullYear()}-${String(tempDate.getMonth() + 1).padStart(2, '0')}-${String(tempDate.getDate()).padStart(2, '0')}`;
           if (agrupadosCO[fCO]) coTestsThisWeek.push(agrupadosCO[fCO] + ' ppm');
           tempDate.setDate(tempDate.getDate() + 1);
        }
        
        let coCell = `<td style="background-color: #e1f5fe; border: 2px solid #0288d1; text-align: center; vertical-align: middle; color: #0288d1; font-weight: bold; font-size: 15px;">${coTestsThisWeek.length > 0 ? coTestsThisWeek.join('<br>') : '-'}</td>`;
        
        for (let d = 0; d < 7; d++) {
           let f = `${iterDate.getFullYear()}-${String(iterDate.getMonth() + 1).padStart(2, '0')}-${String(iterDate.getDate()).padStart(2, '0')}`;
           let textoDia = `${iterDate.getDate()} ${nombresMesesCortos[iterDate.getMonth()]}`;
           let datos = agrupadosPorDia[f];
           let contenido = "";
           if (datos) {
             if (datos.fumados > 0) contenido += `<div class="pill recaida">❌ ${datos.fumados}</div>`;
             if (datos.resistidos > 0) contenido += `<div class="pill exito">✅ ${datos.resistidos}</div>`;
           }
           let esFuturo = iterDate > hoy ? 'background-color: #fcfcfc; color: #ccc;' : '';
           rowHTML += `<td style="${esFuturo}"><div class="dia-numero">${textoDia}</div><div class="dia-contenido">${contenido}</div></td>`;
           if (d === 2) rowHTML += coCell;
           iterDate.setDate(iterDate.getDate() + 1);
        }
        rowHTML += "</tr>";
        calendarioHTML += rowHTML;
      }
      calendarioHTML += `</table>`;

      let detallesHTML = "";
      Object.keys(agrupadosPorDia).sort().reverse().forEach(fecha => {
        const data = agrupadosPorDia[fecha];
        let listaEventos = "";
        data.eventos.forEach((e: any) => {
            const icono = e.fumado ? '❌' : '✅';
            listaEventos += `<div class="evento-item">${icono} <b>${e.contexto}</b> <i>(${e.razon})</i> — Técnica: <b>${e.tecnica}</b></div>`;
        });
        detallesHTML += `
          <div class="detalle-dia">
            <div class="detalle-fecha">${fecha.split('-').reverse().join('/')}</div>
            ${listaEventos}
          </div>
        `;
      });

      const esVaper = pacienteSeleccionado.tipo_consumo === 'vapeador';
      
      // Construimos el nombre del paciente para el PDF
      const nombreMostrarPDF = pacienteSeleccionado.nombre 
        ? `${pacienteSeleccionado.nombre} (${pacienteSeleccionado.correo || pacienteSeleccionado.email})` 
        : (pacienteSeleccionado.correo || pacienteSeleccionado.email);

      const htmlContent = `
        <html>
          <head>
            <style>
              body { font-family: 'Helvetica', 'Arial', sans-serif; padding: 30px; color: #333; }
              .header { text-align: center; border-bottom: 2px solid #102a43; padding-bottom: 10px; margin-bottom: 20px; }
              .title { color: #102a43; font-size: 22px; margin: 0; }
              .subtitle { color: #829ab1; font-size: 14px; margin-top: 5px; }
              .info-box { background-color: #f0f4f8; padding: 10px; border-radius: 8px; margin-bottom: 20px; font-size: 14px; display: flex; justify-content: space-between;}
              .calendar-title { font-size: 18px; color: #102a43; font-weight: bold; margin-bottom: 10px; text-align: center; }
              .calendar { width: 100%; border-collapse: collapse; table-layout: fixed; margin-bottom: 30px; }
              .calendar th { background-color: #102a43; color: white; border: 1px solid #102a43; padding: 8px 0; font-size: 11px; text-align: center; }
              .calendar td { border: 1px solid #bcccdc; height: 75px; vertical-align: top; position: relative; }
              .dia-numero { position: absolute; top: 4px; right: 4px; font-size: 10px; color: #333; border: 1px solid #ddd; padding: 2px 4px; background-color: #fff; border-radius: 2px; font-weight: bold;}
              .dia-contenido { margin-top: 25px; text-align: center; }
              .pill { font-size: 11px; font-weight: bold; margin: 2px auto; width: 85%; padding: 2px 0; border-radius: 4px; }
              .pill.recaida { background-color: #ffebee; color: #d32f2f; }
              .pill.exito { background-color: #e8f5e9; color: #2e7d32; }
              h2 { font-size: 16px; border-bottom: 1px solid #ddd; padding-bottom: 5px; color: #102a43; margin-top: 30px;}
              .detalle-dia { margin-bottom: 15px; }
              .detalle-fecha { font-weight: bold; color: #0288d1; font-size: 14px; margin-bottom: 5px; border-bottom: 1px dotted #ccc;}
              .evento-item { font-size: 12px; margin-bottom: 4px; margin-left: 10px; }
              .footer { text-align: center; font-size: 10px; color: #888; margin-top: 50px; border-top: 1px solid #ddd; padding-top: 10px; }
            </style>
          </head>
          <body>
            <div class="header">
              <h1 class="title">Historial Clínico CMAPA</h1>
              <p class="subtitle">Paciente: ${nombreMostrarPDF}</p>
            </div>
            <div class="info-box">
              <div><strong>Perfil:</strong> ${esVaper ? 'Vapeador' : 'Tabaco tradicional'}</div>
              <div><strong>Última CO:</strong> ${ultimoCO}</div>
              <div><strong>Fecha Emisión:</strong> ${new Date().toLocaleDateString()}</div>
            </div>
            ${calendarioHTML}
            <h2>Anotaciones del Diario (Por Fechas)</h2>
            ${detallesHTML}
            <div class="footer">Generado por Etna App. Confidencial.</div>
          </body>
        </html>
      `;

      console.log('Paso 3: HTML ensamblado.');
      console.log('Paso 4: Llamando a expo-print...');
      
      const { uri } = await Print.printToFileAsync({ html: htmlContent });
      console.log('Paso 5: PDF creado ->', uri);

      const emailSeguro = (pacienteSeleccionado.correo || pacienteSeleccionado.email).replace(/[^a-zA-Z0-9]/g, '_');
      const pdfOficialUri = FileSystem.documentDirectory + `Historial_CMAPA_${emailSeguro}.pdf`;
      
      await FileSystem.moveAsync({ 
        from: uri, 
        to: pdfOficialUri 
      });

      Alert.alert('Exportación Completada ✅', 'El PDF está listo para enviar.', [
        {
          text: '📧 Enviar por Correo',
          onPress: async () => {
            try {
              const isAvailable = await MailComposer.isAvailableAsync();
              
              if (isAvailable) {
                console.log('Abriendo MailComposer...');
                await MailComposer.composeAsync({
                  subject: `Informe Clínico CMAPA - ${pacienteSeleccionado.nombre || pacienteSeleccionado.correo || pacienteSeleccionado.email}`,
                  body: `Hola,\n\nAdjunto el historial clínico de seguimiento mensual generado por la plataforma Etna para el paciente ${pacienteSeleccionado.nombre || pacienteSeleccionado.correo || pacienteSeleccionado.email}.\n\nEste documento tiene validez para el control del CMAPA.\n\nUn saludo cordial,\nEquipo Médico Etna.`,
                  attachments: [pdfOficialUri],
                });
              } else {
                console.log('No hay correo. Usando Sharing genérico como Plan B...');
                await Sharing.shareAsync(pdfOficialUri, { UTI: 'com.adobe.pdf', mimeType: 'application/pdf' });
              }
              
            } catch (error) {
              Alert.alert('Error', 'No se pudo abrir la aplicación de correo.');
              console.error('Error en MailComposer:', error);
            }
          }
        },
        { text: 'Cancelar', style: 'cancel' }
      ]);

    } catch (error: any) { 
      console.error('ERROR GENERAL EN EXPORTACIÓN:', error);
      Alert.alert('Error', error.message); 
    } finally { 
      setExportando(false); 
    }
  };

  // --- EL NUEVO MOTOR DE BÚSQUEDA ---
  const pacientesFiltrados = pacientes.filter(p => {
    const term = busqueda.toLowerCase();
    const correo = (p.correo || p.email || "").toLowerCase();
    const nombre = (p.nombre || "").toLowerCase();
    return correo.includes(term) || nombre.includes(term);
  });

  if (cargando) return <View style={styles.center}><ActivityIndicator size="large" color="#0288d1" /></View>;

  return (
    <View style={styles.container}>
      <View style={styles.headerContainer}>
        <View>
          <Text style={styles.header}>Etna Admin 🩺</Text>
          <Text style={styles.subHeader}>Panel Médico Integral</Text>
        </View>
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}><Ionicons name="log-out-outline" size={20} color="#fff" /></TouchableOpacity>
      </View>

      <View style={{ flex: 1 }}>
        {activeTab === 'pacientes' && (
          <View style={{ flex: 1 }}>
            <TextInput style={styles.searchInput} placeholder="🔍 Buscar por nombre o correo..." value={busqueda} onChangeText={setBusqueda} autoCapitalize="none" />
            <FlatList data={pacientesFiltrados} keyExtractor={(item) => item.id} contentContainerStyle={styles.lista} renderItem={({ item }) => (
                <TouchableOpacity style={styles.pacienteCard} onPress={() => { setPacienteSeleccionado(item); setModalVisible(true); }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <View style={[styles.semaforo, { backgroundColor: item.nivelRiesgo === 'rojo' ? '#d32f2f' : item.nivelRiesgo === 'amarillo' ? '#fbc02d' :  '#388e3c' }]} />
                    <View>
                      {/* --- AQUÍ SE MUESTRA EL NOMBRE Y DEBAJO EL CORREO --- */}
                      <Text style={styles.pacienteNombre}>{item.nombre || 'Sin nombre registrado'}</Text>
                      <Text style={styles.pacienteEmail}>{item.correo || item.email}</Text>
                      <Text style={styles.pacienteInfo}>{item.diasSinFumar} días libre • {item.tipo_consumo}</Text>
                    </View>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color="#bcccdc" />
                </TouchableOpacity>
              )} 
            />
          </View>
        )}
        
        {activeTab === 'stats' && <AdminStatsDashboard pacientes={pacientes} />}
        
        {activeTab === 'comunidad' && (
          <View style={styles.centerContent}>
            <Ionicons name="shield-checkmark" size={60} color="#0288d1" />
            <Text style={styles.modTitle}>Moderación de Comunidad</Text>
            <TouchableOpacity style={styles.bigModBtn} onPress={() => navigation.navigate('AdminChat')}><Text style={styles.bigModBtnText}>💬 Abrir Panel</Text></TouchableOpacity>
          </View>
        )}
      </View>

      <View style={styles.tabBar}>
        <TouchableOpacity style={[styles.tabItem, activeTab === 'pacientes' && styles.tabItemActive]} onPress={() => setActiveTab('pacientes')}><Ionicons name="people" size={24} color={activeTab === 'pacientes' ? '#0288d1' : '#829ab1'} /><Text style={styles.tabText}>Pacientes</Text></TouchableOpacity>
        <TouchableOpacity style={[styles.tabItem, activeTab === 'stats' && styles.tabItemActive]} onPress={() => setActiveTab('stats')}><Ionicons name="bar-chart" size={24} color={activeTab === 'stats' ? '#0288d1' : '#829ab1'} /><Text style={styles.tabText}>Métricas</Text></TouchableOpacity>
        <TouchableOpacity style={[styles.tabItem, activeTab === 'comunidad' && styles.tabItemActive]} onPress={() => setActiveTab('comunidad')}><Ionicons name="chatbubbles" size={24} color={activeTab === 'comunidad' ? '#0288d1' : '#829ab1'} /><Text style={styles.tabText}>Comunidad</Text></TouchableOpacity>
      </View>

      {/* MODAL FICHA DEL PACIENTE CORREGIDO */}
      <Modal animationType="slide" transparent={true} visible={modalVisible} onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalView}>
            {pacienteSeleccionado && (
              <View>
                <Text style={styles.modalTitle}>Ficha del Paciente</Text>
                
                <View style={styles.datosContainer}>
                  {/* AÑADIDO: Muestra del nombre en el modal */}
                  <Text style={styles.modalDato}>👤 <Text style={styles.modalValor}>{pacienteSeleccionado.nombre || 'Sin nombre registrado'}</Text></Text>
                  <Text style={styles.modalDato}>📧 <Text style={styles.modalValor}>{pacienteSeleccionado.correo || pacienteSeleccionado.email}</Text></Text>
                  <Text style={styles.modalDato}>🚭 Dispositivo: <Text style={styles.modalValor}>{pacienteSeleccionado.tipo_consumo}</Text></Text>
                  
                  <Text style={styles.modalDato}>🚦 Estado: 
                    <Text style={[styles.modalValor, { 
                      color: pacienteSeleccionado.nivelRiesgo === 'rojo' 
                        ? '#d32f2f' 
                        : pacienteSeleccionado.nivelRiesgo === 'amarillo' 
                          ? '#fbc02d' 
                          : '#388e3c' 
                    }]}>
                      {" "}{pacienteSeleccionado.nivelRiesgo.toUpperCase()}
                    </Text>
                  </Text>
                </View>

                <View style={styles.modalActions}>
                  <TouchableOpacity style={styles.docsBtn} onPress={() => { setModalVisible(false); navigation.navigate('PatientDocuments', { paciente: pacienteSeleccionado }); }}>
                    <Ionicons name="folder-open" size={20} color="#fff" />
                    <Text style={styles.docsBtnText}> Documentos y Tareas</Text>
                  </TouchableOpacity>

                  <TouchableOpacity style={[styles.exportBtn, exportando && { backgroundColor: '#829ab1' }]} onPress={exportarDatosClinicos} disabled={exportando}>
                    <Text style={styles.exportText}>{exportando ? 'Generando...' : '📄 Generar Informe PDF'}</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity style={styles.closeBtn} onPress={() => setModalVisible(false)}>
                    <Text style={styles.closeText}>Cerrar</Text>
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
  semaforo: { width: 14, height: 14, borderRadius: 7, marginRight: 15 },
  
  // NUEVO: Estilo para el nombre en la tarjeta
  pacienteNombre: { fontSize: 16, fontWeight: 'bold', color: '#102a43', marginBottom: 2 },
  pacienteEmail: { fontSize: 13, color: '#486581' }, 
  
  pacienteInfo: { fontSize: 12, color: '#829ab1', marginTop: 4 },
  tabBar: { flexDirection: 'row', height: 75, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#d9e2ec', paddingBottom: 15 },
  tabItem: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  tabItemActive: { borderTopWidth: 3, borderTopColor: '#0288d1' },
  tabText: { fontSize: 11, color: '#829ab1', marginTop: 4, fontWeight: 'bold' },
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