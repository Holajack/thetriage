#!/usr/bin/env python3
"""
Script to update mode buttons with bounce/spring animation in FocusPreparationScreen.tsx
"""

import re

file_path = "src/screens/main/FocusPreparationScreen.tsx"

# Read the file
with open(file_path, 'r') as f:
    content = f.read()

# Pattern to find and replace the Basecamp button
basecamp_old = r'''<ReAnimated\.View style={mode1AnimStyle}>
                    <TouchableOpacity
                      style={\[styles\.modeButton, { backgroundColor: theme\.card, borderColor: theme\.primary }\]}
                      onPress={\(\) => {
                        triggerHaptic\('selection'\);
                        handleModeSelection\('basecamp'\);
                      }}
                      activeOpacity={0\.7}
                    >
                      <View style={\[styles\.modeIconContainer, { backgroundColor: theme\.primary \+ '20' }\]}>
                        <Text style={\[styles\.tentIcon, { color: theme\.primary }\]}>⛺</Text>
                      </View>
                      <Text style={\[styles\.modeButtonTitle, { color: theme\.text }\]}>Basecamp</Text>
                      <Text style={\[styles\.modeButtonSubtitle, { color: theme\.text \+ '70' }\]}>
                        One task
                      </Text>
                    </TouchableOpacity>
                  </ReAnimated\.View>'''

basecamp_new = '''<ReAnimated.View style={[mode1AnimStyle, basecampButton.animatedStyle, basecampBorderStyle]}>
                    <Pressable
                      style={[styles.modeButton, { backgroundColor: theme.card, borderColor: theme.primary, shadowColor: theme.primary }]}
                      onPress={() => {
                        triggerHaptic('selection');
                        basecampBorderGlow.value = withSequence(
                          withTiming(1, { duration: 100 }),
                          withTiming(0, { duration: 300 })
                        );
                        handleModeSelection('basecamp');
                      }}
                      onPressIn={() => {
                        basecampButton.onPressIn();
                        basecampBorderGlow.value = withTiming(1, { duration: 100 });
                      }}
                      onPressOut={() => {
                        basecampButton.onPressOut();
                        basecampBorderGlow.value = withTiming(0, { duration: 300 });
                      }}
                    >
                      <View style={[styles.modeIconContainer, { backgroundColor: theme.primary + '20' }]}>
                        <Text style={[styles.tentIcon, { color: theme.primary }]}>⛺</Text>
                      </View>
                      <Text style={[styles.modeButtonTitle, { color: theme.text }]}>Basecamp</Text>
                      <Text style={[styles.modeButtonSubtitle, { color: theme.text + '70' }]}>
                        One task
                      </Text>
                    </Pressable>
                  </ReAnimated.View>'''

# Replace Basecamp button
content = re.sub(basecamp_old, basecamp_new, content)

# Pattern to find and replace the Summit button
summit_old = r'''<ReAnimated\.View style={mode2AnimStyle}>
                    <TouchableOpacity
                      style={\[styles\.modeButton, { backgroundColor: theme\.card, borderColor: theme\.primary }\]}
                      onPress={\(\) => {
                        triggerHaptic\('selection'\);
                        handleModeSelection\('summit'\);
                      }}
                      activeOpacity={0\.7}
                    >
                      <View style={\[styles\.modeIconContainer, { backgroundColor: theme\.primary \+ '20' }\]}>
                        <Text style={\[styles\.mountainIcon, { color: theme\.primary }\]}>🏔️</Text>
                      </View>
                      <Text style={\[styles\.modeButtonTitle, { color: theme\.text }\]}>Summit</Text>
                      <Text style={\[styles\.modeButtonSubtitle, { color: theme\.text \+ '70' }\]}>
                        Multiple tasks
                      </Text>
                    </TouchableOpacity>
                  </ReAnimated\.View>'''

summit_new = '''<ReAnimated.View style={[mode2AnimStyle, summitButton.animatedStyle, summitBorderStyle]}>
                    <Pressable
                      style={[styles.modeButton, { backgroundColor: theme.card, borderColor: theme.primary, shadowColor: theme.primary }]}
                      onPress={() => {
                        triggerHaptic('selection');
                        summitBorderGlow.value = withSequence(
                          withTiming(1, { duration: 100 }),
                          withTiming(0, { duration: 300 })
                        );
                        handleModeSelection('summit');
                      }}
                      onPressIn={() => {
                        summitButton.onPressIn();
                        summitBorderGlow.value = withTiming(1, { duration: 100 });
                      }}
                      onPressOut={() => {
                        summitButton.onPressOut();
                        summitBorderGlow.value = withTiming(0, { duration: 300 });
                      }}
                    >
                      <View style={[styles.modeIconContainer, { backgroundColor: theme.primary + '20' }]}>
                        <Text style={[styles.mountainIcon, { color: theme.primary }]}>🏔️</Text>
                      </View>
                      <Text style={[styles.modeButtonTitle, { color: theme.text }]}>Summit</Text>
                      <Text style={[styles.modeButtonSubtitle, { color: theme.text + '70' }]}>
                        Multiple tasks
                      </Text>
                    </Pressable>
                  </ReAnimated.View>'''

# Replace Summit button
content = re.sub(summit_old, summit_new, content)

# Write back to file
with open(file_path, 'w') as f:
    f.write(content)

print("Successfully updated mode buttons with bounce/spring animation!")
