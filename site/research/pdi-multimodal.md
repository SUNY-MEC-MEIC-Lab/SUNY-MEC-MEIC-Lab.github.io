---
layout: page
title: PDI & Multimodal AI Group
eyebrow: Research
permalink: /research/pdi-multimodal/
---

Physics-Digital Interaction & Multimoda AI Group

Physics-Digital Interaction & Multimodal AI Group

## Contact

jonathan.boyack@stonybrook.edu  
alfredojavier.valenzuelabustos@stonybrook.edu  
semin.bae@stonybrook.edu  

We develop multimodal fusion pipelines integrating AR, LiDAR, and inertial sensing data, alongside a Distributed Collaborative Remote Diagnostics Metaverse (DCRM) platform. These technologies enable real-time alignment of large-scale physical site dynamics with virtual environments, supporting immersive remote monitoring and collaborative decision-making.


## Mission Statement

“We aim to pioneer the seamless interaction between physical reality and digital environments by integrating Real-time Computer Vision, High-Fidelity 3D Mapping, and Intelligent Robotic Control (ROS). Our mission is to develop an advanced XR-based remote collaboration framework that enables humans to monitor, assess, and interact with physical structures and robotic systems in real-time, bridging the gap between digital twins and autonomous physical agents."


## Research Interest

- LiDAR-RGB Camera Sensor Fusion
- High-Fidelity 3D Map
- Spatial Alignment
- ROS-Based Autonomous Systems
- 6DoF Manipulation & PTZ Sensing
- Physics-Digital Feedback Loops
- Remote XR Collaboration
- Smart Construction & Infrastructure Monitoring


## Detailed Work


### 1. LiDAR-RGB Camera Sensor Fusion

Development of computer power and vision sensors (such as LiDAR, camera), remote visual assessment has been actively developed. We built LiDAR-RGB camera system with extrinsic calibration, 3D printed sensor mount.


<div class="fig-grid fig-single">
  <a href="{{ '/assets/research/pdi-multimodal/HBC_Pic2.webp' | relative_url }}" target="_blank" rel="noopener"><img src="{{ '/assets/research/pdi-multimodal/HBC_Pic2.webp' | relative_url }}" alt="" loading="lazy"></a>
</div>


<div class="video-grid video-single">
  <div class="video-frame"><iframe src="https://www.youtube-nocookie.com/embed/3yvMV7Hh9MQ" title="YouTube video" loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe></div>
</div>


### 2. High-Fidelity 3D Map

Pre-built LiDAR-RGB camera system builds a 3D-colored point cloud map with SLAM (Simultaneous Localization and Mapping). In order to detect any SLAM errors (e.g., Blind Spot), we have developed LiMRSF (LiDAR-MR-RGB Sensor Fusion) system to detect and visualize the errors for high-fidelity 3D maps.


<div class="fig-grid">
  <a href="{{ '/assets/research/pdi-multimodal/MR_blindspot_Figure11.webp' | relative_url }}" target="_blank" rel="noopener"><img src="{{ '/assets/research/pdi-multimodal/MR_blindspot_Figure11.webp' | relative_url }}" alt="" loading="lazy"></a>
  <a href="{{ '/assets/research/pdi-multimodal/HanbeomChang_LiMRSF.webp' | relative_url }}" target="_blank" rel="noopener"><img src="{{ '/assets/research/pdi-multimodal/HanbeomChang_LiMRSF.webp' | relative_url }}" alt="" loading="lazy"></a>
</div>


<div class="video-grid video-single">
  <div class="video-frame"><iframe src="https://www.youtube-nocookie.com/embed/3EbnmCrZffk" title="YouTube video" loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe></div>
</div>


### 3. Spatial Alignment

In order to track each device (e.g., VR, MR) in Virtual space, it is important to align the virtual world to the real world. We have applied Umeyama + ICP algorithm and are trying to apply neural networks to automate the alignment process.


