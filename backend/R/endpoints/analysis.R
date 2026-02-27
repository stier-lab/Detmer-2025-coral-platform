# =============================================================================
# Analysis Endpoints — Combined Router
# =============================================================================
# This file serves as a thin orchestrator that combines three focused endpoint
# modules into a single Plumber router. It is mounted at /api/analysis in
# plumber.R and preserves all original API routes.
#
# Sub-modules:
#   threshold_analysis.R      - Survival/growth thresholds, variance, data gaps, summary
#   meta_analysis_endpoints.R - Meta-analysis, heterogeneity, stratification, key findings
#   model_comparison.R        - Model comparison, data type effects, diagnostics
#
# Route inventory (all under /api/analysis):
#   GET /survival-threshold
#   GET /growth-threshold
#   GET /size-space-time
#   GET /data-gaps
#   GET /summary
#   GET /diagnostics
#   GET /meta-analysis
#   GET /heterogeneity
#   GET /stratification
#   GET /key-findings
#   GET /model-comparison
#   GET /data-type-effects
#
# Note: No source() or library() calls in endpoint files. Shared functions
# (create_error, create_success, data_env, etc.) are available via globalenv().
# =============================================================================

#* @plumber
function(pr) {
  # Plumb each sub-module and extract their endpoints into this router.
  # This preserves all route paths exactly as they were in the original
  # monolithic analysis.R (e.g., /survival-threshold, /meta-analysis, etc.)

  sub_files <- c(
    "threshold_analysis.R",
    "meta_analysis_endpoints.R",
    "model_comparison.R"
  )

  for (sub_file in sub_files) {
    sub_pr <- plumber::plumb(sub_file)

    # Extract all endpoint definitions from the sub-router and register them
    # on the parent router. This avoids the pr$mount() limitation of only
    # allowing one router per mount path.
    for (ep in sub_pr$endpoints[["__no-preempt__"]]) {
      pr$handle(
        methods = ep$verbs,
        path = ep$path,
        handler = ep$getFunc(),
        serializer = ep$serializer
      )
    }
  }

  pr
}
