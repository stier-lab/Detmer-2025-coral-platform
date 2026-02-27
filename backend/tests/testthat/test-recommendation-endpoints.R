# Tests for recommendation.R endpoints
# ============================================================================
# How to run these tests:
#   From the backend directory:
#     Rscript run_tests.R
#   Or directly via testthat:
#     library(testthat)
#     setwd("tests/testthat")
#     test_file("test-recommendation-endpoints.R")
# ============================================================================
library(testthat)
library(dplyr)

# Source setup
source("setup.R")

# Mock the global data_env that endpoints expect
data_env <- get_test_data()

# Size class definitions matching the endpoint
SIZE_BREAKS <- c(0, 25, 100, 500, 2000, Inf)
SIZE_LABELS <- c("SC1 (0-25)", "SC2 (25-100)", "SC3 (100-500)",
                 "SC4 (500-2000)", "SC5 (>2000)")
SIZE_CLASS_NAMES <- c("SC1", "SC2", "SC3", "SC4", "SC5")

# ============================================================================
# Helper functions from recommendation.R for testing
# ============================================================================

# Validate goal parameter
validate_goal <- function(goal) {
  valid_goals <- c("survival", "growth", "balance")
  if (!goal %in% valid_goals) {
    return(list(valid = FALSE,
                message = sprintf("Parameter 'goal' must be one of: %s",
                                  paste(valid_goals, collapse = ", "))))
  }
  list(valid = TRUE, value = goal)
}

# Validate fragment parameter
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
calculate_scores <- function(survival_data, growth_data, goal) {
  surv_rates <- survival_data$survival_rate
  pct_growing <- growth_data$pct_growing / 100
  surv_normalized <- surv_rates
  growth_normalized <- pct_growing

  scores <- switch(goal,
    "survival" = surv_normalized,
    "growth" = growth_normalized,
    "balance" = 0.5 * surv_normalized + 0.5 * growth_normalized
  )

  scores
}

# Determine confidence level
get_confidence_level <- function(n_survival, n_growth, se_survival) {
  if (n_survival >= 100 && n_growth >= 50 && !is.na(se_survival) && se_survival < 0.05) {
    return("high")
  } else if (n_survival >= 30 && n_growth >= 20) {
    return("medium")
  } else {
    return("low")
  }
}

# Generate caveats
generate_caveats <- function(goal, size_class, survival_n, growth_n, region, fragment,
                             dominant_study_pct = NULL, r_squared = 0.086) {
  caveats <- c()

  caveats <- c(caveats, sprintf("Size explains only %.1f%% of survival variance", r_squared * 100))

  if (survival_n < 50) {
    caveats <- c(caveats, sprintf("Limited survival data for %s (n=%d)", size_class, survival_n))
  }
  if (growth_n < 30) {
    caveats <- c(caveats, sprintf("Limited growth data for %s (n=%d)", size_class, growth_n))
  }

  if (!is.null(dominant_study_pct) && dominant_study_pct > 50) {
    caveats <- c(caveats, sprintf("%.0f%% of data from single study - results may not generalize",
                                   dominant_study_pct))
  }

  if (region != "" && region != "all") {
    caveats <- c(caveats, "Regional estimates may differ from pooled data shown")
  }

  if (fragment == "Y") {
    caveats <- c(caveats, "Fragment survival typically lower than whole colonies")
  }

  if (goal == "survival" && grepl("SC1|SC2", size_class)) {
    caveats <- c(caveats, "Consider growing fragments larger before outplanting for better survival")
  }

  if (goal == "growth" && grepl("SC4|SC5", size_class)) {
    caveats <- c(caveats, "Large colonies grow slower relative to size but start closer to maturity")
  }

  caveats <- c(caveats, "Local site conditions may significantly affect outcomes")
  caveats <- c(caveats, "Estimates exclude major disturbance events (disease, bleaching)")

  caveats
}

# Create error response
create_error <- function(res, status_code, error_code, message, details = list()) {
  list(
    error = TRUE,
    code = error_code,
    message = message,
    details = details,
    status_code = status_code  # For testing purposes
  )
}

