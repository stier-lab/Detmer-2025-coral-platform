library(dplyr)
library(tidyr)

# Note: response helpers are loaded globally by plumber.R

# Size class labels for display — use canonical SC1-SC5 keys
SIZE_CLASS_LABELS <- c(
  "SC1" = "SC1 (Recruits)",
  "SC2" = "SC2 (Small Juveniles)",
  "SC3" = "SC3 (Large Juveniles)",
  "SC4" = "SC4 (Small Adults)",
  "SC5" = "SC5 (Large Adults)"
)

SIZE_CLASS_SHORT <- c(
  "SC1" = "SC1",
  "SC2" = "SC2",
  "SC3" = "SC3",
  "SC4" = "SC4",
  "SC5" = "SC5"
)

#* @apiTitle Elasticity Analysis API
#* @apiDescription Endpoints for population elasticity and matrix model outputs

#* Get full elasticity matrix with labels
#* @get /matrix
function(res) {
  # Check if elasticity data is available
  if (is.null(data_env$elasticity_matrix)) {
    return(create_error(res, 500, "DATA_UNAVAILABLE",
                        "Elasticity matrix data is not loaded",
                        list(hint = "Ensure elasticity_matrix.csv exists in analysis/output/")))
  }

  matrix_data <- data_env$elasticity_matrix

  # Get size class names from row names
  size_classes <- rownames(matrix_data)
  if (is.null(size_classes)) {
    size_classes <- colnames(matrix_data)
  }

  # Convert to long format for easier frontend processing
  matrix_long <- matrix_data %>%
    as.data.frame() %>%
    mutate(from_class = size_classes) %>%
    pivot_longer(
      cols = -from_class,
      names_to = "to_class",
      values_to = "elasticity"
    ) %>%
    mutate(
      elasticity_pct = round(elasticity * 100, 2),
      from_label = SIZE_CLASS_LABELS[from_class],
      to_label = SIZE_CLASS_LABELS[to_class],
      from_short = SIZE_CLASS_SHORT[from_class],
      to_short = SIZE_CLASS_SHORT[to_class],
      # Categorize transition type
      # In Lefkovitch matrix: from_class = row = DESTINATION, to_class = col = SOURCE
      # Growth: destination index > source index (organism moved to larger class)
      transition_type = case_when(
        from_class == to_class ~ "stasis",
        match(from_class, size_classes) > match(to_class, size_classes) ~ "growth",
        TRUE ~ "shrinkage"
      )
    )

  # Add sample sizes and reliability if available
  if (!is.null(data_env$transition_sample_sizes)) {
    sample_data <- data_env$transition_sample_sizes

    # Validate join keys exist
    if (all(c("from_class", "to_class") %in% names(sample_data))) {
      sample_data <- sample_data %>%
        select(from_class, to_class, n_observations, reliability)

      matrix_long <- matrix_long %>%
        left_join(sample_data, by = c("from_class", "to_class"))
    } else {
      matrix_long <- matrix_long %>%
        mutate(n_observations = NA_integer_, reliability = "Unknown")
    }
  } else {
    matrix_long <- matrix_long %>%
      mutate(n_observations = NA_integer_, reliability = "Unknown")
  }

  list(
    data = matrix_long,
    labels = SIZE_CLASS_SHORT[size_classes],
    meta = list(
      total_elasticity = sum(matrix_data, na.rm = TRUE),
      size_classes = length(size_classes),
      note = "Elasticity values sum to 1.0 (100%)"
    )
  )
}

