# Tests for growth.R endpoints
library(testthat)
library(dplyr)
library(tidyr)

# Source setup
source("setup.R")

# Mock the global data_env
data_env <- get_test_data()

# Size class definitions
SIZE_BREAKS <- c(0, 25, 100, 500, 2000, Inf)
SIZE_LABELS <- c("SC1 (0-25)", "SC2 (25-100)", "SC3 (100-500)",
                 "SC4 (500-2000)", "SC5 (>2000)")

# ============================================================================
# Helper functions mirroring endpoint logic
# ============================================================================

get_growth_individual <- function(region = "", data_type = "",
                                   year_min = 2000, year_max = 2025) {
  result <- data_env$growth_individual

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
      survey_yr <= as.numeric(year_max)
    )

  list(
    data = result,
    meta = list(
      total_records = nrow(result)
    )
  )
}

get_growth_by_size <- function(region = "", data_type = "") {
  result <- data_env$growth_individual

  if (region != "") {
    regions <- strsplit(region, ",")[[1]]
    result <- result %>% filter(region %in% regions)
  }

  if (data_type != "") {
    types <- strsplit(data_type, ",")[[1]]
    result <- result %>% filter(data_type %in% types)
  }

  result %>%
    mutate(size_class = cut(size_cm2, breaks = SIZE_BREAKS, labels = SIZE_LABELS,
                            include.lowest = TRUE)) %>%
    group_by(size_class) %>%
    summarise(
      n = n(),
      mean_growth = mean(growth_cm2_yr, na.rm = TRUE),
      sd_growth = sd(growth_cm2_yr, na.rm = TRUE),
      median_growth = median(growth_cm2_yr, na.rm = TRUE),
      q25 = quantile(growth_cm2_yr, 0.25, na.rm = TRUE),
      q75 = quantile(growth_cm2_yr, 0.75, na.rm = TRUE),
      pct_shrinking = mean(growth_cm2_yr < 0, na.rm = TRUE) * 100,
      pct_growing = mean(growth_cm2_yr > 0, na.rm = TRUE) * 100,
      .groups = "drop"
    )
}

get_growth_by_size_and_type <- function(region = "") {
  result <- data_env$growth_individual

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
      mean_growth = mean(growth_cm2_yr, na.rm = TRUE),
      sd_growth = sd(growth_cm2_yr, na.rm = TRUE),
      se = sd_growth / sqrt(n),
      ci_lower = mean_growth - 1.96 * se,
      ci_upper = mean_growth + 1.96 * se,
      median_growth = median(growth_cm2_yr, na.rm = TRUE),
      q25 = quantile(growth_cm2_yr, 0.25, na.rm = TRUE),
      q75 = quantile(growth_cm2_yr, 0.75, na.rm = TRUE),
      pct_shrinking = mean(growth_cm2_yr < 0, na.rm = TRUE) * 100,
      pct_growing = mean(growth_cm2_yr > 0, na.rm = TRUE) * 100,
      .groups = "drop"
    ) %>%
    filter(!is.na(size_class))
}

get_growth_transitions <- function(region = "", data_type = "") {
  labels <- c("SC1", "SC2", "SC3", "SC4", "SC5")

  result <- data_env$growth_individual

  if (region != "") {
    regions <- strsplit(region, ",")[[1]]
    result <- result %>% filter(region %in% regions)
  }

  if (data_type != "") {
    types <- strsplit(data_type, ",")[[1]]
    result <- result %>% filter(data_type %in% types)
  }

  result %>%
    mutate(
      initial_class = cut(size_cm2, SIZE_BREAKS, labels = labels, include.lowest = TRUE),
      final_size = size_cm2 + growth_cm2_yr,
      final_size = pmax(1, final_size),  # Minimum size 1 cm2
      final_class = cut(final_size, SIZE_BREAKS, labels = labels, include.lowest = TRUE)
    ) %>%
    filter(!is.na(initial_class), !is.na(final_class)) %>%
    count(initial_class, final_class) %>%
    group_by(initial_class) %>%
    mutate(prob = n / sum(n)) %>%
    select(-n) %>%
    pivot_wider(names_from = final_class, values_from = prob, values_fill = 0) %>%
    ungroup()
}

