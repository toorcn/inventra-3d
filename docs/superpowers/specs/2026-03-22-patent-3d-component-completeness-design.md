# Patent 3D Component Completeness — Design Spec

**Date:** 2026-03-22
**Status:** Approved
**Approach:** Hybrid Quality-Gated Routing

## Problem

The patent extractor POC has two key issues:

1. **Bad crops:** Component image crops from patent figures often capture only a portion of the component, or just the reference number label without actual geometry. This undermines both human review and AI self-review.
2. **Incomplete 3D assembly:** Not all meaningful reference indexes get a 3D representation. Components without anchor regions in hero figures have no placement strategy, leaving them out of the assembled/exploded views.

## Goals

- Every meaningful structural/functional component (by `buildableStatus`) gets a 3D presence in the viewer.
- Components display with correct relative scale and spatial relationships in assembled view.
- Components spread with clear visibility in exploded view.
- An interactive legend panel provides component discovery without cluttering the 3D scene.

## Non-Goals

- Non-structural references (surface features, labels, annotations, abstract callouts) do not need 3D representation.
- Pixel-perfect positional accuracy is not required — reasonable spatial relationships are sufficient.
- Manual drag-and-drop repositioning of components in the viewer.

## Design

### 1. Crop Quality Gate

A two-stage validation: the existing heuristic `analyzeCropQuality()` in `patent-extractor.ts` runs first as a fast pre-filter, then borderline crops get a deeper AI vision check.

**Relationship to existing code:** `patent-extractor.ts` already has `analyzeCropQuality()` (pixel-level: non-white ratio, aspect ratio, dark pixel ratio) and `shouldKeepDetection()` which gates on its output. The new AI validator supplements this — it does NOT replace it:

- **Score < 0.3** (clearly bad) → skip directly, no AI call needed
- **Score 0.3–0.7** (borderline) → send to AI quality gate for geometry validation
- **Score > 0.7** (clearly good) → pass directly, no AI call needed

**AI Quality Gate Input:** Cropped image + component metadata (ref number, name, kind).

**AI Quality Gate Output:**
```typescript
interface CropValidation {
  hasGeometry: boolean;       // crop contains recognizable component geometry
  coverageFraction: number;   // 0-1 normalized, matching existing relativeArea convention
  issues: string[];           // e.g., ["label_only", "partial_cutoff", "mostly_whitespace"]
}
```

**Pass criteria (for borderline crops sent to AI):**
- `hasGeometry === true`
- `coverageFraction > 0.30`
- No critical issues (`label_only`, `partial_cutoff`)

