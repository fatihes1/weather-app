import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, SafeAreaView, StyleSheet, ActivityIndicator,
  TouchableOpacity, Linking, Modal, TextInput, FlatList, Dimensions, StatusBar, RefreshControl
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Location from 'expo-location';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  Droplets, Sun, Wind, Cloud, CloudRain,
  CloudLightning, Search, X, Navigation, MapPin
} from 'lucide-react-native';

// Bileşen yollarının doğruluğundan emin olun
import { TempGraph } from './components/TempGraph';
import { ShimmerText } from "./components/ShimmerText";

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Dinamik İkon Bileşeni
const WeatherIcon = ({ condition, size = 22, color }) => {
  switch (condition) {
    case 'Cloudy':
    case 'MostlyCloudy':
    case 'PartlyCloudy': return <Cloud color={color} size={size} />;
    case 'Rain':
    case 'Drizzle': return <CloudRain color={color} size={size} />;
    case 'Clear':
    case 'MostlyClear': return <Sun color={color} size={size} />;
    case 'Thunderstorm': return <CloudLightning color={color} size={size} />;
    default: return <Cloud color={color} size={size} />;
  }
};

// Dinamik StatCard Bileşeni
const StatCard = ({ icon, value, label, theme }) => (
    <View style={[styles.statCard, { backgroundColor: theme.cardBg }]}>
      <View style={styles.iconCircle}>{icon}</View>
      <Text style={[styles.statValue, { color: theme.text }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: theme.subText }]}>{label}</Text>
    </View>
);