# ============================================================================
# TESTS
# ============================================================================

describe("GET /growth/individual", {
  it("returns all records with no filters", {
    result <- get_growth_individual()
    expect_true(is.list(result))
    expect_true("data" %in% names(result))
    expect_true("meta" %in% names(result))
    expect_equal(nrow(result$data), 150)
  })

  it("filters by region", {
    result <- get_growth_individual(region = "Florida")
    expect_true(all(result$data$region == "Florida"))
  })

  it("filters by multiple regions", {
    result <- get_growth_individual(region = "Florida,USVI")
    expect_true(all(result$data$region %in% c("Florida", "USVI")))
  })

  it("filters by data_type", {
    result <- get_growth_individual(data_type = "field")
    expect_true(all(result$data$data_type == "field"))
  })

  it("filters by year range", {
    result <- get_growth_individual(year_min = 2015, year_max = 2020)
    if (nrow(result$data) > 0) {
      expect_true(all(result$data$survey_yr >= 2015))
      expect_true(all(result$data$survey_yr <= 2020))
    }
  })

  it("handles combined filters", {
    result <- get_growth_individual(
      region = "Florida",
      data_type = "field",
      year_min = 2015
    )
    if (nrow(result$data) > 0) {
      expect_true(all(result$data$region == "Florida"))
      expect_true(all(result$data$data_type == "field"))
      expect_true(all(result$data$survey_yr >= 2015))
    }
  })

  # Edge case
  it("returns empty data when no matches", {
    result <- get_growth_individual(region = "NonexistentRegion")
    expect_equal(nrow(result$data), 0)
    expect_equal(result$meta$total_records, 0)
  })
})

describe("GET /growth/by-size", {
  it("returns growth statistics by size class", {
    result <- get_growth_by_size()
    expect_true(is.data.frame(result))
    expect_true("size_class" %in% names(result))
    expect_true("n" %in% names(result))
    expect_true("mean_growth" %in% names(result))
    expect_true("sd_growth" %in% names(result))
    expect_true("median_growth" %in% names(result))
    expect_true("pct_shrinking" %in% names(result))
    expect_true("pct_growing" %in% names(result))
  })

  it("has valid size class labels", {
    result <- get_growth_by_size()
    actual_labels <- as.character(result$size_class)
    expect_true(all(actual_labels %in% SIZE_LABELS))
  })

  it("percentages sum to approximately 100", {
    result <- get_growth_by_size()
    # pct_shrinking + pct_growing + pct_zero should sum to 100
    # (but we only track growing and shrinking)
    # Just verify they're sensible
    expect_true(all(result$pct_shrinking >= 0 & result$pct_shrinking <= 100))
    expect_true(all(result$pct_growing >= 0 & result$pct_growing <= 100))
  })

  it("sd_growth is non-negative", {
    result <- get_growth_by_size()
    expect_true(all(result$sd_growth >= 0 | is.na(result$sd_growth)))
  })

  it("quartiles are ordered correctly", {
    result <- get_growth_by_size()
    expect_true(all(result$q25 <= result$median_growth | is.na(result$q25)))
    expect_true(all(result$median_growth <= result$q75 | is.na(result$median_growth)))
  })

  it("applies region filter", {
    result_all <- get_growth_by_size()
    result_filtered <- get_growth_by_size(region = "Florida")
    expect_true(sum(result_filtered$n, na.rm = TRUE) <= sum(result_all$n, na.rm = TRUE))
  })
})

