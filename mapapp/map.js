const RADIUS_AT_EQUATOR = 6378137;
const RADIUS_AT_POLE = 6356752.3;
let map, infoWindow, geocoder, elevator;
let placesService = null;
let currentModal = null;

let markers = [];
let lines = [];

async function initMap() {
  const currentLocation = await getCurrentLocation();
  infoWindow = new google.maps.InfoWindow();
  geocoder = new google.maps.Geocoder();
  elevator = new google.maps.ElevationService();
  map = new google.maps.Map(document.getElementById("map"), {
    center: currentLocation,
    zoom: 11,
    disableDefaultUI: true,
  });
  placesService = new google.maps.places.PlacesService(map);

  $("#toast").toast({ autohide: false });

  //Enable buttons
  document.getElementById("show-city-menu-button").disabled = false;
  document.getElementById("nearest-city-menu-button").disabled = false;
  document.getElementById("earth-center-menu-button").disabled = false;

  //Clear inputs
  // document.getElementById("lat-input").value = "";
  // document.getElementById("lng-input").value = "";
}

function handleModalOKClick() {
  if (currentModal === "show-city") {
    handleShowCity();
  } else if (currentModal === "show-distance") {
    handleEarthCenter();
  }
}

/**
 * Display the "Use current location button" for show distance to earth's core option
 */
function handleShowModal(modalName) {
  currentModal = modalName;
  if (currentModal === "show-city") {
    document.getElementById("current-location-button").style.display = "none";
  } else {
    document.getElementById("current-location-button").style.display = "block";
  }
  $("#modal").modal("show");
}

/**
 * Shows the city with coordinates given in the input fields
 */
async function handleShowCity() {
  clearErrors();
  const lat = document.getElementById("lat-input").value;
  const lng = document.getElementById("lng-input").value;
  let message = verifyCoordinates(lat, lng);

  if (message.length > 0) {
    document
      .getElementsByClassName("modal-body")[0]
      .appendChild(getErrorMessage(message));
    return;
  }
  //Successful inputs
  toggleLoading();
  clearMap();
  const location = { lat: parseFloat(lat), lng: parseFloat(lng) };
  try {
    const city = await getCityCenterByLatLng(location);
    // Add a marker to entered location
    addMarker(location);

    // Show which city you are in with a toast
    if (city != null) {
      showToast("You are in " + city.formatted_address.split(",")[0]);
      infoWindow.setPosition(city.geometry.location);
      infoWindow.setContent("Center of " + city.formatted_address);
      infoWindow.open(map);
    } else {
      showToast("No such city");
    }

    //Configure map position
    map.setZoom(11);
    map.setCenter(location);

    $("#modal").modal("hide");
  } catch (error) {
    showToast(error);
  } finally {
    toggleLoading();
  }
}

async function handleNearestCity() {
  toggleLoading();
  clearMap();
  try {
    const location = await getCurrentLocation();
    const nearestCity = await getNearestCityByLatLng(location);

    // Add a marker to current location
    addMarker(location);
    // Add a marker to nearest city
    addMarker(nearestCity.geometry.location);
    // Add a line to between markers
    addLine([location, nearestCity.geometry.location]);

    showToast(
      "You are " +
        (
          google.maps.geometry.spherical.computeDistanceBetween(
            new google.maps.LatLng(location),
            nearestCity.geometry.location
          ) / 1000
        ).toFixed(2) +
        " km away from " +
        nearestCity.name
    );

    // Configure map position
    map.setZoom(11);
    map.setCenter(location);
  } catch (error) {
    showToast(error);
  } finally {
    toggleLoading();
  }
}

/**
 * Shows the distance to the earth's core
 */
