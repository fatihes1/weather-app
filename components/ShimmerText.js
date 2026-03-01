import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View, Text, Dimensions, Easing } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import MaskedView from '@react-native-masked-view/masked-view';

const { width: SCREEN_WIDTH } = Dimensions.get('window');



export const ShimmerText = ({ text, style }) => {
    const animatedValue = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.loop(
            Animated.timing(animatedValue, {
                toValue: 1,
                duration: 5000, // Süreyi biraz daha artırarak akıcılığı pekiştirdik
                easing: Easing.inOut(Easing.ease), // "Lüks" hissi veren sinüssel yumuşatma
                useNativeDriver: true,
            })
        ).start();
    }, []);

    // Kesintisiz döngü sırrı: 0 -> 0.5 -> 1
    // Değer 0'dan 0.5'e giderken sağa kayar, 0.5'ten 1'e giderken sola geri döner.
    const translateX = animatedValue.interpolate({
        inputRange: [0, 0.5, 1],
        outputRange: [-SCREEN_WIDTH * 0.4, SCREEN_WIDTH * 0.4, -SCREEN_WIDTH * 0.4],
    });

    return (
        <View style={styles.outerContainer}>
            <MaskedView
                style={styles.maskedView}
                maskElement={
                    <View style={styles.maskContainer}>
                        <Text style={[style, { textAlign: 'center' }]}>{text}</Text>
                    </View>
                }
            >
                <Animated.View style={[styles.shimmerWrapper, { transform: [{ translateX }] }]}>
                    <LinearGradient
                        // Daha hibrit bir görünüm için renk dağılımını optimize ettik
                        colors={['#749BFF', '#FFFFFF', '#749BFF', '#FFFFFF', '#749BFF']}
                        locations={[0, 0.25, 0.5, 0.75, 1]}
                        start={{ x: 0, y: 0.5 }}
                        end={{ x: 1, y: 0.5 }}
                        style={StyleSheet.absoluteFill}
                    />
                </Animated.View>
            </MaskedView>
        </View>
    );
};

const styles = StyleSheet.create({
    outerContainer: {
        height: 140,
        width: '100%',
        justifyContent: 'center',
        alignItems: 'center',
    },
    maskedView: {
        flex: 1,
        width: '100%',
        flexDirection: 'row',
    },
    maskContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'transparent',
    },
    shimmerWrapper: {
        width: SCREEN_WIDTH * 2,
        height: '100%',
        position: 'absolute',
        left: -SCREEN_WIDTH * 0.5,
    }
});