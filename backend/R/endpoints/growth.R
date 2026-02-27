library(dplyr)
library(tidyr)

# Note: SIZE_BREAKS, SIZE_LABELS, response helpers (create_error, create_success, create_empty),
# and validate_numeric_param are loaded globally by plumber.R

#* Get individual growth records with filtering
#* @param region Comma-separated list of regions
#* @param data_type Comma-separated list of data types
#* @param year_min Minimum survey year
#* @param year_max Maximum survey year
#* @get /individual
function(req, res, region = "", data_type = "", year_min = 2000, year_max = 2025) {

  # Validate numeric parameters
  year_min_v <- validate_numeric_param(year_min, "year_min", min_val = 1900, max_val = 2100)
  if (!year_min_v$valid) {
    return(create_error(res, 400, "INVALID_PARAMETER", year_min_v$message,
                        list(parameter = "year_min", value = year_min)))
  }

  year_max_v <- validate_numeric_param(year_max, "year_max", min_val = 1900, max_val = 2100)
  if (!year_max_v$valid) {
    return(create_error(res, 400, "INVALID_PARAMETER", year_max_v$message,
                        list(parameter = "year_max", value = year_max)))
  }

  if (year_min_v$value > year_max_v$value) {
    return(create_error(res, 400, "INVALID_RANGE", "year_min cannot be greater than year_max",
                        list(year_min = year_min_v$value, year_max = year_max_v$value)))
  }

  # Check data availability
  if (is.null(data_env$growth_individual)) {
    return(create_error(res, 500, "DATA_UNAVAILABLE",
                        "Growth data is not loaded. Please check server configuration.",
                        list()))
  }

  result <- data_env$growth_individual

  if (region != "") {
    regions <- strsplit(region, ",")[[1]]
    result <- result %>% filter(region %in% regions)
  }

  if (data_type != "") {
    types <- strsplit(data_type, ",")[[1]]
    result <- result %>% filter(data_type %in% types)
  }

  result <- result %>%
    filter(
      survey_yr >= year_min_v$value,
      survey_yr <= year_max_v$value
    )

  if (nrow(result) == 0) {
    return(create_error(res, 404, "NO_DATA_FOUND",
                        "No growth records match the specified filters",
                        list(filters = list(region = region, data_type = data_type,
                                            year_range = c(year_min_v$value, year_max_v$value)))))
  }

  list(
    error = FALSE,
    data = result,
    meta = list(
      total_records = nrow(result),
      regions = unique(result$region),
      studies = unique(result$study)
    )
  )
}

#* Get growth statistics by size class
#* @param region Comma-separated list of regions
#* @param data_type Comma-separated list of data types
#* @param fragment Fragment status (Y, N, or all)
#* @get /by-size
function(req, res, region = "", data_type = "", fragment = "all") {

  # Validate fragment parameter
  if (fragment != "" && fragment != "all" && !fragment %in% c("Y", "N")) {
    return(create_error(res, 400, "INVALID_PARAMETER",
                        "Fragment must be 'Y', 'N', 'all', or empty",
                        list(parameter = "fragment", value = fragment, allowed = c("Y", "N", "all"))))
  }

  # Check data availability
  if (is.null(data_env$growth_individual)) {
    return(create_error(res, 500, "DATA_UNAVAILABLE",
                        "Growth data is not loaded. Please check server configuration.",
                        list()))
  }

  result <- data_env$growth_individual

  if (region != "") {
    regions <- trimws(strsplit(region, ",")[[1]])
    result <- result %>% filter(region %in% regions)
  }

  if (data_type != "") {
    types <- trimws(strsplit(data_type, ",")[[1]])
    result <- result %>% filter(data_type %in% types)
  }

  if (fragment != "" && fragment != "all") {
    result <- result %>% filter(fragment == !!fragment)
  }

  # Exclude Navassa outlier data unless explicitly requested via region filter
  # Navassa has anomalous growth (826 cm²/yr mean, ~10× expected) due to

  # long observation intervals (2.5-3 years). Flag it.
  navassa_excluded <- FALSE
  if (region == "" || tolower(region) == "all") {
    n_navassa <- sum(result$region == "Navassa", na.rm = TRUE)
    if (n_navassa > 0) {
      result <- result %>% filter(region != "Navassa")
      navassa_excluded <- TRUE
    }
  }

  if (nrow(result) < 10) {
    return(create_error(res, 400, "INSUFFICIENT_DATA",
                        "Not enough data for reliable growth statistics",
                        list(n = nrow(result), minimum_required = 10,
                             filters = list(region = region, data_type = data_type, fragment = fragment))))
  }

  summary_result <- result %>%
    mutate(size_class = cut(size_cm2, breaks = SIZE_BREAKS, labels = SIZE_LABELS,
                            include.lowest = TRUE)) %>%
    group_by(size_class) %>%
    summarise(
      n = n(),
      mean_growth = mean(growth_cm2_yr, na.rm = TRUE),
      sd_growth = sd(growth_cm2_yr, na.rm = TRUE),
      median_growth = median(growth_cm2_yr, na.rm = TRUE),
      q25 = quantile(growth_cm2_yr, 0.25, na.rm = TRUE),
      q75 = quantile(growth_cm2_yr, 0.75, na.rm = TRUE),
      pct_shrinking = mean(growth_cm2_yr < 0, na.rm = TRUE) * 100,
      pct_growing = mean(growth_cm2_yr > 0, na.rm = TRUE) * 100,
      .groups = "drop"
    )

  meta <- list(
    total_records = nrow(result),
    size_classes = nrow(summary_result)
  )

  if (navassa_excluded) {
    meta$warnings <- list("Navassa region excluded (outlier growth rates due to long observation intervals)")
  }

  list(
    error = FALSE,
    data = summary_result,
    meta = meta
  )
}

