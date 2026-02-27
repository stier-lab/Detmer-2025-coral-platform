library(dplyr)

# Note: SIZE_BREAKS, SIZE_LABELS, response helpers (create_error, create_success, create_empty)
# are loaded globally by plumber.R

# Helper function to validate goal parameter
validate_goal <- function(goal) {
  valid_goals <- c("survival", "growth", "balance")
  if (!goal %in% valid_goals) {
    return(list(valid = FALSE,
                message = sprintf("Parameter 'goal' must be one of: %s",
                                  paste(valid_goals, collapse = ", "))))
  }
  list(valid = TRUE, value = goal)
}

# Helper function to validate fragment parameter
validate_fragment <- function(fragment) {
  valid_values <- c("Y", "N", "all")
  if (!fragment %in% valid_values) {
    return(list(valid = FALSE,
                message = sprintf("Parameter 'fragment' must be one of: %s",
                                  paste(valid_values, collapse = ", "))))
  }
  list(valid = TRUE, value = fragment)
}

# Score function based on goal
# Returns a score for each size class - higher is better
calculate_scores <- function(survival_data, growth_data, goal) {
  # Normalize survival and growth to 0-1 scale
  surv_rates <- survival_data$survival_rate
  growth_rates <- growth_data$mean_growth

  # Handle negative growth rates - normalize to positive scale
  # Use pct_growing as the growth metric since mean growth can be negative
  pct_growing <- growth_data$pct_growing / 100

  # Survival is already in 0-1 scale
  surv_normalized <- surv_rates

  # For growth, use percentage of colonies with positive growth
  growth_normalized <- pct_growing

  scores <- switch(goal,
    "survival" = surv_normalized,
    "growth" = growth_normalized,
    "balance" = 0.5 * surv_normalized + 0.5 * growth_normalized
  )

  scores
}

# Determine confidence level based on sample size, data quality, and study count
get_confidence_level <- function(n_survival, n_growth, se_survival, n_studies = NA) {
  # Very Low: fewer than 3 contributing studies regardless of sample size

  if (!is.na(n_studies) && n_studies < 3) {
    return("very_low")
  }
  # Determine confidence based on sample size, standard error, and study count
  if (n_survival >= 100 && n_growth >= 50 && !is.na(se_survival) && se_survival < 0.05 &&
      !is.na(n_studies) && n_studies >= 5) {
    return("high")
  } else if (n_survival >= 30 && n_growth >= 20 && !is.na(n_studies) && n_studies >= 3) {
    return("medium")
  } else {
    return("low")
  }
}

# Generate caveats based on data quality and selection
generate_caveats <- function(goal, size_class, survival_n, growth_n, region, fragment,
                             dominant_study_pct = NULL, r_squared = 0.086,
                             n_studies = NA) {
  caveats <- c()

  # FIRST and most important caveat: disturbance exclusion

  caveats <- c(caveats, "CRITICAL: Estimates exclude major disturbance events (disease, bleaching, hurricanes) which are the primary drivers of A. palmata mortality")

  # Prediction interval warning — this is key for practitioners
  caveats <- c(caveats, "Prediction intervals show the expected range for a new restoration site and are wider than confidence intervals due to extreme between-study heterogeneity (I-squared = 97.8%)")

  # Study count warnings
  if (!is.na(n_studies) && n_studies < 3) {
    caveats <- c(caveats, sprintf("Very Low Confidence: Only %d study(ies) contribute data for this size class — estimates are unreliable", n_studies))
  } else if (!is.na(n_studies) && n_studies < 5) {
    caveats <- c(caveats, sprintf("Low Confidence: Only %d studies contribute data for this size class", n_studies))
  }

  # Core caveat about size-survival relationship
  caveats <- c(caveats, sprintf("Size explains only %.1f%% of survival variance", r_squared * 100))

  # Sample size warnings
  if (survival_n < 50) {
    caveats <- c(caveats, sprintf("Limited survival data for %s (n=%d)", size_class, survival_n))
  }
  if (growth_n < 30) {
    caveats <- c(caveats, sprintf("Limited growth data for %s (n=%d)", size_class, growth_n))
  }

  # Data source warning
  if (!is.null(dominant_study_pct) && dominant_study_pct > 50) {
    caveats <- c(caveats, sprintf("%.0f%% of data from single study - results may not generalize",
                                   dominant_study_pct))
  }

  # Regional data warning
  if (region != "" && region != "all") {
    caveats <- c(caveats, "Regional estimates may differ from pooled data shown")
  }

  # Fragment-specific warning
  if (fragment == "Y") {
    caveats <- c(caveats, "Fragment survival typically lower than whole colonies")
  }

  # Goal-specific recommendations
  if (goal == "survival" && grepl("SC1|SC2", size_class)) {
    caveats <- c(caveats, "Consider growing fragments larger before outplanting for better survival")
  }

  if (goal == "growth" && grepl("SC4|SC5", size_class)) {
    caveats <- c(caveats, "Large colonies grow slower relative to size but start closer to maturity")
  }

  # General caveats
  caveats <- c(caveats, "Local site conditions may significantly affect outcomes")

  caveats
}

