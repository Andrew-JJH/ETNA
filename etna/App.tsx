import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';

import WellnessScreen from './src/screens/WellnessScreen';
import AdminScreen from './src/screens/AdminScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import AuthScreen from './src/screens/AuthScreen';
import OnboardingScreen from './src/screens/OnboardingScreen';
import DashboardScreen from './src/screens/DashboardScreen';
import SosScreen from './src/screens/SosScreen';
import CommunityScreen from './src/screens/CommunityScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: any = 'help-circle';
          if (route.name === 'Inicio') iconName = focused ? 'home' : 'home-outline';
          else if (route.name === 'Bienestar') iconName = focused ? 'leaf' : 'leaf-outline';
          else if (route.name === 'Comunidad') iconName = focused ? 'chatbubbles' : 'chatbubbles-outline';
          else if (route.name === 'SOS') iconName = focused ? 'medical' : 'medical-outline';
          else if (route.name === 'Perfil') iconName = focused ? 'person' : 'person-outline';
          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#f57c00',
        tabBarInactiveTintColor: 'gray',
        headerShown: false,
        tabBarStyle: { backgroundColor: '#fff', borderTopWidth: 0, elevation: 10 }
      })}
    >
      <Tab.Screen name="Inicio" component={DashboardScreen} />
      <Tab.Screen name="Bienestar" component={WellnessScreen} /> 
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
        <Stack.Screen name="Dashboard" component={MainTabs} options={{ headerShown: false }} />
        <Stack.Screen name="Admin" component={AdminScreen} options={{ headerShown: false }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}