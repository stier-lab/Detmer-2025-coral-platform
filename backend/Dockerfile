# R Plumber API Dockerfile for Render deployment
# Build context should be the repository root
FROM rocker/r-ver:4.3.2

# Install system dependencies for R packages
# httpuv requires libuv1-dev and zlib1g-dev
RUN apt-get update && apt-get install -y \
    libcurl4-openssl-dev \
    libssl-dev \
    libxml2-dev \
    libsodium-dev \
    libuv1-dev \
    zlib1g-dev \
    && rm -rf /var/lib/apt/lists/*

# Install R packages
RUN R -e "install.packages(c('plumber', 'dplyr', 'jsonlite', 'readr', 'tidyr', 'purrr'), repos='https://cran.rstudio.com/')"

# Set working directory
WORKDIR /app

# Copy backend code
COPY backend/ /app/

# Copy standardized data from submodule
COPY data-repo/standardized_data/ /app/standardized_data/

# Copy analysis outputs from submodule
COPY data-repo/analysis/output/ /app/analysis/output/

# Expose port
EXPOSE 8000

# Run the API
CMD ["Rscript", "run.R"]
