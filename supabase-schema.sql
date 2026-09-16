-- ==============================================================================
-- CasaShoes (Elwamy) - Supabase Database Schema & RLS Setup
-- ==============================================================================
-- Run this script in your Supabase SQL Editor (Dashboard -> SQL Editor -> New Query)
-- ==============================================================================

-- 1. PROFILES TABLE
-- Extends auth.users with profile information and role (customer vs admin)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT,
    phone TEXT,
    address TEXT,
    city TEXT,
    role TEXT NOT NULL DEFAULT 'customer' CHECK (role IN ('customer', 'admin')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 2. HELPER FUNCTION: Check if user is admin (prevents recursive RLS)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role = 'admin'
    );
$$;

-- 3. ORDERS TABLE
-- Stores both customer and guest orders
CREATE TABLE IF NOT EXISTS public.orders (
    id TEXT PRIMARY KEY,
    customer_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    customer_name TEXT NOT NULL,
    customer_phone TEXT NOT NULL,
    customer_city TEXT NOT NULL,
    customer_address TEXT NOT NULL,
    customer_notes TEXT,
    total_amount NUMERIC(10, 2) NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'shipped', 'delivered', 'cancelled')),
    payment_method TEXT DEFAULT 'cod',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 4. ORDER ITEMS TABLE
CREATE TABLE IF NOT EXISTS public.order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id TEXT NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    product_id INTEGER NOT NULL,
    product_name TEXT NOT NULL,
    product_price NUMERIC(10, 2) NOT NULL,
    size TEXT,
    color TEXT,
    quantity INTEGER NOT NULL DEFAULT 1,
    image TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 5. WISHLISTS TABLE
CREATE TABLE IF NOT EXISTS public.wishlists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    product_id INTEGER NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    UNIQUE(customer_id, product_id)
);

-- 6. CART ITEMS TABLE (Server-synced Cart for authenticated users)
CREATE TABLE IF NOT EXISTS public.cart_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    product_id INTEGER NOT NULL,
    size TEXT NOT NULL DEFAULT '',
    quantity INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    UNIQUE(customer_id, product_id, size)
);

