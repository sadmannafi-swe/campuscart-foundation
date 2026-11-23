import { Router } from "express";
import type { ScopedSearchResult } from "../../shared/types";
import { col } from "../lib/db";
import { marketplaceParam } from "../lib/http";
import { optionalUser, sortParam, strParam, textMatch } from "../lib/modules";
import { marketplaceProducts } from "./public";
import { preownedFilter, preownedToApi } from "./preowned";

/**
 * Global search with an explicit scope. "marketplace" (the default) reads only the
 * Marketplace products collection; "preowned" reads only Pre-Owned listings; "all"
 * returns both, kept in separate, labelled lists.
 */
export const searchRouter = Router();

searchRouter.get("/search", async (req, res) => {
  const university = marketplaceParam(req.query["university"]);
  const scope = sortParam(req.query["scope"], ["marketplace", "preowned", "all"], "marketplace") as
    "marketplace" | "preowned" | "all";
  const q = strParam(req.query["q"]) ?? "";
  const out: ScopedSearchResult = { scope, marketplace: [], preowned: [] };
  if (scope !== "preowned") {
    const re = textMatch(q);
    out.marketplace = await marketplaceProducts(
      university,
      q ? { $or: [{ name: re }, { description: re }, { category: re }] } : {},
    );
  }
  if (scope !== "marketplace") {
    const docs = await col
      .preowned()
      .find(preownedFilter(req, university))
      .sort({ created_at: -1 })
      .limit(200)
      .toArray();
    out.preowned = await preownedToApi(docs, await optionalUser(req));
  }
  res.json(out);
});
