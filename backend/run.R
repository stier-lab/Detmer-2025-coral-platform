# Entry point for running the Plumber API
library(plumber)

# Get port from environment variable (Render sets this)
port <- as.integer(Sys.getenv("PORT", "8000"))

# Run the API
pr <- plumb("plumber.R")
pr$run(host = "0.0.0.0", port = port)
