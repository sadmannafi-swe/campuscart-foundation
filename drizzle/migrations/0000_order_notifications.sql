CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  kind text NOT NULL,
  title text NOT NULL,
  body text NOT NULL DEFAULT '',
  order_id uuid REFERENCES public.orders(id) ON DELETE CASCADE,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX notifications_user_idx ON public.notifications(user_id, created_at DESC);
GRANT SELECT, UPDATE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own notifications" ON public.notifications FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users mark own notifications" ON public.notifications FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.notify_order_event()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE _ref text := '#' || upper(left(NEW.id::text, 8));
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO notifications (user_id, kind, title, body, order_id)
    VALUES (NEW.seller_user_id, 'new_order', 'New order received', 'Order ' || _ref || ' from ' || NEW.customer_name || ' · ৳' || NEW.total, NEW.id);
  ELSIF NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO notifications (user_id, kind, title, body, order_id)
    VALUES (NEW.buyer_id, 'order_status', 'Order status updated', 'Order ' || _ref || ' is now ' || NEW.status, NEW.id);
    IF NEW.status = 'cancelled' THEN
      INSERT INTO notifications (user_id, kind, title, body, order_id)
      VALUES (NEW.seller_user_id, 'order_status', 'Order cancelled', 'Order ' || _ref || ' was cancelled', NEW.id);
    END IF;
  END IF;
  RETURN NEW;
END; $$;
REVOKE EXECUTE ON FUNCTION public.notify_order_event() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER orders_notify AFTER INSERT OR UPDATE OF status ON public.orders FOR EACH ROW EXECUTE FUNCTION public.notify_order_event();

INSERT INTO public.notifications (user_id, kind, title, body, order_id, read_at)
SELECT seller_user_id, 'new_order', 'New order received', 'Order #' || upper(left(id::text,8)) || ' from ' || customer_name, id, now() FROM public.orders;