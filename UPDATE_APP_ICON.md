# App Icon Update Instructions

## Steps to Update App Icon

1. **Save the New Icon Image**
   - Save the attached green diamond logo image to: `/assets/new-app-icon.png`
   - The image should be at least 1024x1024 pixels for best quality

2. **Replace Current Icons**
   - Copy the new image to replace: `triage-app-logo.png`
   - Update other icon references as needed

3. **Generate Multiple Sizes**
   - Use online tools or Expo to generate multiple icon sizes
   - iOS requires specific sizes in the AppIcon.appiconset

## File Locations to Update
- `./assets/triage-app-logo.png` (main app icon)
- `./assets/icon.png` 
- `./assets/adaptive-icon.png`
- `./assets/favicon.png`
- `./ios/TriageSystem/Images.xcassets/AppIcon.appiconset/App-Icon-1024x1024@1x.png`

## Current app.json Configuration
```json
"icon": "./assets/triage-app-logo.png",
"android": {
  "adaptiveIcon": {
    "foregroundImage": "./assets/triage-app-logo.png",
    "backgroundColor": "#1B4A3A"
  }
}
```