#* Get growth rate distributions for histograms
#* @param region Comma-separated list of regions
#* @param data_type Comma-separated list of data types
#* @get /distribution
function(req, res, region = "", data_type = "") {

  # Check data availability
  if (is.null(data_env$growth_individual)) {
    return(create_error(res, 500, "DATA_UNAVAILABLE",
                        "Growth data is not loaded. Please check server configuration.",
                        list()))
  }

  result <- data_env$growth_individual

  if (region != "") {
    regions <- strsplit(region, ",")[[1]]
    result <- result %>% filter(region %in% regions)
  }

  if (data_type != "") {
    types <- strsplit(data_type, ",")[[1]]
    result <- result %>% filter(data_type %in% types)
  }

  if (nrow(result) == 0) {
    return(create_error(res, 404, "NO_DATA_FOUND",
                        "No growth records match the specified filters",
                        list(filters = list(region = region, data_type = data_type))))
  }

  distribution_data <- result %>%
    select(id, size_cm2, growth_cm2_yr, data_type, region, study)

  list(
    error = FALSE,
    data = distribution_data,
    meta = list(
      total_records = nrow(distribution_data)
    )
  )
}

#* Get growth by study (for forest plot / comparison)
#* @param region Comma-separated list of regions
#* @param data_type Comma-separated list of data types
#* @get /by-study
function(req, res, region = "", data_type = "") {

  # Check data availability
  if (is.null(data_env$growth_individual)) {
    return(create_error(res, 500, "DATA_UNAVAILABLE",
                        "Growth data is not loaded. Please check server configuration.",
                        list()))
  }

  result <- data_env$growth_individual

  if (region != "") {
    regions <- strsplit(region, ",")[[1]]
    result <- result %>% filter(region %in% regions)
  }

  if (data_type != "") {
    types <- strsplit(data_type, ",")[[1]]
    result <- result %>% filter(data_type %in% types)
  }

  if (nrow(result) == 0) {
    return(create_error(res, 404, "NO_DATA_FOUND",
                        "No growth records match the specified filters",
                        list(filters = list(region = region, data_type = data_type))))
  }

  study_summary <- result %>%
    group_by(study) %>%
    summarise(
      n = n(),
      mean_growth = mean(growth_cm2_yr, na.rm = TRUE),
      sd_growth = sd(growth_cm2_yr, na.rm = TRUE),
      se = sd_growth / sqrt(n),
      ci_lower = mean_growth - 1.96 * se,
      ci_upper = mean_growth + 1.96 * se,
      median_growth = median(growth_cm2_yr, na.rm = TRUE),
      pct_shrinking = mean(growth_cm2_yr < 0, na.rm = TRUE) * 100,
      pct_growing = mean(growth_cm2_yr > 0, na.rm = TRUE) * 100,
      year_min = min(survey_yr, na.rm = TRUE),
      year_max = max(survey_yr, na.rm = TRUE),
      regions = paste(unique(region), collapse = ", "),
      .groups = "drop"
    ) %>%
    arrange(desc(n))

  # Add data quality warning for NOAA growth data
  noaa_stats <- study_summary %>% filter(grepl("NOAA", study, ignore.case = TRUE))
  warnings <- c()

  if (nrow(noaa_stats) > 0 && !is.na(noaa_stats$mean_growth[1]) && noaa_stats$mean_growth[1] < 0) {
    warnings <- c(warnings, sprintf("NOAA growth data shows mean shrinkage (%.0f cm²/yr) - interpret with caution",
                                     noaa_stats$mean_growth[1]))
  }

  if (nrow(noaa_stats) > 0 && !is.na(noaa_stats$pct_shrinking[1]) && noaa_stats$pct_shrinking[1] > 30) {
    warnings <- c(warnings, sprintf("%.0f%% of NOAA records show shrinkage",
                                     noaa_stats$pct_shrinking[1]))
  }

  list(
    error = FALSE,
    data = study_summary,
    meta = list(
      total_n = nrow(result),
      n_studies = n_distinct(result$study),
      warnings = warnings
    )
  )
}

