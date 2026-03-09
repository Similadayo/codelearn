# Data Visualization with Matplotlib and Seaborn

Data visualization is the art and science of turning data into actionable insights through graphical representation. In professional data work, effective charts and plots help teammates understand trends, compare groups, detect anomalies, and communicate findings to stakeholders. Matplotlib provides the foundational plotting primitives, while Seaborn builds on top of Matplotlib to offer high-level, statistically aware visualizations with attractive defaults. Mastery of these tools accelerates data exploration, reporting, and decision-making in real systems.

## 1. Getting Started with Matplotlib: Basic Plots and Figure Management

```python
import matplotlib.pyplot as plt
import numpy as np

# Generate sample data
x = np.linspace(0, 10, 100)
y = np.sin(x)

# Create a simple line plot
plt.plot(x, y)
plt.title("Sine Wave")
plt.xlabel("x")
plt.ylabel("sin(x)")
plt.grid(True)
plt.tight_layout()
plt.show()
```

### Line-by-line explanation breaking down each line

- import matplotlib.pyplot as plt: Bring Matplotlib's plotting API into the namespace as plt.
- import numpy as np: Import NumPy for numerical utilities.
- x = np.linspace(0, 10, 100): Create 100 evenly spaced values from 0 to 10.
- y = np.sin(x): Compute the sine of each x value.
- plt.plot(x, y): Draw a line plot of y versus x.
- plt.title("Sine Wave"): Set the plot title.
- plt.xlabel("x"): Label the x-axis.
- plt.ylabel("sin(x)"): Label the y-axis.
- plt.grid(True): Enable a grid for easier reading.
- plt.tight_layout(): Adjust layout to prevent clipping of labels.
- plt.show(): Display the figure.

## 2. Working with DataFrames and Basic Matplotlib Visualizations

```python
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt

# Build a small dataframe
df = pd.DataFrame({
    "category": ["A","A","B","B","C","C"],
    "value": [4, 7, 1, 5, 3, 8]
})

# Bar chart from a DataFrame
ax = df.groupby("category")["value"].mean().plot(kind="bar", color="steelblue", figsize=(6,4))
ax.set_title("Mean Value by Category")
ax.set_xlabel("Category")
ax.set_ylabel("Mean Value")
plt.tight_layout()
plt.show()
```

### Line-by-line explanation breaking down each line

- import pandas as pd: Import pandas for data manipulation.
- import numpy as np: (Optional here) Import NumPy for numerical work.
- import matplotlib.pyplot as plt: Import Matplotlib for plotting.
- df = pd.DataFrame(...): Create a small dataframe with categories and values.
- df.groupby("category")["value"].mean(): Compute mean value per category.
- .plot(kind="bar", color="steelblue", figsize=(6,4)): Plot a bar chart from the grouped means; set color and figure size.
- ax.set_title(...): Set the chart title.
- ax.set_xlabel(...): Label the x-axis.
- ax.set_ylabel(...): Label the y-axis.
- plt.tight_layout(): Adjust layout to prevent clipping.
- plt.show(): Display the figure.

## 3. Seaborn Essentials: Aesthetics, Datasets, and Simple Plots

```python
import seaborn as sns
import matplotlib.pyplot as plt

# Load a built-in dataset
tips = sns.load_dataset("tips")

# Basic distribution with histogram and KDE
plt.figure(figsize=(8, 5))
sns.histplot(tips['total_bill'], bins=20, kde=True, color='skyblue')
plt.title('Distribution of Total Bill')
plt.xlabel('Total Bill ($)')
plt.ylabel('Frequency')
plt.tight_layout()
plt.show()
```

### Line-by-line explanation breaking down each line

- import seaborn as sns: Import Seaborn for high-level statistical plots.
- tips = sns.load_dataset("tips"): Load a built-in dataset named "tips".
- plt.figure(figsize=(8, 5)): Create a new figure with specified size.
- sns.histplot(..., kde=True, color='skyblue'): Plot a histogram with an overlaid KDE curve.
- plt.title(...): Set the title.
- plt.xlabel(...): Label the x-axis.
- plt.ylabel(...): Label the y-axis.
- plt.tight_layout(): Optimize spacing.
- plt.show(): Display the figure.

