import { describe, it, expect } from "vitest";
import * as React from "react";

import { PrimaryButton } from "@/components/ui/PrimaryButton";

describe("PrimaryButton", () => {
  it("pode ser criado sem lançar erro", () => {
    const element = (
      <PrimaryButton onClick={() => {}}>Enviar PIX</PrimaryButton>
    );

    expect(React.isValidElement(element)).toBe(true);
  });
});



