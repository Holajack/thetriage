import React from 'react';
import { Image, ImageProps, ImageStyle, ImageBackground, ImageBackgroundProps, ViewStyle } from 'react-native';
import { useTheme } from '../context/ThemeContext';

interface ThemedImageProps extends ImageProps {
  style?: ImageStyle | ImageStyle[];
  darkModeStyle?: ImageStyle | ImageStyle[];
  applyFilter?: boolean;
  invertColors?: boolean;
}

interface ThemedImageBackgroundProps extends ImageBackgroundProps {
  style?: ViewStyle | ViewStyle[];
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
  
  let finalStyle = style;
  
  if (theme.isDark) {
    // Apply dark mode specific styles if provided
    if (darkModeStyle) {
      finalStyle = Array.isArray(style) 
        ? [...style, ...(Array.isArray(darkModeStyle) ? darkModeStyle : [darkModeStyle])]
        : [style, ...(Array.isArray(darkModeStyle) ? darkModeStyle : [darkModeStyle])];
    }
    
    // Apply automatic dark mode adjustments
    const darkAdjustments: ImageStyle = {};
    
    if (applyFilter) {
      // Reduce opacity and add subtle tinting for dark mode
      darkAdjustments.opacity = 0.85;
    }
    
    if (invertColors) {
      // This would require a library like react-native-image-filter-kit
      // For now, we'll use opacity and tinting
      darkAdjustments.opacity = 0.9;
    }
    
    if (Object.keys(darkAdjustments).length > 0) {
      finalStyle = Array.isArray(finalStyle)
        ? [...finalStyle, darkAdjustments]
        : [finalStyle, darkAdjustments];
    }
  }
  
  return <Image {...props} style={finalStyle} />;
};

export const ThemedImageBackground: React.FC<ThemedImageBackgroundProps> = ({ 
  style, 
  darkModeStyle,
  applyFilter = false,
  invertColors = false,
  imageStyle,
  ...props 
}) => {
  const { theme } = useTheme();
  
  let finalStyle = style;
  let finalImageStyle = imageStyle;
  
  if (theme.isDark) {
    // Apply dark mode specific styles if provided
    if (darkModeStyle) {
      finalStyle = Array.isArray(style) 
        ? [...style, ...(Array.isArray(darkModeStyle) ? darkModeStyle : [darkModeStyle])]
        : [style, ...(Array.isArray(darkModeStyle) ? darkModeStyle : [darkModeStyle])];
    }
    
    // Apply automatic dark mode adjustments to image
    const darkImageAdjustments: ImageStyle = {};
    
    if (applyFilter) {
      // Reduce opacity and add subtle tinting for dark mode
      darkImageAdjustments.opacity = 0.6;
    }
    
    if (invertColors) {
      darkImageAdjustments.opacity = 0.7;
    }
    
    if (Object.keys(darkImageAdjustments).length > 0) {
      finalImageStyle = Array.isArray(finalImageStyle)
        ? [...(finalImageStyle || []), darkImageAdjustments]
        : [finalImageStyle, darkImageAdjustments].filter(Boolean);
    }
  }
  
  return <ImageBackground {...props} style={finalStyle} imageStyle={finalImageStyle} />;
};