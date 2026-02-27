library(readr)
library(dplyr)

#' Load all datasets into environment with proper error handling
#' @return Environment containing all data frames
load_all_data <- function() {
  env <- new.env()

  # Try multiple possible data directory locations
  possible_dirs <- c(
    "standardized_data",           # Docker container path
    "/app/standardized_data",      # Render deployment path
    "../../standardized_data",     # Local development from backend/
    "../standardized_data",
    file.path(Sys.getenv("HOME"), "Detmer-2025-coral-parameters/standardized_data")
  )

  data_dir <- NULL
  for (dir in possible_dirs) {
    if (dir.exists(dir)) {
      data_dir <- dir
      message(sprintf("Found data directory: %s", normalizePath(dir)))
      break
    }
  }

  if (is.null(data_dir)) {
    warning("========================================")
    warning("DATA DIRECTORY NOT FOUND!")
    warning("Tried: ", paste(possible_dirs, collapse = ", "))
    warning("Creating MOCK DATA for development only.")
    warning("API responses will NOT reflect real data!")
    warning("========================================")
    env <- create_mock_data()
    env$using_mock_data <- TRUE
    return(env)
  }

  env$using_mock_data <- FALSE
  env$data_directory <- normalizePath(data_dir)
  load_errors <- c()

  # Load individual survival data
  surv_file <- file.path(data_dir, "apal_surv_ind.csv")
  if (file.exists(surv_file)) {
    tryCatch({
      env$survival_individual <- read_csv(surv_file, show_col_types = FALSE) %>%
        mutate(
          id = row_number(),
          data_type = case_when(
            grepl("nursery|Nursery", data_type, ignore.case = TRUE) ~
              ifelse(grepl("ex|Ex", data_type), "nursery_ex", "nursery_in"),
            TRUE ~ "field"
          )
        )
      # Use live tissue area for size classification (matches analysis pipeline script 01)
      # Partially dead colonies should be classified by their live tissue, not total footprint
      if ("size_live_cm2" %in% names(env$survival_individual)) {
        env$survival_individual <- env$survival_individual %>%
          mutate(
            size_total_cm2 = size_cm2,
            size_cm2 = coalesce(size_live_cm2, size_cm2)
          )
      }
      message(sprintf("Loaded %d survival records from %s", nrow(env$survival_individual), surv_file))
    }, error = function(e) {
      load_errors <<- c(load_errors, sprintf("Failed to load %s: %s", surv_file, e$message))
    })
  } else {
    load_errors <- c(load_errors, sprintf("File not found: %s", surv_file))
  }

  # Load summary survival data
  summ_file <- file.path(data_dir, "apal_surv_summ.csv")
  if (file.exists(summ_file)) {
    tryCatch({
      env$survival_summary <- read_csv(summ_file, show_col_types = FALSE)
      message(sprintf("Loaded %d survival summary records", nrow(env$survival_summary)))
    }, error = function(e) {
      load_errors <<- c(load_errors, sprintf("Failed to load %s: %s", summ_file, e$message))
    })
  }

  # Load individual growth data
  growth_file <- file.path(data_dir, "apal_growth_ind.csv")
  if (file.exists(growth_file)) {
    tryCatch({
      env$growth_individual <- read_csv(growth_file, show_col_types = FALSE) %>%
        mutate(
          id = row_number(),
          data_type = case_when(
            grepl("nursery|Nursery", data_type, ignore.case = TRUE) ~
              ifelse(grepl("ex|Ex", data_type), "nursery_ex", "nursery_in"),
            TRUE ~ "field"
          )
        )
      # Use live tissue area for size classification (matches analysis pipeline script 01)
      # Partially dead colonies should be classified by their live tissue, not total footprint
      if ("size_live_cm2" %in% names(env$growth_individual)) {
        env$growth_individual <- env$growth_individual %>%
          mutate(
            size_total_cm2 = size_cm2,
            size_cm2 = coalesce(size_live_cm2, size_cm2)
          )
      }
      message(sprintf("Loaded %d growth records from %s", nrow(env$growth_individual), growth_file))
    }, error = function(e) {
      load_errors <<- c(load_errors, sprintf("Failed to load %s: %s", growth_file, e$message))
    })
  } else {
    load_errors <- c(load_errors, sprintf("File not found: %s", growth_file))
  }

  # Load summary growth data
  growth_summ_file <- file.path(data_dir, "apal_growth_summ.csv")
  if (file.exists(growth_summ_file)) {
    tryCatch({
      env$growth_summary <- read_csv(growth_summ_file, show_col_types = FALSE)
      message(sprintf("Loaded %d growth summary records", nrow(env$growth_summary)))
    }, error = function(e) {
      load_errors <<- c(load_errors, sprintf("Failed to load %s: %s", growth_summ_file, e$message))
    })
  }

  # Load fragmentation data
  frag_file <- file.path(data_dir, "apal_fragmentation.csv")
  if (file.exists(frag_file)) {
    tryCatch({
      env$fragmentation <- read_csv(frag_file, show_col_types = FALSE)
      message(sprintf("Loaded %d fragmentation records", nrow(env$fragmentation)))
    }, error = function(e) {
      load_errors <<- c(load_errors, sprintf("Failed to load %s: %s", frag_file, e$message))
    })
  }

  # Load lab survival data
  lab_file <- file.path(data_dir, "apal_surv_lab_short.csv")
  if (file.exists(lab_file)) {
    tryCatch({
      env$lab_survival <- read_csv(lab_file, show_col_types = FALSE)
      message(sprintf("Loaded %d lab survival records", nrow(env$lab_survival)))
    }, error = function(e) {
      load_errors <<- c(load_errors, sprintf("Failed to load %s: %s", lab_file, e$message))
    })
  }

  # Load paper summaries from analysis output
  # Try multiple paths for paper summaries
  paper_paths <- c(
    file.path(data_dir, "../analysis/output/paper_summaries.csv"),
    "/app/analysis/output/paper_summaries.csv",
    "../../analysis/output/paper_summaries.csv",
    "../analysis/output/paper_summaries.csv"
  )

  paper_file <- NULL
  for (p in paper_paths) {
    if (file.exists(p)) {
      paper_file <- p
      break
    }
  }

  if (!is.null(paper_file)) {
    tryCatch({
      env$paper_summaries <- read_csv(paper_file, show_col_types = FALSE)
      message(sprintf("Loaded %d paper summaries from %s", nrow(env$paper_summaries), paper_file))
    }, error = function(e) {
      load_errors <<- c(load_errors, sprintf("Failed to load %s: %s", paper_file, e$message))
    })
  } else {
    message("Paper summaries not found (optional)")
  }

  # Report any errors
  if (length(load_errors) > 0) {
    warning("========================================")
    warning("SOME DATA FILES FAILED TO LOAD:")
    for (err in load_errors) {
      warning("  - ", err)
    }
    warning("========================================")
  }

  # Store load errors for API access
  env$load_errors <- load_errors

  # Load analysis output files for caching
  env <- load_analysis_outputs(env, data_dir)

  # Final summary
  message("========================================")
  message("DATA LOADING COMPLETE")
  message(sprintf("  Survival records: %d", nrow(env$survival_individual %||% data.frame())))
  message(sprintf("  Growth records: %d", nrow(env$growth_individual %||% data.frame())))
  message(sprintf("  Analysis files loaded: %d", length(env$analysis %||% list())))
  message(sprintf("  Using mock data: %s", env$using_mock_data))
  message(sprintf("  Load errors: %d", length(load_errors)))
  message("========================================")

  env
}

