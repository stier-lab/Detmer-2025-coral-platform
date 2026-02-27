library(dplyr)

#* Export filtered data as CSV with metadata header
#* @param dataset Which dataset (survival_individual, growth_individual, etc.)
#* @param region Comma-separated list of regions
#* @param data_type Comma-separated list of data types
#* @param year_min Minimum survey year
#* @param year_max Maximum survey year
#* @serializer contentType list(type="text/csv")
#* @get /csv
function(dataset = "survival_individual", region = "", data_type = "",
         year_min = 2000, year_max = 2025, res) {

  data <- switch(dataset,
    "survival_individual" = data_env$survival_individual,
    "survival_summary" = data_env$survival_summary,
    "growth_individual" = data_env$growth_individual,
    "growth_summary" = data_env$growth_summary,
    "fragmentation" = data_env$fragmentation,
    "lab_survival" = data_env$lab_survival,
    data_env$survival_individual
  )

  if (is.null(data)) {
    return(data.frame(error = "Dataset not found"))
  }

  # Apply filters
  if (region != "" && "region" %in% names(data)) {
    regions <- strsplit(region, ",")[[1]]
    data <- data %>% filter(region %in% regions)
  }

  if (data_type != "" && "data_type" %in% names(data)) {
    types <- strsplit(data_type, ",")[[1]]
    data <- data %>% filter(data_type %in% types)
  }

  if ("survey_yr" %in% names(data)) {
    data <- data %>%
      filter(survey_yr >= as.numeric(year_min),
             survey_yr <= as.numeric(year_max))
  }

  # Generate CSV with metadata header
  metadata_header <- paste0(
    "# Acropora palmata Demographic Parameters Database\n",
    "# Detmer, R. & Stier, A. (2025). Uncertainty-aware analysis of size-dependent survival and growth.\n",
    "# GitHub: stier-lab/Detmer-2025-coral-parameters\n",
    "#\n",
    "# Dataset: ", dataset, "\n",
    "# Records: ", nrow(data), "\n",
    "# Downloaded: ", Sys.Date(), "\n",
    "#\n",
    "# IMPORTANT CAVEATS:\n",
    "# - 78% of data from Florida Keys (NOAA monitoring). Regional estimates may not generalize.\n",
    "# - Fragments show ~14pp lower survival than natural colonies at same size.\n",
    "# - Size explains only ~8-9% of survival variance. Site conditions dominate.\n",
    "# - Pooling across studies can be misleading. Use stratified estimates when possible.\n",
    "# - Size thresholds have wide CIs. Treat as exploratory, not prescriptive.\n",
    "#\n",
    "# See https://rrse-coral.ucsb.edu/methods for full documentation.\n",
    "#\n"
  )

  # Convert data to CSV string
  csv_string <- paste0(
    metadata_header,
    paste(capture.output(write.csv(data, row.names = FALSE)), collapse = "\n")
  )

  # Set filename and content type
  # Sanitize dataset for use in HTTP headers (prevent header injection)
  safe_dataset <- gsub("[^a-zA-Z0-9_-]", "", dataset)
  filename <- paste0("rrse_", safe_dataset, "_", Sys.Date(), ".csv")
  res$setHeader("Content-Disposition",
                paste0('attachment; filename="', filename, '"'))
  res$setHeader("Content-Type", "text/csv; charset=utf-8")

  # Return raw CSV string
  res$body <- csv_string
  res
}

#* Generate citation for data download
#* @param datasets Comma-separated list of datasets
#* @param region Comma-separated list of regions
#* @get /citation
function(datasets = "survival_individual", region = "") {

  datasets_list <- strsplit(datasets, ",")[[1]]

  all_studies <- character()
  for (ds in datasets_list) {
    data <- switch(ds,
      "survival_individual" = data_env$survival_individual,
      "growth_individual" = data_env$growth_individual,
      NULL
    )

    if (!is.null(data)) {
      if (region != "" && "region" %in% names(data)) {
        regions <- strsplit(region, ",")[[1]]
        data <- data %>% filter(region %in% regions)
      }
      all_studies <- c(all_studies, unique(data$study))
    }
  }

  all_studies <- unique(all_studies)

  list(
    main_citation = paste0(
      "Detmer, A.R., Stier, A.C., et al. (2025). ",
      "RRSE Coral Parameters Database: Synthesized demographic parameters for ",
      "Acropora palmata. Ocean Recoveries Lab, UC Santa Barbara. ",
      "Retrieved ", format(Sys.Date(), "%B %d, %Y"), " from https://rrse-coral.ucsb.edu"
    ),
    studies_to_cite = all_studies,
    download_date = as.character(Sys.Date()),
    datasets_included = datasets_list,
    regions_included = if (region == "") "All" else strsplit(region, ",")[[1]]
  )
}

#* Export filtered data as JSON with metadata, warnings, and citations
#* @param dataset Which dataset
#* @param region Comma-separated list of regions
#* @param data_type Comma-separated list of data types
#* @get /json
function(dataset = "survival_individual", region = "", data_type = "") {

  data <- switch(dataset,
    "survival_individual" = data_env$survival_individual,
    "growth_individual" = data_env$growth_individual,
    data_env$survival_individual
  )

  if (region != "" && "region" %in% names(data)) {
    regions <- strsplit(region, ",")[[1]]
    data <- data %>% filter(region %in% regions)
  }

  if (data_type != "" && "data_type" %in% names(data)) {
    types <- strsplit(data_type, ",")[[1]]
    data <- data %>% filter(data_type %in% types)
  }

  # Get unique studies from the filtered data
  studies_used <- if ("study" %in% names(data)) unique(data$study) else character(0)

  list(
    data = data,
    metadata = list(
      dataset = dataset,
      total_records = nrow(data),
      exported_at = Sys.time(),
      filters_applied = list(
        region = if (region == "") "All regions" else region,
        data_type = if (data_type == "") "All types" else data_type
      ),
      citation = list(
        main = paste0(
          "Detmer, R. & Stier, A. (2025). ",
          "Acropora palmata Demographic Parameters Database: ",
          "Uncertainty-aware analysis of size-dependent survival and growth across the Caribbean. ",
          "GitHub: stier-lab/Detmer-2025-coral-parameters"
        ),
        studies_included = studies_used,
        download_date = as.character(Sys.Date())
      ),
      important_caveats = list(
        geographic_bias = "78% of data comes from Florida Keys (NOAA monitoring). Regional estimates may not generalize.",
        fragment_vs_colony = "Fragments show ~14pp lower survival than natural colonies at same size. Data separated when possible but methodology confounds remain.",
        size_variance = "Size explains only ~8-9% of survival variance. Site-level conditions, disease, and environmental factors dominate.",
        pooling_warning = "Pooling across studies can be misleading due to high heterogeneity. Use stratified estimates when possible.",
        thresholds_unstable = "Size threshold estimates have confidence intervals spanning orders of magnitude. Treat as exploratory, not prescriptive."
      ),
      usage_notes = list(
        "These data provide starting points for restoration planning, not precise predictions.",
        "Supplement with site-specific monitoring data as soon as possible.",
        "Survival and growth estimates assume no major bleaching or disease events.",
        "See https://rrse-coral.ucsb.edu/methods for full documentation and size class definitions."
      )
    )
  )
}
