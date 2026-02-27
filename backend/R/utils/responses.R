# Shared Response Helpers for RRSE Coral Platform API
# Provides consistent error response formatting across all endpoints

#' Create a standardized error response
#' @param res Plumber response object
#' @param status_code HTTP status code (e.g., 400, 404, 500)
#' @param error_code Application-specific error code (e.g., "INVALID_PARAMETER")
#' @param message Human-readable error message
#' @param details Optional list of additional details
#' @return Error response list
create_error <- function(res, status_code, error_code, message, details = list()) {
  res$status <- status_code
  list(
    error = TRUE,
    code = error_code,
    message = message,
    details = details
  )
}

#' Create a standardized success response with data
#' @param data The response data
#' @param meta Optional metadata about the response
#' @return Success response list
create_success <- function(data, meta = list()) {
  response <- list(data = data)
  if (length(meta) > 0) {
    response$meta <- meta
  }
  response
}

#' Create an empty data response
#' @param message Optional message explaining why data is empty
#' @return Empty data response list
create_empty <- function(message = "No data found") {
  list(
    data = list(),
    meta = list(
      total = 0,
      message = message
    )
  )
}