#* Get formatted breakdown for treemap visualization
#* @get /breakdown
function(res) {
  # Check data availability
  if (is.null(data_env$transition_sample_sizes)) {
    return(create_error(res, 500, "DATA_UNAVAILABLE",
                        "Transition sample sizes data is not loaded"))
  }

  sample_data <- data_env$transition_sample_sizes

  # Get size class order — use canonical labels
  size_classes <- c("SC1", "SC2", "SC3", "SC4", "SC5")

  # Prepare breakdown data for treemap
  breakdown <- sample_data %>%
    mutate(
      elasticity_pct = round(elasticity_value * 100, 2),
      from_short = SIZE_CLASS_SHORT[from_class],
      to_short = SIZE_CLASS_SHORT[to_class],
      # Determine transition type and category
      # In Lefkovitch matrix: from_class = row = DESTINATION, to_class = col = SOURCE
      transition_type = case_when(
        from_class == to_class ~ "stasis",
        match(from_class, size_classes) > match(to_class, size_classes) ~ "growth",
        TRUE ~ "shrinkage"
      ),
      category = case_when(
        transition_type == "stasis" ~ "Survival",
        transition_type == "growth" ~ "Growth",
        transition_type == "shrinkage" & grepl("SC1", to_class) ~ "Reproduction",
        TRUE ~ "Shrinkage"
      ),
      # Create display name
      name = case_when(
        transition_type == "stasis" ~ paste0(from_short, " Survival"),
        transition_type == "growth" ~ paste0(from_short, " → ", to_short),
        category == "Reproduction" ~ "Fragmentation",
        TRUE ~ paste0(from_short, " → ", to_short, " (shrink)")
      ),
      # Create description
      description = case_when(
        transition_type == "stasis" ~
          paste0("Probability that a ", tolower(SIZE_CLASS_LABELS[from_class]),
                 " survives and stays in the same size class"),
        transition_type == "growth" ~
          paste0("Probability of growing from ", from_short, " to ", to_short),
        category == "Reproduction" ~
          "New recruits produced through fragmentation of larger colonies",
        TRUE ~
          paste0("Probability of shrinking from ", from_short, " to ", to_short)
      )
    ) %>%
    # Filter to significant transitions (> 0.5% elasticity)
    filter(elasticity_pct >= 0.5) %>%
    # Sort by elasticity
    arrange(desc(elasticity_pct)) %>%
    select(
      name, value = elasticity_pct, category, description,
      from = from_short, to = to_short,
      reliability, sampleSize = n_observations,
      transitionType = transition_type
    )

  # Calculate category totals
  category_totals <- breakdown %>%
    group_by(category) %>%
    summarise(
      total = sum(value),
      count = n(),
      .groups = "drop"
    ) %>%
    arrange(desc(total))

  list(
    data = breakdown,
    categoryTotals = category_totals,
    meta = list(
      totalTransitions = nrow(breakdown),
      totalElasticity = sum(breakdown$value),
      note = "Transitions with < 0.5% elasticity are filtered for clarity"
    )
  )
}

#* Get aggregated elasticity summary with lambda statistics
#* @get /summary
function(res) {
  # Check data availability
  if (is.null(data_env$population_parameters)) {
    return(create_error(res, 500, "DATA_UNAVAILABLE",
                        "Population parameters data is not loaded"))
  }

  params <- data_env$population_parameters

  # Extract values from the parameters dataframe
  get_param <- function(name) {
    val <- params$value[params$parameter == name]
    if (length(val) == 0) NA_real_ else val
  }

  list(
    data = list(
      # Population growth rate
      lambda = list(
        estimate = round(get_param("lambda"), 3),
        ciLower = round(get_param("lambda_ci_lower"), 3),
        ciUpper = round(get_param("lambda_ci_upper"), 3),
        pDecline = round(get_param("p_decline") * 100, 1),
        interpretation = ifelse(
          get_param("lambda") < 1,
          "Population declining",
          "Population stable or growing"
        )
      ),
      # Generation time (renamed in script 13 to flag unreliability)
      generationTime = round(
        ifelse(!is.na(get_param("generation_time_NOTE_unreliable")),
               get_param("generation_time_NOTE_unreliable"),
               get_param("generation_time")),  # fallback for older CSV
        2),
      # Elasticity by category (as percentages)
      elasticity = list(
        stasis = round(get_param("elasticity_stasis") * 100, 1),
        growth = round(get_param("elasticity_growth") * 100, 1),
        shrinkage = round(get_param("elasticity_shrink") * 100, 1),
        fragmentation = round(get_param("elasticity_frag") * 100, 1)
      ),
      # Key insights
      insights = list(
        dominant = "SC5 Adult Survival",
        dominantPct = 54.8,
        implication = "Protecting large adults has 3-4x more impact on population growth than other interventions"
      )
    ),
    meta = list(
      source = "Lefkovitch matrix model analysis",
      method = "Bootstrap confidence intervals (n=1000 replicates)",
      note = "Elasticity values show proportional sensitivity of lambda to each vital rate"
    )
  )
}

