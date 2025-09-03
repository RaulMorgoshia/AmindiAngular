import { HttpClient } from "@angular/common/http";
import { inject, Injectable } from "@angular/core";
import { map, Observable, switchMap } from "rxjs";

@Injectable({ providedIn: 'root' })
export class WeatherService {
  private http = inject(HttpClient);

  geocode(city: string) {
    const url =
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=ka&format=json`;
    return this.http.get<any>(url).pipe(
      map(res => {
        const p = res?.results?.[0];
        if (!p) return null;
        return { lat: p.latitude, lon: p.longitude, name: p.name, country: p.country_code };
      })
    );
  }

  private describe(code: number): string {
    const d: Record<number, string> = {
      0: 'მოწმენდილი ცა', 1: 'მთავრად მზიანი', 2: 'ნაწილობრივ მოღრუბლე', 3: 'ღრუბლიანი',
      45: 'ნისლი', 48: 'ყინვოვანი ნისლი',
      51: 'მსუბუქი წვიმა', 53: 'წვიმა', 55: 'ძლიერი წვიმა',
      61: 'მსუბუქი შხაპუნა', 63: 'შხაპუნა წვიმა', 65: 'ძლიერი შხაპუნა',
      71: 'თოვლი', 73: 'თოვლი', 75: 'ძლიერი თოვლი',
      80: 'მოკლე წვიმა', 81: 'მოკლე ძლიერი წვიმა', 82: 'ძალიან ძლიერი მოკლე წვიმა',
      95: 'ჭექა-ქუხილი', 96: 'ჭექა-ქუხილი სეტყვით', 99: 'ძლიერი ჭექა-ქუხილი სეტყვით',
    };
    return d[code] ?? 'ამინდი';
  }

  private iconFrom(code: number): string {
    if (code === 0) return '01d';
    if (code === 1) return '02d';
    if (code === 2) return '03d';
    if (code === 3) return '04d';
    if ([51, 53, 55, 61, 63, 65, 80, 81, 82].includes(code)) return '10d';
    if ([71, 73, 75].includes(code)) return '13d';
    if ([45, 48].includes(code)) return '50d';
    if ([95, 96, 99].includes(code)) return '11d';
    return '03d';
  }

  weeklyByCity(city: string): Observable<OneCallLike> {
    return this.geocode(city).pipe(
      switchMap(geo => {
        if (!geo) throw new Error('ქალაქი ვერ მოიძებნა');

        const url =
          `https://api.open-meteo.com/v1/forecast?latitude=${geo.lat}&longitude=${geo.lon}` +
          // ვიბარებთ დღიურად ტემპებს, ქარს და საშუალო ტენიანობას
          `&daily=temperature_2m_max,temperature_2m_min,relative_humidity_2m_mean,wind_speed_10m_max,weathercode` +
          // მიმდინარე ამინდი (ტემპი/ქარი/კოდი) + საათობრივი ტენიანობა, რომ „დღეს“ ბლოკში იყოს რეალური %
          `&hourly=relative_humidity_2m` +
          `&current_weather=true&timezone=auto&forecast_days=7&windspeed_unit=ms`;

        return this.http.get<any>(url).pipe(
          map(r => {
            // ვცდილობთ მოვიძიოთ ახლო საათის ტენიანობა
            let currentHumidity = 0;
            try {
              const times: string[] = r?.hourly?.time ?? [];
              const hums: number[] = r?.hourly?.relative_humidity_2m ?? [];
              const curIso: string | undefined = r?.current_weather?.time;
              if (times.length && hums.length && curIso) {
                const idx = times.indexOf(curIso);
                if (idx >= 0) currentHumidity = hums[idx];
                else currentHumidity = hums[0] ?? 0;
              } else {
                //fallback: დღიური საშუალო ტენიანობა პირველი დღის
                currentHumidity = r?.daily?.relative_humidity_2m_mean?.[0] ?? 0;
              }
            } catch { /* ignore */ }

            const curCode = r?.current_weather?.weathercode ?? 0;
            const cur: OneCallLike['current'] = {
              temp: r?.current_weather?.temperature ?? 0,
              wind_speed: r?.current_weather?.windspeed ?? 0, // უკვე „მ/წმ“
              humidity: currentHumidity,
              weather: [{ description: this.describe(curCode), icon: this.iconFrom(curCode) }]
            };

            const days: OneCallLike['daily'] = (r?.daily?.time ?? []).map((iso: string, i: number) => {
              const code = r.daily.weathercode?.[i] ?? 0;
              return {
                dt: Math.floor(new Date(iso).getTime() / 1000),
                temp: {
                  min: r.daily.temperature_2m_min?.[i] ?? 0,
                  max: r.daily.temperature_2m_max?.[i] ?? 0
                },
                wind_speed: r.daily.wind_speed_10m_max?.[i] ?? 0, // „მ/წმ“
                humidity: r.daily.relative_humidity_2m_mean?.[i] ?? 0,
                weather: [{ description: this.describe(code), icon: this.iconFrom(code) }]
              };
            });

            return {
              timezone: r?.timezone ?? 'Asia/Tbilisi',
              current: cur,
              daily: days
            };
          })
        );
      })
    );
  }
}

export type OneCallLike = {
  timezone: string;
  current: {
    temp: number;
    weather: { description: string; icon: string }[];
    wind_speed: number;
    humidity: number;
  };
  daily: Array<{
    dt: number;
    temp: { min: number; max: number };
    weather: { description: string; icon: string }[];
    wind_speed: number;
    humidity: number;
  }>;
};