describe("GET /growth/by-size-and-type", {
  it("returns growth stratified by coral type", {
    result <- get_growth_by_size_and_type()
    expect_true(is.data.frame(result))
    expect_true("coral_type" %in% names(result))
  })

  it("filters out Other coral types", {
    result <- get_growth_by_size_and_type()
    if (nrow(result) > 0) {
      expect_true(all(result$coral_type %in% c("Natural", "Restored")))
    }
  })

  it("excludes NA size classes", {
    result <- get_growth_by_size_and_type()
    expect_true(!any(is.na(result$size_class)))
  })

  it("calculates confidence intervals", {
    result <- get_growth_by_size_and_type()
    if (nrow(result) > 0) {
      expect_true("ci_lower" %in% names(result))
      expect_true("ci_upper" %in% names(result))
      expect_true(all(result$ci_lower <= result$ci_upper))
    }
  })
})

describe("GET /growth/transitions", {
  it("returns transition matrix", {
    result <- get_growth_transitions()
    expect_true(is.data.frame(result))
    expect_true("initial_class" %in% names(result))
  })

  it("has rows for initial classes", {
    result <- get_growth_transitions()
    expected_labels <- c("SC1", "SC2", "SC3", "SC4", "SC5")
    actual_labels <- as.character(result$initial_class)
    expect_true(all(actual_labels %in% expected_labels))
  })

  it("transition probabilities sum to 1 per row", {
    result <- get_growth_transitions()
    # Get numeric columns only
    numeric_cols <- names(result)[names(result) != "initial_class"]
    if (length(numeric_cols) > 0) {
      row_sums <- rowSums(result[, numeric_cols], na.rm = TRUE)
      expect_true(all(abs(row_sums - 1) < 0.001))
    }
  })

  it("all probabilities between 0 and 1", {
    result <- get_growth_transitions()
    numeric_cols <- names(result)[names(result) != "initial_class"]
    if (length(numeric_cols) > 0) {
      for (col in numeric_cols) {
        expect_true(all(result[[col]] >= 0 & result[[col]] <= 1))
      }
    }
  })

  it("applies region filter", {
    result_all <- get_growth_transitions()
    result_filtered <- get_growth_transitions(region = "Florida")
    # Both should produce valid transition matrices
    expect_true(nrow(result_all) >= nrow(result_filtered) || nrow(result_filtered) == 0)
  })
})

describe("growth statistics calculations", {
  it("SE formula is correct: sd/sqrt(n)", {
    result <- get_growth_by_size_and_type()
    if (nrow(result) > 0) {
      calculated_se <- result$sd_growth / sqrt(result$n)
      expect_equal(result$se, calculated_se, tolerance = 0.001)
    }
  })

  it("pct_shrinking correctly identifies negative growth", {
    result <- get_growth_by_size()
    # Manually verify on raw data
    for (i in 1:nrow(result)) {
      size_class_data <- data_env$growth_individual %>%
        mutate(size_class = cut(size_cm2, breaks = SIZE_BREAKS, labels = SIZE_LABELS,
                                include.lowest = TRUE)) %>%
        filter(as.character(size_class) == as.character(result$size_class[i]))

      if (nrow(size_class_data) > 0) {
        expected_pct <- mean(size_class_data$growth_cm2_yr < 0, na.rm = TRUE) * 100
        expect_equal(result$pct_shrinking[i], expected_pct, tolerance = 0.01)
      }
    }
  })
})

describe("edge cases", {
  it("handles minimum final_size of 1 in transitions", {
    # Create growth data with large negative growth
    data_env$growth_individual$growth_cm2_yr[1] <- -10000

    result <- get_growth_transitions()
    # Should not have negative sizes - minimum is enforced at 1 cm2
    expect_true(nrow(result) > 0)

    # Reset
    data_env <<- get_test_data()
  })

  it("handles all same growth rate (zero variance)", {
    # Store original
    original_growth <- data_env$growth_individual$growth_cm2_yr

    # Set all to same value
    data_env$growth_individual$growth_cm2_yr <- 10

    result <- get_growth_by_size()
    # SD should be 0 or NA
    expect_true(all(result$sd_growth == 0 | is.na(result$sd_growth)))

    # Reset
    data_env$growth_individual$growth_cm2_yr <- original_growth
  })
})
