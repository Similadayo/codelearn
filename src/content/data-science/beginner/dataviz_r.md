# Phase 2 — Data Manipulation: Data Visualization in R (ggplot2) // Translating Matplotlib & Seaborn Concepts

Data visualization is a core skill in data science and AI workflows. In Python, Matplotlib and Seaborn are go-to tools; in R, ggplot2 embodies the same ideas through the Grammar of Graphics. This lesson translates the intuition behind Matplotlib/Seaborn into idiomatic R with ggplot2, showing how to create, customize, and interpret visuals that drive insights in production-grade data pipelines.

## 1. Concept: The Grammar of Graphics in R (ggplot2)

ggplot2 is built on the idea that a plot is a combination of data, aesthetic mappings, geometric objects, and scales/themes. You compose a plot by layering components, which maps well to the way you think about charts in Matplotlib. This section covers the minimal scaffold: data, aesthetics, geometry, and a basic theme.

```r
# Basic scatter plot in ggplot2 (Matplotlib equivalent: plt.plot)
library(ggplot2)

# Sample data
df <- data.frame(
  x = 1:10,
  y = (1:10) + rnorm(10)
)

# Build the plot in layers
p <- ggplot(df, aes(x = x, y = y)) +
  geom_point() +                 # geometric layer: points
  ggtitle("Scatter plot: x vs y") +
  theme_minimal()                # theme layer

print(p)
```

### Line-by-line explanation breaking down each line

- library(ggplot2): Load the ggplot2 package to access the plotting API.
- df <- data.frame(...): Create a small data frame with x and y coordinates.
- ggplot(df, aes(x = x, y = y)): Initialize a plot with data and aesthetic mappings. aes maps data columns to visual properties.
- + geom_point(): Add a layer that renders points for each (x, y) pair.
- + ggtitle("Scatter plot: x vs y"): Add a title to the plot.
- + theme_minimal(): Apply a clean, minimal theme for readability.
- print(p): Render the plot object to the graphics device.

## 2. Concept: Aesthetics Mapping, Grouping, and Scales

Aesthetics (aes) map data variables to visual properties (color, size, shape, etc.). Grouping and facets help compare sub-populations. Scales adjust how data values translate to visuals (color scales, axis labels, etc.).

```r
df <- data.frame(
  x = rep(1:5, each = 2),
  y = rnorm(10),
  group = rep(c("A","B"), 5)
)

ggplot(df, aes(x = x, y = y, color = group, shape = group)) +
  geom_point(size = 3) +
  labs(title = "Scatter with color and shape by group",
       x = "Index", y = "Value")
```

### Line-by-line explanation breaking down each line

- df <- data.frame(...): Create a tidy dataset with a grouping variable.
- ggplot(df, aes(x = x, y = y, color = group, shape = group)): Map x and y to position, and map color and shape to the group variable.
- + geom_point(size = 3): Render points with size 3.
- + labs(...): Add a title and axis labels for clarity.

## 3. Concept: Faceting for Small Multiples

Faceting creates multiple subplots split by a factor. This mirrors Seaborn's facetgrid and helps compare distributions or relationships across categories.

```r
ggplot(df, aes(x = x, y = y)) +
  geom_point() +
  facet_wrap(~ group) +
  labs(title = "Faceted scatter by group")
```

### Line-by-line explanation breaking down each line

- ggplot(df, aes(x = x, y = y)): Start with the same dataset.
- + geom_point(): Add a scatter layer.
- + facet_wrap(~ group): Create a separate panel for each level of the group variable.
- + labs(title = "Faceted scatter by group"): Annotate the panels with a title.

## 4. Concept: Distributions — Histograms, Density, and Boxplots

Visualizing distributions is essential for understanding data shape, central tendency, and variance. ggplot2 provides geom_histogram, geom_density, and geom_boxplot.

```r
set.seed(123)
hist_df <- data.frame(value = rnorm(1000))

p1 <- ggplot(hist_df, aes(x = value)) +
  geom_histogram(binwidth = 0.2, fill = "steelblue", color = "black") +
  theme_minimal() +
  labs(title = "Histogram of values")

p2 <- ggplot(hist_df, aes(x = value)) +
  geom_density(fill = "red", alpha = 0.4) +
  labs(title = "Density plot of values")

p1
p2
```

### Line-by-line explanation breaking down each line

- set.seed(123): Ensure reproducibility of the random values.
- hist_df <- data.frame(value = rnorm(1000)): Create 1000 normally distributed values.
- p1 <- ggplot(hist_df, aes(x = value)) + geom_histogram(...): Build a histogram with specified bin width and styling.
- + theme_minimal(): Apply a clean theme for readability.
- + labs(title = "Histogram of values"): Add a descriptive title.
- p2 <- ggplot(hist_df, aes(x = value)) + geom_density(...): Build a density plot on the same data.
- + labs(title = "Density plot of values"): Add a title for the density plot.
- p1; p2: Display both plots.

