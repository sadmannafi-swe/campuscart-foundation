-- ============================================================================
-- Production hardening + seller order e-mails
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Listings can only be created/edited inside the seller's OWN store and
--    that store's university marketplace (previously any store_id was accepted).
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Owner manages own products insert" ON public.seller_products;
DROP POLICY IF EXISTS "Owner manages own products update" ON public.seller_products;

CREATE POLICY "Owner manages own products insert" ON public.seller_products FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.stores s
      WHERE s.id = store_id AND s.user_id = auth.uid() AND s.university_slug = seller_products.university_slug
    )
  );
CREATE POLICY "Owner manages own products update" ON public.seller_products FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.stores s
      WHERE s.id = store_id AND s.user_id = auth.uid() AND s.university_slug = seller_products.university_slug
    )
  );

-- ---------------------------------------------------------------------------
-- 2. Moderation fields are admin-only. Sellers could previously set their own
--    sellers.status, and approved stores could not save description/contact.
-- ---------------------------------------------------------------------------
-- Not SECURITY DEFINER: current_user must be the calling role.
CREATE OR REPLACE FUNCTION public.guard_seller_moderation()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF current_user IN ('authenticated', 'anon') AND NOT public.has_role(auth.uid(), 'admin') THEN
    IF TG_OP = 'INSERT' THEN
      NEW.status := 'pending';
    ELSE
      NEW.status := OLD.status;
      NEW.user_id := OLD.user_id;
      NEW.university_slug := OLD.university_slug;
    END IF;
  END IF;
  RETURN NEW;
END; $$;
REVOKE EXECUTE ON FUNCTION public.guard_seller_moderation() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS sellers_guard_moderation ON public.sellers;
CREATE TRIGGER sellers_guard_moderation BEFORE INSERT OR UPDATE ON public.sellers
  FOR EACH ROW EXECUTE FUNCTION public.guard_seller_moderation();

-- Not SECURITY DEFINER: current_user must be the calling role.
CREATE OR REPLACE FUNCTION public.guard_store_moderation()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF current_user IN ('authenticated', 'anon') AND NOT public.has_role(auth.uid(), 'admin') THEN
    IF TG_OP = 'INSERT' THEN
      NEW.status := 'pending';
      NEW.rejection_reason := NULL;
      NEW.approved_at := NULL;
    ELSE
      -- Sellers may edit description, contact number and logo only.
      NEW.status := OLD.status;
      NEW.rejection_reason := OLD.rejection_reason;
      NEW.approved_at := OLD.approved_at;
      NEW.name := OLD.name;
      NEW.category := OLD.category;
      NEW.university_slug := OLD.university_slug;
      NEW.user_id := OLD.user_id;
      NEW.seller_id := OLD.seller_id;
    END IF;
  END IF;
  RETURN NEW;
END; $$;
REVOKE EXECUTE ON FUNCTION public.guard_store_moderation() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS stores_guard_moderation ON public.stores;
CREATE TRIGGER stores_guard_moderation BEFORE INSERT OR UPDATE ON public.stores
  FOR EACH ROW EXECUTE FUNCTION public.guard_store_moderation();

DROP POLICY IF EXISTS "Owner updates own store" ON public.stores;
CREATE POLICY "Owner updates own store" ON public.stores FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- The store must belong to the seller account of the same user.
DROP POLICY IF EXISTS "Owner creates own store" ON public.stores;
CREATE POLICY "Owner creates own store" ON public.stores FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.sellers sl
      WHERE sl.id = seller_id AND sl.user_id = auth.uid() AND sl.university_slug = stores.university_slug
    )
  );

-- ---------------------------------------------------------------------------
-- 3. Conversations are opened only through open_product_chat(), which fills in
--    the real seller/product. Direct inserts allowed forged conversations.
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Buyers create conversations" ON public.chat_conversations;
REVOKE INSERT, UPDATE ON public.chat_conversations FROM authenticated;
REVOKE UPDATE ON public.chat_messages FROM authenticated;

-- Notifications: users may only flip read_at.
REVOKE UPDATE ON public.notifications FROM authenticated;
GRANT UPDATE (read_at) ON public.notifications TO authenticated;

