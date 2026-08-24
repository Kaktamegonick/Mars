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
