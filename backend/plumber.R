library(plumber)
library(dplyr)
library(jsonlite)
library(readr)

# Load shared utilities
source("R/utils/constants.R")
source("R/utils/validation.R")
source("R/utils/responses.R")

# Make constants available globally for all mounted endpoints
assign("SIZE_BREAKS", SIZE_BREAKS, envir = globalenv())
assign("SIZE_LABELS", SIZE_LABELS, envir = globalenv())
assign("VALID_REGIONS", VALID_REGIONS, envir = globalenv())
assign("VALID_DATA_TYPES", VALID_DATA_TYPES, envir = globalenv())
assign("%||%", `%||%`, envir = globalenv())

# Make response helpers available globally for all mounted endpoints
# (plumb() evaluates endpoint files in isolated environments)
assign("create_error", create_error, envir = globalenv())
assign("create_success", create_success, envir = globalenv())
assign("create_empty", create_empty, envir = globalenv())

# Make validation helpers available globally for mounted endpoints
assign("validate_numeric_param", validate_numeric_param, envir = globalenv())

# Load all data at startup for performance
# Note: Data is loaded once and treated as read-only, so global scope is safe
source("R/data/load_data.R")
data_env <- load_all_data()

# Make data_env available to mounted endpoints via global namespace
# This is read-only after initialization so thread-safe
assign("data_env", data_env, envir = globalenv())

# Initialize rate limiter environment
# NOTE: This in-memory rate limiter works correctly for single-process deployments.
# For multi-process or multi-instance deployments (e.g., load-balanced production),
# consider using Redis or another external store for shared rate limit state.
# The current implementation is suitable for this research API's typical load.
rate_limit_env <- new.env(hash = TRUE)
assign("rate_limit_env", rate_limit_env, envir = globalenv())

# Configuration from environment variables
CORS_ALLOWED_ORIGINS <- Sys.getenv("CORS_ALLOWED_ORIGINS", "*")
RATE_LIMIT_MAX_REQUESTS <- as.integer(Sys.getenv("RATE_LIMIT_MAX_REQUESTS", "100"))
RATE_LIMIT_WINDOW_SECONDS <- as.integer(Sys.getenv("RATE_LIMIT_WINDOW_SECONDS", "60"))
IS_PRODUCTION <- Sys.getenv("NODE_ENV", "development") == "production" ||
                 Sys.getenv("R_ENV", "development") == "production"

#* @apiTitle RRSE Coral Parameters API
#* @apiDescription REST API for Acropora palmata demographic parameters
#* @apiVersion 1.0.0

#* Rate limiting filter
#* Limits requests per IP to prevent abuse
#* @filter rate_limiter
function(req, res) {
  # Get client IP (check X-Forwarded-For for proxied requests)
  client_ip <- req$HTTP_X_FORWARDED_FOR
  if (is.null(client_ip) || client_ip == "") {
    client_ip <- req$REMOTE_ADDR
  }
  if (is.null(client_ip) || client_ip == "") {
    client_ip <- "unknown"
  }

  # Extract first IP if multiple (X-Forwarded-For can be comma-separated)
  client_ip <- trimws(strsplit(client_ip, ",")[[1]][1])

  # Check rate limit
  if (check_rate_limit(client_ip, rate_limit_env,
                       max_requests = RATE_LIMIT_MAX_REQUESTS,
                       window_seconds = RATE_LIMIT_WINDOW_SECONDS)) {
    res$status <- 429
    return(list(
      error = TRUE,
      code = "RATE_LIMIT_EXCEEDED",
      message = sprintf("Rate limit exceeded. Maximum %d requests per %d seconds.",
                        RATE_LIMIT_MAX_REQUESTS, RATE_LIMIT_WINDOW_SECONDS),
      retry_after = RATE_LIMIT_WINDOW_SECONDS
    ))
  }

  plumber::forward()
}