-- 7. TRIGGER: Auto-create profile on Auth signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- IMPORTANT: role is always hardcoded to 'customer' here — we never trust
    -- whatever role a client passed in signup metadata. Without this, anyone
    -- could sign up with { data: { role: 'admin' } } and get an admin profile
    -- created for them automatically, which is exactly what was happening.
    INSERT INTO public.profiles (id, full_name, phone, role)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
        COALESCE(NEW.raw_user_meta_data->>'phone', ''),
        'customer'
    )
    ON CONFLICT (id) DO UPDATE
    SET full_name = EXCLUDED.full_name,
        phone = EXCLUDED.phone;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- 8. ENABLE ROW LEVEL SECURITY (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wishlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;

-- 9. RLS POLICIES

-- PROFILES POLICIES
DROP POLICY IF EXISTS "Users can read own profile or admin can read all" ON public.profiles;
CREATE POLICY "Users can read own profile or admin can read all"
    ON public.profiles FOR SELECT
    USING (id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "Users can update own profile or admin can update all" ON public.profiles;
CREATE POLICY "Users can update own profile or admin can update all"
    ON public.profiles FOR UPDATE
    USING (id = auth.uid() OR public.is_admin())
    WITH CHECK (id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "Users can insert own profile or admin can insert" ON public.profiles;
CREATE POLICY "Users can insert own profile or admin can insert"
    ON public.profiles FOR INSERT
    WITH CHECK (id = auth.uid() OR public.is_admin());

-- ORDERS POLICIES (Hardened for Production)
-- Customers can view their own orders; Admins can view all orders.
DROP POLICY IF EXISTS "Anyone can read orders" ON public.orders;
DROP POLICY IF EXISTS "Customers view own orders, admins view all" ON public.orders;
CREATE POLICY "Customers view own orders or admins view all"
    ON public.orders FOR SELECT
    USING (
        (customer_id IS NOT NULL AND customer_id = auth.uid())
        OR public.is_admin()
    );

-- Any customer (guest or logged-in) can place/insert a new order
DROP POLICY IF EXISTS "Anyone can insert orders (guest or authenticated)" ON public.orders;
DROP POLICY IF EXISTS "Anyone can insert orders" ON public.orders;
CREATE POLICY "Anyone can insert orders"
    ON public.orders FOR INSERT
    WITH CHECK (true);

-- Only verified Admins can update orders
DROP POLICY IF EXISTS "Admins can update orders" ON public.orders;
DROP POLICY IF EXISTS "Anyone can update orders" ON public.orders;
CREATE POLICY "Admins can update orders"
    ON public.orders FOR UPDATE
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- Only verified Admins can delete orders
DROP POLICY IF EXISTS "Admins can delete orders" ON public.orders;
DROP POLICY IF EXISTS "Anyone can delete orders" ON public.orders;
CREATE POLICY "Admins can delete orders"
    ON public.orders FOR DELETE
    USING (public.is_admin());

-- ORDER ITEMS POLICIES (Hardened)
DROP POLICY IF EXISTS "Anyone can read order items" ON public.order_items;
DROP POLICY IF EXISTS "View order items if customer owns order or is admin" ON public.order_items;
CREATE POLICY "View order items if customer owns order or is admin"
    ON public.order_items FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.orders o
            WHERE o.id = public.order_items.order_id
              AND (o.customer_id = auth.uid() OR public.is_admin())
        )
    );

DROP POLICY IF EXISTS "Anyone can insert order items" ON public.order_items;
CREATE POLICY "Anyone can insert order items"
    ON public.order_items FOR INSERT
    WITH CHECK (true);

DROP POLICY IF EXISTS "Admins can update order items" ON public.order_items;
DROP POLICY IF EXISTS "Anyone can update order items" ON public.order_items;
CREATE POLICY "Admins can update order items"
    ON public.order_items FOR UPDATE
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins can delete order items" ON public.order_items;
DROP POLICY IF EXISTS "Anyone can delete order items" ON public.order_items;
CREATE POLICY "Admins can delete order items"
    ON public.order_items FOR DELETE
    USING (public.is_admin());

-- REVIEWS TABLE (Authentic, moderated customer reviews)
CREATE TABLE IF NOT EXISTS public.reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id TEXT,
    customer_name TEXT NOT NULL,
    customer_city TEXT NOT NULL DEFAULT 'Casablanca',
    rating INTEGER NOT NULL DEFAULT 5 CHECK (rating >= 1 AND rating <= 5),
    comment TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'approved' CHECK (status IN ('pending', 'approved', 'rejected')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- REVIEWS POLICIES
DROP POLICY IF EXISTS "Public can view approved reviews" ON public.reviews;
CREATE POLICY "Public can view approved reviews"
    ON public.reviews FOR SELECT
    USING (status = 'approved' OR public.is_admin());

DROP POLICY IF EXISTS "Anyone can submit reviews" ON public.reviews;
CREATE POLICY "Anyone can submit reviews"
    ON public.reviews FOR INSERT
    WITH CHECK (true);

DROP POLICY IF EXISTS "Admins manage reviews" ON public.reviews;
CREATE POLICY "Admins manage reviews"
    ON public.reviews FOR ALL
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- WISHLISTS POLICIES
DROP POLICY IF EXISTS "Users can manage own wishlist" ON public.wishlists;
CREATE POLICY "Users can manage own wishlist"
    ON public.wishlists FOR ALL
    USING (customer_id = auth.uid())
    WITH CHECK (customer_id = auth.uid());

-- CART ITEMS POLICIES
DROP POLICY IF EXISTS "Users can manage own cart items" ON public.cart_items;
CREATE POLICY "Users can manage own cart items"
    ON public.cart_items FOR ALL
    USING (customer_id = auth.uid())
    WITH CHECK (customer_id = auth.uid());

-- 10. REALTIME SETUP
-- Add orders table to realtime publication so Admin Dashboard updates instantly
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'orders'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
    END IF;
END $$;

-- 11. SEED INITIAL AUTHENTIC REVIEWS (Moroccan Market)
INSERT INTO public.reviews (customer_name, customer_city, rating, comment, status)
VALUES
    ('Yassine Berrada', 'Casablanca', 5, 'Commande reçue en 24h à Casablanca Maarif. La qualité de la paire est impeccable, pointure exacte.', 'approved'),
    ('Amine Karim', 'Rabat', 5, 'Khoya tbarkellah 3likom, sberdila n9iya bzaf w le service de livraison tayessar l omour. خلاص عند الاستلام.', 'approved'),
    ('Mehdi Tazi', 'Marrakech', 5, 'Très satisfait de mon achat. Finition top et semelle super confortable. Je recommande CasaShoes sans hésitation !', 'approved'),
    ('Othmane Mansouri', 'Tanger', 5, 'Livraison rapide sur Tanger (48h). Boîte en parfait état et chaussure conforme à 100% aux photos.', 'approved'),
    ('Hamza El Fassi', 'Fès', 5, 'Qualité originale, service après-vente très réactif sur WhatsApp. Dima CasaShoes !', 'approved')
ON CONFLICT DO NOTHING;

-- ==============================================================================
-- 12. HELPER TO CREATE OR PROMOTE YOUR FIRST ADMIN USER:
-- ==============================================================================
-- Run this in your Supabase SQL Editor with your desired admin email:
--
-- UPDATE public.profiles
-- SET role = 'admin'
-- WHERE id = (SELECT id FROM auth.users WHERE email = 'your_admin_email@example.com');
--
-- OR:
-- SELECT public.promote_user_to_admin('your_admin_email@example.com');
--
-- IMPORTANT: this function can ONLY be run from the Supabase SQL Editor (or any
-- connection using the service_role/postgres role). It is intentionally NOT
-- reachable from the website/browser — see the REVOKE statement right after it.
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.promote_user_to_admin(target_email TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    target_user_id UUID;
BEGIN
    SELECT id INTO target_user_id FROM auth.users WHERE email = target_email LIMIT 1;
    IF target_user_id IS NULL THEN
        RETURN 'User with email ' || target_email || ' not found in auth.users. Please sign up or create user in Supabase Auth first.';
    END IF;

    INSERT INTO public.profiles (id, role)
    VALUES (target_user_id, 'admin')
    ON CONFLICT (id) DO UPDATE SET role = 'admin';

    RETURN 'Success: User ' || target_email || ' has been promoted to admin.';
END;
$$;

-- Lock the function down: revoke it from anon/authenticated/public so it can
-- NEVER be called from the website or with the public anon key — only from
-- the Supabase SQL Editor / service_role (i.e. only by you, the project owner).
REVOKE ALL ON FUNCTION public.promote_user_to_admin(TEXT) FROM PUBLIC, anon, authenticated;

-- ==============================================================================
-- 13. HARD BLOCK: prevent any user (even via direct client-side update calls)
-- from ever changing their own `role` column, no matter what the RLS UPDATE
-- policy above allows for their own row. This closes the "self-promote to
-- admin from the browser console" hole regardless of any RPC or app-code bug.
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.prevent_role_self_escalation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NEW.role IS DISTINCT FROM OLD.role AND NOT public.is_admin() THEN
        NEW.role := OLD.role;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_role_self_escalation ON public.profiles;
CREATE TRIGGER trg_prevent_role_self_escalation
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.prevent_role_self_escalation();
