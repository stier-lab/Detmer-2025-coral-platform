# Tests for data loading (load_data.R)
library(testthat)
library(dplyr)

# Source setup
source("setup.R")

# Get test data
data_env <- get_test_data()

# ============================================================================
# Test mock data structure
# ============================================================================

describe("survival_individual data structure", {
  it("has required columns", {
    required_cols <- c(
      "id", "study", "region", "location", "latitude", "longitude",
      "depth_m", "survey_yr", "data_type", "coral_id", "size_cm2",
      "fragment", "survived"
    )
    expect_true(all(required_cols %in% names(data_env$survival_individual)))
  })

  it("id is unique", {
    expect_equal(
      length(unique(data_env$survival_individual$id)),
      nrow(data_env$survival_individual)
    )
  })

  it("survived is binary (0 or 1)", {
    expect_true(all(data_env$survival_individual$survived %in% c(0, 1)))
  })

  it("size_cm2 is positive", {
    expect_true(all(data_env$survival_individual$size_cm2 > 0))
  })

  it("latitude in valid range", {
    expect_true(all(data_env$survival_individual$latitude >= -90))
    expect_true(all(data_env$survival_individual$latitude <= 90))
  })

  it("longitude in valid range", {
    expect_true(all(data_env$survival_individual$longitude >= -180))
    expect_true(all(data_env$survival_individual$longitude <= 180))
  })

  it("data_type has expected values", {
    valid_types <- c("field", "nursery_in", "nursery_ex")
    expect_true(all(data_env$survival_individual$data_type %in% valid_types))
  })

  it("fragment has expected values", {
    expect_true(all(data_env$survival_individual$fragment %in% c("Y", "N")))
  })

  it("survey_yr is reasonable", {
    expect_true(all(data_env$survival_individual$survey_yr >= 1990))
    expect_true(all(data_env$survival_individual$survey_yr <= 2030))
  })

  it("depth_m is non-negative", {
    expect_true(all(data_env$survival_individual$depth_m >= 0))
  })
})

describe("growth_individual data structure", {
  it("has required columns", {
    required_cols <- c(
      "id", "study", "region", "location", "latitude", "longitude",
      "survey_yr", "data_type", "size_cm2", "growth_cm2_yr"
    )
    expect_true(all(required_cols %in% names(data_env$growth_individual)))
  })

  it("id is unique", {
    expect_equal(
      length(unique(data_env$growth_individual$id)),
      nrow(data_env$growth_individual)
    )
  })

  it("growth_cm2_yr is numeric", {
    expect_true(is.numeric(data_env$growth_individual$growth_cm2_yr))
  })

  it("size_cm2 is positive", {
    expect_true(all(data_env$growth_individual$size_cm2 > 0))
  })

  it("data_type has expected values", {
    valid_types <- c("field", "nursery_in", "nursery_ex")
    expect_true(all(data_env$growth_individual$data_type %in% valid_types))
  })
})

describe("data consistency", {
  it("regions are consistent between datasets", {
    surv_regions <- unique(data_env$survival_individual$region)
    growth_regions <- unique(data_env$growth_individual$region)
    # Growth regions should be subset of or equal to survival regions
    expect_true(all(growth_regions %in% surv_regions))
  })

  it("data_types are consistent between datasets", {
    surv_types <- unique(data_env$survival_individual$data_type)
    growth_types <- unique(data_env$growth_individual$data_type)
    expect_true(all(growth_types %in% surv_types))
  })

  it("studies appear in both datasets", {
    surv_studies <- unique(data_env$survival_individual$study)
    growth_studies <- unique(data_env$growth_individual$study)
    # Some overlap expected
    expect_true(length(intersect(surv_studies, growth_studies)) > 0)
  })
})

describe("mock data flag", {
  it("using_mock_data is TRUE for test data", {
    expect_true(data_env$using_mock_data)
  })
})

describe("data type transformations", {
  # The actual load_data.R transforms nursery types
  it("data_type values are normalized", {
    # Check that data_type doesn't contain mixed case "Nursery"
    expect_false(any(grepl("Nursery", data_env$survival_individual$data_type,
                           ignore.case = FALSE)))
  })
})

describe("edge cases in data", {
  it("handles missing locations gracefully", {
    # Location should not be NA
    expect_false(any(is.na(data_env$survival_individual$location)))
  })

  it("handles missing regions gracefully", {
    expect_false(any(is.na(data_env$survival_individual$region)))
  })

  it("handles missing sizes gracefully", {
    expect_false(any(is.na(data_env$survival_individual$size_cm2)))
  })

  it("handles missing survival values gracefully", {
    expect_false(any(is.na(data_env$survival_individual$survived)))
  })
})

describe("size distribution", {
  it("has variety of size classes", {
    SIZE_BREAKS <- c(0, 25, 100, 500, 2000, Inf)

    sizes <- data_env$survival_individual$size_cm2
    classes <- cut(sizes, breaks = SIZE_BREAKS, include.lowest = TRUE)

    # Should have data in multiple size classes
    expect_true(length(unique(na.omit(classes))) >= 3)
  })

  it("size range spans multiple orders of magnitude", {
    sizes <- data_env$survival_individual$size_cm2
    size_range <- max(sizes) / min(sizes)
    expect_true(size_range > 10)  # At least one order of magnitude
  })
})

describe("temporal coverage", {
  it("has multiple years of data", {
    years <- unique(data_env$survival_individual$survey_yr)
    expect_true(length(years) >= 5)
  })

  it("year range spans reasonable period", {
    years <- data_env$survival_individual$survey_yr
    year_range <- max(years) - min(years)
    expect_true(year_range >= 5)
  })
})

describe("geographic coverage", {
  it("has multiple regions", {
    regions <- unique(data_env$survival_individual$region)
    expect_true(length(regions) >= 2)
  })

  it("has multiple locations", {
    locations <- unique(data_env$survival_individual$location)
    expect_true(length(locations) >= 5)
  })

  it("coordinates span Caribbean region", {
    lats <- data_env$survival_individual$latitude
    lons <- data_env$survival_individual$longitude

    # Caribbean roughly: lat 10-30, lon -90 to -60
    expect_true(any(lats > 15 & lats < 28))
    expect_true(any(lons > -90 & lons < -60))
  })
})
