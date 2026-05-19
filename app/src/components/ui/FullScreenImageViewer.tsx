import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Modal,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import { ImageX } from './ImageX';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const MIN_SCALE = 1;
const MAX_SCALE = 4;
const DOUBLE_TAP_SCALE = 2.5;
const DISMISS_TRANSLATION = 120;
const DISMISS_VELOCITY = 800;

interface Props {
  imageUrl: string | null;
  onClose: () => void;
}

export function FullScreenImageViewer({ imageUrl, onClose }: Props) {
  const visible = imageUrl !== null;
  const [loaded, setLoaded] = useState(false);

  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedTranslateX = useSharedValue(0);
  const savedTranslateY = useSharedValue(0);
  const backdropOpacity = useSharedValue(1);

  useEffect(() => {
    if (visible) {
      scale.value = 1;
      savedScale.value = 1;
      translateX.value = 0;
      translateY.value = 0;
      savedTranslateX.value = 0;
      savedTranslateY.value = 0;
      backdropOpacity.value = 1;
      setLoaded(false);
    }
  }, [visible, imageUrl]);

  const pinch = Gesture.Pinch()
    .onStart(() => {
      savedScale.value = scale.value;
    })
    .onUpdate((e) => {
      scale.value = Math.min(
        MAX_SCALE,
        Math.max(MIN_SCALE * 0.9, savedScale.value * e.scale),
      );
    })
    .onEnd(() => {
      if (scale.value < MIN_SCALE * 1.05) {
        scale.value = withTiming(MIN_SCALE, { duration: 180 });
        translateX.value = withTiming(0, { duration: 180 });
        translateY.value = withTiming(0, { duration: 180 });
      } else {
        const maxTx = Math.max(0, (SCREEN_WIDTH * scale.value - SCREEN_WIDTH) / 2);
        const maxTy = Math.max(0, (SCREEN_HEIGHT * scale.value - SCREEN_HEIGHT) / 2);
        translateX.value = withTiming(
          Math.min(maxTx, Math.max(-maxTx, translateX.value)),
          { duration: 150 },
        );
        translateY.value = withTiming(
          Math.min(maxTy, Math.max(-maxTy, translateY.value)),
          { duration: 150 },
        );
      }
    });

  const pan = Gesture.Pan()
    .onStart(() => {
      savedTranslateX.value = translateX.value;
      savedTranslateY.value = translateY.value;
    })
    .onUpdate((e) => {
      if (scale.value > 1.05) {
        // Zoomed: pan within bounds
        const maxTx = Math.max(0, (SCREEN_WIDTH * scale.value - SCREEN_WIDTH) / 2);
        const maxTy = Math.max(0, (SCREEN_HEIGHT * scale.value - SCREEN_HEIGHT) / 2);
        translateX.value = Math.min(
          maxTx,
          Math.max(-maxTx, savedTranslateX.value + e.translationX),
        );
        translateY.value = Math.min(
          maxTy,
          Math.max(-maxTy, savedTranslateY.value + e.translationY),
        );
      } else {
        // Not zoomed: swipe-to-dismiss
        translateY.value = e.translationY;
        translateX.value = e.translationX * 0.3;
        backdropOpacity.value = Math.max(
          0.3,
          1 - Math.abs(e.translationY) / SCREEN_HEIGHT,
        );
      }
    })
    .onEnd((e) => {
      if (scale.value > 1.05) return;
      const shouldDismiss =
        Math.abs(e.translationY) > DISMISS_TRANSLATION ||
        Math.abs(e.velocityY) > DISMISS_VELOCITY;
      if (shouldDismiss) {
        backdropOpacity.value = withTiming(0, { duration: 180 });
        translateY.value = withTiming(
          e.translationY > 0 ? SCREEN_HEIGHT : -SCREEN_HEIGHT,
          { duration: 180 },
          (finished) => {
            if (finished) runOnJS(onClose)();
          },
        );
      } else {
        translateX.value = withSpring(0);
        translateY.value = withSpring(0);
        backdropOpacity.value = withTiming(1, { duration: 200 });
      }
    });

  const doubleTap = Gesture.Tap()
    .numberOfTaps(2)
    .maxDelay(220)
    .onEnd((e) => {
      if (scale.value > 1.05) {
        scale.value = withTiming(1, { duration: 200 });
        translateX.value = withTiming(0, { duration: 200 });
        translateY.value = withTiming(0, { duration: 200 });
      } else {
        const focalX = e.x - SCREEN_WIDTH / 2;
        const focalY = e.y - SCREEN_HEIGHT / 2;
        scale.value = withTiming(DOUBLE_TAP_SCALE, { duration: 200 });
        translateX.value = withTiming(-focalX * (DOUBLE_TAP_SCALE - 1), {
          duration: 200,
        });
        translateY.value = withTiming(-focalY * (DOUBLE_TAP_SCALE - 1), {
          duration: 200,
        });
      }
    });

  const singleTap = Gesture.Tap()
    .numberOfTaps(1)
    .onEnd(() => {
      runOnJS(onClose)();
    });

  const composed = Gesture.Race(
    Gesture.Exclusive(doubleTap, singleTap),
    Gesture.Simultaneous(pinch, pan),
  );

  const imageStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <GestureHandlerRootView style={styles.root}>
        <Animated.View
          style={[StyleSheet.absoluteFill, styles.backdrop, backdropStyle]}
          pointerEvents="none"
        />

        {imageUrl && (
          <GestureDetector gesture={composed}>
            <Animated.View style={[styles.imageWrap, imageStyle]}>
              <ImageX
                source={{ uri: imageUrl }}
                style={styles.image}
                contentFit="contain"
                onLoad={() => setLoaded(true)}
              />
            </Animated.View>
          </GestureDetector>
        )}

        {!loaded && (
          <View style={styles.spinnerWrap} pointerEvents="none">
            <ActivityIndicator size="large" color="#fff" />
          </View>
        )}

        <SafeAreaView
          style={styles.headerSafe}
          edges={['top']}
          pointerEvents="box-none"
        >
          <Pressable
            style={styles.closeBtn}
            onPress={onClose}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Icon name="close" size={24} color="#fff" />
          </Pressable>
        </SafeAreaView>
      </GestureHandlerRootView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  backdrop: { backgroundColor: '#000' },
  imageWrap: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
  },
  image: { width: '100%', height: '100%' },
  spinnerWrap: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerSafe: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  closeBtn: {
    alignSelf: 'flex-end',
    marginTop: 8,
    marginRight: 12,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
