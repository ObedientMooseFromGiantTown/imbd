// script.js
// IMDb Movie Explorer – D3 heatmap (rating vs votes) with filters + brushing

const DATA_URL = "data.csv"; // make sure this file is in the repo root

// DOM refs
const svg = d3.select("#heatmap");
const tooltip = d3.select("#tooltip");
const genreSelect = document.getElementById("Genre");
const typeSelect = document.getElementById("Type");
const yearSelect = document.getElementById("Year");
const titleInput = document.getElementById("Title");
const tableBody = document.getElementById("table-body");
const selectionCountEl = document.getElementById("selection-count");
const updatedEl = document.getElementById("updated");

// Layout
const margin = { top: 30, right: 20, bottom: 50, left: 55 };
let width = 960;
let height = +svg.attr("height");
let innerWidth = width - margin.left - margin.right;
let innerHeight = height - margin.top - margin.bottom;

svg.attr("viewBox", `0 0 ${width} ${height}`);

const g = svg
  .append("g")
  .attr("transform", `translate(${margin.left},${margin.top})`);

const xAxisG = g.append("g").attr("transform", `translate(0,${innerHeight})`);
const yAxisG = g.append("g");
const brushG = g.append("g").attr("class", "brush");

const xLabel = g
  .append("text")
  .attr("x", innerWidth / 2)
  .attr("y", innerHeight + 40)
  .attr("text-anchor", "middle")
  .attr("fill", "#e5e5e5")
  .attr("font-size", 12)
  .text("Popularity (IMDb votes, log scale)");

const yLabel = g
  .append("text")
  .attr("x", -innerHeight / 2)
  .attr("y", -40)
  .attr("transform", "rotate(-90)")
  .attr("text-anchor", "middle")
  .attr("fill", "#e5e5e5")
  .attr("font-size", 12)
  .text("Rating (1 – 10)");

let allMovies = [];
let filteredMovies = [];
let bins = [];
let xScale, yScale, xBins, yBins, colorScale;

const NUM_X_BINS = 30;
const NUM_Y_BINS = 18;

// Load and prep data
d3.csv(DATA_URL, d3.autoType).then((raw) => {
  allMovies = raw
    .map((d) => {
      const title = d.Title || d.primaryTitle || d.title || "";
      const year = d.Year || d.startYear || null;
      const rating = Number(d.imdbRating ?? d.Rating ?? d.imdb_rating);
      const votes = Number(d.imdbVotes ?? d.Votes ?? d.imdb_votes);
      const genreField = d.Primary_Genre || d.PrimaryGenre || d.Genre || d.genres || "";
      const typeField = d.Type || d.titleType || d.TypeName || "";
      const imdbID = d.imdbID || d.tconst || "";

      if (!title || !rating || !votes) return null;

      return {
        title,
        year,
        rating,
        votes,
        genre: (genreField || "").split(",")[0].trim() || "",
        genreRaw: genreField,
        type: typeField,
        imdbID,
      };
    })
    .filter(Boolean);

  if (!allMovies.length) {
    console.error("No usable movies found in CSV");
    return;
  }

  // Set "last updated" timestamp (approx based on now)
  const now = new Date();
  updatedEl.textContent = `Updated ${now.toISOString().slice(0, 10)}`;

  setupFilters();
  applyFiltersAndRender();
});

// Set up dropdown options
function setupFilters() {
  const genres = new Set();
  const types = new Set();
  const years = new Set();

  allMovies.forEach((d) => {
    if (d.genre) genres.add(d.genre);
    if (d.type) types.add(d.type);
    if (d.year) years.add(+d.year);
  });

  [...genres].sort().forEach((g) => {
    const opt = document.createElement("option");
    opt.value = g;
    opt.textContent = g;
    genreSelect.appendChild(opt);
  });

  [...types].sort().forEach((t) => {
    const opt = document.createElement("option");
    opt.value = t;
    opt.textContent = t;
    typeSelect.appendChild(opt);
  });

  [...years]
    .sort((a, b) => a - b)
    .forEach((y) => {
      const opt = document.createElement("option");
      opt.value = y;
      opt.textContent = y;
      yearSelect.appendChild(opt);
    });

  genreSelect.addEventListener("change", onFilterChange);
  typeSelect.addEventListener("change", onFilterChange);
  yearSelect.addEventListener("change", onFilterChange);
  titleInput.addEventListener("input", debounce(onFilterChange, 200));
}

function onFilterChange() {
  applyFiltersAndRender();
}

function applyFiltersAndRender() {
  const genre = genreSelect.value;
  const type = typeSelect.value;
  const year = yearSelect.value ? +yearSelect.value : null;
  const titleQuery = titleInput.value.trim().toLowerCase();

  filteredMovies = allMovies.filter((d) => {
    if (genre && d.genre !== genre) return false;
    if (type && d.type !== type) return false;
    if (year && d.year !== year) return false;
    if (titleQuery && !d.title.toLowerCase().includes(titleQuery)) return false;
    return true;
  });

  buildScalesAndBins();
  drawHeatmap();
  updateSelection(filteredMovies.slice(0, 50)); // default selection: first 50
}

