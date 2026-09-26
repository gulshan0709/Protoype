import type { ImageSourcePropType } from "react-native";
import samples from "../../domain/surveillance/samples.json";

// Upgrade only bundled dummy portraits. Uploaded photos retain their exact URI.
const man = require("../../../assets/profiles/demo-man.png");
const woman = require("../../../assets/profiles/demo-woman.png");
const originals = new Map<string, ImageSourcePropType>();
for (const record of Object.values(samples).flat()) {
  if (record.setup.image)
    originals.set(
      record.setup.image,
      ["E1002", "E1003"].includes(record.setup.uid) ? woman : man,
    );
}
export type DemoGender = "man" | "woman";
// First names used by the demo data (mirrors the name pools in contracts/demoVolume.ts).
const women = new Set("Aanya Aditi Ananya Anjali Asha Avni Diya Divya Gauri Ira Isha Ishita Kavya Kiara Meera Mira Naina Neha Nisha Pooja Priya Riya Saanvi Sana Shreya Sneha Tanvi Tara Trisha Anika Pallavi Ritika Sakshi Simran Swati Nandini Kriti Megha Kavita Anita Anaya Devika Lakshmi Radhika Shruti Maya Lena Lina Emma Olivia Sofia Grace Hannah Chloe Nora Ava Leah Zoe Ruby Claire Julia".split(" "));
const men = new Set("Aarav Aditya Akash Amit Arjun Aryan Dev Dhruv Harsh Ishaan Kabir Karan Krish Manav Nikhil Pranav Rahul Rohan Sahil Sameer Siddharth Varun Vihaan Vikram Yash Ayaan Rishi Kunal Tushar Nitin Rajat Gaurav Abhinav Ankit Mohit Ravi Arun Deepak Suresh Manish Sanjay Imran Farhan Owen Liam Noah Ethan Lucas Daniel Marcus Ryan Adam Caleb Nathan Julian Leo Miles Isaac Oscar".split(" "));
/** Demo-only presentation hint from the fictional first name, else the bundled portrait. */
export function demoGender(name?: string, image?: string): DemoGender | undefined {
  const first = (name ?? "").replace(/^(Dr|Prof|Mr|Ms|Mrs)\.?\s+/i, "").split(/\s+/)[0];
  if (women.has(first)) return "woman";
  if (men.has(first)) return "man";
  const portrait = image ? originals.get(image) : undefined;
  return portrait ? (portrait === woman ? "woman" : "man") : undefined;
}
/** Bundled demo portrait for a fictional person without an uploaded photo. */
export function portraitFor(name: string): ImageSourcePropType | undefined {
  const gender = demoGender(name);
  return gender === "woman" ? woman : gender === "man" ? man : undefined;
}
export function demoPortrait(uri: string, name?: string): ImageSourcePropType {
  if (!originals.has(uri)) return { uri };
  return demoGender(name, uri) === "woman" ? woman : man;
}
