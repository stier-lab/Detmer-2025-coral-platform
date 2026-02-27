# Input Validation Helpers for RRSE Coral Platform API
# Provides security-focused validation and sanitization functions

#' Sanitize string input to prevent injection attacks
#' @param input The input string to sanitize
#' @param max_length Maximum allowed length (default 1000)
#' @return Sanitized string or NULL if input was NULL
sanitize_string <- function(input, max_length = 1000) {
  if (is.null(input)) return(NULL)

  # Coerce to character and take only the first element
  input <- as.character(input)[1]

  # Check for NA after coercion
  if (is.na(input)) return(NULL)

  # Limit length to prevent DoS
  input <- substr(input, 1, max_length)

  # Remove potential XSS/injection characters
  # Removes: < > " ' ` \ and control characters
  input <- gsub("[<>\"'`\\\\]", "", input)
  input <- gsub("[[:cntrl:]]", "", input)

  # Trim whitespace
  input <- trimws(input)

  input
}

#' Validate a comma-separated list of values
#' @param input The comma-separated string to validate
#' @param allowed_values Optional character vector of allowed values
#' @param max_items Maximum number of items allowed (default 100)
#' @param trim_whitespace Whether to trim whitespace from items (default TRUE)
#' @return A character vector of validated values, or NULL if validation fails
validate_csv_list <- function(input, allowed_values = NULL, max_items = 100, trim_whitespace = TRUE) {
  if (is.null(input) || input == "") return(NULL)

  # Sanitize input first
  input <- sanitize_string(input, max_length = 5000)
  if (is.null(input) || input == "") return(NULL)

  # Split by comma
  items <- strsplit(input, ",")[[1]]

  # Limit number of items
  if (length(items) > max_items) {
    warning(sprintf("CSV list exceeded max items (%d), truncating", max_items))
    items <- items[1:max_items]
  }

  # Trim whitespace if requested
  if (trim_whitespace) {
    items <- trimws(items)
  }

  # Remove empty items
  items <- items[items != ""]

  # Validate against allowed values if provided
  if (!is.null(allowed_values)) {
    invalid_items <- items[!items %in% allowed_values]
    if (length(invalid_items) > 0) {
      warning(sprintf("Invalid items in CSV list: %s", paste(invalid_items, collapse = ", ")))
      items <- items[items %in% allowed_values]
    }
  }

  if (length(items) == 0) return(NULL)

  items
}

#' Validate numeric range parameters
#' @param min_val The minimum value of the range
#' @param max_val The maximum value of the range
#' @param absolute_min Optional absolute minimum bound
#' @param absolute_max Optional absolute maximum bound
#' @param allow_equal Whether min and max can be equal (default TRUE)
#' @return A list with validated min and max, or NULL if validation fails
validate_range <- function(min_val, max_val, absolute_min = NULL, absolute_max = NULL, allow_equal = TRUE) {
  # Convert to numeric
  min_num <- suppressWarnings(as.numeric(min_val))
  max_num <- suppressWarnings(as.numeric(max_val))

  # Check for NA (conversion failure)
  if (is.na(min_num) || is.na(max_num)) {
    warning("Range values must be numeric")
    return(NULL)
  }

  # Check for infinite values
  if (is.infinite(min_num) || is.infinite(max_num)) {
    warning("Range values cannot be infinite")
    return(NULL)
  }

  # Check min <= max (or < if allow_equal is FALSE)
  if (allow_equal) {
    if (min_num > max_num) {
      warning("Minimum value cannot be greater than maximum value")
      return(NULL)
    }
  } else {
    if (min_num >= max_num) {
      warning("Minimum value must be less than maximum value")
      return(NULL)
    }
  }

  # Apply absolute bounds if provided
  if (!is.null(absolute_min)) {
    absolute_min <- as.numeric(absolute_min)
    if (!is.na(absolute_min)) {
      min_num <- max(min_num, absolute_min)
      max_num <- max(max_num, absolute_min)
    }
  }

  if (!is.null(absolute_max)) {
    absolute_max <- as.numeric(absolute_max)
    if (!is.na(absolute_max)) {
      min_num <- min(min_num, absolute_max)
      max_num <- min(max_num, absolute_max)
    }
  }

  list(min = min_num, max = max_num)
}