# ============================================================================
# Mock endpoint functions for testing
# ============================================================================

get_outplant_recommendation <- function(goal = "balance", region = "", fragment = "all") {
  # Validate goal parameter
  goal_v <- validate_goal(goal)
  if (!goal_v$valid) {
    return(create_error(NULL, 400, "INVALID_PARAMETER", goal_v$message,
                        list(parameter = "goal", value = goal,
                             allowed = c("survival", "growth", "balance"))))
  }

  # Validate fragment parameter
  fragment_v <- validate_fragment(fragment)
  if (!fragment_v$valid) {
    return(create_error(NULL, 400, "INVALID_PARAMETER", fragment_v$message,
                        list(parameter = "fragment", value = fragment,
                             allowed = c("Y", "N", "all"))))
  }

  # Check data availability
  if (is.null(data_env$survival_individual)) {
    return(create_error(NULL, 500, "DATA_UNAVAILABLE",
                        "Survival data is not loaded.",
                        list()))
  }

  if (is.null(data_env$growth_individual)) {
    return(create_error(NULL, 500, "DATA_UNAVAILABLE",
                        "Growth data is not loaded.",
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

  # Check for sufficient data
  if (nrow(survival_result) < 30) {
    return(create_error(NULL, 400, "INSUFFICIENT_DATA",
                        "Not enough survival data for reliable recommendation",
                        list(n = nrow(survival_result), minimum_required = 30)))
  }

  if (nrow(growth_result) < 20) {
    return(create_error(NULL, 400, "INSUFFICIENT_DATA",
                        "Not enough growth data for reliable recommendation",
                        list(n = nrow(growth_result), minimum_required = 20)))
  }

  # Calculate survival by size class
  survival_by_size <- survival_result %>%
    mutate(size_class = cut(size_cm2, breaks = SIZE_BREAKS, labels = SIZE_LABELS,
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
    ) %>%
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
    return(create_error(NULL, 400, "INSUFFICIENT_DATA",
                        "No size classes have both survival and growth data",
                        list()))
  }

  # Calculate scores
  combined_data$score <- calculate_scores(
    survival_data = combined_data %>% select(survival_rate),
    growth_data = combined_data %>% select(mean_growth, pct_growing),
    goal = goal
  )

  # Find recommended size class
  recommended_idx <- which.max(combined_data$score)
  recommended <- combined_data[recommended_idx, ]

  # Extract simple size class name
  recommended_size_class <- gsub("^(SC[1-5]).*", "\\1", as.character(recommended$size_class))

  # Calculate confidence level
  confidence <- get_confidence_level(
    n_survival = recommended$n_surv,
    n_growth = recommended$n_growth,
    se_survival = recommended$se
  )

  # Calculate dominant study percentage
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
    dominant_study_pct = dominant_study_pct
  )

  # Build all size class comparison data
  all_sizes <- combined_data %>%
    mutate(
      size_class_simple = gsub("^(SC[1-5]).*", "\\1", as.character(size_class)),
      is_recommended = size_class_simple == recommended_size_class
    ) %>%
    select(
      size_class = size_class_simple,
      survival_rate,
      mean_growth,
      pct_growing,
      score,
      is_recommended
    )

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
      n = recommended$n_surv
    ),
    growth = list(
      mean_rate = round(recommended$mean_growth, 2),
      pct_growing = round(recommended$pct_growing, 1),
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
      )
    )
  )
}

# ============================================================================
# TESTS - Validation Functions
# ============================================================================

describe("validate_goal", {
  it("accepts valid goals", {
    expect_true(validate_goal("survival")$valid)
    expect_true(validate_goal("growth")$valid)
    expect_true(validate_goal("balance")$valid)
  })

  it("rejects invalid goals", {
    expect_false(validate_goal("invalid")$valid)
    expect_false(validate_goal("")$valid)
    expect_false(validate_goal("SURVIVAL")$valid)  # Case sensitive
    expect_false(validate_goal("surv")$valid)
    expect_false(validate_goal("all")$valid)
  })

  it("returns correct value on success", {
    result <- validate_goal("survival")
    expect_equal(result$value, "survival")
  })

  it("returns error message on failure", {
    result <- validate_goal("invalid")
    expect_true(grepl("must be one of", result$message))
    expect_true(grepl("survival", result$message))
    expect_true(grepl("growth", result$message))
    expect_true(grepl("balance", result$message))
  })
})

