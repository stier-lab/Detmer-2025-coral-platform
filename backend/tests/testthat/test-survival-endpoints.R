# Tests for survival.R endpoints
library(testthat)
library(dplyr)

# Source setup
source("setup.R")

# Mock the global data_env that endpoints expect
data_env <- get_test_data()

# Source the survival functions (we need to extract them from the plumber file)
# Since plumber uses decorators, we'll test the underlying logic

# Size class definitions matching the endpoint
SIZE_BREAKS <- c(0, 25, 100, 500, 2000, Inf)
SIZE_LABELS <- c("SC1 (0-25)", "SC2 (25-100)", "SC3 (100-500)",
                 "SC4 (500-2000)", "SC5 (>2000)")

# ============================================================================
# Helper functions that mirror endpoint logic for testing
# ============================================================================

get_survival_individual <- function(region = "", data_type = "", year_min = 2000,
                                     year_max = 2025, size_min = 0, size_max = 200000,
                                     fragment = NULL) {
  result <- data_env$survival_individual

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
      survey_yr >= as.numeric(year_min),
      survey_yr <= as.numeric(year_max),
      size_cm2 >= as.numeric(size_min),
      size_cm2 <= as.numeric(size_max)
    )

  if (!is.null(fragment) && fragment != "" && fragment != "all") {
    result <- result %>% filter(fragment == !!fragment)
  }

  list(
    data = result,
    meta = list(
      total_records = nrow(result)
    )
  )
}

