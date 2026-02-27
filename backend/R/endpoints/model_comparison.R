# =============================================================================
# Model Comparison Endpoints
# =============================================================================
# Endpoints for comprehensive model comparison, data type effects analysis,
# and model diagnostics.
#
# Routes (all relative to /api/analysis mount point):
#   GET /model-comparison   - Comprehensive model comparison across all model types
#   GET /data-type-effects  - Data type effects analysis (field vs restoration vs nursery)
#   GET /diagnostics        - Diagnostic status for all models
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

#* Get comprehensive model comparison across all model types
#* @get /model-comparison
#* @serializer json
function(res) {
  tryCatch({
    models <- list()

    # Load GAM results (from threshold analysis) using cached data
    gam_results <- tryCatch({
      thresh <- get_analysis_data("survival_thresholds")
      comparison <- get_analysis_data("survival_model_comparison")
      if (is.null(thresh) || is.null(comparison)) return(NULL)
      list(
        name = "GAM",
        full_name = "Generalized Additive Model",
        aic = comparison$AIC[comparison$Model == "GAM"][1],
        threshold_cm2 = exp(thresh$threshold_log[1]),
        ci_lower = exp(thresh$cluster_boot_ci_lower[1]),
        ci_upper = exp(thresh$cluster_boot_ci_upper[1]),
        r_squared = if ("pseudo_R2" %in% names(comparison)) comparison$pseudo_R2[comparison$Model == "GAM"][1] else NA,
        description = "Flexible smooth spline with study random effects",
        advantages = c("Flexible shape", "Good for exploration"),
        disadvantages = c("Parameters not biologically interpretable", "Wide CI")
      )
    }, error = function(e) NULL)

    if (!is.null(gam_results)) models$gam <- gam_results

    # Load beta regression results using cached data
    beta_results <- tryCatch({
      results <- get_analysis_data("beta_regression_results")
      comparison <- get_analysis_data("beta_regression_comparison")
      if (is.null(results) || is.null(comparison)) return(NULL)

      results_list <- setNames(as.list(results$value), results$metric)

      list(
        name = "Beta Regression",
        full_name = "Beta Regression (Variable Precision)",
        aic = as.numeric(results_list$best_model_aic),
        threshold_cm2 = as.numeric(results_list$threshold_cm2),
        ci_lower = as.numeric(results_list$ci_lower_cm2),
        ci_upper = as.numeric(results_list$ci_upper_cm2),
        r_squared = as.numeric(results_list$best_model_pseudo_r2),
        cv = as.numeric(results_list$cv),
        description = "Appropriate for bounded (0,1) survival proportions",
        advantages = c("Handles bounded response", "Models heteroscedasticity", "Tighter CI"),
        disadvantages = c("Requires aggregated data", "Less flexible than GAM")
      )
    }, error = function(e) NULL)

    if (!is.null(beta_results)) models$beta <- beta_results

    # Load NLME results using cached data
    nlme_results <- tryCatch({
      comparison <- get_analysis_data("nlme_model_comparison")
      thresholds <- get_analysis_data("nlme_thresholds")
      if (is.null(comparison) || is.null(thresholds)) return(NULL)

      # Michaelis-Menten
      mm <- comparison[comparison$model == "Michaelis-Menten", ]
      mm_thresh <- thresholds[thresholds$model == "Michaelis-Menten" &
                              thresholds$threshold_type == "80% of asymptote", ]

      # Sigmoidal
      sig <- comparison[comparison$model == "Sigmoidal", ]
      sig_thresh <- thresholds[thresholds$model == "Sigmoidal" &
                               thresholds$threshold_type == "Inflection point", ]

      list(
        michaelis_menten = list(
          name = "Michaelis-Menten",
          full_name = "NLME Michaelis-Menten",
          aic = mm$aic[1],
          threshold_cm2 = mm$key_threshold_cm2[1],
          r_squared = NA,
          half_saturation_cm2 = mm$key_threshold_cm2[1],
          description = "Asymptotic curve: μ = (a × size) / (b + size)",
          advantages = c("Interpretable half-saturation", "Biologically motivated"),
          disadvantages = c("Assumes monotonic relationship", "May not fit all data")
        ),
        sigmoidal = list(
          name = "Sigmoidal",
          full_name = "NLME Sigmoidal (Logistic)",
          aic = sig$aic[1],
          threshold_cm2 = sig$key_threshold_cm2[1],
          inflection_point_cm2 = sig_thresh$threshold_cm2[1],
          description = "S-curve: μ = L / (1 + exp(-k(x - x₀)))",
          advantages = c("Interpretable inflection point", "Bounded predictions"),
          disadvantages = c("Assumes symmetric S-shape", "Sensitive to outliers")
        )
      )
    }, error = function(e) NULL)

    if (!is.null(nlme_results)) {
      models$michaelis_menten <- nlme_results$michaelis_menten
      models$sigmoidal <- nlme_results$sigmoidal
    }

    # Load data type effects using cached data
    data_type_results <- tryCatch({
      comparison <- get_analysis_data("data_type_model_comparison")
      effects <- get_analysis_data("data_type_effects_by_size")
      if (is.null(comparison) || is.null(effects)) return(NULL)

      list(
        pooled_aic = comparison$aic[comparison$model == "Pooled (no data type)"],
        with_type_aic = comparison$aic[comparison$model == "Additive data type"],
        interaction_aic = comparison$aic[comparison$model == "Interaction (separate curves)"],
        delta_aic = comparison$delta_aic[comparison$model == "Pooled (no data type)"],
        data_type_matters = comparison$delta_aic[comparison$model == "Pooled (no data type)"] > 2,
        field_vs_restoration_diff_pp = mean(
          effects$survival[effects$data_type_simple == "Field"] -
          effects$survival[effects$data_type_simple == "Restoration"]
        ) * 100,
        description = "Comparing Field, Lab, Nursery/Outplanted data sources"
      )
    }, error = function(e) NULL)

    if (!is.null(data_type_results)) models$data_type <- data_type_results

    # Build comparison summary
    model_list <- list()
    if (!is.null(gam_results)) model_list[[length(model_list) + 1]] <- list(
      name = "GAM", aic = gam_results$aic, threshold = gam_results$threshold_cm2
    )
    if (!is.null(beta_results)) model_list[[length(model_list) + 1]] <- list(
      name = "Beta", aic = beta_results$aic, threshold = beta_results$threshold_cm2
    )
    if (!is.null(nlme_results)) {
      model_list[[length(model_list) + 1]] <- list(
        name = "M-M", aic = nlme_results$michaelis_menten$aic,
        threshold = nlme_results$michaelis_menten$threshold_cm2
      )
      model_list[[length(model_list) + 1]] <- list(
        name = "Sigmoidal", aic = nlme_results$sigmoidal$aic,
        threshold = nlme_results$sigmoidal$threshold_cm2
      )
    }

    # Sort by AIC
    if (length(model_list) > 0) {
      aics <- sapply(model_list, function(x) x$aic)
      model_list <- model_list[order(aics)]
      best_model <- model_list[[1]]$name
      aic_range <- range(aics, na.rm = TRUE)
    } else {
      best_model <- "Unknown"
      aic_range <- c(NA, NA)
    }

    # Load predictions for visualization using cached data
    predictions <- tryCatch({
      pred_grid <- data.frame(
        log_size = seq(1, 10, length.out = 100),
        size_cm2 = exp(seq(1, 10, length.out = 100))
      )

      beta_pred <- get_analysis_data("beta_regression_predictions")
      nlme_pred <- get_analysis_data("nlme_predictions")

      list(
        beta = if (!is.null(beta_pred)) as.list(beta_pred) else NULL,
        nlme = if (!is.null(nlme_pred)) as.list(nlme_pred) else NULL
      )
    }, error = function(e) NULL)

    # Return comprehensive comparison
    list(
      models = models,
      comparison_summary = list(
        best_model = best_model,
        aic_range = aic_range,
        threshold_range_cm2 = range(sapply(model_list, function(x) x$threshold), na.rm = TRUE),
        n_models = length(model_list),
        model_ranking = lapply(model_list, function(x) list(name = x$name, aic = x$aic))
      ),
      predictions = predictions,
      interpretation = paste0(
        "Best fitting model: ", best_model, ". ",
        "Threshold estimates range from ",
        round(min(sapply(model_list, function(x) x$threshold), na.rm = TRUE)), " to ",
        round(max(sapply(model_list, function(x) x$threshold), na.rm = TRUE)), " cm². ",
        "Model choice affects threshold estimate but all models agree on positive size-survival relationship."
      ),
      methodology_notes = list(
        "GAM: Flexible smooth, good for exploration but parameters not interpretable",
        "Beta regression: Appropriate for bounded proportions, models variance",
        "Michaelis-Menten: Biologically motivated, provides half-saturation constant",
        "Sigmoidal: Provides interpretable inflection point (threshold)"
      )
    )
  }, error = function(e) {
    create_error(res, 500, "ANALYSIS_ERROR",
                 "Failed to retrieve model comparison",
                 list(error_message = e$message,
                      hint = "Run: Rscript analysis/scripts/17_beta_regression.R && Rscript analysis/scripts/18_nlme_survival.R"))
  })
}

