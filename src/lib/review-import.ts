import { unzipEntries } from "@/lib/zip";

export type NormalizedReview = {
  asin: string;
  model: string;
  reviewTitle: string;
  reviewBody: string;
  rating: number | null;
  reviewDate: string;
  country: string;
  isVerifiedPurchase: boolean;
  isVine: boolean;
  helpfulCount: number | null;
  imageCount: number;
  imageUrls: string[];
  hasVideo: boolean;
  videoUrls: string[];
  reviewUrl: string;
  reviewerName: string;
};

type ParsedSheet = {
  name: string;
  rows: string[][];
};

export type ImportPreview = {
  fileName: string;
  fileType: "xlsx" | "csv";
  sheetNames: string[];
  selectedSheet: string;
  totalRows: number;
  header: string[];
  warnings: string[];
  stats: {
    uniqueAsins: number;
    ratingDistribution: Record<string, number>;
    countryDistribution: Record<string, number>;
    reviewsWithImages: number;
    reviewsWithVideos: number;
    dateRange: {
      from: string | null;
      to: string | null;
    };
  };
  sampleRows: NormalizedReview[];
};

type RawRow = Record<string, string>;

const SHEET_IGNORE_NAMES = new Set(["note", "说明", "readme"]);

const HEADER_ALIASES = {
  asin: ["ASIN", "asin"],
  model: ["型号", "model", "variant", "款式"],
  reviewTitle: ["标题", "title", "review title"],
  reviewBody: ["内容", "正文", "review body", "body", "评论内容"],
  rating: ["星级", "rating", "stars"],
  reviewDate: ["评论时间", "review date", "date"],
  country: ["所属国家", "country"],
  isVerifiedPurchase: ["VP评论", "verified purchase", "vp"],
  isVine: ["Vine Voice评论", "vine voice", "vine"],
  helpfulCount: ["赞同数", "helpful", "helpful count"],
  imageCount: ["图片数量", "image count"],
  imageUrls: ["图片地址", "image urls", "images"],
  hasVideo: ["是否有视频", "has video"],
  videoUrls: ["视频地址", "video urls", "videos"],
  reviewUrl: ["评论链接", "review url"],
  reviewerName: ["评论人", "reviewer", "reviewer name"],
} as const;

function decodeXml(value: string) {
  return value
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex: string) =>
      String.fromCodePoint(parseInt(hex, 16)),
    )
    .replace(/&#(\d+);/g, (_, decimal: string) =>
      String.fromCodePoint(parseInt(decimal, 10)),
    )
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");
}

function normalizeHeaderName(header: string) {
  return header.trim().toLowerCase();
}

function findHeaderValue(rawRow: RawRow, aliases: readonly string[]) {
  const candidates = new Set(aliases.map(normalizeHeaderName));

  for (const [key, value] of Object.entries(rawRow)) {
    if (candidates.has(normalizeHeaderName(key))) {
      return value.trim();
    }
  }

  return "";
}

function parseInteger(value: string) {
  const digits = value.trim();

  if (!digits) {
    return null;
  }

  const parsed = Number.parseInt(digits, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseBooleanFlag(value: string) {
  const normalized = value.trim().toLowerCase();
  return normalized === "y" || normalized === "yes" || normalized === "true";
}

function splitMultilineUrls(value: string) {
  return value
    .split(/\r?\n/)
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function toColumnIndex(reference: string) {
  const letters = reference.replace(/[^A-Z]/gi, "").toUpperCase();
  let index = 0;

  for (const char of letters) {
    index = index * 26 + (char.charCodeAt(0) - 64);
  }

  return index - 1;
}

function parseCsvRows(text: string) {
  const rows: string[][] = [];
  let currentCell = "";
  let currentRow: string[] = [];
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        currentCell += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      currentRow.push(currentCell);
      currentCell = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") {
        index += 1;
      }
      currentRow.push(currentCell);
      rows.push(currentRow);
      currentCell = "";
      currentRow = [];
      continue;
    }

    currentCell += char;
  }

  if (currentCell || currentRow.length > 0) {
    currentRow.push(currentCell);
    rows.push(currentRow);
  }

  return rows.filter((row) => row.some((cell) => cell.trim()));
}

function parseSharedStrings(xml: string) {
  const shared: string[] = [];
  const stringRegex = /<si\b[^>]*>([\s\S]*?)<\/si>/g;

  for (const match of xml.matchAll(stringRegex)) {
    const value = [...match[1].matchAll(/<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/g)]
      .map((part) => decodeXml(part[1]))
      .join("");
    shared.push(value);
  }

  return shared;
}

