import React, { useState, useEffect, useMemo } from 'react';
import 'react-native-gesture-handler';
import { Dimensions, StyleSheet, View, ActivityIndicator, Text } from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, { useSharedValue, useDerivedValue, withDecay, runOnJS } from 'react-native-reanimated';
import { Canvas, Group, Path, Skia, Rect } from '@shopify/react-native-skia';

const { height } = Dimensions.get('window');

// --- Constants ---
const YEARS_IN_LIFE = 80;
const DAYS_IN_YEAR = 365;
const NODE_SIZE = 7;
const SPACING = 2;
const NODES_PER_ROW = 30;
const CELL_SIZE = NODE_SIZE + SPACING;
const YEAR_ROWS = Math.ceil(DAYS_IN_YEAR / NODES_PER_ROW);
const YEAR_HEIGHT = YEAR_ROWS * CELL_SIZE;

const YEAR_PADDING = 10;
const YEAR_MARGIN = 30;
const TOTAL_YEAR_HEIGHT = YEAR_HEIGHT + YEAR_MARGIN + (YEAR_PADDING * 2);

const CHUNK_SIZE = 20;
const CHUNK_HEIGHT = CHUNK_SIZE * TOTAL_YEAR_HEIGHT;

const ChunkLayer = ({ chunk, translateY, scale }: { chunk: any, translateY: Animated.SharedValue<number>, scale: Animated.SharedValue<number> }) => {
  const opacity = useDerivedValue(() => {
    const screenTop = -translateY.value / scale.value;
    const screenBottom = screenTop + (height / scale.value);

    const chunkTop = chunk.index * CHUNK_HEIGHT;
    const chunkBottom = chunkTop + CHUNK_HEIGHT;

    if (chunkBottom > screenTop - 1200 && chunkTop < screenBottom + 1200) {
      return 1;
    }
    return 0;
  });

  return (
    <Group opacity={opacity}>
      <Path path={chunk.white} color="#FFFFFF" opacity={0.1} />
      <Path path={chunk.gray} color="#444444" />
      <Path path={chunk.blue} color="#2196F3" />
      <Path path={chunk.gold} color="#FFD700" />
    </Group>
  );
};

