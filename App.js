import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Alert, Image, ScrollView, Dimensions } from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import * as Location from 'expo-location';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import SaveScreen from './screens/SaveScreen';

const haversine = (start, end) => {
  const R = 6371e3; // metres
  const φ1 = start.latitude * Math.PI/180; 
  const φ2 = end.latitude * Math.PI/180;
  const Δφ = (end.latitude - start.latitude) * Math.PI/180;
  const Δλ = (end.longitude - start.longitude) * Math.PI/180;

  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

  return R * c; // in metres
};

const Stack = createStackNavigator();

function HomeScreen({ navigation }) {
  const [location, setLocation] = useState(null);
  const [route, setRoute] = useState([]);
  const [tracking, setTracking] = useState(false);
  const [paused, setPaused] = useState(false);
  const [locationSubscription, setLocationSubscription] = useState(null);
  const [totalDistance, setTotalDistance] = useState(0);
  const [elapsedTime, setElapsedTime] = useState(0);
  
  const timerRef = useRef(null);
  const [previousLocation, setPreviousLocation] = useState(null);

  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        alert('Tilladelse nægtet', 'Tilladelse til at få adgang til placering er nødvendig.');
        return;
      }

      let currentLocation = await Location.getCurrentPositionAsync({});
      setLocation(currentLocation.coords);
    })();
  }, []);

  const startTracking = async () => {
    Alert.alert(
      "Start Rutesporing",
      "Er du sikker på, at du vil starte rutesporingen?",
      [
        {
          text: "Annuller",
          style: "cancel"
        },
        {
          text: "Start",
          onPress: async () => {
            setTracking(true);
            setPaused(false);

            // Start timeren for at spore tid
            if (!timerRef.current) {
              timerRef.current = setInterval(() => {
                setElapsedTime(prevTime => prevTime + 1);
              }, 1000);
            }

            // Start tracking af lokation og afstand
            const subscription = await Location.watchPositionAsync(
              {
                accuracy: Location.Accuracy.High,
                timeInterval: 1000,
                distanceInterval: 1,
              },
              (newLocation) => {
                setLocation(newLocation.coords);
                setRoute((prevRoute) => [...prevRoute, newLocation.coords]);

                if (previousLocation) {
                  const distance = haversine(previousLocation, newLocation.coords);
                  setTotalDistance(prevDistance => prevDistance + distance);
                }

                setPreviousLocation(newLocation.coords);
              }
            );
            setLocationSubscription(subscription);
          }
        }
      ]
    );
  };

  const stopTracking = () => {
    if (locationSubscription) {
      locationSubscription.remove();
      setLocationSubscription(null);
      setTracking(false);
      setPaused(false);

      // Stop timeren
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  };

  const pauseTracking = () => {
    if (locationSubscription) {
      locationSubscription.remove();
      setLocationSubscription(null);
      setPaused(true);

      // Stop timeren midlertidigt
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  };

  const resumeTracking = async () => {
    setPaused(false);

    // Genoptag timeren
    if (!timerRef.current) {
      timerRef.current = setInterval(() => {
        setElapsedTime(prevTime => prevTime + 1);
      }, 1000);
    }

    // Genoptag tracking af lokation og afstand
    const subscription = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.High,
        timeInterval: 1000,
        distanceInterval: 1,
      },
      (newLocation) => {
        setLocation(newLocation.coords);
        setRoute((prevRoute) => [...prevRoute, newLocation.coords]);

        if (previousLocation) {
          const distance = haversine(previousLocation, newLocation.coords);
          setTotalDistance(prevDistance => prevDistance + distance);
        }

        setPreviousLocation(newLocation.coords);
      }
    );
    setLocationSubscription(subscription);
  };

  const saveRoute = () => {
    Alert.alert('Rute gemt!', 'Din rute er blevet gemt.');
    navigation.navigate('SaveScreen');
  };

  const formatTime = (seconds) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs > 0 ? `${hrs}:` : ''}${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  return (
    <ScrollView 
      horizontal 
      pagingEnabled
      showsHorizontalScrollIndicator={false}
      style={styles.container}
    >
      <View style={styles.page}>
        <View style={styles.topBanner}>
          <Text style={styles.bannerText}>GO´TUR</Text>
        </View>

        <View style={styles.mapContainer}>
          {location && (
            <MapView
              style={styles.map}
              initialRegion={{
                latitude: location.latitude,
                longitude: location.longitude,
                latitudeDelta: 0.01,
                longitudeDelta: 0.01,
              }}
              showsUserLocation={true}
              followsUserLocation={true}
            >
              <Polyline coordinates={route} strokeColor="#FF0000" strokeWidth={3} />
              <Marker coordinate={location} title="Du er her" />
            </MapView>
          )}
          <View style={styles.mapButtonContainer}>
            {tracking && !paused ? (
              <>
                <TouchableOpacity style={styles.mapButton} onPress={pauseTracking}>
                  <Text style={styles.mapButtonText}>Pause</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.mapButton} onPress={stopTracking}>
                  <Text style={styles.mapButtonText}>Stop</Text>
                </TouchableOpacity>
              </>
            ) : tracking && paused ? (
              <TouchableOpacity style={styles.mapButton} onPress={resumeTracking}>
                <Text style={styles.mapButtonText}>Genoptag</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={styles.mapButton} onPress={startTracking}>
                <Text style={styles.mapButtonText}>Start</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={styles.mapButton} onPress={saveRoute} disabled={tracking}>
              <Text style={[styles.mapButtonText, tracking && { color: '#bbb' }]}>Gem Rute</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.infoContainer}>
          <Text style={styles.infoText}>Tid: {formatTime(elapsedTime)}</Text>
          <Text style={styles.infoText}>Afstand: {(totalDistance / 1000).toFixed(2)} km</Text>
        </View>

        <View style={styles.bottomNav}>
          <TouchableOpacity style={styles.navButton}>
            <Text style={styles.navButtonText}>Find rute</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.navButton}>
            <Text style={styles.navButtonText}>Hjem</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.navButton}>
            <Text style={styles.navButtonText}>Opret rute</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Home">
        <Stack.Screen name="Home" component={HomeScreen} options={{ headerShown: false }} />
        <Stack.Screen name="SaveScreen" component={SaveScreen} options={{ headerShown: false }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#94A89A',
  },
  page: {
    width: Dimensions.get('window').width,
    height: Dimensions.get('window').height,
  },
  topBanner: {
    backgroundColor: '#314F3E',
    paddingTop: 40,
    paddingBottom: 10,
    alignItems: 'center',
  },
  bannerText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
  },
  mapContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    margin: 30,
    borderRadius: 10,
    overflow: 'hidden',
  },
  map: {
    width: '100%',
    height: '100%',
  },
  mapButtonContainer: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  mapButton: {
    backgroundColor: '#3E5641',
    padding: 10,
    borderRadius: 5,
    marginHorizontal: 5,
  },
  mapButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  infoContainer: {
    padding: 20,
    backgroundColor: '#fff',
    borderRadius: 10,
    marginHorizontal: 30,
    marginVertical: 10,
    alignItems: 'center',
  },
  infoText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#314F3E',
  },
  bottomNav: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#314F3E',
    paddingVertical: 10,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  navButton: {
    alignItems: 'center',
  },
  navButtonText: {
    color: 'white',
    marginTop: 5,
    marginBottom: 10,
    fontSize: 12,
  },
});