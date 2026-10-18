<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Persist purchase reviews in product_reviews linked to the existing order and product; submit through the authenticated submit_product_review database function so purchase eligibility and uniqueness cannot be bypassed by the UI.
- Public review reads use get_product_reviews, which returns only author name, rating, comment and date for visible listings; never expose buyer identifiers or private profile fields.
