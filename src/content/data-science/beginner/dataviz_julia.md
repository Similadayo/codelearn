# Data Visualization in Julia: Matplotlib & Seaborn

Visualizing data is a critical skill in Data Science & AI. In production-grade pipelines, you often need to generate clear, repeatable visuals by leveraging Python's mature Matplotlib and Seaborn ecosystems from a Julia workflow. This lesson demonstrates how to create, customize, and save informative plots in Julia by calling Matplotlib and Seaborn via PyPlot and PyCall/PyPlot interop. You’ll learn essential chart types, how to combine Julia data with Python visualization tools, and best practices for reproducibility and production-ready visuals.

## 1. Getting Started with Matplotlib (PyPlot) in Julia

Matplotlib is the backbone of many visualization workflows. In Julia, PyPlot (a Julia wrapper around Matplotlib) provides a familiar plotting interface, while PyCall enables direct calls to Python’s Matplotlib and Seaborn from Julia.

Code Example 1: Basic line plot using PyPlot (Matplotlib) in Julia
```julia
using PyPlot

# Data
x = 1:10
y = rand(10)

# Basic line plot
plot(x, y)

# Axes labels and title
xlabel("Index")
ylabel("Value")
title("Simple Line Plot via PyPlot (Matplotlib)")

# Optional grid and save
grid(true)
savefig("line_plot_pyplot.png")
```

### Line-by-line explanation
- Line 1: Import the PyPlot package, which provides a Julia interface to Matplotlib.
- Line 3: Create a simple x-axis range from 1 to 10.
- Line 4: Generate 10 random values for y.
- Line 7: Plot y versus x as a line graph.
- Line 10-11: Add axis labels for clarity.
- Line 12: Add a plot title.
- Line 15: Enable grid lines for readability.
- Line 16: Save the figure to a PNG file for reproducibility and reporting.

## 2. DataFrames and Seaborn via PyCall in Julia

Seaborn provides high-level aesthetics and statistical plots. You can call Seaborn from Julia using PyCall, passing Julia arrays (which PyCall converts to Python-friendly types) and using Python’s interactive plotting.

Code Example 2: Seaborn regression plot via PyCall (Julia -> Python)
```julia
using Random
using PyCall

# Make sure the seed is fixed for reproducibility in both Julia and Python
Random.seed!(123)

# Import Python plotting libraries
plt = pyimport("matplotlib.pyplot")
sns = pyimport("seaborn")

# Generate data in Julia
x = collect(1:100)
y = 0.5 .* x .+ 5 .* randn(100)  # linear relationship with noise

# Seaborn regression plot
sns.regplot(x, y)

# Additional labels and title
plt.xlabel("x")
plt.ylabel("y")
plt.title("Seaborn Regression Plot via PyCall (Julia -> Python)")

# Show the plot (or save)
plt.show()
```

### Line-by-line explanation
- Line 1: Import the Random module to control Julia-side randomness.
- Line 2: Import PyCall, which enables calling Python libraries from Julia.
- Line 5: Seed Julia’s RNG for reproducibility.
- Line 8-9: Import Python’s matplotlib.pyplot as plt and seaborn as sns.
- Line 12: Create x as integers 1..100.
- Line 13-14: Create y with a linear trend plus Gaussian noise to simulate a noisy linear relationship.
- Line 17: Call seaborn’s regplot to plot a regression fit of y on x.
- Line 20-22: Add axis labels and a title using Matplotlib via plt.
- Line 25: Show the plot using Matplotlib.

Notes:
- Seaborn requires a Python runtime; PyCall will utilize the same Python environment you configured for Julia.
- You can also pass a Python dict or a Julia DataFrame converted to a Python pandas DataFrame for richer seaborn plots.

## 3. Visualizing Distributions with Seaborn and Matplotlib

A core visualization task is understanding distributions and density with histograms and kernel density estimates (KDE).

Code Example 3A: Histogram with Matplotlib (PyPlot)
```julia
using PyPlot

# Generate synthetic data
data = randn(1000)  # standard normal

# Histogram with density-like styling
plt.hist(data, bins=30, color="steelblue", alpha=0.7)
plt.xlabel("Value")
plt.ylabel("Frequency")
plt.title("Histogram via PyPlot (Matplotlib)")
plt.grid(true)

# Save for reproducibility
savefig("hist_pyplot.png", dpi=300)
```

