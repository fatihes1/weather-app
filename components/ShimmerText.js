import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View, Text, Dimensions, Easing } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import MaskedView from '@react-native-masked-view/masked-view';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export const ShimmerText = ({ text, style, shimmerColors }) => {
    const animatedValue = useRef(new Animated.Value(0)).current;

    // Varsayılan renkler (Eğer App.js'den veri gelmezse kullanılacak 5'li dizi)
    const defaultColors = ['#749BFF', '#749BFF', '#FFFFFF', '#749BFF', '#749BFF'];

    useEffect(() => {
        Animated.loop(
            Animated.timing(animatedValue, {
                toValue: 1,
                duration: 5000,
                easing: Easing.inOut(Easing.ease), //
                useNativeDriver: true,
            })
        ).start();
    }, []);

    const translateX = animatedValue.interpolate({
        inputRange: [0, 0.5, 1],
        outputRange: [-SCREEN_WIDTH * 0.5, SCREEN_WIDTH * 0.5, -SCREEN_WIDTH * 0.5],
    });

    return (
        <View style={styles.outerContainer}>
            <MaskedView
                style={styles.maskedView}
                maskElement={
                    <View style={styles.maskContainer}>
                        {/* Sayı sabit kalır, sadece içindeki renkler hareket eder */}
                        <Text style={[style, { textAlign: 'center', backgroundColor: 'transparent' }]}>
                            {text}
                        </Text>
                    </View>
                }
            >
                <Animated.View style={[styles.shimmerWrapper, { transform: [{ translateX }] }]}>
                    <LinearGradient
                        // App.js'den gelen 5'li dizi buraya girer
                        colors={shimmerColors || defaultColors}
                        // 5 renk varsa 5 location olmak zorundadır
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
        width: SCREEN_WIDTH * 2.5,
        height: '100%',
        position: 'absolute',
        left: -SCREEN_WIDTH * 0.75,
    }
});