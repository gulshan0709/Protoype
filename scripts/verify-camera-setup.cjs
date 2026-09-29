// Checks Customer Admin camera management in Class & Lab Attendance → Sources
// and Gate → Cameras: required fields, several cameras per location, edit,
// confirmed delete, and the phone form.
//
//   npm run test:camera-setup
const assert = require("node:assert/strict");
const {
  PHONE,
  field,
  fillForm,
  main,
  noOverflow,
  open,
  rowAction,
  tab,
} = require("./lib/qa.cjs");

main(async (browser) => {
  const { page, button, errors } = await open(browser);
  for (const [product, view, place, spot] of [
    ["Class & Lab Attendance", "Sources", "Building", "Room number"],
    ["Gate", "Cameras", "Gate", "Lane"],
  ]) {
    await button(product).click();
    await tab(page, view).click();
    await button("Add").click();
    await button("Add camera").click();
    await page.getByText(place + " is required", { exact: true }).waitFor();
    await button("Campus: Choose campus").click();
    await button("Main Campus").click();
    await fillForm(page, {
      [place + " *"]: "QA location",
      [spot + " *"]: "204",
      "Detection *": "0.6",
      "Recognition *": "0.8",
      "Display name *": "QA camera",
      "IP address *": "192.168.1.20",
      "Port *": "554",
      "Camera ID *": "QA-1",
      "User name *": "demo",
      "Password *": "test-only",
    });
    await button("Camera brand: Choose brand").click();
    await button("Axis").click();
    await button("Add another camera").click();
    await button("Remove camera 2").click();
    await button("Add camera").click();
    await rowAction(page, "QA camera", "Edit");
    await field(page, "Port *").fill("8554");
    await button("Save changes").click();
    await rowAction(page, "QA camera", "Delete");
    await button("Cancel").click();
    await rowAction(page, "QA camera", "Delete");
    await button("Delete").click();
    assert.equal(await button("Actions for QA camera").count(), 0);
  }
  await page.setViewportSize(PHONE);
  await button("Add").click();
  await field(page, "Lane *").waitFor();
  assert.ok(await noOverflow(page));
  assert.deepEqual(errors, []);
  console.log(
    "Camera management passed for Class Sources and Gate Cameras, including mobile.",
  );
});