#* Get growth by size class stratified by data type (natural vs restored)
#* Returns data for comparing field (natural) vs nursery (restored) corals
#* @param region Comma-separated list of regions
#* @get /by-size-and-type
function(req, res, region = "") {

  # Check data availability
  if (is.null(data_env$growth_individual)) {
    return(create_error(res, 500, "DATA_UNAVAILABLE",
                        "Growth data is not loaded. Please check server configuration.",
                        list()))
  }

  result <- data_env$growth_individual

  if (region != "") {
    regions <- strsplit(region, ",")[[1]]
    result <- result %>% filter(region %in% regions)
  }

  # Categorize data types into natural (field) vs restored (nursery)
  result <- result %>%
    mutate(
      coral_type = case_when(
        grepl("nursery", data_type, ignore.case = TRUE) ~ "Restored",
        data_type == "field" ~ "Natural",
        TRUE ~ "Other"
      )
    ) %>%
    filter(coral_type %in% c("Natural", "Restored"))

  if (nrow(result) < 10) {
    return(create_error(res, 400, "INSUFFICIENT_DATA",
                        "Not enough Natural or Restored coral data for this analysis",
                        list(n = nrow(result), minimum_required = 10,
                             filters = list(region = region))))
  }

  summary_result <- result %>%
    mutate(size_class = cut(size_cm2, breaks = SIZE_BREAKS, labels = SIZE_LABELS,
                            include.lowest = TRUE)) %>%
    group_by(size_class, coral_type) %>%
    summarise(
      n = n(),
      mean_growth = mean(growth_cm2_yr, na.rm = TRUE),
      sd_growth = sd(growth_cm2_yr, na.rm = TRUE),
      se = sd_growth / sqrt(n),
      ci_lower = mean_growth - 1.96 * se,
      ci_upper = mean_growth + 1.96 * se,
      median_growth = median(growth_cm2_yr, na.rm = TRUE),
      q25 = quantile(growth_cm2_yr, 0.25, na.rm = TRUE),
      q75 = quantile(growth_cm2_yr, 0.75, na.rm = TRUE),
      pct_shrinking = mean(growth_cm2_yr < 0, na.rm = TRUE) * 100,
      pct_growing = mean(growth_cm2_yr > 0, na.rm = TRUE) * 100,
      .groups = "drop"
    ) %>%
    filter(!is.na(size_class))

  list(
    error = FALSE,
    data = summary_result,
    meta = list(
      total_records = nrow(result),
      coral_types = unique(result$coral_type)
    )
  )
}

