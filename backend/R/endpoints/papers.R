library(dplyr)

# Note: response helpers (create_error, create_success, create_empty)
# are loaded globally by plumber.R

#* Get all paper summaries from the literature database
#* @get /all
function() {
  papers <- data_env$paper_summaries

  if (is.null(papers) || nrow(papers) == 0) {
    return(list(
      data = list(),
      meta = list(total = 0, message = "No paper data available")
    ))
  }

  list(
    data = papers %>%
      select(
        paper_id, title, authors, year, journal,
        abstract, key_findings, region, species_focus,
        data_types, pdf_filename
      ) %>%
      arrange(desc(year), authors),
    meta = list(
      total = nrow(papers),
      extracted_date = max(papers$extracted_date, na.rm = TRUE)
    )
  )
}

#* Search papers by keyword
#* @param q Search query
#* @get /search
function(q = "") {
  papers <- data_env$paper_summaries

  if (is.null(papers) || nrow(papers) == 0) {
    return(list(data = list(), meta = list(total = 0)))
  }

  if (q == "") {
    return(list(
      data = papers,
      meta = list(total = nrow(papers))
    ))
  }

  # Search across multiple fields
  q_lower <- tolower(q)

  results <- papers %>%
    filter(
      grepl(q_lower, tolower(title), fixed = TRUE) |
      grepl(q_lower, tolower(authors), fixed = TRUE) |
      grepl(q_lower, tolower(abstract), fixed = TRUE) |
      grepl(q_lower, tolower(key_findings), fixed = TRUE) |
      grepl(q_lower, tolower(region), fixed = TRUE)
    )

  list(
    data = results,
    meta = list(
      total = nrow(results),
      query = q
    )
  )
}

#* Get papers by region
#* @param region Region name
#* @get /by-region
function(region = "") {
  papers <- data_env$paper_summaries

  if (is.null(papers) || nrow(papers) == 0) {
    return(list(data = list(), meta = list(total = 0)))
  }

  if (region == "") {
    # Return count by region
    region_counts <- papers %>%
      group_by(region) %>%
      summarise(count = n(), .groups = "drop") %>%
      arrange(desc(count))

    return(list(
      data = region_counts,
      meta = list(total_papers = nrow(papers))
    ))
  }

  # Filter by specific region
  results <- papers %>%
    filter(grepl(.env$region, region, ignore.case = TRUE))

  list(
    data = results,
    meta = list(
      total = nrow(results),
      region = region
    )
  )
}

#* Get single paper by ID
#* @param id Paper ID (filename without extension)
#* @get /by-id
function(res, id = "") {
  papers <- data_env$paper_summaries

  if (is.null(papers)) {
    return(create_error(res, 500, "DATA_UNAVAILABLE",
                        "Paper data is not loaded"))
  }

  if (id == "") {
    return(create_error(res, 400, "INVALID_PARAMETER",
                        "Paper ID is required",
                        list(parameter = "id")))
  }

  paper <- papers %>%
    filter(paper_id == id)

  if (nrow(paper) == 0) {
    return(create_error(res, 404, "NOT_FOUND",
                        sprintf("Paper with ID '%s' not found", id),
                        list(paper_id = id)))
  }

  as.list(paper[1, ])
}
