# IMDb Explorer
Choose movies to watch based on rating and popularity on IMDb. A data visualisation project.

The project includes:

- A fully client-side website (HTML, CSS, JavaScript)
- A Python script that refreshes IMDb data
- Optional GitHub Actions automation for scheduled scraping

This repository powers both the data pipeline and the deployed website.

---

## Live Demo
Once deployed with GitHub Pages, your site will be available at: https://obedientmoosefromgianttown.github.io/imbd/


<img width="1470" height="956" alt="Screenshot 2025-12-02 at 23 53 42" src="https://github.com/user-attachments/assets/cce002a8-dcbe-411c-96c8-1e8b69c98e87" />


## Features
- **Interactive Heatmap:** A visual chart showing all movies by rating (vertical) and popularity (horizontal), where each colored cell represents movies clustered at that rating/popularity intersection.
- **Smart Filtering:** Use dropdowns to filter by genre, title type, decade or year, and combine them with a live title search to instantly narrow down results.
- **Brush Selection:** Click and drag across the chart to select any rectangular region and see all movies that fall within that rating and popularity range.
- **Hover Details:** Hover over any colored cell to instantly see the list of movies at that point, along with their exact ratings and vote counts.

## For Movie Enthusiasts
- **Find Hidden Gems:** Look for highly rated movies with relatively few votes, often located toward the upper-left area of the chart.
- **Discover Popular Favorites:** Explore clusters of heavily voted titles to find the most-watched and widely discussed movies.
- **Genre Deep-Dives:** Filter by specific genres such as Horror, Comedy, Sci-Fi or Documentary to focus on the kinds of stories you enjoy most.
- **Era Exploration:** Browse by decade to jump between classic cinema, 90s favorites, and more recent releases.
- **Quality vs Popularity Analysis:** Visually compare how critical acclaim (rating) aligns with audience size (number of votes).
- **Comparative Research:** Use brush selection to isolate and compare movies that share similar rating and popularity bands.
