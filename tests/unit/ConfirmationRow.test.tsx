import * as React from "react";
import { describe, it, expect } from "vitest";

import { ConfirmationRow } from "@/components/pix/ConfirmationRow";

describe("ConfirmationRow", () => {
  it("cria um elemento válido com label e value", () => {
    const element = (
      <ConfirmationRow label="Destinatário" value="Jose Wallace" />
    );

    expect(React.isValidElement(element)).toBe(true);
  });
});

