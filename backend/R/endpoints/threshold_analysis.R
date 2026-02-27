# =============================================================================
# Threshold Analysis Endpoints
# =============================================================================
# Endpoints for survival/growth threshold analysis, size-space-time variance
# partitioning, data gap analysis, and analysis summary.
#
# Routes (all relative to /api/analysis mount point):
#   GET /survival-threshold  - Survival threshold analysis results
#   GET /growth-threshold    - Growth threshold analysis results
#   GET /size-space-time     - Size-space-time variance partitioning
#   GET /data-gaps           - Data gap analysis and research priorities
#   GET /summary             - Combined analysis summary
#
# Note: No source() or library() calls allowed in Plumber endpoint files.
# Shared functions (create_error, create_success, etc.) are available via
# globalenv() — assigned in plumber.R before mounting.
# =============================================================================

# Helper function to get cached analysis data or return NULL
get_analysis_data <- function(name) {
  if (!exists("data_env") || is.null(data_env$analysis)) {
    return(NULL)
  }
  data_env$analysis[[name]]
}

#* Get survival threshold analysis results
#* @get /survival-threshold
#* @serializer json
function(res) {
  tryCatch({
    # Use cached data from data_env
    thresholds <- get_analysis_data("survival_thresholds")
    magnitude <- get_analysis_data("survival_magnitude")
    models <- get_analysis_data("survival_model_comparison")
    diagnostics <- get_analysis_data("survival_diagnostics")

    if (is.null(thresholds) || is.null(magnitude) || is.null(models)) {
      return(create_error(res, 500, "DATA_UNAVAILABLE",
                          "Survival threshold analysis results are not loaded",
                          list(hint = "Run: Rscript analysis/scripts/02_survival_threshold_analysis.R")))
    }

    list(
      threshold_cm2 = exp(thresholds$threshold_log[1]),
      threshold_log = thresholds$threshold_log[1],
      ci_lower_cm2 = exp(thresholds$cluster_boot_ci_lower[1]),
      ci_upper_cm2 = exp(thresholds$cluster_boot_ci_upper[1]),
      shape = thresholds$shape[1],
      best_model = models$Model[which.min(models$AIC)],
      delta_aic = max(models$AIC) - min(models$AIC),
      magnitude = as.list(magnitude),
      model_comparison = as.list(models),
      diagnostics = if (!is.null(diagnostics)) as.list(diagnostics) else NULL,
      interpretation = paste0(
        "Corals below ", round(exp(thresholds$threshold_log[1])), " cm² ",
        "have significantly lower survival. ",
        "The threshold is ", tolower(thresholds$shape[1]), "."
      )
    )
  }, error = function(e) {
    create_error(res, 500, "ANALYSIS_ERROR",
                 "Failed to retrieve survival threshold analysis",
                 list(error_message = e$message,
                      hint = "Run: Rscript analysis/scripts/02_survival_threshold_analysis.R"))
  })
}

#* Get growth threshold analysis results
#* @get /growth-threshold
#* @serializer json
function(res) {
  tryCatch({
    thresholds <- get_analysis_data("growth_thresholds")
    models <- get_analysis_data("growth_model_comparison")
    diagnostics <- get_analysis_data("growth_diagnostics")

    if (is.null(thresholds) || is.null(models)) {
      return(create_error(res, 500, "DATA_UNAVAILABLE",
                          "Growth threshold analysis results are not loaded"))
    }

    list(
      absolute_growth = list(
        threshold_cm2 = thresholds$threshold_cm2[thresholds$response == "absolute_growth"],
        ci_lower = thresholds$cluster_boot_ci_lower[thresholds$response == "absolute_growth"],
        ci_upper = thresholds$cluster_boot_ci_upper[thresholds$response == "absolute_growth"]
      ),
      rgr = list(
        threshold_cm2 = thresholds$threshold_cm2[thresholds$response == "relative_growth_rate"]
      ),
      positive_growth = list(
        threshold_cm2 = thresholds$threshold_cm2[thresholds$response == "positive_growth_prob"]
      ),
      model_comparison = as.list(models),
      diagnostics = if (!is.null(diagnostics)) as.list(diagnostics) else NULL
    )
  }, error = function(e) {
    create_error(res, 500, "ANALYSIS_ERROR",
                 "Failed to retrieve growth threshold analysis",
                 list(error_message = e$message))
  })
}

