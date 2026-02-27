# Tests for quality.R endpoints
library(testthat)
library(dplyr)
library(tidyr)

# Source setup
source("setup.R")

# Mock the global data_env
data_env <- get_test_data()

# Size class definitions
SIZE_BREAKS <- c(0, 25, 100, 500, 2000, Inf)
SIZE_LABELS <- c("SC1", "SC2", "SC3", "SC4", "SC5")

# Null coalesce operator
`%||%` <- function(x, y) if (is.null(x)) y else x

# ============================================================================
# Helper functions mirroring endpoint logic
# ============================================================================

get_quality_metrics <- function(region = "", data_type = "") {
  data <- data_env$survival_individual

  if (region != "") {
    regions <- strsplit(region, ",")[[1]]
    data <- data %>% filter(region %in% regions)
  }

  if (data_type != "") {
    types <- strsplit(data_type, ",")[[1]]
    data <- data %>% filter(data_type %in% types)
  }

  # Handle empty data
  if (nrow(data) == 0) {
    return(list(
      r_squared = NA,
      sample_size = 0,
      n_studies = 0,
      dominant_study = NULL,
      fragment_mix = FALSE,
      warnings = list("No data available for selected filters")
    ))
  }

  # Calculate R-squared
  r_squared <- tryCatch({
    valid_data <- data %>%
      filter(!is.na(size_cm2), size_cm2 > 0, !is.na(survived))

    if (nrow(valid_data) < 10) {
      NA
    } else {
      model <- glm(survived ~ log(size_cm2), data = valid_data, family = binomial)
      null_model <- glm(survived ~ 1, data = valid_data, family = binomial)
      1 - (logLik(model) / logLik(null_model))
    }
  }, error = function(e) NA)

  # Study dominance
  study_counts <- data %>%
    count(study, sort = TRUE) %>%
    mutate(pct = n / sum(n) * 100)

  dominant_study <- list(
    name = study_counts$study[1],
    n = study_counts$n[1],
    pct = round(study_counts$pct[1], 1)
  )

  # Fragment mix
  fragment_counts <- data %>%
    count(fragment) %>%
    mutate(pct = n / sum(n) * 100)

  fragment_pct <- fragment_counts$pct[fragment_counts$fragment == "Y"]
  if (length(fragment_pct) == 0) fragment_pct <- 0

  colony_pct <- fragment_counts$pct[fragment_counts$fragment == "N"]
  if (length(colony_pct) == 0) colony_pct <- 0

  fragment_mix <- fragment_pct > 5 && colony_pct > 5

  # Size class counts
  size_class_n <- data %>%
    mutate(size_class = cut(size_cm2, breaks = SIZE_BREAKS, labels = SIZE_LABELS,
                            include.lowest = TRUE)) %>%
    count(size_class)

  # Warnings
  warnings <- list()
  if (!is.na(r_squared) && r_squared < 0.10) {
    warnings <- c(warnings, sprintf(
      "Size explains only %.1f%% of survival variance",
      r_squared * 100
    ))
  }
  if (dominant_study$pct > 50) {
    warnings <- c(warnings, sprintf(
      "%s provides %.0f%% of data",
      dominant_study$name, dominant_study$pct
    ))
  }
  if (fragment_mix) {
    warnings <- c(warnings, "Data contains mixed fragments and colonies")
  }

  list(
    r_squared = if (!is.na(r_squared)) round(as.numeric(r_squared), 4) else NA,
    sample_size = nrow(data),
    n_studies = n_distinct(data$study),
    n_regions = n_distinct(data$region),
    dominant_study = dominant_study,
    fragment_mix = fragment_mix,
    fragment_pct = round(fragment_pct, 1),
    size_class_n = size_class_n,
    warnings = warnings
  )
}

