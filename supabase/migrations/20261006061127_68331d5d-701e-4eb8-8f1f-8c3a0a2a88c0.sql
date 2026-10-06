CREATE TYPE public.order_status AS ENUM ('pending','confirmed','processing','shipped','delivered','cancelled');

CREATE TABLE public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  store_id uuid NOT NULL REFERENCES public.stores(id),
  seller_id uuid NOT NULL REFERENCES public.sellers(id),
  seller_user_id uuid NOT NULL,
  university_slug text NOT NULL REFERENCES public.universities(slug),
  customer_name text NOT NULL,
  customer_phone text NOT NULL,
  delivery_address text NOT NULL,
  note text NOT NULL DEFAULT '',
  subtotal numeric NOT NULL,
  shipping_fee numeric NOT NULL DEFAULT 0,
  total numeric NOT NULL,
  status public.order_status NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.orders TO authenticated;
GRANT ALL ON public.orders TO service_role;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Buyers view own orders" ON public.orders FOR SELECT TO authenticated USING (auth.uid() = buyer_id);
CREATE POLICY "Sellers view store orders" ON public.orders FOR SELECT TO authenticated USING (auth.uid() = seller_user_id);
CREATE POLICY "Admins view all orders" ON public.orders FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER orders_set_updated_at BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX orders_buyer_idx ON public.orders(buyer_id, created_at DESC);
CREATE INDEX orders_seller_idx ON public.orders(seller_user_id, created_at DESC);

CREATE TABLE public.order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id uuid REFERENCES public.seller_products(id) ON DELETE SET NULL,
  product_name text NOT NULL,
  product_image text,
  unit_price numeric NOT NULL,
  quantity integer NOT NULL,
  line_total numeric NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.order_items TO authenticated;
GRANT ALL ON public.order_items TO service_role;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "View items of visible orders" ON public.order_items FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND (o.buyer_id = auth.uid() OR o.seller_user_id = auth.uid() OR public.has_role(auth.uid(),'admin'))));
CREATE INDEX order_items_order_idx ON public.order_items(order_id);

-- Checkout: items = [{"product_id": uuid, "quantity": int}], one order per store, prices from DB.
CREATE OR REPLACE FUNCTION public.place_order(_items jsonb, _name text, _phone text, _address text, _note text DEFAULT '')
RETURNS uuid[] LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _uid uuid := auth.uid();
  _store record;
  _order_id uuid;
  _ids uuid[] := '{}';
  _sub numeric;
  _fee numeric := 60;
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
    VALUES (_uid, _store.id, _store.seller_id, _store.user_id, _store.university_slug, trim(_name), trim(_phone), trim(_address), left(coalesce(_note,''),300), _sub, _fee, _sub + _fee)
    RETURNING id INTO _order_id;
    INSERT INTO order_items (order_id, product_id, product_name, product_image, unit_price, quantity, line_total)
    SELECT _order_id, p.id, p.name, p.images->>0, p.price, r.qty, p.price * r.qty
    FROM _req r JOIN seller_products p ON p.id = r.product_id WHERE p.store_id = _store.id;
    _ids := _ids || _order_id;
  END LOOP;
  RETURN _ids;
END; $$;
REVOKE EXECUTE ON FUNCTION public.place_order(jsonb,text,text,text,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.place_order(jsonb,text,text,text,text) TO authenticated;

CREATE OR REPLACE FUNCTION public.update_order_status(_order_id uuid, _status public.order_status)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE orders SET status = _status WHERE id = _order_id AND seller_user_id = auth.uid();
  IF NOT FOUND THEN RAISE EXCEPTION 'Order not found'; END IF;
END; $$;
REVOKE EXECUTE ON FUNCTION public.update_order_status(uuid, public.order_status) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.update_order_status(uuid, public.order_status) TO authenticated;