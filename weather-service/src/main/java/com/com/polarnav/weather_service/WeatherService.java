package com.polarnav.weather_service;


import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

@Service
public class WeatherService {

    private final RestClient restClient;

    public WeatherService() {
        this.restClient = RestClient.builder()
                .baseUrl("https://api.open-meteo.com")
                .build();
    }

    public String getWeather(double latitude, double longitude) {

        return restClient.get()
                .uri(uriBuilder -> uriBuilder
                        .path("/v1/forecast")
                        .queryParam("latitude", latitude)
                        .queryParam("longitude", longitude)
                        .queryParam(
                                "current",
                                "temperature_2m,precipitation,rain,snowfall,wind_speed_10m,wind_direction_10m,weather_code"
                        )
                        .queryParam("hourly", "precipitation_probability,precipitation,rain,snowfall,weather_code")
                        .queryParam("timezone", "auto")
                        .build())
                .retrieve()
                .body(String.class);
    }
}