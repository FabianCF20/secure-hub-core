import { describe, expect, it } from "vitest";
import { normalizeUserRole } from "@/lib/roles";
import { getNavItemsForRole } from "@/config/navigation";

describe("normalizeUserRole", () => {
  it("recognizes the analyst role without changing its permissions", () => {
    expect(normalizeUserRole("analista")).toBe("ANALISTA");
  });

  it("preserves the legacy operational role mapping", () => {
    expect(normalizeUserRole("operativo")).toBe("GUARDA");
  });

  it("rejects unknown roles", () => {
    expect(normalizeUserRole("ROOT")).toBeUndefined();
  });
});

describe("navigation by role", () => {
  it("limits analysts to the Intelligence section", () => {
    const items = getNavItemsForRole("ANALISTA");
    expect(items.map((item) => item.label)).toEqual(["Inteligencia"]);
  });

  it("shows the field report action to guards, not analysts", () => {
    const guardLabels = getNavItemsForRole("GUARDA").map((item) => item.label);
    const analystLabels = getNavItemsForRole("ANALISTA").map((item) => item.label);

    expect(guardLabels).toContain("Reportar observación");
    expect(analystLabels).not.toContain("Reportar observación");
  });
});