# --- Restoration Scenarios Helpers ---

# Map transitions to practical restoration actions
RESTORATION_ACTIONS <- list(
  # Keys use canonical SC1-SC5 labels: "source->destination"
  "SC5->SC5" = "Protect large adult colonies from physical damage, disease",
  "SC4->SC4" = "Protect small adult colonies, reduce stressors",
  "SC4->SC5" = "Reduce competition, improve conditions for colony growth",
  "SC3->SC4" = "Reduce competition for medium colonies",

  "SC3->SC3" = "Protect juvenile habitat, manage predation",
  "SC1->SC2" = "Fragment/outplant nursery-reared corals at larger sizes",
  "SC2->SC3" = "Reduce competition for small colonies, improve habitat",
  "SC2->SC2" = "Protect small juvenile habitat, reduce predation",
  "SC1->SC1" = "Improve recruit survival, reduce early mortality",
  "SC3->SC5" = "Improve growth conditions for large juveniles",
  "SC5->SC3" = "Reduce fragmentation/storm damage to large adults",
  "SC5->SC2" = "Reduce severe fragmentation of large adults",
  "SC4->SC3" = "Reduce partial mortality in small adults",
  "SC4->SC2" = "Reduce severe shrinkage of small adults"
)

#' Compute dominant eigenvalue (lambda) of a transition matrix
#' @param mat A square transition matrix
#' @return The dominant (largest real) eigenvalue
compute_lambda <- function(mat) {
  eig <- eigen(mat)
  # Dominant eigenvalue is the one with largest modulus
  dominant_idx <- which.max(Mod(eig$values))
  Re(eig$values[dominant_idx])
}

#' Classify a transition type based on from/to indices
#' @param from_idx Row index (destination class)
#' @param to_idx Column index (source class)
#' @param size_classes Vector of size class names
#' @return Character: "stasis", "growth", or "shrinkage"
classify_transition <- function(from_idx, to_idx, size_classes) {
  if (from_idx == to_idx) return("stasis")
  if (from_idx > to_idx) return("growth")
  return("shrinkage")
}

#' Map transition type to restoration category
#' @param transition_type Character: "stasis", "growth", or "shrinkage"
#' @param from_class Character: destination size class
#' @param to_class Character: source size class (column)
#' @return Character category name
get_category <- function(transition_type, from_class, to_class) {
  if (transition_type == "stasis") return("Survival")
  if (transition_type == "growth") return("Growth")
  if (grepl("SC1", from_class) && transition_type == "shrinkage") return("Reproduction")
  if (transition_type == "shrinkage") return("Shrinkage")
  return("Other")
}

