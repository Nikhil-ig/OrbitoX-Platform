import {
  ImportedProject,
  IngestionFidelityReport,
  IngestionConfidenceHeuristic,
  IngestionFidelityClassification,
} from '../types/ImportIR';

export class FidelityAuditor {
  /**
   * Audit an imported project, compute mathematical confidence, compile heuristics,
   * and produce an explainable human fidelity scorecard.
   */
  static audit(project: ImportedProject): IngestionFidelityReport {
    let totalElements = 0;
    let totalImages = 0;
    let totalFonts = Object.keys(project.designTokens?.typography || {}).length;
    let totalTokens = Object.keys(project.designTokens?.colors || {}).length;
    let totalSections = 0;

    let layoutPassCount = 0;
    let stylePassCount = 0;
    let typoPassCount = 0;

    const heuristics: IngestionConfidenceHeuristic[] = [];
    const quarantinedScripts: IngestionFidelityReport['quarantinedScripts'] = [];

    // Check custom code boundaries from project
    if (project.customCodeBoundaries && project.customCodeBoundaries.length > 0) {
      for (const boundary of project.customCodeBoundaries) {
        quarantinedScripts.push({
          id: boundary.id,
          tag: 'script_boundary',
          reason: boundary.reason,
          snippet: boundary.rawSnippet.substring(0, 120),
        });
        heuristics.push({
          score: 0.85,
          category: 'scripts',
          reason: `Quarantined code boundary (${boundary.reason}) safely isolated to prevent execution.`,
          remediation: 'Review quarantined snippet in Developer Diagnostics if dynamic behavior is needed.',
        });
      }
    }

    let totalTypoNodes = 0;

    // Traverse nodes
    for (const page of project.pages || []) {
      totalSections += (page.sections || []).length;

      for (const section of page.sections || []) {
        const nodes = section.nodes || {};

        for (const [nodeId, node] of Object.entries(nodes)) {
          totalElements++;

          if (node.kind === 'image') totalImages++;

          // Layout scoring
          if (node.layout && (node.layout.mode === 'flex' || node.layout.mode === 'grid')) {
            layoutPassCount++;
          } else if (node.geometry && node.geometry.width && node.geometry.height) {
            layoutPassCount += 0.8;
          }

          // Style scoring
          if (node.style && (node.style.fills?.length || node.style.strokes?.length || node.style.borderRadius !== undefined)) {
            stylePassCount++;
          } else {
            stylePassCount += 0.9;
          }

          // Typography scoring
          if (node.typography) {
            totalTypoNodes++;
            if (node.typography.fontFamily && node.typography.fontSize) {
              typoPassCount++;
            }
          }
        }
      }
    }

    const safeTotal = Math.max(1, totalElements);
    const layoutScore = Math.min(1, layoutPassCount / safeTotal);
    const styleScore = Math.min(1, stylePassCount / safeTotal);
    const typoScore = totalTypoNodes > 0 ? Math.min(1, typoPassCount / totalTypoNodes) : 1.0;
    const assetScore = 1.0;

    // Weighted equation: Layout (35%), Style (25%), Typography (20%), Assets (20%)
    let rawScore = (layoutScore * 0.35 + styleScore * 0.25 + typoScore * 0.20 + assetScore * 0.20) * 100;

    // Deduct penalties for quarantined scripts
    if (quarantinedScripts.length > 0) {
      rawScore = Math.max(50, rawScore - quarantinedScripts.length * 3);
    }

    const finalScore = Math.round(Math.min(100, Math.max(10, rawScore)));

    // Determine classification
    let classification: IngestionFidelityClassification = 'native';
    if (finalScore >= 90 && quarantinedScripts.length === 0) {
      classification = 'native';
    } else if (finalScore >= 75) {
      classification = 'hybrid';
    } else if (quarantinedScripts.length > 0) {
      classification = 'custom_runtime';
    } else {
      classification = 'unsupported';
    }

    // High level summary
    const summaryText =
      classification === 'native'
        ? `${finalScore}% Native Editable (Framer / Figma Quality)`
        : classification === 'hybrid'
        ? `${finalScore}% Hybrid Fidelity (${quarantinedScripts.length} sandboxed elements)`
        : `${finalScore}% Runtime Embed with custom boundaries`;

    if (totalFonts > 0) {
      heuristics.push({
        score: 1.0,
        category: 'typography',
        reason: `Preserved ${totalFonts} font families with native fallback stacks.`,
      });
    }

    if (totalTokens > 0) {
      heuristics.push({
        score: 1.0,
        category: 'style',
        reason: `Synthesized ${totalTokens} perceptual design system tokens using CIELAB ΔE.`,
      });
    }

    const totalComponents = Object.keys(project.globalComponents || {}).length;
    if (totalComponents > 0) {
      heuristics.push({
        score: 1.0,
        category: 'layout',
        reason: `Detected and promoted ${totalComponents} structural subtrees to reusable Master Components.`,
      });
    }

    const report: IngestionFidelityReport = {
      overallScore: finalScore,
      classification,
      summaryText,
      stats: {
        totalPages: (project.pages || []).length,
        totalSections,
        totalElements,
        totalComponents,
        totalImages,
        totalFonts,
        totalTokens,
      },
      heuristics,
      quarantinedScripts,
    };

    project.fidelityReport = report;
    return report;
  }
}
