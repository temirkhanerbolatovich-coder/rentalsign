import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

type ApartmentSource = {
  slug: string;
  sourceFolder: string;
  sourceNote: string | null;
  coverFilename: string;
  title: string;
  address: string;
  residentialComplex: string | null;
  description: string | null;
  unit: string;
  entrance: number;
  floor: number;
  priceMin: number | null;
  priceMax: number | null;
  pricingPeriod: "unconfirmed" | "day" | "month";
  mapUrl: string | null;
};

// Source folder names are retained here for reproducible imports, never in public data.
// The owner confirmed the fractional addresses Базовая 2/6 and Михаэлиса 8/2.
const sources: ApartmentSource[] = [
  {
    slug: "esenberlina-46-10",
    sourceFolder: "Адрес Есенберлина 46, 1 подъезд, 4 этаж, 10 квартира",
    sourceNote: "2 ГИС.txt",
    coverFilename: "WhatsApp Image 2026-10-17 at 16.13.14.jpeg",
    title: "Квартира на Есенберлина, 46",
    address: "ул. Есенберлина, 46",
    residentialComplex: "Delux Town",
    description: null,
    unit: "10",
    entrance: 1,
    floor: 4,
    priceMin: 30000,
    priceMax: 35000,
    pricingPeriod: "unconfirmed",
    mapUrl: "https://2gis.kz/ustkam/geo/70030076308891814/82.614717,49.916413",
  },
  {
    slug: "bazovaya-2-6-17",
    sourceFolder: "Базовая 26, 1 подъезд, 6 этаж 17 квартира",
    sourceNote: "2ГИС.txt",
    coverFilename: "WhatsApp Image 2026-10-17 at 16.23.10.jpeg",
    title: "Квартира на Базовой, 2/6 · № 17",
    address: "ул. Базовая, 2/6",
    residentialComplex: null,
    description: null,
    unit: "17",
    entrance: 1,
    floor: 6,
    priceMin: 25000,
    priceMax: 25000,
    pricingPeriod: "unconfirmed",
    mapUrl: "https://2gis.kz/ustkam/geo/70030076291491530/82.630437,49.925111",
  },
  {
    slug: "bazovaya-2-6-26",
    sourceFolder: "Базовая 26, 1 подъезд, 8 этаж 26 квартира",
    sourceNote: "2 ГИС.txt",
    coverFilename: "WhatsApp Image 2026-10-17 at 16.12.16.jpeg",
    title: "Квартира на Базовой, 2/6 · № 26",
    address: "ул. Базовая, 2/6",
    residentialComplex: null,
    description: null,
    unit: "26",
    entrance: 1,
    floor: 8,
    priceMin: 40000,
    priceMax: 45000,
    pricingPeriod: "unconfirmed",
    mapUrl: "https://2gis.kz/ustkam/geo/70030076291491530/82.630431,49.924963",
  },
  {
    slug: "novy-bereg-70",
    sourceFolder: "Жилой комплекс Novy Bereg Базовая 4, 2 подъезд, 9 этаж, 70 квартира",
    sourceNote: "ссылка 2ГИС.txt",
    coverFilename: "WhatsApp Image 2026-10-17 at 16.12.15 (1).jpeg",
    title: "Квартира в ЖК Novy Bereg",
    address: "ул. Базовая, 4",
    residentialComplex: "Novy Bereg",
    description: null,
    unit: "70",
    entrance: 2,
    floor: 9,
    priceMin: 40000,
    priceMax: 45000,
    pricingPeriod: "unconfirmed",
    mapUrl: "https://2gis.kz/ustkam/geo/70030076291491746/82.630611,49.927106",
  },
  {
    slug: "mihaelisa-7-240",
    sourceFolder: "Михаэлиса 7, 7 подъезд, 6 этаж, 240 квартира",
    sourceNote: "2ГИС.txt",
    coverFilename: "WhatsApp Image 2026-10-17 at 16.20.43.jpeg",
    title: "Квартира на Михаэлиса, 7",
    address: "ул. Михаэлиса, 7",
    residentialComplex: null,
    description: null,
    unit: "240",
    entrance: 7,
    floor: 6,
    priceMin: 25000,
    priceMax: 25000,
    pricingPeriod: "unconfirmed",
    mapUrl: "https://2gis.kz/ustkam/geo/12807747095505295/82.608168,49.965321",
  },
  {
    slug: "mihaelisa-8-69",
    sourceFolder: "Михаэлиса 8, 4 подъезд, 5 этаж, 69 квартира",
    sourceNote: null,
    coverFilename: "WhatsApp Image 2026-10-17 at 16.21.38 (1).jpeg",
    title: "Квартира на Михаэлиса, 8",
    address: "ул. Михаэлиса, 8",
    residentialComplex: null,
    description: null,
    unit: "69",
    entrance: 4,
    floor: 5,
    priceMin: null,
    priceMax: null,
    pricingPeriod: "unconfirmed",
    mapUrl: null,
  },
  {
    slug: "mihaelisa-8-2-35",
    sourceFolder: "Михаэлиса 82, 2 подъезд, 4 этаж, 35 квартира",
    sourceNote: "2ГИС.txt",
    coverFilename: "WhatsApp Image 2026-10-17 at 16.22.10.jpeg",
    title: "Квартира на Михаэлиса, 8/2",
    address: "ул. Михаэлиса, 8/2",
    residentialComplex: null,
    description: null,
    unit: "35",
    entrance: 2,
    floor: 4,
    priceMin: 20000,
    priceMax: 20000,
    pricingPeriod: "unconfirmed",
    mapUrl: "https://2gis.kz/ustkam/geo/12807747095497085/82.612469,49.966384",
  },
];

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourceRoot = path.join(projectRoot, "квартиры");
const assetsRoot = path.join(projectRoot, "public", "apartments");
const dataPath = path.join(projectRoot, "src", "catalog", "apartments.ts");

