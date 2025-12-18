# Fix paths with spaces in Pods project
project_path = "Pods/Pods.xcodeproj/project.pbxproj"
content = File.read(project_path)

# Fix the two problematic shell scripts
content.gsub!(
  'shellScript = "bash -l -c \\"$PODS_TARGET_SRCROOT/../scripts/get-app-config-ios.sh\\"";',
  'shellScript = "bash -l -c \\"\\\\\\\"$PODS_TARGET_SRCROOT/../scripts/get-app-config-ios.sh\\\\\\\"\\""'
)

content.gsub!(
  'shellScript = "bash -l -c \\"$PODS_TARGET_SRCROOT/../scripts/create-updates-resources-ios.sh\\"";',
  'shellScript = "bash -l -c \\"\\\\\\\"$PODS_TARGET_SRCROOT/../scripts/create-updates-resources-ios.sh\\\\\\\"\\""'
)

File.write(project_path, content)
puts "Fixed paths with spaces in #{project_path}"
