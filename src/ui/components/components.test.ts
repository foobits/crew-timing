import { describe, expect, it } from "vitest";
import { escapeAttr } from "../../lib/ui-helpers";
import { renderActionBanner, renderBanner } from "./banner";
import { renderCard, renderSectionHeader } from "./card";
import { renderButton } from "./button";
import { renderCheckboxField, renderSelectField, renderTextField } from "./field";
import { renderToggleGroup } from "./toggle-group";

describe("renderButton", () => {
  it("renders action buttons with variants", () => {
    expect(renderButton({ label: "Calculate", variant: "primary", action: "calculate" })).toBe(
      '<button type="button" class="btn btn-primary" data-action="calculate">Calculate</button>',
    );
  });

  it("renders data attributes and disabled state", () => {
    const html = renderButton({
      label: "Clear",
      variant: "small",
      disabled: true,
      data: { "clear-lane": 2 },
      ariaLabel: "Clear lane 2",
    });

    expect(html).toContain('data-clear-lane="2"');
    expect(html).toContain("disabled");
    expect(html).toContain('aria-label="Clear lane 2"');
  });
});

describe("renderTextField", () => {
  it("renders a labeled input with optional format hint", () => {
    const html = renderTextField({
      id: "start-ts",
      label: "Start time",
      formatHint: "HH:MM:SS.SSS",
      value: "10:05:03.111",
      placeholder: "00:00:00.000",
      inputmode: "decimal",
    });

    expect(html).toContain('for="start-ts"');
    expect(html).toContain('<span class="label-format">HH:MM:SS.SSS</span>');
    expect(html).toContain(`value="${escapeAttr("10:05:03.111")}"`);
  });
});

describe("renderSelectField", () => {
  it("marks the selected option", () => {
    const html = renderSelectField({
      id: "ref-lane",
      label: "Reference lane",
      value: 3,
      options: [
        { value: 2, label: "2" },
        { value: 3, label: "3" },
      ],
    });

    expect(html).toContain('<option value="3" selected>3</option>');
    expect(html).not.toContain('<option value="2" selected>');
  });
});

describe("renderCheckboxField", () => {
  it("reflects checked state", () => {
    expect(renderCheckboxField({ id: "start-confirmed", label: "Confirm", checked: true })).toContain(
      "checked",
    );
  });
});

describe("renderToggleGroup", () => {
  it("renders segmented buttons with data attributes", () => {
    const html = renderToggleGroup({
      ariaLabel: "Sort results",
      options: [
        {
          label: "Place",
          selected: true,
          ariaPressed: true,
          dataAttrs: { "results-sort": "place" },
        },
        {
          label: "Lane",
          selected: false,
          ariaPressed: false,
          dataAttrs: { "results-sort": "lane" },
        },
      ],
    });

    expect(html).toContain('aria-label="Sort results"');
    expect(html).toContain('data-results-sort="place"');
    expect(html).toContain('class="lane-status-btn selected"');
  });
});

describe("renderBanner", () => {
  it("renders status banners and action banners", () => {
    expect(renderBanner("Saved draft")).toContain('role="status"');
    expect(renderActionBanner("undo", "Undo last clear")).toContain('data-action="undo"');
  });
});

describe("renderCard", () => {
  it("renders a card shell with optional id and class", () => {
    expect(renderCard({ content: "<p>Body</p>" })).toContain('class="card"');
    expect(renderCard({ id: "lanes-section", className: "highlight", content: "Lanes" })).toContain(
      'id="lanes-section"',
    );
    expect(renderSectionHeader("Lanes", "<button>Add</button>")).toContain("<button>Add</button>");
  });
});