#' Load analysis output files for caching
#' @param env The data environment to populate
#' @param data_dir The base data directory path
#' @return Environment with analysis outputs added
load_analysis_outputs <- function(env, data_dir) {
  # Try multiple possible analysis output directory locations
  possible_analysis_dirs <- c(
    file.path(data_dir, "../analysis/output"),
    "/app/analysis/output",
    "../../analysis/output",
    "../analysis/output",
    file.path(Sys.getenv("HOME"), "Detmer-2025-coral-parameters/analysis/output")
  )

  analysis_dir <- NULL
  for (dir in possible_analysis_dirs) {
    if (dir.exists(dir)) {
      analysis_dir <- dir
      message(sprintf("Found analysis output directory: %s", normalizePath(dir)))
      break
    }
  }

  if (is.null(analysis_dir)) {
    message("Analysis output directory not found - analysis endpoints will read files on demand")
    env$analysis <- list()
    env$analysis_directory <- NULL
    return(env)
  }

  env$analysis_directory <- normalizePath(analysis_dir)
  env$analysis <- list()

  # Define all analysis output files to cache
  analysis_files <- c(
    "survival_thresholds",
    "survival_magnitude",
    "survival_model_comparison",
    "survival_diagnostics",
    "growth_thresholds",
    "growth_model_comparison",
    "growth_diagnostics",
    "variance_partitioning",
    "survival_by_size",
    "survival_by_region",
    "data_gaps_identified",
    "gap_prioritization",
    "certainty_by_size_class",
    "certainty_by_region",
    "meta_analysis_results",
    "meta_analysis_stratified",
    "meta_analysis_study_effects",
    "meta_analysis_moderators",
    "meta_analysis_loo",
    "heterogeneity_analysis",
    "study_effect_sizes",
    "moderator_effects",
    "heterogeneity_by_population",
    "survival_stratified_summary",
    "growth_stratified_summary",
    "population_parameters",
    "transition_sample_sizes"
  )

  loaded_count <- 0
  for (file_name in analysis_files) {
    file_path <- file.path(analysis_dir, paste0(file_name, ".csv"))
    if (file.exists(file_path)) {
      tryCatch({
        env$analysis[[file_name]] <- read_csv(file_path, show_col_types = FALSE)
        loaded_count <- loaded_count + 1
      }, error = function(e) {
        message(sprintf("Warning: Failed to load %s: %s", file_path, e$message))
        env$analysis[[file_name]] <- NULL
      })
    } else {
      # File doesn't exist - store NULL for graceful handling
      env$analysis[[file_name]] <- NULL
    }
  }

  message(sprintf("Loaded %d of %d analysis output files", loaded_count, length(analysis_files)))

  # Load elasticity matrix separately (has row names)
  elasticity_path <- file.path(analysis_dir, "elasticity_matrix.csv")
  if (file.exists(elasticity_path)) {
    tryCatch({
      elasticity_df <- read.csv(elasticity_path, row.names = 1, check.names = FALSE)
      env$elasticity_matrix <- as.matrix(elasticity_df)
      message("Loaded elasticity matrix")
    }, error = function(e) {
      message(sprintf("Warning: Failed to load elasticity matrix: %s", e$message))
      env$elasticity_matrix <- NULL
    })
  } else {
    env$elasticity_matrix <- NULL
  }

  # Load transition matrix (has row names, like elasticity matrix)
  transition_path <- file.path(analysis_dir, "transition_matrix.csv")
  if (file.exists(transition_path)) {
    tryCatch({
      transition_df <- read.csv(transition_path, row.names = 1, check.names = FALSE)
      env$transition_matrix <- as.matrix(transition_df)
      message("Loaded transition matrix")
    }, error = function(e) {
      message(sprintf("Warning: Failed to load transition matrix: %s", e$message))
      env$transition_matrix <- NULL
    })
  } else {
    env$transition_matrix <- NULL
  }

  # Also expose key analysis files at top level for easier access
  if (!is.null(env$analysis$population_parameters)) {
    env$population_parameters <- env$analysis$population_parameters
  }
  if (!is.null(env$analysis$transition_sample_sizes)) {
    env$transition_sample_sizes <- env$analysis$transition_sample_sizes
  }

  env
}

