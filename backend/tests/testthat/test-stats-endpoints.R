# Tests for stats.R endpoints
library(testthat)
library(dplyr)

# Source setup
source("setup.R")

# Mock the global data_env
data_env <- get_test_data()

# Null coalesce operator
`%||%` <- function(x, y) if (is.null(x)) y else x

# ============================================================================
# Helper function mirroring endpoint logic
# ============================================================================

get_stats_overview <- function() {
  surv <- data_env$survival_individual
  growth <- data_env$growth_individual

  list(
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
    mean_growth = if (!is.null(growth) && nrow(growth) > 0) mean(growth$growth_cm2_yr, na.rm = TRUE) else NA,
    data_type_breakdown = surv %>%
      count(data_type) %>%
      as.list(),
    region_breakdown = surv %>%
      count(region, sort = TRUE) %>%
      as.list()
  )
}

# ============================================================================
# TESTS
# ============================================================================

describe("GET /stats/overview", {
  it("returns overview statistics", {
    result <- get_stats_overview()
    expect_true(is.list(result))
    expect_true("total_observations" %in% names(result))
    expect_true("survival_observations" %in% names(result))
    expect_true("growth_observations" %in% names(result))
    expect_true("total_studies" %in% names(result))
    expect_true("total_regions" %in% names(result))
    expect_true("total_sites" %in% names(result))
    expect_true("year_range" %in% names(result))
    expect_true("mean_survival" %in% names(result))
    expect_true("mean_growth" %in% names(result))
  })

  it("total_observations = survival + growth", {
    result <- get_stats_overview()
    expected <- result$survival_observations + result$growth_observations
    expect_equal(result$total_observations, expected)
  })

  it("survival_observations matches test data", {
    result <- get_stats_overview()
    expect_equal(result$survival_observations, 200)
  })

  it("growth_observations matches test data", {
    result <- get_stats_overview()
    expect_equal(result$growth_observations, 150)
  })

  it("total_studies is positive", {
    result <- get_stats_overview()
    expect_true(result$total_studies > 0)
    expect_equal(result$total_studies, 3)  # Study A, B, C in test data
  })

  it("total_regions is positive", {
    result <- get_stats_overview()
    expect_true(result$total_regions > 0)
    expect_equal(result$total_regions, 4)  # Florida, USVI, Puerto Rico, Curacao
  })

  it("total_sites >= total_regions", {
    result <- get_stats_overview()
    expect_true(result$total_sites >= result$total_regions)
  })

  it("year_range is a valid range", {
    result <- get_stats_overview()
    expect_true(length(result$year_range) == 2)
    expect_true(result$year_range[1] <= result$year_range[2])
    expect_true(result$year_range[1] >= 2000)  # Reasonable minimum
    expect_true(result$year_range[2] <= 2030)  # Reasonable maximum
  })

  it("mean_survival between 0 and 1", {
    result <- get_stats_overview()
    expect_true(result$mean_survival >= 0 & result$mean_survival <= 1)
  })

  it("mean_growth is numeric", {
    result <- get_stats_overview()
    expect_true(is.numeric(result$mean_growth))
  })

  it("data_type_breakdown has expected structure", {
    result <- get_stats_overview()
    expect_true(is.list(result$data_type_breakdown))
    expect_true("data_type" %in% names(result$data_type_breakdown))
    expect_true("n" %in% names(result$data_type_breakdown))
  })

  it("region_breakdown has expected structure", {
    result <- get_stats_overview()
    expect_true(is.list(result$region_breakdown))
    expect_true("region" %in% names(result$region_breakdown))
    expect_true("n" %in% names(result$region_breakdown))
  })

  it("region_breakdown counts sum to survival_observations", {
    result <- get_stats_overview()
    region_sum <- sum(result$region_breakdown$n)
    expect_equal(region_sum, result$survival_observations)
  })

  it("data_type_breakdown counts sum to survival_observations", {
    result <- get_stats_overview()
    type_sum <- sum(result$data_type_breakdown$n)
    expect_equal(type_sum, result$survival_observations)
  })
})

describe("edge cases", {
  it("handles missing growth data gracefully", {
    # Temporarily remove growth data
    original_growth <- data_env$growth_individual
    data_env$growth_individual <- NULL

    result <- get_stats_overview()
    expect_true(is.na(result$mean_growth) || is.null(result$mean_growth))
    expect_equal(result$growth_observations, 0)

    # Reset
    data_env$growth_individual <- original_growth
  })

  it("handles empty growth data frame", {
    # Temporarily set to empty df
    original_growth <- data_env$growth_individual
    data_env$growth_individual <- data.frame()

    result <- get_stats_overview()
    expect_equal(result$growth_observations, 0)

    # Reset
    data_env$growth_individual <- original_growth
  })

  it("year_range handles NA values", {
    # Add some NA years
    original_years <- data_env$survival_individual$survey_yr[1:5]
    data_env$survival_individual$survey_yr[1:5] <- NA

    result <- get_stats_overview()
    # Should still return valid year range (from non-NA values)
    expect_true(!is.na(result$year_range[1]))
    expect_true(!is.na(result$year_range[2]))

    # Reset
    data_env$survival_individual$survey_yr[1:5] <- original_years
  })

  it("counts unique studies correctly", {
    # Verify unique counting
    result <- get_stats_overview()
    expected_studies <- n_distinct(data_env$survival_individual$study)
    expect_equal(result$total_studies, expected_studies)
  })

  it("counts unique sites as region_location combinations", {
    result <- get_stats_overview()
    expected_sites <- n_distinct(paste(
      data_env$survival_individual$region,
      data_env$survival_individual$location
    ))
    expect_equal(result$total_sites, expected_sites)
  })
})

describe("data consistency", {
  it("region breakdown matches actual regions in data", {
    result <- get_stats_overview()
    actual_regions <- unique(data_env$survival_individual$region)
    breakdown_regions <- result$region_breakdown$region
    expect_true(all(actual_regions %in% breakdown_regions))
    expect_true(all(breakdown_regions %in% actual_regions))
  })

  it("data type breakdown matches actual types in data", {
    result <- get_stats_overview()
    actual_types <- unique(data_env$survival_individual$data_type)
    breakdown_types <- result$data_type_breakdown$data_type
    expect_true(all(actual_types %in% breakdown_types))
    expect_true(all(breakdown_types %in% actual_types))
  })
})