function childPath(root: string, segment: string) {
  const resolved = path.resolve(root, segment);
  const relative = path.relative(root, resolved);
  if (relative.startsWith("..") || path.isAbsolute(relative) || relative === "") {
    throw new Error(`Invalid catalog path segment: ${segment}`);
  }
  return resolved;
}

async function verifySourceNote(source: ApartmentSource, folder: string) {
  if (!source.sourceNote) return;

  const note = await readFile(childPath(folder, source.sourceNote), "utf8");
  if (source.mapUrl && !note.includes(source.mapUrl)) {
    throw new Error(`Map URL changed in source note for ${source.slug}; review the catalog mapping.`);
  }

  const priceText = note.split(/\r?\n/).filter((line) => !line.includes("http")).join(" ");
  const prices = [...priceText.matchAll(/\d{1,3}[. ]\d{3}/g)]
    .map((match) => Number(match[0].replace(/[. ]/g, "")));
  if (prices[0] !== source.priceMin || prices.at(-1) !== source.priceMax) {
    throw new Error(`Price changed in source note for ${source.slug}; review the catalog mapping.`);
  }
}

async function importCatalog() {
  const catalog = [];
  let photoCount = 0;
  let outputBytes = 0;

  for (const source of sources) {
    const folder = childPath(sourceRoot, source.sourceFolder);
    await verifySourceNote(source, folder);
    const filenames = (await readdir(folder))
      .filter((filename) => /\.(jpe?g|png|webp)$/i.test(filename))
      .sort((left, right) => left.localeCompare(right, "en", { numeric: true }));
    if (!filenames.includes(source.coverFilename)) {
      throw new Error(`Cover photo is missing for ${source.slug}.`);
    }

    const orderedFilenames = [source.coverFilename, ...filenames.filter((name) => name !== source.coverFilename)];
    const destination = childPath(assetsRoot, source.slug);
    await mkdir(destination, { recursive: true });
    const photos = [];

    for (const [index, filename] of orderedFilenames.entries()) {
      const outputName = `${String(index + 1).padStart(2, "0")}.webp`;
      // rotate() applies camera orientation. Sharp strips EXIF/GPS metadata by default.
      const output = await sharp(childPath(folder, filename))
        .rotate()
        .resize({ width: 1600, withoutEnlargement: true })
        .webp({ quality: 82 })
        .toFile(childPath(destination, outputName));
      photos.push({
        src: `/apartments/${source.slug}/${outputName}`,
        width: output.width,
        height: output.height,
        alt: `Интерьер квартиры: ${source.address}, фото ${index + 1}`,
      });
      outputBytes += output.size;
    }

    catalog.push({
      slug: source.slug,
      title: source.title,
      address: source.address,
      residentialComplex: source.residentialComplex,
      description: source.description,
      unit: source.unit,
      entrance: source.entrance,
      floor: source.floor,
      priceMin: source.priceMin,
      priceMax: source.priceMax,
      pricingPeriod: source.pricingPeriod,
      mapUrl: source.mapUrl,
      photos,
    });
    photoCount += photos.length;
    console.log(`${source.slug}: ${photos.length} photos`);
  }

  const header = `// Generated by scripts/import-catalog.ts. Edit the source mapping and rerun the importer.\n\n`;
  const types = `export type ApartmentPhoto = {\n  src: string;\n  width: number;\n  height: number;\n  alt: string;\n};\n\nexport type Apartment = {\n  slug: string;\n  title: string;\n  address: string;\n  residentialComplex: string | null;\n  description: string | null;\n  unit: string;\n  entrance: number;\n  floor: number;\n  priceMin: number | null;\n  priceMax: number | null;\n  pricingPeriod: "unconfirmed" | "day" | "month";\n  mapUrl: string | null;\n  photos: ApartmentPhoto[];\n};\n\n`;
  const lookup = `\n\nexport function findApartment(slug: string): Apartment | undefined {\n  return apartments.find((apartment) => apartment.slug === slug);\n}\n`;
  await mkdir(path.dirname(dataPath), { recursive: true });
  await writeFile(dataPath, `${header}${types}export const apartments: Apartment[] = ${JSON.stringify(catalog, null, 2)};${lookup}`, "utf8");
  console.log(`Imported ${catalog.length} apartments, ${photoCount} photos, ${(outputBytes / 1024 / 1024).toFixed(2)} MiB. Originals preserved.`);
}

importCatalog().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Catalog import failed.");
  process.exitCode = 1;
});