#' Create mock data for development
create_mock_data <- function() {
  env <- new.env()

  set.seed(42)
  n <- 500

  regions <- c("Florida", "USVI", "Puerto Rico", "Curacao", "Navassa",
               "Dominican Republic", "Mexico")
  studies <- c("NOAA_survey", "pausch_et_al_2018", "USGS_USVI_exp",
               "kuffner_et_al_2020", "fundemar_fragments", "mendoza_quiroz_et_al_2023")

  # Generate mock survival data
  env$survival_individual <- data.frame(
    id = 1:n,
    study = sample(studies, n, replace = TRUE,
                   prob = c(0.4, 0.1, 0.1, 0.1, 0.2, 0.1)),
    region = sample(regions, n, replace = TRUE),
    location = paste0("Site_", sample(1:50, n, replace = TRUE)),
    latitude = runif(n, 17, 27),
    longitude = runif(n, 64, 88),
    depth_m = runif(n, 1, 15),
    survey_yr = sample(2010:2024, n, replace = TRUE),
    data_type = sample(c("field", "nursery_in", "nursery_ex"), n,
                       replace = TRUE, prob = c(0.6, 0.25, 0.15)),
    coral_id = paste0("C", sprintf("%04d", 1:n)),
    size_cm2 = rlnorm(n, meanlog = 4, sdlog = 1.5),
    size_live_cm2 = NA,
    fragment = sample(c("Y", "N"), n, replace = TRUE, prob = c(0.3, 0.7)),
    time_interval_yr = 1,
    disturbance = sample(c(NA, "storm", "MHW", "disease"), n,
                         replace = TRUE, prob = c(0.8, 0.1, 0.05, 0.05)),
    study_notes = NA,
    study_N = sample(50:500, n, replace = TRUE),
    group_N = sample(10:100, n, replace = TRUE)
  )

  # Size-dependent survival probability
  env$survival_individual$survived <- rbinom(
    n, 1,
    plogis(-1 + 0.5 * log(env$survival_individual$size_cm2))
  )

  # Generate mock growth data
  m <- 400
  env$growth_individual <- data.frame(
    id = 1:m,
    study = sample(studies, m, replace = TRUE),
    region = sample(regions, m, replace = TRUE),
    location = paste0("Site_", sample(1:50, m, replace = TRUE)),
    latitude = runif(m, 17, 27),
    longitude = runif(m, 64, 88),
    depth_m = runif(m, 1, 15),
    survey_yr = sample(2010:2024, m, replace = TRUE),
    data_type = sample(c("field", "nursery_in", "nursery_ex"), m,
                       replace = TRUE, prob = c(0.6, 0.25, 0.15)),
    coral_id = paste0("C", sprintf("%04d", 1:m)),
    size_cm2 = rlnorm(m, meanlog = 4, sdlog = 1.5),
    size_live_cm2 = NA,
    fragment = sample(c("Y", "N"), m, replace = TRUE, prob = c(0.3, 0.7)),
    time_interval_yr = 1,
    disturbance = sample(c(NA, "storm", "MHW"), m, replace = TRUE,
                         prob = c(0.85, 0.1, 0.05))
  )

  # Size-dependent growth rates
  env$growth_individual$growth_cm2_yr <- rnorm(
    m,
    mean = 20 + 0.05 * env$growth_individual$size_cm2,
    sd = 30
  )
  env$growth_individual$growth_live_cm2_yr <- env$growth_individual$growth_cm2_yr

  # Initialize empty analysis list for mock data
  env$analysis <- list()
  env$analysis_directory <- NULL

  message("Created MOCK data with 500 survival and 400 growth records")
  message("NOTE: This is simulated data for development only!")

  env
}

# Note: %||% operator is defined in R/utils/constants.R and loaded globally by plumber.R