#* Get optimal outplanting size recommendation
#* @param goal Optimization goal: "survival", "growth", or "balance"
#* @param region Optional region filter (comma-separated)
#* @param fragment Fragment status: "Y", "N", or "all" (default: "all")
#* @get /outplant
function(req, res, goal = "balance", region = "", fragment = "all") {

  # Validate goal parameter
  goal_v <- validate_goal(goal)
  if (!goal_v$valid) {
    return(create_error(res, 400, "INVALID_PARAMETER", goal_v$message,
                        list(parameter = "goal", value = goal,
                             allowed = c("survival", "growth", "balance"))))
  }

  # Validate fragment parameter
  fragment_v <- validate_fragment(fragment)
  if (!fragment_v$valid) {
    return(create_error(res, 400, "INVALID_PARAMETER", fragment_v$message,
                        list(parameter = "fragment", value = fragment,
                             allowed = c("Y", "N", "all"))))
  }

  # Check data availability - survival
  if (is.null(data_env$survival_individual)) {
    return(create_error(res, 500, "DATA_UNAVAILABLE",
                        "Survival data is not loaded. Please check server configuration.",
                        list()))
  }

  # Check data availability - growth
  if (is.null(data_env$growth_individual)) {
    return(create_error(res, 500, "DATA_UNAVAILABLE",
                        "Growth data is not loaded. Please check server configuration.",
                        list()))
  }

  # Filter survival data
  survival_result <- data_env$survival_individual
  growth_result <- data_env$growth_individual

  # Apply region filter
  if (region != "" && region != "all") {
    regions <- strsplit(region, ",")[[1]]
    survival_result <- survival_result %>% filter(region %in% regions)
    growth_result <- growth_result %>% filter(region %in% regions)
  }

  # Apply fragment filter
  if (fragment != "all" && fragment != "") {
    survival_result <- survival_result %>% filter(fragment == !!fragment)
    growth_result <- growth_result %>% filter(fragment == !!fragment)
  }

  # Check for sufficient data
  if (nrow(survival_result) < 30) {
    return(create_error(res, 400, "INSUFFICIENT_DATA",
                        "Not enough survival data for reliable recommendation",
                        list(n = nrow(survival_result), minimum_required = 30,
                             filters = list(region = region, fragment = fragment))))
  }

  if (nrow(growth_result) < 20) {
    return(create_error(res, 400, "INSUFFICIENT_DATA",
                        "Not enough growth data for reliable recommendation",
                        list(n = nrow(growth_result), minimum_required = 20,
                             filters = list(region = region, fragment = fragment))))
  }

  # Calculate survival by size class with hierarchical uncertainty

  # Step 1: Compute study-level survival rates per size class
  survival_tagged <- survival_result %>%
    mutate(size_class = cut(size_cm2, breaks = SIZE_BREAKS, labels = SIZE_LABELS,
                            include.lowest = TRUE)) %>%
    filter(!is.na(size_class))

  study_level_surv <- survival_tagged %>%
    group_by(size_class, study) %>%
    summarise(
      n_study = n(),
      rate_study = mean(survived, na.rm = TRUE),
      # Within-study sampling variance for a proportion
      var_within = rate_study * (1 - rate_study) / n_study,
      .groups = "drop"
    )

  # Step 2: Aggregate with between-study variance (tau-squared)
  survival_by_size <- survival_tagged %>%
    group_by(size_class) %>%
    summarise(
      n = n(),
      n_survived = sum(survived, na.rm = TRUE),
      survival_rate = mean(survived, na.rm = TRUE),
      n_studies = n_distinct(study),
      .groups = "drop"
    ) %>%
    left_join(
      study_level_surv %>%
        group_by(size_class) %>%
        summarise(
          # Between-study variance: var of study-level rates minus mean within-study var
          var_between_raw = var(rate_study),
          mean_var_within = mean(var_within),
          .groups = "drop"
        ),
      by = "size_class"
    ) %>%
    mutate(
      # Naive pooled SE (for the overall mean)
      se_naive = sqrt(survival_rate * (1 - survival_rate) / n),
      # Between-study variance (tau-squared), floored at 0
      tau_sq = pmax(0, var_between_raw - mean_var_within),
      # Replace NA tau_sq (single-study size classes) with 0
      tau_sq = ifelse(is.na(tau_sq), 0, tau_sq),
      # SE for the mean accounting for clustering (random-effects style)
      se_mean = ifelse(n_studies > 1,
                       sqrt(se_naive^2 + tau_sq / n_studies),
                       se_naive),
      # Prediction SE for a NEW site: includes full between-study variance
      se_prediction = sqrt(se_naive^2 + tau_sq),
      # Confidence interval (for the mean)
      ci_lower = pmax(0, survival_rate - 1.96 * se_mean),
      ci_upper = pmin(1, survival_rate + 1.96 * se_mean),
      # Prediction interval (for a new site)
      pi_lower = pmax(0, survival_rate - 1.96 * se_prediction),
      pi_upper = pmin(1, survival_rate + 1.96 * se_prediction)
    ) %>%
    # Clean up intermediate columns
    select(-var_between_raw, -mean_var_within) %>%
    filter(!is.na(size_class))

  # Calculate growth by size class
  growth_by_size <- growth_result %>%
    mutate(size_class = cut(size_cm2, breaks = SIZE_BREAKS, labels = SIZE_LABELS,
                            include.lowest = TRUE)) %>%
    group_by(size_class) %>%
    summarise(
      n = n(),
      mean_growth = mean(growth_cm2_yr, na.rm = TRUE),
      sd_growth = sd(growth_cm2_yr, na.rm = TRUE),
      pct_growing = mean(growth_cm2_yr > 0, na.rm = TRUE) * 100,
      pct_shrinking = mean(growth_cm2_yr < 0, na.rm = TRUE) * 100,
      .groups = "drop"
    ) %>%
    filter(!is.na(size_class))

  # Join survival and growth data
  combined_data <- survival_by_size %>%
    inner_join(growth_by_size, by = "size_class", suffix = c("_surv", "_growth"))

  if (nrow(combined_data) == 0) {
    return(create_error(res, 400, "INSUFFICIENT_DATA",
                        "No size classes have both survival and growth data",
                        list(filters = list(region = region, fragment = fragment))))
  }

  # Calculate scores
  combined_data$score <- calculate_scores(
    survival_data = combined_data %>% select(survival_rate),
    growth_data = combined_data %>% select(mean_growth, pct_growing),
    goal = goal
  )

  # Find recommended size class (highest score)
  recommended_idx <- which.max(combined_data$score)
  recommended <- combined_data[recommended_idx, ]

  # Extract simple size class name (SC1-SC5)
  recommended_size_class <- gsub("^(SC[1-5]).*", "\\1", as.character(recommended$size_class))

  # Calculate confidence level (now includes study count)
  confidence <- get_confidence_level(
    n_survival = recommended$n_surv,
    n_growth = recommended$n_growth,
    se_survival = recommended$se_mean,
    n_studies = recommended$n_studies
  )

  # Calculate dominant study percentage for caveats
  dominant_study <- survival_result %>%
    count(study) %>%
    arrange(desc(n)) %>%
    slice(1)
  dominant_study_pct <- (dominant_study$n / nrow(survival_result)) * 100

  # Generate caveats
  caveats <- generate_caveats(
    goal = goal,
    size_class = recommended_size_class,
    survival_n = recommended$n_surv,
    growth_n = recommended$n_growth,
    region = region,
    fragment = fragment,
    dominant_study_pct = dominant_study_pct,
    n_studies = recommended$n_studies
  )

  # Build all size class data for comparison
  all_sizes <- combined_data %>%
    mutate(
      size_class_simple = gsub("^(SC[1-5]).*", "\\1", as.character(size_class)),
      is_recommended = size_class_simple == recommended_size_class
    ) %>%
    select(
      size_class = size_class_simple,
      size_range = size_class,
      survival_rate,
      survival_ci_lower = ci_lower,
      survival_ci_upper = ci_upper,
      survival_pi_lower = pi_lower,
      survival_pi_upper = pi_upper,
      survival_n = n_surv,
      n_studies,
      mean_growth,
      pct_growing,
      growth_n = n_growth,
      score,
      is_recommended
    )

  # Return recommendation
  list(
    error = FALSE,
    recommendation = list(
      recommended_size_class = recommended_size_class,
      size_range = as.character(recommended$size_class),
      goal = goal,
      score = round(recommended$score, 3)
    ),
    survival = list(
      rate = round(recommended$survival_rate, 3),
      ci_lower = round(recommended$ci_lower, 3),
      ci_upper = round(recommended$ci_upper, 3),
      pi_lower = round(recommended$pi_lower, 3),
      pi_upper = round(recommended$pi_upper, 3),
      n = recommended$n_surv,
      n_studies = recommended$n_studies
    ),
    growth = list(
      mean_rate = round(recommended$mean_growth, 2),
      pct_growing = round(recommended$pct_growing, 1),
      pct_shrinking = round(recommended$pct_shrinking, 1),
      n = recommended$n_growth
    ),
    confidence = confidence,
    caveats = caveats,
    all_sizes = all_sizes,
    meta = list(
      total_survival_records = nrow(survival_result),
      total_growth_records = nrow(growth_result),
      filters = list(
        region = ifelse(region == "", "all", region),
        fragment = fragment
      ),
      scoring = list(
        method = switch(goal,
          "survival" = "100% survival rate weight",
          "growth" = "100% positive growth probability weight",
          "balance" = "50% survival + 50% positive growth probability"
        )
      ),
      uncertainty_note = "Confidence intervals (ci_*) reflect uncertainty in the mean survival rate. Prediction intervals (pi_*) reflect the expected range of survival at a new restoration site, accounting for extreme between-study heterogeneity (I-squared = 97.8%). Use prediction intervals for planning."
    )
  )
}

