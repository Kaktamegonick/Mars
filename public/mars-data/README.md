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
