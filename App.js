import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, SafeAreaView, StyleSheet, ActivityIndicator,
  TouchableOpacity, Linking, Modal, TextInput, FlatList, Dimensions
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Location from 'expo-location';
import {
  Droplets, Sun, Wind, Cloud, CloudRain,
  CloudLightning, Search, X, Navigation, MapPin
} from 'lucide-react-native';

// Bileşenlerin yollarını kontrol edin
import { TempGraph } from './components/TempGraph';
import { ShimmerText } from "./components/ShimmerText";

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Hava Durumu İkon Eşleyici
const WeatherIcon = ({ condition, size = 22, color = "white" }) => {
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

const StatCard = ({ icon, value, label }) => (
    <View style={styles.statCard}>
      <View style={styles.iconCircle}>{icon}</View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
);

export default function App() {
  const [weather, setWeather] = useState(null);
  const [cityName, setCityName] = useState("LOADING...");
  const [isLoading, setIsLoading] = useState(false);
  const [isSearchVisible, setSearchVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [attributionUrl, setAttributionUrl] = useState('https://developer.apple.com/weatherkit/data-source-attribution/');

  // Merkezi Veri Çekme Fonksiyonu
  const updateWeather = async (lat, lon, customName = null) => {
    setIsLoading(true);
    setSearchVisible(false); // Listeden seçim yapınca modalı kapat
    try {
      if (!customName) {
        let geocode = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lon });
        if (geocode.length > 0) {
          setCityName(geocode[0].city?.toUpperCase() || geocode[0].region?.toUpperCase());
        }
      } else {
        setCityName(customName.toUpperCase());
      }

      const response = await fetch(`https://serverless-weather.vercel.app/api/weather?lat=${lat}&lon=${lon}`);
      const json = await response.json();
      setWeather(formatWeatherData(json));
    } catch (e) {
      alert("Hava durumu verisi alınamadı.");
    } finally {
      setIsLoading(false);
    }
  };

  // Yazarken Şehir Önerilerini Getirme
  const fetchSuggestions = async (text) => {
    setSearchQuery(text);
    if (text.length > 2) {
      try {
        const response = await fetch(`https://photon.komoot.io/api/?q=${text}&limit=10`);

        const data = await response.json();
        setSuggestions(data.features);
      } catch (e) {
        console.error("Öneri alınamadı:", e);
      }
    } else {
      setSuggestions([]);
    }
  };

  const handleMyLocation = async () => {
    setIsLoading(true);
    let location = await Location.getCurrentPositionAsync({});
    updateWeather(location.coords.latitude, location.coords.longitude);
  };

  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      handleMyLocation();
    })();
  }, []);


  const formatWeatherData = (data) => {
    const current = data.currentWeather;
    if (current.metadata?.attributionURL) setAttributionUrl(current.metadata.attributionURL);

    return {
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
      <View style={styles.center}><ActivityIndicator size="large" color="#3478F6" /></View>
  );

  return (
      <LinearGradient colors={['#0B1026', '#1B2144']} style={styles.container}>
        <SafeAreaView style={{ flex: 1 }}>

          {/* Header Butonları */}
          <View style={styles.topActions}>
            <TouchableOpacity onPress={handleMyLocation} style={styles.actionCircle}>
              <Navigation color="white" size={20} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setSearchVisible(true)} style={styles.actionCircle}>
              <Search color="white" size={20} />
            </TouchableOpacity>
          </View>

          {/* Akıllı Arama Modalı */}
          <Modal visible={isSearchVisible} animationType="slide" transparent={true}>
            <View style={styles.modalOverlay}>
              <LinearGradient colors={['rgba(27,33,68,0.98)', '#0B1026']} style={styles.searchSheet}>
                <View style={styles.searchBarWrapper}>
                  <Search color="rgba(255,255,255,0.4)" size={20} />
                  <TextInput
                      placeholder="Hangi şehre bakmak istersin?"
                      placeholderTextColor="rgba(255,255,255,0.4)"
                      style={styles.searchInput}
                      autoFocus={true}
                      value={searchQuery}
                      onChangeText={fetchSuggestions}
                  />
                  <TouchableOpacity onPress={() => setSearchVisible(false)}>
                    <X color="white" size={20} />
                  </TouchableOpacity>
                </View>

                {/* Öneriler Listesi */}
                <FlatList
                    data={suggestions}
                    keyExtractor={(item, index) => index.toString()}
                    renderItem={({ item }) => (
                        <TouchableOpacity
                            style={styles.suggestionItem}
                            onPress={() => updateWeather(item.geometry.coordinates[1], item.geometry.coordinates[0], item.properties.name)}
                        >
                          <MapPin color="rgba(255,255,255,0.4)" size={18} />
                          <View style={{marginLeft: 15}}>
                            <Text style={styles.suggestionName}>{item.properties.name}</Text>
                            <Text style={styles.suggestionCountry}>{item.properties.country}</Text>
                          </View>
                        </TouchableOpacity>
                    )}
                    contentContainerStyle={{marginTop: 20}}
                />
              </LinearGradient>
            </View>
          </Modal>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 20 }}>
            <View style={styles.header}>
              <Text style={styles.cityText}>{cityName}</Text>
              <Text style={styles.updateText}>SON GÜNCELLEME {weather.lastUpdated}</Text>
            </View>

            <ShimmerText text={`${weather.temp}°`} style={styles.mainTemp} />
            <Text style={styles.mainCondition}>{weather.condition}</Text>

            <View style={styles.bentoLarge}>
              <Text style={styles.cardTitle}>24 SAATLİK TAHMİN</Text>
              <TempGraph hourlyData={weather.hourly} />
            </View>

            <View style={styles.statsRow}>
              <StatCard icon={<Droplets color="#5AC8FA" size={20} />} value={`%${weather.humidity}`} label="NEM" />
              <StatCard icon={<Sun color="#FFCC00" size={20} />} value={weather.uvIndex} label="UV İNDEKSİ" />
              <StatCard icon={<Wind color="#AF52DE" size={20} />} value={`${weather.windSpeed} km/h`} label="RÜZGAR" />
            </View>

            <View style={styles.forecastSection}>
              <Text style={styles.sectionHeader}>ÖNÜMÜZDEKİ 7 GÜN</Text>
              {weather.daily.map((day, i) => (
                  <View key={i} style={styles.forecastRow}>
                    <Text style={styles.dayText}>{day.day}</Text>
                    <View style={styles.iconBox}><WeatherIcon condition={day.condition} /></View>
                    <Text style={styles.lowText}>{day.low}°</Text>
                    <View style={styles.rangeBarContainer}>
                      <View style={[styles.rangeBarFill, { marginLeft: `${Math.max(0, Math.min(60, day.rangeProgress))}%` }]} />
                    </View>
                    <Text style={styles.highText}>{day.high}°</Text>
                  </View>
              ))}
            </View>
          </ScrollView>
        </SafeAreaView>
      </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, backgroundColor: '#0B1026', justifyContent: 'center', alignItems: 'center' },
  topActions: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 10 },
  actionCircle: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.08)', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  header: { alignItems: 'center', marginTop: 10 },
  cityText: { color: 'white', fontSize: 24, fontWeight: '300', letterSpacing: 4 },
  updateText: { color: 'rgba(255,255,255,0.3)', fontSize: 10, fontWeight: '700', marginTop: 5 },
  mainTemp: { color: 'white', fontSize: 110, fontWeight: 'bold' },
  mainCondition: { color: 'white', opacity: 0.6, fontSize: 18, textAlign: 'center', marginTop: -10 },
  bentoLarge: { backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 24, padding: 20, marginTop: 30 },
  cardTitle: { color: 'rgba(255,255,255,0.3)', fontSize: 10, fontWeight: '800' },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 15 },
  statCard: { width: '31%', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 22, padding: 15 },
  statValue: { color: 'white', fontSize: 18, fontWeight: 'bold', marginTop: 10 },
  statLabel: { color: 'rgba(255,255,255,0.3)', fontSize: 8, fontWeight: '900' },
  forecastSection: { marginTop: 30, paddingBottom: 50 },
  sectionHeader: { color: 'rgba(255,255,255,0.3)', fontSize: 11, fontWeight: '800', marginBottom: 15 },
  forecastRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.03)', padding: 15, borderRadius: 20, marginBottom: 8 },
  dayText: { color: 'white', width: 45, fontWeight: '600' },
  iconBox: { width: 40, alignItems: 'center' },
  lowText: { color: 'rgba(255,255,255,0.4)', width: 30, textAlign: 'right' },
  highText: { color: 'white', width: 30 },
  rangeBarContainer: { flex: 1, height: 4, backgroundColor: 'rgba(255,255,255,0.1)', marginHorizontal: 15, borderRadius: 10 },
  rangeBarFill: { width: '40%', height: '100%', backgroundColor: '#3478F6', borderRadius: 10 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)' },
  searchSheet: { flex: 1, padding: 20, paddingTop: 60 },
  searchBarWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 20, paddingHorizontal: 15, height: 60, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  searchInput: { flex: 1, color: 'white', marginLeft: 10, fontSize: 16 },
  suggestionItem: { flexDirection: 'row', alignItems: 'center', padding: 18, backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 15, marginBottom: 10 },
  suggestionName: { color: 'white', fontSize: 16, fontWeight: '600' },
  suggestionCountry: { color: 'rgba(255,255,255,0.4)', fontSize: 12, marginTop: 2 }
});