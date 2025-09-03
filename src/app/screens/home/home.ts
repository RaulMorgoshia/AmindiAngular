import { CommonModule } from '@angular/common';
import { Component, computed, effect, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs/operators';
import { WeatherService } from '../../services/weather.service';
import { FormsModule } from '@angular/forms';

type Day = {
  dt: number;
  temp: { min: number; max: number };
  weather: { description: string; icon: string }[];
  wind_speed: number;
  humidity: number;
};

const CITY_MAP: Record<string, { ui: string; query: string }> = {
  tbilisi: { ui: 'თბილისი', query: 'Tbilisi' },
  batumi: { ui: 'ბათუმი', query: 'Batumi' },
  kutaisi: { ui: 'ქუთაისი', query: 'Kutaisi' },
  telavi: { ui: 'თელავი', query: 'Telavi' },
  zugdidi: { ui: 'ზუგდიდი', query: 'Zugdidi' },
  gori: { ui: 'გორი', query: 'Gori' },
  rustavi: { ui: 'რუსთავი', query: 'Rustavi' },
};
const DEFAULT_ID = 'tbilisi';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './home.html',
  styleUrls: ['./home.css']
})
export class Home {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private wx = inject(WeatherService);

  readonly cityOptions = Object.entries(CITY_MAP).map(([id, v]) => ({ id, label: v.ui }));

  // სიგნალი URL-დან
  readonly cityId = toSignal(
    this.route.paramMap.pipe(map(pm => pm.get('id') ?? DEFAULT_ID)),
    { initialValue: DEFAULT_ID }
  );

  // რეაქტიულად გამოთვლილი label
  readonly selectedCityUi = computed(() =>
    CITY_MAP[this.cityId()]?.ui ?? CITY_MAP[DEFAULT_ID].ui
  );

  loading = signal(false);
  error = signal<string | null>(null);
  current = signal<any>(null);
  daily = signal<Day[]>([]);


  selectedId = signal<string>(this.cityId());

  constructor() {
    effect(() => {
      const id = this.cityId();
      if (id && id !== this.selectedId()) {
        this.selectedId.set(id);
      }

      // fetch-იც აქვე დაიძრას cityId-ზე
      const conf = CITY_MAP[id] ?? CITY_MAP[DEFAULT_ID];
      this.fetch(conf.query);
    });
  }


    onSelectChange(id: string) {
    if (!id || id === this.cityId()) return;
    this.router.navigate(['/', id], { replaceUrl: true });
  }

  onCityChange(id: string) {
    console.log('onCityChange ->', id);
    this.router.navigate(['/', id], { replaceUrl: true });
  }


  private fetch(queryCity: string) {
    this.loading.set(true);
    this.error.set(null);

    this.wx.weeklyByCity(queryCity).subscribe({
      next: res => {
        this.current.set(res.current);
        this.daily.set((res.daily ?? []).slice(0, 7));
        this.loading.set(false);
      },
      error: err => {
        this.error.set(err?.message ?? 'ვერ ჩაიტვირთა ამინდი');
        this.loading.set(false);
      }
    });
  }

  iconUrl(icon?: string) {
    return icon ? `https://openweathermap.org/img/wn/${icon}@2x.png` : '';
  }
  asDate(ts: number) { return new Date(ts * 1000); }
  trackByIdx = (i: number) => i;
}