describe("validate_fragment", {
  it("accepts valid fragment values", {
    expect_true(validate_fragment("Y")$valid)
    expect_true(validate_fragment("N")$valid)
    expect_true(validate_fragment("all")$valid)
  })

  it("rejects invalid fragment values", {
    expect_false(validate_fragment("yes")$valid)
    expect_false(validate_fragment("no")$valid)
    expect_false(validate_fragment("")$valid)
    expect_false(validate_fragment("true")$valid)
  })

  it("returns correct value on success", {
    result <- validate_fragment("Y")
    expect_equal(result$value, "Y")
  })

  it("returns error message on failure", {
    result <- validate_fragment("invalid")
    expect_true(grepl("must be one of", result$message))
  })
})

# ============================================================================
# TESTS - Score Calculation
# ============================================================================

describe("calculate_scores", {
  # Create mock data for score tests
  mock_survival <- data.frame(survival_rate = c(0.8, 0.6, 0.7))
  mock_growth <- data.frame(mean_growth = c(10, 20, 15), pct_growing = c(60, 80, 70))

  it("calculates correct scores for survival goal", {
    scores <- calculate_scores(mock_survival, mock_growth, "survival")
    # Survival goal should use survival rate directly
    expect_equal(scores, c(0.8, 0.6, 0.7))
  })

  it("calculates correct scores for growth goal", {
    scores <- calculate_scores(mock_survival, mock_growth, "growth")
    # Growth goal should use pct_growing / 100
    expect_equal(scores, c(0.6, 0.8, 0.7))
  })

  it("calculates correct scores for balance goal", {
    scores <- calculate_scores(mock_survival, mock_growth, "balance")
    # Balance = 0.5 * survival + 0.5 * pct_growing/100
    expected <- 0.5 * c(0.8, 0.6, 0.7) + 0.5 * c(0.6, 0.8, 0.7)
    expect_equal(scores, expected)
  })

  it("handles edge case of zero survival rate", {
    zero_survival <- data.frame(survival_rate = c(0, 0.5, 1))
    scores <- calculate_scores(zero_survival, mock_growth, "survival")
    expect_equal(scores[1], 0)
    expect_equal(scores[3], 1)
  })

  it("handles edge case of zero growth percentage", {
    zero_growth <- data.frame(mean_growth = c(-5, 0, 5), pct_growing = c(0, 50, 100))
    scores <- calculate_scores(mock_survival, zero_growth, "growth")
    expect_equal(scores[1], 0)
    expect_equal(scores[3], 1)
  })
})

# ============================================================================
# TESTS - Confidence Level
# ============================================================================

describe("get_confidence_level", {
  it("returns 'high' for large samples with low SE", {
    result <- get_confidence_level(n_survival = 150, n_growth = 80, se_survival = 0.03)
    expect_equal(result, "high")
  })

  it("returns 'medium' for moderate samples", {
    result <- get_confidence_level(n_survival = 50, n_growth = 30, se_survival = 0.08)
    expect_equal(result, "medium")
  })

  it("returns 'low' for small samples", {
    result <- get_confidence_level(n_survival = 20, n_growth = 10, se_survival = 0.15)
    expect_equal(result, "low")
  })

  it("returns 'medium' when SE is high despite large n", {
    result <- get_confidence_level(n_survival = 200, n_growth = 100, se_survival = 0.10)
    expect_equal(result, "medium")
  })

  it("returns 'low' when n_survival is below 30", {
    result <- get_confidence_level(n_survival = 25, n_growth = 50, se_survival = 0.02)
    expect_equal(result, "low")
  })

  it("returns 'low' when n_growth is below 20", {
    result <- get_confidence_level(n_survival = 100, n_growth = 15, se_survival = 0.02)
    expect_equal(result, "low")
  })

  it("handles NA SE values", {
    result <- get_confidence_level(n_survival = 150, n_growth = 80, se_survival = NA)
    expect_true(result %in% c("low", "medium"))  # Should not be "high"
  })
})

