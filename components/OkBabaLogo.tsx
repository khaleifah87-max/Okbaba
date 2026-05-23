import React from "react";
import { View, Image, ImageStyle } from "react-native";

const LOGO_SOURCE = require("@/assets/images/1000219939.png");

// The logo PNG is landscape (~1414×1000 natural ratio ≈ 1.414:1).
// We compute height from the desired width to preserve aspect ratio.
const ASPECT_RATIO = 1414 / 1000;

interface Props {
  /** Width of the logo image in dp. Height is derived automatically. */
  width?: number;
  /** @deprecated use width instead — kept for backwards compat */
  size?: number;
  /** @deprecated no longer used — kept for backwards compat */
  variant?: "full" | "icon";
  /** @deprecated no longer used — kept for backwards compat */
  dark?: boolean;
}

/**
 * Ok Baba brand logo.
 * Renders the official PNG asset (`assets/images/1000219939.png`).
 * Use the `width` prop to control size; height is auto-calculated.
 */
export default function OkBabaLogo({ width, size, variant: _v, dark: _d }: Props) {
  // resolve width — accept either new `width` prop or legacy `size`
  const resolvedWidth = width ?? (size ? size * 1.6 : 160);
  const resolvedHeight = resolvedWidth / ASPECT_RATIO;

  const imgStyle: ImageStyle = {
    width: resolvedWidth,
    height: resolvedHeight,
  };

  return (
    <View style={{ alignItems: "center" }}>
      <Image
        source={LOGO_SOURCE}
        style={imgStyle}
        resizeMode="contain"
        accessibilityLabel="Ok Baba logo"
      />
    </View>
  );
}