```python
import seaborn as sns
import matplotlib.pyplot as plt

tips = sns.load_dataset("tips")

# Scatter plot with multiple attributes
plt.figure(figsize=(8,6))
sns.scatterplot(data=tips, x="total_bill", y="tip", hue="day", style="smoker", size="size", alpha=0.7)
plt.title('Tip vs. Total Bill by Day, Smoker')
plt.xlabel('Total Bill ($)')
plt.ylabel('Tip ($)')
plt.legend(title='Day / Smoker')
plt.tight_layout()
plt.show()
```

### Line-by-line explanation breaking down each line

- plt.figure(figsize=(8,6)): Create a new figure with a specified size.
- sns.scatterplot(...): Draw a scatter plot with aesthetics:
  - data=tips: Source dataset.
  - x="total_bill", y="tip": Axes mappings.
  - hue="day": Color by day category.
  - style="smoker": Different marker styles for smoker status.
  - size="size": Marker size scaled by the 'size' column.
  - alpha=0.7: Semi-transparent points.
- plt.title(...): Add a title.
- plt.xlabel(...): Label x-axis.
- plt.ylabel(...): Label y-axis.
- plt.legend(title='Day / Smoker'): Configure legend title.
- plt.tight_layout(): Adjust layout.
- plt.show(): Display the figure.

## 4. Subplots, Faceting, and Multiplot Layouts

```python
import seaborn as sns
import matplotlib.pyplot as plt

tips = sns.load_dataset("tips")

# Two subplots side by side: boxplot and violin plot
fig, axes = plt.subplots(1, 2, figsize=(12, 5))

sns.boxplot(x="day", y="total_bill", data=tips, ax=axes[0], palette="Pastel1")
axes[0].set_title("Boxplot of Total Bill by Day")

sns.violinplot(x="day", y="total_bill", data=tips, ax=axes[1], inner="quartile", palette="Pastel2")
axes[1].set_title("Violin Plot of Total Bill by Day")

plt.tight_layout()
plt.show()
```

```python
import seaborn as sns
import matplotlib.pyplot as plt

iris = sns.load_dataset("iris")

# FacetGrid example: scatter plots by species
g = sns.FacetGrid(iris, col="species", height=4, aspect=1)
g.map_dataframe(sns.scatterplot, x="sepal_length", y="sepal_width", hue="species", s=60)
g.add_legend()
plt.show()
```

```python
import seaborn as sns
import matplotlib.pyplot as plt

# Pairwise relationships (requires multiple features)
iris = sns.load_dataset("iris")
sns.pairplot(iris, hue="species", height=2.5)
plt.show()
```

### Line-by-line explanation breaking down each line

First block:
- fig, axes = plt.subplots(1, 2, figsize=(12, 5)): Create a figure with two subplots in a 1x2 grid.
- sns.boxplot(..., ax=axes[0], ...): Draw a boxplot on the left axis.
- axes[0].set_title(...): Title the left subplot.
- sns.violinplot(..., ax=axes[1], ...): Draw a violin plot on the right axis.
- axes[1].set_title(...): Title the right subplot.
- plt.tight_layout(): Avoid overlapping elements.
- plt.show(): Display the figure.

Second block:
- iris = sns.load_dataset("iris"): Load the iris dataset.
- g = sns.FacetGrid(..., col="species", ...): Create a facet grid with one column per species.
- g.map_dataframe(sns.scatterplot, ...): Map a scatter plot to each facet.
- g.add_legend(): Add a legend to the grid.
- plt.show(): Display the figure.

Third block:
- iris = sns.load_dataset("iris"): Load dataset again (for isolation).
- sns.pairplot(iris, hue="species", height=2.5): Create a matrix of scatter plots showing relationships between features, colored by species.
- plt.show(): Display the figure.

## 5. Customization, Styles, and Reproducible Visual Design

