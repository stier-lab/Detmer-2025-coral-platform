library(dplyr)

# Note: SIZE_BREAKS, SIZE_LABELS, response helpers (create_error, create_success, create_empty),
# and validate_numeric_param are loaded globally by plumber.R

#* Get individual survival records with filtering
#* @param region Comma-separated list of regions
#* @param data_type Comma-separated list of data types
#* @param year_min Minimum survey year
#* @param year_max Maximum survey year
#* @param size_min Minimum size (cm2)
#* @param size_max Maximum size (cm2)
#* @param fragment Fragment status (Y, N, or omit for all)
#* @get /individual
function(req, res, region = "", data_type = "", year_min = 2000, year_max = 2025,
         size_min = 0, size_max = 200000, fragment = NULL) {

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

  size_min_v <- validate_numeric_param(size_min, "size_min", min_val = 0)
  if (!size_min_v$valid) {
    return(create_error(res, 400, "INVALID_PARAMETER", size_min_v$message,
                        list(parameter = "size_min", value = size_min)))
  }

  size_max_v <- validate_numeric_param(size_max, "size_max", min_val = 0)
  if (!size_max_v$valid) {
    return(create_error(res, 400, "INVALID_PARAMETER", size_max_v$message,
                        list(parameter = "size_max", value = size_max)))
  }

  # Validate year range logic
  if (year_min_v$value > year_max_v$value) {
    return(create_error(res, 400, "INVALID_RANGE", "year_min cannot be greater than year_max",
                        list(year_min = year_min_v$value, year_max = year_max_v$value)))
  }

  # Validate size range logic
  if (size_min_v$value > size_max_v$value) {
    return(create_error(res, 400, "INVALID_RANGE", "size_min cannot be greater than size_max",
                        list(size_min = size_min_v$value, size_max = size_max_v$value)))
  }

  # Validate fragment parameter
  if (!is.null(fragment) && fragment != "" && fragment != "all" && !fragment %in% c("Y", "N")) {
    return(create_error(res, 400, "INVALID_PARAMETER",
                        "Fragment must be 'Y', 'N', 'all', or omitted",
                        list(parameter = "fragment", value = fragment, allowed = c("Y", "N", "all"))))
  }

  # Check if data is available
  if (is.null(data_env$survival_individual)) {
    return(create_error(res, 500, "DATA_UNAVAILABLE",
                        "Survival data is not loaded. Please check server configuration.",
                        list()))
  }

  result <- data_env$survival_individual

  # Apply filters
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
      survey_yr <= year_max_v$value,
      size_cm2 >= size_min_v$value,
      size_cm2 <= size_max_v$value
    )

  if (!is.null(fragment) && fragment != "" && fragment != "all") {
    result <- result %>% filter(fragment == !!fragment)
  }

  # Return 404 if no data found after filtering
  if (nrow(result) == 0) {
    return(create_error(res, 404, "NO_DATA_FOUND",
                        "No survival records match the specified filters",
                        list(filters = list(region = region, data_type = data_type,
                                            year_range = c(year_min_v$value, year_max_v$value),
                                            size_range = c(size_min_v$value, size_max_v$value),
                                            fragment = fragment))))
  }

  list(
    error = FALSE,
    data = result,
    meta = list(
      total_records = nrow(result),
      regions = unique(result$region),
      studies = unique(result$study),
      year_range = c(min(result$survey_yr, na.rm = TRUE),
                     max(result$survey_yr, na.rm = TRUE))
    )
  )
}

#* Get survival rates by size class
#* @param region Comma-separated list of regions
#* @param data_type Comma-separated list of data types
#* @param fragment Fragment status (Y, N, or all)
#* @param breaks Comma-separated size class boundaries (default: PRD v2.0 definitions)
#* @get /by-size
function(req, res, region = "", data_type = "", fragment = "all", breaks = "0,25,100,500,2000,Inf") {

  # Validate fragment parameter
  if (fragment != "" && fragment != "all" && !fragment %in% c("Y", "N")) {
    return(create_error(res, 400, "INVALID_PARAMETER",
                        "Fragment must be 'Y', 'N', 'all', or empty",
                        list(parameter = "fragment", value = fragment, allowed = c("Y", "N", "all"))))
  }

  # Parse and validate breaks
  brks <- suppressWarnings(as.numeric(strsplit(breaks, ",")[[1]]))
  if (any(is.na(brks[-length(brks)]))) {  # Allow "Inf" as last element
    return(create_error(res, 400, "INVALID_PARAMETER",
                        "Breaks must be comma-separated numeric values",
                        list(parameter = "breaks", value = breaks)))
  }
  brks[length(brks)] <- Inf

  # Check data availability
  if (is.null(data_env$survival_individual)) {
    return(create_error(res, 500, "DATA_UNAVAILABLE",
                        "Survival data is not loaded. Please check server configuration.",
                        list()))
  }

  result <- data_env$survival_individual

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

  # Check for insufficient data
  if (nrow(result) < 10) {
    return(create_error(res, 400, "INSUFFICIENT_DATA",
                        "Not enough data for reliable survival rate calculation",
                        list(n = nrow(result), minimum_required = 10,
                             filters = list(region = region, data_type = data_type, fragment = fragment))))
  }

  summary_result <- result %>%
    mutate(size_class = cut(size_cm2, breaks = brks,
                            labels = if (length(brks) - 1 == length(SIZE_LABELS)) SIZE_LABELS
                                     else paste0("SC", seq_len(length(brks) - 1)),
                            include.lowest = TRUE)) %>%
    group_by(size_class) %>%
    summarise(
      n = n(),
      n_survived = sum(survived, na.rm = TRUE),
      survival_rate = mean(survived, na.rm = TRUE),
      se = sqrt(survival_rate * (1 - survival_rate) / n),
      ci_lower = pmax(0, survival_rate - 1.96 * se),
      ci_upper = pmin(1, survival_rate + 1.96 * se),
      .groups = "drop"
    )

  list(
    error = FALSE,
    data = summary_result,
    meta = list(
      total_records = nrow(result),
      size_classes = nrow(summary_result)
    )
  )
}

