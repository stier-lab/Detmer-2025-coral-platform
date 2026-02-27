library(dplyr)
library(tidyr)

# Note: SIZE_BREAKS, SIZE_LABELS, %||%, response helpers (create_error, create_success, create_empty)
# are loaded globally by plumber.R

#* Get comprehensive quality metrics for the current data
#* @param region Comma-separated list of regions (optional)
#* @param data_type Comma-separated list of data types (optional)
#* @get /metrics
function(req, res, region = "", data_type = "") {

  # Check data availability
  if (is.null(data_env$survival_individual)) {
    return(create_error(res, 500, "DATA_UNAVAILABLE",
                        "Survival data is not loaded. Please check server configuration.",
                        list()))
  }

  data <- data_env$survival_individual

  # Apply filters if provided
  if (region != "") {
    regions <- strsplit(region, ",")[[1]]
    data <- data %>% filter(region %in% regions)
  }

  if (data_type != "") {
    types <- strsplit(data_type, ",")[[1]]
    data <- data %>% filter(data_type %in% types)
  }

  # Handle empty data case with 404
  if (nrow(data) == 0) {
    return(create_error(res, 404, "NO_DATA_FOUND",
                        "No data available for selected filters",
                        list(filters = list(region = region, data_type = data_type))))
  }

  # Calculate R-squared for size-survival relationship
  r_squared <- tryCatch({
    # Ensure valid size values for log transform
    valid_data <- data %>%
      filter(!is.na(size_cm2), size_cm2 > 0, !is.na(survived))

    if (nrow(valid_data) < 10) {
      NA
    } else {
      model <- glm(survived ~ log(size_cm2), data = valid_data, family = binomial)
      null_model <- glm(survived ~ 1, data = valid_data, family = binomial)
      # McFadden's pseudo R-squared
      1 - (logLik(model) / logLik(null_model))
    }
  }, error = function(e) NA)

  # Calculate study dominance
  study_counts <- data %>%
    count(study, sort = TRUE) %>%
    mutate(pct = n / sum(n) * 100)

  dominant_study <- list(
    name = study_counts$study[1],
    n = study_counts$n[1],
    pct = round(study_counts$pct[1], 1)
  )

  # Check for fragment/colony mix
  fragment_counts <- data %>%
    count(fragment) %>%
    mutate(pct = n / sum(n) * 100)

  fragment_pct <- fragment_counts$pct[fragment_counts$fragment == "Y"]
  if (length(fragment_pct) == 0) fragment_pct <- 0

  colony_pct <- fragment_counts$pct[fragment_counts$fragment == "N"]
  if (length(colony_pct) == 0) colony_pct <- 0

  fragment_mix <- fragment_pct > 5 && colony_pct > 5

  # Calculate sample size by size class
  size_class_n <- data %>%
    mutate(size_class = cut(size_cm2, breaks = SIZE_BREAKS, labels = SIZE_LABELS,
                            include.lowest = TRUE)) %>%
    count(size_class)

  # Generate warnings based on data quality
  warnings <- list()

  if (!is.na(r_squared) && r_squared < 0.10) {
    warnings <- c(warnings, sprintf(
      "Size explains only %.1f%% of survival variance - other factors dominate",
      r_squared * 100
    ))
  }

  if (dominant_study$pct > 50) {
    warnings <- c(warnings, sprintf(
      "%s provides %.0f%% of data - results may not generalize to other populations",
      dominant_study$name, dominant_study$pct
    ))
  }

  if (fragment_mix) {
    warnings <- c(warnings, sprintf(
      "Data contains mixed fragments (%.0f%%) and colonies (%.0f%%) - consider analyzing separately",
      fragment_pct, colony_pct
    ))
  }

  # Check for low sample sizes in size classes
  low_n_classes <- size_class_n %>% filter(n < 30)
  if (nrow(low_n_classes) > 0) {
    warnings <- c(warnings, sprintf(
      "Limited data (n < 30) in size classes: %s",
      paste(low_n_classes$size_class, collapse = ", ")
    ))
  }

  # Check geographic coverage
  n_regions <- n_distinct(data$region)
  if (n_regions < 3) {
    warnings <- c(warnings, sprintf(
      "Data from only %d region(s) - limited geographic generalizability",
      n_regions
    ))
  }

  metrics_data <- list(
    r_squared = if (!is.na(r_squared)) round(as.numeric(r_squared), 4) else NA,
    sample_size = nrow(data),
    n_studies = n_distinct(data$study),
    n_regions = n_distinct(data$region),
    dominant_study = dominant_study,
    fragment_mix = fragment_mix,
    fragment_pct = round(fragment_pct, 1),
    size_class_n = size_class_n,
    year_range = c(min(data$survey_yr, na.rm = TRUE), max(data$survey_yr, na.rm = TRUE)),
    using_mock_data = data_env$using_mock_data %||% FALSE,
    warnings = warnings
  )

  list(
    error = FALSE,
    data = metrics_data,
    meta = list(
      total_records = nrow(data)
    )
  )
}