function buildScalesAndBins() {
  if (!filteredMovies.length) {
    bins = [];
    return;
  }

  const minVotes = d3.min(filteredMovies, (d) => d.votes);
  const maxVotes = d3.max(filteredMovies, (d) => d.votes);
  const minLog = Math.log10(Math.max(1, minVotes));
  const maxLog = Math.log10(maxVotes);

  xScale = d3
    .scaleLog()
    .domain([Math.pow(10, Math.floor(minLog)), Math.pow(10, Math.ceil(maxLog))])
    .range([0, innerWidth])
    .nice();

  yScale = d3.scaleLinear().domain([1, 10]).range([innerHeight, 0]).nice();

  xBins = d3
    .range(NUM_X_BINS)
    .map((i) => innerWidth * (i / NUM_X_BINS));
  yBins = d3
    .range(NUM_Y_BINS)
    .map((j) => innerHeight * (j / NUM_Y_BINS));

  const binMap = new Map();

  filteredMovies.forEach((d) => {
    const x = xScale(d.votes);
    const y = yScale(d.rating);

    const i = Math.max(
      0,
      Math.min(
        NUM_X_BINS - 1,
        Math.floor((x / innerWidth) * NUM_X_BINS)
      )
    );
    const j = Math.max(
      0,
      Math.min(
        NUM_Y_BINS - 1,
        Math.floor((y / innerHeight) * NUM_Y_BINS)
      )
    );

    const key = `${i}-${j}`;
    if (!binMap.has(key)) {
      binMap.set(key, {
        i,
        j,
        movies: [],
      });
    }
    binMap.get(key).movies.push(d);
  });

  bins = [...binMap.values()];
  const maxCount = d3.max(bins, (b) => b.movies.length);

  colorScale = d3
    .scaleSequential(d3.interpolateReds)
    .domain([0, maxCount || 1]);
}

function drawHeatmap() {
  // Axes
  const xAxis = d3
    .axisBottom(xScale)
    .ticks(10, "~s")
    .tickSizeOuter(0);

  const yAxis = d3.axisLeft(yScale).ticks(10).tickSizeOuter(0);

  xAxisG.call(xAxis);
  yAxisG.call(yAxis);

  xAxisG.selectAll("text").attr("fill", "#e5e5e5").attr("font-size", 10);
  yAxisG.selectAll("text").attr("fill", "#e5e5e5").attr("font-size", 10);
  xAxisG.selectAll("path,line").attr("stroke", "#4b5563");
  yAxisG.selectAll("path,line").attr("stroke", "#4b5563");

  // Join
  const cellWidth = innerWidth / NUM_X_BINS;
  const cellHeight = innerHeight / NUM_Y_BINS;

  const cells = g.selectAll(".cell").data(bins, (d) => `${d.i}-${d.j}`);

  cells
    .enter()
    .append("rect")
    .attr("class", "cell")
    .attr("x", (d) => d.i * cellWidth)
    .attr("y", (d) => d.j * cellHeight)
    .attr("width", cellWidth + 1)
    .attr("height", cellHeight + 1)
    .attr("fill", (d) => colorScale(d.movies.length))
    .on("mousemove", (event, d) => showTooltip(event, d))
    .on("mouseout", () => hideTooltip())
    .on("click", (event, d) => {
      updateSelection(d.movies);
    })
    .merge(cells)
    .attr("fill", (d) => colorScale(d.movies.length));

  cells.exit().remove();

  // Brush
  const brush = d3
    .brush()
    .extent([
      [0, 0],
      [innerWidth, innerHeight],
    ])
    .on("end", brushed);

  brushG.call(brush);
}

// Brush handler: select all movies whose (votes, rating) fall inside rectangle
function brushed({ selection }) {
  if (!selection) {
    updateSelection([]);
    return;
  }
  const [[x0, y0], [x1, y1]] = selection;

  const selected = filteredMovies.filter((d) => {
    const x = xScale(d.votes);
    const y = yScale(d.rating);
    return x >= x0 && x <= x1 && y >= y0 && y <= y1;
  });

  updateSelection(selected);
}

// Tooltip
function showTooltip(event, bin) {
  const [x, y] = d3.pointer(event);
  const movies = bin.movies.slice(0, 6); // show first few

  tooltip
    .classed("hidden", false)
    .style("left", event.clientX + 12 + "px")
    .style("top", event.clientY + 12 + "px");

  tooltip.html("");
  tooltip.append("div").attr("class", "tooltip-title").text(
    `${movies.length} movie${movies.length !== 1 ? "s" : ""}`
  );

  movies.forEach((m) => {
    tooltip
      .append("div")
      .attr("class", "tooltip-movie")
      .text(
        `${m.title} (${m.year || "?"}) · ${m.rating.toFixed(
          1
        )} ★ · ${m.votes.toLocaleString()} votes`
      );
  });
}

function hideTooltip() {
  tooltip.classed("hidden", true);
}

// Update table with selected movies
function updateSelection(movies) {
  const sorted = [...movies].sort((a, b) => b.rating - a.rating);
  tableBody.innerHTML = "";

  sorted.slice(0, 200).forEach((m) => {
    const tr = document.createElement("tr");

    const imdbUrl = m.imdbID
      ? `https://www.imdb.com/title/${m.imdbID}/`
      : `https://www.imdb.com/find?q=${encodeURIComponent(m.title)}`;

    tr.innerHTML = `
      <td class="p-3 whitespace-nowrap">
        <a href="${imdbUrl}" target="_blank" rel="noopener noreferrer">
          ${m.title}
        </a>
      </td>
      <td class="p-3">${m.year || ""}</td>
      <td class="p-3">${m.genre || ""}</td>
      <td class="p-3">${m.type || ""}</td>
      <td class="p-3">${m.rating?.toFixed(1) ?? ""}</td>
      <td class="p-3">${m.votes?.toLocaleString() ?? ""}</td>
    `;
    tableBody.appendChild(tr);
  });

  const count = movies.length;
  selectionCountEl.textContent = count
    ? `${count.toLocaleString()} titles in selection`
    : "No selection (showing sample only)";
}

// Small debounce helper
function debounce(fn, delay = 200) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn.apply(null, args), delay);
  };
}
