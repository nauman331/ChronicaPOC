Chronica Life Map POC
A high-performance React Native data visualization engine built with Shopify Skia and Reanimated.

🚀 Performance Features
Spatial Culling Engine: Efficiently manages 29,220 nodes by rendering only the visible viewport, ignoring ~90% of the dataset during scroll.

GPU Path Batching: Reduces draw calls from 29,000+ individual objects down to 4 optimized C++ paths.

Zero-Lag Interaction: All gestures (Pan, Pinch) are handled on the UI Thread via Worklets, keeping the JS thread at 0% usage.

LOD (Level of Detail): Dynamic rendering states based on zoom scale to prevent GPU memory overflow.

🛠 Tech Stack
React Native

@shopify/react-native-skia

react-native-reanimated

react-native-gesture-handler