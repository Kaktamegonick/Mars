# Mars surface assets

The active MVP uses the global `marsmap1k` imagery and `marsbump1k` relief pair
distributed by the MIT-licensed `threex.planets` project. That project credits
Planet Pixel Emporium, whose planetary maps are assembled from public planetary
mission imagery. The elevation texture is decoded into displaced sphere vertices
at runtime, so raycasting and collision operate on the rendered terrain rather
than on a smooth proxy sphere.

The application labels this global layer as MGS/MOLA-scale data. The layer
manifest in `app/mars/data/MarsDataLoader.ts` reserves HRSC, CTX, and HiRISE tile
slots for higher-resolution Jezero data without changing the navigation API.

Sources:

- https://github.com/jeromeetienne/threex.planets
- http://planetpixelemporium.com/mars.html
- https://astrogeology.usgs.gov/search/map/Mars/GlobalSurveyor/MOLA/Mars_MGS_MOLA_DEM_mosaic_global_463m

## Perseverance surface panorama

`perseverance-airey-hill.jpg` is NASA Photojournal image PIA26080: a 360-degree
natural-color panorama from Airey Hill in Jezero Crater. It was assembled from
993 Mastcam-Z images captured by Perseverance on November 3, 4, and 6, 2023
(sols 962, 963, and 965). Credit: NASA/JPL-Caltech/ASU/MSSS.

- https://science.nasa.gov/photojournal/perseverances-360-degree-view-from-airey-hill/

The verified rover-station layer also includes:

- `perseverance-landing-sol3.jpg` — the first Mastcam-Z 360-degree panorama,
  assembled from 142 images taken at the Octavia E. Butler landing site on sol 3.
  https://science.nasa.gov/photojournal/mastcam-zs-first-360-degree-panorama/
- `perseverance-belva-sol772.jpg` — the 152-image panorama captured from Echo
  Creek on the western rim of Belva Crater on sol 772.
  https://science.nasa.gov/photojournal/perseverance-takes-in-view-at-belva-crater/

Station coordinates are tied to the published Perseverance waypoint layer. The
Belva station uses the sol 770 waypoint occupied through sol 774; the Airey Hill
station uses the final published waypoint reached on sol 960 and occupied while
the panorama sequence began on sol 962.

- https://services.arcgis.com/lqRTrQp2HrfnJt8U/ArcGIS/rest/services/Perseverance_Waypoints/FeatureServer/0

## Verified rover-camera archive

The surface selector never substitutes one rover's imagery for another. Each
asset below is linked to the mission archive page that identifies the camera
and rover that captured it:

- `sojourner-sol25.jpg` — Sojourner forward rover camera, sol 25, looking
  west toward the Mars Pathfinder lander.
  https://science.nasa.gov/photojournal/looking-westward-at-the-lander/
- `spirit-landing.jpg` — Spirit left navigation camera panorama at the Gusev
  Crater landing site.
  https://science.nasa.gov/photojournal/left-panorama-of-spirits-landing-site/
- `opportunity-lion-king.jpg` — Opportunity Pancam “Lion King” panorama,
  assembled from 558 images at Eagle Crater on sols 58–60.
  https://science.nasa.gov/resource/lion-king-panorama/
- `curiosity-landing-360.jpg` — Curiosity navigation-camera 360-degree view
  from Bradbury Landing on sol 2.
  https://science.nasa.gov/resource/curiosity-takes-it-all-in/
- `zhurong-landing-360.jpg` — Zhurong navigation and terrain camera panorama
  captured from the Tianwen-1 landing platform before rover deployment.
  https://www.cnsa.gov.cn/n6758824/n6759009/n6760412/n6760413/c6840380/content.html

PrOP-M is included as a historical site without an image. Mars 3 transmitted
for only 14.5 seconds and the rover was never deployed, so no rover-camera
photograph exists.

- https://science.nasa.gov/resource/could-this-be-the-mars-soviet-3-lander/

## MRO reference orbit

The orange orbital path is an accelerated visual model of Mars Reconnaissance
Orbiter's near-polar science orbit, using NASA's published 255–320 km altitude
range, approximately 92.7-degree inclination, and 112-minute period. It is not
represented as live telemetry or a date-specific ephemeris.

- https://science.nasa.gov/mission/mars-reconnaissance-orbiter/
- https://science.nasa.gov/wp-content/uploads/2024/03/44745_mro-arrival.pdf