-- ---------------------------------------------------------------------------
-- 4. Order lifecycle: sellers move orders forward only; delivered/cancelled
--    are final. Buyers can cancel while the order is still pending.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.order_status_rank(_s public.order_status)
RETURNS integer LANGUAGE sql IMMUTABLE SET search_path TO 'public' AS $$
  SELECT CASE _s
    WHEN 'pending' THEN 0 WHEN 'confirmed' THEN 1 WHEN 'processing' THEN 2
    WHEN 'shipped' THEN 3 WHEN 'delivered' THEN 4 ELSE 5 END
$$;

CREATE OR REPLACE FUNCTION public.update_order_status(_order_id uuid, _status public.order_status)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE _current public.order_status;
BEGIN
  SELECT status INTO _current FROM orders WHERE id = _order_id AND seller_user_id = auth.uid() FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Order not found'; END IF;
  IF _current = _status THEN RETURN; END IF;
  IF _current IN ('delivered', 'cancelled') THEN
    RAISE EXCEPTION 'This order is already % and cannot be changed', _current;
  END IF;
  IF _status <> 'cancelled' AND public.order_status_rank(_status) < public.order_status_rank(_current) THEN
    RAISE EXCEPTION 'Order status can only move forward';
  END IF;
  UPDATE orders SET status = _status WHERE id = _order_id;
END; $$;
REVOKE EXECUTE ON FUNCTION public.update_order_status(uuid, public.order_status) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.update_order_status(uuid, public.order_status) TO authenticated;

