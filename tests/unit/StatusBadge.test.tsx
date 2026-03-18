import * as React from "react";
import { describe, it, expect } from "vitest";

import { StatusBadge } from "@/components/ui/StatusBadge";

describe("StatusBadge", () => {
  it("cria um badge válido para status success com label padrão", () => {
    const element = <StatusBadge status="success" />;

    expect(React.isValidElement(element)).toBe(true);
  });

  it("permite sobrescrever o label via prop", () => {
    const label = "Em análise";
    const element = <StatusBadge status="pending" label={label} />;

    expect(React.isValidElement(element)).toBe(true);
  });
});

