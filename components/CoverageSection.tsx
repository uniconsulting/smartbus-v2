type MapCity = {
  name: string;
  lat: number;
  lon: number;
  labelX: number;
  labelY: number;
  anchor?: "start" | "end";
};

const moscow = { lat: 55.7558, lon: 37.6176 };

const cities: MapCity[] = [
  { name: "Тверь", lat: 56.858, lon: 35.918, labelX: 209, labelY: 110 },
  { name: "Дубна", lat: 56.744, lon: 37.173, labelX: 300, labelY: 128 },
  { name: "Дмитров", lat: 56.344, lon: 37.52, labelX: 302, labelY: 181, anchor: "end" },
  { name: "Александров", lat: 56.395, lon: 38.712, labelX: 412, labelY: 172 },
  { name: "Волоколамск", lat: 56.0336, lon: 35.9694, labelX: 189, labelY: 207, anchor: "end" },
  { name: "Владимир", lat: 56.129, lon: 40.406, labelX: 509, labelY: 200, anchor: "end" },
  { name: "Истра", lat: 55.917, lon: 36.868, labelX: 254, labelY: 235, anchor: "end" },
  { name: "Красногорск", lat: 55.82, lon: 37.329, labelX: 268, labelY: 300, anchor: "end" },
  { name: "Ногинск", lat: 55.857, lon: 38.44, labelX: 391, labelY: 242 },
  { name: "Вязьма", lat: 55.211, lon: 34.299, labelX: 93, labelY: 325 },
  { name: "Обнинск", lat: 55.099, lon: 36.613, labelX: 236, labelY: 356, anchor: "end" },
  { name: "Коломна", lat: 55.103, lon: 38.753, labelX: 414, labelY: 336 },
  { name: "Серпухов", lat: 54.915, lon: 37.413, labelX: 317, labelY: 396 },
  { name: "Луховицы", lat: 54.968, lon: 39.026, labelX: 434, labelY: 381 },
  { name: "Алексин", lat: 54.503, lon: 37.067, labelX: 293, labelY: 439 },
];

// East/west and north/south use the same distance scale near Moscow's latitude.
function mapPoint(lat: number, lon: number) {
  return {
    x: 320 + (lon - moscow.lon) * 72,
    y: 260 + (moscow.lat - lat) * 128,
  };
}

const moscowPoint = mapPoint(moscow.lat, moscow.lon);

export default function CoverageSection() {
  return (
    <section id="coverage" className="section coverage-section" aria-labelledby="coverage-title">
      <div className="container coverage-layout">
        <h2 id="coverage-title" className="visually-hidden">География маршрутов SmartBus</h2>
        <div className="coverage-map" role="img" aria-label={`Схема точек присутствия: Москва, ${cities.map((city) => city.name.toLowerCase()).join(", ")}`}>
          <div className="map-grid" />
          <svg viewBox="40 45 560 430" aria-hidden="true">
            <circle cx={moscowPoint.x} cy={moscowPoint.y} r="78" fill="#725094" opacity=".07" />
            <circle cx={moscowPoint.x} cy={moscowPoint.y} r="57" fill="none" stroke="#725094" strokeOpacity=".12" />
            {cities.map((city) => {
              const point = mapPoint(city.lat, city.lon);
              return <circle key={`${city.name}-point`} cx={point.x} cy={point.y} r="4.5" fill="#5d3681" />;
            })}
            <circle className="map-moscow-marker" cx={moscowPoint.x} cy={moscowPoint.y} r="38" fill="#5d3681" />
            <text className="map-moscow-label" x={moscowPoint.x} y={moscowPoint.y} textAnchor="middle" dominantBaseline="central">Москва</text>
            {cities.map((city) => (
              <text className="map-city-label" key={city.name} x={city.labelX} y={city.labelY} textAnchor={city.anchor}>{city.name}</text>
            ))}
          </svg>
        </div>
        <div className="coverage-copy">
          <p>Работаем с маршрутами в Москве, Волоколамске, Дмитрове, Красногорске, Ногинске, Серпухове, Истре и других городах Московской области.</p>
          <p>Для регулярных перевозок под сменный график подготовим индивидуальное предложение.</p>
          <a className="button button-outline" href="#contact">Обсудить свой маршрут</a>
        </div>
      </div>
    </section>
  );
}
