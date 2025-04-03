const weatherApiKey = "ed53506cc302404f849120729252403"; // Weather API Key
const geoApiKey = "fe043084a1f54a83bb0763499096a163"; // OpenCage API Key
let weatherChart;

document.getElementById("searchBtn").addEventListener("click", () => {
  const query = document.getElementById("cityInput").value.trim();
  if (!query) return alert("Enter a city or pincode.");
  
  document.getElementById("weatherResult").innerHTML = "<p class='text-info'>Fetching weather...</p>";

  if (/^\d{4,6}$/.test(query)) {
    getCityFromPincode(query);
  } else {
    getWeather(query);
  }
});

document.getElementById("locationBtn").addEventListener("click", () => {
  const locationBtn = document.getElementById("locationBtn");
  const originalBtnText = locationBtn.innerHTML;
  
  // Show loading state
  locationBtn.disabled = true;
  locationBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Getting Location...';
  
  // Check if geolocation is supported
  if (!navigator.geolocation) {
    locationBtn.innerHTML = originalBtnText;
    locationBtn.disabled = false;
    alert("Geolocation is not supported by your browser. Please enter your city manually.");
    return;
  }

  // Try to get location with high accuracy first
  const locationOptions = {
    enableHighAccuracy: true,
    timeout: 15000,        // 15 seconds timeout
    maximumAge: 0          // Always get fresh location
  };

  // First attempt with high accuracy
  navigator.geolocation.getCurrentPosition(
    // Success callback
    handleLocationSuccess,
    // Error callback
    (error) => {
      console.log("High accuracy location failed, trying with lower accuracy");
      
      // If high accuracy fails, try with lower accuracy
      const lowAccuracyOptions = {
        enableHighAccuracy: false,
        timeout: 10000,
        maximumAge: 0
      };
      
      navigator.geolocation.getCurrentPosition(
        handleLocationSuccess,
        handleLocationError,
        lowAccuracyOptions
      );
    },
    locationOptions
  );
  
  // Function to handle successful location
  async function handleLocationSuccess(position) {
    try {
      const { latitude, longitude } = position.coords;
      
      // Show that we have coordinates
      locationBtn.innerHTML = '<i class="fas fa-map-marker-alt"></i> Location Found';
      
      // Try to get weather data using coordinates
      try {
        const weatherResponse = await fetch(`https://api.weatherapi.com/v1/forecast.json?key=${weatherApiKey}&q=${latitude},${longitude}&days=10&aqi=yes&alerts=yes&hourly=1`);
        const weatherData = await weatherResponse.json();
        
        if (weatherData.error) {
          throw new Error(weatherData.error.message);
        }
        
        // Show the weather data
        showWeather(weatherData);
        
        // Update the input field with the city name
        document.getElementById("cityInput").value = weatherData.location.name;
        
        // Show success state briefly
        locationBtn.innerHTML = '<i class="fas fa-check"></i> Weather Updated';
        setTimeout(() => {
          locationBtn.innerHTML = originalBtnText;
          locationBtn.disabled = false;
        }, 2000);
        
      } catch (weatherError) {
        console.error("Error getting weather:", weatherError);
        
        // If weather API fails, try to get city name from coordinates
        try {
          const geoResponse = await fetch(`https://api.opencagedata.com/geocode/v1/json?q=${latitude}+${longitude}&key=${geoApiKey}`);
          const geoData = await geoResponse.json();
          
          if (geoData.results && geoData.results.length > 0) {
            const city = geoData.results[0].components.city || 
                        geoData.results[0].components.town || 
                        geoData.results[0].components.village || 
                        geoData.results[0].components.state_district;
            
            if (city) {
              document.getElementById("cityInput").value = city;
              getWeather(city);
              locationBtn.innerHTML = '<i class="fas fa-check"></i> City Found';
              setTimeout(() => {
                locationBtn.innerHTML = originalBtnText;
                locationBtn.disabled = false;
              }, 2000);
              return;
            }
          }
        } catch (geoError) {
          console.error("Error getting city name:", geoError);
        }
        
        // If all else fails, use coordinates directly
        getWeather(`${latitude},${longitude}`);
        locationBtn.innerHTML = '<i class="fas fa-check"></i> Using Coordinates';
        setTimeout(() => {
          locationBtn.innerHTML = originalBtnText;
          locationBtn.disabled = false;
        }, 2000);
      }
    } catch (error) {
      console.error("Error in location success handler:", error);
      alert("Could not get weather for your location. Please try entering your city manually.");
      locationBtn.innerHTML = originalBtnText;
      locationBtn.disabled = false;
    }
  }
  
  // Function to handle location errors
  function handleLocationError(error) {
    let errorMessage = "Unable to get your location. ";
    switch (error.code) {
      case error.PERMISSION_DENIED:
        errorMessage += "Please enable location access in your browser settings.";
        break;
      case error.POSITION_UNAVAILABLE:
        errorMessage += "Location information is unavailable.";
        break;
      case error.TIMEOUT:
        errorMessage += "Location request timed out. Please try again.";
        break;
      default:
        errorMessage += "An unknown error occurred.";
    }
    alert(errorMessage);
    locationBtn.innerHTML = originalBtnText;
    locationBtn.disabled = false;
  }
});