**Routing:**
- **Pass** → existing pipeline: crop → Fal.ai enhance → 3D generate
- **Fail** → full-figure extraction path (updates component's `evidenceMode` to `"figure_context"`)

**Persistence:** `CropValidation` results are stored on `PatentComponentEvidence` as a new `cropValidation` field for debugging and review visibility. Transient-only usage would make it hard to understand why a component was routed to full-figure mode.

**Implementation:** New module `src/lib/patent-crop-validator.ts` with a single exported function `validateCropQuality()` that calls the vision API (Gemini Flash) with a structured output schema. The existing `analyzeCropQuality()` heuristic remains unchanged as the fast pre-filter.

### 2. Full-Figure Extraction Path

When a crop fails the quality gate, the image generator switches to full-figure context mode.

**Process:**
1. Collect all figures where this ref number appears (from `evidence[]`), sorted by quality score and confidence.
2. Send up to 3-4 full figure page images to Fal.ai.
3. Use an enhanced prompt that includes:
   - Ref number and canonical name
   - Component kind and function description
   - Parent assembly name and sibling component context
   - Instruction: "Extract and generate a clean isolated view of ONLY this component from the surrounding assembly context"
4. Produce both `realistic_display` and `three_d_source` variants as normal.

**Routing mechanism:** When a crop fails the quality gate, the component's `evidenceMode` is updated to `"figure_context"` (or `"contextual_inferred"` if no figures contain the ref number at all). The existing `generatePatentComponentImageVariant()` in `patent-component-image-generator.ts` already branches on `evidenceMode` to select reference images — no new parameter is needed. The full-figure path is triggered by `evidenceMode === "figure_context"`, which causes the generator to use full page images instead of individual crops.

**Changes:** Add a new prompt variant in `src/lib/patent-image-enhancer.ts` for full-figure extraction. The full-figure prompt should instruct the model to isolate the target component from the broader figure context, potentially using AI-guided masking or highlighting of the target ref number region within the full figure before sending to Fal.ai, since Nano Banana Pro expects focused reference images rather than busy multi-component views.

### 3. Assembly Inference Engine

A new module that builds spatial relationships for all components, providing position data even when anchor regions are missing.

**Input sources:**
- Patent text descriptions (from OCR + vision extraction)
- Figure annotations and component positions in figures
- Component hierarchy (parent/child from `assemblyGraph`)
- Existing anchor regions (when available)

**AI structured output call** returns spatial relationships:
```typescript
interface SpatialRelationship {
  ref: string;                // ref number as string, matching PatentComponentRecord.canonicalRefNumber
  relation: 'between' | 'through' | 'attached_to' | 'inside' | 'adjacent' | 'surrounds';
  targets: string[];          // ref numbers this component relates to (string to match codebase convention)
  axis?: 'x' | 'y' | 'z';   // primary axis of relationship
  side?: 'top' | 'bottom' | 'left' | 'right' | 'front' | 'back';
  offset?: number;            // relative offset (0-1) along axis
}
```

**Position resolution uses a 3-tier strategy:**

| Tier | Source | Accuracy | When Used |
|------|--------|----------|-----------|
| 1 | Anchor regions in hero figures | High | Component appears in full-product view with measurable position |
| 2 | Relational inference | Medium | No anchor, but spatial relationship to anchored neighbors is known (e.g., "between parts A and B") |
| 3 | Hierarchy fallback | Low | Only parent/child known. Position near parent with kind-based offset (fastener → surface, seal → interface) |

**Scale normalization (enhanced):**
1. **Primary:** `scaleHints` from figure evidence (existing `normalizedWidth/Height`, `relativeArea`)
2. **Secondary:** Patent text dimensions when mentioned (e.g., "bolt 16 has diameter 5mm" + "housing 10 is 200mm wide" → bolt is ~2.5% of housing width)
3. **Tertiary:** Component kind defaults (fasteners are small, housings are large, seals are thin)
4. **Cross-validation:** If figure-derived scale contradicts text dimensions by >50%, flag for review and prefer text-derived scale

**Implementation:** New module `src/lib/patent-assembly-inference.ts` with:
- `inferSpatialRelationships()` — AI call to build relationship graph
- `resolveComponentPositions()` — converts relationships to 3D positions using tiered strategy
- `normalizeComponentScales()` — enhanced scale with text cross-validation

**New field on `PatentAssemblyContract`:** Add `placementTier: 1 | 2 | 3` to indicate which resolution strategy was used. This is consumed by the legend panel to show placement confidence.

**Text dimension extraction:** Patent text dimensions (e.g., "5mm diameter") are extracted opportunistically during the same AI structured output call that infers spatial relationships. This is best-effort — if no dimensions are mentioned in the patent text, the system falls back to figure-derived scale and kind defaults. This avoids a separate NLP parsing step.

**Integration:** Modify `src/lib/patent-three-d.ts` to use the inference engine when building assembly contracts, replacing the current anchor-only logic. `buildPatentAssemblyContract()` now calls the inference engine for all components, with anchor regions as Tier 1 input.

### 4. Interactive Legend Panel

A React component alongside the 3D canvas that lists all meaningful components with bidirectional hover/click highlighting.

**Layout:** Split view — 3D canvas (flex:2) + legend panel (flex:1) on the right.

**Legend panel contents:**
- View toggle: Assembled / Exploded
- Component list sorted by ref number, each showing:
  - Ref number + canonical name
  - Role badge (hero, sub, fastener, seal)
  - One-line description
- Detail panel at bottom (visible on click/select):
  - Full description
  - Placement tier indicator
  - Source figure references

**Interaction behaviors:**

| Action | Effect |
|--------|--------|
| Hover legend row | Corresponding 3D mesh gets emissive glow; other meshes dim to 30% opacity |
| Hover 3D mesh | Raycasting detects mesh; corresponding legend row highlights; panel auto-scrolls |
| Click legend row or 3D mesh | Sticky selection; detail panel shows; click again or elsewhere to deselect |
| Toggle assembled/exploded | Spring animation between states; auto-rotate on in assembled, off in exploded |

**Raycasting implementation detail:** Each component's `<group>` in the Three.js scene must have `userData.componentId` set to the component ID. The raycast handler walks up the `object3D.parent` chain from the hit mesh until it finds a group with `userData.componentId`, mapping the hit back to a logical component.

**Implementation:** Modify `src/components/patent/PatentThreeDViewer.tsx` to add the legend panel, raycasting, and highlight state management. Use React state to coordinate hover/selection between the canvas and the legend.

### 5. Graceful Degradation

Every stage has a fallback so no meaningful component is silently dropped:

| Failure | Fallback | Legend Badge |
|---------|----------|--------------|
| Both crop and full-figure image generation fail | Component in legend + placeholder primitive (labeled cube) at inferred position | "placeholder — no source image" |
| Assembly inference can't determine position | Tier 3 hierarchy fallback → near parent. If no parent: orbit hero at default radius | "approximate position" |
| Trellis 2 / GLB generation fails | Retry once; on second failure use textured primitive (box/cylinder by aspect ratio) | "simplified geometry" |
| Scale mismatch (>50% discrepancy) | Prefer text-derived scale over figure-derived | Warning icon with explanation |

Placeholder components are still interactive in the legend and respond to hover/click highlighting.

## Files Changed

| Action | File | Changes |
|--------|------|---------|
| NEW | `src/lib/patent-crop-validator.ts` | AI quality gate — `validateCropQuality()` |
| NEW | `src/lib/patent-assembly-inference.ts` | Spatial relationship graph, position resolver, scale normalizer |
| MODIFY | `src/lib/patent-extractor.ts` | Integrate quality gate after crop step |
| MODIFY | `src/lib/patent-workspace.ts` | Assembly inference types, filter to meaningful components, new fields on `PatentComponentRecord` |
| MODIFY | `src/lib/patent-component-image-generator.ts` | Full-figure extraction path triggered by `evidenceMode` |
| MODIFY | `src/lib/patent-image-enhancer.ts` | Full-figure prompt variant |
| MODIFY | `src/lib/patent-three-d.ts` | Assembly contract generation uses inference engine |
| MODIFY | `src/components/patent/PatentThreeDViewer.tsx` | Legend panel, bidirectional highlighting, placeholder primitives |
| MODIFY | `src/app/patent-extract/page.tsx` | Updated workflow with quality gate step visibility |
| MODIFY | `src/app/api/patent/three-d/generate/route.ts` | Assembly inference integration |

## Testing Strategy

- **Unit tests** for `patent-crop-validator.ts`: mock vision API responses, verify routing decisions
- **Unit tests** for `patent-assembly-inference.ts`: mock AI responses, verify position resolution across all 3 tiers, verify scale cross-validation logic
- **Integration test** for the full pipeline: PDF → extraction → quality gate → image gen → 3D → assembly, using a known patent with predictable components
- **Manual visual testing** for PatentThreeDViewer: verify legend renders, highlighting works, view toggle animates (automated visual regression for Three.js canvas would require Playwright/Storybook — out of scope for initial implementation)