get_certainty_matrix <- function() {
  data <- data_env$survival_individual

  if (is.null(data) || nrow(data) == 0) {
    return(list(matrix = list(), legend = list()))
  }

  certainty_matrix <- data %>%
    mutate(size_class = cut(size_cm2, breaks = SIZE_BREAKS, labels = SIZE_LABELS,
                            include.lowest = TRUE)) %>%
    filter(!is.na(size_class)) %>%
    group_by(size_class, region) %>%
    summarise(
      n = n(),
      n_studies = n_distinct(study),
      n_years = n_distinct(survey_yr),
      survival_rate = mean(survived, na.rm = TRUE),
      .groups = "drop"
    ) %>%
    mutate(
      certainty = case_when(
        n < 10 | n_studies < 2 ~ 1,
        n < 30 ~ 2,
        n < 100 | n_studies < 3 ~ 3,
        n < 500 | n_years < 3 ~ 4,
        TRUE ~ 5
      )
    )

  gaps <- certainty_matrix %>%
    filter(certainty <= 2) %>%
    arrange(certainty, desc(n)) %>%
    mutate(priority = row_number())

  list(
    matrix = certainty_matrix,
    gaps = gaps,
    legend = list(
      "1" = "Very low certainty (n < 10 or single study)",
      "2" = "Low certainty (n < 30)",
      "3" = "Moderate certainty",
      "4" = "Good certainty",
      "5" = "High certainty"
    )
  )
}

# ============================================================================
# TESTS
# ============================================================================

describe("GET /quality/metrics", {
  it("returns quality metrics", {
    result <- get_quality_metrics()
    expect_true(is.list(result))
    expect_true("r_squared" %in% names(result))
    expect_true("sample_size" %in% names(result))
    expect_true("n_studies" %in% names(result))
    expect_true("dominant_study" %in% names(result))
    expect_true("fragment_mix" %in% names(result))
    expect_true("warnings" %in% names(result))
  })

  it("sample_size matches data", {
    result <- get_quality_metrics()
    expect_equal(result$sample_size, 200)
  })

  it("n_studies matches data", {
    result <- get_quality_metrics()
    expect_equal(result$n_studies, 3)
  })

  it("n_regions matches data", {
    result <- get_quality_metrics()
    expect_equal(result$n_regions, 4)
  })

  it("dominant_study has correct structure", {
    result <- get_quality_metrics()
    expect_true(is.list(result$dominant_study))
    expect_true("name" %in% names(result$dominant_study))
    expect_true("n" %in% names(result$dominant_study))
    expect_true("pct" %in% names(result$dominant_study))
  })

  it("dominant_study pct <= 100", {
    result <- get_quality_metrics()
    expect_true(result$dominant_study$pct <= 100)
    expect_true(result$dominant_study$pct > 0)
  })

  it("fragment_mix is boolean", {
    result <- get_quality_metrics()
    expect_true(is.logical(result$fragment_mix))
  })

  it("fragment_pct between 0 and 100", {
    result <- get_quality_metrics()
    expect_true(result$fragment_pct >= 0)
    expect_true(result$fragment_pct <= 100)
  })

  it("size_class_n has expected classes", {
    result <- get_quality_metrics()
    expect_true(is.data.frame(result$size_class_n))
    expect_true("size_class" %in% names(result$size_class_n))
    expect_true("n" %in% names(result$size_class_n))
  })

  it("r_squared is NA or between 0 and 1", {
    result <- get_quality_metrics()
    if (!is.na(result$r_squared)) {
      expect_true(result$r_squared >= 0)
      expect_true(result$r_squared <= 1)
    }
  })

  it("filters by region", {
    result <- get_quality_metrics(region = "Florida")
    expect_true(result$sample_size <= 200)
    expect_true(result$n_regions == 1)
  })

  it("filters by data_type", {
    result <- get_quality_metrics(data_type = "field")
    expect_true(result$sample_size <= 200)
  })

  it("returns empty result for nonexistent filters", {
    result <- get_quality_metrics(region = "Antarctica")
    expect_equal(result$sample_size, 0)
    expect_equal(result$n_studies, 0)
    expect_true(is.na(result$r_squared))
    expect_true(length(result$warnings) > 0)
  })
})