#* Get fragmentation/partial mortality by size and data type
#* Returns percentage of corals experiencing shrinkage (proxy for fragmentation)
#* @param region Comma-separated list of regions
#* @get /fragmentation-by-size
function(req, res, region = "") {

  # Check data availability
  if (is.null(data_env$growth_individual)) {
    return(create_error(res, 500, "DATA_UNAVAILABLE",
                        "Growth data is not loaded. Please check server configuration.",
                        list()))
  }

  result <- data_env$growth_individual

  if (region != "") {
    regions <- strsplit(region, ",")[[1]]
    result <- result %>% filter(region %in% regions)
  }

  # Categorize data types
  result <- result %>%
    mutate(
      coral_type = case_when(
        grepl("nursery", data_type, ignore.case = TRUE) ~ "Restored",
        data_type == "field" ~ "Natural",
        TRUE ~ "Other"
      )
    ) %>%
    filter(coral_type %in% c("Natural", "Restored"))

  if (nrow(result) < 10) {
    return(create_error(res, 400, "INSUFFICIENT_DATA",
                        "Not enough Natural or Restored coral data for fragmentation analysis",
                        list(n = nrow(result), minimum_required = 10,
                             filters = list(region = region))))
  }

  summary_result <- result %>%
    mutate(
      size_class = cut(size_cm2, breaks = SIZE_BREAKS, labels = SIZE_LABELS,
                       include.lowest = TRUE),
      is_shrinking = growth_cm2_yr < 0,
      shrinkage_magnitude = ifelse(growth_cm2_yr < 0, abs(growth_cm2_yr), 0)
    ) %>%
    group_by(size_class, coral_type) %>%
    summarise(
      n = n(),
      n_shrinking = sum(is_shrinking, na.rm = TRUE),
      pct_shrinking = mean(is_shrinking, na.rm = TRUE) * 100,
      se = sqrt(pct_shrinking/100 * (1 - pct_shrinking/100) / n) * 100,
      ci_lower = pmax(0, pct_shrinking - 1.96 * se),
      ci_upper = pmin(100, pct_shrinking + 1.96 * se),
      mean_shrinkage = mean(shrinkage_magnitude[is_shrinking], na.rm = TRUE),
      median_shrinkage = median(shrinkage_magnitude[is_shrinking], na.rm = TRUE),
      .groups = "drop"
    ) %>%
    filter(!is.na(size_class))

  list(
    error = FALSE,
    data = summary_result,
    meta = list(
      total_records = nrow(result)
    )
  )
}

#* Get probability of positive growth by size (continuous curve)
#* Returns fitted logistic model for probability of growth > 0 vs size
#* Key finding: shows at what size colonies reliably grow vs shrink
#* @param region Comma-separated list of regions
#* @param data_type Comma-separated list of data types
#* @param fragment Fragment status (Y, N, or all)
#* @get /positive-growth-probability
function(req, res, region = "", data_type = "", fragment = "all") {

  # Validate fragment parameter
  if (fragment != "" && fragment != "all" && !fragment %in% c("Y", "N")) {
    return(create_error(res, 400, "INVALID_PARAMETER",
                        "Fragment must be 'Y', 'N', 'all', or empty",
                        list(parameter = "fragment", value = fragment, allowed = c("Y", "N", "all"))))
  }

  # Check data availability
  if (is.null(data_env$growth_individual)) {
    return(create_error(res, 500, "DATA_UNAVAILABLE",
                        "Growth data is not loaded. Please check server configuration.",
                        list()))
  }

  result <- data_env$growth_individual

  if (region != "") {
    regions <- strsplit(region, ",")[[1]]
    result <- result %>% filter(region %in% regions)
  }

  if (data_type != "") {
    types <- strsplit(data_type, ",")[[1]]
    result <- result %>% filter(data_type %in% types)
  }

  if (fragment != "" && fragment != "all") {
    result <- result %>% filter(fragment == !!fragment)
  }

  # Filter valid data
  result <- result %>%
    filter(!is.na(growth_cm2_yr), !is.na(size_cm2), size_cm2 > 0)

  if (nrow(result) < 50) {
    return(create_error(res, 400, "INSUFFICIENT_DATA",
                        "Not enough data for model fitting (minimum 50 records required)",
                        list(n = nrow(result), minimum_required = 50,
                             filters = list(region = region, data_type = data_type, fragment = fragment))))
  }

  # Create binary outcome: positive growth vs not
  result <- result %>%
    mutate(positive_growth = as.integer(growth_cm2_yr > 0))

  # Fit logistic GLM for probability of positive growth
  model <- tryCatch({
    glm(positive_growth ~ log(size_cm2), data = result, family = binomial(link = "logit"))
  }, error = function(e) {
    list(error = TRUE, message = e$message)
  })

  if (is.list(model) && isTRUE(model$error)) {
    return(create_error(res, 500, "MODEL_FITTING_FAILED",
                        "GLM model fitting failed",
                        list(error_message = model$message)))
  }

  if (is.null(model)) {
    return(create_error(res, 500, "MODEL_FITTING_FAILED",
                        "GLM model fitting failed unexpectedly",
                        list()))
  }

  # Generate predictions across size range
  size_range <- exp(seq(log(1), log(max(result$size_cm2, na.rm = TRUE)), length.out = 100))
  newdata <- data.frame(size_cm2 = size_range)

  preds <- predict(model, newdata, type = "response", se.fit = TRUE)

  predictions <- data.frame(
    size_cm2 = size_range,
    prob_positive = preds$fit,
    ci_lower = pmax(0, preds$fit - 1.96 * preds$se.fit),
    ci_upper = pmin(1, preds$fit + 1.96 * preds$se.fit)
  )

  # Find threshold where probability crosses 50% and 70%
  find_threshold <- function(target_prob) {
    idx <- which.min(abs(predictions$prob_positive - target_prob))
    predictions$size_cm2[idx]
  }

  threshold_50 <- find_threshold(0.50)
  threshold_70 <- find_threshold(0.70)

  # Calculate binned data for scatter overlay
  binned <- result %>%
    mutate(size_bin = cut(log(size_cm2), breaks = 20)) %>%
    group_by(size_bin) %>%
    summarise(
      log_size = mean(log(size_cm2)),
      size_cm2 = exp(mean(log(size_cm2))),
      pct_positive = mean(positive_growth) * 100,
      n = n(),
      se = sqrt(pct_positive/100 * (1 - pct_positive/100) / n) * 100,
      .groups = "drop"
    ) %>%
    filter(!is.na(log_size), n >= 5)

  # Overall stats
  overall_pct_positive <- mean(result$positive_growth) * 100
  overall_pct_shrinking <- 100 - overall_pct_positive

  list(
    error = FALSE,
    predictions = predictions,
    binned = binned,
    thresholds = list(
      threshold_50_cm2 = round(threshold_50),
      threshold_70_cm2 = round(threshold_70)
    ),
    stats = list(
      n = nrow(result),
      pct_positive = round(overall_pct_positive, 1),
      pct_shrinking = round(overall_pct_shrinking, 1),
      interpretation = sprintf(
        "%.0f%% of colonies show positive growth. Colonies reach 70%% growth probability at ~%.0f cm².",
        overall_pct_positive, threshold_70
      )
    ),
    model_info = list(
      method = "Logistic GLM",
      formula = "P(growth > 0) ~ log(size_cm2)"
    )
  )
}