### Line-by-line explanation
- Line 1: Import PyPlot for Matplotlib access.
- Line 4: Create 1000 samples from a standard normal distribution.
- Line 7: Plot a histogram with 30 bins, blue color, and slight transparency.
- Line 8-9: Add axis labels and title.
- Line 10: Enable grid lines for readability.
- Line 13: Save the figure to a high-DPI PNG file for publication-quality output.

Code Example 3B: Seaborn histplot with KDE via PyCall
```julia
using Random
using PyCall

plt = pyimport("matplotlib.pyplot")
sns = pyimport("seaborn")

# Seed for reproducibility
Random.seed!(456)
data = randn(1000)

# Seaborn histogram with KDE
sns.histplot(data, bins=40, kde=true, color="coral")

plt.xlabel("Value")
plt.ylabel("Density")
plt.title("Seaborn histplot with KDE via PyCall")
plt.show()
```

### Line-by-line explanation
- Line 1-2: Import Random and PyCall to access Python libraries.
- Line 4-5: Import matplotlib.pyplot as plt and seaborn as sns.
- Line 8: Seed Julia RNG for reproducibility on the Julia side.
- Line 9: Generate 1000 samples from a standard normal distribution.
- Line 12: Call seaborn.histplot with KDE enabled for combined histogram and density estimate.
- Line 14-16: Add axis labels and a title with Matplotlib.
- Line 17: Display the plot.

Tips:
- Seaborn’s KDE can reveal distribution shapes more clearly than a histogram alone.
- In production dashboards, you may want to save these plots to files or render inline in notebooks.

## 4. Subplots and Layouts

Creating consistent layouts is essential for dashboards and reports. You can combine multiple plots in a single figure using Matplotlib’s subplot or subplots API.

Code Example 4: 1x2 subplot layout with PyPlot
```julia
using PyPlot

# Data
x = 1:100
y1 = sin.(x ./ 5)
y2 = cos.(x ./ 7)

plt.figure(figsize=(10,4))

# Left: line plot
plt.subplot(1, 2, 1)
plt.plot(x, y1, color="navy")
plt.title("Sine Wave")
plt.xlabel("x")
plt.ylabel("sin(x/5)")

# Right: scatter plot
plt.subplot(1, 2, 2)
plt.scatter(x, y2, c="tomato", alpha=0.6)
plt.title("Cosine Scatter")
plt.xlabel("x")
plt.ylabel("cos(x/7)")

plt.tight_layout()
savefig("subplots_1x2.png", dpi=300)
```

### Line-by-line explanation
- Line 1: Import PyPlot for Matplotlib.
- Line 4-5: Define two data series: sine and cosine transforms.
- Line 7: Create a figure with a 10x4 inch size.
- Line 10-15: Create the left sub-plot (1 row, 2 columns, first panel) with a line plot and axis labels.
- Line 18-23: Create the right sub-plot (second panel) with a scatter plot and axis labels.
- Line 25: Adjust layout to prevent overlaps.
- Line 26-27: Save the composed figure to a file.

Code Example 5: 2x2 grid using PyPlot and a seaborn facet-like approach
```julia
using PyPlot
sns = pyimport("seaborn")

# Data for a 2x2 grid
x = collect(1:100)
yA = sin.(x ./ 5)
yB = cos.(x ./ 5)
group = repeat(["A","B"], inner=50)

# Create a figure
plt.figure(figsize=(8,6))

# Top-left: line plot
plt.subplot(2,2,1)
plt.plot(x, yA, label="A")
plt.title("Line A")
plt.legend()

# Top-right: line plot for B
plt.subplot(2,2,2)
plt.plot(x, yB, color="green", label="B")
plt.title("Line B")
plt.legend()

# Bottom-left: seaborn-like scatter with hue (requires DataFrame-like input)
# Prepare data
data_dict = Dict("x" => x, "y" => vcat(yA, yB), "group" => group)
sns.scatterplot(data=data_dict, x="x", y="y", hue="group")
plt.title("Scatter A vs B by Group")

# Bottom-right: histogram of combined data
plt.subplot(2,2,4)
sns.histplot(vcat(yA, yB), bins=30, color="purple")
plt.title("Histogram of A and B")

plt.tight_layout()
savefig("subplot_2x2.png", dpi=300)
```

