import React from "react";
import {
  Image,
  ImageProps,
  ImageStyle,
  ImageBackground,
  ImageBackgroundProps,
  ViewStyle,
  StyleProp,
} from "react-native";
import { useTheme } from "../context/ThemeContext";

interface ThemedImageProps extends Omit<ImageProps, "style"> {
  style?: StyleProp<ImageStyle>;
  darkModeStyle?: ImageStyle | ImageStyle[];
  applyFilter?: boolean;
  invertColors?: boolean;
}

interface ThemedImageBackgroundProps extends Omit<
  ImageBackgroundProps,
  "style"
> {
  style?: StyleProp<ViewStyle>;
  darkModeStyle?: ViewStyle | ViewStyle[];
  applyFilter?: boolean;
  invertColors?: boolean;
}

export const ThemedImage: React.FC<ThemedImageProps> = ({
  style,
  darkModeStyle,
  applyFilter = false,
  invertColors = false,
  ...props
}) => {
  const { theme } = useTheme();

  let finalStyle: StyleProp<ImageStyle> = style;

  if (theme.isDark) {
    if (darkModeStyle) {
      const darkStyles = Array.isArray(darkModeStyle)
        ? darkModeStyle
        : [darkModeStyle];
      finalStyle = [style as ImageStyle, ...darkStyles].filter(
        Boolean,
      ) as ImageStyle[];
    }

    const darkAdjustments: ImageStyle = {};

    if (applyFilter) {
      darkAdjustments.opacity = 0.85;
    }

    if (invertColors) {
      darkAdjustments.opacity = 0.9;
    }

    if (Object.keys(darkAdjustments).length > 0) {
      finalStyle = [finalStyle as ImageStyle, darkAdjustments].filter(
        Boolean,
      ) as ImageStyle[];
    }
  }

  return <Image {...props} style={finalStyle} />;
};