#* Get size class transition matrix
#* @param region Comma-separated list of regions
#* @param data_type Comma-separated list of data types
#* @get /transitions
function(req, res, region = "", data_type = "") {

  labels <- c("SC1", "SC2", "SC3", "SC4", "SC5")

  # Check data availability
  if (is.null(data_env$growth_individual)) {
    return(create_error(res, 500, "DATA_UNAVAILABLE",
                        "Growth data is not loaded. Please check server configuration.",
                        list()))
  }

  result <- data_env$growth_individual

  if (region != "") {
    regions <- strsplit(region, ",")[[1]]
    result <- result %>% filter(region %in% regions)
  }

  if (data_type != "") {
    types <- strsplit(data_type, ",")[[1]]
    result <- result %>% filter(data_type %in% types)
  }

  if (nrow(result) < 20) {
    return(create_error(res, 400, "INSUFFICIENT_DATA",
                        "Not enough data to compute transition matrix (minimum 20 records required)",
                        list(n = nrow(result), minimum_required = 20,
                             filters = list(region = region, data_type = data_type))))
  }

  transition_matrix <- result %>%
    mutate(
      initial_class = cut(size_cm2, SIZE_BREAKS, labels = labels, include.lowest = TRUE),
      final_size = size_cm2 + growth_cm2_yr,
      final_size = pmax(1, final_size),  # Minimum size 1 cm²
      final_class = cut(final_size, SIZE_BREAKS, labels = labels, include.lowest = TRUE)
    ) %>%
    filter(!is.na(initial_class), !is.na(final_class)) %>%
    count(initial_class, final_class) %>%
    group_by(initial_class) %>%
    mutate(prob = n / sum(n)) %>%
    select(-n) %>%
    pivot_wider(names_from = final_class, values_from = prob, values_fill = 0) %>%
    ungroup()

  list(
    error = FALSE,
    data = transition_matrix,
    meta = list(
      total_records = nrow(result),
      size_classes = labels
    )
  )
}