function parseWorkbookSheets(workbookXml: string, relationshipsXml: string) {
  const relationships = new Map<string, string>();

  for (const match of relationshipsXml.matchAll(
    /<Relationship\b[^>]*Id="([^"]+)"[^>]*Target="([^"]+)"/g,
  )) {
    relationships.set(match[1], match[2]);
  }

  const sheets: Array<{ name: string; target: string }> = [];

  for (const match of workbookXml.matchAll(
    /<sheet\b[^>]*name="([^"]+)"[^>]*r:id="([^"]+)"/g,
  )) {
    const relationshipTarget = relationships.get(match[2]);

    if (relationshipTarget) {
      sheets.push({
        name: decodeXml(match[1]),
        target: relationshipTarget.replace(/^\/+/, ""),
      });
    }
  }

  return sheets;
}

function parseSheetRows(sheetXml: string, sharedStrings: string[]) {
  const rows: string[][] = [];
  const rowRegex = /<row\b[^>]*>([\s\S]*?)<\/row>/g;

  for (const rowMatch of sheetXml.matchAll(rowRegex)) {
    const cells = new Map<number, string>();
    let maxIndex = -1;

    for (const cellMatch of rowMatch[1].matchAll(
      /<c\b([^>]*?)(?:>([\s\S]*?)<\/c>|\/>)/g,
    )) {
      const attributes = cellMatch[1];
      const innerXml = cellMatch[2] ?? "";
      const referenceMatch = attributes.match(/\br="([^"]+)"/);

      if (!referenceMatch) {
        continue;
      }

      const typeMatch = attributes.match(/\bt="([^"]+)"/);
      const cellType = typeMatch?.[1] ?? "";
      const index = toColumnIndex(referenceMatch[1]);
      let value = "";

      if (cellType === "s") {
        const sharedIndexMatch = innerXml.match(/<v>([\s\S]*?)<\/v>/);
        const sharedIndex = Number.parseInt(sharedIndexMatch?.[1] ?? "", 10);
        value = sharedStrings[sharedIndex] ?? "";
      } else if (cellType === "inlineStr") {
        value = [...innerXml.matchAll(/<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/g)]
          .map((part) => decodeXml(part[1]))
          .join("");
      } else {
        const valueMatch = innerXml.match(/<v>([\s\S]*?)<\/v>/);
        value = decodeXml(valueMatch?.[1] ?? "");
      }

      cells.set(index, value);
      maxIndex = Math.max(maxIndex, index);
    }

    if (maxIndex >= 0) {
      rows.push(
        Array.from({ length: maxIndex + 1 }, (_, index) => cells.get(index) ?? ""),
      );
    }
  }

  return rows.filter((row) => row.some((cell) => cell.trim()));
}

function parseXlsx(buffer: Buffer): ParsedSheet[] {
  const entries = unzipEntries(buffer);
  const entryMap = new Map(entries.map((entry) => [entry.name, entry.data]));

  const workbookXml = entryMap.get("xl/workbook.xml")?.toString("utf8");
  const relationshipsXml = entryMap
    .get("xl/_rels/workbook.xml.rels")
    ?.toString("utf8");

  if (!workbookXml || !relationshipsXml) {
    throw new Error("Unable to read workbook metadata from XLSX file");
  }

  const sharedStringsXml = entryMap.get("xl/sharedStrings.xml")?.toString("utf8");
  const sharedStrings = sharedStringsXml ? parseSharedStrings(sharedStringsXml) : [];
  const sheets = parseWorkbookSheets(workbookXml, relationshipsXml);

  return sheets
    .map((sheet) => {
      const entryName = `xl/${sheet.target.replace(/^\.?\//, "")}`;
      const sheetXml = entryMap.get(entryName)?.toString("utf8");

      if (!sheetXml) {
        return null;
      }

      return {
        name: sheet.name,
        rows: parseSheetRows(sheetXml, sharedStrings),
      };
    })
    .filter((sheet): sheet is ParsedSheet => Boolean(sheet));
}