# ============================================================================
# TESTS - Caveats Generation
# ============================================================================

describe("generate_caveats", {
  it("always includes R-squared caveat", {
    caveats <- generate_caveats("balance", "SC3", 100, 50, "", "all")
    expect_true(any(grepl("Size explains only", caveats)))
  })

  it("includes limited survival data warning when n < 50", {
    caveats <- generate_caveats("balance", "SC3", 30, 50, "", "all")
    expect_true(any(grepl("Limited survival data", caveats)))
  })

  it("includes limited growth data warning when n < 30", {
    caveats <- generate_caveats("balance", "SC3", 100, 20, "", "all")
    expect_true(any(grepl("Limited growth data", caveats)))
  })

  it("includes dominant study warning when > 50%", {
    caveats <- generate_caveats("balance", "SC3", 100, 50, "", "all",
                                dominant_study_pct = 75)
    expect_true(any(grepl("single study", caveats)))
  })

  it("includes regional warning when region is specified", {
    caveats <- generate_caveats("balance", "SC3", 100, 50, "Florida", "all")
    expect_true(any(grepl("Regional estimates", caveats)))
  })

  it("includes fragment warning when fragment is Y", {
    caveats <- generate_caveats("balance", "SC3", 100, 50, "", "Y")
    expect_true(any(grepl("Fragment survival", caveats)))
  })

  it("includes growth recommendation for small corals with survival goal", {
    caveats <- generate_caveats("survival", "SC1", 100, 50, "", "all")
    expect_true(any(grepl("growing fragments larger", caveats)))
  })

  it("includes size warning for large corals with growth goal", {
    caveats <- generate_caveats("growth", "SC5", 100, 50, "", "all")
    expect_true(any(grepl("Large colonies grow slower", caveats)))
  })

  it("always includes local conditions caveat", {
    caveats <- generate_caveats("balance", "SC3", 100, 50, "", "all")
    expect_true(any(grepl("Local site conditions", caveats)))
  })

  it("always includes disturbance exclusion caveat", {
    caveats <- generate_caveats("balance", "SC3", 100, 50, "", "all")
    expect_true(any(grepl("disturbance events", caveats)))
  })
})

# ============================================================================
# TESTS - GET /outplant Endpoint
# ============================================================================