### Line-by-line explanation
- Line 1: Import PyPlot for basic plotting.
- Line 2: Import seaborn for a more advanced scatter/hist plot.
- Lines 5-7: Prepare x, two y-series, and a simple grouping vector.
- Line 10: Create a 2x2 grid and plot the first panel (top-left) as a line plot for A.
- Lines 13-15: Plot the second panel (top-right) as a line plot for B with different color and legend.
- Lines 18-21: Prepare a Python-friendly data structure (dictionary) to pass to seaborn and render a scatter plot with hue by group.
- Lines 22-25: Plot the bottom-right histogram of the combined data using seaborn.
- Lines 27-29: Improve layout and save the figure.

Notes:
- Seaborn will adapt to Python-side data structures; Julia arrays can be passed directly, and PyCall handles conversion.
- For complex facet-like layouts, you can also use Python’s seaborn FacetGrid, but it requires managing DataFrames or dictionaries.

## 5. Saving Figures, Reproducibility, and Interop Best Practices

In production systems, you typically need reproducible visuals and stable file outputs across environments.

Code Example 6: Reproducibility and saving in a Julia-to-Python workflow
```julia
using Random
using PyCall

# Fix seeds on both sides
Random.seed!(789)
np = pyimport("numpy")
np.random.seed(789)

plt = pyimport("matplotlib.pyplot")
# Simple plot example
x = collect(1:50)
y = 2 .* x .+ 5 .* np.random.randn(50)

plt.plot(x, y, color="royalblue")
plt.xlabel("Index")
plt.ylabel("Value")
plt.title("Reproducible Plot with Seed Control")

# Save for traceability
plt.savefig("reproducible_plot.png", dpi=300)

# Optional: close figure to avoid memory leaks in long-running sessions
plt.close()
```

### Line-by-line explanation
- Line 1-3: Import Random and PyCall to manage RNGs and Python interop.
- Line 6-7: Seed Julia and Python RNGs with the same seed to ensure repeatable results across environments.
- Line 9-11: Import Python’s pyplot to access Matplotlib for plotting.
- Line 14-16: Create a simple linear-looking dataset with added noise via numpy’s random generator, ensuring a consistent seed for Python’s RNG as well.
- Line 18-21: Plot and annotate the figure using Matplotlib’s typical API, ensuring colors, labels, and title are defined.
- Line 24: Save the figure with a high DPI for publication-quality output.
- Line 27: Close the figure to free resources (important in batch processing or long runs).

## X. Common Beginner Mistakes — 3+ real pitfalls with bad vs good code side-by-side

Pitfall 1: Overlapping figures without clearing or creating new figures
- Bad:
```julia
using PyPlot
plot(x, y1)
plot(x2, y2)
show()
```
- Good:
```julia
using PyPlot
figure()
plot(x, y1)

figure()
plot(x2, y2)
show()
```

Pitfall 2: Not seeding randomness, causing non-reproducible visuals
- Bad:
```julia
Random.seed!(nothing)  # not deterministic
y = randn(100)
```
- Good:
```julia
using Random
Random.seed!(1234)
y = randn(100)
```

Pitfall 3: Mixing Python interop modes inconsistently (PyPlot vs PyCall)
- Bad:
```julia
using PyPlot
plt = pyimport("matplotlib.pyplot")
plt.plot(x, y)  # mix of PyPlot API and PyCall objects in a confusing way
```
- Good:
```julia
using PyPlot
plot(x, y)       # idiomatic PyPlot usage in Julia
```

Pitfall 4: Passing mismatched data shapes to seaborn (e.g., mismatched lengths for x and y)
- Bad:
```julia
x = 1:50
y = 1:40
sns.regplot(x, y)  # Python will error due to shape mismatch
```
- Good:
```julia
x = 1:50
y = 0.5 .* x .+ randn(50)
sns.regplot(x, y)
```

