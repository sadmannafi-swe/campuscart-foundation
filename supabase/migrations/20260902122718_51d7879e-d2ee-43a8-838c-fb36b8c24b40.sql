CREATE TABLE public.universities (
  slug TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  short_name TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.universities TO anon, authenticated;
GRANT ALL ON public.universities TO service_role;
ALTER TABLE public.universities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Universities are public" ON public.universities FOR SELECT TO anon, authenticated USING (true);

INSERT INTO public.universities (slug, name, short_name, sort_order) VALUES
  ('diu', 'Daffodil International University', 'DIU', 1),
  ('nsu', 'North South University', 'NSU', 2),
  ('brac', 'BRAC University', 'BRAC', 3),
  ('ewu', 'East West University', 'EWU', 4),
  ('du', 'University of Dhaka', 'DU', 5);

CREATE TYPE public.store_status AS ENUM ('pending', 'approved', 'rejected', 'suspended');

CREATE TABLE public.sellers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  university_slug TEXT NOT NULL REFERENCES public.universities(slug),
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  department TEXT NOT NULL,
  batch TEXT NOT NULL,
  avatar_path TEXT,
  status public.store_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.sellers TO authenticated;
GRANT ALL ON public.sellers TO service_role;
ALTER TABLE public.sellers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Sellers view own account" ON public.sellers FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins view all sellers" ON public.sellers FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Sellers create own account" ON public.sellers FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Sellers update own account" ON public.sellers FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins update sellers" ON public.sellers FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER sellers_set_updated_at BEFORE UPDATE ON public.sellers FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.seller_identity (
  seller_id UUID PRIMARY KEY REFERENCES public.sellers(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  student_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.seller_identity TO authenticated;
GRANT ALL ON public.seller_identity TO service_role;
ALTER TABLE public.seller_identity ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner views own seller student id" ON public.seller_identity FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins view seller student ids" ON public.seller_identity FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Owner inserts own seller student id" ON public.seller_identity FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Owner updates own seller student id" ON public.seller_identity FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER seller_identity_set_updated_at BEFORE UPDATE ON public.seller_identity FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.stores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID NOT NULL UNIQUE REFERENCES public.sellers(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  university_slug TEXT NOT NULL REFERENCES public.universities(slug),
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  contact_number TEXT NOT NULL,
  logo_path TEXT,
  status public.store_status NOT NULL DEFAULT 'pending',
  rejection_reason TEXT,
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.stores TO authenticated;
GRANT SELECT ON public.stores TO anon;
GRANT ALL ON public.stores TO service_role;
ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Approved stores are public" ON public.stores FOR SELECT TO anon, authenticated USING (status = 'approved');
CREATE POLICY "Owner views own store" ON public.stores FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins view all stores" ON public.stores FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Owner creates own store" ON public.stores FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Owner updates own store" ON public.stores FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id AND status <> 'approved');
CREATE POLICY "Admins update stores" ON public.stores FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER stores_set_updated_at BEFORE UPDATE ON public.stores FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.seller_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  university_slug TEXT NOT NULL REFERENCES public.universities(slug),
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  price NUMERIC(10,2) NOT NULL CHECK (price >= 0),
  condition TEXT NOT NULL DEFAULT 'new',
  description TEXT NOT NULL DEFAULT '',
  images JSONB NOT NULL DEFAULT '[]'::jsonb,
  in_stock BOOLEAN NOT NULL DEFAULT true,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.seller_products TO authenticated;
GRANT SELECT ON public.seller_products TO anon;
GRANT ALL ON public.seller_products TO service_role;
ALTER TABLE public.seller_products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Active products of approved stores are public" ON public.seller_products FOR SELECT TO anon, authenticated
  USING (is_active AND EXISTS (SELECT 1 FROM public.stores s WHERE s.id = store_id AND s.status = 'approved'));
CREATE POLICY "Owner views own products" ON public.seller_products FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins view all products" ON public.seller_products FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Owner manages own products insert" ON public.seller_products FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Owner manages own products update" ON public.seller_products FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Owner manages own products delete" ON public.seller_products FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE TRIGGER seller_products_set_updated_at BEFORE UPDATE ON public.seller_products FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX seller_products_store_idx ON public.seller_products(store_id);
CREATE INDEX stores_university_idx ON public.stores(university_slug);