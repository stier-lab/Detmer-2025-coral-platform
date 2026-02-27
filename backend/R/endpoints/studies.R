library(dplyr)

# Note: SIZE_BREAKS, SIZE_LABELS, response helpers (create_error, create_success, create_empty)
# are loaded globally by plumber.R

#* Get all study metadata
#* @get /
function(req, res) {

  # Check data availability
  if (is.null(data_env$survival_individual)) {
    return(create_error(res, 500, "DATA_UNAVAILABLE",
                        "Survival data is not loaded. Please check server configuration.",
                        list()))
  }

  # Generate study metadata from survival data
  studies <- data_env$survival_individual %>%
    group_by(study) %>%
    summarise(
      study_id = gsub(" ", "_", tolower(first(study))),
      study_name = first(study),
      year_start = min(survey_yr, na.rm = TRUE),
      year_end = max(survey_yr, na.rm = TRUE),
      regions = paste(unique(region), collapse = ", "),
      data_types = paste(unique(data_type), collapse = ", "),
      sample_size = n(),
      has_individual_data = TRUE,
      mean_survival = mean(survived, na.rm = TRUE),
      .groups = "drop"
    )

  # Add growth data sample sizes
  if (!is.null(data_env$growth_individual)) {
    growth_counts <- data_env$growth_individual %>%
      group_by(study) %>%
      summarise(growth_n = n(), .groups = "drop")

    studies <- studies %>%
      left_join(growth_counts, by = "study") %>%
      mutate(growth_n = coalesce(growth_n, 0L))
  }

  result <- studies %>%
    mutate(
      citation = paste0(study_name, " (", year_start, "-", year_end, ")"),
      doi = NA_character_,
      notes = NA_character_
    ) %>%
    arrange(study_name)

  list(
    error = FALSE,
    data = result,
    meta = list(
      total_records = nrow(result)
    )
  )
}

#* Get single study details
#* @param id Study ID
#* @get /<id>
function(req, res, id) {

  # Check data availability
  if (is.null(data_env$survival_individual)) {
    return(create_error(res, 500, "DATA_UNAVAILABLE",
                        "Survival data is not loaded. Please check server configuration.",
                        list()))
  }

  studies <- data_env$survival_individual %>%
    filter(gsub(" ", "_", tolower(study)) == id)

  if (nrow(studies) == 0) {
    return(create_error(res, 404, "STUDY_NOT_FOUND",
                        "Study not found",
                        list(study_id = id)))
  }

  survival_by_size <- studies %>%
    mutate(size_class = cut(size_cm2,
                            breaks = SIZE_BREAKS,
                            labels = SIZE_LABELS,
                            include.lowest = TRUE)) %>%
    group_by(size_class) %>%
    summarise(
      n = n(),
      survival_rate = mean(survived, na.rm = TRUE),
      .groups = "drop"
    )

  study_data <- list(
    study_id = id,
    study_name = first(studies$study),
    year_start = min(studies$survey_yr, na.rm = TRUE),
    year_end = max(studies$survey_yr, na.rm = TRUE),
    regions = unique(studies$region),
    data_types = unique(studies$data_type),
    sample_size = nrow(studies),
    mean_survival = mean(studies$survived, na.rm = TRUE),
    survival_by_size = survival_by_size
  )

  list(
    error = FALSE,
    data = study_data,
    meta = list(
      total_records = nrow(studies)
    )
  )
}
