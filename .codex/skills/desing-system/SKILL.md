---

name: design-system
description: Maintain a coherent reusable visual system across the Pedilo website and prevent inconsistent component styling.
---

# Design System

You are responsible for maintaining a coherent design system.

## Principle

Do not invent a new visual pattern when an existing pattern already solves the problem.

## Tokens

Maintain consistent:

* Colors
* Typography
* Spacing
* Radius
* Shadows
* Borders
* Transitions

## Components

Establish consistent behavior for:

* Buttons
* Links
* Inputs
* Cards
* Badges
* Navigation
* Dropdowns
* Modals
* Tooltips
* Alerts
* Forms

## Component consistency

The same component should look and behave consistently throughout the product.

## Avoid component proliferation

Do not create:

ButtonA
ButtonB
ButtonC
ButtonD

when one component with variants is sufficient.

## Tailwind

When Tailwind is used:

* Prefer existing design tokens
* Avoid arbitrary values unless justified
* Avoid duplicated utility patterns
* Keep class combinations maintainable
* Extract repeated patterns into components when appropriate

## shadcn/ui

When shadcn/ui is present:

* Reuse existing primitives
* Customize them through the design system
* Do not unnecessarily replace primitives
* Maintain accessibility behavior

## Existing project

Before introducing new styles:

1. Inspect existing components.
2. Inspect global styles.
3. Inspect Tailwind configuration/theme.
4. Inspect existing tokens.
5. Reuse existing patterns where appropriate.

Do not destroy working architecture merely to achieve visual consistency.

## Design-system integrity

If a redesign requires changing a token, evaluate its impact across the entire website.

Do not make isolated visual changes that create inconsistency.