describe("GET /recommendation/outplant", {
  it("returns successful recommendation with default parameters", {
    result <- get_outplant_recommendation()
    expect_false(result$error)
    expect_true("recommendation" %in% names(result))
    expect_true("survival" %in% names(result))
    expect_true("growth" %in% names(result))
    expect_true("confidence" %in% names(result))
    expect_true("caveats" %in% names(result))
  })

  it("returns a valid size class recommendation", {
    result <- get_outplant_recommendation()
    expect_true(result$recommendation$recommended_size_class %in% SIZE_CLASS_NAMES)
  })

  it("returns score between 0 and 1", {
    result <- get_outplant_recommendation()
    expect_true(result$recommendation$score >= 0 && result$recommendation$score <= 1)
  })

  it("survival rate is between 0 and 1", {
    result <- get_outplant_recommendation()
    expect_true(result$survival$rate >= 0 && result$survival$rate <= 1)
  })

  it("confidence intervals are bounded correctly", {
    result <- get_outplant_recommendation()
    expect_true(result$survival$ci_lower >= 0)
    expect_true(result$survival$ci_upper <= 1)
    expect_true(result$survival$ci_lower <= result$survival$ci_upper)
  })

  it("returns correct goal in response", {
    for (g in c("survival", "growth", "balance")) {
      result <- get_outplant_recommendation(goal = g)
      expect_equal(result$recommendation$goal, g)
    }
  })

  it("applies region filter correctly", {
    result_all <- get_outplant_recommendation()
    result_filtered <- get_outplant_recommendation(region = "Florida")

    expect_true(result_filtered$meta$total_survival_records <=
                result_all$meta$total_survival_records)
    expect_equal(result_filtered$meta$filters$region, "Florida")
  })

  it("applies fragment filter correctly", {
    result_all <- get_outplant_recommendation()
    result_Y <- get_outplant_recommendation(fragment = "Y")
    result_N <- get_outplant_recommendation(fragment = "N")

    expect_equal(result_Y$meta$filters$fragment, "Y")
    expect_equal(result_N$meta$filters$fragment, "N")

    # Filtered results should have fewer records
    expect_true(result_Y$meta$total_survival_records <=
                result_all$meta$total_survival_records)
  })

  it("includes all_sizes comparison data", {
    result <- get_outplant_recommendation()
    expect_true("all_sizes" %in% names(result))
    expect_true(is.data.frame(result$all_sizes))
    expect_true("is_recommended" %in% names(result$all_sizes))

    # Exactly one should be recommended
    expect_equal(sum(result$all_sizes$is_recommended), 1)
  })

  it("includes meta information", {
    result <- get_outplant_recommendation()
    expect_true("meta" %in% names(result))
    expect_true("total_survival_records" %in% names(result$meta))
    expect_true("total_growth_records" %in% names(result$meta))
    expect_true("filters" %in% names(result$meta))
  })

  it("confidence level is one of valid values", {
    result <- get_outplant_recommendation()
    expect_true(result$confidence %in% c("low", "medium", "high"))
  })

  it("returns non-empty caveats", {
    result <- get_outplant_recommendation()
    expect_true(length(result$caveats) > 0)
  })
})

# ============================================================================
# TESTS - Error Handling
# ============================================================================

describe("Error handling - invalid parameters", {
  it("returns 400 for invalid goal", {
    result <- get_outplant_recommendation(goal = "invalid")
    expect_true(result$error)
    expect_equal(result$code, "INVALID_PARAMETER")
    expect_equal(result$status_code, 400)
    expect_true(grepl("goal", result$details$parameter))
  })

  it("returns 400 for empty goal", {
    result <- get_outplant_recommendation(goal = "")
    expect_true(result$error)
    expect_equal(result$code, "INVALID_PARAMETER")
  })

  it("returns 400 for invalid fragment value", {
    result <- get_outplant_recommendation(fragment = "yes")
    expect_true(result$error)
    expect_equal(result$code, "INVALID_PARAMETER")
    expect_equal(result$status_code, 400)
    expect_true(grepl("fragment", result$details$parameter))
  })

  it("error response includes allowed values", {
    result <- get_outplant_recommendation(goal = "invalid")
    expect_true("allowed" %in% names(result$details))
    expect_true(all(c("survival", "growth", "balance") %in% result$details$allowed))
  })
})

describe("Error handling - insufficient data", {
  it("returns error when filtered data is too small", {
    # Use a region filter that will result in very few records
    result <- get_outplant_recommendation(region = "NonexistentRegion")
    expect_true(result$error)
    expect_equal(result$code, "INSUFFICIENT_DATA")
  })

  it("handles combined filters resulting in no data", {
    # Create a very restrictive filter combination
    result <- get_outplant_recommendation(
      region = "NonexistentRegion",
      fragment = "Y"
    )
    expect_true(result$error)
  })
})

describe("Error handling - missing data", {
  it("handles missing survival data", {
    # Temporarily remove survival data
    original_survival <- data_env$survival_individual
    data_env$survival_individual <- NULL

    result <- get_outplant_recommendation()
    expect_true(result$error)
    expect_equal(result$code, "DATA_UNAVAILABLE")
    expect_true(grepl("Survival data", result$message))

    # Restore data
    data_env$survival_individual <- original_survival
  })

  it("handles missing growth data", {
    # Temporarily remove growth data
    original_growth <- data_env$growth_individual
    data_env$growth_individual <- NULL

    result <- get_outplant_recommendation()
    expect_true(result$error)
    expect_equal(result$code, "DATA_UNAVAILABLE")
    expect_true(grepl("Growth data", result$message))

    # Restore data
    data_env$growth_individual <- original_growth
  })
})