#* Get data certainty matrix by size class and region
#* @get /certainty-matrix
function(req, res) {

  # Check data availability
  if (is.null(data_env$survival_individual)) {
    return(create_error(res, 500, "DATA_UNAVAILABLE",
                        "Survival data is not loaded. Please check server configuration.",
                        list()))
  }

  data <- data_env$survival_individual

  # Handle empty data
  if (nrow(data) == 0) {
    return(create_error(res, 404, "NO_DATA_FOUND",
                        "No survival data available for certainty matrix calculation",
                        list()))
  }

  # Calculate certainty score for each size class x region combination
  certainty_matrix <- data %>%
    mutate(size_class = cut(size_cm2, breaks = SIZE_BREAKS, labels = SIZE_LABELS,
                            include.lowest = TRUE)) %>%
    filter(!is.na(size_class)) %>%
    group_by(size_class, region) %>%
    summarise(
      n = n(),
      n_studies = n_distinct(study),
      n_years = n_distinct(survey_yr),
      survival_rate = mean(survived, na.rm = TRUE),
      .groups = "drop"
    ) %>%
    mutate(
      # Calculate certainty score (1-5) based on multiple factors
      certainty = case_when(
        n < 10 | n_studies < 2 ~ 1,       # Very low
        n < 30 ~ 2,                        # Low
        n < 100 | n_studies < 3 ~ 3,       # Moderate
        n < 500 | n_years < 3 ~ 4,         # Good
        TRUE ~ 5                           # High
      ),
      # Generate tooltip text
      tooltip = sprintf(
        "n=%d, %d studies, %d years, survival=%.0f%%",
        n, n_studies, n_years, survival_rate * 100
      )
    )

  # Pivot to wide format for heatmap
  matrix_wide <- certainty_matrix %>%
    select(size_class, region, certainty, tooltip, n, survival_rate) %>%
    arrange(size_class, region)

  # Calculate gap prioritization
  gaps <- certainty_matrix %>%
    filter(certainty <= 2) %>%
    arrange(certainty, desc(n)) %>%
    mutate(priority = row_number()) %>%
    select(size_class, region, certainty, n, priority)

  certainty_data <- list(
    matrix = matrix_wide,
    regions = unique(certainty_matrix$region),
    size_classes = SIZE_LABELS,
    gaps = gaps,
    legend = list(
      "1" = "Very low certainty (n < 10 or single study)",
      "2" = "Low certainty (n < 30)",
      "3" = "Moderate certainty (n 30-100, 2+ studies)",
      "4" = "Good certainty (n 100-500, 3+ studies)",
      "5" = "High certainty (n > 500, multiple studies & years)"
    )
  )

  list(
    error = FALSE,
    data = certainty_data,
    meta = list(
      total_records = nrow(certainty_matrix)
    )
  )
}

#* Get data coverage summary
#* @get /coverage
function(req, res) {

  # Check data availability
  if (is.null(data_env$survival_individual)) {
    return(create_error(res, 500, "DATA_UNAVAILABLE",
                        "Survival data is not loaded. Please check server configuration.",
                        list()))
  }

  surv <- data_env$survival_individual
  growth <- data_env$growth_individual

  # Handle empty data
  if (nrow(surv) == 0) {
    return(create_error(res, 404, "NO_DATA_FOUND",
                        "No data available for coverage summary",
                        list()))
  }

  # Calculate coverage by various dimensions
  survival_coverage <- list(
    total = nrow(surv),
    by_region = surv %>% count(region, sort = TRUE) %>% as.list(),
    by_data_type = surv %>% count(data_type) %>% as.list(),
    by_size_class = surv %>%
      mutate(size_class = cut(size_cm2, breaks = SIZE_BREAKS, labels = SIZE_LABELS,
                              include.lowest = TRUE)) %>%
      count(size_class) %>%
      as.list()
  )

  growth_coverage <- if (!is.null(growth) && nrow(growth) > 0) {
    list(
      total = nrow(growth),
      by_region = growth %>% count(region, sort = TRUE) %>% as.list(),
      by_data_type = growth %>% count(data_type) %>% as.list()
    )
  } else {
    list(total = 0)
  }

  # Geographic coverage
  geographic <- surv %>%
    group_by(region) %>%
    summarise(
      n_sites = n_distinct(location),
      n_studies = n_distinct(study),
      lat_range = sprintf("%.1f - %.1f", min(latitude, na.rm = TRUE), max(latitude, na.rm = TRUE)),
      lon_range = sprintf("%.1f - %.1f", min(longitude, na.rm = TRUE), max(longitude, na.rm = TRUE)),
      .groups = "drop"
    )

  # Temporal coverage
  temporal <- surv %>%
    group_by(survey_yr) %>%
    summarise(
      n = n(),
      n_studies = n_distinct(study),
      n_regions = n_distinct(region),
      .groups = "drop"
    ) %>%
    arrange(survey_yr)

  coverage_data <- list(
    survival = survival_coverage,
    growth = growth_coverage,
    geographic = geographic,
    temporal = temporal,
    using_mock_data = data_env$using_mock_data %||% FALSE
  )

  list(
    error = FALSE,
    data = coverage_data,
    meta = list(
      total_records = nrow(surv)
    )
  )
}