#* Get size-space-time analysis results
#* @get /size-space-time
#* @serializer json
function(res) {
  tryCatch({
    variance <- get_analysis_data("variance_partitioning")
    surv_by_size <- get_analysis_data("survival_by_size")
    surv_by_region <- get_analysis_data("survival_by_region")

    if (is.null(variance) || is.null(surv_by_size) || is.null(surv_by_region)) {
      return(create_error(res, 500, "DATA_UNAVAILABLE",
                          "Size-space-time analysis results are not loaded"))
    }

    list(
      variance_partitioning = as.list(variance),
      survival_by_size = as.list(surv_by_size),
      survival_by_region = as.list(surv_by_region),
      key_findings = list(
        size_variance_pct = round(variance$marginal_pseudo_r2[variance$model == "Size only"] * 100, 1),
        region_variance_pct = round(variance$marginal_pseudo_r2[variance$model == "Region only"] * 100, 1),
        time_variance_pct = round(variance$marginal_pseudo_r2[variance$model == "Year only"] * 100, 1),
        note = "Marginal pseudo-R2 from separate models; values are NOT additive"
      )
    )
  }, error = function(e) {
    create_error(res, 500, "ANALYSIS_ERROR",
                 "Failed to retrieve size-space-time analysis",
                 list(error_message = e$message))
  })
}

#* Get data gap analysis and research priorities
#* @get /data-gaps
#* @serializer json
function(res) {
  tryCatch({
    gaps <- get_analysis_data("data_gaps_identified")
    priorities <- get_analysis_data("gap_prioritization")
    certainty_size <- get_analysis_data("certainty_by_size_class")
    certainty_region <- get_analysis_data("certainty_by_region")

    if (is.null(gaps) || is.null(priorities) || is.null(certainty_size) || is.null(certainty_region)) {
      return(create_error(res, 500, "DATA_UNAVAILABLE",
                          "Data gap analysis results are not loaded"))
    }

    list(
      gaps_identified = as.list(gaps),
      priorities = as.list(priorities),
      certainty_by_size = as.list(certainty_size),
      certainty_by_region = as.list(certainty_region),
      summary = list(
        total_gaps = nrow(gaps),
        critical_gaps = sum(gaps$gap_status == "CRITICAL GAP", na.rm = TRUE),
        no_data_cells = sum(gaps$gap_status == "NO DATA", na.rm = TRUE),
        top_priority = priorities$gap_description[1]
      )
    )
  }, error = function(e) {
    create_error(res, 500, "ANALYSIS_ERROR",
                 "Failed to retrieve data gap analysis",
                 list(error_message = e$message))
  })
}

#* Get all analysis summaries combined
#* @get /summary
#* @serializer json
function() {
  # Collect all available results from cached data
  survival <- tryCatch({
    thresholds <- get_analysis_data("survival_thresholds")
    if (is.null(thresholds)) return(NULL)
    list(
      threshold_cm2 = round(exp(thresholds$threshold_log[1])),
      ci_lower_cm2 = round(exp(thresholds$cluster_boot_ci_lower[1])),
      ci_upper_cm2 = round(exp(thresholds$cluster_boot_ci_upper[1])),
      shape = thresholds$shape[1]
    )
  }, error = function(e) NULL)

  growth <- tryCatch({
    thresholds <- get_analysis_data("growth_thresholds")
    if (is.null(thresholds)) return(NULL)
    list(
      absolute_threshold_cm2 = round(thresholds$threshold_cm2[1]),
      rgr_threshold_cm2 = round(thresholds$threshold_cm2[2]),
      pos_growth_threshold_cm2 = round(thresholds$threshold_cm2[3])
    )
  }, error = function(e) NULL)

  variance <- tryCatch({
    var_data <- get_analysis_data("variance_partitioning")
    if (is.null(var_data)) return(NULL)
    # Support both old (pseudo_r2) and new (marginal_pseudo_r2) column names
    r2_col <- if ("marginal_pseudo_r2" %in% names(var_data)) "marginal_pseudo_r2" else "pseudo_r2"
    list(
      size_pct = round(var_data[[r2_col]][var_data$model == "Size only"] * 100, 1),
      region_pct = round(var_data[[r2_col]][var_data$model == "Region only"] * 100, 1),
      time_pct = round(var_data[[r2_col]][var_data$model == "Year only"] * 100, 1),
      note = "Marginal pseudo-R2 from separate models; values are NOT additive"
    )
  }, error = function(e) NULL)

  gaps <- tryCatch({
    gap_data <- get_analysis_data("data_gaps_identified")
    priority_data <- get_analysis_data("gap_prioritization")
    if (is.null(gap_data) || is.null(priority_data)) return(NULL)
    list(
      total_gaps = nrow(gap_data),
      critical = sum(gap_data$gap_status == "CRITICAL GAP", na.rm = TRUE),
      top_priority = priority_data$gap_description[1]
    )
  }, error = function(e) NULL)

  list(
    survival_threshold = survival,
    growth_thresholds = growth,
    variance_explained = variance,
    data_gaps = gaps,
    analysis_complete = !is.null(survival) && !is.null(growth),
    last_updated = format(Sys.time(), "%Y-%m-%d %H:%M:%S")
  )
}
