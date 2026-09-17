# Microeconomics — Chapter 3: Consumer Choice

This handout was converted from a PDF. It mixes GFM tables, LaTeX math, residual HTML and images, the way Marker output usually looks.

## 3.1 Preferences and utility

A **preference relation** $\succsim$ over a consumption set $X$ is *rational* if it is complete and transitive. Every rational, continuous preference can be represented by a utility function $u: X \to \mathbb{R}$.

Some assumptions we make throughout:

* completeness: for all $x, y \in X$, either $x \succsim y$ or $y \succsim x$;
* transitivity: if $x \succsim y$ and $y \succsim z$ then $x \succsim z$;
* local non-satiation.

The consumer solves

$$
\max_{x \in \mathbb{R}^L_+} u(x) \quad \text{s.t.} \quad p \cdot x \le w
$$

where $p \gg 0$ is the price vector and $w > 0$ is wealth.

### First-order conditions

At an interior optimum the marginal rate of substitution equals the price ratio:

$$\frac{\partial u / \partial x_1}{\partial u / \partial x_2} = \frac{p_1}{p_2}$$

1. Write the Lagrangian $\mathcal{L} = u(x) - \lambda (p \cdot x - w)$.
2. Differentiate with respect to each $x_\ell$.
3. Divide the conditions pairwise.

## 3.2 Demand functions

| Utility | Demand for good 1 | Demand for good 2 |
|---|---|---|
| Cobb–Douglas $x_1^\alpha x_2^{1-\alpha}$ | $\alpha w / p_1$ | $(1-\alpha) w / p_2$ |
| Perfect substitutes $x_1 + x_2$ | $w/p_1$ if $p_1 < p_2$ | $w/p_2$ if $p_2 < p_1$ |
| Perfect complements $\min\{x_1, x_2\}$ | $w/(p_1+p_2)$ | $w/(p_1+p_2)$ |

> **Remark.** The Walrasian demand is homogeneous of degree zero in $(p, w)$ and satisfies Walras' law: $p \cdot x(p, w) = w$.

![Figure 3.1 — Indifference curves and the budget line](_page_12_Figure_1.jpeg)

<span id="page-13-0"></span>

## 3.3 Comparative statics

- Normal good: demand rises with wealth.
- Inferior good: demand falls with wealth.
  - Giffen goods are the extreme case where demand rises with own price.
- Substitutes and complements are defined through cross-price effects.

The Slutsky equation decomposes the total effect of a price change:

```
total effect = substitution effect + income effect
```

<table>
<tr><th>Symbol</th><th>Meaning</th></tr>
<tr><td>h(p, u)</td><td>Hicksian demand</td></tr>
<tr><td>e(p, u)</td><td>Expenditure function</td></tr>
</table>

Special characters that a serializer may want to escape: 3 \* 4 = 12, snake_case_names, a_b, 100% sure, \[not a link\], #hashtag, price \~ 5€.

---

*End of chapter.* See also [Chapter 4](chapter-4.md) and the footnote\[^1\].

\[^1\]: Mas-Colell, Whinston, Green — *Microeconomic Theory*, ch. 3.