async function getCityFromPincode(pin) {
  try {
    const res = await fetch(`https://api.opencagedata.com/geocode/v1/json?q=${pin}&key=${geoApiKey}`);
    const data = await res.json();
    const comp = data.results[0]?.components;
    const city = comp?.city || comp?.town || comp?.village || comp?.state_district;
    
    if (city) {
      getWeather(city);
    } else {
      document.getElementById("weatherResult").innerHTML = `<p class='text-danger'>City not found for this pincode.</p>`;
    }
  } catch (err) {
    document.getElementById("weatherResult").innerHTML = `<p class='text-danger'>Error resolving pincode.</p>`;
  }
}

async function getWeather(query) {
  try {
    const res = await fetch(`https://api.weatherapi.com/v1/forecast.json?key=${weatherApiKey}&q=${query}&days=10&aqi=yes&alerts=yes&hourly=1`);
    const data = await res.json();

    if (data.error) return document.getElementById("weatherResult").innerHTML = `<p class='text-danger'>${data.error.message}</p>`;

    showWeather(data);
  } catch {
    document.getElementById("weatherResult").innerHTML = `<p class='text-danger'>Error fetching weather.</p>`;
  }
}

function formatTimeTo12Hour(timeString) {
  let [hours, minutes] = timeString.split(":");
  let period = "AM";
  hours = parseInt(hours);
  if (hours >= 12) {
    period = "PM";
    if (hours > 12) hours -= 12;
  } else if (hours === 0) {
    hours = 12;
  }
  return `${hours}:${minutes} ${period}`;
}