#* Get restoration scenario analysis with perturbation impacts on lambda
#* @param improvement_pct Percentage improvement to apply (default 10)
#* @param scenario Optional filter: protect_adults, enhance_growth, outplanting, reduce_shrinkage, full
#* @get /scenarios
function(res, improvement_pct = 10, scenario = NULL) {
  # Validate parameters
  improvement_pct <- as.numeric(improvement_pct)
  if (is.na(improvement_pct) || improvement_pct <= 0 || improvement_pct > 100) {
    return(create_error(res, 400, "INVALID_PARAMETER",
                        "improvement_pct must be between 0 and 100 (exclusive)"))
  }

  # Check data availability
  if (is.null(data_env$transition_matrix)) {
    return(create_error(res, 500, "DATA_UNAVAILABLE",
                        "Transition matrix data is not loaded",
                        list(hint = "Ensure transition_matrix.csv exists in analysis/output/")))
  }
  if (is.null(data_env$elasticity_matrix)) {
    return(create_error(res, 500, "DATA_UNAVAILABLE",
                        "Elasticity matrix data is not loaded",
                        list(hint = "Ensure elasticity_matrix.csv exists in analysis/output/")))
  }

  trans_mat <- data_env$transition_matrix
  elast_mat <- data_env$elasticity_matrix
  size_classes <- colnames(trans_mat)
  n_classes <- length(size_classes)

  # Compute baseline lambda
  baseline_lambda <- compute_lambda(trans_mat)

  # Improvement factor
  improvement_factor <- 1 + improvement_pct / 100

  # --- Individual Perturbation Analysis ---
  individual_results <- list()
  idx <- 0

  for (col in 1:n_classes) {
    for (row in 1:n_classes) {
      baseline_val <- trans_mat[row, col]

      # Skip zero transitions
      if (baseline_val == 0) next

      # Determine transition type
      # In a Lefkovitch matrix: columns = source class, rows = destination class
      trans_type <- classify_transition(row, col, size_classes)

      # For shrinkage transitions, "improvement" means reduction
      if (trans_type == "shrinkage") {
        perturbed_val <- baseline_val * (1 - improvement_pct / 100)
        perturbed_val <- max(perturbed_val, 0)
      } else {
        # For stasis and growth, improvement means increase
        perturbed_val <- baseline_val * improvement_factor
        perturbed_val <- min(perturbed_val, 1.0)  # Cap at 1.0
      }

      # Skip if no actual change
      if (abs(perturbed_val - baseline_val) < 1e-10) next

      # Compute new lambda with perturbation
      perturbed_mat <- trans_mat
      perturbed_mat[row, col] <- perturbed_val
      new_lambda <- compute_lambda(perturbed_mat)
      delta_lambda <- new_lambda - baseline_lambda

      # Build transition key for action lookup
      from_class <- size_classes[col]   # Source (column)
      to_class <- size_classes[row]     # Destination (row)
      trans_key <- paste0(from_class, "->", to_class)

      restoration_action <- RESTORATION_ACTIONS[[trans_key]]
      if (is.null(restoration_action)) {
        restoration_action <- paste0("Improve ", SIZE_CLASS_SHORT[from_class],
                                     " to ", SIZE_CLASS_SHORT[to_class], " transition")
      }

      category <- get_category(trans_type, to_class, from_class)

      # Get elasticity percentage
      elast_pct <- round(elast_mat[row, col] * 100, 2)

      idx <- idx + 1
      individual_results[[idx]] <- list(
        from_class = from_class,
        to_class = to_class,
        from_short = unname(SIZE_CLASS_SHORT[from_class]),
        to_short = unname(SIZE_CLASS_SHORT[to_class]),
        baseline_value = round(baseline_val, 4),
        perturbed_value = round(perturbed_val, 4),
        baseline_lambda = round(baseline_lambda, 4),
        new_lambda = round(new_lambda, 4),
        delta_lambda = round(delta_lambda, 5),
        pct_lambda_change = round((delta_lambda / baseline_lambda) * 100, 3),
        elasticity_pct = elast_pct,
        restoration_action = restoration_action,
        transition_type = trans_type,
        category = category
      )
    }
  }

  # Sort by delta_lambda descending
  deltas <- sapply(individual_results, function(x) x$delta_lambda)
  individual_results <- individual_results[order(deltas, decreasing = TRUE)]

  # --- Combined Scenarios ---

  # Define scenario configurations
  scenario_configs <- list(
    protect_adults = list(
      name = "Protect Adults",
      description = "Improve survival of SC4 and SC5 adults",
      transitions = list(
        list(row = 4, col = 4),  # SC4->SC4 stasis
        list(row = 5, col = 5)   # SC5->SC5 stasis
      ),
      type = "increase"
    ),
    enhance_growth = list(
      name = "Enhance Growth",
      description = "Improve all upward growth transitions",
      transitions = list(),  # Will be filled dynamically
      type = "increase"
    ),
    outplanting = list(
      name = "Outplanting",
      description = "Improve early life stage survival and growth (SC1, SC2)",
      transitions = list(
        list(row = 1, col = 1),  # SC1->SC1 stasis
        list(row = 2, col = 1),  # SC1->SC2 growth
        list(row = 2, col = 2)   # SC2->SC2 stasis
      ),
      type = "increase"
    ),
    reduce_shrinkage = list(
      name = "Reduce Fragmentation/Shrinkage",
      description = "Reduce all shrinkage/fragmentation transitions",
      transitions = list(),  # Will be filled dynamically
      type = "decrease"
    ),
    full = list(
      name = "Full Restoration",
      description = "All transitions improved simultaneously",
      transitions = list(),  # Will be filled dynamically
      type = "mixed"
    )
  )

  # Fill dynamic transitions for enhance_growth (all growth transitions where row > col)
  for (col in 1:n_classes) {
    for (row in 1:n_classes) {
      if (row > col && trans_mat[row, col] > 0) {
        scenario_configs$enhance_growth$transitions <- c(
          scenario_configs$enhance_growth$transitions,
          list(list(row = row, col = col))
        )
      }
    }
  }

  # Fill dynamic transitions for reduce_shrinkage (row < col, i.e., going to smaller class)
  for (col in 1:n_classes) {
    for (row in 1:n_classes) {
      if (row < col && trans_mat[row, col] > 0) {
        scenario_configs$reduce_shrinkage$transitions <- c(
          scenario_configs$reduce_shrinkage$transitions,
          list(list(row = row, col = col))
        )
      }
    }
  }

  # Fill dynamic transitions for full (all non-zero transitions)
  for (col in 1:n_classes) {
    for (row in 1:n_classes) {
      if (trans_mat[row, col] > 0) {
        scenario_configs$full$transitions <- c(
          scenario_configs$full$transitions,
          list(list(row = row, col = col))
        )
      }
    }
  }

  # Compute combined scenario results
  combined_results <- list()
  for (s_id in names(scenario_configs)) {
    cfg <- scenario_configs[[s_id]]

    # Apply all perturbations in this scenario simultaneously
    perturbed_mat <- trans_mat
    transitions_affected <- c()

    for (t in cfg$transitions) {
      baseline_val <- perturbed_mat[t$row, t$col]
      if (baseline_val == 0) next

      # Determine direction of perturbation
      trans_type <- classify_transition(t$row, t$col, size_classes)
      if (cfg$type == "decrease" || (cfg$type == "mixed" && trans_type == "shrinkage")) {
        new_val <- baseline_val * (1 - improvement_pct / 100)
        new_val <- max(new_val, 0)
      } else {
        new_val <- baseline_val * improvement_factor
        new_val <- min(new_val, 1.0)
      }
      perturbed_mat[t$row, t$col] <- new_val

      from_sc <- SIZE_CLASS_SHORT[size_classes[t$col]]
      to_sc <- SIZE_CLASS_SHORT[size_classes[t$row]]
      transitions_affected <- c(transitions_affected,
                                paste0(unname(from_sc), "\u2192", unname(to_sc)))
    }

    new_lambda <- compute_lambda(perturbed_mat)
    delta <- new_lambda - baseline_lambda

    combined_results[[s_id]] <- list(
      scenario_id = s_id,
      scenario_name = cfg$name,
      description = cfg$description,
      transitions_affected = transitions_affected,
      baseline_lambda = round(baseline_lambda, 4),
      new_lambda = round(new_lambda, 4),
      delta_lambda = round(delta, 5),
      pct_lambda_change = round((delta / baseline_lambda) * 100, 3),
      achieves_stability = new_lambda >= 1.0
    )
  }

  # Sort combined by delta_lambda descending
  combined_deltas <- sapply(combined_results, function(x) x$delta_lambda)
  combined_results <- combined_results[order(combined_deltas, decreasing = TRUE)]

  # --- Path to Stability ---
  # For each scenario, binary search for the improvement % needed to reach lambda = 1.0
  target_lambda <- 1.0
  path_results <- list()

  for (s_id in names(scenario_configs)) {
    cfg <- scenario_configs[[s_id]]

    # Binary search for improvement percentage
    low <- 0
    high <- 200  # Allow up to 200% improvement
    found <- FALSE
    needed_pct <- NA_real_

    for (iter in 1:50) {
      mid <- (low + high) / 2
      test_factor <- 1 + mid / 100
      perturbed_mat <- trans_mat

      for (t in cfg$transitions) {
        baseline_val <- perturbed_mat[t$row, t$col]
        if (baseline_val == 0) next

        trans_type <- classify_transition(t$row, t$col, size_classes)
        if (cfg$type == "decrease" || (cfg$type == "mixed" && trans_type == "shrinkage")) {
          new_val <- baseline_val * (1 - mid / 100)
          new_val <- max(new_val, 0)
        } else {
          new_val <- baseline_val * test_factor
          new_val <- min(new_val, 1.0)
        }
        perturbed_mat[t$row, t$col] <- new_val
      }

      test_lambda <- compute_lambda(perturbed_mat)

      if (abs(test_lambda - target_lambda) < 0.0001) {
        needed_pct <- mid
        found <- TRUE
        break
      } else if (test_lambda < target_lambda) {
        low <- mid
      } else {
        high <- mid
      }
    }

    if (!found && low >= 199) {
      # Could not achieve stability even at 200%
      needed_pct <- 200
      feasibility <- "difficult"
      note <- paste0("Cannot achieve stability with this scenario alone (even at 200% improvement)")
    } else if (!found) {
      needed_pct <- mid
      found <- TRUE
    }

    if (found) {
      # Use lowercase feasibility values to match frontend expectations
      feasibility <- if (needed_pct <= 10) {
        "feasible"
      } else if (needed_pct <= 25) {
        "moderate"
      } else {
        "difficult"
      }
      note <- paste0("Requires ~", round(needed_pct, 1), "% improvement in ",
                     cfg$name, " vital rates")
    }

    path_results[[s_id]] <- list(
      scenario_id = s_id,
      scenario_name = cfg$name,
      improvement_needed_pct = round(needed_pct, 1),
      feasibility = feasibility,
      note = note
    )
  }

  # Filter by scenario if requested
  if (!is.null(scenario) && nchar(scenario) > 0) {
    valid_scenarios <- names(scenario_configs)
    if (!(scenario %in% valid_scenarios)) {
      return(create_error(res, 400, "INVALID_PARAMETER",
                          paste0("Invalid scenario. Must be one of: ",
                                 paste(valid_scenarios, collapse = ", "))))
    }
    combined_results <- combined_results[sapply(combined_results, function(x) x$scenario_id == scenario)]
    path_results <- path_results[scenario]
  }

  list(
    data = list(
      individual = individual_results,
      combined = unname(combined_results),
      path_to_stability = unname(path_results)
    ),
    meta = list(
      improvement_pct = improvement_pct,
      baseline_lambda = round(baseline_lambda, 4),
      target_lambda = target_lambda,
      note = "Perturbation analysis showing impact of vital rate improvements on population growth"
    )
  )
}