#* Get recommendation with detailed comparison of all size classes
#* @param goal Optimization goal: "survival", "growth", or "balance"
#* @param region Optional region filter (comma-separated)
#* @param fragment Fragment status: "Y", "N", or "all" (default: "all")
#* @get /compare
function(req, res, goal = "balance", region = "", fragment = "all") {

  # Validate goal parameter
  goal_v <- validate_goal(goal)
  if (!goal_v$valid) {
    return(create_error(res, 400, "INVALID_PARAMETER", goal_v$message,
                        list(parameter = "goal", value = goal,
                             allowed = c("survival", "growth", "balance"))))
  }

  # Validate fragment parameter
  fragment_v <- validate_fragment(fragment)
  if (!fragment_v$valid) {
    return(create_error(res, 400, "INVALID_PARAMETER", fragment_v$message,
                        list(parameter = "fragment", value = fragment,
                             allowed = c("Y", "N", "all"))))
  }

  # Check data availability
  if (is.null(data_env$survival_individual)) {
    return(create_error(res, 500, "DATA_UNAVAILABLE",
                        "Survival data is not loaded. Please check server configuration.",
                        list()))
  }

  if (is.null(data_env$growth_individual)) {
    return(create_error(res, 500, "DATA_UNAVAILABLE",
                        "Growth data is not loaded. Please check server configuration.",
                        list()))
  }

  # Filter data
  survival_result <- data_env$survival_individual
  growth_result <- data_env$growth_individual

  if (region != "" && region != "all") {
    regions <- strsplit(region, ",")[[1]]
    survival_result <- survival_result %>% filter(region %in% regions)
    growth_result <- growth_result %>% filter(region %in% regions)
  }

  if (fragment != "all" && fragment != "") {
    survival_result <- survival_result %>% filter(fragment == !!fragment)
    growth_result <- growth_result %>% filter(fragment == !!fragment)
  }

  # Calculate survival by size class with hierarchical uncertainty

  # Step 1: Tag size classes and compute study-level rates
  survival_tagged <- survival_result %>%
    mutate(size_class = cut(size_cm2, breaks = SIZE_BREAKS, labels = SIZE_LABELS,
                            include.lowest = TRUE)) %>%
    filter(!is.na(size_class))

  study_level_surv <- survival_tagged %>%
    group_by(size_class, study) %>%
    summarise(
      n_study = n(),
      rate_study = mean(survived, na.rm = TRUE),
      var_within = rate_study * (1 - rate_study) / n_study,
      .groups = "drop"
    )

  # Step 2: Aggregate with between-study variance (tau-squared)
  survival_by_size <- survival_tagged %>%
    group_by(size_class) %>%
    summarise(
      n = n(),
      survival_rate = mean(survived, na.rm = TRUE),
      n_studies = n_distinct(study),
      .groups = "drop"
    ) %>%
    left_join(
      study_level_surv %>%
        group_by(size_class) %>%
        summarise(
          var_between_raw = var(rate_study),
          mean_var_within = mean(var_within),
          .groups = "drop"
        ),
      by = "size_class"
    ) %>%
    mutate(
      se_naive = sqrt(survival_rate * (1 - survival_rate) / n),
      tau_sq = pmax(0, var_between_raw - mean_var_within),
      tau_sq = ifelse(is.na(tau_sq), 0, tau_sq),
      se_mean = ifelse(n_studies > 1,
                       sqrt(se_naive^2 + tau_sq / n_studies),
                       se_naive),
      se_prediction = sqrt(se_naive^2 + tau_sq),
      ci_lower = pmax(0, survival_rate - 1.96 * se_mean),
      ci_upper = pmin(1, survival_rate + 1.96 * se_mean),
      pi_lower = pmax(0, survival_rate - 1.96 * se_prediction),
      pi_upper = pmin(1, survival_rate + 1.96 * se_prediction)
    ) %>%
    select(-var_between_raw, -mean_var_within) %>%
    filter(!is.na(size_class))

  # Calculate growth by size class with detailed stats
  growth_by_size <- growth_result %>%
    mutate(size_class = cut(size_cm2, breaks = SIZE_BREAKS, labels = SIZE_LABELS,
                            include.lowest = TRUE)) %>%
    group_by(size_class) %>%
    summarise(
      n = n(),
      mean_growth = mean(growth_cm2_yr, na.rm = TRUE),
      sd_growth = sd(growth_cm2_yr, na.rm = TRUE),
      median_growth = median(growth_cm2_yr, na.rm = TRUE),
      pct_growing = mean(growth_cm2_yr > 0, na.rm = TRUE) * 100,
      pct_shrinking = mean(growth_cm2_yr < 0, na.rm = TRUE) * 100,
      .groups = "drop"
    ) %>%
    filter(!is.na(size_class))

  # Join data
  combined_data <- survival_by_size %>%
    inner_join(growth_by_size, by = "size_class", suffix = c("_surv", "_growth"))

  if (nrow(combined_data) == 0) {
    return(create_error(res, 400, "INSUFFICIENT_DATA",
                        "No size classes have both survival and growth data",
                        list(filters = list(region = region, fragment = fragment))))
  }

  # Calculate scores for each goal type
  combined_data$score_survival <- calculate_scores(
    combined_data %>% select(survival_rate),
    combined_data %>% select(mean_growth, pct_growing),
    "survival"
  )

  combined_data$score_growth <- calculate_scores(
    combined_data %>% select(survival_rate),
    combined_data %>% select(mean_growth, pct_growing),
    "growth"
  )

  combined_data$score_balance <- calculate_scores(
    combined_data %>% select(survival_rate),
    combined_data %>% select(mean_growth, pct_growing),
    "balance"
  )

  # Add current goal score
  combined_data$score <- switch(goal,
    "survival" = combined_data$score_survival,
    "growth" = combined_data$score_growth,
    "balance" = combined_data$score_balance
  )

  # Mark recommended
  best_idx <- which.max(combined_data$score)
  combined_data$is_recommended <- seq_len(nrow(combined_data)) == best_idx

  # Format output
  comparison_data <- combined_data %>%
    mutate(
      size_class_simple = gsub("^(SC[1-5]).*", "\\1", as.character(size_class)),
      confidence = mapply(get_confidence_level, n_surv, n_growth, se_mean, n_studies)
    ) %>%
    select(
      size_class = size_class_simple,
      size_range = size_class,
      survival_rate = survival_rate,
      survival_ci_lower = ci_lower,
      survival_ci_upper = ci_upper,
      survival_pi_lower = pi_lower,
      survival_pi_upper = pi_upper,
      survival_n = n_surv,
      n_studies,
      mean_growth,
      median_growth,
      sd_growth,
      pct_growing,
      pct_shrinking,
      growth_n = n_growth,
      score_survival,
      score_growth,
      score_balance,
      score,
      is_recommended,
      confidence
    ) %>%
    arrange(desc(score))

  list(
    error = FALSE,
    goal = goal,
    data = comparison_data,
    meta = list(
      total_survival_records = nrow(survival_result),
      total_growth_records = nrow(growth_result),
      filters = list(
        region = ifelse(region == "", "all", region),
        fragment = fragment
      ),
      interpretation = sprintf(
        "For goal '%s', %s is recommended with a score of %.3f",
        goal,
        as.character(comparison_data$size_class[1]),
        comparison_data$score[1]
      ),
      uncertainty_note = "Confidence intervals (ci_*) reflect uncertainty in the mean survival rate. Prediction intervals (pi_*) reflect the expected range of survival at a new restoration site, accounting for extreme between-study heterogeneity (I-squared = 97.8%). Use prediction intervals for planning."
    )
  )
}
