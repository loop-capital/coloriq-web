"""
Color Space Conversions.

Provides accurate color space conversions using colormath and colour-science.
Supports RGB, Lab, LCH, HSL, and XYZ color spaces.
"""

from __future__ import annotations

from typing import Optional, Tuple, Union
import numpy as np
from dataclasses import dataclass

# Third-party imports
try:
    from colormath.color_objects import LabColor as ColormathLab
    from colormath.color_objects import RGBColor as ColormathRGB
    from colormath.color_objects import XYZColor as ColormathXYZ
    from colormath.color_objects import sRGBColor
    from colormath import color_conversions

    COLORMATH_AVAILABLE = True
except ImportError:
    COLORMATH_AVAILABLE = False

try:
    import colour

    COLOUR_AVAILABLE = True
except ImportError:
    COLOUR_AVAILABLE = False

# Local imports
from colorgenius.engine.color_science.models import (
    RGBColor,
    LabColor,
    LCHColor,
    HSLColor,
)


class ColorConverter:
    """
    Comprehensive color space converter.

    Uses colormath as primary backend with colour-science as fallback
    for advanced conversions. Falls back to pure numpy for basic operations.
    """

    def __init__(self):
        self._setup_conversion_graph()

    def _setup_conversion_graph(self) -> None:
        """Initialize conversion graph from colormath."""
        if not COLORMATH_AVAILABLE:
            raise RuntimeError("colormath is required for color conversions")

    # -------------------------------------------------------------------------
    # RGB Conversions
    # -------------------------------------------------------------------------

    def rgb_to_lab(self, rgb: RGBColor) -> LabColor:
        """
        Convert RGB to CIEL*a*b*.

        Args:
            rgb: Input RGB color

        Returns:
            LabColor in Lab color space
        """
        if COLORMATH_AVAILABLE:
            # Create colormath RGB object
            cm_rgb = sRGBColor(
                rgb_r=rgb.r / 255.0,
                rgb_g=rgb.g / 255.0,
                rgb_b=rgb.b / 255.0,
                is_upscaled=False,
            )

            # Convert to Lab
            cm_lab = color_conversions.convert_color(cm_rgb, ColormathLab)
            return LabColor(
                l=cm_lab.lab_l,
                a=cm_lab.lab_a,
                b=cm_lab.lab_b,
            )

        # Fallback: pure numpy (simplified)
        return self._rgb_to_lab_fallback(rgb)

    def lab_to_rgb(self, lab: LabColor) -> RGBColor:
        """
        Convert CIEL*a*b* to RGB.

        Args:
            lab: Input Lab color

        Returns:
            RGBColor
        """
        if COLORMATH_AVAILABLE:
            cm_lab = ColormathLab(lab_l=lab.l, lab_a=lab.a, lab_b=lab.b)
            cm_rgb = color_conversions.convert_color(cm_lab, sRGBColor)
            return RGBColor(
                r=int(cm_rgb.rgb_r * 255),
                g=int(cm_rgb.rgb_g * 255),
                b=int(cm_rgb.rgb_b * 255),
            )

        # Fallback
        return self._lab_to_rgb_fallback(lab)

    def rgb_to_hsl(self, rgb: RGBColor) -> HSLColor:
        """
        Convert RGB to HSL (Hue, Saturation, Lightness).

        Args:
            rgb: Input RGB color

        Returns:
            HSLColor
        """
        return HSLColor.from_rgb(rgb)  # Uses the model class method

    def hsl_to_rgb(self, hsl: HSLColor) -> RGBColor:
        """
        Convert HSL to RGB.

        Args:
            hsl: Input HSL color

        Returns:
            RGBColor
        """
        h, s, l = hsl.h / 360.0, hsl.s / 100.0, hsl.l / 100.0

        if s == 0:
            r = g = b = l
        else:
            def hue_to_rgb(p: float, q: float, t: float) -> float:
                if t < 0:
                    t += 1
                if t > 1:
                    t -= 1
                if t < 1 / 6:
                    return p + (q - p) * 6 * t
                if t < 1 / 2:
                    return q
                if t < 2 / 3:
                    return p + (q - p) * (2 / 3 - t) * 6
                return p

            q = l * (1 + s) if l < 0.5 else l + s - l * s
            p = 2 * l - q
            r = hue_to_rgb(p, q, h + 1 / 3)
            g = hue_to_rgb(p, q, h)
            b = hue_to_rgb(p, q, h - 1 / 3)

        return RGBColor(
            r=int(np.clip(r * 255, 0, 255)),
            g=int(np.clip(g * 255, 0, 255)),
            b=int(np.clip(b * 255, 0, 255)),
        )

    def rgb_to_lch(self, rgb: RGBColor) -> LCHColor:
        """
        Convert RGB to LCH (Lightness, Chroma, Hue).

        Args:
            rgb: Input RGB color

        Returns:
            LCHColor
        """
        lab = self.rgb_to_lab(rgb)
        return LCHColor.from_lab(lab)

    def lch_to_rgb(self, lch: LCHColor) -> RGBColor:
        """
        Convert LCH to RGB.

        Args:
            lch: Input LCH color

        Returns:
            RGBColor
        """
        lab = lch.to_lab()
        return self.lab_to_rgb(lab)

    # -------------------------------------------------------------------------
    # Lab Conversions
    # -------------------------------------------------------------------------

    def lab_to_lch(self, lab: LabColor) -> LCHColor:
        """Convert Lab to LCH."""
        return LCHColor.from_lab(lab)

    def lch_to_lab(self, lch: LCHColor) -> LabColor:
        """Convert LCH to Lab."""
        return lch.to_lab()

    def lab_to_xyz(self, lab: LabColor) -> Tuple[float, float, float]:
        """
        Convert Lab to XYZ color space.

        Args:
            lab: Input Lab color

        Returns:
            Tuple of (X, Y, Z)
        """
        if COLOUR_AVAILABLE:
            xyz = colour.Lab_to_XYZ(lab.to_array())
            return tuple(xyz)

        # Fallback: simplified conversion
        return self._lab_to_xyz_fallback(lab)

    def xyz_to_lab(self, x: float, y: float, z: float) -> LabColor:
        """
        Convert XYZ to Lab color space.

        Args:
            x, y, z: XYZ coordinates

        Returns:
            LabColor
        """
        if COLOUR_AVAILABLE:
            lab = colour.XYZ_to_Lab(np.array([x, y, z]))
            return LabColor(l=lab[0], a=lab[1], b=lab[2])

        # Fallback
        return self._xyz_to_lab_fallback(x, y, z)

    # -------------------------------------------------------------------------
    # Color Difference (Delta E)
    # -------------------------------------------------------------------------

    def delta_e_cie76(self, color1: LabColor, color2: LabColor) -> float:
        """
        Calculate CIE76 Delta E color difference.

        Delta E < 1.0: Imperceptible
        Delta E 1-2: Perceptible through close observation
        Delta E 2-3.5: Perceptible at a glance
        Delta E 3.5-5.0: Clearly noticeable
        Delta E > 5.0: Major difference

        Args:
            color1: First color
            color2: Second color

        Returns:
            Delta E value
        """
        return np.sqrt(
            (color1.l - color2.l) ** 2
            + (color1.a - color2.a) ** 2
            + (color1.b - color2.b) ** 2
        )

    def delta_e_ciede2000(
        self,
        color1: LabColor,
        color2: LabColor,
        kL: float = 1.0,
        kC: float = 1.0,
        kH: float = 1.0,
    ) -> float:
        """
        Calculate CIEDE2000 color difference (improved perceptual accuracy).

        This is the recommended metric for professional color matching.

        Args:
            color1: First color
            color2: Second color
            kL, kC, kH: Weighting factors (default 1.0)

        Returns:
            Delta E 2000 value
        """
        if COLOUR_AVAILABLE:
            delta_e = colour.difference.delta_E_CIE2000(
                color1.to_array(), color2.to_array()
            )
            return float(delta_e)

        # Fallback: use CIE76
        return self.delta_e_cie76(color1, color2)

    def color_similarity(
        self, color1: LabColor, color2: LabColor
    ) -> Tuple[float, str]:
        """
        Calculate color similarity and human-readable interpretation.

        Args:
            color1: First color
            color2: Second color

        Returns:
            Tuple of (similarity 0-1, interpretation string)
        """
        delta_e = self.delta_e_ciede2000(color1, color2)

        if delta_e < 1.0:
            interpretation = "Imperceptible difference"
            similarity = 1.0
        elif delta_e < 2.0:
            interpretation = "Perceptible through close observation"
            similarity = 0.95
        elif delta_e < 3.5:
            interpretation = "Perceptible at a glance"
            similarity = 0.85
        elif delta_e < 5.0:
            interpretation = "Clearly noticeable difference"
            similarity = 0.7
        else:
            interpretation = "Major color difference"
            similarity = 0.5

        return similarity, interpretation

    # -------------------------------------------------------------------------
    # Level Detection Helpers
    # -------------------------------------------------------------------------

    def estimate_level_from_rgb(self, rgb: RGBColor) -> Tuple[int, float]:
        """
        Estimate hair color level (1-10) from RGB values.

        Args:
            rgb: RGB color to analyze

        Returns:
            Tuple of (level 1-10, confidence 0-1)
        """
        lab = self.rgb_to_lab(rgb)

        # Map L* to levels based on professional colorimetry
        l = lab.l

        if l < 20:
            return 1, 0.95
        elif l < 27:
            return 2, 0.92
        elif l < 34:
            return 3, 0.90
        elif l < 42:
            return 4, 0.88
        elif l < 50:
            return 5, 0.85
        elif l < 58:
            return 6, 0.88
        elif l < 66:
            return 7, 0.90
        elif l < 74:
            return 8, 0.92
        elif l < 82:
            return 9, 0.90
        else:
            return 10, 0.85

    def detect_undertone_from_lab(self, lab: LabColor) -> str:
        """
        Detect undertone (warm/cool/neutral) from Lab values.

        Args:
            lab: Lab color

        Returns:
            'warm', 'cool', or 'neutral'
        """
        a, b = lab.a, lab.b

        # Warmth score based on a* and b* values
        # b* positive = yellow (warm), negative = blue (cool)
        # a* positive = red (warm), negative = green (cool)
        warmth_score = b + a * 0.5

        if warmth_score > 10:
            return "warm"
        elif warmth_score < -5:
            return "cool"
        else:
            return "neutral"

    def detect_tone_from_lab(self, lab: LabColor) -> Tuple[str, Optional[str]]:
        """
        Detect primary and secondary tone from Lab values.

        Args:
            lab: Lab color

        Returns:
            Tuple of (primary_tone, secondary_tone)
        """
        a, b = lab.a, lab.b

        # Determine primary tone based on position in a*-b* space
        if abs(a) < 10 and abs(b) < 10:
            # Very neutral - likely natural
            return "N", None

        # Ash (cool violet/blue) - negative b*, low a*
        if b < -10 and abs(a) < 15:
            return "A", None

        # Gold (warm yellow) - high positive b*, low a*
        if b > 20 and abs(a) < 15:
            return "G", None

        # Violet - negative b*, positive a*
        if b < -5 and a > 10:
            return "V", None

        # Copper/Red - high positive a* and b*
        if a > 20 and b > 10:
            return "C", None

        # Red - very high a*
        if a > 25 and b > 0:
            return "R", None

        # Natural
        return "N", None

    # -------------------------------------------------------------------------
    # Fallback Implementations
    # -------------------------------------------------------------------------

    def _rgb_to_lab_fallback(self, rgb: RGBColor) -> LabColor:
        """Fallback RGB to Lab using pure numpy."""
        # Normalize RGB
        r, g, b = rgb.r / 255.0, rgb.g / 255.0, rgb.b / 255.0

        # Apply gamma correction (sRGB)
        r = self._gamma_corr(r)
        g = self._gamma_corr(g)
        b = self._gamma_corr(b)

        # RGB to XYZ
        x = r * 0.4124564 + g * 0.3575761 + b * 0.1804375
        y = r * 0.2126729 + g * 0.7151522 + b * 0.0721750
        z = r * 0.0193339 + g * 0.1191920 + b * 0.9503041

        # XYZ to Lab (D65 illuminant)
        x, y, z = x / 0.95047, y / 1.0, z / 1.08883

        epsilon = 0.008856
        kappa = 903.3

        fx = x ** (1 / 3) if x > epsilon else (kappa * x + 16) / 116
        fy = y ** (1 / 3) if y > epsilon else (kappa * y + 16) / 116
        fz = z ** (1 / 3) if z > epsilon else (kappa * z + 16) / 116

        l = 116 * fy - 16
        a = 500 * (fx - fy)
        b = 200 * (fy - fz)

        return LabColor(l=l, a=a, b=b)

    def _lab_to_rgb_fallback(self, lab: LabColor) -> RGBColor:
        """Fallback Lab to RGB using pure numpy."""
        # Lab to XYZ
        fy = (lab.l + 16) / 116
        fx = lab.a / 500 + fy
        fz = fy - lab.b / 200

        epsilon = 0.008856
        kappa = 903.3

        x = fx**3 if fx**3 > epsilon else (116 * fx - 16) / kappa
        y = fy**3 if fy**3 > epsilon else (116 * fy - 16) / kappa
        z = fz**3 if fz**3 > epsilon else (116 * fz - 16) / kappa

        # Scale
        x *= 0.95047
        y *= 1.0
        z *= 1.08883

        # XYZ to RGB
        r = x * 3.2404542 + y * -1.5371385 + z * -0.4985314
        g = x * -0.9692660 + y * 1.8760108 + z * 0.0415560
        b = x * 0.0556434 + y * -0.2040259 + z * 1.0572252

        # Gamma correct and clip
        r, g, b = self._gamma_corr_reverse(r), self._gamma_corr_reverse(g), self._gamma_corr_reverse(b)

        return RGBColor(
            r=int(np.clip(r * 255, 0, 255)),
            g=int(np.clip(g * 255, 0, 255)),
            b=int(np.clip(b * 255, 0, 255)),
        )

    def _lab_to_xyz_fallback(self, lab: LabColor) -> Tuple[float, float, float]:
        """Fallback Lab to XYZ."""
        fy = (lab.l + 16) / 116
        fx = lab.a / 500 + fy
        fz = fy - lab.b / 200

        epsilon = 0.008856
        kappa = 903.3

        x = fx**3 if fx**3 > epsilon else (116 * fx - 16) / kappa
        y = fy**3 if fy**3 > epsilon else (116 * fy - 16) / kappa
        z = fz**3 if fz**3 > epsilon else (116 * fz - 16) / kappa

        return (x * 0.95047, y * 1.0, z * 1.08883)

    def _xyz_to_lab_fallback(self, x: float, y: float, z: float) -> LabColor:
        """Fallback XYZ to Lab."""
        x, y, z = x / 0.95047, y / 1.0, z / 1.08883

        epsilon = 0.008856
        kappa = 903.3

        fx = x ** (1 / 3) if x > epsilon else (kappa * x + 16) / 116
        fy = y ** (1 / 3) if y > epsilon else (kappa * y + 16) / 116
        fz = z ** (1 / 3) if z > epsilon else (kappa * z + 16) / 116

        l = 116 * fy - 16
        a = 500 * (fx - fy)
        b = 200 * (fy - fz)

        return LabColor(l=l, a=a, b=b)

    @staticmethod
    def _gamma_corr(val: float) -> float:
        """Apply sRGB gamma correction."""
        return val / 12.92 if val <= 0.0031308 else 1.055 * (val ** (1 / 2.4)) - 0.055

    @staticmethod
    def _gamma_corr_reverse(val: float) -> float:
        """Reverse sRGB gamma correction."""
        return (
            val / 12.92
            if val <= 0.04045
            else ((val + 0.055) / 1.055) ** 2.4
        )
