import { Platform, Share } from "react-native";
import * as DocumentPicker from "expo-document-picker";
import { File } from "expo-file-system";
import {
  NOUN,
  TEMPLATE_COLUMNS,
  type SetupKind,
} from "../../domain/classes/setup";

export function downloadTemplate(kind: SetupKind) {
  const example =
    kind === "lab"
      ? [
          "AI Systems Lab 3",
          "B.Tech CSE",
          "Computing",
          "2026",
          "CSE-5A",
          "5",
          "faculty@college.edu",
          "Lab",
          "Continuous",
          "2026-09-28",
          "2026-12-18",
          "Wednesday",
          "11:00",
          "13:00",
          "Engineering Block",
          "L-12",
          "30",
        ]
      : [
          "Data Structures",
          "B.Tech CSE",
          "Computing",
          "2026",
          "CSE-5A",
          "5",
          "faculty@college.edu",
          "Lecture",
          "Snapshot",
          "2026-09-28",
          "2026-12-18",
          "Monday",
          "09:00",
          "10:00",
          "Engineering Block",
          "204",
          "",
        ];
  const header = TEMPLATE_COLUMNS.map((k) =>
    k === "class_name" ? `${kind}_name` : k,
  );
  const csv = [header.join(","), example.join(",")].join("\r\n");
  saveCsv(
    `${kind}_upload_template.csv`,
    `${NOUN[kind].title} upload template`,
    csv,
  );
}

/** Downloads a CSV on web; on iOS / Android hands it to the share sheet
 * (save to Files, mail it, open it in a spreadsheet app). */
export function saveCsv(fileName: string, title: string, csv: string) {
  if (Platform.OS !== "web") {
    void Share.share({ title, message: csv });
    return;
  }
  const url = URL.createObjectURL(
    new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Opens the system file picker (browser, iOS Files, Android documents). */
export async function pickCsv(): Promise<
  { name: string; text: string } | { error: string } | undefined
> {
  const result = await DocumentPicker.getDocumentAsync({
    type: [
      "text/csv",
      "text/comma-separated-values",
      "application/csv",
      "text/plain",
    ],
    copyToCacheDirectory: true,
  });
  if (result.canceled || !result.assets?.length) return undefined;
  const asset = result.assets[0];
  if (asset.size && asset.size > 5 * 1024 * 1024)
    return { error: "Choose a CSV smaller than 5 MB." };
  if (!/\.csv$/i.test(asset.name))
    return { error: "Please choose a .csv file." };
  // The web picker returns a browser File; native returns a file URI.
  const text = asset.file
    ? await asset.file.text()
    : await new File(asset.uri).text();
  return { name: asset.name, text };
}