async function handleEarthCenter() {
  clearErrors();
  const lat = document.getElementById("lat-input").value;
  const lng = document.getElementById("lng-input").value;
  let message = verifyCoordinates(lat, lng);

  if (message.length > 0) {
    document
      .getElementsByClassName("modal-body")[0]
      .appendChild(getErrorMessage(message));
    return;
  }
  //Successful inputs
  toggleLoading();
  clearMap();
  try {
    const location = { lat: parseFloat(lat), lng: parseFloat(lng) };

    //Set marker on current location
    addMarker(location);

    const distance = await calculateEarthRadiusByLat(location);

    // Configure map position
    map.setCenter(location);

    //Compute distance
    showToast("You are " + distance + " km away from the earth center");
    $("#modal").modal("hide");
  } catch (error) {
    showToast(error);
  } finally {
    toggleLoading();
  }
}

async function handleUseCurrentLocation() {
  const currentLocation = await getCurrentLocation();
  document.getElementById("lat-input").value = currentLocation.lat;
  document.getElementById("lng-input").value = currentLocation.lng;
}

/**
 * Formula for the calculation
 * latitude B, radius R, radius at equator r1, radius at pole r2
 * @param {lat: number, lng: number} location
 */
async function calculateEarthRadiusByLat(location) {
  const heightAboveSeaLevel = await getElevationByLatLng(location);
  const x = location.lat * (Math.PI / 180);
  const z = Math.sqrt(
    (Math.pow(RADIUS_AT_EQUATOR * RADIUS_AT_EQUATOR * Math.cos(x), 2) +
      Math.pow(RADIUS_AT_POLE * RADIUS_AT_POLE * Math.sin(x), 2)) /
      (Math.pow(RADIUS_AT_EQUATOR * Math.cos(x), 2) +
        Math.pow(RADIUS_AT_POLE * Math.sin(x), 2))
  );
  let earthRadius = z + heightAboveSeaLevel;
  earthRadius = Math.round(earthRadius) / 1000; //Convert to km
  return earthRadius;
}

function getNearestCityByLatLng(location) {
  return new Promise((res, rej) => {
    placesService.nearbySearch(
      {
        location,
        radius: "50000",
      },
      (results, status) => {
        if (status == google.maps.places.PlacesServiceStatus.OK) {
          // Filter cities
          const cities = results.filter((result) => {
            return (
              result.hasOwnProperty("types") &&
              result.types.includes("locality")
            );
          });
          //Sort by distance
          cities.sort(
            (c1, c2) =>
              google.maps.geometry.spherical.computeDistanceBetween(
                c1.geometry.location,
                new google.maps.LatLng(location)
              ) -
              google.maps.geometry.spherical.computeDistanceBetween(
                c2.geometry.location,
                new google.maps.LatLng(location)
              )
          );
          res(cities[0]);
        } else {
          rej(status);
        }
      }
    );
  });
}

async function getElevationByLatLng(location) {
  return new Promise((resolve, reject) => {
    elevator.getElevationForLocations(
      {
        locations: [location],
      },
      function (results, status) {
        if (status === "OK") {
          // Retrieve the first result
          if (results[0]) {
            resolve(results[0].elevation);
          } else {
            reject("No results found");
          }
        } else {
          reject("Elevation service failed due to: " + status);
        }
      }
    );
  });
}

/**
 * Returns the city name which the given coordinates are in
 * Coordinates of the city returned by the geocoder does not give the
 * coordinates to the city center, see getCityCenterByLatLng()
 * @param {lat: number, lng: number} location
 */
function getCityByLatLng(location) {
  return new Promise((res, rej) => {
    geocoder.geocode({ location }, function (results, status) {
      if (status == "OK") {
        console.log(results);
        // Find the city among the results
        const city = results.find((result) => {
          return (
            result.hasOwnProperty("types") &&
            result.types.includes("administrative_area_level_1")
          );
        });
        // Show which city you are in with a toast
        if (city != null) {
          res(city.formatted_address.split(",")[0]);
        } else {
          rej("Given coordinates are not in a city");
        }
      } else {
        rej("Geocode was not successful for the following reason: " + status);
      }
    });
  });
}

/**
 * Returns the city center which the given coordinates are in
 * Returns GeocoderResult
 * @param {lat: number, lng: number} location
 */