#* Get data type effects analysis results
#* @get /data-type-effects
#* @serializer json
function(res) {
  tryCatch({
    # Use cached data
    comparison <- get_analysis_data("data_type_model_comparison")
    summary_data <- get_analysis_data("data_type_summary")
    effects <- get_analysis_data("data_type_effects_by_size")
    predictions <- get_analysis_data("data_type_predictions")

    if (is.null(comparison) || is.null(summary_data) || is.null(effects)) {
      return(create_error(res, 500, "DATA_UNAVAILABLE",
                          "Data type effects analysis results are not loaded",
                          list(hint = "Run: Rscript analysis/scripts/19_data_type_effects.R")))
    }

    # Determine if data type matters
    pooled_aic <- comparison$aic[comparison$model == "Pooled (no data type)"]
    best_aic <- min(comparison$aic)
    data_type_matters <- (pooled_aic - best_aic) > 2

    list(
      # Summary by data type
      summary = lapply(1:nrow(summary_data), function(i) {
        list(
          data_type = summary_data$data_type[i],
          n = summary_data$n[i],
          n_studies = summary_data$n_studies[i],
          mean_survival = summary_data$mean_survival[i],
          mean_size = summary_data$mean_size[i]
        )
      }),

      # Model comparison
      model_comparison = list(
        pooled_aic = pooled_aic,
        best_aic = best_aic,
        delta_aic = pooled_aic - best_aic,
        best_model = comparison$model[which.min(comparison$aic)],
        data_type_matters = data_type_matters
      ),

      # Effect sizes at different sizes
      effects_by_size = lapply(unique(effects$size_cm2), function(sz) {
        effects_at_size <- effects[effects$size_cm2 == sz, ]
        list(
          size_cm2 = sz,
          field = effects_at_size$survival[effects_at_size$data_type_simple == "Field"],
          restoration = effects_at_size$survival[effects_at_size$data_type_simple == "Restoration"],
          difference_pp = (effects_at_size$survival[effects_at_size$data_type_simple == "Field"] -
                          effects_at_size$survival[effects_at_size$data_type_simple == "Restoration"]) * 100
        )
      }),

      # Predictions for plotting
      predictions = if (!is.null(predictions)) as.list(predictions) else NULL,

      # Interpretation
      interpretation = if (data_type_matters) {
        paste0(
          "Data type significantly affects survival estimates (ΔAIC = ",
          round(pooled_aic - best_aic, 1), "). ",
          "Field studies show higher survival than restoration/nursery studies. ",
          "Consider stratifying analyses by data type."
        )
      } else {
        "Data type does not significantly affect survival estimates. Pooled analysis is appropriate."
      },

      # Recommendations
      recommendations = list(
        "Compare results across data types before pooling",
        "Report restoration-specific parameters separately",
        "Account for data type when using parameters for planning"
      )
    )
  }, error = function(e) {
    create_error(res, 500, "ANALYSIS_ERROR",
                 "Failed to retrieve data type effects analysis",
                 list(error_message = e$message,
                      hint = "Run: Rscript analysis/scripts/19_data_type_effects.R"))
  })
}

