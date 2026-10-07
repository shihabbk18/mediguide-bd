import { it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import App from "../App";
function selectNapa() {
  fireEvent.change(screen.getByRole("searchbox"), {
    target: { value: "Napa 500" },
  });
  fireEvent.click(
    screen.getByRole("button", {
      name: "Check this product: Napa 500 mg Tablet IMMEDIATE",
    }),
  );
}
it("requires exact confirmation before medical guidance is displayed", () => {
  render(<App />);
  selectNapa();
  expect(screen.getByText("MEDICINE IDENTIFIED")).toBeInTheDocument();
  expect(screen.queryByText("Before or after food?")).not.toBeInTheDocument();
  fireEvent.click(
    screen.getByRole("button", { name: "Yes, this is my medicine" }),
  );
  expect(screen.getByText("Before or after food?")).toBeInTheDocument();
  expect(
    screen.getByText("Can generally be taken with or without food."),
  ).toBeInTheDocument();
  expect(
    screen.getAllByRole("link", { name: /NHS — Paracetamol/ }).length,
  ).toBeGreaterThan(0);
});
it("shows NOT AVAILABLE for an unverified combination", () => {
  render(<App />);
  fireEvent.change(screen.getByRole("searchbox"), {
    target: { value: "Napa Extra" },
  });
  fireEvent.click(
    screen.getByRole("button", { name: /Check this product: Napa Extra/ }),
  );
  fireEvent.click(
    screen.getByRole("button", { name: "Yes, this is my medicine" }),
  );
  expect(screen.getByText("NOT AVAILABLE")).toBeInTheDocument();
  expect(
    screen.getByText(
      "Verified administration guidance is not currently available for this product.",
    ),
  ).toBeInTheDocument();
  expect(screen.queryByText("Before or after food?")).not.toBeInTheDocument();
});
it("English/Bangla toggle changes UI and instructions without translating identity", () => {
  render(<App />);
  selectNapa();
  fireEvent.click(
    screen.getByRole("button", { name: "Yes, this is my medicine" }),
  );
  fireEvent.click(screen.getByRole("button", { name: "বাংলা" }));
  expect(document.documentElement.lang).toBe("bn");
  expect(screen.getByText("খাবারের আগে না পরে?")).toBeInTheDocument();
  expect(
    screen.getByText("খাবারের সঙ্গে বা ছাড়াও নেওয়া যায়।"),
  ).toBeInTheDocument();
  expect(screen.getByText("Beximco Pharmaceuticals Ltd.")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "বাংলা" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  fireEvent.click(screen.getByRole("button", { name: "English" }));
  expect(screen.getByText("Before or after food?")).toBeInTheDocument();
});
it("changing the selected product resets confirmation", () => {
  render(<App />);
  selectNapa();
  fireEvent.click(
    screen.getByRole("button", { name: "Yes, this is my medicine" }),
  );
  fireEvent.click(screen.getByRole("button", { name: "Back to search" }));
  fireEvent.change(screen.getByRole("searchbox"), {
    target: { value: "Seclo 20" },
  });
  fireEvent.click(
    screen.getByRole("button", {
      name: /Check this product: Seclo 20 mg Capsule/,
    }),
  );
  expect(screen.queryByText("Before or after food?")).not.toBeInTheDocument();
  expect(
    screen.getByRole("button", { name: "Yes, this is my medicine" }),
  ).toBeInTheDocument();
});
it("renders graceful unknown search feedback", () => {
  render(<App />);
  fireEvent.change(screen.getByRole("searchbox"), {
    target: { value: "zzzxqvnonexistent" },
  });
  expect(
    screen.getByText("No medicine found in our current catalogue."),
  ).toBeInTheDocument();
});
it("never displays dosage fields and saves only IDs after confirmation", () => {
  render(<App />);
  selectNapa();
  expect(localStorage.getItem("mg-recent")).toBeNull();
  fireEvent.click(
    screen.getByRole("button", { name: "Yes, this is my medicine" }),
  );
  fireEvent.click(screen.getByRole("button", { name: "Save medicine" }));
  expect(JSON.parse(localStorage.getItem("mg-favorites")!)).toEqual(["bd-1"]);
  expect(JSON.parse(localStorage.getItem("mg-recent")!)).toEqual(["bd-1"]);
  expect(screen.queryByText(/Take 2 tablets/i)).not.toBeInTheDocument();
});
