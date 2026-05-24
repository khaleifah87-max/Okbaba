import React from 'react';
import { Image, ImageStyle, StyleProp } from 'react-native';

interface OkBabaLogoProps {
  style?: StyleProp<ImageStyle>;
  width?: number;
  height?: number;
}

export function OkBabaLogo({ style, width = 200, height = 200 }: OkBabaLogoProps) {
  return (
    <Image
      source={require('@/assets/images/icon.png')}
      style={[{ width, height, resizeMode: 'contain' }, style]}
    />
  );
}

export default OkBabaLogo;
