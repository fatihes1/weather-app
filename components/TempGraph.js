import React, { useState } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { Svg, Path, Defs, LinearGradient, Stop, Circle, Line } from 'react-native-svg';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export const TempGraph = ({ hourlyData, accentColor, theme }) => {
    const [activePoint, setActivePoint] = useState(null);

    const containerWidth = SCREEN_WIDTH - 80; // Padding değerine uygun genişlik
    const height = 120;
    const verticalPadding = 20;

    // Ölçeklendirme için min/max hesaplama
    const temps = hourlyData.map(h => h.temp);
    const minTemp = Math.min(...temps) - 2;
    const maxTemp = Math.max(...temps) + 2;

    const getXY = (index, temp) => {
        const x = (index / (hourlyData.length - 1)) * containerWidth;
        const y = verticalPadding + (height - 2 * verticalPadding) * (1 - (temp - minTemp) / (maxTemp - minTemp));
        return { x, y };
    };

    const points = hourlyData.map((h, i) => getXY(i, h.temp));
    const pathData = `M ${points.map(p => `${p.x},${p.y}`).join(' L ')}`;

    const handleTouch = (event) => {
        const touchX = event.nativeEvent.locationX;
        const index = Math.round((touchX / containerWidth) * (hourlyData.length - 1));
        if (index >= 0 && index < hourlyData.length) {
            setActivePoint({ ...hourlyData[index], ...points[index] });
        }
    };

    // Varsayılan renk (hata önleyici)
    const activeAccent = accentColor || '#3478F6';

    return (
        <View style={styles.container}>
            {/* İnteraktif Tooltip Balonu */}
            {activePoint && (
                <View style={[
                    styles.tooltip,
                    {
                        left: activePoint.x - 25,
                        top: activePoint.y - 45,
                        backgroundColor: activeAccent // Dinamik arka plan
                    }
                ]}>
                    <Text style={styles.tooltipText}>{activePoint.temp}°</Text>
                    <Text style={[styles.tooltipTime, { color: 'rgba(255,255,255,0.8)' }]}>
                        {activePoint.displayTime}
                    </Text>
                </View>
            )}

            <View
                onStartShouldSetResponder={() => true}
                onResponderMove={handleTouch}
                onResponderRelease={() => setActivePoint(null)}
            >
                <Svg height={height} width={containerWidth} style={{ overflow: 'visible' }}>
                    <Defs>
                        <LinearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                            {/* Gradyan rengi artık dinamik */}
                            <Stop offset="0" stopColor={activeAccent} stopOpacity="0.3" />
                            <Stop offset="1" stopColor={activeAccent} stopOpacity="0" />
                        </LinearGradient>
                    </Defs>

                    {/* Alan Dolgusu */}
                    <Path
                        d={`${pathData} L ${containerWidth},${height} L 0,${height} Z`}
                        fill="url(#grad)"
                    />

                    {/* Ana Çizgi */}
                    <Path
                        d={pathData}
                        fill="none"
                        stroke={activeAccent} // Dinamik çizgi rengi
                        strokeWidth="3"
                        strokeLinecap="round"
                    />

                    {/* Dikey Gösterge Çizgisi */}
                    {activePoint && (
                        <Line
                            x1={activePoint.x} y1="0"
                            x2={activePoint.x} y2={height}
                            stroke={theme.subText} // Temaya uygun yardımcı renk
                            strokeDasharray="4 4"
                        />
                    )}

                    {/* Veri Noktaları (Her 4 saatte bir) */}
                    {!activePoint && hourlyData.filter((_, i) => i % 4 === 0).map((h, i) => {
                        const p = getXY(i * 4, h.temp);
                        return <Circle
                            key={i}
                            cx={p.x}
                            cy={p.y}
                            r="4"
                            fill={theme.text} // Temaya uygun ana metin rengi
                        />;
                    })}

                    {/* Aktif Vurgu Noktası */}
                    {activePoint && <Circle
                        cx={activePoint.x}
                        cy={activePoint.y}
                        r="6"
                        fill={theme.text}
                        stroke={activeAccent}
                        strokeWidth="2"
                    />}
                </Svg>
            </View>

            {/* X Ekseni Etiketleri */}
            <View style={styles.xAxis}>
                {['Now', '4am', '8am', '12pm', '4pm', '8pm'].map((label, i) => (
                    <Text key={i} style={[styles.axisLabel, { color: theme.subText }]}>
                        {label}
                    </Text>
                ))}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { marginTop: 20, width: '100%' },
    tooltip: {
        position: 'absolute',
        padding: 6,
        borderRadius: 8,
        width: 50,
        alignItems: 'center',
        zIndex: 10,
        // Android gölge
        elevation: 5,
        // iOS gölge
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
    },
    tooltipText: { color: 'white', fontWeight: 'bold', fontSize: 12 },
    tooltipTime: { fontSize: 8 },
    xAxis: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 10,
        paddingHorizontal: 5
    },
    axisLabel: { fontSize: 10, fontWeight: '600' }
});