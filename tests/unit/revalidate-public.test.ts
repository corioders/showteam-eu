import { beforeEach, describe, expect, it, vi } from "vitest";

const { revalidatePath } = vi.hoisted(() => ({ revalidatePath: vi.fn() }));

vi.mock("next/cache", () => ({ revalidatePath }));

import { revalidateOffers } from "../../lib/revalidate-public";

describe("public offer revalidation", () => {
  beforeEach(() => revalidatePath.mockClear());

  it("invalidates the homepage and the edited offer immediately", () => {
    revalidateOffers("showzima-2026");

    expect(revalidatePath).toHaveBeenNthCalledWith(1, "/");
    expect(revalidatePath).toHaveBeenNthCalledWith(2, "/oferta/showzima-2026");
  });
});