Pitfall 5: Ignoring figure saving when working headless (CI, servers)
- Bad:
```julia
plt.plot(x, y)
# No save or display in a headless environment
```
- Good:
```julia
plt.plot(x, y)
plt.savefig("figure.png", dpi=300)
```

Pitfall 6: Not setting DPI or file format for publication-quality outputs
- Bad:
```julia
savefig("figure.png")  # default DPI, may be low
```
- Good:
```julia
savefig("figure_highres.png", dpi=300)
```

## Y. Why This Matters In Real Systems — production context and real usage

- Reproducibility across environments: Seed Julia and Python RNGs to ensure consistent visuals in notebooks, automation scripts, and batch jobs.
- Automated dashboards and reporting: Save figures programmatically with fixed filenames and DPI for CI pipelines, reports, and export to SVG/PNG for documentation.
- Large-scale data: For very large datasets, visualize downsampled data or computed aggregations to maintain responsiveness while preserving signal.
- Styling and accessibility: Use consistent color palettes, font sizes, and grid styles to meet corporate branding and accessibility requirements (contrast, readability).
- Interoperability: Julia can leverage Python’s visualization ecosystem without leaving the Julia workflow, enabling richer charts and easier integration with Python-based ETL tools and machine learning pipelines.
- Performance considerations: PyCall incurs some overhead; for frequent plotting, PyPlot.jl (PyPlot) can be more efficient, and pre-sizing figures helps avoid repeated allocations.

## Z. Study Questions — 5 recall questions

1. How do you install and import Seaborn in a Julia session using PyCall?
2. What is the purpose of seeding random number generators on both Julia and Python sides when visualizing data?
3. How can you create a single figure with multiple subplots in Julia using Matplotlib?
4. What are the advantages of using Seaborn’s histplot with KDE enabled compared to a pure Matplotlib histogram?
5. When saving figures for publication, which parameters should you consider adjusting (e.g., DPI, file format, transparency)?

## Exercise — a practical multi-part coding challenge

Part A: Simple line plot with PyPlot
- Task: Generate a sine wave and a cosine wave, plot both on the same figure with labels, and save as a high-resolution PNG.
- Requirements:
  - Use Julia with PyPlot (Matplotlib).
  - Ensure the two curves are labeled (legend), and the figure has a title.
  - Save as "sine_cosine.png" with 300 DPI.

Part B: Seaborn scatter with regression and hue
- Task: Create a synthetic dataset with x in 1..120 and a dependent variable y with a factor group ("A" or "B"). Plot a scatter plot with regression line and differentiate groups by color.
- Requirements:
  - Use PyCall to call seaborn.regplot or seaborn.scatterplot with a regression fit.
  - Use a single call to seaborn to generate the visualization.
  - Save as "scatter_reg_group.png".

Part C: 2x2 subplot panel
- Task: Build a 2x2 panel containing:
  - Top-left: Line plot of y = sin(x) for x in [0, 4π].
  - Top-right: Scatter plot of x vs. y = cos(x) with jitter.
  - Bottom-left: Histogram of y values with KDE enabled (Seaborn or Matplotlib).
  - Bottom-right: Heatmap of a small covariance matrix between three synthetic variables.
- Requirements:
  - Use a consistent figure size and provide axis titles.
  - Ensure the 2x2 layout is saved as "panel_2x2.png" with high resolution.

Part D: Reproducibility and document-ready visuals
- Task: Reproduce a small visualization with fixed seeds and save multiple outputs (PNG and SVG) for a report.
- Requirements:
  - Set seeds consistently in both Julia and Python environments.
  - Save outputs as both PNG and SVG with identical data.
  - Include a short note in the code comments about reproducibility.

Hints:
- Start simple: implement Part A first, then incrementally add complexity for Part B, C, and D.
- Use PyPlot for direct Matplotlib plots and PyCall for Seaborn visuals; mix and match as appropriate for your task.
- For large data, consider downsampling before plotting to keep interactive plotting responsive.
- Always save figures to a designated output directory and set a consistent DPI to ensure cross-environment reproducibility.

End of lesson.