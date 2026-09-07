# Pedilo — Project Design & Development Rules

## Product

Pedilo is a web product designed for entrepreneurs and small businesses.

Its purpose is to make receiving and managing customer orders simpler, with a strong connection between the customer's ordering experience and WhatsApp.

The product should feel practical, accessible, modern and trustworthy.

It should NOT feel like an AI startup.

---

# Design Philosophy

Pedilo should look like a real product designed by a professional product team.

Prioritize:

* Clarity
* Personality
* Product-first visuals
* Strong typography
* Intentional spacing
* Clear hierarchy
* Practicality
* Trust
* Distinctive composition

Avoid generic SaaS aesthetics.

---

# Anti-AI Rules

Avoid by default:

* Purple/blue AI gradients
* Excessive gradients
* Glassmorphism
* Excessive blur
* Decorative blobs
* Excessive rounded cards
* Excessive pills
* Excessive shadows
* Generic dashboard mockups
* Repetitive three-column sections
* Decorative sparkles
* Excessive animations
* Generic startup copy

Every visual element must have a reason.

---

# Engineering

Use the existing architecture.

Do not introduce dependencies without justification.

Prefer existing components and utilities.

Maintain:

* TypeScript
* Next.js conventions
* React conventions
* Tailwind conventions
* Existing project structure

---

# Design System

Do not create inconsistent visual patterns.

Reuse existing:

* Buttons
* Components
* Typography
* Colors
* Spacing
* Radius
* Shadows

When a new component is necessary, make it consistent with the existing system.

---

# Content

Never fabricate:

* Testimonials
* Customer logos
* Statistics
* Revenue numbers
* Partnerships
* User counts
* Reviews

If real information does not exist, design the section without fake proof.

---

# Responsive

Mobile is a first-class experience.

Do not simply shrink desktop layouts.

Every major section must be intentionally composed for mobile.

---

# Quality

Before finishing a task:

1. Run type checking if available.
2. Run linting if available.
3. Run the production build if practical.
4. Check for broken imports.
5. Check responsive behavior.
6. Perform visual QA.
7. Review the diff.

Never claim something works without verifying it.
