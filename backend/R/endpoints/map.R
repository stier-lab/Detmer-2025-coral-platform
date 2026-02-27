library(dplyr)

# Note: response helpers (create_error, create_success, create_empty)
# are loaded globally by plumber.R

#* Get all site locations
#* @param region Comma-separated list of regions
#* @param data_type Comma-separated list of data types
#* @get /sites
function(req, res, region = "", data_type = "") {

  # Check data availability
  if (is.null(data_env$survival_individual)) {
    return(create_error(res, 500, "DATA_UNAVAILABLE",
                        "Survival data is not loaded. Please check server configuration.",
                        list()))
  }

  # Aggregate site-level statistics from survival data
  # Group by region + location only to avoid duplicates from different plots
  sites <- data_env$survival_individual %>%
    group_by(region, location) %>%
    summarise(
      site_id = paste(first(region), first(location), sep = "_"),
      # Use median coordinates to get center of all plots at this site
      latitude = median(latitude, na.rm = TRUE),
      longitude = median(longitude, na.rm = TRUE),
      total_observations = n(),
      survival_rate = mean(survived, na.rm = TRUE),
      studies = paste(unique(study), collapse = ", "),
      data_types = paste(unique(data_type), collapse = ", "),
      depth_m = median(depth_m, na.rm = TRUE),
      .groups = "drop"
    )

  # Add growth data if available
  if (!is.null(data_env$growth_individual)) {
    growth_summary <- data_env$growth_individual %>%
      group_by(region, location) %>%
      summarise(
        mean_growth = mean(growth_cm2_yr, na.rm = TRUE),
        .groups = "drop"
      )

    sites <- sites %>%
      left_join(growth_summary, by = c("region", "location"))
  } else {
    sites$mean_growth <- NA
  }

  # Apply filters
  if (region != "" && !tolower(region) %in% c("all", "all regions")) {
    regions <- trimws(strsplit(region, ",")[[1]])
    sites <- sites %>% filter(region %in% regions)
  }

  if (data_type != "" && !tolower(data_type) %in% c("all", "all types")) {
    types <- trimws(strsplit(data_type, ",")[[1]])
    # Use fixed string matching instead of regex to prevent injection
    sites <- sites %>%
      filter(sapply(data_types, function(dt) {
        any(types %in% trimws(strsplit(dt, ",")[[1]]))
      }))
  }

  result <- sites %>%
    select(
      site_id, name = location, region, latitude, longitude,
      depth_m, total_observations, survival_rate, mean_growth, studies
    )

  # Return 404 if no sites found after filtering
  if (nrow(result) == 0) {
    return(create_error(res, 404, "NO_DATA_FOUND",
                        "No sites match the specified filters",
                        list(filters = list(region = region, data_type = data_type))))
  }

  list(
    error = FALSE,
    data = result,
    meta = list(
      total_records = nrow(result),
      regions = unique(result$region)
    )
  )
}

#* Get region summary statistics
#* @get /regions
function(req, res) {

  # Check data availability
  if (is.null(data_env$survival_individual)) {
    return(create_error(res, 500, "DATA_UNAVAILABLE",
                        "Survival data is not loaded. Please check server configuration.",
                        list()))
  }

  surv <- data_env$survival_individual
  growth <- data_env$growth_individual

  surv_summary <- surv %>%
    group_by(region) %>%
    summarise(
      n_sites = n_distinct(location),
      n_observations = n(),
      n_studies = n_distinct(study),
      mean_survival = mean(survived, na.rm = TRUE),
      lat_center = mean(latitude, na.rm = TRUE),
      lon_center = mean(longitude, na.rm = TRUE),
      .groups = "drop"
    ) %>%
    arrange(desc(n_observations))

  if (!is.null(growth) && nrow(growth) > 0) {
    growth_summary <- growth %>%
      group_by(region) %>%
      summarise(
        growth_n = n(),
        mean_growth = mean(growth_cm2_yr, na.rm = TRUE),
        .groups = "drop"
      )

    surv_summary <- surv_summary %>%
      left_join(growth_summary, by = "region")
  } else {
    surv_summary$growth_n <- 0
    surv_summary$mean_growth <- NA_real_
  }

  # Handle empty data
  if (nrow(surv_summary) == 0) {
    return(create_error(res, 404, "NO_DATA_FOUND",
                        "No region data available",
                        list()))
  }

  list(
    error = FALSE,
    data = surv_summary,
    meta = list(
      total_records = nrow(surv_summary)
    )
  )
}
