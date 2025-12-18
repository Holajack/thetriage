# iOS Widget Setup Guide

## Overview

The Triage app includes iOS widgets for Home Screen and Lock Screen to boost user retention (based on Chris Ro's strategy: "Adding widgets to my apps DOUBLED my retention rates").

## Widget Types

| Widget | Family | Content |
|--------|--------|---------|
| **Small** | systemSmall | Streak counter + daily progress bar |
| **Medium** | systemMedium | Weekly progress + next session countdown |
| **Large** | systemLarge | Full dashboard + quick action button |
| **Circular** | accessoryCircular | Lock screen streak gauge |
| **Inline** | accessoryInline | Lock screen one-line status |
| **Rectangular** | accessoryRectangular | Lock screen progress view |

## Files Created

```
ios/TriageWidgets/
├── TriageWidgets.swift       # Main widget code
├── TriageWidgetsBundle.swift # Widget bundle entry point
├── Info.plist               # Extension configuration
└── Assets.xcassets/         # Widget assets (icons, colors)
```

## Xcode Setup Steps

### 1. Add Widget Extension Target

1. Open `ios/TriageSystem.xcworkspace` in Xcode
2. File > New > Target
3. Select "Widget Extension"
4. Name: `TriageWidgets`
5. Bundle Identifier: `com.thetriage.app.widgets`
6. **UNCHECK** "Include Configuration Intent" (we use static widgets)
7. Click Finish

### 2. Configure App Groups

1. Select `TriageSystem` target > Signing & Capabilities
2. Click "+ Capability" > "App Groups"
3. Add group: `group.com.thetriage.app`

4. Select `TriageWidgets` target > Signing & Capabilities
5. Click "+ Capability" > "App Groups"
6. Add the same group: `group.com.thetriage.app`

### 3. Copy Widget Code

Replace the auto-generated widget files with:
- `TriageWidgets.swift`
- `TriageWidgetsBundle.swift`

### 4. Configure Build Settings

In `TriageWidgets` target Build Settings:
- iOS Deployment Target: 16.0 (minimum for accessory widgets)
- Swift Language Version: 5.0

### 5. Add Widget Assets

Create `Assets.xcassets` in TriageWidgets with:
- AppIcon (required for widget gallery)
- AccentColor (optional, matches app theme)

### 6. Update Podfile (if needed)

Add to Podfile:
```ruby
target 'TriageWidgets' do
  inherit! :search_paths
end
```

Run `pod install` after updating.

## React Native Integration

### Syncing Data to Widgets

Use the `widgetSync` utility to update widget data:

```typescript
import { syncAllWidgetData, refreshWidgets } from './utils/widgetSync';

// After completing a focus session:
await syncAllWidgetData({
  currentStreak: 7,
  totalFocusMinutes: 1250,
  dailyGoalMinutes: 120,
  dailyProgressMinutes: 45,
  weeklyGoalMinutes: 600,
  weeklyProgressMinutes: 320,
  nextSessionTime: new Date().toISOString(),
  motivationalQuote: "Focus on progress, not perfection.",
  quoteAuthor: "Unknown"
});

// Force widget refresh
await refreshWidgets();
```

### Native Bridge (Production)

For production, create a native module bridge:

**ios/WidgetSync.swift:**
```swift
import Foundation
import WidgetKit

@objc(WidgetSync)
class WidgetSync: NSObject {
  @objc
  func syncData(_ data: NSDictionary) {
    let defaults = UserDefaults(suiteName: "group.com.thetriage.app")

    for (key, value) in data {
      defaults?.set(value, forKey: key as! String)
    }
  }

  @objc
  func reloadWidgets() {
    WidgetCenter.shared.reloadAllTimelines()
  }

  @objc
  static func requiresMainQueueSetup() -> Bool {
    return false
  }
}
```

**ios/WidgetSync.m:**
```objc
#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(WidgetSync, NSObject)
RCT_EXTERN_METHOD(syncData:(NSDictionary *)data)
RCT_EXTERN_METHOD(reloadWidgets)
@end
```

## Deep Linking

The large widget includes a "Start Focus Session" button that deep links to:
```
triage://focus
```

Configure URL scheme in `Info.plist`:
```xml
<key>CFBundleURLTypes</key>
<array>
  <dict>
    <key>CFBundleURLSchemes</key>
    <array>
      <string>triage</string>
    </array>
  </dict>
</array>
```

## Testing Widgets

### Simulator
1. Build & Run the app in Simulator
2. Long press Home Screen > Edit Home Screen
3. Tap "+" button > Search "Triage"
4. Add widget to Home Screen

### Physical Device
1. Build to device
2. Same steps as Simulator
3. Lock Screen widgets require iOS 16+

## Troubleshooting

### Widget Not Appearing
- Ensure both targets have matching App Group
- Run `pod install` if dependencies are missing
- Clean build folder (Cmd+Shift+K)

### Data Not Syncing
- Verify App Group identifier matches exactly
- Check `UserDefaults(suiteName:)` uses correct group
- Call `WidgetCenter.shared.reloadAllTimelines()` after data update

### Widget Gallery Empty
- Widget needs valid AppIcon asset
- Minimum iOS version must be 14.0+
- Build and run at least once

## Resources

- [WidgetKit Documentation](https://developer.apple.com/documentation/widgetkit)
- [Human Interface Guidelines - Widgets](https://developer.apple.com/design/human-interface-guidelines/widgets)
- [Chris Ro Widget Strategy](https://twitter.com/chrisro)
