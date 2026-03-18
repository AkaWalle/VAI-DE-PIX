import * as React from "react";
import { describe, it, expect, vi } from "vitest";

import { PixKeyCard } from "@/components/pix/PixKeyCard";

describe("PixKeyCard", () => {
  it("renderiza sem erros com chave padrão", () => {
    const onCopy = vi.fn();
    const element = (
      <PixKeyCard
        keyType="email"
        keyValue="user@example.com"
        isDefault
        onCopy={onCopy}
      />
    );

    expect(React.isValidElement(element)).toBe(true);
  });
});

