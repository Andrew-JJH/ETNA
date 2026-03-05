import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, ActivityIndicator, TextInput, Modal, Image, ScrollView, Dimensions } from 'react-native';
import { collection, getDocs, query, where, addDoc } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { auth, db } from '../config/firebase';

import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

import * as FileSystem from 'expo-file-system';
const { width, height } = Dimensions.get('window');

export default function AdminScreen({ navigation }: any) {
  const [pacientes, setPacientes] = useState<any[]>([]);
  const [cargando, setCargando] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [pacienteSeleccionado, setPacienteSeleccionado] = useState<any>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [exportando, setExportando] = useState(false);
  const [nuevaTarea, setNuevaTarea] = useState('');
  const [tareasPaciente, setTareasPaciente] = useState<any[]>([]);

  // Estado para ver la foto en grande
  const [fotoAmpliada, setFotoAmpliada] = useState<string | null>(null);

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

  const abrirFichaPaciente = async (paciente: any) => {
    setPacienteSeleccionado(paciente);
    setModalVisible(true);
    setTareasPaciente([]); 

    try {
      const qTareas = query(collection(db, 'tareas'), where('userId', '==', paciente.id));
      const snapshot = await getDocs(qTareas);
      const tareas = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setTareasPaciente(tareas);
    } catch (error) {
      console.error("Error cargando documentos", error);
    }
  };

  const asignarTarea = async () => {
    if (!nuevaTarea.trim() || !pacienteSeleccionado) return;
    try {
      const nueva = {
        userId: pacienteSeleccionado.id,
        texto: nuevaTarea.trim(),
        completada: false,
        fecha_creacion: new Date().toISOString()
      };
      await addDoc(collection(db, 'tareas'), nueva);
      
      setTareasPaciente([...tareasPaciente, nueva]);
      Alert.alert('¡Petición enviada! ✅', 'El paciente verá la petición de documento en su app.');
      setNuevaTarea('');
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  };

  // --- NUEVA VERSIÓN: DESCARGAR IMAGEN DESDE URL ---
  const guardarFotoPaciente = async () => {
    if (!fotoAmpliada) return;
    try {
      // @ts-ignore: Obligamos a TypeScript a ignorar su falso error
      const dir = FileSystem.documentDirectory;
      const filepath = dir + 'documento_paciente.jpg';
      
      // @ts-ignore: Silenciamos también la descarga
      const { uri } = await FileSystem.downloadAsync(fotoAmpliada, filepath);
      
      await Sharing.shareAsync(uri, { mimeType: 'image/jpeg', dialogTitle: 'Guardar Documento del Paciente' });
    } catch (error: any) {
      Alert.alert('Error', 'No se pudo descargar la imagen.');
      console.error(error);
    }
  };

  // --- MOTOR DE EXPORTACIÓN (PDF RESTAURADO AL COMPLETO) ---
  const exportarDatosClinicos = async () => {
    if (!pacienteSeleccionado) return;
    setExportando(true);

    try {

      const qDiarios = query(collection(db, 'registros_diarios'), where('userId', '==', pacienteSeleccionado.id));
      const snapshotDiarios = await getDocs(qDiarios);
      const registros = snapshotDiarios.docs.map(d => d.data());
      
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
           
           rowHTML += `<td style="${esFuturo}">
                         <div class="dia-numero">${textoDia}</div>
                         <div class="dia-contenido">${contenido}</div>
                       </td>`;
           
           if (d === 2) {
              rowHTML += coCell;
           }
           
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
      if (detallesHTML === "") detallesHTML = "<p>No hay registros detallados.</p>";

      const esVaper = pacienteSeleccionado.tipo_consumo === 'vapeador';

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
              <p class="subtitle">Paciente: ${pacienteSeleccionado.email}</p>
            </div>
            <div class="info-box">
              <div><strong>Perfil:</strong> ${esVaper ? 'Vapeador' : 'Tabaco tradicional'}</div>
              <div><strong>Última CO:</strong> ${ultimoCO}</div>
              <div><strong>Fecha Emisión:</strong> ${new Date().toLocaleDateString()}</div>
            </div>
            ${calendarioHTML}
            <h2>Anotaciones del Diario (Por Fechas)</h2>
            ${detallesHTML}
            <div class="footer">
              Generado automáticamente por Etna App para profesionales de la salud. Documento confidencial.
            </div>
          </body>
        </html>
      `;

      const { uri } = await Print.printToFileAsync({ html: htmlContent });
      await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });

    } catch (error: any) {
      Alert.alert('Error al generar PDF', error.message);
    } finally {
      setExportando(false);
    }
  };

  const pacientesFiltrados = pacientes.filter(p => p.email?.toLowerCase().includes(busqueda.toLowerCase()));

  const renderPaciente = ({ item }: { item: any }) => (
    <TouchableOpacity style={styles.pacienteCard} onPress={() => abrirFichaPaciente(item)}>
      <View>
        <Text style={styles.pacienteEmail}>{item.email}</Text>
        <Text style={styles.pacienteInfo}>Consumo previo: {item.consumo_diario_medio} {item.tipo_consumo === 'vapeador' ? 'caladas/día' : 'cig/día'}</Text>
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
      <TextInput style={styles.searchInput} placeholder="🔍 Buscar paciente..." placeholderTextColor="#829ab1" value={busqueda} onChangeText={setBusqueda} autoCapitalize="none" />
      <FlatList data={pacientesFiltrados} keyExtractor={(item) => item.id} renderItem={renderPaciente} contentContainerStyle={styles.lista} />

      {/* MODAL PRINCIPAL: FICHA DEL PACIENTE */}
      <Modal animationType="slide" transparent={true} visible={modalVisible} onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalView, { maxHeight: '95%' }]}>
            {pacienteSeleccionado && (
              <ScrollView showsVerticalScrollIndicator={false}>
                <Text style={styles.modalTitle}>Ficha del Paciente</Text>
                <View style={styles.datosContainer}>
                  <Text style={styles.modalDato}>📧 <Text style={styles.modalValor}>{pacienteSeleccionado.email}</Text></Text>
                </View>

                {/* ASIGNADOR DE FICHAS Y DOCUMENTOS */}
                <View style={styles.taskContainer}>
                  <Text style={styles.taskTitle}>📝 Pedir Ficha / Tarea</Text>
                  <TextInput style={styles.taskInput} placeholder="Ej: Subir foto de la Hoja de Balance..." value={nuevaTarea} onChangeText={setNuevaTarea} />
                  <TouchableOpacity style={styles.taskBtn} onPress={asignarTarea}>
                    <Text style={styles.taskBtnText}>Enviar Petición al Paciente</Text>
                  </TouchableOpacity>
                </View>

                {/* VISOR DE DOCUMENTOS Y FICHAS CLÍNICAS */}
                <Text style={styles.sectionTitle}>Documentos y Fichas Recibidas</Text>
                {tareasPaciente.length === 0 ? (
                  <Text style={styles.emptyText}>No has pedido documentos a este paciente.</Text>
                ) : (
                  tareasPaciente.map((t, index) => (
                    <View key={index} style={styles.evidenciaCard}>
                      <View style={{flex: 1, paddingRight: 10}}>
                        <Text style={styles.evidenciaTexto}>{t.texto}</Text>
                        <Text style={[styles.evidenciaEstado, t.completada ? {color: '#4caf50'} : {color: '#f57c00'}]}>
                          {t.completada ? '✅ Documento recibido' : '⏳ Pendiente de subir'}
                        </Text>
                      </View>
                      
                      {/* AL TOCAR LA FOTO AHORA SE ABRE EN GRANDE */}
                      {t.foto_evidencia && (
                        <TouchableOpacity onPress={() => setFotoAmpliada(t.foto_evidencia)}>
                          <Image source={{ uri: t.foto_evidencia }} style={styles.evidenciaFoto} />
                          <Text style={styles.zoomText}>🔍 Ampliar</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  ))
                )}

                <View style={styles.modalActions}>
                  <TouchableOpacity style={[styles.exportBtn, exportando && { backgroundColor: '#829ab1' }]} onPress={exportarDatosClinicos} disabled={exportando}>
                    <Text style={styles.exportText}>{exportando ? 'Generando PDF...' : '📄 Descargar PDF Clínico'}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.closeBtn} onPress={() => setModalVisible(false)}><Text style={styles.closeText}>Cerrar Ficha</Text></TouchableOpacity>
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* MODAL: VISOR DE FOTOS EN PANTALLA COMPLETA */}
      <Modal visible={!!fotoAmpliada} transparent={true} animationType="fade" onRequestClose={() => setFotoAmpliada(null)}>
        <View style={styles.fotoFullOverlay}>
          <TouchableOpacity style={styles.cerrarFotoBtn} onPress={() => setFotoAmpliada(null)}>
            <Text style={styles.cerrarFotoTexto}>✕ Cerrar</Text>
          </TouchableOpacity>
          
          {fotoAmpliada && (
            <Image source={{ uri: fotoAmpliada }} style={styles.fotoFullScreen} resizeMode="contain" />
          )}

          <TouchableOpacity style={styles.guardarFotoBtn} onPress={guardarFotoPaciente}>
            <Text style={styles.guardarFotoTexto}>💾 Guardar / Compartir Documento</Text>
          </TouchableOpacity>
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
  lista: { paddingBottom: 20 },
  pacienteCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff', padding: 15, borderRadius: 12, marginBottom: 10, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 5, elevation: 2 },
  pacienteEmail: { fontSize: 16, fontWeight: 'bold', color: '#334e68' },
  pacienteInfo: { fontSize: 14, color: '#829ab1', marginTop: 4 },
  flecha: { fontSize: 24, color: '#bcccdc' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(16, 42, 67, 0.6)', justifyContent: 'flex-end' },
  modalView: { backgroundColor: 'white', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 25, shadowColor: '#000', elevation: 5 },
  modalTitle: { fontSize: 22, fontWeight: 'bold', color: '#102a43', textAlign: 'center', marginBottom: 20 },
  datosContainer: { backgroundColor: '#f0f4f8', padding: 15, borderRadius: 12, marginBottom: 20 },
  modalDato: { fontSize: 15, color: '#486581', marginBottom: 5 },
  modalValor: { fontWeight: 'bold', color: '#102a43' },
  modalActions: { gap: 10, marginTop: 20 },
  exportBtn: { backgroundColor: '#0288d1', padding: 15, borderRadius: 12, alignItems: 'center' },
  exportText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  closeBtn: { backgroundColor: 'transparent', padding: 15, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: '#829ab1' },
  closeText: { color: '#486581', fontWeight: 'bold', fontSize: 16 },
  
  taskContainer: { backgroundColor: '#e1f5fe', padding: 15, borderRadius: 12, marginBottom: 20, borderWidth: 1, borderColor: '#b3e5fc' },
  taskTitle: { fontSize: 16, fontWeight: 'bold', color: '#0288d1', marginBottom: 10 },
  taskInput: { backgroundColor: '#fff', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#81d4fa', marginBottom: 10 },
  taskBtn: { backgroundColor: '#0288d1', padding: 12, borderRadius: 8, alignItems: 'center' },
  taskBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },

  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#102a43', marginBottom: 10, borderBottomWidth: 1, borderBottomColor: '#eee', paddingBottom: 5 },
  emptyText: { color: '#888', fontStyle: 'italic', marginBottom: 20 },
  evidenciaCard: { flexDirection: 'row', backgroundColor: '#f8fbff', padding: 12, borderRadius: 8, marginBottom: 10, borderWidth: 1, borderColor: '#d9e2ec', alignItems: 'center' },
  evidenciaTexto: { fontSize: 14, color: '#334e68', fontWeight: 'bold', marginBottom: 6 },
  evidenciaEstado: { fontSize: 12, fontWeight: 'bold' },
  evidenciaFoto: { width: 70, height: 95, borderRadius: 4, borderWidth: 1, borderColor: '#ccc', resizeMode: 'cover' },
  zoomText: { fontSize: 10, color: '#0288d1', textAlign: 'center', marginTop: 4, fontWeight: 'bold' },

  // ESTILOS PARA LA PANTALLA COMPLETA DE FOTOS
  fotoFullOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.95)', justifyContent: 'center', alignItems: 'center' },
  fotoFullScreen: { width: width, height: height * 0.7 },
  cerrarFotoBtn: { position: 'absolute', top: 50, right: 20, zIndex: 10, padding: 10, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 20 },
  cerrarFotoTexto: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  guardarFotoBtn: { position: 'absolute', bottom: 50, backgroundColor: '#0288d1', padding: 15, borderRadius: 30, width: '80%', alignItems: 'center' },
  guardarFotoTexto: { color: '#fff', fontWeight: 'bold', fontSize: 16 }
});