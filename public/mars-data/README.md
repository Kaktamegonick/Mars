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

The interactive rover-route line uses published Perseverance mobility
waypoints through sol 960, simplified to every fourth record for rendering.
This covers the three verified camera stops currently included in the app. The
latest mission route and drive distance remain available on NASA's live map.

- https://mars.nasa.gov/maps/location/?mission=M20

## Verified rover-camera archive

The surface selector never substitutes one rover's imagery for another. Each
asset below is linked to the mission archive page that identifies the camera
and rover that captured it:

- `sojourner-sol25.jpg` — Sojourner forward rover camera, sol 25, looking
  west toward the Mars Pathfinder lander.
  https://science.nasa.gov/photojournal/looking-westward-at-the-lander/
- `sojourner-sol25-upscaled.jpg` — an optional deterministic 4× Lanczos upscale
  of the same frame with mild sharpening. It introduces no generated scene
  content, remains labeled as enhanced in the interface, and can be compared
  with the untouched original at any time.
- `spirit-landing-360.jpg` — NASA Photojournal PIA05049, Spirit's first full
  360-degree Panoramic Camera view at the Gusev Crater landing site. The app
  uses the 11,220-pixel-wide official asset rather than the earlier compressed
  navigation-camera preview.
  https://science.nasa.gov/photojournal/mars-in-full-view/
- `opportunity-lion-king.jpg` — Opportunity Pancam “Lion King” panorama,
  assembled from 558 images at Eagle Crater on sols 58–60.
  https://science.nasa.gov/resource/lion-king-panorama/
- `curiosity-landing-360.jpg` — NASA Photojournal PIA16011, Curiosity's
  navigation-camera 360-degree view from Bradbury Landing on sol 2. The local
  file is the 7,719-pixel-wide official JPEG.
  https://science.nasa.gov/photojournal/curiosity-takes-it-all-in/
- `zhurong-landing-360.jpg` — Zhurong navigation and terrain camera panorama
  captured from the Tianwen-1 landing platform before rover deployment.
  https://www.cnsa.gov.cn/n6758824/n6759009/n6760412/n6760413/c6840380/content.html

PrOP-M is included as a historical site without an image. Mars 3 transmitted
for only 14.5 seconds and the rover was never deployed, so no rover-camera
photograph exists.

- https://science.nasa.gov/resource/could-this-be-the-mars-soviet-3-lander/

Sojourner's sol 25 frame remains at its authentic 588 × 141-pixel camera
resolution. NASA notes that the grain is inherent to the rover camera's roughly
3-milliradian-per-pixel angular resolution; the interface therefore avoids
stretching it to the full screen and labels the original size.

Panoramic assets are projected onto a cylindrical camera surface using their
exact usable source aspect ratio. Mission-specific crop values remove only
non-photographic archive borders such as black stitch margins, labels, and
rulers; rover-camera pixels are not regenerated or stretched. Vertical movement
is limited to the real photographed field of view instead of inventing a
synthetic zenith or ground.

## MRO reference orbit

The orange orbital path is an accelerated visual model of Mars Reconnaissance
Orbiter's near-polar science orbit, using NASA's published 255–320 km altitude
range, approximately 92.7-degree inclination, and 112-minute period. It is not
represented as live telemetry or a date-specific ephemeris.

- https://science.nasa.gov/mission/mars-reconnaissance-orbiter/
- https://science.nasa.gov/wp-content/uploads/2024/03/44745_mro-arrival.pdf
