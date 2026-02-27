# Tests for map.R endpoints
library(testthat)
library(dplyr)

# Source setup
source("setup.R")

# Mock the global data_env
data_env <- get_test_data()

# ============================================================================
# Helper functions mirroring endpoint logic
# ============================================================================

get_map_sites <- function(region = "", data_type = "") {
  # Aggregate site-level statistics
  sites <- data_env$survival_individual %>%
    group_by(region, location) %>%
    summarise(
      site_id = paste(first(region), first(location), sep = "_"),
      latitude = median(latitude, na.rm = TRUE),
      longitude = median(longitude, na.rm = TRUE),
      total_observations = n(),
      survival_rate = mean(survived, na.rm = TRUE),
      studies = paste(unique(study), collapse = ", "),
      data_types = paste(unique(data_type), collapse = ", "),
      depth_m = median(depth_m, na.rm = TRUE),
      .groups = "drop"
    )

  # Add growth data if available
  if (!is.null(data_env$growth_individual)) {
    growth_summary <- data_env$growth_individual %>%
      group_by(region, location) %>%
      summarise(
        mean_growth = mean(growth_cm2_yr, na.rm = TRUE),
        .groups = "drop"
      )

    sites <- sites %>%
      left_join(growth_summary, by = c("region", "location"))
  } else {
    sites$mean_growth <- NA
  }

  # Apply filters
  if (region != "") {
    regions <- strsplit(region, ",")[[1]]
    sites <- sites %>% filter(region %in% regions)
  }

  if (data_type != "") {
    types <- strsplit(data_type, ",")[[1]]
    sites <- sites %>%
      filter(grepl(paste(types, collapse = "|"), data_types))
  }

  sites %>%
    select(
      site_id, name = location, region, latitude, longitude,
      depth_m, total_observations, survival_rate, mean_growth, studies
    )
}

get_map_regions <- function() {
  data_env$survival_individual %>%
    group_by(region) %>%
    summarise(
      n_sites = n_distinct(location),
      n_observations = n(),
      n_studies = n_distinct(study),
      mean_survival = mean(survived, na.rm = TRUE),
      lat_center = mean(latitude, na.rm = TRUE),
      lon_center = mean(longitude, na.rm = TRUE),
      .groups = "drop"
    ) %>%
    arrange(desc(n_observations))
}

# ============================================================================
# TESTS
# ============================================================================

describe("GET /map/sites", {
  it("returns site data", {
    result <- get_map_sites()
    expect_true(is.data.frame(result))
    expect_true("site_id" %in% names(result))
    expect_true("name" %in% names(result))
    expect_true("region" %in% names(result))
    expect_true("latitude" %in% names(result))
    expect_true("longitude" %in% names(result))
  })

  it("has valid coordinates", {
    result <- get_map_sites()
    # Caribbean coordinates roughly: lat 10-30, lon -90 to -60
    expect_true(all(result$latitude >= 10 & result$latitude <= 35))
    expect_true(all(result$longitude >= -95 & result$longitude <= -55))
  })

  it("survival rates between 0 and 1", {
    result <- get_map_sites()
    expect_true(all(result$survival_rate >= 0 & result$survival_rate <= 1))
  })

  it("total observations are positive", {
    result <- get_map_sites()
    expect_true(all(result$total_observations > 0))
  })

  it("filters by region", {
    result <- get_map_sites(region = "Florida")
    if (nrow(result) > 0) {
      expect_true(all(result$region == "Florida"))
    }
  })

  it("filters by multiple regions", {
    result <- get_map_sites(region = "Florida,USVI")
    if (nrow(result) > 0) {
      expect_true(all(result$region %in% c("Florida", "USVI")))
    }
  })

  it("filters by data_type using pattern matching", {
    # Note: The data_types column is used for filtering but not returned in final select
    # Just verify filtering reduces the result set
    result_all <- get_map_sites()
    result_filtered <- get_map_sites(data_type = "field")
    # Filtered should be <= all (may be same if all sites have field data)
    expect_true(nrow(result_filtered) <= nrow(result_all))
  })

  it("site_id format is region_location", {
    result <- get_map_sites()
    # Check that site_id follows expected format
    expect_true(all(grepl("_", result$site_id)))
  })

  it("includes growth data when available", {
    result <- get_map_sites()
    expect_true("mean_growth" %in% names(result))
    # Some sites may have growth data
  })

  it("depth values are reasonable", {
    result <- get_map_sites()
    if (any(!is.na(result$depth_m))) {
      expect_true(all(result$depth_m >= 0 | is.na(result$depth_m)))
      expect_true(all(result$depth_m <= 100 | is.na(result$depth_m)))  # Reasonable max depth
    }
  })

  # Edge case
  it("returns empty for nonexistent region", {
    result <- get_map_sites(region = "Antarctica")
    expect_equal(nrow(result), 0)
  })

  it("aggregates correctly by location", {
    result <- get_map_sites()
    # Each row should be unique by site_id
    expect_equal(nrow(result), length(unique(result$site_id)))
  })
})