#* Get fitted survival model predictions
#* @param region Comma-separated list of regions
#* @param data_type Comma-separated list of data types
#* @get /model
function(req, res, region = "", data_type = "") {

  # Check data availability
  if (is.null(data_env$survival_individual)) {
    return(create_error(res, 500, "DATA_UNAVAILABLE",
                        "Survival data is not loaded. Please check server configuration.",
                        list()))
  }

  result <- data_env$survival_individual

  if (region != "") {
    regions <- strsplit(region, ",")[[1]]
    result <- result %>% filter(region %in% regions)
  }

  if (data_type != "") {
    types <- strsplit(data_type, ",")[[1]]
    result <- result %>% filter(data_type %in% types)
  }

  if (nrow(result) < 30) {
    return(create_error(res, 400, "INSUFFICIENT_DATA",
                        "Not enough data for model fitting (minimum 30 records required)",
                        list(n = nrow(result), minimum_required = 30,
                             filters = list(region = region, data_type = data_type))))
  }

  # Filter out zero/negative sizes before log transform
  result <- result %>% filter(size_cm2 > 0)

  if (nrow(result) < 30) {
    return(create_error(res, 400, "INSUFFICIENT_DATA",
                        "Not enough valid data after filtering zero/negative sizes",
                        list(n = nrow(result), minimum_required = 30,
                             reason = "Records with size_cm2 <= 0 excluded for log transformation")))
  }

  # Fit binomial GLM
  model <- tryCatch({
    glm(survived ~ log(size_cm2), data = result, family = binomial(link = "logit"))
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

  # Calculate R-squared (McFadden's pseudo R-squared)
  r_squared <- 1 - model$deviance / model$null.deviance

  # Generate predictions
  size_range <- seq(1, max(result$size_cm2, na.rm = TRUE), length.out = 100)
  newdata <- data.frame(size_cm2 = size_range)

  preds <- predict(model, newdata, type = "response", se.fit = TRUE)

  list(
    error = FALSE,
    predictions = data.frame(
      size_cm2 = size_range,
      survival_prob = preds$fit,
      ci_lower = pmax(0, preds$fit - 1.96 * preds$se.fit),
      ci_upper = pmin(1, preds$fit + 1.96 * preds$se.fit)
    ),
    model_info = list(
      r_squared = r_squared,
      n = nrow(result),
      deviance_explained = round(r_squared * 100, 1)
    )
  )
}

#* Get survival by size class stratified by data type (natural vs restored)
#* Returns data for comparing field (natural) vs nursery (restored) corals
#* @param region Comma-separated list of regions
#* @get /by-size-and-type
function(req, res, region = "") {

  # Check data availability
  if (is.null(data_env$survival_individual)) {
    return(create_error(res, 500, "DATA_UNAVAILABLE",
                        "Survival data is not loaded. Please check server configuration.",
                        list()))
  }

  result <- data_env$survival_individual

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
      n_survived = sum(survived, na.rm = TRUE),
      survival_rate = mean(survived, na.rm = TRUE),
      se = sqrt(survival_rate * (1 - survival_rate) / n),
      ci_lower = pmax(0, survival_rate - 1.96 * se),
      ci_upper = pmin(1, survival_rate + 1.96 * se),
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

#* Get survival estimates by study (for forest plot)
#* @param region Comma-separated list of regions
#* @param data_type Comma-separated list of data types
#* @get /by-study
function(req, res, region = "", data_type = "") {

  # Check data availability
  if (is.null(data_env$survival_individual)) {
    return(create_error(res, 500, "DATA_UNAVAILABLE",
                        "Survival data is not loaded. Please check server configuration.",
                        list()))
  }

  result <- data_env$survival_individual

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
                        "No survival records match the specified filters",
                        list(filters = list(region = region, data_type = data_type))))
  }

  summary_result <- result %>%
    group_by(study, region) %>%
    summarise(
      n = n(),
      survival_rate = mean(survived, na.rm = TRUE),
      se = sqrt(survival_rate * (1 - survival_rate) / n),
      ci_lower = pmax(0, survival_rate - 1.96 * se),
      ci_upper = pmin(1, survival_rate + 1.96 * se),
      year_min = min(survey_yr, na.rm = TRUE),
      year_max = max(survey_yr, na.rm = TRUE),
      .groups = "drop"
    ) %>%
    arrange(desc(n))  # Sort by sample size (largest first) for forest plot

  list(
    error = FALSE,
    data = summary_result,
    meta = list(
      total_records = nrow(result),
      n_studies = n_distinct(result$study)
    )
  )
}