<div class="fig-grid">
  <a href="{{ '/assets/research/pdi-multimodal/080b1e_13e62c78c29c48e1806da66b15eb7ecb_mv2.webp' | relative_url }}" target="_blank" rel="noopener"><img src="{{ '/assets/research/pdi-multimodal/080b1e_13e62c78c29c48e1806da66b15eb7ecb_mv2.webp' | relative_url }}" alt="" loading="lazy"></a>
  <a href="{{ '/assets/research/pdi-multimodal/HBC_Pic5.webp' | relative_url }}" target="_blank" rel="noopener"><img src="{{ '/assets/research/pdi-multimodal/HBC_Pic5.webp' | relative_url }}" alt="" loading="lazy"></a>
</div>


<div class="video-grid video-single">
  <div class="video-frame"><iframe src="https://www.youtube-nocookie.com/embed/8fV65GJ26AA" title="YouTube video" loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe></div>
</div>


### 4. Remote Collaboration

Remote collaboration is important for structural assessment between the field and office engineers. This system reduces the time and cost of travel and easily connects remote engineers with VR and MR headsets.


<div class="fig-grid fig-single">
  <a href="{{ '/assets/research/pdi-multimodal/HBC_Pic6.webp' | relative_url }}" target="_blank" rel="noopener"><img src="{{ '/assets/research/pdi-multimodal/HBC_Pic6.webp' | relative_url }}" alt="" loading="lazy"></a>
</div>


<div class="video-grid video-single">
  <div class="video-frame"><iframe src="https://www.youtube-nocookie.com/embed/yrGOJmk6oGs" title="YouTube video" loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe></div>
</div>


### 5. Remote Visual Sensing

5-1) Pan-Tilt-Zoom Camera System

This work presents a PTZ camera system for remote visual sensing that automatically centers and adjusts the field of view based on the geometric properties of a selected Region of Interest (ROI). By modeling zoom-induced drift with optical-flow–based calibration, the system ensures accurate tracking and framing, validated through experimental metrics like RMS error, standard deviation, and Intersection over Union (IoU).

5-2) 6DoF Robot Arm for Visual Monitoring

This work presents a 6-DoF robotic arm system designed for precise visual monitoring of objects of varying sizes and at different distances. Unlike traditional 2-DoF PTZ systems, the 6-DoF configuration enables greater flexibility in viewpoint selection and camera positioning, allowing the robot to maintain optimal framing and alignment with the Region of Interest (ROI) in complex 3D environments.


<div class="fig-grid">
  <a href="{{ '/assets/research/pdi-multimodal/ptzcamerasystem.webp' | relative_url }}" target="_blank" rel="noopener"><img src="{{ '/assets/research/pdi-multimodal/ptzcamerasystem.webp' | relative_url }}" alt="" loading="lazy"></a>
  <a href="{{ '/assets/research/pdi-multimodal/6dof.webp' | relative_url }}" target="_blank" rel="noopener"><img src="{{ '/assets/research/pdi-multimodal/6dof.webp' | relative_url }}" alt="" loading="lazy"></a>
</div>


<div class="video-grid">
  <div class="video-frame"><iframe src="https://www.youtube-nocookie.com/embed/qGllrwDXY8M" title="YouTube video" loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe></div>
  <div class="video-frame"><iframe src="https://www.youtube-nocookie.com/embed/RzewsfXvwWM" title="YouTube video" loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe></div>
</div>


### 6. Mobile Application Development

6-1) Smart Construction Monitoring

This study presents a mobile application that overlays recent images of construction sites onto mapping APIs like Google Maps to enable real-time, user-guided path planning for unmanned ground vehicles (UGVs). By computing a homographic transformation between captured images and satellite views, the system functions as a dynamic digital twin enhancing inspection accuracy, reducing operational workload, and supporting GPS-based autonomous navigation in evolving environments.


<div class="fig-grid fig-single">
  <a href="{{ '/assets/research/pdi-multimodal/application.webp' | relative_url }}" target="_blank" rel="noopener"><img src="{{ '/assets/research/pdi-multimodal/application.webp' | relative_url }}" alt="" loading="lazy"></a>
</div>


<div class="video-grid video-single">
  <div class="video-frame"><iframe src="https://www.youtube-nocookie.com/embed/Hs_k5SBCqNg" title="YouTube video" loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe></div>
</div>

