"""
Main Formulation Engine.

Orchestrates color formulation from input parameters.
"""

from __future__ import annotations

from typing import Optional, List, Dict, Tuple
import math

from colorgenius.engine.color_science.conversions import ColorConverter
from colorgenius.engine.color_science.models import ColorLevel
from colorgenius.engine.formulation.models import (
    FormulationInput,
    FormulationResult,
    BaseFormula,
    FormulaComponent,
    DeveloperRecommendation,
    ProcessingInstructions,
    ApplicationStep,
    ActionType,
    ValidationResult,
    ConfidenceScore,
    ToningFormula,
    CostEstimate,
    PricingSuggestion,
    HairProfile,
    ClientFactors,
    CurrentHairState,
    TargetColor,
)
from colorgenius.engine.formulation.database import ColorLineDatabase, Brand, ProductLine


class FormulationEngine:
    """
    Main formulation algorithm.

    Transforms FormulationInput into professional-grade color formulas.
    """

    def __init__(self):
        self.db = ColorLineDatabase()
        self.converter = ColorConverter()

    def formulate(self, input_data: FormulationInput) -> FormulationResult:
        """
        Generate complete formulation from input parameters.

        Args:
            input_data: Complete formulation input

        Returns:
            FormulationResult with all formulation details
        """
        # Step 1: Validate feasibility
        validation = self._validate_formulation(input_data)

        # Step 2: Determine action type
        action_type = self._determine_action_type(input_data)

        # Step 3: Select product line
        product_line = self._select_product_line(input_data, action_type)

        # Step 4: Generate base formula
        base_formula = self._generate_base_formula(input_data, action_type, product_line)

        # Step 5: Apply adjustments
        adjusted_formula = self._apply_adjustments(base_formula, input_data)

        # Step 6: Calculate developer
        developer = self._calculate_developer(input_data, action_type)

        # Step 7: Generate processing instructions
        processing = self._calculate_processing(adjusted_formula, input_data)

        # Step 8: Generate toning if needed
        toning = self._generate_toning(adjusted_formula, input_data)

        # Step 9: Calculate confidence
        confidence = self._calculate_confidence(adjusted_formula, input_data, validation)

        return FormulationResult(
            primary_formula=adjusted_formula,
            toning_formula=toning,
            processing_instructions=processing,
            warnings=validation.warnings + adjusted_formula.warnings,
            alternatives=validation.alternatives,
            confidence_score=confidence,
            validation=validation,
        )

    def _validate_formulation(self, input_data: FormulationInput) -> ValidationResult:
        """Validate if formulation is feasible and safe."""
        issues = []
        warnings = []
        alternatives = []

        lift_needed = input_data.lift_required

        # Check lift feasibility
        if lift_needed > 4:
            if input_data.current.is_virgin:
                issues.append("Maximum lift with color is 4 levels")
                alternatives.append("Recommend lightener (bleach) instead")
            else:
                issues.append("Color cannot lift through previous color")
                alternatives.append("Remove previous color first")

        # Check hair condition
        if input_data.hair_profile.damage_score > 0.7 and lift_needed > 2:
            warnings.append("Significant lift on damaged hair - recommend bond builder")

        if input_data.hair_profile.porosity == "high" and lift_needed > 2:
            warnings.append("High porosity may process unevenly")

        # Check developer safety
        required_volume = self._get_min_developer_for_lift(lift_needed)
        if required_volume >= 40 and input_data.hair_profile.damage_score > 0.5:
            warnings.append("40 volume on compromised hair - proceed with caution")

        # Check gray coverage
        if input_data.client.gray_percentage > 50:
            if input_data.target.primary_tone not in ["N", "A"]:
                warnings.append("Non-N series may not cover resistant gray completely")

        # Check medication interactions
        if "chemo" in input_data.client.medications:
            issues.append("Recent chemotherapy - hair may be fragile")
            alternatives.append("Wait 6+ months post-treatment")

        # Check allergies
        if input_data.client.has_ppd_allergy:
            issues.append("PPD allergy detected - use PPD-free alternatives")

        return ValidationResult(
            is_valid=len(issues) == 0,
            issues=issues,
            warnings=warnings,
            alternatives=alternatives,
        )

    def _determine_action_type(self, input_data: FormulationInput) -> ActionType:
        """Determine the primary action required."""
        level_diff = input_data.lift_required

        # Corrective takes precedence
        if input_data.current.has_banding or input_data.current.has_buildup:
            return ActionType.CORRECTIVE

        # Darkening (fill missing pigment)
        if level_diff < -3:
            return ActionType.FILL_THEN_DEPOSIT

        # Lightening
        if level_diff > 0:
            if level_diff <= 2 and input_data.current.is_virgin:
                return ActionType.LIFT_WITH_COLOR
            else:
                return ActionType.LIGHTEN_THEN_TONE

        # Same level - deposit only
        if level_diff == 0:
            return ActionType.DEPOSIT_ONLY

        # Demi/semi-permanent for no lift
        return ActionType.DEPOSIT_ONLY

    def _select_product_line(
        self,
        input_data: FormulationInput,
        action_type: ActionType,
    ) -> ProductLine:
        """Select appropriate product line based on action and preferences."""
        brand_map = {
            "redken": Brand.REDKEN,
            "wella": Brand.WELLA,
            "schwarzkopf": Brand.SCHWARZKOPF,
            "matrix": Brand.MATRIX,
            "joico": Brand.JOICO,
            "goldwell": Brand.GOLDWELL,
        }

        brand = brand_map.get(input_data.preferences.preferred_brand.lower(), Brand.REDKEN)
        lines = self.db.get_product_lines_by_brand(brand)

        if not lines:
            # Default to Redken
            lines = self.db.get_product_lines_by_brand(Brand.REDKEN)

        # Filter by action type
        if action_type == ActionType.DEPOSIT_ONLY and input_data.lift_required == 0:
            # Prefer demi-permanent for no-lift jobs
            demi_lines = [l for l in lines if "demi" in l.color_type]
            if demi_lines:
                return demi_lines[0]

        if input_data.lift_required > 0:
            # Permanent color for lift
            perm_lines = [l for l in lines if l.color_type == "permanent"]
            if perm_lines:
                return perm_lines[0]

        return lines[0]

    def _generate_base_formula(
        self,
        input_data: FormulationInput,
        action_type: ActionType,
        product_line: ProductLine,
    ) -> BaseFormula:
        """Generate base formula components."""
        components = []

        if action_type == ActionType.LIGHTEN_THEN_TONE:
            # Requires bleach
            return BaseFormula(
                action_type=action_type,
                product_line=f"BLEACH ({product_line.brand.value})",
                components=[
                    FormulaComponent(
                        shade_code="LIGHTENER",
                        shade_name="Lightening Formula",
                        amount_oz=2.0,
                        purpose="lightener",
                    )
                ],
                developer_volume=30,
                mixing_ratio="1:1.5",
                processing_time_base=35,
                warnings=["Requires pre-lightening"],
            )

        # Find target shade
        shade = self.db.find_shade(
            product_line.code,
            level=input_data.target.level,
            tone=input_data.target.primary_tone,
        )

        if shade:
            components.append(
                FormulaComponent(
                    shade_code=shade.shade_code,
                    shade_name=shade.shade_name,
                    amount_oz=1.0,
                    purpose="primary",
                )
            )

            # Add secondary tone if needed
            if input_data.target.secondary_tone:
                secondary = self.db.find_shade(
                    product_line.code,
                    level=input_data.target.level,
                    tone=input_data.target.secondary_tone,
                )
                if secondary:
                    components.append(
                        FormulaComponent(
                            shade_code=secondary.shade_code,
                            shade_name=secondary.shade_name,
                            amount_oz=0.5,
                            purpose="tonal",
                        )
                    )

            # Adjust for gray coverage per validated ratios:
            # 30-50% grey -> 50% N + 50% tone (aligns w/ professional consensus)
            # 50-75% grey -> 75% N + 25% tone (Formulate Ch.8)
            # 75%+ grey -> 80% N + 20% tone (Formulate Ch.8, master technique)
            # Note: 80/20 exceeds manufacturer 50% cap -- intentional per
            # Formulate Ch.8. Requires exact level match on natural shade.
            gray_pct = input_data.client.gray_percentage
            if gray_pct > 30:
                if gray_pct >= 75:
                    natural_ratio = 0.80
                elif gray_pct >= 50:
                    natural_ratio = 0.75
                else:
                    natural_ratio = 0.50
                current_total = sum(c.amount_oz for c in components)
                natural_amt = round(natural_ratio * current_total / (1 - natural_ratio), 2)
                natural = self.db.find_natural_shade(
                    product_line.code, input_data.target.level
                )
                if natural and natural.shade_code != shade.shade_code:
                    components.append(
                        FormulaComponent(
                            shade_code=natural.shade_code,
                            shade_name=natural.shade_name,
                            amount_oz=natural_amt,
                            purpose="gray_coverage",
                        )
                    )
        else:
            # Fallback: create generic formula
            components.append(
                FormulaComponent(
                    shade_code=f"{input_data.target.level}{input_data.target.primary_tone}",
                    shade_name=f"Level {input_data.target.level} {input_data.target.primary_tone}",
                    amount_oz=1.0,
                    purpose="primary",
                )
            )

        # Calculate volume needed
        total_volume = self._calculate_volume(input_data.hair_profile)

        return BaseFormula(
            action_type=action_type,
            product_line=f"{product_line.brand.value} {product_line.name}",
            components=components,
            developer_volume=20,
            mixing_ratio=product_line.mixing_ratio,
            total_volume_oz=total_volume,
            processing_time_base=product_line.base_processing_time,
        )

    def _apply_adjustments(
        self,
        base_formula: BaseFormula,
        input_data: FormulationInput,
    ) -> BaseFormula:
        """Apply all adjustments to base formula."""
        formula = base_formula

        # Porosity adjustments
        if input_data.hair_profile.porosity == "high":
            formula.developer_volume = min(formula.developer_volume, 20)
            formula.processing_time_multiplier = 0.85
            formula.warnings.append("High porosity - monitor closely to avoid over-processing")
        elif input_data.hair_profile.porosity == "low":
            formula.processing_time_multiplier = 1.15
            formula.recommendations.append("Consider pre-softening for resistant hair")

        # Texture adjustments
        if input_data.hair_profile.texture == "coarse":
            formula.processing_time_multiplier *= 1.1
        elif input_data.hair_profile.texture == "fine":
            formula.processing_time_multiplier *= 0.95

        # Damage adjustments
        if input_data.hair_profile.damage_score > 0.5:
            formula.developer_volume = min(formula.developer_volume, 20)
            formula.warnings.append("Hair damage detected - consider lower developer")

        # Gray adjustments
        if input_data.client.gray_percentage > 50:
            formula.developer_volume = max(formula.developer_volume, 20)
            if formula.developer_volume < 20:
                formula.warnings.append("Increased to 20 vol for gray coverage")

        return formula

    def _calculate_developer(
        self,
        input_data: FormulationInput,
        action_type: ActionType,
    ) -> DeveloperRecommendation:
        """Calculate optimal developer volume."""
        lift_needed = input_data.lift_required

        # Base developer by lift requirement
        base_volume = self._get_min_developer_for_lift(lift_needed)

        adjustments = []
        final_volume = base_volume

        # Porosity adjustments
        if input_data.hair_profile.porosity == "high":
            final_volume = min(final_volume, 20)
            adjustments.append("Lowered volume for high porosity")

        if input_data.hair_profile.porosity == "low":
            final_volume = max(final_volume, 20)

        # Condition adjustments
        if input_data.hair_profile.damage_score > 0.6:
            final_volume = min(final_volume, 20)
            adjustments.append("Reduced for compromised elasticity")
        elif input_data.hair_profile.damage_score > 0.4:
            final_volume = min(final_volume, 30)

        # Gray coverage requirements
        if input_data.client.gray_percentage > 50:
            if final_volume < 20:
                final_volume = 20
                adjustments.append("Increased for resistant gray coverage")

        # Previous color limitations
        if not input_data.current.is_virgin and lift_needed > 2:
            final_volume = min(final_volume, 30)
            adjustments.append("Limited lift due to color buildup")

        # Calculate processing time
        processing_time = self._get_processing_time_for_volume(final_volume)

        return DeveloperRecommendation(
            volume=final_volume,
            processing_time=processing_time,
            rationale=adjustments,
        )

    def _calculate_processing(
        self,
        formula: BaseFormula,
        input_data: FormulationInput,
    ) -> ProcessingInstructions:
        """Calculate processing time and application sequence."""
        # Base processing time from developer
        base_time = self._get_processing_time_for_volume(formula.developer_volume)

        # Adjust for gray
        if input_data.client.gray_percentage > 50:
            base_time += 10

        # Apply multipliers
        base_time *= formula.processing_time_multiplier

        # Adjust for texture
        if input_data.hair_profile.texture == "coarse":
            base_time *= 1.1
        elif input_data.hair_profile.texture == "fine":
            base_time *= 0.95

        # Determine application sequence
        sequence = self._determine_application_sequence(
            formula, input_data.current.has_banding, input_data.current.root_regrowth_inches
        )

        return ProcessingInstructions(
            total_time_minutes=round(base_time),
            application_sequence=sequence,
            room_temperature_recommended=True,
            heat_optional=(input_data.hair_profile.porosity == "low"),
            processing_notes=formula.recommendations,
        )

    def _generate_toning(
        self,
        formula: BaseFormula,
        input_data: FormulationInput,
    ) -> Optional[ToningFormula]:
        """Generate toning formula if needed (for 3+ level lifts)."""
        if input_data.lift_required < 3:
            return None

        # Determine toning shade based on exposed undertone
        current_level = input_data.current.level

        if current_level <= 5:
            toning_shade = "10A"  # Ash to neutralize orange
        elif current_level <= 7:
            toning_shade = "10V"  # Violet to neutralize yellow
        else:
            toning_shade = "10P"  # Pearl for pale yellow

        return ToningFormula(
            shade_code=toning_shade,
            developer_volume=10,
            processing_time=15,
            mixing_ratio="1:1",
            instructions=f"Apply {toning_shade} toner after lightening to neutralize exposed undertone",
        )

    def _calculate_confidence(
        self,
        formula: BaseFormula,
        input_data: FormulationInput,
        validation: ValidationResult,
    ) -> ConfidenceScore:
        """Calculate overall confidence in formulation."""
        scores = {
            "input_quality": 0.8,
            "target_clarity": input_data.target.level_confidence,
            "formula_validity": 1.0 if validation.is_valid else 0.5,
            "experience_match": 0.75,
        }

        if validation.warnings:
            scores["formula_validity"] -= len(validation.warnings) * 0.1

        overall = sum(scores.values()) / len(scores)

        interpretation = "High" if overall > 0.8 else "Medium" if overall > 0.6 else "Low"

        return ConfidenceScore(overall=round(overall, 2), components=scores, interpretation=interpretation)

    # -------------------------------------------------------------------------
    # Helper Methods
    # -------------------------------------------------------------------------

    def _get_min_developer_for_lift(self, levels: int) -> int:
        """Get minimum developer volume for desired lift."""
        if levels <= 0:
            return 10
        elif levels == 1:
            return 20
        elif levels == 2:
            return 20
        elif levels == 3:
            return 30
        else:
            return 40

    def _get_processing_time_for_volume(self, volume: int) -> int:
        """Get standard processing time for developer volume."""
        times = {10: 20, 20: 30, 30: 35, 40: 45, 50: 50}
        return times.get(volume, 30)

    def _calculate_volume(self, hair_profile: HairProfile) -> float:
        """Calculate total mixture volume needed."""
        density_volumes = {"thin": 1.5, "medium": 2.0, "thick": 2.5}
        return density_volumes.get(hair_profile.density, 2.0)

    def _determine_application_sequence(
        self,
        formula: BaseFormula,
        has_banding: bool,
        regrowth: float,
    ) -> List[ApplicationStep]:
        """Determine application sequence based on hair condition."""
        steps = []

        if has_banding:
            # Zone-specific timing for color-banded hair
            steps = [
                ApplicationStep(
                    zone="mid_lengths",
                    duration=10,
                    description="Apply to mid-lengths (most resistant)",
                ),
                ApplicationStep(
                    zone="ends",
                    duration=5,
                    description="Apply to ends",
                ),
                ApplicationStep(
                    zone="roots",
                    duration=formula.processing_time_base - 15,
                    description="Apply to roots (fresh growth, process less)",
                ),
            ]
        elif regrowth > 0.5:
            # Root touch-up
            steps = [
                ApplicationStep(
                    zone="roots",
                    duration=20,
                    description="Apply to regrowth",
                ),
                ApplicationStep(
                    zone="mids_to_ends",
                    duration=10,
                    description="Pull through to refresh",
                ),
            ]
        else:
            # Full application
            steps = [
                ApplicationStep(
                    zone="all",
                    duration=formula.processing_time_base,
                    description="Full head application",
                )
            ]

        return steps