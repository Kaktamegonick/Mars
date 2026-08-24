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
