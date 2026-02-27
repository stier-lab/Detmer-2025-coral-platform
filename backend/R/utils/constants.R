# Shared constants for the RRSE Coral Platform API
# These are loaded globally in plumber.R to avoid duplication across endpoints

# Size class definitions (matching analysis scripts)
SIZE_BREAKS <- c(0, 25, 100, 500, 2000, Inf)
SIZE_LABELS <- c("SC1", "SC2", "SC3", "SC4", "SC5")

# Valid regions for filtering
VALID_REGIONS <- c("Florida", "USVI", "Puerto Rico", "Curacao", "Navassa", "Dominican Republic", "Mexico")

# Valid data types
VALID_DATA_TYPES <- c("field", "nursery_in", "nursery_ex")

# Null coalesce operator (commonly used across endpoints)
`%||%` <- function(x, y) if (is.null(x) || length(x) == 0) y else x