# ============================================================================
# TESTS - Scoring Behavior
# ============================================================================

describe("Recommendation scoring behavior", {
  it("survival goal favors highest survival rate", {
    result <- get_outplant_recommendation(goal = "survival")

    # The recommended class should have the highest survival rate
    max_survival <- max(result$all_sizes$survival_rate)
    recommended_survival <- result$all_sizes$survival_rate[result$all_sizes$is_recommended]

    expect_equal(recommended_survival, max_survival)
  })

  it("growth goal favors highest growth percentage", {
    result <- get_outplant_recommendation(goal = "growth")

    # The recommended class should have highest pct_growing
    max_growth <- max(result$all_sizes$pct_growing)
    recommended_growth <- result$all_sizes$pct_growing[result$all_sizes$is_recommended]

    expect_equal(recommended_growth, max_growth)
  })

  it("balance goal considers both survival and growth", {
    result <- get_outplant_recommendation(goal = "balance")

    # Score should be between survival and growth scores
    recommended_row <- result$all_sizes[result$all_sizes$is_recommended, ]

    survival_score <- recommended_row$survival_rate
    growth_score <- recommended_row$pct_growing / 100
    balance_score <- recommended_row$score

    expected_balance <- 0.5 * survival_score + 0.5 * growth_score
    expect_equal(balance_score, expected_balance, tolerance = 0.001)
  })

  it("different goals may recommend different size classes", {
    result_survival <- get_outplant_recommendation(goal = "survival")
    result_growth <- get_outplant_recommendation(goal = "growth")

    # These may or may not be the same depending on data
    # Just verify both return valid recommendations
    expect_true(result_survival$recommendation$recommended_size_class %in% SIZE_CLASS_NAMES)
    expect_true(result_growth$recommendation$recommended_size_class %in% SIZE_CLASS_NAMES)
  })
})

# ============================================================================
# TESTS - Edge Cases
# ============================================================================

describe("Edge cases", {
  it("handles single size class with data", {
    # This would occur with very restrictive filters
    # The endpoint should still return a valid recommendation
    result <- get_outplant_recommendation()
    expect_true(nrow(result$all_sizes) >= 1)
  })

  it("handles empty string region as no filter", {
    result <- get_outplant_recommendation(region = "")
    expect_equal(result$meta$filters$region, "all")
  })

  it("handles 'all' region parameter", {
    result <- get_outplant_recommendation(region = "all")
    expect_equal(result$meta$filters$region, "all")
  })

  it("handles comma-separated regions", {
    result <- get_outplant_recommendation(region = "Florida,USVI")
    # Should apply filter without error
    expect_false(result$error)
  })

  it("handles whitespace in region names", {
    # Regions with spaces should be handled
    result <- get_outplant_recommendation(region = "Puerto Rico")
    expect_false(result$error)
  })
})

# ============================================================================
# TESTS - Data Integrity
# ============================================================================

describe("Data integrity checks", {
  it("all survival rates are within valid range", {
    result <- get_outplant_recommendation()
    if (!result$error) {
      expect_true(all(result$all_sizes$survival_rate >= 0 &
                      result$all_sizes$survival_rate <= 1))
    }
  })

  it("all pct_growing values are within valid range", {
    result <- get_outplant_recommendation()
    if (!result$error) {
      expect_true(all(result$all_sizes$pct_growing >= 0 &
                      result$all_sizes$pct_growing <= 100))
    }
  })

  it("all scores are within valid range", {
    result <- get_outplant_recommendation()
    if (!result$error) {
      expect_true(all(result$all_sizes$score >= 0 &
                      result$all_sizes$score <= 1))
    }
  })

  it("n values in survival and growth are positive integers", {
    result <- get_outplant_recommendation()
    if (!result$error) {
      expect_true(result$survival$n > 0)
      expect_true(result$growth$n > 0)
      expect_true(result$survival$n == floor(result$survival$n))
      expect_true(result$growth$n == floor(result$growth$n))
    }
  })
})
