# Fix iOS Build Errors - ExpoGL and C++ Header Issues

## Current Errors:
```
'cassert' file not found
could not build Objective-C module 'ExpoGL'
```

## Root Cause:
The app uses `expo-gl` and `expo-three` for 3D brain visualization, but these dependencies are causing iOS build failures due to:
1. Missing C++ headers in the build environment
2. ExpoGL module compilation issues
3. Potentially incompatible versions with React Native 0.79.2

## Immediate Solutions:

### Option 1: Disable 3D Components Temporarily (FASTEST)
This will get your build working immediately while keeping the rest of the app functional.

1. **Comment out 3D imports in Brain3D.tsx:**
```typescript
// import { GLView } from 'expo-gl';
// import { Renderer, THREE } from 'expo-three';
```

2. **Create a fallback component:**
```typescript
// Replace the GLView with a simple placeholder
return (
  <View style={styles.container}>
    <View style={styles.placeholderContainer}>
      <Ionicons name="brain-outline" size={64} color={theme.primary} />
      <Text style={styles.placeholderText}>
        3D Brain View
      </Text>
      <Text style={styles.placeholderSubtext}>
        Available in next update
      </Text>
    </View>
  </View>
);
```

### Option 2: Update Dependencies (MEDIUM EFFORT)
Update to compatible versions:

```bash
npm install expo-gl@~14.0.0 expo-three@~7.0.0
```

### Option 3: Remove 3D Dependencies (CLEANEST)
If 3D visualization isn't critical:

1. **Remove from package.json:**
```bash
npm uninstall expo-gl expo-gl-cpp expo-three @react-three/drei three @types/three
```

2. **Replace 3D components with 2D alternatives**

## Recommended Immediate Fix:

Since the build is currently broken, I recommend **Option 1** for immediate deployment, then **Option 3** for long-term stability unless 3D visualization is essential.