## 5. Concept: Plot Types and Composition (Bars, Lines, and Heatmaps)

A broad catalog of plot types helps you cover many data visualization needs, from categorical comparisons to time series and relationships between variables.

```r
df2 <- data.frame(
  category = LETTERS[1:5],
  value = c(3, 7, 5, 6, 2)
)

# Bar plot
bar_plot <- ggplot(df2, aes(x = category, y = value, fill = category)) +
  geom_col() +
  labs(title = "Bar chart of category values")

# Line chart (time series-like)
df3 <- data.frame(
  time = 1:12,
  series = cumsum(rnorm(12))
)

line_plot <- ggplot(df3, aes(x = time, y = series)) +
  geom_line() +
  geom_point() +
  labs(title = "Time series line plot")

bar_plot
line_plot
```

### Line-by-line explanation breaking down each line

- df2 <- data.frame(...): Create a small category-value dataset.
- ggplot(df2, aes(x = category, y = value, fill = category)) + geom_col(): Build a stacked/filled bar chart by category.
- + labs(title = "Bar chart of category values"): Add a title.
- df3 <- data.frame(...): Create a simple numeric time series.
- ggplot(df3, aes(x = time, y = series)) + geom_line() + geom_point(): Plot a line chart with overlaid points to emphasize observations.
- bar_plot; line_plot: Display both plots.

## 6. Concept: Color Scales and Readability

Effective color scales improve readability and accessibility. ggplot2 supports ColorBrewer palettes and theme adjustments.

```r
ggplot(df2, aes(x = category, y = value, fill = category)) +
  geom_col() +
  scale_fill_brewer(palette = "Set2") +
  theme_classic() +
  labs(title = "Bar chart with custom color palette")
```

### Line-by-line explanation breaking down each line

- ggplot(...): Set up a bar chart mapping fill to category.
- + scale_fill_brewer(palette = "Set2"): Apply a perceptually balanced color palette.
- + theme_classic(): Use a clean classic theme for presentation-ready visuals.
- + labs(title = "Bar chart with custom color palette"): Add a descriptive title.

## X. Common Beginner Mistakes — 3+ real pitfalls with bad vs good code

- Pitfall 1: Mapping constant values inside aes() vs outside
  - Bad:
    ```r
    ggplot(df, aes(x, y, color = "blue")) + geom_point()
    ```
    This creates a legend and treats "blue" as a category.
  - Good:
    ```r
    ggplot(df, aes(x, y)) + geom_point(color = "blue")
    ```
    All points are blue without a legend.

- Pitfall 2: Using wide data not in tidy (long) format for geoms that expect long data
  - Bad:
    ```r
    df_wide <- data.frame(id = 1:5, v1 = rnorm(5), v2 = rnorm(5))
    ggplot(df_wide, aes(x = id)) + geom_line(aes(y = v1)) + geom_line(aes(y = v2))
    ```
  - Good:
    ```r
    library(tidyr)
    df_long <- pivot_longer(df_wide, cols = starts_with("v"),
                            names_to = "series", values_to = "value")
    ggplot(df_long, aes(x = id, y = value, color = series)) +
      geom_line()
    ```

- Pitfall 3: Overusing default themes with poor contrast
  - Bad:
    ```r
    ggplot(df2, aes(x = category, y = value)) +
      geom_col()
    ```
  - Good:
    ```r
    ggplot(df2, aes(x = category, y = value)) +
      geom_col(fill = "steelblue") +
      theme_minimal(base_size = 14)
    ```

- Pitfall 4: Not setting reproducible seeds when visuals rely on random data for demonstration
  - Bad:
    ```r
    df <- data.frame(x = 1:100, y = rnorm(100))
    ggplot(df, aes(x, y)) + geom_point()
    ```
  - Good:
    ```r
    set.seed(42)
    df <- data.frame(x = 1:100, y = rnorm(100))
    ggplot(df, aes(x, y)) + geom_point()
    ```

## Y. Why This Matters In Real Systems — production context and real usage

- Reproducibility: In production dashboards, plots must be reproducible given the same data and code. Seed control, versioned scripts, and parameterized plotting functions help.
- Parameterization and reusability: Create functions that accept data frames and options (colors, themes, facets) to standardize visuals across reports.
- Performance and scalability: For large datasets, sample or summarize before plotting; use data.table or dplyr to pre-aggregate.
- Integration with pipelines: Save plots to files automatically (ggsave) in reports, notebooks, or dashboards; embed plots in HTML/PDF reports.
- Accessibility and readability: Use colorblind-friendly palettes, clear typography, and appropriate facet layouts to ensure insights are accessible to diverse audiences.