```python
import seaborn as sns
import matplotlib.pyplot as plt

# Global style and context for readability
sns.set_theme(style="whitegrid", context="talk", palette="colorblind")

tips = sns.load_dataset("tips")

plt.figure(figsize=(8, 5))
sns.boxplot(data=tips, x="day", y="total_bill", hue="time", palette="colorblind")
plt.title("Total Bill by Day and Time")
plt.xlabel("Day of Week")
plt.ylabel("Total Bill ($)")
plt.legend(title="Meal Time", loc="upper right")
plt.tight_layout()

# Save for report/delivery
plt.savefig("tips_by_day_time.png", dpi=300, bbox_inches="tight")
plt.close()
```

### Line-by-line explanation breaking down each line

- sns.set_theme(...): Establish a consistent aesthetic: white grid, readable context, and colorblind-friendly palette.
- plt.figure(figsize=(8, 5)): Create a figure of a chosen size.
- sns.boxplot(..., hue="time", ...): Draw a boxplot with a hue split by the 'time' category (Lunch/Dinner).
- plt.title(...): Title the figure.
- plt.xlabel(...): Label the x-axis.
- plt.ylabel(...): Label the y-axis.
- plt.legend(...): Position and label the legend.
- plt.tight_layout(): Ensure elements fit nicely.
- plt.savefig("tips_by_day_time.png", dpi=300, bbox_inches="tight"): Persist the figure as a high-resolution PNG.
- plt.close(): Release the figure resources (important in long-running apps or notebooks).

## 6. Production Visualization Workflow: Reproducibility and Best Practices

```python
import matplotlib.pyplot as plt
import seaborn as sns
import pandas as pd
import numpy as np

# Seed for reproducibility
np.random.seed(42)

# Data prep (example with synthetic data)
n = 200
df = pd.DataFrame({
    "category": np.random.choice(["A","B","C"], size=n, p=[0.3, 0.5, 0.2]),
    "x": np.random.normal(loc=0, scale=1, size=n),
    "y": np.random.normal(loc=0, scale=1.5, size=n)
})

# Visualization pipeline
sns.set_theme(style="whitegrid", context="notebook", palette="muted")

plt.figure(figsize=(6, 4))
sns.scatterplot(data=df, x="x", y="y", hue="category", alpha=0.7)
plt.title("Synthetic Data: x vs y by Category")
plt.xlabel("x")
plt.ylabel("y")
plt.legend(title="Category")
plt.tight_layout()

# Save for dashboards/reports
plt.savefig("synthetic_scatter.png", dpi=300, bbox_inches="tight")
plt.close()
```

### Line-by-line explanation breaking down each line

- np.random.seed(42): Fix the random seed to ensure reproducible results across runs.
- df = pd.DataFrame({...}): Create a synthetic dataset with category groups and 2 numeric features.
- sns.set_theme(...): Apply a consistent plotting theme suitable for notebooks and dashboards.
- plt.figure(...): Start a new figure with a defined size for readability.
- sns.scatterplot(..., hue="category", alpha=0.7): Scatter plot colored by category with some transparency to handle overplotting.
- plt.title(...): Add a descriptive title.
- plt.xlabel(...), plt.ylabel(...): Label axes for clarity.
- plt.legend(...): Configure legend for interpretability.
- plt.tight_layout(): Avoid axis/title clipping.
- plt.savefig(...): Persist the figure to a file suitable for reports or dashboards.
- plt.close(): Free the figure resources.

## X. Common Beginner Mistakes — 3+ Real Pitfalls (Bad vs Good)

- Pitfall 1: Not setting a figure size, causing tiny plots in reports
  - Bad:
    ```python
    plt.plot(x, y)
    plt.show()
    ```
  - Good:
    ```python
    plt.figure(figsize=(8, 6))
    plt.plot(x, y)
    plt.xlabel("x")
    plt.ylabel("sin(x)")
    plt.title("Sine Wave")
    plt.tight_layout()
    plt.show()
    ```

- Pitfall 2: Forgetting labels and titles, making charts hard to interpret
  - Bad:
    ```python
    plt.plot(x, y)
    plt.show()
    ```
  - Good:
    ```python
    plt.plot(x, y)
    plt.title("Sine Wave")
    plt.xlabel("x")
    plt.ylabel("sin(x)")
    plt.grid(True)
    plt.tight_layout()
    plt.show()
    ```

