"""
Data models for color formulation.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Optional, List, Dict, Any
from enum import Enum


class ActionType(str, Enum):
    """Type of color action/formulation."""

    DEPOSIT_ONLY = "deposit_only"  # Same level or darker
    LIFT_WITH_COLOR = "lift_with_color"  # 1-2 level lift
    LIGHTEN_THEN_TONE = "lighten_then_tone"  # 3+ levels lift
    FILL_THEN_DEPOSIT = "fill_then_deposit"  # Darkening bleached hair
    CORRECTIVE = "corrective"  # Color correction needed
    DEMI_PERMANENT = "demi_permanent"  # No lift, temporary
    SEMI_PERMANENT = "semi_permanent"  # No developer, direct dye


@dataclass
class HairProfile:
    """Physical hair characteristics."""

    texture: str = "medium"  # fine, medium, coarse
    texture_confidence: float = 0.5

    density: str = "medium"  # thin, medium, thick
    density_confidence: float = 0.5

    porosity: str = "normal"  # low, normal, high
    porosity_confidence: float = 0.5

    elasticity_percent: Optional[float] = None
    damage_score: float = 0.0  # 0-1
    damage_indicators: List[str] = field(default_factory=list)

    curl_pattern: str = "straight"  # straight, wavy, curly, coily


@dataclass
class ClientFactors:
    """Client-specific considerations."""

    gray_percentage: int = 0
    gray_texture: str = "normal"  # wiry, normal, soft

    medications: List[str] = field(default_factory=list)
    nutrient_deficiencies: List[str] = field(default_factory=list)

    scalp_condition: str = "normal"  # normal, sensitive, oily, dry, irritated

    has_ppd_allergy: bool = False
    has_ammonia_sensitivity: bool = False

    washing_frequency: str = "every_2_3_days"
    heat_styling_frequency: str = "few_times_week"
    swimming_frequency: str = "rarely"


@dataclass
class CurrentHairState:
    """Current hair condition and color."""

    level: int = 5
    tone: str = "N"

    is_virgin: bool = True
    previous_color_type: Optional[str] = None
    months_since_color: Optional[int] = None

    has_banding: bool = False
    has_buildup: bool = False
    has_overlapping: bool = False
    root_regrowth_inches: float = 0.0

    color_history: List[Dict[str, Any]] = field(default_factory=list)


@dataclass
class TargetColor:
    """Desired end result."""

    source: str = "manual"  # photo, manual, shade_code
    level: int = 6
    level_confidence: float = 0.8

    primary_tone: str = "N"
    secondary_tone: Optional[str] = None
    tone_confidence: float = 0.8

    intensity: float = 0.8  # 0-1, where 1 = vivid

    specific_shade_code: Optional[str] = None
    reference_image_id: Optional[str] = None


@dataclass
class FormulationPreferences:
    """Stylist and client preferences."""

    preferred_brand: str = "redken"  # redken, wella, schwarzkopf, matrix
    alternative_brands: List[str] = field(default_factory=list)

    prefer_ammonia_free: bool = False
    prefer_plex_technology: bool = False

    max_product_cost: Optional[float] = None
    max_appointment_time: Optional[int] = None  # minutes

    client_wants_low_maintenance: bool = False
    client_wants_vivid_result: bool = False
    client_wants_natural_look: bool = True


@dataclass
class FormulationInput:
    """
    Complete input specification for formulation algorithm.
    """

    target: TargetColor
    current: CurrentHairState
    hair_profile: HairProfile
    client: ClientFactors = field(default_factory=ClientFactors)
    preferences: FormulationPreferences = field(default_factory=FormulationPreferences)

    # Derived values (set by engine)
    @property
    def lift_required(self) -> int:
        """Calculate lift required."""
        return self.target.level - self.current.level


@dataclass
class FormulaComponent:
    """A single component in a formula."""

    shade_code: str
    shade_name: str
    amount_oz: float
    amount_ratio: float = 1.0
    purpose: str = "primary"  # primary, tonal, filler, corrector


@dataclass
class BaseFormula:
    """Generated base formula before adjustments."""

    action_type: ActionType

    product_line: str
    components: List[FormulaComponent] = field(default_factory=list)

    developer_volume: int = 20  # 10, 20, 30, 40
    mixing_ratio: str = "1:1"

    total_volume_oz: float = 2.0

    processing_time_base: int = 30  # minutes

    processing_time_multiplier: float = 1.0
    warnings: List[str] = field(default_factory=list)
    recommendations: List[str] = field(default_factory=list)


@dataclass
class DeveloperRecommendation:
    """Developer volume recommendation."""

    volume: int
    processing_time: int  # minutes
    rationale: List[str] = field(default_factory=list)
    warnings: List[str] = field(default_factory=list)

    def __post_init__(self):
        valid_volumes = {5, 10, 15, 20, 30, 40, 50}
        if self.volume not in valid_volumes:
            raise ValueError(f"Invalid volume: {self.volume}. Must be one of {valid_volumes}")


@dataclass
class ApplicationStep:
    """Single step in application sequence."""

    zone: str  # roots, mid_lengths, ends, all
    duration: int  # minutes
    description: str


@dataclass
class ProcessingInstructions:
    """Complete processing instructions."""

    total_time_minutes: int
    application_sequence: List[ApplicationStep] = field(default_factory=list)

    room_temperature_recommended: bool = True
    heat_optional: bool = False

    processing_notes: List[str] = field(default_factory=list)


@dataclass
class CostEstimate:
    """Product cost breakdown."""

    total_product_cost: float
    components: List[Dict[str, Any]] = field(default_factory=list)
    developer_cost: float = 0.0
    bond_builder_cost: float = 0.0


@dataclass
class PricingSuggestion:
    """Pricing recommendation."""

    recommended_price: float
    price_range: tuple[float, float] = (0, 0)
    breakdown: Dict[str, Any] = field(default_factory=dict)


@dataclass
class ValidationResult:
    """Formulation validation result."""

    is_valid: bool = True
    issues: List[str] = field(default_factory=list)
    warnings: List[str] = field(default_factory=list)
    alternatives: List[str] = field(default_factory=list)


@dataclass
class ConfidenceScore:
    """Formulation confidence score."""

    overall: float  # 0-1
    components: Dict[str, float] = field(default_factory=dict)
    interpretation: str = "Medium"  # Low, Medium, High


@dataclass
class ToningFormula:
    """Separate toning formula (if needed)."""

    shade_code: str
    developer_volume: int = 10
    processing_time: int = 15  # minutes
    mixing_ratio: str = "1:1"
    instructions: str = ""


@dataclass
class FormulationResult:
    """
    Complete formulation result.
    """

    primary_formula: BaseFormula
    toning_formula: Optional[ToningFormula] = None
    processing_instructions: Optional[ProcessingInstructions] = None

    cost_estimate: Optional[CostEstimate] = None
    pricing_suggestion: Optional[PricingSuggestion] = None

    warnings: List[str] = field(default_factory=list)
    alternatives: List[str] = field(default_factory=list)

    confidence_score: ConfidenceScore = field(
        default_factory=lambda: ConfidenceScore(overall=0.8)
    )

    validation: ValidationResult = field(default_factory=ValidationResult)

    def summary(self) -> str:
        """Return human-readable summary."""
        lines = [
            f"Formula: {' '.join(c.shade_code for c in self.primary_formula.components)}",
            f"Developer: {self.primary_formula.developer_volume} vol",
            f"Ratio: {self.primary_formula.mixing_ratio}",
        ]
        if self.processing_instructions:
            lines.append(
                f"Process: {self.processing_instructions.total_time_minutes} min"
            )
        return "\n".join(lines)