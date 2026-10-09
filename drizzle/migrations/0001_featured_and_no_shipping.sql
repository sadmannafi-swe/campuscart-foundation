ALTER TABLE public.stores ADD COLUMN featured_university_slug text REFERENCES public.universities(slug);
ALTER TABLE public.seller_products ADD COLUMN featured_university_slug text REFERENCES public.universities(slug);

CREATE OR REPLACE FUNCTION public.guard_featured()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF current_user IN ('authenticated','anon') THEN
    IF TG_OP = 'INSERT' THEN NEW.featured_university_slug := NULL;
    ELSE NEW.featured_university_slug := OLD.featured_university_slug; END IF;
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER stores_guard_featured BEFORE INSERT OR UPDATE ON public.stores FOR EACH ROW EXECUTE FUNCTION public.guard_featured();
CREATE TRIGGER products_guard_featured BEFORE INSERT OR UPDATE ON public.seller_products FOR EACH ROW EXECUTE FUNCTION public.guard_featured();

CREATE OR REPLACE FUNCTION public.place_order(_items jsonb, _name text, _phone text, _address text, _note text DEFAULT ''::text)
 RETURNS uuid[] LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  _uid uuid := auth.uid();
  _store record;
  _order_id uuid;
  _ids uuid[] := '{}';
  _sub numeric;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Please log in to place an order'; END IF;
  IF length(trim(coalesce(_name,''))) < 2 OR length(trim(coalesce(_phone,''))) < 6 OR length(trim(coalesce(_address,''))) < 3 THEN
    RAISE EXCEPTION 'Please fill in your name, phone and delivery address';
  END IF;
  IF jsonb_typeof(_items) <> 'array' OR jsonb_array_length(_items) = 0 THEN RAISE EXCEPTION 'No items to order'; END IF;

  CREATE TEMP TABLE _req ON COMMIT DROP AS
    SELECT (e->>'product_id')::uuid AS product_id, sum(greatest(1, least(99, (e->>'quantity')::int)))::int AS qty
    FROM jsonb_array_elements(_items) e GROUP BY 1;

  IF EXISTS (
    SELECT 1 FROM _req r LEFT JOIN seller_products p ON p.id = r.product_id LEFT JOIN stores s ON s.id = p.store_id
    WHERE p.id IS NULL OR NOT p.is_active OR NOT p.in_stock OR s.status <> 'approved'
  ) THEN RAISE EXCEPTION 'One or more products are no longer available'; END IF;

  FOR _store IN
    SELECT DISTINCT s.id, s.seller_id, s.user_id, s.university_slug
    FROM _req r JOIN seller_products p ON p.id = r.product_id JOIN stores s ON s.id = p.store_id
  LOOP
    SELECT sum(p.price * r.qty) INTO _sub FROM _req r JOIN seller_products p ON p.id = r.product_id WHERE p.store_id = _store.id;
    INSERT INTO orders (buyer_id, store_id, seller_id, seller_user_id, university_slug, customer_name, customer_phone, delivery_address, note, subtotal, shipping_fee, total)
    VALUES (_uid, _store.id, _store.seller_id, _store.user_id, _store.university_slug, trim(_name), trim(_phone), trim(_address), left(coalesce(_note,''),300), _sub, 0, _sub)
    RETURNING id INTO _order_id;
    INSERT INTO order_items (order_id, product_id, product_name, product_image, unit_price, quantity, line_total)
    SELECT _order_id, p.id, p.name, p.images->>0, p.price, r.qty, p.price * r.qty
    FROM _req r JOIN seller_products p ON p.id = r.product_id WHERE p.store_id = _store.id;
    _ids := _ids || _order_id;
  END LOOP;
  RETURN _ids;
END; $function$;