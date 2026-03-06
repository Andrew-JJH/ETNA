import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { Image, View } from 'react-native'; // Añadimos Image y View

import AdminChatScreen from './src/screens/AdminChatScreen';
import WellnessScreen from './src/screens/WellnessScreen';
import AdminScreen from './src/screens/AdminScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import AuthScreen from './src/screens/AuthScreen';
import OnboardingScreen from './src/screens/OnboardingScreen';
import DashboardScreen from './src/screens/DashboardScreen';
import SosScreen from './src/screens/SosScreen';
import CommunityScreen from './src/screens/CommunityScreen';
import PatientDocumentsScreen from './src/screens/PatientDocumentsScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// Pequeño componente para el logo del volcán
function LogoTitle() {
  return (
    <Image
      source={require('./assets/images/logo-full.png')}
      style={{ width: 40, height: 40, marginRight: 15 }}
      resizeMode="contain"
    />
  );
}

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: any = 'help-circle';
          if (route.name === 'Inicio') iconName = focused ? 'home' : 'home-outline';
          else if (route.name === 'Bienestar Y Tareas') iconName = focused ? 'leaf' : 'leaf-outline';
          else if (route.name === 'Comunidad') iconName = focused ? 'chatbubbles' : 'chatbubbles-outline';
          else if (route.name === 'SOS') iconName = focused ? 'medical' : 'medical-outline';
          else if (route.name === 'Perfil') iconName = focused ? 'person' : 'person-outline';
          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#f57c00',
        tabBarInactiveTintColor: 'gray',
        
        // --- CAMBIOS AQUÍ PARA EL LOGO ---
        headerShown: true, // Lo ponemos en true para que salga la barra
        headerRight: () => <LogoTitle />, // Ponemos tu logo a la derecha
        headerTitleAlign: 'left', // El nombre de la sección a la izquierda
        headerStyle: { 
          backgroundColor: '#3b5973', // El azul de tu logo
          elevation: 5, 
          shadowOpacity: 0.3 
        },
        headerTintColor: '#fff', // Texto en blanco
        // --------------------------------
        
        tabBarStyle: { backgroundColor: '#fff', borderTopWidth: 0, elevation: 10 }
      })}
    >
      <Tab.Screen name="Inicio" component={DashboardScreen} />
      <Tab.Screen name="Bienestar Y Tareas" component={WellnessScreen} /> 
      <Tab.Screen name="Comunidad" component={CommunityScreen} />
      <Tab.Screen name="SOS" component={SosScreen} />
      <Tab.Screen name="Perfil" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Auth">
        <Stack.Screen name="Auth" component={AuthScreen} options={{ headerShown: false }} />
        <Stack.Screen name="Onboarding" component={OnboardingScreen} options={{ headerShown: false }} />
        {/* Aquí cambiamos el nombre a "Etna" si quieres que sea el título general */}
        <Stack.Screen name="Dashboard" component={MainTabs} options={{ headerShown: false }} />
        <Stack.Screen name="Admin" component={AdminScreen} options={{ headerShown: false }} />
        <Stack.Screen name="AdminChat" component={AdminChatScreen} options={{ title: 'Moderación de Comunidad' }} />
        <Stack.Screen name="PatientDocuments" component={PatientDocumentsScreen} options={{ headerShown: false }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}