#* Get population projection data
#* @param years Number of years to project (default 20)
#* @get /projection
function(res, years = 20) {
  years <- as.integer(years)
  if (is.na(years) || years < 1 || years > 100) {
    return(create_error(res, 400, "INVALID_PARAMETER",
                        "Years must be between 1 and 100"))
  }

  # Get lambda for projection
  if (is.null(data_env$population_parameters)) {
    return(create_error(res, 500, "DATA_UNAVAILABLE",
                        "Population parameters data is not loaded"))
  }

  params <- data_env$population_parameters
  lambda <- params$value[params$parameter == "lambda"]
  lambda_lower <- params$value[params$parameter == "lambda_ci_lower"]
  lambda_upper <- params$value[params$parameter == "lambda_ci_upper"]

  # Generate projection
  year_seq <- 0:years
  projection <- data.frame(
    year = year_seq,
    relative_pop = lambda^year_seq,
    lower = lambda_lower^year_seq,
    upper = lambda_upper^year_seq
  ) %>%
    mutate(
      relative_pop = round(relative_pop * 100, 1),
      lower = round(lower * 100, 1),
      upper = round(upper * 100, 1)
    )

  list(
    data = projection,
    meta = list(
      lambda = round(lambda, 3),
      annualChange = round((lambda - 1) * 100, 1),
      projectionYears = years,
      note = "Population shown as percentage of initial size"
    )
  )
}