describe("GET /quality/certainty-matrix", {
  it("returns certainty matrix", {
    result <- get_certainty_matrix()
    expect_true(is.list(result))
    expect_true("matrix" %in% names(result))
    expect_true("gaps" %in% names(result))
    expect_true("legend" %in% names(result))
  })

  it("matrix has expected columns", {
    result <- get_certainty_matrix()
    expect_true(is.data.frame(result$matrix))
    expect_true("size_class" %in% names(result$matrix))
    expect_true("region" %in% names(result$matrix))
    expect_true("n" %in% names(result$matrix))
    expect_true("certainty" %in% names(result$matrix))
  })

  it("certainty scores between 1 and 5", {
    result <- get_certainty_matrix()
    expect_true(all(result$matrix$certainty >= 1))
    expect_true(all(result$matrix$certainty <= 5))
  })

  it("gaps only contain low certainty cells", {
    result <- get_certainty_matrix()
    if (nrow(result$gaps) > 0) {
      expect_true(all(result$gaps$certainty <= 2))
    }
  })

  it("gaps are prioritized (have priority column)", {
    result <- get_certainty_matrix()
    if (nrow(result$gaps) > 0) {
      expect_true("priority" %in% names(result$gaps))
      expect_true(all(diff(result$gaps$priority) == 1))  # Sequential
    }
  })

  it("legend has all certainty levels", {
    result <- get_certainty_matrix()
    expect_true(all(c("1", "2", "3", "4", "5") %in% names(result$legend)))
  })

  it("survival_rate in matrix is bounded", {
    result <- get_certainty_matrix()
    expect_true(all(result$matrix$survival_rate >= 0))
    expect_true(all(result$matrix$survival_rate <= 1))
  })

  it("n_studies >= 1 for all cells", {
    result <- get_certainty_matrix()
    expect_true(all(result$matrix$n_studies >= 1))
  })

  it("n_years >= 1 for all cells", {
    result <- get_certainty_matrix()
    expect_true(all(result$matrix$n_years >= 1))
  })
})

describe("certainty scoring logic", {
  it("certainty 1 when n < 10", {
    result <- get_certainty_matrix()
    low_n <- result$matrix %>% filter(n < 10)
    if (nrow(low_n) > 0) {
      expect_true(all(low_n$certainty == 1))
    }
  })

  it("certainty 1 when single study (n_studies < 2)", {
    result <- get_certainty_matrix()
    single_study <- result$matrix %>% filter(n >= 10, n_studies < 2)
    if (nrow(single_study) > 0) {
      expect_true(all(single_study$certainty == 1))
    }
  })

  it("certainty 2 when n 10-29 and multiple studies", {
    result <- get_certainty_matrix()
    low_n_multi <- result$matrix %>% filter(n >= 10, n < 30, n_studies >= 2)
    if (nrow(low_n_multi) > 0) {
      expect_true(all(low_n_multi$certainty == 2))
    }
  })
})

describe("warning generation", {
  it("warns when r_squared < 0.10", {
    result <- get_quality_metrics()
    if (!is.na(result$r_squared) && result$r_squared < 0.10) {
      has_r2_warning <- any(sapply(result$warnings, function(w)
        grepl("variance", w, ignore.case = TRUE)))
      expect_true(has_r2_warning)
    }
  })

  it("warns when dominant study > 50%", {
    result <- get_quality_metrics()
    if (result$dominant_study$pct > 50) {
      has_dominance_warning <- any(sapply(result$warnings, function(w)
        grepl("data", w, ignore.case = TRUE)))
      expect_true(has_dominance_warning)
    }
  })

  it("warns on fragment mix", {
    result <- get_quality_metrics()
    if (result$fragment_mix) {
      has_fragment_warning <- any(sapply(result$warnings, function(w)
        grepl("fragment", w, ignore.case = TRUE)))
      expect_true(has_fragment_warning)
    }
  })
})

describe("edge cases", {
  it("handles empty data", {
    # Create empty scenario
    result <- get_quality_metrics(region = "NonexistentRegion")
    expect_equal(result$sample_size, 0)
    expect_true(length(result$warnings) > 0)
  })

  it("handles all same study", {
    original_study <- data_env$survival_individual$study
    data_env$survival_individual$study <- "Single Study"

    result <- get_quality_metrics()
    expect_equal(result$n_studies, 1)
    expect_equal(result$dominant_study$pct, 100)

    data_env$survival_individual$study <- original_study
  })

  it("handles no fragments (fragment = 'N' only)", {
    original_fragment <- data_env$survival_individual$fragment
    data_env$survival_individual$fragment <- "N"

    result <- get_quality_metrics()
    expect_false(result$fragment_mix)
    expect_equal(result$fragment_pct, 0)

    data_env$survival_individual$fragment <- original_fragment
  })

  it("handles all fragments (fragment = 'Y' only)", {
    original_fragment <- data_env$survival_individual$fragment
    data_env$survival_individual$fragment <- "Y"

    result <- get_quality_metrics()
    expect_false(result$fragment_mix)  # Not mixed, all same
    expect_equal(result$fragment_pct, 100)

    data_env$survival_individual$fragment <- original_fragment
  })
})