- Pitfall 3: Overusing colors or poor palettes that hinder accessibility
  - Bad:
    ```python
    sns.barplot(x=..., y=..., palette=["#FF00FF", "#00FF00", "#0000FF"])
    ```
  - Good (accessible palette):
    ```python
    sns.barplot(x=..., y=..., palette="colorblind")
    ```

- Pitfall 4: Not using a backend appropriate for the environment (e.g., using a GUI backend in a headless producer)
  - Bad (may fail in CI/server):
    ```python
    plt.show()
    ```
  - Good:
    ```python
    import matplotlib
    matplotlib.use("Agg")  # non-interactive backend
    plt.figure(figsize=(8, 6))
    plt.plot(x, y)
    plt.savefig("sine.png", dpi=300)
    plt.close()
    ```

- Pitfall 5: Ignoring layout and redundant overplotting in large datasets
  - Bad:
    ```python
    sns.scatterplot(data=df, x="x", y="y")
    plt.show()
    ```
  - Good:
    ```python
    sns.scatterplot(data=df, x="x", y="y", alpha=0.6, s=20)
    plt.tight_layout()
    plt.show()
    ```

## Y. Why This Matters In Real Systems — Production Context and Real Usage

- Discovery and exploration: Rapidly iterate through multiple plot types to surface patterns, outliers, and group differences.
- Dashboards and reports: High-quality visuals with consistent aesthetics are essential for executive dashboards and stakeholder reports.
- Reproducibility: Setting seeds, using consistent themes, and saving figures (rather than relying on interactive displays) ensures charts can be regenerated exactly in CI, automation jobs, or audits.
- Accessibility and readability: Colorblind-friendly palettes, clear labels, proper font sizes, and legible legends improve comprehension across teams and for accessibility audits.
- Performance and scope: For large datasets, prefer sampling, aggregation, or faceting to avoid overplotting and slow rendering; save figures to files for asynchronous delivery.
- Ecosystem integration: Visualizations are often embedded in notebooks, web apps (Dash/Streamlit), or report pipelines. Design charts to export to SVG/PNG, and maintain a consistent style through a shared theme.

## Z. Study Questions — 5 Recall Questions

1) What is the difference between Matplotlib's imperative plotting (plt.plot) and Seaborn's high-level plotting (sns.scatterplot, sns.histplot)?  
2) How do you create a grid of plots by a categorical variable using Seaborn?  
3) How do you save a figure to a file with a consistent DPI and layout, suitable for reports?  
4) What steps can you take to improve readability and accessibility of a visualization (palette choice, labels, title, context)?  
5) Why is it important to set a random seed when generating synthetic data for visualizations in production code or examples?

## Exercise — Practical Multi-Part Coding Challenge

Part A: Create a small synthetic dataset with 300 points and two numeric features (x1, x2) and a categorical label (group with three categories: G1, G2, G3). Add a small amount of noise to x2 that depends on the group.

Part B: Visualize:
- A scatter plot of x1 vs x2 colored by group with a separate hue; include a legend and axis labels.
- A 1x3 facet grid showing the scatter plot for each group separately (you can facet by group or by a derived variable if you prefer).

Part C: Create a second visualization:
- A pairwise plot (Seaborn) of the three variables (x1, x2, and a derived feature z = x1 + 0.5*x2) to explore relationships, colored by group.

Part D: Produce a simple summary visualization:
- A bar chart showing the mean of x2 for each group, with error bars representing the standard deviation.

Part E: Save all figures to PNG files with tight layouts and high resolution (dpi=300). Ensure non-interactive backend is used if running headless.

Deliverables (code Snippet to run in a single script or notebook cell):
- Provide the full Python script that implements Parts A–D and saves the figures as described.

Notes:
- Use matplotlib and seaborn as in prior sections.
- Do not rely on external data sources; all data should be generated programmatically.
- Comment briefly in the code to explain key steps.