export default function App() {
  const [isReady, setIsReady] = useState(false);
  const [activeChunks, setActiveChunks] = useState<number[]>([]);

  const translateX = useSharedValue(20);
  const translateY = useSharedValue(50);
  const scale = useSharedValue(0.25);

  const currentPinchScale = useSharedValue(1);

  const lifeChunks = useMemo(() => {
    const chunks = [];
    for (let i = 0; i < YEARS_IN_LIFE / CHUNK_SIZE; i++) {
      const pBlue = Skia.Path.Make();
      const pGold = Skia.Path.Make();
      const pGray = Skia.Path.Make();
      const pWhite = Skia.Path.Make();

      const startYear = i * CHUNK_SIZE;
      for (let y = startYear; y < startYear + CHUNK_SIZE; y++) {
        const yOffset = y * TOTAL_YEAR_HEIGHT + YEAR_PADDING;
        for (let d = 0; d < DAYS_IN_YEAR; d++) {
          const rand = Math.random();
          const rect = Skia.XYWHRect(
            (d % NODES_PER_ROW) * CELL_SIZE + YEAR_PADDING,
            yOffset + Math.floor(d / NODES_PER_ROW) * CELL_SIZE,
            NODE_SIZE,
            NODE_SIZE
          );

          if (rand > 0.97) pGold.addRect(rect);
          else if (rand > 0.85) pBlue.addRect(rect);
          else if (rand > 0.45) pGray.addRect(rect);
          else pWhite.addRect(rect);
        }
      }
      chunks.push({ blue: pBlue, gold: pGold, gray: pGray, white: pWhite, index: i });
    }
    return chunks;
  }, []);

  useEffect(() => {
    setTimeout(() => setIsReady(true), 800);
  }, []);

  const checkVisibility = (ty: number, s: number) => {
    const visible: number[] = [];
    const screenTop = -ty / s;
    const screenBottom = screenTop + (height / s);

    lifeChunks.forEach((_, i) => {
      const chunkTop = i * CHUNK_HEIGHT;
      const chunkBottom = chunkTop + CHUNK_HEIGHT;
      if (chunkBottom > screenTop - 200 && chunkTop < screenBottom + 200) {
        visible.push(i);
      }
    });

    setActiveChunks((prev) => {
      if (prev.length === visible.length && prev.every((v, i) => v === visible[i])) return prev;
      return visible;
    });
  };


  const panGesture = Gesture.Pan()
    .onChange((e) => {
      translateX.value += e.changeX;
      translateY.value += e.changeY;
      runOnJS(checkVisibility)(translateY.value, scale.value);
    })
    .onEnd((e) => {
      translateX.value = withDecay({ velocity: e.velocityX });
      translateY.value = withDecay({ velocity: e.velocityY });
    });

  const pinchGesture = Gesture.Pinch()
    .onBegin(() => {
      currentPinchScale.value = 1;
    })
    .onChange((e) => {
      const scaleChange = e.scale / currentPinchScale.value;
      currentPinchScale.value = e.scale;

      const nextScale = Math.min(Math.max(scale.value * scaleChange, 0.15), 3.0);
      const actualRatio = nextScale / scale.value;

      translateX.value = translateX.value * actualRatio + e.focalX * (1 - actualRatio);
      translateY.value = translateY.value * actualRatio + e.focalY * (1 - actualRatio);

      scale.value = nextScale;
      runOnJS(checkVisibility)(translateY.value, scale.value);
    });

  const composed = Gesture.Simultaneous(panGesture, pinchGesture);

  const transform = useDerivedValue(() => [
    { translateX: translateX.value }, { translateY: translateY.value }, { scale: scale.value },
  ]);

  if (!isReady) return <View style={styles.loader}><ActivityIndicator size="large" color="#2196F3" /></View>;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      {/* Visual Clue Box for Client Presentation */}
      <View style={styles.clueBox}>
        <Text style={styles.clueTitle}>ACTIVE GPU CHUNKS</Text>
        {lifeChunks.map((_, i) => (
          <View key={i} style={styles.indicatorRow}>
            <View style={[styles.dot, { backgroundColor: activeChunks.includes(i) ? '#00FF00' : '#333' }]} />
            <Text style={styles.clueText}>Years {i * 20}-{(i + 1) * 20} {activeChunks.includes(i) ? '(RENDERING)' : '(IDLE)'}</Text>
          </View>
        ))}
      </View>

      <GestureDetector gesture={composed}>
        <View style={styles.container}>
          <Canvas style={styles.canvas}>
            <Group transform={transform}>
              {Array.from({ length: YEARS_IN_LIFE }).map((_, i) => (
                <Rect
                  key={i}
                  x={0}
                  y={i * TOTAL_YEAR_HEIGHT}
                  width={NODES_PER_ROW * CELL_SIZE + (YEAR_PADDING * 2)}
                  height={YEAR_HEIGHT + (YEAR_PADDING * 2)}
                  color="#1A1A1A"
                />
              ))}

              {lifeChunks.map((chunk, i) => (
                <ChunkLayer
                  key={i}
                  chunk={chunk}
                  translateY={translateY}
                  scale={scale}
                />
              ))}
            </Group>
          </Canvas>
        </View>
      </GestureDetector>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0A0A' },
  loader: { flex: 1, backgroundColor: '#0A0A0A', justifyContent: 'center', alignItems: 'center' },
  canvas: { flex: 1 },
  clueBox: {
    position: 'absolute', top: 50, left: 20, zIndex: 100,
    backgroundColor: 'rgba(0,0,0,0.85)', padding: 12, borderRadius: 8,
    borderWidth: 1, borderColor: '#444'
  },
  clueTitle: { color: '#AAA', fontSize: 10, marginBottom: 8, fontWeight: 'bold' },
  indicatorRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  dot: { width: 8, height: 8, borderRadius: 4, marginRight: 8 },
  clueText: { color: '#EEE', fontSize: 11, fontFamily: 'monospace' }
});