# Test setup - create mock data environment for testing
library(testthat)
library(dplyr)
library(tidyr)

# Create mock data environment for testing
create_test_data <- function() {
  env <- new.env()

  set.seed(42)  # Reproducible tests
  n <- 200  # Smaller dataset for faster tests

  regions <- c("Florida", "USVI", "Puerto Rico", "Curacao")
  studies <- c("Study A", "Study B", "Study C")

  # Create mock survival data with known patterns for testable assertions
  env$survival_individual <- data.frame(
    id = 1:n,
    study = sample(studies, n, replace = TRUE),
    region = sample(regions, n, replace = TRUE),
    location = paste0("Site_", sample(1:20, n, replace = TRUE)),
    latitude = runif(n, 18, 26),
    longitude = runif(n, -88, -64),
    depth_m = runif(n, 1, 15),
    survey_yr = sample(2010:2023, n, replace = TRUE),
    data_type = sample(c("field", "nursery_in", "nursery_ex"), n,
                       replace = TRUE, prob = c(0.5, 0.3, 0.2)),
    coral_id = paste0("C", sprintf("%04d", 1:n)),
    size_cm2 = c(
      # Small corals (SC1: 0-25)
      runif(n * 0.2, 1, 24),
      # Medium corals (SC2: 25-100)
      runif(n * 0.3, 25, 99),
      # Larger corals (SC3-5)
      runif(n * 0.5, 100, 5000)
    )[sample(1:n)],
    fragment = sample(c("Y", "N"), n, replace = TRUE, prob = c(0.3, 0.7)),
    time_interval_yr = 1,
    stringsAsFactors = FALSE
  )

  # Size-dependent survival (testable pattern)
  # Larger corals have higher survival probability
  env$survival_individual$survived <- sapply(env$survival_individual$size_cm2, function(size) {
    prob <- plogis(-0.5 + 0.3 * log(size))
    rbinom(1, 1, prob)
  })

  # Create mock growth data
  m <- 150
  env$growth_individual <- data.frame(
    id = 1:m,
    study = sample(studies, m, replace = TRUE),
    region = sample(regions, m, replace = TRUE),
    location = paste0("Site_", sample(1:20, m, replace = TRUE)),
    latitude = runif(m, 18, 26),
    longitude = runif(m, -88, -64),
    depth_m = runif(m, 1, 15),
    survey_yr = sample(2010:2023, m, replace = TRUE),
    data_type = sample(c("field", "nursery_in", "nursery_ex"), m,
                       replace = TRUE, prob = c(0.5, 0.3, 0.2)),
    coral_id = paste0("C", sprintf("%04d", 1:m)),
    size_cm2 = rlnorm(m, meanlog = 4, sdlog = 1.2),
    fragment = sample(c("Y", "N"), m, replace = TRUE, prob = c(0.3, 0.7)),
    time_interval_yr = 1,
    stringsAsFactors = FALSE
  )

  # Growth rates (mix of positive and negative)
  env$growth_individual$growth_cm2_yr <- rnorm(m, mean = 15, sd = 40)

  env$using_mock_data <- TRUE
  env
}

# Global test data environment
test_data_env <- create_test_data()

# Helper function to get test data
get_test_data <- function() {
  test_data_env
}