CREATE OR REPLACE FUNCTION public.cancel_my_order(_order_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Please log in'; END IF;
  UPDATE orders SET status = 'cancelled'
  WHERE id = _order_id AND buyer_id = auth.uid() AND status = 'pending';
  IF NOT FOUND THEN RAISE EXCEPTION 'Only pending orders can be cancelled. Please contact the seller.'; END IF;
END; $$;
REVOKE EXECUTE ON FUNCTION public.cancel_my_order(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.cancel_my_order(uuid) TO authenticated;

-- Cap the cart size accepted by place_order (abuse guard).
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
  IF jsonb_array_length(_items) > 50 THEN RAISE EXCEPTION 'Too many items in one order'; END IF;

  CREATE TEMP TABLE _req ON COMMIT DROP AS
    SELECT (e->>'product_id')::uuid AS product_id, least(99, sum(greatest(1, least(99, coalesce((e->>'quantity')::int, 1)))))::int AS qty
    FROM jsonb_array_elements(_items) e GROUP BY 1;

  IF EXISTS (
    SELECT 1 FROM _req r LEFT JOIN seller_products p ON p.id = r.product_id LEFT JOIN stores s ON s.id = p.store_id
    WHERE p.id IS NULL OR NOT p.is_active OR NOT p.in_stock OR s.status <> 'approved'
  ) THEN RAISE EXCEPTION 'One or more products are no longer available'; END IF;

  IF EXISTS (
    SELECT 1 FROM _req r JOIN seller_products p ON p.id = r.product_id JOIN stores s ON s.id = p.store_id
    WHERE s.user_id = _uid
  ) THEN RAISE EXCEPTION 'You cannot order from your own store'; END IF;

  FOR _store IN
    SELECT DISTINCT s.id, s.seller_id, s.user_id, s.university_slug
    FROM _req r JOIN seller_products p ON p.id = r.product_id JOIN stores s ON s.id = p.store_id
  LOOP
    SELECT sum(p.price * r.qty) INTO _sub FROM _req r JOIN seller_products p ON p.id = r.product_id WHERE p.store_id = _store.id;
    INSERT INTO orders (buyer_id, store_id, seller_id, seller_user_id, university_slug, customer_name, customer_phone, delivery_address, note, subtotal, shipping_fee, total)
    VALUES (_uid, _store.id, _store.seller_id, _store.user_id, _store.university_slug, left(trim(_name), 80), left(trim(_phone), 20), left(trim(_address), 300), left(coalesce(_note,''),300), _sub, 0, _sub)
    RETURNING id INTO _order_id;
    INSERT INTO order_items (order_id, product_id, product_name, product_image, unit_price, quantity, line_total)
    SELECT _order_id, p.id, p.name, p.images->>0, p.price, r.qty, p.price * r.qty
    FROM _req r JOIN seller_products p ON p.id = r.product_id WHERE p.store_id = _store.id;
    _ids := _ids || _order_id;
  END LOOP;
  RETURN _ids;
END; $function$;
REVOKE EXECUTE ON FUNCTION public.place_order(jsonb,text,text,text,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.place_order(jsonb,text,text,text,text) TO authenticated;

-- ---------------------------------------------------------------------------
-- 5. Seller new-order e-mails (sent through Gmail by the app server).
-- ---------------------------------------------------------------------------
ALTER TABLE public.sellers ADD COLUMN IF NOT EXISTS order_email_enabled boolean NOT NULL DEFAULT true;
ALTER TABLE public.sellers ADD COLUMN IF NOT EXISTS notification_email text;
ALTER TABLE public.sellers DROP CONSTRAINT IF EXISTS sellers_notification_email_format;
ALTER TABLE public.sellers ADD CONSTRAINT sellers_notification_email_format
  CHECK (notification_email IS NULL OR notification_email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$');

CREATE TABLE IF NOT EXISTS public.email_outbox (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text NOT NULL,
  order_id uuid REFERENCES public.orders(id) ON DELETE CASCADE,
  to_email text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sending', 'sent', 'failed')),
  attempts integer NOT NULL DEFAULT 0,
  last_error text,
  locked_at timestamptz,
  sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (kind, order_id)
);
CREATE INDEX IF NOT EXISTS email_outbox_pending_idx ON public.email_outbox(status, created_at);
-- Server-only queue: no access for anon/authenticated.
REVOKE ALL ON public.email_outbox FROM anon, authenticated;
GRANT ALL ON public.email_outbox TO service_role;
ALTER TABLE public.email_outbox ENABLE ROW LEVEL SECURITY;

-- Atomically claim queued e-mails (skips rows another worker holds).
CREATE OR REPLACE FUNCTION public.claim_email_outbox(_limit integer DEFAULT 20, _order_ids uuid[] DEFAULT NULL)
RETURNS SETOF public.email_outbox LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  -- Release rows left in "sending" by a crashed worker.
  UPDATE email_outbox SET status = 'pending', locked_at = NULL
  WHERE status = 'sending' AND locked_at < now() - interval '10 minutes';

  RETURN QUERY
  UPDATE email_outbox o SET status = 'sending', locked_at = now(), attempts = o.attempts + 1
  WHERE o.id IN (
    SELECT q.id FROM email_outbox q
    WHERE q.status = 'pending'
      AND q.created_at > now() - interval '3 days'
      AND (_order_ids IS NULL OR q.order_id = ANY(_order_ids))
    ORDER BY q.created_at
    LIMIT greatest(1, least(_limit, 100))
    FOR UPDATE SKIP LOCKED
  )
  RETURNING o.*;
END; $$;
REVOKE EXECUTE ON FUNCTION public.claim_email_outbox(integer, uuid[]) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_email_outbox(integer, uuid[]) TO service_role;

CREATE OR REPLACE FUNCTION public.queue_seller_order_email()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE _to text;
BEGIN
  SELECT nullif(trim(coalesce(s.notification_email, s.email)), '') INTO _to
  FROM sellers s WHERE s.id = NEW.seller_id AND s.order_email_enabled;
  IF _to IS NOT NULL THEN
    INSERT INTO email_outbox (kind, order_id, to_email)
    VALUES ('seller_new_order', NEW.id, _to)
    ON CONFLICT (kind, order_id) DO NOTHING;
  END IF;
  RETURN NEW;
END; $$;
REVOKE EXECUTE ON FUNCTION public.queue_seller_order_email() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS orders_queue_seller_email ON public.orders;
CREATE TRIGGER orders_queue_seller_email AFTER INSERT ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.queue_seller_order_email();
