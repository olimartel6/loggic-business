import { Dimensions, Platform } from 'react-native';

const { width, height } = Dimensions.get('window');

export const isTablet = width >= 768;
export const isSmallPhone = width < 375;
export const screenWidth = width;
export const screenHeight = height;

export const padding = isTablet ? 32 : 16;
export const cardWidth = isTablet ? '31%' : '48%';
export const fontSize = {
  xs: isTablet ? 14 : 11,
  sm: isTablet ? 16 : 13,
  md: isTablet ? 18 : 15,
  lg: isTablet ? 24 : 20,
  xl: isTablet ? 30 : 24,
  xxl: isTablet ? 36 : 28,
};