#* Enable CORS for frontend access
#* In production, restricts origins based on CORS_ALLOWED_ORIGINS env var
#* In development, allows all origins
#* @filter cors
function(req, res) {
  # Determine allowed origin
  request_origin <- req$HTTP_ORIGIN

  if (IS_PRODUCTION && CORS_ALLOWED_ORIGINS != "*") {
    # In production with specific origins, validate the request origin
    allowed_origins <- trimws(strsplit(CORS_ALLOWED_ORIGINS, ",")[[1]])

    if (!is.null(request_origin) && request_origin %in% allowed_origins) {
      res$setHeader("Access-Control-Allow-Origin", request_origin)
    } else if (length(allowed_origins) > 0) {
      # Default to first allowed origin if request origin not in list
      res$setHeader("Access-Control-Allow-Origin", allowed_origins[1])
    }
  } else {
    # Development mode or wildcard - allow all origins
    res$setHeader("Access-Control-Allow-Origin", "*")
  }

  res$setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
  res$setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization")
  res$setHeader("Access-Control-Max-Age", "86400")  # Cache preflight for 24 hours

  # Security headers to prevent common attacks
  res$setHeader("X-Content-Type-Options", "nosniff")
  res$setHeader("X-Frame-Options", "DENY")
  res$setHeader("X-XSS-Protection", "1; mode=block")
  res$setHeader("Referrer-Policy", "strict-origin-when-cross-origin")

  # Content Security Policy - restricts sources for scripts, styles, etc.
  res$setHeader("Content-Security-Policy", paste0(
    "default-src 'self'; ",
    "script-src 'self'; ",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; ",
    "font-src 'self' https://fonts.gstatic.com; ",
    "img-src 'self' data: https:; ",
    "connect-src 'self' https://coral-demographics-api.onrender.com https://*.tile.openstreetmap.org"
  ))

  if (req$REQUEST_METHOD == "OPTIONS") {
    res$status <- 200
    return(list())
  }

  plumber::forward()
}

#* Global error handler for consistent error responses
#* @filter error_handler
function(req, res) {
  tryCatch(
    plumber::forward(),
    error = function(e) {
      # Log the error for debugging
      message(sprintf("[ERROR] %s %s: %s", req$REQUEST_METHOD, req$PATH_INFO, e$message))

      # Set 500 status for unhandled errors
      res$status <- 500
      list(
        error = TRUE,
        code = "INTERNAL_ERROR",
        message = "An unexpected server error occurred",
        details = list(
          path = req$PATH_INFO,
          # Only include error details in development
          error_message = if (!IS_PRODUCTION) e$message else NULL
        )
      )
    }
  )
}

#* Health check endpoint
#* @get /health
function() {
  list(
    status = "healthy",
    timestamp = format(Sys.time(), "%Y-%m-%dT%H:%M:%SZ"),
    environment = if (IS_PRODUCTION) "production" else "development"
  )
}

#* @plumber
function(pr) {
  pr %>%
    pr_mount("/api/survival", plumb("R/endpoints/survival.R")) %>%
    pr_mount("/api/growth", plumb("R/endpoints/growth.R")) %>%
    pr_mount("/api/map", plumb("R/endpoints/map.R")) %>%
    pr_mount("/api/studies", plumb("R/endpoints/studies.R")) %>%
    pr_mount("/api/stats", plumb("R/endpoints/stats.R")) %>%
    pr_mount("/api/quality", plumb("R/endpoints/quality.R")) %>%
    pr_mount("/api/export", plumb("R/endpoints/export.R")) %>%
    pr_mount("/api/analysis", plumb("R/endpoints/analysis.R")) %>%
    pr_mount("/api/papers", plumb("R/endpoints/papers.R")) %>%
    pr_mount("/api/recommendation", plumb("R/endpoints/recommendation.R")) %>%
    pr_mount("/api/elasticity", plumb("R/endpoints/elasticity.R"))
}
