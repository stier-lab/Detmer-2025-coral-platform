library(dplyr)

# Note: response helpers (create_error, create_success, create_empty) and %||%
# are loaded globally by plumber.R

#* Get overview statistics for dashboard
#* @get /overview
function(req, res) {

  # Check data availability
  if (is.null(data_env$survival_individual)) {
    return(create_error(res, 500, "DATA_UNAVAILABLE",
                        "Survival data is not loaded. Please check server configuration.",
                        list()))
  }

  surv <- data_env$survival_individual
  growth <- data_env$growth_individual

  overview_data <- list(
    total_observations = nrow(surv) + nrow(growth %||% data.frame()),
    survival_observations = nrow(surv),
    growth_observations = nrow(growth %||% data.frame()),
    total_studies = n_distinct(surv$study),
    total_regions = n_distinct(surv$region),
    total_sites = n_distinct(paste(surv$region, surv$location)),
    year_range = c(
      min(surv$survey_yr, na.rm = TRUE),
      max(surv$survey_yr, na.rm = TRUE)
    ),
    mean_survival = mean(surv$survived, na.rm = TRUE),
    mean_growth = if (!is.null(growth)) mean(growth$growth_cm2_yr, na.rm = TRUE) else NA,
    data_type_breakdown = surv %>%
      count(data_type) %>%
      as.list(),
    region_breakdown = surv %>%
      count(region, sort = TRUE) %>%
      as.list()
  )

  list(
    error = FALSE,
    data = overview_data,
    meta = list(
      total_records = nrow(surv)
    )
  )
}