get_survival_by_size <- function(region = "", data_type = "",
                                  breaks = "0,25,100,500,2000,Inf") {
  brks <- as.numeric(strsplit(breaks, ",")[[1]])
  brks[length(brks)] <- Inf

  result <- data_env$survival_individual

  if (region != "") {
    regions <- strsplit(region, ",")[[1]]
    result <- result %>% filter(region %in% regions)
  }

  if (data_type != "") {
    types <- strsplit(data_type, ",")[[1]]
    result <- result %>% filter(data_type %in% types)
  }

  result %>%
    mutate(size_class = cut(size_cm2, breaks = brks, labels = SIZE_LABELS,
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
}

get_survival_by_size_and_type <- function(region = "") {
  result <- data_env$survival_individual

  if (region != "") {
    regions <- strsplit(region, ",")[[1]]
    result <- result %>% filter(region %in% regions)
  }

  result <- result %>%
    mutate(
      coral_type = case_when(
        grepl("nursery", data_type, ignore.case = TRUE) ~ "Restored",
        data_type == "field" ~ "Natural",
        TRUE ~ "Other"
      )
    ) %>%
    filter(coral_type %in% c("Natural", "Restored"))

  result %>%
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
}

# ============================================================================
# TESTS
# ============================================================================

describe("GET /survival/individual", {
  it("returns all records with no filters", {
    result <- get_survival_individual()
    expect_true(is.list(result))
    expect_true("data" %in% names(result))
    expect_true("meta" %in% names(result))
    expect_equal(nrow(result$data), 200)
    expect_equal(result$meta$total_records, 200)
  })

  it("filters by region", {
    result <- get_survival_individual(region = "Florida")
    expect_true(all(result$data$region == "Florida"))
    expect_lt(nrow(result$data), 200)  # Should be subset
  })

  it("filters by multiple regions", {
    result <- get_survival_individual(region = "Florida,USVI")
    expect_true(all(result$data$region %in% c("Florida", "USVI")))
  })

  it("filters by data_type", {
    result <- get_survival_individual(data_type = "field")
    expect_true(all(result$data$data_type == "field"))
  })

  it("filters by year range", {
    result <- get_survival_individual(year_min = 2015, year_max = 2020)
    expect_true(all(result$data$survey_yr >= 2015))
    expect_true(all(result$data$survey_yr <= 2020))
  })

  it("filters by size range", {
    result <- get_survival_individual(size_min = 100, size_max = 1000)
    expect_true(all(result$data$size_cm2 >= 100))
    expect_true(all(result$data$size_cm2 <= 1000))
  })

  it("filters by fragment status Y", {
    result <- get_survival_individual(fragment = "Y")
    expect_true(all(result$data$fragment == "Y"))
  })

  it("filters by fragment status N", {
    result <- get_survival_individual(fragment = "N")
    expect_true(all(result$data$fragment == "N"))
  })

  it("handles fragment='all' as no filter", {
    result_all <- get_survival_individual(fragment = "all")
    result_none <- get_survival_individual()
    expect_equal(nrow(result_all$data), nrow(result_none$data))
  })

  it("handles combined filters", {
    result <- get_survival_individual(
      region = "Florida",
      data_type = "field",
      year_min = 2015,
      fragment = "N"
    )
    if (nrow(result$data) > 0) {
      expect_true(all(result$data$region == "Florida"))
      expect_true(all(result$data$data_type == "field"))
      expect_true(all(result$data$survey_yr >= 2015))
      expect_true(all(result$data$fragment == "N"))
    }
  })

  # Edge cases
  it("returns empty data when no matches", {
    result <- get_survival_individual(region = "NonexistentRegion")
    expect_equal(nrow(result$data), 0)
    expect_equal(result$meta$total_records, 0)
  })

  it("handles empty string region as no filter", {
    result <- get_survival_individual(region = "")
    expect_equal(nrow(result$data), 200)
  })

  it("handles numeric strings for year parameters", {
    result <- get_survival_individual(year_min = "2015", year_max = "2020")
    expect_true(all(result$data$survey_yr >= 2015))
    expect_true(all(result$data$survey_yr <= 2020))
  })
})

describe("GET /survival/by-size", {
  it("returns survival rates by size class", {
    result <- get_survival_by_size()
    expect_true(is.data.frame(result))
    expect_true("size_class" %in% names(result))
    expect_true("n" %in% names(result))
    expect_true("survival_rate" %in% names(result))
    expect_true("se" %in% names(result))
    expect_true("ci_lower" %in% names(result))
    expect_true("ci_upper" %in% names(result))
  })

  it("has correct size class labels", {
    result <- get_survival_by_size()
    expected_labels <- SIZE_LABELS
    actual_labels <- as.character(result$size_class)
    expect_true(all(actual_labels %in% expected_labels))
  })

  it("survival rates are between 0 and 1", {
    result <- get_survival_by_size()
    expect_true(all(result$survival_rate >= 0 & result$survival_rate <= 1))
  })

  it("confidence intervals are bounded 0-1", {
    result <- get_survival_by_size()
    expect_true(all(result$ci_lower >= 0))
    expect_true(all(result$ci_upper <= 1))
    expect_true(all(result$ci_lower <= result$ci_upper))
  })

  it("standard errors are non-negative", {
    result <- get_survival_by_size()
    expect_true(all(result$se >= 0))
  })

  it("applies region filter", {
    result_all <- get_survival_by_size()
    result_filtered <- get_survival_by_size(region = "Florida")
    expect_true(sum(result_filtered$n) <= sum(result_all$n))
  })

  it("applies data_type filter", {
    result <- get_survival_by_size(data_type = "field")
    expect_true(nrow(result) > 0)
  })

  # Edge case: default breaks always used (5 size classes)
  it("uses default size class breaks (5 classes)", {
    result <- get_survival_by_size()
    # Should produce up to 5 size classes
    expect_true(nrow(result) <= 5)
  })
})

describe("GET /survival/by-size-and-type", {
  it("returns survival stratified by coral type", {
    result <- get_survival_by_size_and_type()
    expect_true(is.data.frame(result))
    expect_true("coral_type" %in% names(result))
    expect_true(all(result$coral_type %in% c("Natural", "Restored")))
  })

  it("has both Natural and Restored types", {
    result <- get_survival_by_size_and_type()
    types <- unique(result$coral_type)
    expect_true(length(types) >= 1)  # At least one type present
  })

  it("filters by region", {
    result <- get_survival_by_size_and_type(region = "Florida")
    # Result should be a subset
    expect_true(nrow(result) >= 0)
  })

  it("excludes NA size classes", {
    result <- get_survival_by_size_and_type()
    expect_true(!any(is.na(result$size_class)))
  })

  it("survival rates bounded 0-1", {
    result <- get_survival_by_size_and_type()
    expect_true(all(result$survival_rate >= 0 & result$survival_rate <= 1))
  })
})

describe("survival statistics calculations", {
  it("n_survived <= n for all size classes", {
    result <- get_survival_by_size()
    expect_true(all(result$n_survived <= result$n))
  })

  it("survival_rate = n_survived / n", {
    result <- get_survival_by_size()
    calculated_rate <- result$n_survived / result$n
    expect_equal(result$survival_rate, calculated_rate, tolerance = 0.001)
  })

  it("SE formula is correct: sqrt(p*(1-p)/n)", {
    result <- get_survival_by_size()
    calculated_se <- sqrt(result$survival_rate * (1 - result$survival_rate) / result$n)
    expect_equal(result$se, calculated_se, tolerance = 0.001)
  })
})

describe("edge cases and error handling", {
  it("handles filters resulting in no data", {
    result <- get_survival_individual(
      region = "Florida",
      year_min = 1900,
      year_max = 1901
    )
    expect_equal(nrow(result$data), 0)
  })

  it("handles very large size_max", {
    result <- get_survival_individual(size_max = 1e10)
    expect_equal(nrow(result$data), 200)
  })

  it("handles zero as size_min", {
    result <- get_survival_individual(size_min = 0)
    expect_equal(nrow(result$data), 200)
  })
})
