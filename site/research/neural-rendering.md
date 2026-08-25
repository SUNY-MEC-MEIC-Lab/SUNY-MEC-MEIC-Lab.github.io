---
layout: page
title: Neural Rendering & Spatial AI Group
eyebrow: Research
permalink: /research/neural-rendering/
---

## Contact

jeewon.lee @stonybrook.edu  

Through our proprietary Micro-Splatting and LiDAR-3DGS pipelines, we enable photorealistic digitization of large-scale facilities and develop perception-driven digital twin frameworks capable of interpreting sensor data in real time. Our work advances spatial AI systems that bridge high-fidelity 3D reconstruction with intelligent environmental understanding.


## Mission Statement

“Our mission is to research and develop intelligent systems that can build hyper-realistic digital twin connected to the real world.”


## Research Interest

- Digital Twins
- Radiance Field Rendering
- Vision Sensing and Control
- Deep Learning


## Detailed Work


### 1. Micro-Splatting: Maximizing Isotropic Constraints for Refined Optimization in 3D Gaussian Splatting

This research presents Micro-Splatting, an enhanced 3D Gaussian Splatting framework designed to improve fine-detail reconstruction in complex scenes. By enforcing isotropic constraints and applying adaptive densification only in high-frequency regions, the method prevents over-blurred representations caused by oversized splats. Through covariance regularization and a refined loss function, Micro-Splatting achieves sharper, more accurate models to make it especially effective for inspection tasks requiring high precision.


<div class="fig-grid fig-single">
  <a href="{{ '/assets/research/neural-rendering/microsplatting2.webp' | relative_url }}" target="_blank" rel="noopener"><img src="{{ '/assets/research/neural-rendering/microsplatting2.webp' | relative_url }}" alt="" loading="lazy"></a>
</div>


### 2. ReVIEW: Remote Visualization and Inspection Enabled on Web

ReVIEW is a web-based platform that enables remote 3D inspection by transforming video footage into interactive 3D models using Gaussian Splatting. The system integrates video-based data collection, YOLO-based object detection, Structure-from-Motion for camera pose estimation, and WebGL visualization. By allowing users to inspect specific components directly within a browser, ReVIEW improves safety, reduces inspection costs, and makes detailed visual analysis possible without on-site access which is ideal for environments like ship engine rooms and industrial facilities.


<div class="fig-grid">
  <a href="{{ '/assets/research/neural-rendering/그림5.webp' | relative_url }}" target="_blank" rel="noopener"><img src="{{ '/assets/research/neural-rendering/그림5.webp' | relative_url }}" alt="" loading="lazy"></a>
  <a href="{{ '/assets/research/neural-rendering/그림6.webp' | relative_url }}" target="_blank" rel="noopener"><img src="{{ '/assets/research/neural-rendering/그림6.webp' | relative_url }}" alt="" loading="lazy"></a>
</div>


### 3. LiDAR-3DGS: LiDAR Reinforcement for Multimodal Initialization of 3D Gaussian Splats

With the rapidly evolving EV industry, we propose physics-informed AI system that can inference battery power usage from a real-time velocity feed. The system is trained on real vehicle log data and can also estimate parameters such as motor efficiency, mass, rolling resistance, aerodynamic drag, and regenerative braking efficiency through data.


<div class="fig-grid">
  <a href="{{ '/assets/research/neural-rendering/080b1e_5804246b91a14967b93b329505fe051c_mv2.webp' | relative_url }}" target="_blank" rel="noopener"><img src="{{ '/assets/research/neural-rendering/080b1e_5804246b91a14967b93b329505fe051c_mv2.webp' | relative_url }}" alt="" loading="lazy"></a>
  <a href="{{ '/assets/research/neural-rendering/080b1e_3ce90bee8cf847739565bb2060d42b3e_mv2.webp' | relative_url }}" target="_blank" rel="noopener"><img src="{{ '/assets/research/neural-rendering/080b1e_3ce90bee8cf847739565bb2060d42b3e_mv2.webp' | relative_url }}" alt="" loading="lazy"></a>
  <a href="{{ '/assets/research/neural-rendering/080b1e_e6d37b482a254c2087982a6a42c4ea80_mv2.webp' | relative_url }}" target="_blank" rel="noopener"><img src="{{ '/assets/research/neural-rendering/080b1e_e6d37b482a254c2087982a6a42c4ea80_mv2.webp' | relative_url }}" alt="" loading="lazy"></a>
</div>


### 4. Data Localization on a Hyper-Realistic Display Model Enabling Remote Assessment: Implementation on a Full-scale Ship Engine

We produce a hyper-realistic digital damage model for use in Structural Health monitoring to provide a comprehensive approach for user-driven input to monitor specific areas of the model by creating 1) a 3D Gaussian Splatting Model (3DGS) – a full-scale super-resolution 3D reconstructed model of the structure for a user to select target inspection regions on global information; 2) a Region-of-Interest (ROI) Locator – extracting many image patches from original images acquired with various view perspectives corresponding to the user selected target inspection regions providing local information.

