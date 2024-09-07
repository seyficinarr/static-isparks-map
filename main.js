require([
    "esri/Map",
    "esri/views/MapView",
    "esri/Graphic",
    "esri/layers/GraphicsLayer",
    "esri/widgets/Locate",
    "esri/layers/GeoJSONLayer",
    "esri/geometry/Point",
    "esri/geometry/geometryEngine",
    "esri/geometry/support/webMercatorUtils",
    "esri/symbols/PictureMarkerSymbol",
], function (Map, MapView, Graphic, GraphicsLayer, Locate, GeoJSONLayer, Point, geometryEngine, webMercatorUtils, PictureMarkerSymbol) {


    let isparks_data = [];
    let isparks = [];
    // Fetch the JSON file and handle data
    async function fetchIsparkData() {
        await updateCurrentLocation();
        try {
            const response = await fetch('https://api.ibb.gov.tr/ispark/Park');
            isparks_data = await response.json();
            isparks = isparks_data;

            // Once data is fetched, call any functions that depend on it here
            addGraphics(); // Call your function that relies on isparks_data here
            populatedistrictDropdown();
        } catch (error) {
            console.error('Error loading data:', error);
        }


    }
    fetchIsparkData();

    // Create the map and view
    const map = new Map({
        basemap: "dark-gray"
    });

    const view = new MapView({
        container: "viewDiv",
        map: map,
        center: [28.9754, 41.0082],
        zoom: 12
    });

    const graphicsLayer = new GraphicsLayer();
    map.add(graphicsLayer);

    let allGraphics = [];
    let currentLatitude = null;
    let currentLongitude = null;
    let highlightDistrict = true;

    getCurrentLocation((lat, lng) => {
        if (lat !== null && lng !== null) {
            currentLatitude = lat;
            currentLongitude = lng;
        }
    });

    function addGraphics() {
        allGraphics.forEach(graphic => graphicsLayer.remove(graphic));
        graphicsLayer.removeAll();
        allGraphics = []; // Bu satır, önceki grafikleri temizlemek için gerekli

        let count = 0;
        isparks.forEach((ispark, index) => {
            const point = {
                type: "point",
                longitude: ispark.lng,
                latitude: ispark.lat
            };

            const pointGraphic = new Graphic({
                geometry: point,
                symbol: {
                    type: "simple-marker",
                    color: selectColor(ispark.parkID),
                    size: 8
                },
                attributes: {
                    id: ispark.parkID,
                    name: ispark.parkName,
                    description: ispark.parkType,
                    district: ispark.district,
                    lat: ispark.lat,
                    lon: ispark.lng,
                    distance: getDistance(currentLatitude, currentLongitude, ispark.lat, ispark.lng),
                    distance2: getDistance(currentLatitude, currentLongitude, ispark.lat, ispark.lng).toFixed(2),
                },
                popupTemplate: {
                    title: "{name}",
                    content: `
                    <b>Distance:</b> {distance2} kilometers away<br>
                    <b>Park Type:</b> {description}<br>
                    <b>District:</b> {district}<br>
                    <a href="https://www.google.com/maps?q={lat},{lon}" target="_blank">Get Direction</a>
                `
                }
            });

            graphicsLayer.add(pointGraphic);
            allGraphics.push(pointGraphic);
            count++;
        });

        document.getElementById('info').innerHTML = `<p><strong>Number of isparks found:</strong> ${count}</p>`;
    }



    document.getElementById("closestIsparkButton").addEventListener("click", getClosestIspark);
    document.getElementById("showAllIsparks").addEventListener("click", showAllIsparks);

    document.getElementById('toggleMapExplainer').addEventListener('click', function () {
        const mapExplainer = document.getElementById('map_explainer');
        mapExplainer.classList.toggle('collapsed');
    });

    document.getElementById('highlightToggle').addEventListener('change', function (event) {
        highlightDistrict = event.target.checked;
    });


    // function getClosestIspark() {
    //     let distance = Infinity;
    //     let closestIspark = null;

    //     isparks.forEach(ispark => {
    //         const isparkLat = ispark.lat;
    //         const isparkLng = ispark.lng;
    //         const currentDistance = getDistance(isparkLat, isparkLng, currentLatitude, currentLongitude);
    //         if (currentDistance < distance) {
    //             closestIspark = ispark;
    //             distance = currentDistance;
    //         }
    //     });
    //     const point = new Point({
    //         longitude: closestIspark.lng,
    //         latitude: closestIspark.lat
    //     });

    //     // Create a Graphic for the marker
    //     const markerSymbol = {
    //         type: "picture-marker",
    //         url: "https://maps.google.com/mapfiles/ms/icons/yellow-dot.png",
    //         width: "48px",
    //         height: "48px",
    //         anchor: "bottom",
    //         yoffset: 20
    //     };

    //     const pointGraphic = new Graphic({
    //         geometry: point,
    //         symbol: markerSymbol,
    //         attributes: {
    //             id: closestIspark.parkID,
    //         },
    //         popupTemplate: {
    //             title: "Closest Ispark",
    //             content: `
    //             <b>Name:</b> ${closestIspark.parkName}<br>
    //             <b>Distance:</b> ${distance} kilometers away<br>
    //             <b>Park Type:</b> ${closestIspark.parkType}<br>
    //             <b>District:</b> ${closestIspark.district}<br>
    //             <a href="http://127.0.0.1:5000/ispark/${closestIspark.parkId}" target="_blank">Detailed Information</a><br>
    //             <a href="https://www.google.com/maps?q={closestIspark.lat},{closestIspark.lng}" target="_blank">Get Direction</a>
    //         `
    //         }
    //     });

    //     // Add the marker Graphic to the GraphicsLayer
    //     graphicsLayer.add(pointGraphic);
    //     view.center = [closestIspark.lng, closestIspark.lat];
    //     view.zoom = [14];
    // }

    function getClosestIspark() {
        let distance = Infinity;
        let closestIspark = null;
        let count = 0;
        allGraphics.forEach(ispark => {
            count++;
            const currentDistance = ispark.attributes.distance;
            
            if (currentDistance < distance) {
                closestIspark = ispark;
                distance = currentDistance;
            }

        });
        // Check if a closest Ispark was found
        if (closestIspark) {
            const point = new Point({
                longitude: closestIspark.attributes.lon, // Use 'lon' for longitude
                latitude: closestIspark.attributes.lat // Use 'lat' for latitude
            });

            // Create a Graphic for the marker
            const markerSymbol = {
                type: "picture-marker",
                url: "https://maps.google.com/mapfiles/ms/icons/yellow-dot.png",
                width: "48px",
                height: "48px",
                anchor: "bottom",
                yoffset: 20
            };

            const pointGraphic = new Graphic({
                geometry: point,
                symbol: markerSymbol,
                attributes: {
                    id: closestIspark.attributes.id,
                },
                popupTemplate: {
                    title: "Closest Ispark",
                    content: `
                <b>Name:</b> ${closestIspark.attributes.name}<br>
                <b>Distance:</b> ${distance} kilometers away<br>
                <b>Park Type:</b> ${closestIspark.attributes.description}<br>
                <b>District:</b> ${closestIspark.attributes.district}<br>
                <a href="http://127.0.0.1:5000/ispark/${closestIspark.attributes.id}" target="_blank">Detailed Information</a><br>
                <a href="https://www.google.com/maps?q=${closestIspark.attributes.lat},${closestIspark.attributes.lon}" target="_blank">Get Direction</a>
            `
                }
            });

            // Add the marker Graphic to the GraphicsLayer
            graphicsLayer.add(pointGraphic);
            view.center = [closestIspark.attributes.lon, closestIspark.attributes.lat]; // Use 'lon' and 'lat'
            view.zoom = 14; // Set zoom level (not in an array)
        } else {
            console.warn("No Ispark found.");
        }
    }


    // function haversineDistance(lat1, lon1, lat2, lon2) {
    //     const R = 6371; // Radius of Earth in kilometers
    //     const dLat = toRad(lat2 - lat1);
    //     const dLon = toRad(lon2 - lon1);
    //     const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    //         Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    //         Math.sin(dLon / 2) * Math.sin(dLon / 2);
    //     const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    //     return R * c; // Distance in kilometers
    // }

    function toRad(degrees) {
        return degrees * (Math.PI / 180);
    }

    function normalizeString(str) {
        // Replace Turkish-specific characters
        return str
            .replace(/ç/g, 'c')
            .replace(/Ç/g, 'C')
            .replace(/ı/g, 'i')
            .replace(/İ/g, 'I')
            .replace(/ğ/g, 'g')
            .replace(/Ğ/g, 'G')
            .replace(/ö/g, 'o')
            .replace(/Ö/g, 'O')
            .replace(/ş/g, 's')
            .replace(/Ş/g, 'S')
            .replace(/ü/g, 'u')
            .replace(/Ü/g, 'U')
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, ''); // Remove diacritical marks
    }

    function populatedistrictDropdown() {
        const districts = Array.from(new Set(isparks.map(ispark => ispark.district)));
        const select = document.getElementById('districtFilter');
        select.innerHTML = '';

        districts.forEach(district => {
            const option = document.createElement('option');
            option.value = district;
            option.textContent = district;
            select.appendChild(option);
        });
    }


    function showAllIsparks() {
        let count = 0;
        for (const graph of allGraphics) {
            graph.visible = true;
            count++;
        }

        document.getElementById("info").innerHTML = `<p>Search for all isparks.</p>`;
        document.getElementById("info").innerHTML += `<p><strong>Number of isparks found:</strong> ${count}</p>`;
    }

    function filterBydistricts(selecteddistricts) {
        let count = 0;

        for (const graph of allGraphics) {
            const district = normalizeString(graph.attributes.district);
            if (selecteddistricts.some(selecteddistrict =>
                normalizeString(selecteddistrict).toLowerCase().includes(district.toLowerCase())
            )) {
                graph.visible = true;
                count++;
            } else {
                graph.visible = false;
            }
        }

        // Display the total count of isparks found
        document.getElementById("info").innerHTML = `<p>Search for selected areas</p>`;
        document.getElementById("info").innerHTML += `<p><strong>Number of isparks found:</strong> ${count}</p>`;

    }

    function filterBySingledistrict(districtName) {
        const normalizeddistrictName = normalizeString(districtName);
        let count = 0;
        allGraphics.forEach(graphic => {
            const district = normalizeString(graphic.attributes.district);
            if (district.toLowerCase().includes(normalizeddistrictName.toLowerCase())) {
                count++;
                graphic.visible = true; // Show the graphic if it matches
            } else {
                graphic.visible = false; // Hide the graphic if it doesn't match
            }
        });

        districtName = districtName.substring(0, 1).toUpperCase() + districtName.substring(1);
        document.getElementById('info').innerHTML = `<p><strong>Selected district is:</strong> ${districtName}</p>`;
        document.getElementById('info').innerHTML += `<p><strong>Number of isparks found:</strong> ${count}</p>`;
    }

    document.getElementById('districtFilter').addEventListener('change', function (event) {
        const selectedOptions = Array.from(event.target.selectedOptions).map(option => option.value);
        filterBydistricts(selectedOptions);
    });

    document.getElementById('singledistrictFilter').addEventListener('input', function (event) {
        const districtName = event.target.value;
        filterBySingledistrict(districtName);
    });

    document.getElementById('toggleFilter').addEventListener('click', function () {
        const filterDiv = document.getElementById('filterDiv');
        filterDiv.classList.toggle('collapsed');
    });

    document.getElementById('toggleSecondFilter').addEventListener('click', function () {
        const filterDiv = document.getElementById('filterSecondDiv');
        filterDiv.classList.toggle('collapsed');
    });

    document.getElementById('toggleInfoPart').addEventListener('click', function () {
        const filterDiv = document.getElementById('infoPart');
        filterDiv.classList.toggle('collapsed');
    });

    const locateWidget = new Locate({
        view: view,
        rotationEnabled: true
    });

    view.ui.add(locateWidget, "top-right");

    view.when(() => {
        locateWidget.locate(); // Programmatically trigger locate
    });

    locateWidget.on("locate", function (event) {
        // currentLatitude = event.position.coords.latitude;
        // currentLongitude = event.position.coords.longitude;
        view.zoom = 9.75;
    });

    // Add GeoJSON Layer
    const geojsonUrl = "https://raw.githubusercontent.com/seyficinarr/Map_Project/main/static/istanbul.json";

    const districtLayer = new GeoJSONLayer({

        url: geojsonUrl,
        renderer: {
            type: "simple",
            symbol: {
                type: "simple-fill",
                color: [0, 0, 0, 0], // Transparent fill color
                outline: {
                    color: "orange", // Color of the boundary lines
                    width: 1 // Width of the boundary lines
                }
            }
        }
    });

    fetch(geojsonUrl)
        .then(response => response.json())
        .then(data => {
            geojsonData = data;
        }
        )

    map.add(districtLayer);

    view.whenLayerView(districtLayer).then(function (layerView) {
        let highlight;
        let debounceTimeout;

        view.on("pointer-move", function (event) {
            // Clear the previous timeout if it exists
            if (debounceTimeout) {
                clearTimeout(debounceTimeout);
            }

            debounceTimeout = setTimeout(function () {
                const screenPoint = { x: event.x, y: event.y };
                view.hitTest(screenPoint).then(function (response) {
                    if (highlight) {
                        highlight.remove(); // Remove previous highlight
                    }
                    if (highlightDistrict) {
                        const feature = response.results.find(result => result.graphic.layer === districtLayer);
                        // Check if feature is found and log the result
                        if (feature) {

                            highlight = layerView.highlight(feature.graphic);

                            const id = feature.graphic.attributes.__OBJECTID;

                            ftr = getFeatureById(id);
                            let districtName = ftr.properties.name.toLowerCase();
                            districtName = districtName.toString();
                            districtName = districtName === "eyüpsultan" ? "eyüp" : districtName;
                            filterBySingledistrict(districtName);
                        } else {
                            showAllIsparks();
                            layerView.highlight([]);
                        }
                    }

                }).catch(function (error) {
                    // Handle errors in hitTest
                    console.error("Error in hitTest:", error);
                });
            }, 100); // Adjust debounce delay if needed
        });

    });

    view.on("click", function (event) {
        view.hitTest(event).then(function (response) {
            const graphic = response.results.find(result => result.graphic.layer === graphicsLayer);
            if (graphic) {
                const parkId = graphic.graphic.attributes.id;
                showIsparkInfo(parkId);
            }
        });
    });

    function defineIsparkStatus(id) {
        // Check if isparks_data is populated
        if (isparks_data.length === 0) {
            console.warn('isparks_data is not yet loaded.');
            return; // Or handle the case when data is not yet loaded
        }

        const ispark = isparks_data.find(result => result.parkID == id);


        if (ispark) {
            if (ispark.isOpen && ispark.emptyCapacity > 0) {
                return 2;
            } else if (ispark.emptyCapacity == 0) {
                return 1;
            } else {
                return 0;
            }
        } else {
            console.warn('No ispark found with ID:', id);
            return -1; // Handle the case where no ispark is found
        }
    }

    function selectColor(id) {
        if (defineIsparkStatus(id) == 2) {
            return "green";
        } else if (defineIsparkStatus(id) == 1) {
            return "red";
        } else if (defineIsparkStatus(id) == 0) {
            return "purple";
        } else {
            return "white";
        }
    }

    function getDistance(lat1, lng1, lat2, lng2) {

        const point1 = new Point({
            longitude: lng1,  // Longitude of the first point
            latitude: lat1,    // Latitude of the first point
            spatialReference: { wkid: 4326 }  // WGS84 spatial reference
        })

        const point2 = new Point({
            longitude: lng2,  // Longitude of the first point
            latitude: lat2,    // Latitude of the first point
            spatialReference: { wkid: 4326 }  // WGS84 spatial reference
        })




        const webMercatorPoint1 = webMercatorUtils.geographicToWebMercator(point1);
        const webMercatorPoint2 = webMercatorUtils.geographicToWebMercator(point2);

        const distance = geometryEngine.distance(webMercatorPoint1, webMercatorPoint2, "kilometers");
        // const formattedValue = distance.toFixed(2);
        return distance;
    }

    function getCurrentLocation(callback) {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const lat = position.coords.latitude;
                    const lon = position.coords.longitude;
                    callback(lat, lon);
                },
                (error) => {
                    console.error('Error getting location:', error);
                    callback(null, null);
                }
            );
        } else {
            console.error('Geolocation is not supported by this browser.');
            callback(null, null);
        }
    }

    function getFeatureById(id) {
        return geojsonData.features.find(feature => feature.id === id);
    }

    function showIsparkInfo(id) {
        // Fetch details of the selected ispark
        fetch(`https://api.ibb.gov.tr/ispark/ParkDetay?id=${id}`)
            .then(response => {
                if (!response.ok) {
                    throw new Error('Network response was not ok ' + response.statusText);
                }
                return response.json(); // Parse JSON data from the response
            })
            .then(data => {
                const detail = data[0]; // Get the first detail object

                // Find the ispark data from the previously fetched data
                const ispark = isparks_data.find(result => result.parkID == id);

                if (ispark && detail) {
                    const isOpen = ispark.isOpen;
                    const updateDate = detail.updateDate;
                    const name = ispark.parkName;
                    const capacity = ispark.capacity;
                    const emptyCapacity = ispark.emptyCapacity;
                    const workHours = ispark.workHours;
                    const district = ispark.district;
                    const distance = getDistance(ispark.lat, ispark.lng, currentLatitude, currentLongitude);
                    const distance2 = distance.toFixed(2);
                    // Update the HTML with the fetched details
                    document.getElementById("isparkName").innerHTML = name;
                    document.getElementById("isparkDistrict").innerHTML = district;
                    document.getElementById("isparkWorkHours").innerHTML = workHours;
                    document.getElementById("isparkStatus").innerHTML = isOpen ? "Open" : "Closed";
                    document.getElementById("isparkEmptyCapacity").innerHTML = emptyCapacity + "/" + capacity;
                    document.getElementById("isparkUpdateDate").innerHTML = updateDate;
                    document.getElementById("isparkDistance").innerHTML = distance2 + " km away";
                    document.getElementById("isparkGetDirection").innerHTML = `<a href="https://www.google.com/maps?q=${ispark.lat},${ispark.lng}" target="_blank">Get Direction</a>`;

                    // Display the ispark info
                    document.getElementById("isparkInfo").style.display = 'block';
                }
                else {
                    document.getElementById("isparkName").innerHTML = "None";
                    document.getElementById("isparkDistrict").innerHTML = "None";
                    document.getElementById("isparkWorkHours").innerHTML = "None";
                    document.getElementById("isparkStatus").innerHTML = "None";
                    document.getElementById("isparkEmptyCapacity").innerHTML = "None";
                    document.getElementById("isparkUpdateDate").innerHTML = "None";
                    document.getElementById("isparkDistance").innerHTML = "None";
                    document.getElementById("isparkGetDirection").innerHTML = "None";

                    // Display the ispark info
                    document.getElementById("isparkInfo").style.display = 'block';

                }
            })
            .catch(error => {
                console.error('Error fetching ispark details:', error);
            });
    }


    function updateCurrentLocation() {
        return new Promise((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    // currentLatitude = position.coords.latitude;
                    // currentLongitude = position.coords.longitude;
                    resolve();
                },
                (error) => {
                    reject(error);
                }
            );
        });
    }

    document.getElementById('distanceRange').addEventListener('input', function (event) {
        const value = event.target.value;
        const max = event.target.max;
        const percent = (value / max) * 100;
        event.target.style.setProperty('--value', `${percent}%`);
        document.getElementById('distanceValue').textContent = `${value} km`;
        filterByDistance(value);
    });

    // Initial value setup
    const initialValue = document.getElementById('distanceRange').value;
    const initialMax = document.getElementById('distanceRange').max;
    const initialPercent = (initialValue / initialMax) * 100;
    document.getElementById('distanceRange').style.setProperty('--value', `${initialPercent}%`);

    function filterByDistance(maxDistance) {
        let count = 0;

        allGraphics.forEach(graphic => {
            const isparkLat = graphic.geometry.latitude;
            const isparkLng = graphic.geometry.longitude;
            const distance = getDistance(currentLatitude, currentLongitude, isparkLat, isparkLng);

            if (distance  <= maxDistance ) {
                graphic.visible = true;
                count++;
            } else {
                graphic.visible = false;
            }
        });

        document.getElementById('info').innerHTML = `<p><strong>Number of isparks within ${maxDistance} km:</strong> ${count}</p>`;
    }


    function filterOpenIsparks() {

        const openFilter = document.getElementById("filterOpens").checked;
        let count = 0;


        allGraphics.forEach(graphic => {
            const color = graphic.symbol.color;

            if (openFilter) {
                if (color.r != 128) {
                    graphic.visible = true;
                    count++;
                } else {
                    graphic.visible = false;
                }
            }
            else {
                if (color.r == 128) {
                    graphic.visible = true;
                    count++;
                } else {
                    graphic.visible = false;
                }
            }

        });




        if (openFilter) {
            document.getElementById("info").innerHTML = `<p><strong>Search for open isparks:</strong> ${count}</p>`;
        }
        else {
            document.getElementById("info").innerHTML = `<p><strong>Search for closed isparks:</strong> ${count}</p>`;
        }

    }

    document.getElementById('filterOpens').addEventListener('change', filterOpenIsparks);

    function filterAvailableIsparks() {

        const availableFilter = document.getElementById("filterAvailables").checked;
        let count = 0;


        allGraphics.forEach(graphic => {
            const color = graphic.symbol.color;

            if (availableFilter) {
                if (color.g == 128) {
                    graphic.visible = true;
                    count++;
                } else {
                    graphic.visible = false;
                }
            }
            else {
                if (color.g != 128) {
                    graphic.visible = true;
                    count++;
                } else {
                    graphic.visible = false;
                }
            }

        });




        if (availableFilter) {
            document.getElementById("info").innerHTML = `<p><strong>Search for available isparks:</strong> ${count}</p>`;
        }
        else {
            document.getElementById("info").innerHTML = `<p><strong>Search for non-available isparks:</strong> ${count}</p>`;
        }

    }

    document.getElementById('filterAvailables').addEventListener('change', filterAvailableIsparks);

    document.getElementById("toggleDatasetLinks").addEventListener("click", function () {
        const datasetLinks = document.getElementById("datasetLinks");

        if (datasetLinks.classList.contains("collapsed")) {
            datasetLinks.classList.remove("collapsed");
            datasetLinks.style.opacity = '1'; // Restore opacity when expanded
        } else {
            datasetLinks.classList.add("collapsed");
            datasetLinks.style.opacity = '0.5'; // Reduce opacity when collapsed
        }
    });

    document.getElementById("closeDatasetLinks").addEventListener("click", function () {
        const datasetLinks = document.getElementById("datasetLinks");
        datasetLinks.classList.add("collapsed"); // Collapse the section
        datasetLinks.style.opacity = '0.5'; // Reduce opacity when collapsed
    });


});