#* Get survival summary stratified by study and fragment status (PRD v2.0 default view)
#* @param fragment_status Filter: "Y", "N", "all" (default)
#* @get /by-study-stratified
function(req, res, fragment_status = "all") {

  # Validate fragment_status parameter
  if (fragment_status != "all" && fragment_status != "" && !fragment_status %in% c("Y", "N")) {
    return(create_error(res, 400, "INVALID_PARAMETER",
                        "fragment_status must be 'Y', 'N', 'all', or empty",
                        list(parameter = "fragment_status", value = fragment_status,
                             allowed = c("Y", "N", "all"))))
  }

  # Check data availability
  if (is.null(data_env$survival_individual)) {
    return(create_error(res, 500, "DATA_UNAVAILABLE",
                        "Survival data is not loaded. Please check server configuration.",
                        list()))
  }

  data <- data_env$survival_individual

  if (fragment_status != "all" && fragment_status != "") {
    data <- data %>% filter(fragment == fragment_status)
  }

  if (nrow(data) == 0) {
    return(create_error(res, 404, "NO_DATA_FOUND",
                        "No survival records match the specified fragment status",
                        list(fragment_status = fragment_status)))
  }

  # Calculate study-level summaries
  study_summary <- data %>%
    group_by(study, fragment) %>%
    summarise(
      n = n(),
      survival_rate = mean(survived, na.rm = TRUE),
      se = sqrt(survival_rate * (1 - survival_rate) / n),
      ci_lower = pmax(0, survival_rate - 1.96 * se),
      ci_upper = pmin(1, survival_rate + 1.96 * se),
      mean_size = mean(size_cm2, na.rm = TRUE),
      median_size = median(size_cm2, na.rm = TRUE),
      size_min = min(size_cm2, na.rm = TRUE),
      size_max = max(size_cm2, na.rm = TRUE),
      year_min = min(survey_yr, na.rm = TRUE),
      year_max = max(survey_yr, na.rm = TRUE),
      regions = paste(unique(region), collapse = ", "),
      .groups = "drop"
    ) %>%
    arrange(desc(n))

  # Calculate quality metrics
  total_n <- nrow(data)
  dominant_study <- study_summary %>%
    group_by(study) %>%
    summarise(study_n = sum(n), .groups = "drop") %>%
    arrange(desc(study_n)) %>%
    slice(1)

  fragment_mix <- data %>%
    count(fragment) %>%
    mutate(pct = round(n / sum(n) * 100, 1))

  # Calculate overall R-squared if possible
  r_squared <- tryCatch({
    data_valid <- data %>% filter(size_cm2 > 0)
    if (nrow(data_valid) >= 30) {
      model <- glm(survived ~ log(size_cm2), data = data_valid, family = binomial)
      1 - model$deviance / model$null.deviance
    } else {
      NA
    }
  }, error = function(e) NA)

  list(
    error = FALSE,
    data = study_summary,
    meta = list(
      total_n = total_n,
      n_studies = n_distinct(data$study),
      quality = list(
        r_squared = r_squared,
        dominant_study = list(
          name = dominant_study$study,
          n = dominant_study$study_n,
          pct = round(dominant_study$study_n / total_n * 100, 1)
        ),
        fragment_mix = fragment_mix,
        warnings = generate_warnings(total_n, r_squared, dominant_study$study_n / total_n, fragment_mix)
      )
    )
  )
}

# Helper function to generate data quality warnings
generate_warnings <- function(n, r_squared, dominant_pct, fragment_mix) {
  warnings <- c()

  if (!is.na(r_squared) && r_squared < 0.1) {
    warnings <- c(warnings, sprintf("Size explains only %.1f%% of survival variance", r_squared * 100))
  }

  if (dominant_pct > 0.5) {
    warnings <- c(warnings, sprintf("%.0f%% of data from single study", dominant_pct * 100))
  }

  if (nrow(fragment_mix) > 1) {
    frag_y <- fragment_mix$pct[fragment_mix$fragment == "Y"]
    frag_n <- fragment_mix$pct[fragment_mix$fragment == "N"]
    if (length(frag_y) > 0 && length(frag_n) > 0 && frag_y > 10 && frag_n > 10) {
      warnings <- c(warnings, "Fragment and colony data mixed - consider stratifying")
    }
  }

  if (n < 100) {
    warnings <- c(warnings, sprintf("Limited sample size (n=%d)", n))
  }

  warnings
}