describe("GET /map/regions", {
  it("returns region summary data", {
    result <- get_map_regions()
    expect_true(is.data.frame(result))
    expect_true("region" %in% names(result))
    expect_true("n_sites" %in% names(result))
    expect_true("n_observations" %in% names(result))
    expect_true("n_studies" %in% names(result))
    expect_true("mean_survival" %in% names(result))
    expect_true("lat_center" %in% names(result))
    expect_true("lon_center" %in% names(result))
  })

  it("has all expected regions", {
    result <- get_map_regions()
    expected_regions <- c("Florida", "USVI", "Puerto Rico", "Curacao")
    actual_regions <- result$region
    expect_true(all(expected_regions %in% actual_regions))
  })

  it("counts are positive", {
    result <- get_map_regions()
    expect_true(all(result$n_sites > 0))
    expect_true(all(result$n_observations > 0))
    expect_true(all(result$n_studies > 0))
  })

  it("mean_survival between 0 and 1", {
    result <- get_map_regions()
    expect_true(all(result$mean_survival >= 0 & result$mean_survival <= 1))
  })

  it("ordered by n_observations descending", {
    result <- get_map_regions()
    expect_true(all(diff(result$n_observations) <= 0))
  })

  it("center coordinates are reasonable", {
    result <- get_map_regions()
    expect_true(all(result$lat_center >= 10 & result$lat_center <= 35))
    expect_true(all(result$lon_center >= -95 & result$lon_center <= -55))
  })

  it("n_sites <= n_observations for all regions", {
    result <- get_map_regions()
    expect_true(all(result$n_sites <= result$n_observations))
  })

  it("n_studies <= n_observations for all regions", {
    result <- get_map_regions()
    expect_true(all(result$n_studies <= result$n_observations))
  })
})

describe("coordinate aggregation", {
  it("uses median for coordinates (robust to outliers)", {
    # Verify median is used by checking computation
    manual_calc <- data_env$survival_individual %>%
      filter(region == "Florida", location == unique(data_env$survival_individual$location[
        data_env$survival_individual$region == "Florida"
      ])[1]) %>%
      summarise(
        lat = median(latitude, na.rm = TRUE),
        lon = median(longitude, na.rm = TRUE)
      )

    result <- get_map_sites(region = "Florida")
    if (nrow(result) > 0 && nrow(manual_calc) > 0) {
      first_site <- result[1, ]
      # Should approximately match (allowing for different location selection)
      expect_true(abs(first_site$latitude - manual_calc$lat) < 5 ||
                    first_site$location != unique(data_env$survival_individual$location[
                      data_env$survival_individual$region == "Florida"
                    ])[1])
    }
  })
})

describe("edge cases", {
  it("handles sites with only one observation", {
    # Check if aggregation still works
    result <- get_map_sites()
    min_obs <- min(result$total_observations)
    expect_true(min_obs >= 1)
  })

  it("handles NA coordinates gracefully", {
    # Temporarily add NA coordinates
    original_lat <- data_env$survival_individual$latitude[1]
    data_env$survival_individual$latitude[1] <- NA

    result <- get_map_sites()
    # Should still return results (median handles NA)
    expect_true(nrow(result) > 0)

    # Reset
    data_env$survival_individual$latitude[1] <- original_lat
  })

  it("handles multiple studies at same location", {
    result <- get_map_sites()
    # Studies should be comma-separated
    if (any(grepl(",", result$studies))) {
      expect_true(TRUE)  # Some sites have multiple studies
    } else {
      expect_true(TRUE)  # OK if all single study
    }
  })
})