## Z. Study Questions — 5 recall questions

1) What does the aes() function do in ggplot2, and why is it important?
2) How would you create small multiples of a plot split by a categorical variable?
3) Which ggplot2 geometry would you use to visualize a distribution, and what are two alternatives?
4) How can you save a ggplot2 object to a PNG file, including how to preserve dimensions and resolution?
5) How do you apply a color palette from ColorBrewer to a bar chart in ggplot2?

## Exercise — practical multi-part coding challenge

Part A: Scatter plot with grouping and smoothing
- Objective: Build an insightful scatter plot from the built-in mtcars dataset.
- Steps:
  1) Create a scatter plot of mpg (miles per gallon) vs disp (displacement).
  2) Color points by the number of cylinders (cyl) and shape by transmission (am: 0 = automatic, 1 = manual).
  3) Add a smoothing line (geom_smooth) without displaying the confidence interval.
  4) Use a clean theme and a descriptive title.
  5) Save the plot to a PNG file named "mtcars_scatter.png".

Part B: Faceted distribution and time-series-like visualization
- Objective: Compare distributions by group and visualize a simple trend.
- Steps:
  1) Create a histogram of mpg, faceted by the number of cylinders (cyl) using facet_wrap.
  2) Create a small line plot showing the trend of mpg by car index (row order) for each cyl group using facet_grid if desired.
  3) Use appropriate labels and a readable theme.

Part C: Data reshaping and a heatmap (conceptual)
- Objective: Demonstrate tidyr reshape + ggplot2 heatmap scaffolding.
- Steps:
  1) Take a subset of mtcars numeric variables, compute a simple correlation matrix.
  2) Melt the correlation matrix to long format.
  3) Use geom_tile to display a heatmap of correlations, with fill scaled by correlation value.
  4) Annotate cells with correlation values (optional).

Code for Part A (scatters with groups and smooth), Part B (distribution and trend), Part C (heatmap scaffold) is provided below. Complete the steps and ensure you can reproduce visuals in an R environment.

Part A code:
```r
library(ggplot2)

# Part A: Scatter mpg vs disp, color by cyl, shape by am, add smooth line
p_a <- ggplot(mtcars, aes(x = disp, y = mpg, color = factor(cyl), shape = factor(am))) +
  geom_point(size = 3) +
  geom_smooth(se = FALSE) +
  labs(title = "MTCar mpg vs displacement by cylinder and transmission",
       x = "Displacement (cu.in.)",
       y = "Miles per Gallon",
       color = "Cylinders",
       shape = "Transmission") +
  theme_minimal()

# Display and save
print(p_a)
ggsave("mtcars_scatter.png", plot = p_a, width = 8, height = 6, dpi = 150)
```

Part B code:
```r
# Part B: Histogram of mpg faceted by cyl, and a simple trend-like line by index
hist_faceted <- ggplot(mtcars, aes(x = mpg)) +
  geom_histogram(binwidth = 2, fill = "steelblue", color = "black") +
  facet_wrap(~ cyl) +
  labs(title = "Histogram of MPG by Cylinder Count",
       x = "MPG", y = "Count") +
  theme_minimal()

# Optional trend-like view: line by index within each cyl
mtcars$idx <- 1:nrow(mtcars)
trend_by_cyl <- ggplot(mtcars, aes(x = idx, y = mpg, color = factor(cyl))) +
  geom_line() +
  facet_wrap(~ cyl) +
  labs(title = "MPG by Car Index within Cylinder Groups",
       x = "Index", y = "MPG") +
  theme_minimal()

print(hist_faceted)
print(trend_by_cyl)
```

Part C code:
```r
library(datasets)  # for mtcars
# Compute correlation matrix for numeric variables in mtcars
num_vars <- mtcars[, sapply(mtcars, is.numeric)]
corr <- cor(num_vars)

# Melt to long format for heatmap
library(reshape2)
corr_long <- melt(corr)

# Heatmap
heatmap <- ggplot(corr_long, aes(x = Var1, y = Var2, fill = value)) +
  geom_tile(color = "white") +
  scale_fill_gradient2(low = "blue", mid = "white", high = "red", midpoint = 0) +
  coord_fixed() +
  labs(title = "Correlation heatmap of mtcars numeric variables",
       x = "", y = "") +
  theme_minimal() +
  theme(axis.text.x = element_text(angle = 45, hjust = 1))

print(heatmap)
```

Note: For Part C, ensure you have the reshape2 package installed (install.packages("reshape2")) or use tidyr::pivot_longer if preferred.

If you want more practice, expand Part C to annotate cells with the actual correlation coefficients, or create a clustered heatmap using pheatmap or ComplexHeatmap packages for more advanced layouts.