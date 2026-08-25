---
layout: page
title: PIA & Embodied AI Group
eyebrow: Research
permalink: /research/pia-embodied/
scene: pia
---

Physics-Infromed Actuation & Embodied AI Group

Physics-Informed Actuation & Embodied AI Group

## Contact

hansol.lim@stonybrook.edu  

We advance goal-oriented predictive intelligence based on physics-informed AI. By embedding physical laws directly into neural networks through EV-PINN and PINO architectures, we enable accurate inference of complex physical behaviors and system states even under limited data conditions, supporting adaptive virtual sensing capabilities.

Furthermore, by integrating the vision-based robotic control platform R-Zoom with learned models, we develop embodied AI systems in which hardware autonomously adapts to unforeseen real-world variations that were not captured in simulation, enabling robust operation beyond pre-defined control regimes.


## Mission Statement

“Our mission is to research and develop intelligent systems that can understand the world.”


## Research Interest

- Digital Twins
- Physics Informed Machine Learning
- Electric Vehicle PHM
- Optimal Control


## Detailed Work


### 1. EV-PINN: Electric Vehicle Battery Surrogates Using Physics-Informed Transform

With the rapidly evolving EV industry, we propose physics-informed AI system that can inference battery power usage from a real-time velocity feed. The system is trained on real vehicle log data and can also estimate parameters such as motor efficiency, mass, rolling resistance, aerodynamic drag, and regenerative braking efficiency through data.


<div class="fig-grid">
  <a href="{{ '/assets/research/pia-embodied/evpinn1.webp' | relative_url }}" target="_blank" rel="noopener"><img src="{{ '/assets/research/pia-embodied/evpinn1.webp' | relative_url }}" alt="" loading="lazy"></a>
  <a href="{{ '/assets/research/pia-embodied/evpinn2.webp' | relative_url }}" target="_blank" rel="noopener"><img src="{{ '/assets/research/pia-embodied/evpinn2.webp' | relative_url }}" alt="" loading="lazy"></a>
  <a href="{{ '/assets/research/pia-embodied/evpinn3.webp' | relative_url }}" target="_blank" rel="noopener"><img src="{{ '/assets/research/pia-embodied/evpinn3.webp' | relative_url }}" alt="" loading="lazy"></a>
</div>


<div class="video-grid video-single">
  <div class="video-frame"><iframe src="https://www.youtube-nocookie.com/embed/Wid2fpsdwqw" title="YouTube video" loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe></div>
</div>


### 2. MLN: Modular Lagrangian Networks

The Lagrangian formalism provides one of the most compact and expressive descriptions of the physical universe. We aim to train an AI system that can effectively understand the Lagrangian perspective and apply it to chaotic systems.


<div class="fig-grid">
  <a href="{{ '/assets/research/pia-embodied/1.webp' | relative_url }}" target="_blank" rel="noopener"><img src="{{ '/assets/research/pia-embodied/1.webp' | relative_url }}" alt="" loading="lazy"></a>
  <a href="{{ '/assets/research/pia-embodied/mln2.webp' | relative_url }}" target="_blank" rel="noopener"><img src="{{ '/assets/research/pia-embodied/mln2.webp' | relative_url }}" alt="" loading="lazy"></a>
</div>


### 3. D3M Deblurring Diffusion Deterministic  Models: Physics-Informed Field Reconstruction via Flux Regularization

D3M is a Diffusion Models inspired PINN that can reconstruct Fields based on initial conditions. It can inference steady state results of heat, electrodynamics, fluids up to 10^-9 MSE accuracy at lightspeed.


<div class="fig-grid">
  <a href="{{ '/assets/research/pia-embodied/d3m1.webp' | relative_url }}" target="_blank" rel="noopener"><img src="{{ '/assets/research/pia-embodied/d3m1.webp' | relative_url }}" alt="" loading="lazy"></a>
  <a href="{{ '/assets/research/pia-embodied/d3m2.webp' | relative_url }}" target="_blank" rel="noopener"><img src="{{ '/assets/research/pia-embodied/d3m2.webp' | relative_url }}" alt="" loading="lazy"></a>
  <a href="{{ '/assets/research/pia-embodied/d3m3.webp' | relative_url }}" target="_blank" rel="noopener"><img src="{{ '/assets/research/pia-embodied/d3m3.webp' | relative_url }}" alt="" loading="lazy"></a>
  <a href="{{ '/assets/research/pia-embodied/d3m4.webp' | relative_url }}" target="_blank" rel="noopener"><img src="{{ '/assets/research/pia-embodied/d3m4.webp' | relative_url }}" alt="" loading="lazy"></a>
  <a href="{{ '/assets/research/pia-embodied/d3m5.webp' | relative_url }}" target="_blank" rel="noopener"><img src="{{ '/assets/research/pia-embodied/d3m5.webp' | relative_url }}" alt="" loading="lazy"></a>
</div>


### 4. LogPath: Log Data Based Energy Consumption Analysis Enabling Electric Vehicle Path Optimization

We developed an eco-routing system used for EV navigation that uses real-time battery information to estimate seven major vehicle parameters by extracting multiple drive modes from the log data for the analysis. The developed system provides 1) routes, 2) charge locations, 3) charging times, and 4) optimum vehicle speeds that guarantee the shortest travel time.


<div class="video-grid video-single">
  <div class="video-frame"><iframe src="https://www.youtube-nocookie.com/embed/iPlkJGpI3nw" title="YouTube video" loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe></div>
</div>

