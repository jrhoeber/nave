import React, { useCallback, useEffect, useMemo } from 'react';
import {
  Dimensions,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { GestureDetector, Gesture, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import ImageEditor from '@react-native-community/image-editor';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Typography, Spacing } from '../../theme';

const SCREEN_WIDTH = Dimensions.get('window').width;
const SCREEN_HEIGHT = Dimensions.get('window').height;
const MAX_SCALE_MULTIPLIER = 3;

interface ImageCropModalProps {
  visible: boolean;
  imageUri: string;
  imageWidth: number;
  imageHeight: number;
  aspectRatio: number; // width / height of the crop viewport
  onConfirm: (croppedUri: string) => void;
  onCancel: () => void;
}

export function ImageCropModal({
  visible,
  imageUri,
  imageWidth,
  imageHeight,
  aspectRatio,
  onConfirm,
  onCancel,
}: ImageCropModalProps) {
  const insets = useSafeAreaInsets();

  // Viewport dimensions — full width, height derived from aspect ratio
  const viewportWidth = SCREEN_WIDTH;
  const viewportHeight = SCREEN_WIDTH / aspectRatio;

  // Base scale: the minimum scale that makes the image cover the viewport
  const baseScale = useMemo(() => {
    if (!imageWidth || !imageHeight) return 1;
    return Math.max(viewportWidth / imageWidth, viewportHeight / imageHeight);
  }, [imageWidth, imageHeight, viewportWidth, viewportHeight]);

  // Image display dimensions at base scale (scale=1 in gesture space)
  const baseDisplayWidth = imageWidth * baseScale;
  const baseDisplayHeight = imageHeight * baseScale;

  // Center the viewport vertically on the full screen
  const viewportTop = (SCREEN_HEIGHT - viewportHeight) / 2;

  // Gesture shared values
  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedTranslateX = useSharedValue(0);
  const savedTranslateY = useSharedValue(0);
  const didInteract = useSharedValue(false);

  // Reset when modal opens
  useEffect(() => {
    if (visible) {
      scale.value = 1;
      savedScale.value = 1;
      translateX.value = 0;
      translateY.value = 0;
      savedTranslateX.value = 0;
      savedTranslateY.value = 0;
      didInteract.value = false;
    }
  }, [visible]);

  // Clamp helper (worklet)
  const clampTranslate = useCallback(
    (tx: number, ty: number, s: number): { x: number; y: number } => {
      'worklet';
      const displayW = baseDisplayWidth * s;
      const displayH = baseDisplayHeight * s;
      const maxTx = Math.max(0, (displayW - viewportWidth) / 2);
      const maxTy = Math.max(0, (displayH - viewportHeight) / 2);
      return {
        x: Math.min(maxTx, Math.max(-maxTx, tx)),
        y: Math.min(maxTy, Math.max(-maxTy, ty)),
      };
    },
    [baseDisplayWidth, baseDisplayHeight, viewportWidth, viewportHeight],
  );

  const panGesture = Gesture.Pan()
    .onStart(() => {
      savedTranslateX.value = translateX.value;
      savedTranslateY.value = translateY.value;
    })
    .onUpdate((e) => {
      didInteract.value = true;
      const clamped = clampTranslate(
        savedTranslateX.value + e.translationX,
        savedTranslateY.value + e.translationY,
        scale.value,
      );
      translateX.value = clamped.x;
      translateY.value = clamped.y;
    })
    .minDistance(0);

  const pinchGesture = Gesture.Pinch()
    .onStart(() => {
      savedScale.value = scale.value;
      didInteract.value = true;
    })
    .onUpdate((e) => {
      const newScale = Math.min(
        MAX_SCALE_MULTIPLIER,
        Math.max(1, savedScale.value * e.scale),
      );
      scale.value = newScale;
      // Re-clamp translation at new scale
      const clamped = clampTranslate(translateX.value, translateY.value, newScale);
      translateX.value = clamped.x;
      translateY.value = clamped.y;
    })
    .onEnd(() => {
      // Snap to min scale if barely above it
      if (scale.value < 1.02) {
        scale.value = withTiming(1, { duration: 200 });
        translateX.value = withTiming(0, { duration: 200 });
        translateY.value = withTiming(0, { duration: 200 });
      }
    });

  const composedGesture = Gesture.Simultaneous(panGesture, pinchGesture);

  const animatedImageStyle = useAnimatedStyle(() => ({
    width: baseDisplayWidth,
    height: baseDisplayHeight,
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  const handleConfirm = useCallback(async () => {
    // If the user didn't pan or pinch, upload the original image as-is
    if (!didInteract.value) {
      onConfirm(imageUri);
      return;
    }

    const effectiveScale = baseScale * scale.value;

    const cropW = viewportWidth / effectiveScale;
    const cropH = viewportHeight / effectiveScale;
    const cropX = imageWidth / 2 - translateX.value / effectiveScale - cropW / 2;
    const cropY = imageHeight / 2 - translateY.value / effectiveScale - cropH / 2;

    const rect = {
      x: Math.max(0, Math.round(cropX)),
      y: Math.max(0, Math.round(cropY)),
      width: Math.min(Math.round(cropW), imageWidth),
      height: Math.min(Math.round(cropH), imageHeight),
    };

    // Ensure rect doesn't exceed image bounds
    if (rect.x + rect.width > imageWidth) {
      rect.x = imageWidth - rect.width;
    }
    if (rect.y + rect.height > imageHeight) {
      rect.y = imageHeight - rect.height;
    }

    try {
      const result = await ImageEditor.cropImage(imageUri, {
        offset: { x: rect.x, y: rect.y },
        size: { width: rect.width, height: rect.height },
        quality: 1,
      });
      onConfirm(typeof result === 'string' ? result : result.uri);
    } catch {
      // If crop fails, fall back to original image
      onConfirm(imageUri);
    }
  }, [baseScale, scale, didInteract, viewportWidth, viewportHeight, imageWidth, imageHeight, translateX, translateY, imageUri, onConfirm]);

  if (!visible) return null;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen">
      <GestureHandlerRootView style={styles.container}>
        {/* Crop area — fills entire screen so viewportTop is screen-relative */}
        <View style={StyleSheet.absoluteFill}>
          {/* Image layer — centered on viewport */}
          <View style={[styles.imageContainer, { top: viewportTop, width: viewportWidth, height: viewportHeight }]}>
            <GestureDetector gesture={composedGesture}>
              <Animated.Image
                source={{ uri: imageUri }}
                style={animatedImageStyle}
                resizeMode="cover"
              />
            </GestureDetector>
          </View>

          {/* Dark overlays */}
          <View style={[styles.overlay, { top: 0, height: viewportTop }]} pointerEvents="none" />
          <View style={[styles.overlay, { top: viewportTop + viewportHeight, bottom: 0 }]} pointerEvents="none" />

          {/* Viewport border hint */}
          <View
            style={[styles.viewportBorder, { top: viewportTop, width: viewportWidth, height: viewportHeight }]}
            pointerEvents="none"
          />
        </View>

        {/* Header — floating on top */}
        <View style={[styles.header, { paddingTop: insets.top }]}>
          <TouchableOpacity onPress={onCancel} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} style={styles.headerBtn}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Adjust Cover</Text>
          <TouchableOpacity onPress={handleConfirm} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} style={styles.headerBtn}>
            <Text style={styles.confirmText}>Done</Text>
          </TouchableOpacity>
        </View>

        {/* Bottom hint */}
        <View style={[styles.hintContainer, { paddingBottom: insets.bottom + Spacing[4] }]}>
          <Text style={styles.hintText}>Drag to reposition, pinch to zoom</Text>
        </View>
      </GestureHandlerRootView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing[4],
    paddingBottom: Spacing[3],
    zIndex: 10,
  },
  headerBtn: {
    width: 60,
  },
  headerTitle: {
    fontSize: Typography.base,
    fontWeight: Typography.semibold,
    color: '#fff',
    textAlign: 'center',
  },
  cancelText: {
    fontSize: Typography.base,
    color: '#fff',
    fontWeight: Typography.regular,
  },
  confirmText: {
    fontSize: Typography.base,
    color: '#fff',
    fontWeight: Typography.semibold,
    textAlign: 'right',
  },
  imageContainer: {
    position: 'absolute',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  overlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  viewportBorder: {
    position: 'absolute',
    left: 0,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  hintContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 10,
  },
  hintText: {
    fontSize: Typography.sm,
    color: 'rgba(255,255,255,0.6)',
  },
});
