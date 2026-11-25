import { describe, expect, it } from "vitest";
import { conversationPlace } from "./chat";

const conv = (kind: string | undefined) => ({
  buyer_id: "buyer",
  seller_user_id: "owner",
  kind: kind as never,
});

describe("conversationPlace", () => {
  it("opens module chats for both participants in the personal inbox", () => {
    for (const kind of ["preowned", "blood_request", "donor", "basha"]) {
      expect(conversationPlace(conv(kind), "buyer")).toBe("inbox");
      expect(conversationPlace(conv(kind), "owner")).toBe("inbox");
    }
  });

  it("sends the store owner of a Marketplace chat to the seller dashboard", () => {
    expect(conversationPlace(conv("product"), "buyer")).toBe("inbox");
    expect(conversationPlace(conv("product"), "owner")).toBe("seller");
    expect(conversationPlace(conv(undefined), "owner")).toBe("seller");
  });

  it("never opens a conversation for someone who isn't in it", () => {
    expect(conversationPlace(conv("preowned"), "stranger")).toBe("none");
    expect(conversationPlace(conv("product"), "stranger")).toBe("none");
  });
});
