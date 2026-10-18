CREATE TABLE public.chat_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.seller_products(id) ON DELETE CASCADE,
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  seller_user_id uuid NOT NULL,
  buyer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  university_slug text NOT NULL REFERENCES public.universities(slug),
  product_name text NOT NULL,
  product_price numeric NOT NULL,
  product_image text,
  buyer_name text NOT NULL DEFAULT '',
  first_message_at timestamptz,
  last_message_at timestamptz,
  last_message_preview text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX chat_conversations_buyer_product ON public.chat_conversations(buyer_id, product_id);
GRANT SELECT, INSERT, UPDATE ON public.chat_conversations TO authenticated;
GRANT ALL ON public.chat_conversations TO service_role;
ALTER TABLE public.chat_conversations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Participants view conversations" ON public.chat_conversations FOR SELECT TO authenticated USING (auth.uid() = buyer_id OR auth.uid() = seller_user_id);
CREATE POLICY "Buyers create conversations" ON public.chat_conversations FOR INSERT TO authenticated WITH CHECK (auth.uid() = buyer_id);

CREATE TABLE public.chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.chat_conversations(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL,
  sender_role text NOT NULL CHECK (sender_role IN ('buyer','seller')),
  body text NOT NULL,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX chat_messages_conversation ON public.chat_messages(conversation_id, created_at);
GRANT SELECT, UPDATE ON public.chat_messages TO authenticated;
GRANT ALL ON public.chat_messages TO service_role;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Participants view messages" ON public.chat_messages FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.chat_conversations c WHERE c.id = conversation_id AND (c.buyer_id = auth.uid() OR c.seller_user_id = auth.uid())));

CREATE OR REPLACE FUNCTION public.open_product_chat(_product_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $fn$
DECLARE
  _uid uuid := auth.uid();
  _p record;
  _id uuid;
  _name text;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Please log in to chat with the seller'; END IF;
  SELECT p.id, p.store_id, p.name, p.price, p.images->>0 AS image, p.university_slug, s.user_id AS seller_user_id
    INTO _p
  FROM public.seller_products p
  JOIN public.stores s ON s.id = p.store_id
  WHERE p.id = _product_id AND p.is_active AND s.status = 'approved';
  IF NOT FOUND THEN RAISE EXCEPTION 'This product is no longer available'; END IF;
  IF _p.seller_user_id = _uid THEN RAISE EXCEPTION 'You cannot chat about your own product'; END IF;

  SELECT id INTO _id FROM public.chat_conversations WHERE buyer_id = _uid AND product_id = _product_id;
  IF FOUND THEN RETURN _id; END IF;

  SELECT coalesce(nullif(trim(full_name), ''), 'CampusCart buyer') INTO _name FROM public.profiles WHERE id = _uid;

  INSERT INTO public.chat_conversations (product_id, store_id, seller_user_id, buyer_id, university_slug, product_name, product_price, product_image, buyer_name)
  VALUES (_p.id, _p.store_id, _p.seller_user_id, _uid, _p.university_slug, _p.name, _p.price, _p.image, coalesce(_name, 'CampusCart buyer'))
  RETURNING id INTO _id;
  RETURN _id;
END;
$fn$;

CREATE OR REPLACE FUNCTION public.send_chat_message(_conversation_id uuid, _body text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $fn$
DECLARE
  _uid uuid := auth.uid();
  _c record;
  _role text;
  _id uuid;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Please log in to send messages'; END IF;
  IF length(trim(coalesce(_body, ''))) < 1 THEN RAISE EXCEPTION 'Message cannot be empty'; END IF;
  SELECT * INTO _c FROM public.chat_conversations WHERE id = _conversation_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Conversation not found'; END IF;
  IF _c.buyer_id = _uid THEN
    _role := 'buyer';
  ELSIF _c.seller_user_id = _uid THEN
    IF _c.first_message_at IS NULL THEN RAISE EXCEPTION 'Sellers can only reply after the buyer sends the first message'; END IF;
    _role := 'seller';
  ELSE
    RAISE EXCEPTION 'You are not part of this conversation';
  END IF;

  INSERT INTO public.chat_messages (conversation_id, sender_id, sender_role, body)
  VALUES (_conversation_id, _uid, _role, left(trim(_body), 1000))
  RETURNING id INTO _id;

  UPDATE public.chat_conversations
  SET last_message_at = now(),
      last_message_preview = left(trim(_body), 120),
      first_message_at = coalesce(first_message_at, now())
  WHERE id = _conversation_id;
  RETURN _id;
END;
$fn$;

CREATE OR REPLACE FUNCTION public.mark_chat_read(_conversation_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $fn$
DECLARE _uid uuid := auth.uid();
BEGIN
  IF _uid IS NULL THEN RETURN; END IF;
  UPDATE public.chat_messages m
  SET read_at = now()
  WHERE m.conversation_id = _conversation_id
    AND m.read_at IS NULL
    AND m.sender_id <> _uid
    AND EXISTS (SELECT 1 FROM public.chat_conversations c WHERE c.id = _conversation_id AND (c.buyer_id = _uid OR c.seller_user_id = _uid));
END;
$fn$;