#* Get diagnostic status for all models
#* @get /diagnostics
#* @serializer json
function() {
  survival_diag <- get_analysis_data("survival_diagnostics")
  growth_diag <- get_analysis_data("growth_diagnostics")

  # Summarize diagnostic status
  all_ok <- TRUE
  warnings <- character(0)

  if (!is.null(survival_diag)) {
    surv_issues <- survival_diag$metric[survival_diag$status %in% c("HIGH", "LOW", "CAUTION")]
    if (length(surv_issues) > 0) {
      all_ok <- FALSE
      warnings <- c(warnings, paste("Survival:", paste(surv_issues, collapse = ", ")))
    }
  }

  if (!is.null(growth_diag)) {
    growth_issues <- growth_diag$metric[growth_diag$status %in% c("HIGH", "LOW", "CAUTION")]
    if (length(growth_issues) > 0) {
      all_ok <- FALSE
      warnings <- c(warnings, paste("Growth:", paste(growth_issues, collapse = ", ")))
    }
  }

  list(
    all_diagnostics_passed = all_ok,
    warnings = if (length(warnings) > 0) warnings else NULL,
    survival = if (!is.null(survival_diag)) as.list(survival_diag) else "Not available",
    growth = if (!is.null(growth_diag)) as.list(growth_diag) else "Not available"
  )
}
