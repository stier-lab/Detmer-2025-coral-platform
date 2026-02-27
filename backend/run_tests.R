#!/usr/bin/env Rscript
# Run all tests for the RRSE Coral API backend

# Install testthat if not available
if (!requireNamespace("testthat", quietly = TRUE)) {
  install.packages("testthat", repos = "https://cloud.r-project.org")
}

# Required packages
library(testthat)
library(dplyr)
library(tidyr)

# Set working directory to tests folder
setwd("tests/testthat")

# Run all tests
cat("\n========================================\n")
cat("Running RRSE Coral API Backend Tests\n")
cat("========================================\n\n")

# Get list of test files
test_files <- list.files(pattern = "^test-.*\\.R$")
cat(sprintf("Found %d test files:\n", length(test_files)))
for (f in test_files) {
  cat(sprintf("  - %s\n", f))
}
cat("\n")

# Run tests with detailed output
results <- test_dir(
  ".",
  reporter = "summary",
  stop_on_failure = FALSE
)

# Print summary
cat("\n========================================\n")
cat("Test Summary\n")
cat("========================================\n")
print(results)

# Exit with appropriate code
if (any(as.data.frame(results)$failed > 0)) {
  cat("\n*** SOME TESTS FAILED ***\n")
  quit(status = 1)
} else {
  cat("\n*** ALL TESTS PASSED ***\n")
  quit(status = 0)
}