function normalizeReview(rawRow: RawRow): NormalizedReview {
  const imageUrls = splitMultilineUrls(
    findHeaderValue(rawRow, HEADER_ALIASES.imageUrls),
  );
  const videoUrls = splitMultilineUrls(
    findHeaderValue(rawRow, HEADER_ALIASES.videoUrls),
  );
  const imageCount = parseInteger(findHeaderValue(rawRow, HEADER_ALIASES.imageCount));

  return {
    asin: findHeaderValue(rawRow, HEADER_ALIASES.asin),
    model: findHeaderValue(rawRow, HEADER_ALIASES.model),
    reviewTitle: findHeaderValue(rawRow, HEADER_ALIASES.reviewTitle),
    reviewBody: findHeaderValue(rawRow, HEADER_ALIASES.reviewBody),
    rating: parseInteger(findHeaderValue(rawRow, HEADER_ALIASES.rating)),
    reviewDate: findHeaderValue(rawRow, HEADER_ALIASES.reviewDate),
    country: findHeaderValue(rawRow, HEADER_ALIASES.country),
    isVerifiedPurchase: parseBooleanFlag(
      findHeaderValue(rawRow, HEADER_ALIASES.isVerifiedPurchase),
    ),
    isVine: parseBooleanFlag(findHeaderValue(rawRow, HEADER_ALIASES.isVine)),
    helpfulCount: parseInteger(findHeaderValue(rawRow, HEADER_ALIASES.helpfulCount)),
    imageCount: imageCount ?? imageUrls.length,
    imageUrls,
    hasVideo:
      parseBooleanFlag(findHeaderValue(rawRow, HEADER_ALIASES.hasVideo)) ||
      videoUrls.length > 0,
    videoUrls,
    reviewUrl: findHeaderValue(rawRow, HEADER_ALIASES.reviewUrl),
    reviewerName: findHeaderValue(rawRow, HEADER_ALIASES.reviewerName),
  };
}

function buildStats(reviews: NormalizedReview[]) {
  const asins = new Set<string>();
  const ratings: Record<string, number> = {};
  const countries: Record<string, number> = {};
  let reviewsWithImages = 0;
  let reviewsWithVideos = 0;
  let from: string | null = null;
  let to: string | null = null;

  for (const review of reviews) {
    if (review.asin) {
      asins.add(review.asin);
    }

    if (review.rating !== null) {
      const key = String(review.rating);
      ratings[key] = (ratings[key] ?? 0) + 1;
    }

    if (review.country) {
      countries[review.country] = (countries[review.country] ?? 0) + 1;
    }

    if (review.imageCount > 0 || review.imageUrls.length > 0) {
      reviewsWithImages += 1;
    }

    if (review.hasVideo) {
      reviewsWithVideos += 1;
    }

    if (review.reviewDate) {
      if (!from || review.reviewDate < from) {
        from = review.reviewDate;
      }
      if (!to || review.reviewDate > to) {
        to = review.reviewDate;
      }
    }
  }

  return {
    uniqueAsins: asins.size,
    ratingDistribution: ratings,
    countryDistribution: countries,
    reviewsWithImages,
    reviewsWithVideos,
    dateRange: { from, to },
  };
}

function rowsToRawRecords(rows: string[][]) {
  const [headerRow, ...dataRows] = rows;
  const header = headerRow.map((cell) => cell.trim());
  const records = dataRows
    .map((row) => {
      const record: RawRow = {};

      header.forEach((column, index) => {
        if (column) {
          record[column] = (row[index] ?? "").trim();
        }
      });

      return record;
    })
    .filter((record) =>
      Object.values(record).some((value) => value && value.trim().length > 0),
    );

  return { header, records };
}

export async function createImportPreview(fileName: string, buffer: Buffer) {
  const extension = fileName.split(".").pop()?.toLowerCase();
  const warnings: string[] = [];

  if (extension !== "xlsx" && extension !== "csv") {
    throw new Error("Only .xlsx and .csv files are supported in this preview");
  }

  const fileType = extension;
  let parsedSheets: ParsedSheet[];

  if (fileType === "csv") {
    parsedSheets = [{ name: "CSV", rows: parseCsvRows(buffer.toString("utf8")) }];
  } else {
    parsedSheets = parseXlsx(buffer);
  }

  const importableSheets = parsedSheets.filter(
    (sheet) => !SHEET_IGNORE_NAMES.has(sheet.name.trim().toLowerCase()),
  );

  if (importableSheets.length !== parsedSheets.length) {
    warnings.push("Ignored non-data sheets such as Note/Readme.");
  }

  const selectedSheet = importableSheets[0];

  if (!selectedSheet) {
    throw new Error("No importable data sheet was found");
  }

  const { header, records } = rowsToRawRecords(selectedSheet.rows);
  const reviews = records
    .map(normalizeReview)
    .filter((review) => review.reviewTitle || review.reviewBody);

  if (!header.includes("ASIN")) {
    warnings.push("ASIN column was not found in the detected header.");
  }

  if (!header.includes("内容")) {
    warnings.push("Review body column was not found in the detected header.");
  }

  return {
    fileName,
    fileType,
    sheetNames: parsedSheets.map((sheet) => sheet.name),
    selectedSheet: selectedSheet.name,
    totalRows: reviews.length,
    header,
    warnings,
    stats: buildStats(reviews),
    sampleRows: reviews.slice(0, 5),
  } satisfies ImportPreview;
}
