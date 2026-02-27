# This file is part of the standard testthat infrastructure
# It is called by R CMD check to run all tests

library(testthat)
library(dplyr)

# Run all tests in the testthat directory
test_check("rrse-coral-api")