async function getCityCenterByLatLng(location) {
  const cityName = await getCityByLatLng(location);
  return new Promise((res, rej) => {
    geocoder.geocode({ address: cityName }, function (results, status) {
      if (status === "OK") {
        console.log(results);
        if (results.length === 0) {
          rej("No city center near the given coordinates");
        } else {
          res(results[0]);
        }
      } else {
        rej("Geocode was not successful for the following reason: " + status);
      }
    });
  });
}

function verifyCoordinates(lat, lng) {
  let message = "";

  if (lat.length === 0) {
    message = "Latitude cannot be empty";
  } else if (lng.length === 0) {
    message = "Longitude cannot be empty";
  } else if (!lat.match("^[0-9.-]+$")) {
    message = "Invalid character in latitude";
  } else if (!lng.match("^[0-9.-]+$")) {
    message = "Invalid character in latitude";
  } else if (parseFloat(lat) >= 90 || parseFloat(lat) <= -90)
    message = "Latitude should be in the interval -90,90";
  else if (parseFloat(lng) >= 180 || parseFloat(lng) <= -180)
    message = "Longitude should be in the interval -90,90";

  return message;
}

/**
 * Adds a marker to the map and also adds it to a an array for removal later
 * @param {lat: number, lng: number} position
 */
function addMarker(position) {
  const marker = new google.maps.Marker({
    map,
    position,
  });
  marker.setMap(map);
  markers.push(marker);
}

/**
 * Adds a line to the map and also adds it to a an array for removal later
 * @param {[{lat: number, lng: number}]} path
 */
function addLine(path) {
  const flightPath = new google.maps.Polyline({
    path,
    geodesic: true,
    strokeColor: "#FF0000",
    strokeOpacity: 1.0,
    strokeWeight: 2,
  });
  lines.push(flightPath);
  flightPath.setMap(map);
}

/**
 * Removes all markers and lines from the map
 */
function clearMap() {
  infoWindow.close();
  markers.map((marker) => marker.setMap(null));
  lines.map((line) => line.setMap(null));
  markers = [];
  lines = [];
}

async function getCurrentLocation() {
  const { coords } = await getPosition();
  return { lat: coords.latitude, lng: coords.longitude };
}

/**
 * Promise wrapper for Geolocation API
 */
function getPosition() {
  return new Promise((res, rej) => {
    navigator.geolocation.getCurrentPosition(res, ({ code }) => {
      // Hide loading in case it is active but user denied geolocation request
      if (code === 1) {
        document.getElementsByClassName("button-container")[0].style.display =
          "flex";
        document.getElementById("spinner").style.display = "none";
      }
    });
  });
}

/**
 * Returns a div with the alert message
 * @param {string} message
 */
function getErrorMessage(message) {
  const errorMessage = document.createElement("div");
  errorMessage.id = "error-message";
  errorMessage.className = "alert alert-danger";
  errorMessage.innerText = message;
  return errorMessage;
}

/**
 * Clears the error message from the modal
 */
function clearErrors() {
  if (document.getElementById("error-message")) {
    document.getElementById("error-message").remove();
  }
}

/**
 * Displays a toast with the message
 * @param {string} message
 */
function showToast(message) {
  document.getElementsByClassName("toast-body")[0].textContent = message;
  $("#toast").toast("show");
}

function hideToast() {
  $("#toast").toast("dispose");
}

//Hide and show loading spinner
function toggleLoading() {
  if (
    document.getElementsByClassName("button-container")[0].style.display ===
    "none"
  ) {
    document.getElementsByClassName("button-container")[0].style.display =
      "flex";
    document.getElementById("spinner").style.display = "none";
  } else {
    document.getElementsByClassName("button-container")[0].style.display =
      "none";
    document.getElementById("spinner").style.display = "flex";
  }
}

function handleLocationError(browserHasGeolocation, infoWindow, pos) {
  infoWindow.setPosition(pos);
  infoWindow.setContent(
    browserHasGeolocation
      ? "Error: The Geolocation service failed."
      : "Error: Your browser doesn't support geolocation."
  );
  infoWindow.open(map);
}