#' Validate a numeric parameter from an API request
#' Returns a list with $valid, $message (on failure), and $value (on success)
#' Used by endpoint files (survival.R, growth.R) via globalenv()
#' @param value The value to validate
#' @param name The parameter name (for error messages)
#' @param min_val Minimum allowed value (inclusive)
#' @param max_val Maximum allowed value (inclusive)
#' @return A list with valid=TRUE/FALSE and value or message
validate_numeric_param <- function(value, name, min_val = NULL, max_val = NULL) {
  num <- suppressWarnings(as.numeric(value))
  if (is.na(num)) {
    return(list(valid = FALSE, message = sprintf("Parameter '%s' must be a valid number", name)))
  }
  if (!is.null(min_val) && num < min_val) {
    return(list(valid = FALSE, message = sprintf("Parameter '%s' must be >= %s", name, min_val)))
  }
  if (!is.null(max_val) && num > max_val) {
    return(list(valid = FALSE, message = sprintf("Parameter '%s' must be <= %s", name, max_val)))
  }
  list(valid = TRUE, value = num)
}

#' Validate a single numeric value
#' @param value The value to validate
#' @param min_allowed Minimum allowed value (inclusive)
#' @param max_allowed Maximum allowed value (inclusive)
#' @param default Default value if validation fails (NULL = return NULL)
#' @return The validated numeric value, default value, or NULL
validate_numeric <- function(value, min_allowed = NULL, max_allowed = NULL, default = NULL) {
  if (is.null(value)) return(default)

  num <- suppressWarnings(as.numeric(value))

  if (is.na(num) || is.infinite(num)) {
    return(default)
  }

  if (!is.null(min_allowed) && num < min_allowed) {
    return(default)
  }

  if (!is.null(max_allowed) && num > max_allowed) {
    return(default)
  }

  num
}

#' Validate a positive integer
#' @param value The value to validate
#' @param max_allowed Maximum allowed value
#' @param default Default value if validation fails
#' @return The validated positive integer, default value, or NULL
validate_positive_integer <- function(value, max_allowed = NULL, default = NULL) {
  num <- validate_numeric(value, min_allowed = 1, max_allowed = max_allowed, default = default)

  if (is.null(num)) return(default)

  # Ensure it's an integer
  as.integer(floor(num))
}

#' Validate size class input
#' @param size_class The size class to validate (e.g., "SC1", "SC2", etc.)
#' @return The validated size class or NULL if invalid
validate_size_class <- function(size_class) {
  if (is.null(size_class)) return(NULL)

  allowed <- c("SC1", "SC2", "SC3", "SC4", "SC5")

  size_class <- toupper(sanitize_string(size_class, max_length = 10))

  if (is.null(size_class) || !size_class %in% allowed) {
    return(NULL)
  }

  size_class
}

#' Validate region input
#' @param region The region to validate
#' @param data_env Optional data environment to check against actual regions
#' @return The validated region or NULL if invalid
validate_region <- function(region, data_env = NULL) {
  if (is.null(region) || region == "") return(NULL)

  region <- sanitize_string(region, max_length = 100)

  # If data_env provided, validate against actual region values
  if (!is.null(data_env) && exists("regions", data_env)) {
    valid_regions <- data_env$regions
    if (!region %in% valid_regions) {
      return(NULL)
    }
  }

  region
}

#' Check if a request exceeds rate limit (helper for rate limiter)
#' @param ip The client IP address
#' @param rate_limit_env The rate limiter environment
#' @param max_requests Maximum requests per window
#' @param window_seconds Time window in seconds
#' @return TRUE if rate limited, FALSE otherwise
check_rate_limit <- function(ip, rate_limit_env, max_requests = 100, window_seconds = 60) {
  current_time <- as.numeric(Sys.time())

  # Periodically clean up expired entries to prevent memory leak
  # Run cleanup roughly every 100 requests (tracked via a counter)
  cleanup_counter <- if (exists(".cleanup_counter", envir = rate_limit_env)) {
    get(".cleanup_counter", envir = rate_limit_env)
  } else {
    0L
  }
  assign(".cleanup_counter", cleanup_counter + 1L, envir = rate_limit_env)

  if (cleanup_counter %% 100 == 0) {
    all_ips <- ls(envir = rate_limit_env)
    all_ips <- all_ips[!startsWith(all_ips, ".")]  # Skip internal vars
    for (old_ip in all_ips) {
      old_data <- get(old_ip, envir = rate_limit_env)
      if (current_time - old_data$window_start > window_seconds * 2) {
        rm(list = old_ip, envir = rate_limit_env)
      }
    }
  }

  # Get or initialize request tracking for this IP
  if (!exists(ip, envir = rate_limit_env)) {
    assign(ip, list(count = 1, window_start = current_time), envir = rate_limit_env)
    return(FALSE)
  }

  ip_data <- get(ip, envir = rate_limit_env)

  # Check if we're still in the same window
  if (current_time - ip_data$window_start > window_seconds) {
    # Reset window
    assign(ip, list(count = 1, window_start = current_time), envir = rate_limit_env)
    return(FALSE)
  }

  # Increment count
  ip_data$count <- ip_data$count + 1
  assign(ip, ip_data, envir = rate_limit_env)

  # Check if over limit
  ip_data$count > max_requests
}
