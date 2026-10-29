import { createHash } from "node:crypto";
import { lstat, mkdir, readFile, readdir, realpath, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

type ApartmentSource = {
  slug: string;
  metadataFolder: string;
  galleryFolder: string;
  sourceNote: string | null;
  coverFilename: string;
  title: string;
  address: string;
  residentialComplex: string | null;
  description: string | null;
  arrivalInstructions: string | null;
  wifi: { network: string; password: string } | null;
  unit: string;
  entrance: number;
  floor: number;
  priceMin: number | null;
  priceMax: number | null;
  pricingPeriod: "unconfirmed" | "day" | "month";
  mapUrl: string | null;
};

// Metadata and gallery provenance are separate: the owner's 2026-10-18 corrections
// reassign complete photo sets without changing the original address-based prices.
// Original folder names are retained for reproducible imports, never in public data.
// The owner confirmed the fractional addresses Базовая 2/6 and Михаэлиса 8/2.
const sources: ApartmentSource[] = [
  {
    slug: "esenberlina-46-10",
    metadataFolder: "Адрес Есенберлина 46, 1 подъезд, 4 этаж, 10 квартира",
    galleryFolder: "Михаэлиса 7, 7 подъезд, 6 этаж, 240 квартира",
    sourceNote: "2 ГИС.txt",
    coverFilename: "WhatsApp Image 2026-10-17 at 16.20.43.jpeg",
    title: "Квартира на Есенберлина, 46",
    address: "ул. Есенберлина, 46",
    residentialComplex: "Delux Town",
    description: null,
    arrivalInstructions: "Когда подойдёте к подъезду, нажмите на квартиру 10: там видеодомофон. Уходя из квартиры, берите с собой ключ от домофона.",
    wifi: null,
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
    metadataFolder: "Базовая 26, 1 подъезд, 6 этаж 17 квартира",
    galleryFolder: "Базовая 26, 1 подъезд, 6 этаж 17 квартира",
    sourceNote: "2ГИС.txt",
    coverFilename: "WhatsApp Image 2026-10-17 at 16.23.10.jpeg",
    title: "Квартира на Базовой, 2/6 · № 17",
    address: "ул. Базовая, 2/6",
    residentialComplex: null,
    description: null,
    arrivalInstructions: null,
    wifi: { network: "Tele2_5G_9921_5G", password: "82619283" },
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
    metadataFolder: "Базовая 26, 1 подъезд, 8 этаж 26 квартира",
    galleryFolder: "Базовая 26, 1 подъезд, 8 этаж 26 квартира",
    sourceNote: "2 ГИС.txt",
    coverFilename: "WhatsApp Image 2026-10-17 at 16.12.16.jpeg",
    title: "Квартира на Базовой, 2/6 · № 26",
    address: "ул. Базовая, 2/6",
    residentialComplex: null,
    description: null,
    arrivalInstructions: null,
    wifi: { network: "Dom-26", password: "Qwerty321!" },
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
    metadataFolder: "Жилой комплекс Novy Bereg Базовая 4, 2 подъезд, 9 этаж, 70 квартира",
    galleryFolder: "Жилой комплекс Novy Bereg Базовая 4, 2 подъезд, 9 этаж, 70 квартира",
    sourceNote: "ссылка 2ГИС.txt",
    coverFilename: "WhatsApp Image 2026-10-17 at 16.12.15 (1).jpeg",
    title: "Квартира в ЖК Novy Bereg",
    address: "ул. Базовая, 4",
    residentialComplex: "Novy Bereg",
    description: null,
    arrivalInstructions: "Уходя из квартиры, берите с собой ключ от домофона.",
    wifi: { network: "KZTK-21383_5G", password: "RHZ7PRuz" },
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
    metadataFolder: "Михаэлиса 7, 7 подъезд, 6 этаж, 240 квартира",
    galleryFolder: "Михаэлиса 7, 7 подъезд, 6 этаж, 240 квартира/Обновление 2026-10-18",
    sourceNote: "2ГИС.txt",
    coverFilename: "WhatsApp Image 2026-10-18 at 23.48.40 (2).jpeg",
    title: "Квартира на Михаэлиса, 7",
    address: "ул. Михаэлиса, 7",
    residentialComplex: null,
    description: null,
    arrivalInstructions: null,
    wifi: { network: "Huawei-2,4/5heXh", password: "Xxy2C8JK" },
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
    metadataFolder: "Михаэлиса 8, 4 подъезд, 5 этаж, 69 квартира",
    galleryFolder: "Михаэлиса 82, 2 подъезд, 4 этаж, 35 квартира",
    sourceNote: null,
    coverFilename: "WhatsApp Image 2026-10-17 at 16.22.10.jpeg",
    title: "Квартира на Михаэлиса, 8",
    address: "ул. Михаэлиса, 8",
    residentialComplex: null,
    description: null,
    arrivalInstructions: null,
    wifi: { network: "HUAWEI-017", password: "pdp1531413" },
    unit: "69",
    entrance: 4,
    floor: 5,
    priceMin: null,
    priceMax: null,
    pricingPeriod: "unconfirmed",
    // Supplied directly by the owner with the gallery corrections.
    mapUrl: "https://2gis.kz/ustkam/geo/12807747095497019/82.611883,49.965678",
  },
  {
    slug: "mihaelisa-8-2-35",
    metadataFolder: "Михаэлиса 82, 2 подъезд, 4 этаж, 35 квартира",
    galleryFolder: "Михаэлиса 8, 4 подъезд, 5 этаж, 69 квартира",
    sourceNote: "2ГИС.txt",
    coverFilename: "WhatsApp Image 2026-10-17 at 16.21.38 (1).jpeg",
    title: "Квартира на Михаэлиса, 8/2",
    address: "ул. Михаэлиса, 8/2",
    residentialComplex: null,
    description: null,
    arrivalInstructions: null,
    wifi: { network: "KZTK-37106_5G", password: "KeFU6SHR" },
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
  const generatedFiles = new Map<string, Set<string>>();
  let photoCount = 0;
  let outputBytes = 0;
  await mkdir(assetsRoot, { recursive: true });
  const resolvedAssetsRoot = await realpath(assetsRoot);

  for (const source of sources) {
    await verifySourceNote(source, childPath(sourceRoot, source.metadataFolder));
    const folder = childPath(sourceRoot, source.galleryFolder);
    const filenames = (await readdir(folder))
      .filter((filename) => /\.(jpe?g|png|webp)$/i.test(filename))
      .sort((left, right) => left.localeCompare(right, "en", { numeric: true }));
    if (!filenames.includes(source.coverFilename)) {
      throw new Error(`Cover photo is missing for ${source.slug}.`);
    }

    const orderedFilenames = [source.coverFilename, ...filenames.filter((name) => name !== source.coverFilename)];
    const destination = childPath(assetsRoot, source.slug);
    await mkdir(destination, { recursive: true });
    // Re-check actual filesystem paths before writing or pruning generated assets.
    childPath(resolvedAssetsRoot, path.relative(resolvedAssetsRoot, await realpath(destination)));
    const outputNames = new Set<string>();
    generatedFiles.set(destination, outputNames);
    const photos = [];

    for (const [index, filename] of orderedFilenames.entries()) {
      // rotate() applies camera orientation. Sharp strips EXIF/GPS metadata by default.
      const { data, info } = await sharp(childPath(folder, filename))
        .rotate()
        .resize({ width: 1600, withoutEnlargement: true })
        .webp({ quality: 82 })
        .toBuffer({ resolveWithObject: true });
      // New bytes receive a new URL, including in the Next.js image cache.
      const contentHash = createHash("sha256").update(data).digest("hex").slice(0, 12);
      const outputName = `${String(index + 1).padStart(2, "0")}-${contentHash}.webp`;
      await writeFile(childPath(destination, outputName), data);
      outputNames.add(outputName);
      photos.push({
        src: `/apartments/${source.slug}/${outputName}`,
        width: info.width,
        height: info.height,
        alt: `Интерьер квартиры: ${source.address}, фото ${index + 1}`,
      });
      outputBytes += info.size;
    }

    catalog.push({
      slug: source.slug,
      title: source.title,
      address: source.address,
      residentialComplex: source.residentialComplex,
      description: source.description,
      arrivalInstructions: source.arrivalInstructions,
      wifi: source.wifi,
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
  const types = `export type ApartmentPhoto = {\n  src: string;\n  width: number;\n  height: number;\n  alt: string;\n};\n\nexport type Apartment = {\n  slug: string;\n  title: string;\n  address: string;\n  residentialComplex: string | null;\n  description: string | null;\n  arrivalInstructions: string | null;\n  wifi: { network: string; password: string } | null;\n  unit: string;\n  entrance: number;\n  floor: number;\n  priceMin: number | null;\n  priceMax: number | null;\n  pricingPeriod: "unconfirmed" | "day" | "month";\n  mapUrl: string | null;\n  photos: ApartmentPhoto[];\n};\n\n`;
  const lookup = `\n\nexport function findApartment(slug: string): Apartment | undefined {\n  return apartments.find((apartment) => apartment.slug === slug);\n}\n`;
  await mkdir(path.dirname(dataPath), { recursive: true });
  await writeFile(dataPath, `${header}${types}export const apartments: Apartment[] = ${JSON.stringify(catalog, null, 2)};${lookup}`, "utf8");
  // Only generated WebP files are pruned, after every new asset and data file exists.
  // Source photographs and unrelated files are never removed.
  for (const [destination, outputNames] of generatedFiles) {
    for (const filename of await readdir(destination)) {
      if (!/^\d{2}(?:-[a-f0-9]{12})?\.webp$/.test(filename) || outputNames.has(filename)) continue;
      const obsoletePath = childPath(destination, filename);
      if (!(await lstat(obsoletePath)).isFile()) continue;
      await unlink(obsoletePath);
    }
  }
  console.log(`Imported ${catalog.length} apartments, ${photoCount} photos, ${(outputBytes / 1024 / 1024).toFixed(2)} MiB. Originals preserved.`);
}

importCatalog().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Catalog import failed.");
  process.exitCode = 1;
});