function showWeather(data) {
  const { location, current, forecast } = data;
  
  // Format the local time to 12-hour format
  const localTime = new Date(location.localtime);
  const formattedTime = localTime.toLocaleTimeString('en-US', { 
    hour: 'numeric', 
    minute: '2-digit',
    hour12: true 
  });

  // Format the date
  const formattedDate = localTime.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric'
  });

  let html = `
    <h4 class="text-info">${location.name}, ${location.country}</h4>
    <p class="mb-1">${formattedTime}</p>
    <p class="text-muted mb-3">${formattedDate}</p>
    <img src="${current.condition.icon}" class="weather-icon">
    <h3>${current.temp_c}&deg;C - ${current.condition.text}</h3>
    
    <div class="row mt-3 mb-3">
      <div class="col-md-3 col-6 mb-2">
        <div class="info-block">
          <i class="fas fa-thermometer-half text-primary"></i>
          <p class="mb-0"><strong>Feels Like</strong></p>
          <p class="mb-0">${current.feelslike_c}&deg;C</p>
        </div>
      </div>
      <div class="col-md-3 col-6 mb-2">
        <div class="info-block">
          <i class="fas fa-wind text-primary"></i>
          <p class="mb-0"><strong>Wind</strong></p>
          <p class="mb-0">${current.wind_kph} kph</p>
        </div>
      </div>
      <div class="col-md-3 col-6 mb-2">
        <div class="info-block">
          <i class="fas fa-tint text-primary"></i>
          <p class="mb-0"><strong>Humidity</strong></p>
          <p class="mb-0">${current.humidity}%</p>
        </div>
      </div>
      <div class="col-md-3 col-6 mb-2">
        <div class="info-block">
          <i class="fas fa-cloud text-primary"></i>
          <p class="mb-0"><strong>Cloud</strong></p>
          <p class="mb-0">${current.cloud}%</p>
        </div>
      </div>
    </div>
    
    <div class="row mb-3">
      <div class="col-md-6 col-6">
        <div class="info-block">
          <i class="fas fa-sun text-warning"></i>
          <p class="mb-0"><strong>Sunrise</strong></p>
          <p class="mb-0">${forecast.forecastday[0].astro.sunrise}</p>
        </div>
      </div>
      <div class="col-md-6 col-6">
        <div class="info-block">
          <i class="fas fa-moon text-primary"></i>
          <p class="mb-0"><strong>Sunset</strong></p>
          <p class="mb-0">${forecast.forecastday[0].astro.sunset}</p>
        </div>
      </div>
    </div>
    <hr>
    
    <h5 class="mb-4 text-primary"><i class="fas fa-clock me-2"></i> Hourly Forecast</h5>
    <div id="hourlyForecast" class="d-flex overflow-auto p-2">`;

  forecast.forecastday[0].hour.forEach(hour => {
    const formattedTime = formatTimeTo12Hour(hour.time.split(" ")[1]);
    html += `<div class="hour-card text-center me-2 p-2 border rounded">
      <p><strong>${formattedTime}</strong></p>
      <img src="${hour.condition.icon}" class="weather-icon">
      <p>${hour.temp_c}&deg;C</p>
    </div>`;
  });

  html += `</div><hr>
    
    <h5 class="mb-4 text-primary"><i class="fas fa-calendar-day me-2"></i> 10-Day Forecast</h5>
    <div class="forecast-container">`;

  forecast.forecastday.forEach(day => {
    const date = new Date(day.date);
    const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
    const dayDate = date.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' });
    
    html += `
      <div class="forecast-row d-flex align-items-center justify-content-between">
        <div class="col-2">
          <p class="forecast-date">${dayName}<br>${dayDate}</p>
        </div>
        <div class="col-2 text-center">
          <img src="${day.day.condition.icon}" alt="${day.day.condition.text}" style="width: 40px;">
        </div>
        <div class="col-3">
          <span class="forecast-temp">${Math.round(day.day.maxtemp_c)}°</span>
          <span class="forecast-temp-low">${Math.round(day.day.mintemp_c)}°</span>
        </div>
        <div class="col-3">
          <p class="forecast-condition">${day.day.condition.text}</p>
          <p class="forecast-night">${day.hour[20].condition.text}</p>
        </div>
        <div class="col-2 text-end">
          <p class="precipitation">${day.day.daily_chance_of_rain}%</p>
        </div>
      </div>`;
  });

  html += `</div>`;
  document.getElementById("weatherResult").innerHTML = html;

  if (weatherChart) weatherChart.destroy();
  const ctx = document.getElementById("tempChart").getContext("2d");
  weatherChart = new Chart(ctx, {
    type: 'line',
    data: { 
      labels: forecast.forecastday.map(d => d.date), 
      datasets: [{ 
        label: 'Avg Temp (°C)', 
        data: forecast.forecastday.map(d => d.day.avgtemp_c), 
        borderColor: '#007BFF', 
        backgroundColor: 'rgba(0, 123, 255, 0.1)',
        borderWidth: 2,
        fill: true,
        tension: 0.3
      }] 
    },
    options: { 
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'top',
        },
        tooltip: {
          mode: 'index',
          intersect: false,
        }
      },
      scales: {
        y: {
          beginAtZero: false,
          grid: {
            drawBorder: false
          },
          ticks: {
            callback: function(value) {
              return value + '°C';
            }
          }
        },
        x: {
          grid: {
            display: false
          }
        }
      }
    }
  });
}