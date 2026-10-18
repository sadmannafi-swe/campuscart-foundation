CREATE TABLE public.product_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id),
  product_id uuid NOT NULL REFERENCES public.seller_products(id),
  buyer_id uuid NOT NULL,
  rating integer NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (order_id, product_id)
);
GRANT SELECT ON public.product_reviews TO authenticated;
GRANT ALL ON public.product_reviews TO service_role;
ALTER TABLE public.product_reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Buyers read own reviews" ON public.product_reviews FOR SELECT TO authenticated USING (buyer_id = auth.uid());
CREATE INDEX product_reviews_product_idx ON public.product_reviews(product_id);

CREATE FUNCTION public.submit_product_review(_order_id uuid, _product_id uuid, _rating integer, _comment text DEFAULT '') RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _uid uuid := auth.uid(); _id uuid;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Please log in to review your purchase'; END IF;
  IF _rating IS NULL OR _rating < 1 OR _rating > 5 THEN RAISE EXCEPTION 'Choose a rating from 1 to 5'; END IF;
  PERFORM 1 FROM public.orders o WHERE o.id = _order_id AND o.buyer_id = _uid AND o.status = 'delivered' FOR SHARE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Only your delivered purchases can be reviewed'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.order_items i WHERE i.order_id = _order_id AND i.product_id = _product_id) THEN
    RAISE EXCEPTION 'This product is not part of your order';
  END IF;
  INSERT INTO public.product_reviews(order_id, product_id, buyer_id, rating, comment)
  VALUES (_order_id, _product_id, _uid, _rating, trim(coalesce(_comment, ''))) RETURNING id INTO _id;
  RETURN _id;
EXCEPTION WHEN unique_violation THEN RAISE EXCEPTION 'You have already reviewed this product for this order';
END; $$;
REVOKE ALL ON FUNCTION public.submit_product_review(uuid, uuid, integer, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.submit_product_review(uuid, uuid, integer, text) TO authenticated;

CREATE FUNCTION public.get_product_reviews(_product_id uuid)
RETURNS TABLE (id uuid, author text, rating integer, comment text, created_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT r.id, coalesce(nullif(trim(p.full_name), ''), 'CampusCart buyer'), r.rating, r.comment, r.created_at
  FROM public.product_reviews r LEFT JOIN public.profiles p ON p.id = r.buyer_id
  WHERE r.product_id = _product_id AND EXISTS (
    SELECT 1 FROM public.seller_products sp JOIN public.stores s ON s.id = sp.store_id
    WHERE sp.id = r.product_id AND sp.is_active AND s.status = 'approved'
  ) ORDER BY r.created_at DESC;
$$;
REVOKE ALL ON FUNCTION public.get_product_reviews(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_product_reviews(uuid) TO anon, authenticated;