export default function App() {
  const [weather, setWeather] = useState(null);
  const [cityName, setCityName] = useState("LOADING...");
  const [isLoading, setIsLoading] = useState(false);
  const [isSearchVisible, setSearchVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [recentSearches, setRecentSearches] = useState([]);
  const [attributionUrl, setAttributionUrl] = useState('https://developer.apple.com/weatherkit/data-source-attribution/');

  // --- TEMA TANIMLAMALARI ---
  const isDay = weather?.isDay;
  const theme = {
    bg: isDay ? ['#FFF9E1', '#FFE0A1'] : ['#0B1026', '#1B2144'],
    text: isDay ? '#4A2E19' : '#FFFFFF',
    subText: isDay ? 'rgba(74, 46, 25, 0.5)' : 'rgba(255, 255, 255, 0.4)',
    cardBg: isDay ? 'rgba(255, 255, 255, 0.6)' : 'rgba(255, 255, 255, 0.05)',
    accent: isDay ? '#FF8C00' : '#3478F6',
    shimmer: isDay ? ['#4A2E19', '#DAA520', '#FEF9E7', '#DAA520', '#4A2E19']
        : ['#749BFF', '#749BFF', '#FFFFFF', '#749BFF', '#749BFF'],
    barStyle: isDay ? 'dark-content' : 'light-content'
  };

  // Geçmiş aramaları yükle
  const loadRecentSearches = async () => {
    try {
      const saved = await AsyncStorage.getItem('@recent_searches');
      if (saved) setRecentSearches(JSON.parse(saved));
    } catch (e) { console.error(e); }
  };

  // Yeni aramayı kaydet
  const saveRecentSearch = async (cityObj) => {
    try {
      const filtered = recentSearches.filter(s => s.name !== cityObj.name);
      const updated = [cityObj, ...filtered].slice(0, 5);
      setRecentSearches(updated);
      await AsyncStorage.setItem('@recent_searches', JSON.stringify(updated));
    } catch (e) { console.error(e); }
  };

  const updateWeather = async (lat, lon, customName = null) => {
    if (!lat || !lon) return;
    setIsLoading(true);
    setSearchVisible(false);

    try {
      // 1. ŞEHİR İSMİ BELİRLEME (Non-blocking / Hata toleranslı)
      if (customName) {
        setCityName(customName.toUpperCase());
        saveRecentSearch({ name: customName, lat, lon });
      } else {
        try {
          let geocode = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lon });
          if (geocode && geocode.length > 0) {
            // City yoksa district, o da yoksa region kullanıyoruz
            const name = geocode[0].city || geocode[0].subregion || geocode[0].region || "MY LOCATION";
            setCityName(name.toUpperCase());
          } else {
            setCityName("MY LOCATION");
          }
        } catch (geocodeError) {
          console.log("Geocoding failed, using coordinates", geocodeError);
          setCityName("MY LOCATION"); // İsim bulunamazsa bile uygulama takılmasın
        }
      }

      // 2. HAVA DURUMU VERİSİNİ ÇEKME
      const apiUrl = process.env.EXPO_PUBLIC_WEATHER_API_URL;
      const response = await fetch(`${apiUrl}?lat=${lat}&lon=${lon}`);
      const json = await response.json();

      setWeather(formatWeatherData(json));
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    } catch (e) {
      console.error("Main update error", e);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      alert("Weather update failed.");
    } finally {
      setIsLoading(false); // Her durumda loading'i kapat
    }
  };

  const fetchSuggestions = async (text) => {
    setSearchQuery(text);
    if (text.length > 2) {
      try {
        const response = await fetch(`https://photon.komoot.io/api/?q=${text}&limit=10`);
        const data = await response.json();
        setSuggestions(data.features);
      } catch (e) {
        console.error("Suggestions could not be fetched:", e);
      }
    } else {
      setSuggestions([]);
    }
  };

  const handleMyLocation = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsLoading(true);
    let location = await Location.getCurrentPositionAsync({});
    updateWeather(location.coords.latitude, location.coords.longitude);
  };

  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      await loadRecentSearches();
      handleMyLocation();
    })();
  }, []);

  const formatWeatherData = (data) => {
    const current = data.currentWeather;
    if (current.metadata?.attributionURL) setAttributionUrl(current.metadata.attributionURL);

    return {
      isDay: current.daylight,
      temp: Math.round(current.temperature),
      condition: current.conditionCode,
      humidity: Math.round(current.humidity * 100),
      uvIndex: current.uvIndex,
      windSpeed: Math.round(current.windSpeed),
      lastUpdated: new Date(current.asOf).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      hourly: data.forecastHourly.hours.slice(0, 24).map(h => ({
        temp: Math.round(h.temperature),
        displayTime: new Date(h.forecastStart).toLocaleTimeString([], { hour: 'numeric', hour12: true }).toLowerCase().replace(' ', '')
      })),
      daily: data.forecastDaily.days.slice(0, 7).map(d => ({
        day: new Date(d.forecastStart).toLocaleDateString('en-US', { weekday: 'short' }),
        high: Math.round(d.temperatureMax),
        low: Math.round(d.temperatureMin),
        condition: d.conditionCode,
        rangeProgress: ((Math.round(current.temperature) - Math.round(d.temperatureMin)) /
            (Math.round(d.temperatureMax) - Math.round(d.temperatureMin))) * 100
      }))
    };
  };

  if (!weather || isLoading) return (
      <View style={[styles.center, { backgroundColor: '#0B1026' }]}>
        <ActivityIndicator size="large" color="#3478F6" />
      </View>
  );

  return (
      <LinearGradient colors={theme.bg} style={styles.container}>
        <StatusBar barStyle={theme.barStyle} />
        <SafeAreaView style={{ flex: 1 }}>

          <View style={styles.topActions}>
            <TouchableOpacity onPress={handleMyLocation} style={[styles.actionCircle, { backgroundColor: theme.cardBg }]}>
              <Navigation color={theme.text} size={20} />
            </TouchableOpacity>
            <TouchableOpacity onPress={async () => {
              await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setSearchVisible(true)
            }} style={[styles.actionCircle, { backgroundColor: theme.cardBg }]}>
              <Search color={theme.text} size={20} />
            </TouchableOpacity>
          </View>

          <Modal visible={isSearchVisible} animationType="slide" transparent={true}>
            <View style={styles.modalOverlay}>
              <LinearGradient colors={theme.bg} style={styles.searchSheet}>
                <View style={[styles.searchBarWrapper, { backgroundColor: theme.cardBg }]}>
                  <Search color={theme.subText} size={20} />
                  <TextInput
                      placeholder="Search for a city..."
                      placeholderTextColor={theme.subText}
                      style={[styles.searchInput, { color: theme.text }]}
                      autoFocus={true}
                      value={searchQuery}
                      onChangeText={fetchSuggestions}
                  />
                  <TouchableOpacity onPress={() => {setSearchVisible(false); setSearchQuery('');}}>
                    <X color={theme.text} size={20} />
                  </TouchableOpacity>
                </View>

                <Text style={[styles.sectionHeader, { color: theme.subText, marginTop: 25, marginBottom: 10 }]}>
                  {searchQuery.length > 2 ? 'RESULTS' : 'RECENT SEARCHES'}
                </Text>

                <FlatList
                    data={searchQuery.length > 2 ? suggestions : recentSearches}
                    keyExtractor={(item, index) => index.toString()}
                    renderItem={({ item }) => (
                        <TouchableOpacity
                            style={[styles.suggestionItem, { backgroundColor: theme.cardBg }]}
                            onPress={() => {
                              const lat = item.geometry ? item.geometry.coordinates[1] : item.lat;
                              const lon = item.geometry ? item.geometry.coordinates[0] : item.lon;
                              const name = item.properties ? item.properties.name : item.name;
                              updateWeather(lat, lon, name);
                            }}
                        >
                          <MapPin color={theme.subText} size={18} />
                          <View style={{marginLeft: 15}}>
                            <Text style={[styles.suggestionName, { color: theme.text }]}>
                              {item.properties ? item.properties.name : item.name}
                            </Text>
                            {item.properties?.country && (
                                <Text style={[styles.suggestionCountry, { color: theme.subText }]}>{item.properties.country}</Text>
                            )}
                          </View>
                        </TouchableOpacity>
                    )}
                />
              </LinearGradient>
            </View>
          </Modal>

          <ScrollView refreshControl={
            <RefreshControl
                refreshing={isLoading}
                onRefresh={handleMyLocation}
                tintColor={theme.accent}
            />
          } showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 20 }}>
            <View style={styles.header}>
              <Text style={[styles.cityText, { color: theme.text }]}>{cityName}</Text>
              <Text style={[styles.updateText, { color: theme.subText }]}>LAST UPDATED {weather.lastUpdated}</Text>
            </View>

            <ShimmerText text={`${weather.temp}°`} style={styles.mainTemp} shimmerColors={theme.shimmer} />
            <Text style={[styles.mainCondition, { color: theme.text }]}>{weather.condition}</Text>

            <View style={[styles.bentoLarge, { backgroundColor: theme.cardBg }]}>
              <Text style={[styles.cardTitle, { color: theme.subText }]}>24-HOUR FORECAST</Text>
              <TempGraph hourlyData={weather.hourly} accentColor={theme.accent} theme={theme} />
            </View>

            <View style={styles.statsRow}>
              <StatCard theme={theme} icon={<Droplets color={theme.accent} size={20} />} value={`%${weather.humidity}`} label="HUMIDITY" />
              <StatCard theme={theme} icon={<Sun color={theme.accent} size={20} />} value={weather.uvIndex} label="UV INDEX" />
              <StatCard theme={theme} icon={<Wind color={theme.accent} size={20} />} value={`${weather.windSpeed} km/h`} label="WIND" />
            </View>

            <View style={styles.forecastSection}>
              <Text style={[styles.sectionHeader, { color: theme.subText }]}>NEXT 7 DAYS</Text>
              {weather.daily.map((day, i) => (
                  <View key={i} style={[styles.forecastRow, { backgroundColor: theme.cardBg }]}>
                    <Text style={[styles.dayText, { color: theme.text }]}>{day.day}</Text>
                    <View style={styles.iconBox}><WeatherIcon condition={day.condition} color={theme.text} /></View>
                    <Text style={[styles.lowText, { color: theme.subText }]}>{day.low}°</Text>
                    <View style={styles.rangeBarContainer}>
                      <View style={[styles.rangeBarFill, { backgroundColor: theme.accent, marginLeft: `${Math.max(0, Math.min(60, day.rangeProgress))}%` }]} />
                    </View>
                    <Text style={[styles.highText, { color: theme.text }]}>{day.high}°</Text>
                  </View>
              ))}
            </View>

            <TouchableOpacity onPress={() => Linking.openURL(attributionUrl)}>
              <Text style={[styles.legalText, { color: theme.subText }]}>Data from Apple Weather</Text>
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  topActions: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 10 },
  actionCircle: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  header: { alignItems: 'center', marginTop: 10 },
  cityText: { fontSize: 24, fontWeight: '300', letterSpacing: 4 },
  updateText: { fontSize: 10, fontWeight: '700', marginTop: 5 },
  mainTemp: { fontSize: 110, fontWeight: 'bold' },
  mainCondition: { opacity: 0.6, fontSize: 18, textAlign: 'center', marginTop: -10 },
  bentoLarge: { borderRadius: 24, padding: 20, marginTop: 30 },
  cardTitle: { fontSize: 10, fontWeight: '800' },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 15 },
  statCard: { width: '31%', borderRadius: 22, padding: 15 },
  statValue: { fontSize: 18, fontWeight: 'bold', marginTop: 10 },
  statLabel: { fontSize: 8, fontWeight: '900' },
  forecastSection: { marginTop: 30, paddingBottom: 0 },
  sectionHeader: { fontSize: 11, fontWeight: '800', marginBottom: 15 },
  forecastRow: { flexDirection: 'row', alignItems: 'center', padding: 15, borderRadius: 20, marginBottom: 8 },
  dayText: { width: 45, fontWeight: '600' },
  iconBox: { width: 40, alignItems: 'center' },
  lowText: { width: 30, textAlign: 'right' },
  highText: { width: 30 },
  rangeBarContainer: { flex: 1, height: 4, backgroundColor: 'rgba(0,0,0,0.05)', marginHorizontal: 15, borderRadius: 10 },
  rangeBarFill: { width: '40%', height: '100%', borderRadius: 10 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  searchSheet: { flex: 1, padding: 20, paddingTop: 60 },
  searchBarWrapper: { flexDirection: 'row', alignItems: 'center', borderRadius: 20, paddingHorizontal: 15, height: 60, borderWidth: 1, borderColor: 'rgba(0,0,0,0.05)' },
  searchInput: { flex: 1, marginLeft: 10, fontSize: 16 },
  suggestionItem: { flexDirection: 'row', alignItems: 'center', padding: 18, borderRadius: 15, marginBottom: 10 },
  suggestionName: { fontSize: 16, fontWeight: '600' },
  suggestionCountry: { fontSize: 12, marginTop: 2 },
  legalText: { textAlign: 'center', marginTop: 20, fontSize: 10, textDecorationLine: 'underline' }
});